// server/routes/diaryRoutes.js
import express from 'express';
import createPool from '../lib/db.js';
import multer from 'multer';

const router = express.Router();
const db = createPool();

// Configure Multer: Allow up to 5 files max
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
});

const sendError = (res, message, error) => {
  console.error(`❌ Diary Route Error: ${message}`, error.message || error);
  res.status(500).json({ success: false, message: `${message}: ${error.message}` });
};

// =================================================================
//  DIARY ENDPOINTS
// =================================================================

/**
 * GET /api/diary/entries/:projectId
 * Fetches the timeline of diary entries.
 */
router.get('/entries/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM site_diary_entries WHERE project_id = $1 ORDER BY entry_date DESC, created_at DESC',
            [projectId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        sendError(res, 'Failed to fetch diary entries', error);
    }
});

/**
 * POST /api/diary/entries
 * Logs a new entry with MULTIPLE photos.
 */
router.post('/entries', upload.array('sitePhotos', 5), async (req, res) => {
    try {
        const { projectId, date, weather, activities, issues } = req.body;
        const files = req.files; // Array of files

        if (!projectId || !date || !activities) {
            return res.status(400).json({ success: false, message: 'Project, Date, and Activity Summary are required.' });
        }

        // Process multiple images into Base64 array
        const photoUrls = [];
        if (files && files.length > 0) {
            files.forEach(file => {
                const base64String = file.buffer.toString('base64');
                photoUrls.push(`data:${file.mimetype};base64,${base64String}`);
            });
        }

        // Store as JSON string
        const photosJson = JSON.stringify(photoUrls);

        const result = await db.query(
            `INSERT INTO site_diary_entries 
             (project_id, entry_date, weather_condition, activities_summary, issues_or_delays, site_photos) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [projectId, date, weather, activities, issues, photosJson]
        );

        res.status(201).json({ success: true, data: result.rows[0], message: 'Diary entry logged successfully.' });

    } catch (error) {
        sendError(res, 'Failed to create diary entry', error);
    }
});

/**
 * PUT /api/diary/entries/:id
 * Updates an existing entry (Text + Appending new photos).
 */
router.put('/entries/:id', upload.array('sitePhotos', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const { date, weather, activities, issues, existingPhotos } = req.body;
        const files = req.files;

        // 1. Get existing data to merge photos
        let currentPhotos = [];
        if (existingPhotos) {
            try {
                currentPhotos = JSON.parse(existingPhotos);
            } catch (e) {
                currentPhotos = []; // Fallback
            }
        }

        // 2. Process NEW images
        const newPhotoUrls = [];
        if (files && files.length > 0) {
            files.forEach(file => {
                const base64String = file.buffer.toString('base64');
                newPhotoUrls.push(`data:${file.mimetype};base64,${base64String}`);
            });
        }

        // 3. Combine Lists
        const finalPhotoList = JSON.stringify([...currentPhotos, ...newPhotoUrls]);

        const result = await db.query(
            `UPDATE site_diary_entries 
             SET entry_date = $1, weather_condition = $2, activities_summary = $3, issues_or_delays = $4, site_photos = $5
             WHERE id = $6
             RETURNING *`,
            [date, weather, activities, issues, finalPhotoList, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Entry not found' });
        }

        res.json({ success: true, data: result.rows[0], message: 'Diary entry updated.' });

    } catch (error) {
        sendError(res, 'Failed to update diary entry', error);
    }
});

/**
 * DELETE /api/diary/entries/:id
 */
router.delete('/entries/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM site_diary_entries WHERE id = $1', [id]);
        res.json({ success: true, message: 'Diary entry deleted.' });
    } catch (error) {
        sendError(res, 'Failed to delete diary entry', error);
    }
});

export default router;