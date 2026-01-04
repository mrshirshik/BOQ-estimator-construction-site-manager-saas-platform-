// server/services/housePlanService.js

import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

if (!STABILITY_API_KEY) {
    console.error('STABILITY_API_KEY is not set in .env file.');
    // In a production app, you might want to throw an error or exit here.
    // For now, we'll let it proceed and the API call will likely fail.
}

export const generateHousePlan = async (prompt) => {
    if (!STABILITY_API_KEY) {
        throw new Error('Stability AI API key is missing.');
    }

    // Stability AI API endpoint for image generation (e.g., Stable Diffusion XL)
    // Note: You might need to adjust this URL based on the specific Stability AI model
    // you are using and its documentation. This is a common endpoint for SDXL.
    const STABILITY_API_URL = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';
    // const STABILITY_API_URL = 'https://api.stability.ai/v1/generation/{engine_id}/text-to-image'; // Alternative if you have a specific engine ID

    try {
        const response = await fetch(STABILITY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json', // Important for Stability AI to get JSON response
                'Authorization': `Bearer ${STABILITY_API_KEY}`
            },
            body: JSON.stringify({
                text_prompts: [
                    {
                        text: `detailed top-down architectural floor plan, house plan, ${prompt}, blueprint style, modern design, professional drawing`
                    }
                ],
                // These are common Stability AI parameters. Adjust as needed.
                // You may need to experiment to find good values for architectural plans.
                height: 1024, // Optimal for SDXL (e.g., 768 or 1024)
                width: 1024,  // Optimal for SDXL
                samples: 1, // Number of images to generate (keep at 1 for MVP)
                steps: 30, // Number of diffusion steps
                cfg_scale: 7, // Classifier-free guidance scale
                seed: 0, // Random seed for reproducibility (0 for random)
                // clip_guidance_preset: 'FAST_BLUE', // Optional: for specific artistic styles
                // sampler: 'K_EULER_ANCESTRAL' // Optional: for specific sampling methods
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Stability AI API Error Response:', errorBody);
            throw new Error(`Stability AI API responded with status ${response.status}: ${JSON.stringify(errorBody)}`);
        }

        const data = await response.json();
        
        // Stability AI returns an array of base64 encoded images
        // For this MVP, we'll just return the first one as a data URL
        if (data.artifacts && data.artifacts.length > 0) {
            const base64Image = data.artifacts[0].base64;
            // Return as data URL for direct display in browser
            return `data:image/png;base64,${base64Image}`; 
        } else {
            return null; // No image artifact found
        }

    } catch (error) {
        console.error('Error calling Stability AI API:', error.message);
        throw error; // Re-throw to be caught by the route handler
    }
};