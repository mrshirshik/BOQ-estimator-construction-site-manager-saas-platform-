// server/routes/dashboardRoutes.js
import express from 'express';
import createPool from '../lib/db.js';

const router = express.Router();
const db = createPool();

const sendError = (res, message, error) => {
  console.error(`❌ Dashboard Route Error: ${message}`, error.message || error);
  res.status(500).json({ success: false, message: `${message}: ${error.message}` });
};

router.get('/stats', async (req, res) => {
  try {
    // 1. Basic Counts
    const [projectsRes, ratesRes, boqRes, laborersRes] = await Promise.all([
      db.query('SELECT COUNT(*) FROM projects'),
      db.query('SELECT COUNT(*) FROM rates'),
      db.query('SELECT COUNT(*) FROM boq_items'),
      db.query('SELECT COUNT(*) FROM laborers')
    ]);

    // 2. Chart Data: Top 5 Projects (Budget vs Actuals)
    // Note: This query aggregates costs from manual costs AND material transactions.
    // Labor costs are harder to sum perfectly in SQL without complex joins, so we focus on material/misc for this high-level view.
    const chartQuery = `
        SELECT 
            p.name, 
            p.budget,
            (
                COALESCE((SELECT SUM(amount) FROM project_costs WHERE project_id = p.id), 0) +
                COALESCE((SELECT SUM(actual_cost) FROM material_transactions mt JOIN material_requirements mr ON mt.requirement_id = mr.id WHERE mr.project_id = p.id), 0)
            ) as actuals
        FROM projects p
        WHERE p.status = 'In Progress'
        ORDER BY p.budget DESC
        LIMIT 5
    `;
    const chartRes = await db.query(chartQuery);

    // 3. Recent Activity Feed (Union of Diary and Materials)
    const activityQuery = `
        (SELECT 'diary' as type, activities_summary as description, entry_date as date, p.name as project_name 
         FROM site_diary_entries s JOIN projects p ON s.project_id = p.id
         ORDER BY entry_date DESC LIMIT 3)
        UNION ALL
        (SELECT 'material' as type, 'Purchased ' || quantity_purchased || ' ' || (SELECT unit FROM material_requirements WHERE id = requirement_id) as description, transaction_date as date, (SELECT name FROM projects WHERE id = (SELECT project_id FROM material_requirements WHERE id = requirement_id)) as project_name
         FROM material_transactions
         ORDER BY transaction_date DESC LIMIT 3)
        ORDER BY date DESC
        LIMIT 5
    `;
    const activityRes = await db.query(activityQuery);

    res.json({
      success: true,
      data: {
        totalProjects: parseInt(projectsRes.rows[0].count),
        totalRates: parseInt(ratesRes.rows[0].count),
        totalBoqItems: parseInt(boqRes.rows[0].count),
        totalLaborers: parseInt(laborersRes.rows[0].count),
        projectHealthData: chartRes.rows,
        recentActivity: activityRes.rows
      }
    });
  } catch (error) {
    sendError(res, 'Failed to fetch dashboard stats', error);
  }
});

export default router;