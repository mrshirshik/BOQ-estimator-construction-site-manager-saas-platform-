// server/routes/financialRoutes.js
import express from 'express';
import createPool from '../lib/db.js';
import axios from 'axios'; // For AI calls later

const router = express.Router();
const db = createPool();

const sendError = (res, message, error) => {
  console.error(`❌ Financial Route Error: ${message}`, error.message || error);
  res.status(500).json({ success: false, message: `${message}: ${error.message}` });
};

// =================================================================
//  MILESTONE CRUD (Money In)
// =================================================================

// GET /api/financials/milestones/:projectId
router.get('/milestones/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM client_milestones WHERE project_id = $1 ORDER BY expected_date ASC',
            [projectId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        sendError(res, 'Failed to fetch milestones', error);
    }
});

// POST /api/financials/milestones
router.post('/milestones', async (req, res) => {
    try {
        const { projectId, name, amount, date, status } = req.body;
        const result = await db.query(
            'INSERT INTO client_milestones (project_id, milestone_name, amount, expected_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [projectId, name, amount, date, status || 'Pending']
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        sendError(res, 'Failed to create milestone', error);
    }
});

// DELETE /api/financials/milestones/:id
router.delete('/milestones/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM client_milestones WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Milestone deleted' });
    } catch (error) {
        sendError(res, 'Failed to delete milestone', error);
    }
});


// =================================================================
//  CASH FLOW PROJECTION ENGINE (The Brain)
// =================================================================

// GET /api/financials/cashflow/:projectId
// Calculates a 60-day projection of "Money In" vs "Money Out"
router.get('/cashflow/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
        // 1. Get "Money In" (Milestones)
        const milestonesRes = await db.query(
            "SELECT * FROM client_milestones WHERE project_id = $1 AND status != 'Paid'", 
            [projectId]
        );
        const milestones = milestonesRes.rows;

        // 2. Get "Money Out" (Daily Labor Burn Rate)
        // We sum the daily_rate of all laborers currently ASSIGNED to this project
        const laborRes = await db.query(
            "SELECT SUM(daily_rate) as daily_burn FROM laborers WHERE assigned_project_id = $1 AND current_status = 'Assigned'",
            [projectId]
        );
        const dailyLaborCost = parseFloat(laborRes.rows[0].daily_burn || 0);

        // 3. Generate 60-Day Projection
        const projection = [];
        let runningBalance = 0; // Start at 0 (or fetch current bank balance in a real app)
        const today = new Date();

        for (let i = 0; i < 60; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            const dateString = currentDate.toISOString().split('T')[0];

            // Calculate Expense (Labor only for now, assume working every day)
            let dailyExpense = dailyLaborCost;

            // Calculate Income (Check if a milestone lands on this date)
            let dailyIncome = 0;
            const milestoneToday = milestones.find(m => {
                const mDate = new Date(m.expected_date).toISOString().split('T')[0];
                return mDate === dateString;
            });
            
            if (milestoneToday) {
                dailyIncome = parseFloat(milestoneToday.amount);
            }

            runningBalance = runningBalance + dailyIncome - dailyExpense;

            projection.push({
                date: dateString,
                day: currentDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
                income: dailyIncome,
                expense: dailyExpense,
                balance: runningBalance, // This is the "Cash Flow" line
                milestoneName: milestoneToday ? milestoneToday.milestone_name : null
            });
        }

        res.json({ 
            success: true, 
            data: {
                dailyBurnRate: dailyLaborCost,
                projection: projection
            }
        });

    } catch (error) {
        sendError(res, 'Failed to calculate cash flow', error);
    }
});

// =================================================================
//  AI ADVISOR ENDPOINT
// =================================================================

// POST /api/financials/advise
// Sends the projection data to Gemini for analysis
router.post('/advise', async (req, res) => {
    const { projectionData, burnRate } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) return res.status(500).json({ success: false, message: 'Gemini Key missing' });

    try {
        // Simplify data to save tokens
        const simplifiedData = projectionData
            .filter((day, index) => day.income > 0 || day.balance < 0 || index % 7 === 0) // Only send key days (income, negative balance, or weekly)
            .map(d => `${d.date}: Bal=${d.balance}, Inc=${d.income}`);

        const prompt = `
            You are a financial advisor for a construction contractor.
            Current Daily Labor Burn Rate: ₹${burnRate}.
            
            Here is a simplified 60-day cash flow projection (Date: Balance, Income):
            ${JSON.stringify(simplifiedData)}

            Analyze this for "Cash Flow Crunches" (where Balance goes negative).
            
            Respond in this JSON format:
            {
                "riskLevel": "High" | "Medium" | "Low",
                "analysis": "One sentence summary of when and why the crunch happens.",
                "recommendation": "One actionable step to fix it (e.g. negotiate terms, speed up milestone X)."
            }
        `;

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`;
        const response = await axios.post(geminiApiUrl, { contents: [{ parts: [{ text: prompt }] }] });
        
        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const advice = JSON.parse(jsonText);

        res.json({ success: true, data: advice });

    } catch (error) {
        sendError(res, 'Failed to get AI advice', error);
    }
});

export default router;