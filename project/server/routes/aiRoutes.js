// server/routes/aiRoutes.js
import express from 'express';
import axios from 'axios';
import createPool from '../lib/db.js';

const router = express.Router();
const db = createPool();

// Helper for sending consistent error responses
const sendError = (res, message, error) => {
  console.error(`❌ AI Route Error: ${message}`, error.response?.data?.error || error.message || error);
  res.status(500).json({ success: false, message });
};

/**
 * POST /api/ai/generate-report
 * Generates a comprehensive project status report using Gemini AI.
 * UPDATED: Now includes Materials, Site Diary, and Hiring data.
 */
router.post('/generate-report', async (req, res) => {
  const { projectId } = req.body;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!projectId) {
    return res.status(400).json({ success: false, message: 'Project ID is required.' });
  }
  if (!geminiApiKey) {
    return res.status(500).json({ success: false, message: 'Gemini API key is not configured on the server.' });
  }

  try {
    // --- Step 1: Gather ALL Data for the project ---
    const [
        projectRes, 
        costsRes, 
        timeRes,
        materialsRes, // NEW: Material Transactions
        diaryRes,     // NEW: Site Diary
        hiringRes     // NEW: Open Hiring Reqs
    ] = await Promise.all([
      // 1. Basic Project Info
      db.query('SELECT * FROM projects WHERE id = $1', [projectId]),
      // 2. Manual Costs
      db.query('SELECT amount FROM project_costs WHERE project_id = $1', [projectId]),
      // 3. Labor Hours
      db.query('SELECT hours_worked FROM time_entries WHERE project_id = $1', [projectId]),
      // 4. NEW: Material Costs (Sum of transactions)
      db.query(`
        SELECT mt.actual_cost, mr.item_name 
        FROM material_transactions mt
        JOIN material_requirements mr ON mt.requirement_id = mr.id
        WHERE mr.project_id = $1
      `, [projectId]),
      // 5. NEW: Recent Site Diary Logs (Last 3 entries)
      db.query('SELECT entry_date, activities_summary, issues_or_delays FROM site_diary_entries WHERE project_id = $1 ORDER BY entry_date DESC LIMIT 3', [projectId]),
      // 6. NEW: Open Hiring Requirements
      db.query('SELECT skill_set_required, required_headcount FROM project_skill_requirements WHERE project_id = $1 AND required_headcount > 0', [projectId])
    ]);

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // --- Step 2: Process Data for the Prompt ---
    const project = projectRes.rows[0];
    
    // Financials
    const manualCostSum = costsRes.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const materialCostSum = materialsRes.rows.reduce((sum, row) => sum + parseFloat(row.actual_cost), 0);
    // Note: Labor cost calculation is complex on backend without joining daily rates, 
    // so for the report we focus on HOURS worked which is a good proxy for activity.
    const totalHours = timeRes.rows.reduce((sum, row) => sum + parseFloat(row.hours_worked), 0);
    
    const totalSpent = manualCostSum + materialCostSum; // (Excludes direct labor cost for this summary, focuses on external spend)

    // Recent Activity String
    const recentLogs = diaryRes.rows.map(log => 
        `- ${new Date(log.entry_date).toLocaleDateString()}: ${log.activities_summary} ${log.issues_or_delays ? `(ISSUE: ${log.issues_or_delays})` : ''}`
    ).join('\n');

    // Hiring Needs String
    const openHiring = hiringRes.rows.map(req => 
        `${req.required_headcount} x ${req.skill_set_required}`
    ).join(', ');

    // --- Step 3: Construct the SUPER Prompt ---
    const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const prompt = `
      You are a senior construction project manager. Write a professional, executive "Project Status Report" for the following project.
      
      **Date:** ${today}
      
      **1. Project Overview:**
      - Name: ${project.name}
      - Location: ${project.location}
      - Status: ${project.status}
      - Timeline: ${new Date(project.start_date).toLocaleDateString()} to ${new Date(project.end_date).toLocaleDateString()}

      **2. Financial & Resource Snapshot:**
      - Total Budget: ₹${parseFloat(project.budget).toLocaleString('en-IN')}
      - Non-Labor Spend (Materials + Misc): ₹${totalSpent.toLocaleString('en-IN')}
      - Labor Volume: ${totalHours} total man-hours logged.
      - Active Material Purchases: ${materialsRes.rows.length} transactions recorded (e.g., ${materialsRes.rows[0]?.item_name || 'N/A'}).

      **3. Site Operations (Recent Activity):**
      ${recentLogs || "No recent site diary entries found."}

      **4. Critical Alerts & Needs:**
      - Open Workforce Requirements: ${openHiring || "None"}

      **Instructions:**
      - Write in a professional, concise tone.
      - Structure the report with 3 headings: "Executive Summary", "Financial Health", and "Operational Updates".
      - In "Operational Updates", specifically mention recent progress based on the diary logs.
      - If there are open hiring requirements, highlight them as an action item.
      - Keep it under 200 words.
    `;

    // --- Step 4: Call Gemini ---
    // Using 1.5 Flash for speed and larger context window
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`;
    
    const response = await axios.post(geminiApiUrl, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });

    const reportText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reportText) {
        throw new Error("AI response was empty or in an unexpected format.");
    }

    res.json({ success: true, report: reportText });

  } catch (error) {
    sendError(res, 'Failed to generate AI report.', error);
  }
});

export default router;