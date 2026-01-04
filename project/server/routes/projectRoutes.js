// server/routes/projectRoutes.js
import express from 'express';
import createPool from '../lib/db.js';
import { calculateProjectStats } from '../utils/projectAnalytics.js';
import { aggregateCostsByType, calculateActualsByProject } from '../utils/projectFinancials.js';

const router = express.Router();
const db = createPool();

const sendError = (res, message, error) => {
  console.error(`❌ ${message}:`, error.message || error);
  res.status(500).json({ success: false, message: `${message}: ${error.message}` });
};

// ANALYTICS
router.get('/analytics/stats', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM projects');
        const stats = calculateProjectStats(result.rows);
        res.json({ success: true, data: stats });
    } catch (error) {
        sendError(res, 'Failed to fetch project analytics', error);
    }
});

// --- THIS IS THE UPDATED ENDPOINT FOR INTEGRATION ---
router.get('/:id/financials', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Fetch Basic Info & Manual Costs
        const [projectResult, costsResult] = await Promise.all([
            db.query('SELECT budget FROM projects WHERE id = $1', [id]),
            db.query('SELECT cost_type, amount FROM project_costs WHERE project_id = $1', [id])
        ]);

        if (projectResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });
        
        const budget = parseFloat(projectResult.rows[0].budget);
        
        // 2. Fetch Procurement Costs (NEW INTEGRATION)
        // We join requirements to transactions to ensure we only get costs for THIS project
        const procurementResult = await db.query(`
            SELECT mt.actual_cost 
            FROM material_transactions mt
            JOIN material_requirements mr ON mt.requirement_id = mr.id
            WHERE mr.project_id = $1
        `, [id]);

        // 3. Calculate Totals
        // Sum of manual "Project Costs"
        let totalManualCosts = 0;
        const costs = costsResult.rows;
        totalManualCosts = costs.reduce((sum, cost) => sum + parseFloat(cost.amount), 0);

        // Sum of "Procurement Costs"
        const procurementCosts = procurementResult.rows;
        const totalMaterialCost = procurementCosts.reduce((sum, item) => sum + parseFloat(item.actual_cost), 0);

        // Total Actuals = Manual Costs + Material Costs (Labor is usually tracked via time_entries, assumed handled in frontend or manual costs for now)
        // Note: If you have a labor cost calculation, ensure it's included here or in the frontend summation.
        const totalActuals = totalManualCosts + totalMaterialCost;

        // 4. Integrate Materials into Breakdown for Pie Chart
        // We add a synthetic entry for "Materials (Procurement)" to the breakdown
        const costBreakdown = aggregateCostsByType(costs);
        if (totalMaterialCost > 0) {
            costBreakdown.push({ name: 'Materials (Procurement)', value: Math.round(totalMaterialCost) });
        }

        res.json({
            success: true,
            data: { 
                budget, 
                totalActuals, 
                remainingBudget: budget - totalActuals, 
                costBreakdown 
            }
        });
    } catch (error) { sendError(res, 'Failed to fetch project financial data', error); }
});

// PROJECT CRUD
router.get('/projects', async (req, res) => {
  try {
    const [projectsResult, costsResult, procurementResult] = await Promise.all([
        db.query('SELECT * FROM projects ORDER BY start_date DESC'),
        db.query('SELECT project_id, amount FROM project_costs'),
        // Fetch procurement sums per project
        db.query(`
            SELECT mr.project_id, SUM(mt.actual_cost) as material_total
            FROM material_transactions mt
            JOIN material_requirements mr ON mt.requirement_id = mr.id
            GROUP BY mr.project_id
        `)
    ]);
    
    // 1. Map Manual Costs
    const actualsMap = new Map();
    costsResult.rows.forEach(cost => {
        const projectId = Number(cost.project_id);
        const amount = parseFloat(cost.amount) || 0;
        actualsMap.set(projectId, (actualsMap.get(projectId) || 0) + amount);
    });

    // 2. Map & Add Procurement Costs (INTEGRATION)
    procurementResult.rows.forEach(row => {
        const projectId = Number(row.project_id);
        const amount = parseFloat(row.material_total) || 0;
        actualsMap.set(projectId, (actualsMap.get(projectId) || 0) + amount);
    });

    const projectsWithActuals = projectsResult.rows.map(project => ({
        ...project,
        actuals: actualsMap.get(Number(project.id)) || 0 
    }));
    
    res.json({ success: true, data: projectsWithActuals });
  } catch (error) { sendError(res, 'Failed to fetch projects', error); }
});

router.post('/projects', async (req, res) => {
  try {
    const { name, description, startDate, endDate, status, budget, location } = req.body;
    if (!name || !startDate || !budget) return res.status(400).json({ success: false, message: 'Name, start date, and budget are required' });
    const result = await db.query(
      'INSERT INTO projects (name, description, start_date, end_date, status, budget, location) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description || null, startDate, endDate || null, status || 'Planning', budget, location || null]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Project created successfully' });
  } catch (error) { sendError(res, 'Failed to create project', error); }
});

router.put('/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, status, budget, location } = req.body;
        if (!name || !startDate || !budget) return res.status(400).json({ success: false, message: 'All fields are required for update.' });

        const result = await db.query(
            `UPDATE projects SET 
                name = $1, description = $2, start_date = $3, end_date = $4, status = $5, budget = $6, location = $7 
             WHERE id = $8 RETURNING *`,
            [name, description, startDate, endDate, status, budget, location, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Project not found.' });
        res.json({ success: true, data: result.rows[0], message: 'Project updated successfully.' });
    } catch (error) { sendError(res, 'Failed to update project', error); }
});

router.delete('/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Project not found.' });
        res.json({ success: true, message: 'Project deleted successfully.' });
    } catch (error) { sendError(res, 'Failed to delete project', error); }
});


// COST CRUD
router.get('/:id/costs', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM project_costs WHERE project_id = $1 ORDER BY entry_date DESC', [id]);
        res.json({ success: true, data: result.rows });
    } catch (error) { sendError(res, 'Failed to fetch project costs', error); }
});

router.post('/:id/costs', async (req, res) => {
    try {
        const { id: project_id } = req.params;
        const { cost_type, amount, description, entry_date } = req.body;
        if (!cost_type || amount === undefined || !entry_date) return res.status(400).json({ success: false, message: 'Cost type, amount, and entry date are required.' });
        const result = await db.query(
            'INSERT INTO project_costs (project_id, cost_type, amount, description, entry_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [project_id, cost_type, amount, description || null, entry_date]
        );
        res.status(201).json({ success: true, data: result.rows[0], message: 'Cost entry added successfully.' });
    } catch (error) { sendError(res, 'Failed to add cost entry', error); }
});


// KANBAN
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'Status is required.' });
        const result = await db.query('UPDATE projects SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Project not found.' });
        res.json({ success: true, data: result.rows[0], message: 'Project status updated.' });
    } catch (error) { sendError(res, 'Failed to update project status', error); }
});

export default router;