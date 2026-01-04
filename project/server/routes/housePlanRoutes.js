// server/routes/housePlanRoutes.js

import express from 'express';
import { generateHousePlan } from '../services/housePlanService.js';

const router = express.Router();

// POST endpoint to request a house plan generation
router.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body; // Expecting a 'prompt' in the request body
        
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required to generate a house plan.' });
        }

        console.log(`Received request to generate house plan for prompt: "${prompt}"`);

        // Call the service to interact with the Stability AI API
        const imageUrl = await generateHousePlan(prompt);

        if (imageUrl) {
            res.status(200).json({ imageUrl });
        } else {
            res.status(500).json({ message: 'Failed to generate house plan image. No image URL returned.' });
        }

    } catch (error) {
        console.error('Error in /api/house-plans/generate:', error.message);
        // Provide more detailed error message for debugging
        res.status(500).json({ 
            message: 'Internal server error during house plan generation.',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined // Only show stack in development
        });
    }
}); // This is the missing closing bracket for router.post

export default router; // This line was already there but needs the above to make sense