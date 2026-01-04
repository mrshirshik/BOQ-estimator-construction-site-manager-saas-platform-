// src/components/CashFlowPredictor.tsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    TrendingUp, 
    TrendingDown, 
    AlertTriangle, 
    BrainCircuit, 
    Plus, 
    Trash2, 
    Calendar,
    DollarSign
} from 'lucide-react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    ReferenceLine,
    Area,
    ComposedChart
} from 'recharts';

// =================================================================
//  TYPE DEFINITIONS
// =================================================================

interface Project {
    id: number;
    name: string;
}

interface Milestone {
    id: number;
    milestone_name: string;
    amount: number;
    expected_date: string;
    status: string;
}

interface ProjectionPoint {
    date: string;
    day: string;
    income: number;
    expense: number;
    balance: number;
    milestoneName: string | null;
}

interface AiAdvice {
    riskLevel: 'High' | 'Medium' | 'Low';
    analysis: string;
    recommendation: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

// =================================================================
//  MAIN COMPONENT
// =================================================================

const CashFlowPredictor: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    
    // Data States
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [projection, setProjection] = useState<ProjectionPoint[]>([]);
    const [dailyBurn, setDailyBurn] = useState<number>(0);
    const [aiAdvice, setAiAdvice] = useState<AiAdvice | null>(null);
    
    // Loading States
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Form State
    const [newMilestone, setNewMilestone] = useState({ name: '', amount: '', date: '' });

