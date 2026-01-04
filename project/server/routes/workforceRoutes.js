import express from 'express';
import axios from 'axios';
import createPool from '../lib/db.js';

const router = express.Router();
const db = createPool();

// --- Helper for consistent error responses ---
const sendError = (res, message, error) => {
  console.error(`❌ Workforce Route Error: ${message}`, error.response?.data?.error || error.message || error);
  res.status(500).json({ success: false, message });
};

// =================================================================
//  LABOR REQUIREMENT ENDPOINTS
// =================================================================

/**
 * GET /api/workforce/requirements/:projectId
 * Fetches all open labor requirements for a given project.
 */
router.get('/requirements/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM project_skill_requirements WHERE project_id = $1 AND required_headcount > 0 ORDER BY start_date ASC',
            [projectId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        sendError(res, 'Failed to fetch labor requirements.', error);
    }
});

/**
 * POST /api/workforce/requirements
 * Creates a new labor requirement (a "job opening") for a project.
 */
router.post('/requirements', async (req, res) => {
    try {
        const { projectId, skillSetRequired, requiredHeadcount, startDate, endDate } = req.body;

        if (!projectId || !skillSetRequired || !requiredHeadcount || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'All fields (projectId, skillSetRequired, requiredHeadcount, startDate, endDate) are required.'
            });
        }

        const result = await db.query(
            'INSERT INTO project_skill_requirements (project_id, skill_set_required, required_headcount, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [projectId, skillSetRequired, requiredHeadcount, startDate, endDate]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Labor requirement created successfully.'
        });

    } catch (error) {
        sendError(res, 'Failed to create labor requirement.', error);
    }
});


// =================================================================
//  AI RECOMMENDATION ENDPOINT
// =================================================================
/**
 * POST /api/workforce/recommend
 * Takes a requirement ID, finds available labor, and asks the AI for the best team.
 */
router.post('/recommend', async (req, res) => {
    const { requirementId } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!requirementId) {
        return res.status(400).json({ success: false, message: 'Requirement ID is required.' });
    }
    if (!geminiApiKey) {
        return res.status(500).json({ success: false, message: 'Gemini API key is not configured on the server.' });
    }

    try {
        const requirementRes = await db.query('SELECT * FROM project_skill_requirements WHERE id = $1', [requirementId]);
        if (requirementRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Labor requirement not found.' });
        }
        const requirement = requirementRes.rows[0];

        const projectRes = await db.query('SELECT location FROM projects WHERE id = $1', [requirement.project_id]);
        const projectLocation = projectRes.rows[0]?.location || 'Unknown';

        const availableLaborersRes = await db.query(
            `SELECT id, name, location, daily_rate FROM laborers WHERE skill_set = $1 AND current_status = 'Available'`,
            [requirement.skill_set_required]
        );
        const availableLaborers = availableLaborersRes.rows;
        
        if (availableLaborers.length === 0) {
            return res.status(404).json({ success: false, message: `No available laborers found with the skill: ${requirement.skill_set_required}` });
        }

        const prompt = `
            You are an expert construction workforce scheduler for a company in India. Your task is to recommend the best team of laborers to fulfill a specific project requirement.
            Your primary goal is to create the most cost-effective and efficient team. Prioritize minimizing travel distance first, then consider daily rate as a secondary factor.
            Project Requirement:
            - Project Location: ${projectLocation}
            - Skill Needed: ${requirement.skill_set_required}
            - Headcount Needed: ${requirement.required_headcount}
            Available Workforce (with the required skill):
            ${JSON.stringify(availableLaborers, null, 2)}
            Analyze the list of available laborers. Based on the project location, recommend the best ${requirement.required_headcount} laborers to form the team. For each recommendation, provide a short, clear reason for your choice.
            Respond ONLY in this exact JSON format:
            {
              "recommendations": [
                { "laborer_id": <number>, "name": "<string>", "reason": "<string>" },
                ...
              ]
            }
        `;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`;
        
        const response = await axios.post(geminiApiUrl, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
            throw new Error("AI response was empty or malformed.");
        }

        const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiRecommendations = JSON.parse(jsonText);

        res.json({ success: true, data: aiRecommendations });

    } catch (error) {
        sendError(res, 'Failed to get AI recommendations.', error);
    }
});

// =================================================================
//  ASSIGNMENT ENDPOINT
// =================================================================
/**
 * POST /api/workforce/assign
 * Assigns a laborer to a project, updating their status and the project's requirement.
 */
router.post('/assign', async (req, res) => {
    const { laborerId, requirementId } = req.body;

    if (!laborerId || !requirementId) {
        return res.status(400).json({ success: false, message: 'Laborer ID and Requirement ID are required.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // --- THIS IS THE FIX ---
        // Step 1: Get the project_id from the requirement
        const reqRes = await client.query(
            'SELECT project_id FROM project_skill_requirements WHERE id = $1', 
            [requirementId]
        );
        if (reqRes.rowCount === 0) {
            throw new Error('Labor requirement not found.');
        }
        const projectId = reqRes.rows[0].project_id;

        // Step 2: Update the laborer's status AND their assigned_project_id
        const updateLaborerRes = await client.query(
            `UPDATE laborers 
             SET current_status = 'Assigned', assigned_project_id = $1 
             WHERE id = $2 AND current_status = 'Available' 
             RETURNING id`,
            [projectId, laborerId]
        );

        if (updateLaborerRes.rowCount === 0) {
            throw new Error('Laborer could not be assigned. They may no longer be available.');
        }

        // Step 3: Decrement the required headcount
        await client.query(
            'UPDATE project_skill_requirements SET required_headcount = required_headcount - 1 WHERE id = $1 AND required_headcount > 0',
            [requirementId]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Laborer assigned successfully.' });

    } catch (error) {
        await client.query('ROLLBACK');
        sendError(res, 'Failed to assign laborer.', error);
    } finally {
        client.release();
    }
});

export default router;

