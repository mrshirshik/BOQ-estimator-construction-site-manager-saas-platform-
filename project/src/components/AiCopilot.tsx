import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bot, Sparkles, Clipboard, Check } from 'lucide-react';

// =================================================================
//  TYPE DEFINITIONS
// =================================================================
interface Project {
  id: number;
  name: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

// FIX: Added a new interface for the AI report API response
interface AiReportResponse {
    success: boolean;
    report?: string;
    message?: string;
}

// =================================================================
//  MAIN AI COPILOT COMPONENT
// =================================================================

const AiCopilot: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [generatedReport, setGeneratedReport] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [hasCopied, setHasCopied] = useState<boolean>(false);

    // Fetch the list of projects to populate the dropdown
    const fetchProjects = useCallback(async () => {
        try {
            const response = await axios.get<ApiResponse<Project[]>>('/api/projects/projects');
            setProjects(response.data.data || []);
            // Set the first project as the default selection
            if (response.data.data && response.data.data.length > 0) {
                setSelectedProjectId(String(response.data.data[0].id));
            }
        } catch (err) {
            console.error("Failed to fetch projects", err);
            setError('Could not load the list of projects.');
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Handle the AI report generation
    const handleGenerateReport = async () => {
        if (!selectedProjectId) {
            setError('Please select a project first.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setGeneratedReport('');

        try {
            // FIX: Applied the AiReportResponse type to the axios.post call
            const response = await axios.post<AiReportResponse>('/api/ai/generate-report', {
                projectId: parseInt(selectedProjectId, 10),
            });

            // The red lines below will now be gone
            if (response.data.success) {
                setGeneratedReport(response.data.report || '');
            } else {
                setError(response.data.message || 'An unknown error occurred.');
            }
        } catch (err: any) {
            console.error("Failed to generate AI report", err);
            setError(err.response?.data?.message || 'Failed to connect to the AI service.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopyToClipboard = () => {
        if (generatedReport) {
            navigator.clipboard.writeText(generatedReport).then(() => {
                setHasCopied(true);
                setTimeout(() => setHasCopied(false), 2000); // Reset after 2 seconds
            });
        }
    };

    return (
        <div className="p-6 text-white min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center space-x-3 mb-6">
                    <Bot size={32} className="text-blue-400" />
                    <h1 className="text-3xl font-bold">AI Project Copilot</h1>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-8 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Generate Project Progress Report</h2>
                        <p className="text-gray-400">Select a project and the AI Copilot will generate a professional executive summary based on the latest data.</p>
                    </div>

                    {/* Project Selector */}
                    <div className="flex items-end space-x-4">
                        <div className="flex-grow">
                            <label htmlFor="project-select" className="block text-sm font-medium text-gray-300 mb-2">Project</label>
                            <select
                                id="project-select"
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="w-full bg-gray-700 border-gray-600 rounded-md p-2.5 text-white focus:ring-2 focus:ring-blue-500"
                                disabled={projects.length === 0}
                            >
                                {projects.length > 0 ? (
                                    projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                ) : (
                                    <option>Loading projects...</option>
                                )}
                            </select>
                        </div>
                        <button 
                            onClick={handleGenerateReport}
                            disabled={isLoading || !selectedProjectId}
                            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <Sparkles size={18} />
                            )}
                            <span>{isLoading ? 'Generating...' : 'Generate Report'}</span>
                        </button>
                    </div>
                    
                    {error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-md">
                            <p><strong>Error:</strong> {error}</p>
                        </div>
                    )}

                    {/* Report Display Area */}
                    {generatedReport && (
                        <div className="space-y-4 pt-4">
                            <div className="relative">
                                <textarea
                                    readOnly
                                    value={generatedReport}
                                    className="w-full p-4 bg-gray-900/70 border border-gray-700 rounded-md text-gray-200 h-64 resize-none leading-relaxed"
                                />
                                 <button 
                                    onClick={handleCopyToClipboard}
                                    className="absolute top-3 right-3 p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition"
                                >
                                    {hasCopied ? <Check size={16} className="text-green-400" /> : <Clipboard size={16} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiCopilot;

