import express from 'express';
import createPool from '../lib/db.js';
import {
  aggregateTimeEntriesByProject,
  aggregateLaborersBySkillCost,
  getLaborerStatusCounts
} from '../utils/labourAnalytics.js';

// Setup router and database connection
const router = express.Router();
const db = createPool();

// --- Helper for consistent error responses ---
const sendError = (res, message, error) => {
  console.error(`❌ ${message}:`, error.message || error);
  res.status(500).json({
    success: false,
    message: `${message}: ${error.message}`
  });
};

// =================================================================
//  LABORERS - STANDARD CRUD ENDPOINTS (UPDATED)
// =================================================================

// GET /api/labour/laborers - Fetch all laborers with new columns
router.get('/laborers', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM laborers ORDER BY name ASC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    sendError(res, 'Failed to fetch laborers', error);
  }
});

// POST /api/labour/laborers - Create a new laborer with new columns
router.post('/laborers', async (req, res) => {
  try {
    const { name, skillSet, currentStatus, daily_rate, hire_date } = req.body;

    if (!name || !skillSet || !currentStatus || daily_rate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, skill set, status, and daily rate are required'
      });
    }

    const result = await db.query(
      'INSERT INTO laborers (name, skill_set, current_status, daily_rate, hire_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, skillSet, currentStatus, daily_rate, hire_date || null]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Laborer added successfully'
    });
  } catch (error) {
    sendError(res, 'Failed to create laborer', error);
  }
});

// PUT /api/labour/laborers/:id - Update an existing laborer
router.put('/laborers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, skill_set, current_status, daily_rate, hire_date } = req.body;

    const result = await db.query(
      `UPDATE laborers 
       SET name = $1, skill_set = $2, current_status = $3, daily_rate = $4, hire_date = $5 
       WHERE id = $6 RETURNING *`,
      [name, skill_set, current_status, daily_rate, hire_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Laborer not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Laborer updated successfully'
    });
  } catch (error) {
    sendError(res, 'Failed to update laborer', error);
  }
});

// DELETE /api/labour/laborers/:id - Delete a laborer
router.delete('/laborers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM laborers WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Laborer not found' });
    }

    res.json({ success: true, message: 'Laborer deleted successfully' });
  } catch (error) {
    sendError(res, 'Failed to delete laborer', error);
  }
});

// =================================================================
//  --- ASSIGNED TEAM ENDPOINT (CORRECTED) ---
// =================================================================

/**
 * GET /api/labour/assigned/:projectId
 * Fetches all laborers currently assigned to a specific project.
 */
router.get('/assigned/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
        // --- THIS IS THE FIX ---
        // This query is now simple and 100% accurate.
        // It directly selects laborers based on the 'assigned_project_id' column.
        const query = `
            SELECT id, name, skill_set
            FROM laborers
            WHERE assigned_project_id = $1
            ORDER BY name ASC;
        `;
        const result = await db.query(query, [projectId]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        sendError(res, 'Failed to fetch assigned laborers.', error);
    }
});


// =================================================================
//  TIME TRACKING ENDPOINTS
// =================================================================

// POST /api/labour/time-entry - Log a new time entry for a laborer
router.post('/time-entry', async (req, res) => {
  try {
    const { laborer_id, project_id, work_date, hours_worked } = req.body;

    if (!laborer_id || !project_id || !work_date || !hours_worked) {
      return res.status(400).json({
        success: false,
        message: 'Laborer ID, Project ID, work date, and hours worked are required'
      });
    }

    const result = await db.query(
      'INSERT INTO time_entries (laborer_id, project_id, work_date, hours_worked) VALUES ($1, $2, $3, $4) RETURNING *',
      [laborer_id, project_id, work_date, hours_worked]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Time entry logged successfully'
    });
  } catch (error) {
    sendError(res, 'Failed to log time entry', error);
  }
});

// =================================================================
//  ANALYTICS ENDPOINTS
// =================================================================

// GET /api/labour/analytics/status - Data for Status Breakdown Donut Chart
router.get('/analytics/status', async (req, res) => {
  try {
    const laborersResult = await db.query('SELECT current_status FROM laborers');
    const analyticsData = getLaborerStatusCounts(laborersResult.rows);
    res.json({ success: true, data: analyticsData });
  } catch (error) {
    sendError(res, 'Failed to get laborer status analytics', error);
  }
});

// GET /api/labour/analytics/skill-cost - Data for Cost Per Skill Bar Chart
router.get('/analytics/skill-cost', async (req, res) => {
  try {
    const laborersResult = await db.query('SELECT skill_set, daily_rate FROM laborers');
    const analyticsData = aggregateLaborersBySkillCost(laborersResult.rows);
    res.json({ success: true, data: analyticsData });
  } catch (error) {
    sendError(res, 'Failed to get skill cost analytics', error);
  }
});

// GET /api/labour/analytics/cost-allocation - Data for Cost Allocation Stacked Bar Chart
router.get('/analytics/cost-allocation', async (req, res) => {
  try {
    // Fetch all necessary raw data in parallel for efficiency
    const [timeEntriesResult, laborersResult] = await Promise.all([
      db.query('SELECT project_id, laborer_id, hours_worked FROM time_entries'),
      db.query('SELECT id, daily_rate FROM laborers')
    ]);
    
    // Pass raw data to the aggregation function
    const analyticsData = aggregateTimeEntriesByProject(timeEntriesResult.rows, laborersResult.rows);
    res.json({ success: true, data: analyticsData });
  } catch (error) {
    sendError(res, 'Failed to get cost allocation analytics', error);
  }
});

export default router;

