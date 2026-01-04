// client/src/components/HousePlanGenerator.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify'; 

// Define an interface for the expected API response data
interface GeneratePlanResponse {
    imageUrl: string;
}

const HousePlanGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [imageUrl, setImageUrl] = useState<string | null>(null); 
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGeneratePlan = async () => {
        setIsLoading(true);
        setImageUrl(null); 
        setError(null);    

        if (!prompt.trim()) {
            toast.warn("Please enter a prompt to generate a house plan.");
            setIsLoading(false);
            return;
        }

        try {
            toast.info("Generating house plan... This may take a moment (10-30 seconds).", { autoClose: 5000 });
            // Assert the type of the axios response data here
            const response = await axios.post<GeneratePlanResponse>('http://localhost:3001/api/house-plans/generate', { prompt });
            
            // Now TypeScript knows response.data is of type GeneratePlanResponse
            // so response.data.imageUrl is definitely a string.
            if (response.data && response.data.imageUrl) { 
                setImageUrl(response.data.imageUrl); 
                toast.success("House plan generated successfully!");
            } else {
                toast.error("Server responded successfully but no image URL was found in the data.");
                setError("Server responded successfully but no image URL was found in the data.");
            }
        } catch (err: any) {
            console.error('Error generating house plan:', err);
            const errorMessage = err.response?.data?.details || err.response?.data?.message || err.message || 'An unexpected error occurred.';
            setError(errorMessage);
            toast.error(`Error: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // Changed main container background and default text color for dark theme
        <div className="container mx-auto p-6 bg-gray-900 min-h-screen text-gray-100">
            {/* Adjusted header text color for dark theme */}
            <h1 className="text-3xl font-bold text-white mb-6">AI House Plan Generator</h1>

            {/* Adjusted card background for prompt section */}
            <div className="bg-gray-800 shadow-md rounded-lg p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <input
                        type="text"
                        // CRITICAL CHANGES FOR INPUT FIELD VISIBILITY:
                        className="flex-grow p-3 border border-gray-600 rounded-md shadow-sm 
                                   focus:ring-blue-500 focus:border-blue-500 
                                   bg-gray-700 text-white placeholder-gray-400" // Dark background, white text, visible placeholder
                        placeholder="e.g., modern 3-bedroom, 2-bathroom house with open living space"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleGeneratePlan}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm 
                                   hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading || !prompt.trim()} 
                    >
                        {isLoading ? 'Generating...' : 'Generate Plan'}
                    </button>
                </div>
                {error && (
                    // Adjusted error message styling for dark theme
                    <div className="text-red-400 text-sm mt-2 p-2 bg-red-900/50 rounded-md">{error}</div>
                )}
            </div>

            {isLoading && (
                // Adjusted loading message styling for dark theme
                <div className="text-center text-lg text-gray-300 mt-8 p-4 bg-gray-800 rounded-lg shadow-md">
                    <p>Generating your house plan. This can take 10-30 seconds, please be patient...</p>
                    <p className="text-sm mt-2">The AI is working hard on your design!</p>
                </div>
            )}

            {imageUrl && ( 
                // Adjusted image card background and text color for dark theme
                <div className="bg-gray-800 shadow-md rounded-lg p-6 mt-8">
                    <h2 className="text-xl font-semibold text-white mb-4">Generated House Plan:</h2>
                    <img 
                        src={imageUrl!} 
                        alt="Generated House Plan" 
                        className="max-w-full h-auto rounded-lg shadow-lg border border-gray-600" 
                    />
                    {/* Adjusted explanatory text color */}
                    <p className="text-gray-400 text-sm mt-4">
                        *The AI generates plans based on prompts. Structural accuracy and detailed blueprints require professional architectural design.
                    </p>
                </div>
            )}
        </div>
    );
};

export default HousePlanGenerator;