// server/routes/procurementRoutes.js
import express from 'express';
import createPool from '../lib/db.js';
import multer from 'multer';

const router = express.Router();
const db = createPool();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const sendError = (res, message, error) => {
  console.error(`❌ Procurement Route Error: ${message}`, error.message || error);
  res.status(500).json({ success: false, message: `${message}: ${error.message}` });
};

// =================================================================
//  REQUIREMENTS ENDPOINTS
// =================================================================

router.post('/requirements', async (req, res) => {
  try {
    const { projectId, itemName, estimatedQuantity, estimatedBudget, unit } = req.body;

    if (!projectId || !itemName || !estimatedQuantity || !unit) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const result = await db.query(
      'INSERT INTO material_requirements (project_id, item_name, estimated_total_quantity, estimated_budget, unit) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [projectId, itemName, estimatedQuantity, estimatedBudget || 0, unit]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Requirement added successfully.' });
  } catch (error) {
    sendError(res, 'Failed to add material requirement', error);
  }
});

// NEW: Edit Requirement Endpoint
router.put('/requirements/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { itemName, estimatedQuantity, estimatedBudget, unit } = req.body;
  
      const result = await db.query(
        `UPDATE material_requirements 
         SET item_name = $1, estimated_total_quantity = $2, estimated_budget = $3, unit = $4
         WHERE id = $5 RETURNING *`,
        [itemName, estimatedQuantity, estimatedBudget, unit, id]
      );
  
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Requirement not found.' });
  
      res.json({ success: true, data: result.rows[0], message: 'Requirement updated.' });
    } catch (error) {
      sendError(res, 'Failed to update requirement', error);
    }
});

router.get('/requirements/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    const query = `
      SELECT 
        r.id, 
        r.item_name, 
        r.unit, 
        r.estimated_total_quantity,
        r.estimated_budget,
        COALESCE(SUM(t.quantity_purchased), 0) as total_fulfilled,
        COALESCE(SUM(t.actual_cost), 0) as total_spent
      FROM material_requirements r
      LEFT JOIN material_transactions t ON r.id = t.requirement_id
      WHERE r.project_id = $1
      GROUP BY r.id
      ORDER BY r.created_at DESC;
    `;
    
    const result = await db.query(query, [projectId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    sendError(res, 'Failed to fetch procurement dashboard data', error);
  }
});

router.delete('/requirements/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM material_requirements WHERE id = $1', [id]);
        res.json({ success: true, message: 'Requirement deleted successfully.' });
    } catch (error) {
        sendError(res, 'Failed to delete requirement', error);
    }
});

// =================================================================
//  TRANSACTIONS ENDPOINTS
// =================================================================

router.post('/transactions', upload.single('billImage'), async (req, res) => {
  try {
    const { requirementId, transactionDate, quantity, cost, vendor, notes } = req.body;
    const billFile = req.file;

    if (!requirementId || !transactionDate || !quantity || !cost) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }

    // Convert image to Base64 for immediate viewing without external storage
    let imageUrl = null;
    if (billFile) {
        const base64String = billFile.buffer.toString('base64');
        imageUrl = `data:${billFile.mimetype};base64,${base64String}`;
    }

    const result = await db.query(
      `INSERT INTO material_transactions 
       (requirement_id, transaction_date, quantity_purchased, actual_cost, vendor_name, invoice_image_url, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [requirementId, transactionDate, quantity, cost, vendor, imageUrl, notes]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Transaction logged successfully.' });
  } catch (error) {
    sendError(res, 'Failed to log transaction', error);
  }
});

// NEW: Edit Transaction Endpoint
router.put('/transactions/:id', upload.single('billImage'), async (req, res) => {
    try {
      const { id } = req.params;
      const { transactionDate, quantity, cost, vendor, notes } = req.body;
      const billFile = req.file;
  
      let imageUrl = null;
      let query = '';
      let params = [];

      // If a new file is uploaded, update the image. Otherwise, keep the old one.
      if (billFile) {
          const base64String = billFile.buffer.toString('base64');
          imageUrl = `data:${billFile.mimetype};base64,${base64String}`;
          query = `UPDATE material_transactions 
                   SET transaction_date = $1, quantity_purchased = $2, actual_cost = $3, vendor_name = $4, invoice_image_url = $5, notes = $6 
                   WHERE id = $7 RETURNING *`;
          params = [transactionDate, quantity, cost, vendor, imageUrl, notes, id];
      } else {
          query = `UPDATE material_transactions 
                   SET transaction_date = $1, quantity_purchased = $2, actual_cost = $3, vendor_name = $4, notes = $5 
                   WHERE id = $6 RETURNING *`;
          params = [transactionDate, quantity, cost, vendor, notes, id];
      }
  
      const result = await db.query(query, params);
  
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found.' });
  
      res.json({ success: true, data: result.rows[0], message: 'Transaction updated.' });
    } catch (error) {
      sendError(res, 'Failed to update transaction', error);
    }
});

router.get('/transactions/:requirementId', async (req, res) => {
    const { requirementId } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM material_transactions WHERE requirement_id = $1 ORDER BY transaction_date DESC',
            [requirementId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        sendError(res, 'Failed to fetch transaction history', error);
    }
});

router.delete('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM material_transactions WHERE id = $1', [id]);
        res.json({ success: true, message: 'Transaction deleted successfully.' });
    } catch (error) {
        sendError(res, 'Failed to delete transaction', error);
    }
});

export default router;