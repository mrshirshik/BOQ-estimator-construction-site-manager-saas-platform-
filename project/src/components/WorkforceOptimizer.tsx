import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, Sparkles, BrainCircuit, AlertCircle, CheckCircle } from 'lucide-react';

// =================================================================
//  TYPE DEFINITIONS
// =================================================================
interface Requirement {
  id: number;
  project_id: number;
  skill_set_required: string;
  required_headcount: number;
  start_date: string;
  end_date: string;
}

interface Recommendation {
  laborer_id: number;
  name: string;
  reason: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

interface AiRecommendationResponse {
    recommendations: Recommendation[];
}

// =================================================================
//  MAIN WORKFORCE OPTIMIZER COMPONENT
// =================================================================

const WorkforceOptimizer: React.FC<{ projectId: number }> = ({ projectId }) => {
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [recommendations, setRecommendations] = useState<Record<number, Recommendation[]>>({});
    const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
    const [assigningStates, setAssigningStates] = useState<Record<number, boolean>>({});
    const [error, setError] = useState<string | null>(null);

    const API_URL = '/api/workforce';

    const fetchRequirements = useCallback(async () => {
        try {
            const response = await axios.get<ApiResponse<Requirement[]>>(`${API_URL}/requirements/${projectId}`);
            if (response.data.success) {
                setRequirements(response.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch requirements", err);
            setError("Could not load labor requirements.");
        }
    }, [projectId]);

    useEffect(() => {
        fetchRequirements();
    }, [fetchRequirements]);

    const handleGetRecommendations = async (requirementId: number) => {
        setLoadingStates(prev => ({ ...prev, [requirementId]: true }));
        setError(null);
        try {
            const response = await axios.post<ApiResponse<AiRecommendationResponse>>(`${API_URL}/recommend`, { requirementId });
            if (response.data.success) {
                setRecommendations(prev => ({
                    ...prev,
                    [requirementId]: response.data.data.recommendations || []
                }));
            } else {
                 setError("The AI could not generate recommendations.");
            }
        } catch (err: any) {
            console.error("Failed to get AI recommendations", err);
            setError(err.response?.data?.message || "An error occurred while contacting the AI service.");
        } finally {
            setLoadingStates(prev => ({ ...prev, [requirementId]: false }));
        }
    };

    // --- NEW FUNCTION TO HANDLE ASSIGNMENT ---
    const handleAssignLaborer = async (requirementId: number, laborerId: number) => {
        setAssigningStates(prev => ({ ...prev, [laborerId]: true }));
        setError(null);
        try {
            await axios.post(`${API_URL}/assign`, { laborerId, requirementId });
            
            // On success, refresh the requirements list to show the updated headcount.
            fetchRequirements();
            
            // Clear out old recommendations for this requirement since the pool of available laborers has changed.
            setRecommendations(prev => {
                const newRecs = { ...prev };
                // Filter out the assigned laborer from the recommendation list for immediate UI feedback
                if(newRecs[requirementId]) {
                    newRecs[requirementId] = newRecs[requirementId].filter(rec => rec.laborer_id !== laborerId);
                }
                return newRecs;
            });

        } catch (err: any) {
            console.error("Failed to assign laborer", err);
            setError(err.response?.data?.message || "Failed to assign the laborer.");
        } finally {
            setAssigningStates(prev => ({ ...prev, [laborerId]: false }));
        }
    };


    return (
        <div className="bg-gray-900/50 border border-gray-700/80 rounded-xl p-6 mt-8">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <BrainCircuit size={22} className="mr-3 text-blue-400" />
                AI Workforce Optimizer
            </h3>

            {error && (
                 <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 flex items-center">
                    <AlertCircle size={18} className="mr-2" />
                    <p>{error}</p>
                </div>
            )}

            <div className="space-y-6">
                {requirements.length > 0 ? requirements.map(req => (
                    <div key={req.id} className="bg-gray-800/70 p-4 rounded-lg border border-gray-700">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                            <div>
                                <p className="font-bold text-lg text-white">
                                    Need: <span className="text-blue-400">{req.required_headcount} x {req.skill_set_required}</span>
                                </p>
                                <p className="text-sm text-gray-400">
                                    From {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => handleGetRecommendations(req.id)}
                                disabled={loadingStates[req.id]}
                                className="mt-3 sm:mt-0 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-500 w-full sm:w-auto"
                            >
                                {loadingStates[req.id] ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <Sparkles size={16} />
                                )}
                                <span>{loadingStates[req.id] ? 'Analyzing...' : 'Find Best Team'}</span>
                            </button>
                        </div>
                        
                        {recommendations[req.id] && (
                            <div className="mt-4 border-t border-gray-700 pt-4">
                                <h4 className="text-md font-semibold text-gray-200 mb-3">AI Recommendations:</h4>
                                <ul className="space-y-3">
                                    {recommendations[req.id].map(rec => (
                                        <li key={rec.laborer_id} className="bg-gray-700/50 p-3 rounded-md flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-white">{rec.name}</p>
                                                <p className="text-xs text-gray-400 italic">"{rec.reason}"</p>
                                            </div>
                                            <button 
                                                onClick={() => handleAssignLaborer(req.id, rec.laborer_id)}
                                                disabled={assigningStates[rec.laborer_id]}
                                                className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-md transition disabled:bg-gray-500"
                                            >
                                                {assigningStates[rec.laborer_id] ? 'Assigning...' : 'Assign'}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )) : (
                    <p className="text-gray-500 text-center py-4">No open labor requirements for this project.</p>
                )}
            </div>
        </div>
    );
};

export default WorkforceOptimizer;

