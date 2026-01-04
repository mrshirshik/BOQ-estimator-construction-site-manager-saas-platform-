// routes/boqRoutes.js

// --- 1. Switched to ES Module 'import' syntax ---
import express from 'express';
import createPool from '../lib/db.js'; // --- 2. Corrected path to your db.js file ---
import { parseAndMatchBOQ } from '../utils/boq_logic.js';
import exceljs from 'exceljs';

const router = express.Router();
const db = createPool(); // Using your function to get the connection pool

// --- Helper for consistent error responses ---
const sendError = (res, message, error) => {
  console.error(`❌ ${message}:`, error.message || error);
  res.status(500).json({ success: false, message: `${message}: ${error.message}` });
};

// --- Rate Management Endpoints (CRUD) ---

// GET /api/boq/rates - Fetch all rates
router.get('/rates', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rates ORDER BY item_name ASC');
    res.json(result.rows);
  } catch (err) {
    sendError(res, 'Failed to fetch rates from the database.', err);
  }
});

// POST /api/boq/rates - Create a new rate
router.post('/rates', async (req, res) => {
  const { item_name, unit, rate_value, keywords } = req.body;
  try {
    const newRate = await db.query(
      'INSERT INTO rates (item_name, unit, rate_value, keywords) VALUES ($1, $2, $3, $4) RETURNING *',
      [item_name, unit, rate_value, keywords]
    );
    res.status(201).json(newRate.rows[0]);
  } catch (err) {
    sendError(res, 'Failed to create a new rate.', err);
  }
});

// PUT /api/boq/rates/:id - Update an existing rate
router.put('/rates/:id', async (req, res) => {
  const { id } = req.params;
  const { item_name, unit, rate_value, keywords } = req.body;
  try {
    const updatedRate = await db.query(
      'UPDATE rates SET item_name = $1, unit = $2, rate_value = $3, keywords = $4 WHERE id = $5 RETURNING *',
      [item_name, unit, rate_value, keywords, id]
    );
    if (updatedRate.rows.length === 0) {
      return res.status(404).json({ error: 'Rate not found.' });
    }
    res.json(updatedRate.rows[0]);
  } catch (err) {
    sendError(res, 'Failed to update the rate.', err);
  }
});

// DELETE /api/boq/rates/:id - Delete a rate
router.delete('/rates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleteOp = await db.query('DELETE FROM rates WHERE id = $1', [id]);
    if (deleteOp.rowCount === 0) {
        return res.status(404).json({ error: 'Rate not found.' });
    }
    res.status(204).send(); // 204 No Content for successful deletion
  } catch (err) {
    sendError(res, 'Failed to delete the rate.', err);
  }
});


// --- BOQ Items Management Endpoints ---

// GET /api/boq/items - Fetch all processed BOQ items
router.get('/items', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM boq_items ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        sendError(res, 'Failed to fetch BOQ items.', err);
    }
});

// DELETE /api/boq/items/clear - Clear all BOQ items
router.delete('/items/clear', async (req, res) => {
    try {
        await db.query('TRUNCATE TABLE boq_items RESTART IDENTITY');
        res.status(204).send();
    } catch (err) {
        sendError(res, 'Failed to clear BOQ items.', err);
    }
});


// --- Core Estimation and Download Endpoints ---

// --- THIS IS THE UPDATED ENDPOINT ---
// POST /api/boq/upload-boq - The core estimation endpoint, now with AI integration.
router.post('/upload-boq', async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please upload a .xlsx file.' });
  }

  const client = await db.connect();

  try {
    // Step 1: Fetch all rates from the DB to be used for matching.
    const ratesResult = await client.query('SELECT * FROM rates');
    const ratesData = ratesResult.rows;

    // Step 2: Call the newly async core logic function, passing the Gemini API key.
    // The key is securely read from your server's environment variables.
    const { processedItems, projectTotal } = await parseAndMatchBOQ(
        req.file.buffer, 
        ratesData, 
        process.env.GEMINI_API_KEY
    );
    
    // Step 3: Use a transaction to save the results to the database.
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE boq_items RESTART IDENTITY');

    if (processedItems.length > 0) {
        const insertQuery = `
            INSERT INTO boq_items (description, quantity, unit, rate, total) 
            VALUES ($1, $2, $3, $4, $5)
        `;
        for (const item of processedItems) {
            // We only save the final numbers, not the isAiSuggestion flag, to the DB.
            await client.query(insertQuery, [item.description, item.quantity, item.unit, item.rate, item.total]);
        }
    }
    
    await client.query('COMMIT');

    // Step 4: Return the processed data (including the AI flag) to the frontend.
    res.json({ processedItems, projectTotal });

  } catch (err) {
    await client.query('ROLLBACK');
    sendError(res, 'An error occurred during BOQ processing.', err);
  } finally {
    client.release();
  }
});

// GET /api/boq/download-boq - Generate and download the processed BOQ
router.get('/download-boq', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM boq_items ORDER BY id ASC');
        const items = result.rows;

        if (items.length === 0) {
            return res.status(404).json({ error: 'No processed BOQ items available to download.' });
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Processed BOQ');
        
        worksheet.columns = [
            { header: 'Item No.', key: 'item_no', width: 10 },
            { header: 'Description', key: 'description', width: 60 },
            { header: 'Quantity', key: 'quantity', width: 15 },
            { header: 'Unit', key: 'unit', width: 10 },
            { header: 'Rate', key: 'rate', width: 20 },
            { header: 'Amount', key: 'total', width: 20 },
        ];
        
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern:'solid',
          fgColor:{ argb:'FF4F46E5' }
        };

        items.forEach((item, index) => {
            worksheet.addRow({
                item_no: `Item ${index + 1}`,
                description: item.description,
                quantity: parseFloat(item.quantity),
                unit: item.unit,
                rate: item.rate ? parseFloat(item.rate) : 'N/A',
                total: item.total ? parseFloat(item.total) : 'N/A'
            });
        });

        worksheet.getColumn('rate').numFmt = '"₹"#,##0.00';
        worksheet.getColumn('total').numFmt = '"₹"#,##0.00';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Processed_BOQ_${new Date().toISOString().slice(0,10)}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        sendError(res, 'Failed to generate and download the BOQ file.', err);
    }
});


// --- Switched to ES Module 'export' syntax ---
export default router;