    // --- 1. Fetch Projects ---
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await axios.get<ApiResponse<Project[]>>('/api/projects/projects');
                setProjects(res.data.data || []);
                if (res.data.data && res.data.data.length > 0) {
                    setSelectedProjectId(String(res.data.data[0].id));
                }
            } catch (err) { console.error(err); }
        };
        fetchProjects();
    }, []);

    // --- 2. Fetch Financial Data (Milestones + Projection) ---
    const fetchData = useCallback(async () => {
        if (!selectedProjectId) return;
        setIsLoading(true);
        setAiAdvice(null); // Reset advice on project change
        try {
            // Get Milestones List
            const mRes = await axios.get<ApiResponse<Milestone[]>>(`/api/financials/milestones/${selectedProjectId}`);
            setMilestones(mRes.data.data);

            // Get 60-Day Projection
            const pRes = await axios.get<ApiResponse<{ projection: ProjectionPoint[], dailyBurnRate: number }>>(`/api/financials/cashflow/${selectedProjectId}`);
            setProjection(pRes.data.data.projection);
            setDailyBurn(pRes.data.data.dailyBurnRate);

        } catch (err) {
            console.error("Failed to load financials", err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedProjectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- 3. AI Analysis Handler ---
    const handleGetAdvice = async () => {
        setIsAnalyzing(true);
        try {
            const res = await axios.post<ApiResponse<AiAdvice>>('/api/financials/advise', {
                projectionData: projection,
                burnRate: dailyBurn
            });
            setAiAdvice(res.data.data);
        } catch (err) {
            alert("AI Analysis failed. Check your API key.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- 4. Milestone Handlers ---
    const handleAddMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newMilestone.name || !newMilestone.amount || !newMilestone.date) return;
        try {
            await axios.post('/api/financials/milestones', {
                projectId: selectedProjectId,
                name: newMilestone.name,
                amount: parseFloat(newMilestone.amount),
                date: newMilestone.date
            });
            setNewMilestone({ name: '', amount: '', date: '' });
            fetchData(); // Refresh graph
        } catch (err) { alert("Failed to add milestone"); }
    };

    const handleDeleteMilestone = async (id: number) => {
        if(!confirm("Delete this milestone?")) return;
        try {
            await axios.delete(`/api/financials/milestones/${id}`);
            fetchData();
        } catch (err) { alert("Failed to delete"); }
    };

    // Helper to format currency
    const fmt = (num: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

    return (
        <div className="p-6 text-white min-h-screen">
            <div className="max-w-7xl mx-auto">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center space-x-3">
                        <TrendingUp size={32} className="text-green-500" />
                        <div>
                            <h1 className="text-3xl font-bold">Cash Flow Crunch Predictor</h1>
                            <p className="text-gray-400 text-sm">Visualize future cash flow and predict shortages.</p>
                        </div>
                    </div>
                    <select 
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-white py-2 px-4 rounded-lg focus:outline-none focus:border-green-500"
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                {/* TOP STATS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-xl">
                        <p className="text-gray-400 text-xs uppercase font-bold">Daily Burn Rate (Labor)</p>
                        <p className="text-2xl font-bold text-red-400 mt-1">{fmt(dailyBurn)} / day</p>
                        <p className="text-xs text-gray-500 mt-2">Based on currently assigned team.</p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-xl">
                        <p className="text-gray-400 text-xs uppercase font-bold">Projected 60-Day Low</p>
                        {projection.length > 0 ? (
                             <p className={`text-2xl font-bold mt-1 ${Math.min(...projection.map(p => p.balance)) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {fmt(Math.min(...projection.map(p => p.balance)))}
                             </p>
                        ) : <p className="text-white">Loading...</p>}
                        <p className="text-xs text-gray-500 mt-2">Lowest bank balance in next 2 months.</p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold">AI Risk Analysis</p>
                            <p className="text-lg font-bold text-white mt-1">
                                {aiAdvice ? aiAdvice.riskLevel : "Not Analyzed"}
                            </p>
                        </div>
                        <button 
                            onClick={handleGetAdvice}
                            disabled={isAnalyzing}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition disabled:bg-gray-600"
                        >
                            {isAnalyzing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <BrainCircuit size={18} />}
                            <span>Analyze</span>
                        </button>
                    </div>
                </div>

                {/* MAIN GRAPH */}
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl mb-8 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-4">60-Day Cash Flow Forecast</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={projection}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#9CA3AF" 
                                    tickFormatter={(val) => new Date(val).getDate().toString()} // Show only day number to save space
                                    minTickGap={15}
                                />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                    formatter={(value: number) => fmt(value)}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Legend />
                                <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
                                
                                {/* The Cash Flow Line */}
                                <Line 
                                    type="monotone" 
                                    dataKey="balance" 
                                    name="Projected Balance" 
                                    stroke="#10B981" 
                                    strokeWidth={3} 
                                    dot={false} 
                                />
                                
                                {/* Income Spikes */}
                                <Line 
                                    type="step" 
                                    dataKey="income" 
                                    name="Income (Milestone)" 
                                    stroke="#3B82F6" 
                                    strokeWidth={2} 
                                    dot={({ payload, cx, cy }) => {
                                        return payload.income > 0 ? (
                                            <circle cx={cx} cy={cy} r={4} fill="#3B82F6" stroke="none" />
                                        ) : <></>;
                                    }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI ADVICE CARD */}
                {aiAdvice && (
                    <div className={`mb-8 border-l-4 rounded-r-xl p-6 ${aiAdvice.riskLevel === 'High' ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full ${aiAdvice.riskLevel === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">AI Financial Advisor</h3>
                                <p className="text-gray-300 mb-3"><strong>Analysis:</strong> {aiAdvice.analysis}</p>
                                <p className="text-white font-medium bg-black/20 p-3 rounded-lg border border-white/10">
                                    💡 <strong>Recommendation:</strong> {aiAdvice.recommendation}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* MILESTONE MANAGER */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left: Add Form */}
                    <div className="lg:col-span-1 bg-gray-800/50 border border-gray-700 rounded-xl p-6 h-fit">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                            <Plus size={18} className="mr-2" /> Add Expected Income
                        </h3>
                        <form onSubmit={handleAddMilestone} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400">Milestone Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Roof Casting Payment" 
                                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                                    value={newMilestone.name}
                                    onChange={e => setNewMilestone({...newMilestone, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Amount (₹)</label>
                                <input 
                                    type="number" 
                                    placeholder="500000" 
                                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                                    value={newMilestone.amount}
                                    onChange={e => setNewMilestone({...newMilestone, amount: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Expected Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                                    value={newMilestone.date}
                                    onChange={e => setNewMilestone({...newMilestone, date: e.target.value})}
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition">
                                Add Milestone
                            </button>
                        </form>
                    </div>

                    {/* Right: List */}
                    <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Upcoming Milestones</h3>
                        {milestones.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No milestones found. Add one to improve the forecast.</p>
                        ) : (
                            <div className="space-y-3">
                                {milestones.map(m => (
                                    <div key={m.id} className="flex items-center justify-between bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-green-900/30 p-2 rounded-full text-green-400">
                                                <DollarSign size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{m.milestone_name}</p>
                                                <p className="text-xs text-gray-400 flex items-center">
                                                    <Calendar size={12} className="mr-1" /> 
                                                    {new Date(m.expected_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-2 py-1 rounded text-xs ${m.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                {m.status}
                                            </span>
                                            <p className="font-mono font-bold text-white">{fmt(Number(m.amount))}</p>
                                            <button onClick={() => handleDeleteMilestone(m.id)} className="text-gray-500 hover:text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CashFlowPredictor;