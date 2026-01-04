import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FolderOpen, PlusCircle, LayoutGrid, List, AlertCircle, TrendingUp, DollarSign, Clock, CalendarDays, X, Edit, Trash2, Users, Wrench } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ProjectManager from './ProjectManager'; // The modal for Add/Edit
import WorkforceOptimizer from './WorkforceOptimizer'; // The AI component

// =================================================================
//  TYPE DEFINITIONS
// =================================================================
interface Project {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  budget: number;
  location: string;
  actuals: number;
}

// Added Laborer type for the new form's dropdown
interface Laborer {
  id: number;
  name: string;
  skill_set: string;
}

interface ProjectStats {
    activeProjects: number;
    totalBudget: number;
    projectsOverdue: number;
    averageDuration: number;
}

interface FinancialData {
    budget: number;
    totalActuals: number;
    remainingBudget: number;
    costBreakdown: { name: string; value: number }[];
}

interface CostEntry {
    id: number;
    cost_type: string;
    amount: number;
    description: string;
    entry_date: string;
}

interface ProjectData {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: string;
    budget: number;
    location: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}


// =================================================================
//  HELPER & REUSABLE UI COMPONENTS
// =================================================================
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className={`bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 flex items-center space-x-4`}>
    <div className={`p-3 rounded-lg bg-${color}-500/20 text-${color}-400`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const ViewSwitcher: React.FC<{ view: 'timeline' | 'kanban'; setView: (view: 'timeline' | 'kanban') => void }> = ({ view, setView }) => (
    <div className="flex space-x-1 bg-gray-800/50 border border-gray-700 p-1 rounded-lg">
        <button onClick={() => setView('timeline')} className={`px-3 py-1.5 rounded-md text-sm transition ${view === 'timeline' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <List size={18} className="inline mr-2" /> Timeline
        </button>
        <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-md text-sm transition ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <LayoutGrid size={18} className="inline mr-2" /> Kanban
        </button>
    </div>
);

// =================================================================
//  MAIN PROJECT MANAGEMENT COMPONENT
// =================================================================
const ProjectManagement: React.FC = () => {
    const [view, setView] = useState<'timeline' | 'kanban'>('timeline');
    const [projects, setProjects] = useState<Project[]>([]);
    const [laborers, setLaborers] = useState<Laborer[]>([]); // New state for laborers list
    const [stats, setStats] = useState<ProjectStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const fetchData = useCallback(async () => {
        setError(null);
        try {
            const [projectsRes, statsRes, laborersRes] = await Promise.all([
                axios.get<ApiResponse<Project[]>>(`/api/projects/projects`),
                axios.get<ApiResponse<ProjectStats>>(`/api/projects/analytics/stats`),
                axios.get<ApiResponse<Laborer[]>>(`/api/labour/laborers`), // Fetch laborers
            ]);
            setProjects(projectsRes.data.data || []);
            setStats(statsRes.data.data || null);
            setLaborers(laborersRes.data.data || []);
        } catch (err) {
            console.error("❌ Failed to fetch page data:", err);
            setError("Failed to load project data. Please check the console.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    const handleSaveProject = async (projectData: ProjectData) => {
        try {
          const dataToSend = {
            name: projectData.name,
            description: projectData.description,
            startDate: projectData.start_date,
            endDate: projectData.end_date,
            status: projectData.status,
            budget: projectData.budget,
            location: projectData.location,
          };

          if (selectedProject && selectedProject.id) {
            await axios.put(`/api/projects/projects/${selectedProject.id}`, dataToSend);
          } else {
            await axios.post(`/api/projects/projects`, dataToSend);
          }
          setIsManagerModalOpen(false);
          fetchData(); 
        } catch (error) {
          console.error("Failed to save project", error);
        }
    };
    
    const handleDeleteProject = async (projectId: number) => {
        if (window.confirm('Are you sure you want to delete this project? This will also delete all associated costs.')) {
            try {
                await axios.delete(`/api/projects/projects/${projectId}`);
                fetchData(); 
            } catch (error) {
                console.error("Failed to delete project", error);
            }
        }
    };

    const handleStatusUpdate = async (projectId: number, newStatus: string) => {
        const originalProjects = [...projects];
        setProjects(prevProjects => prevProjects.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
        try {
            await axios.put(`/api/projects/${projectId}/status`, { status: newStatus });
        } catch (error) {
            console.error("Failed to update status:", error);
            setProjects(originalProjects);
        }
    };

    const handleOpenDetailModal = (project: Project) => {
        setSelectedProject(project);
        setIsDetailModalOpen(true);
    };

    const handleOpenManagerModal = (project: Project | null) => {
        setSelectedProject(project);
        setIsManagerModalOpen(true);
    };

    if (loading) return <div className="text-white text-center p-10">Loading Project Data...</div>;
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-red-400 bg-red-900/20 border border-red-800 rounded-xl m-6">
                <AlertCircle size={48} />
                <h2 className="text-xl font-semibold mt-4">An Error Occurred</h2>
                <p className="mt-2">{error}</p>
            </div>
        );
    }
    
    return (
        <div className="p-6 text-white min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <FolderOpen size={32} className="text-blue-400" />
                        <h1 className="text-3xl font-bold">Project Command Center</h1>
                    </div>
                    <button onClick={() => handleOpenManagerModal(null)} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                        <PlusCircle size={16} />
                        <span>New Project</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Active Projects" value={stats?.activeProjects ?? 0} icon={<TrendingUp size={22} />} color="blue" />
                    <StatCard title="Total Budget" value={`₹${(stats?.totalBudget ?? 0).toLocaleString()}`} icon={<DollarSign size={22} />} color="green" />
                    <StatCard title="Projects Overdue" value={stats?.projectsOverdue ?? 0} icon={<Clock size={22} />} color="red" />
                    <StatCard title="Avg. Duration" value={`${stats?.averageDuration ?? 0} days`} icon={<CalendarDays size={22} />} color="yellow" />
                </div>
                
                <div className="flex justify-end mb-4">
                    <ViewSwitcher view={view} setView={setView} />
                </div>

                {view === 'timeline' ? <TimelineView projects={projects} onProjectClick={handleOpenDetailModal} onEditClick={handleOpenManagerModal} onDeleteClick={handleDeleteProject} /> : <KanbanView projects={projects} onStatusUpdate={handleStatusUpdate} />}
            </div>

            <ProjectManager
                isOpen={isManagerModalOpen}
                onClose={() => setIsManagerModalOpen(false)}
                onSave={handleSaveProject}
                project={selectedProject}
            />

            {isDetailModalOpen && selectedProject && (
                <ProjectDetailModal 
                    project={selectedProject}
                    laborers={laborers}
                    onClose={() => setIsDetailModalOpen(false)}
                    onDataUpdate={fetchData}
                />
            )}
        </div>
    );
};

// =================================================================
//  TIMELINE & KANBAN VIEW COMPONENTS
// =================================================================
const TimelineView: React.FC<{ projects: Project[], onProjectClick: (project: Project) => void, onEditClick: (project: Project) => void, onDeleteClick: (id: number) => void }> = ({ projects, onProjectClick, onEditClick, onDeleteClick }) => {
    const parseDateAsUTC = (dateString: string | null) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
    };

    const getProjectProgress = (project: Project) => {
        if (project.status === 'Completed') return 100;
        if (project.status === 'Cancelled' || !project.start_date || !project.end_date) return 0;
        
        const start = parseDateAsUTC(project.start_date)?.getTime();
        const end = parseDateAsUTC(project.end_date)?.getTime();
        if (!start || !end) return 0;
        
        const nowUTC = new Date();
        const now = Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate(), 12, 0, 0);

        if (now < start) return 0;
        if (now > end) return 100;

        const totalDuration = end - start;
        if (totalDuration <= 0) return 0;

        return Math.round(((now - start) / totalDuration) * 100);
    };

    const getDaysRemaining = (endDate: string | null) => {
        if (!endDate) return { text: 'N/A', color: 'text-gray-400' };
        const end = parseDateAsUTC(endDate);
        if(!end) return { text: 'N/A', color: 'text-gray-400' };

        const now = new Date();
        now.setUTCHours(0,0,0,0);
        
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diff < 0) return { text: `${Math.abs(diff)} days overdue`, color: 'text-red-400' };
        if (diff === 0) return { text: 'Ends today', color: 'text-yellow-400' };
        return { text: `${diff} days remaining`, color: 'text-gray-300' };
    };
    
    return (
        <div className="space-y-4">
            {projects.map(project => {
                const budgetProgress = project.budget > 0 ? ((project.actuals || 0) / project.budget) * 100 : 0;
                const timeProgress = getProjectProgress(project);
                const daysLeft = getDaysRemaining(project.end_date);
                return (
                    <div key={project.id} className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-4 group relative">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                            <div onClick={() => onProjectClick(project)} className="cursor-pointer flex-grow">
                                <p className="font-bold text-lg text-white group-hover:text-blue-400 transition">{project.name}</p>
                                <p className="text-sm text-gray-400">{project.location}</p>
                            </div>
                             <div className="flex items-center space-x-6 text-center mt-4 sm:mt-0">
                                <div><p className="text-xs text-gray-400">Actuals</p><p className="font-semibold">₹{(project.actuals || 0).toLocaleString()}</p></div>
                                <div><p className="text-xs text-gray-400">Budget</p><p className="font-semibold">₹{project.budget.toLocaleString()}</p></div>
                             </div>
                        </div>
                        <div className="absolute top-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEditClick(project)} className="text-blue-400 hover:text-blue-300 p-1.5 bg-gray-700/50 rounded-md">
                                <Edit size={16} />
                            </button>
                            <button onClick={() => onDeleteClick(project.id)} className="text-red-400 hover:text-red-300 p-1.5 bg-gray-700/50 rounded-md">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        <div className="mt-4 space-y-3 cursor-pointer" onClick={() => onProjectClick(project)} >
                             <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-semibold ${daysLeft.color}`}>Timeline: {daysLeft.text}</span>
                                    <span className="text-xs font-bold text-white">{timeProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${timeProgress}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-semibold text-gray-300">Budget Utilization</span>
                                    <span className={`text-xs font-bold ${budgetProgress > 100 ? 'text-red-400' : 'text-white'}`}>{budgetProgress.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div className={`${budgetProgress > 100 ? 'bg-red-600' : 'bg-green-600'} h-2 rounded-full`} style={{ width: `${Math.min(budgetProgress, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

const KanbanView: React.FC<{ projects: Project[], onStatusUpdate: (id: number, status: string) => void }> = ({ projects, onStatusUpdate }) => {
    const kanbanColumns = ['Planning', 'In Progress', 'On Hold', 'Completed'];

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, projectId: number) => {
        e.dataTransfer.setData("projectId", String(projectId));
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
        e.preventDefault();
        const projectId = parseInt(e.dataTransfer.getData("projectId"));
        const project = projects.find(p => p.id === projectId);
        if (project && project.status !== newStatus) {
            onStatusUpdate(projectId, newStatus);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kanbanColumns.map(status => (
                <div key={status} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status)} className="bg-gray-800/40 rounded-lg p-4 min-h-[300px]">
                    <h3 className="font-semibold text-white border-b border-gray-700 pb-2 mb-4">{status}</h3>
                    <div className="space-y-3">
                        {projects.filter(p => p.status === status).map(project => (
                             <div key={project.id} draggable onDragStart={(e) => handleDragStart(e, project.id)} className="bg-gray-700/50 p-3 rounded-lg cursor-grab active:cursor-grabbing">
                                <p className="font-semibold text-sm text-white">{project.name}</p>
                                <p className="text-xs text-gray-400 mt-1">{project.location}</p>
                                 <div className="text-xs mt-2 flex justify-between items-center">
                                     <span className="text-gray-300">Budget: ₹{project.budget.toLocaleString()}</span>
                                     {project.end_date && <span className="text-gray-400">Due: {new Date(project.end_date).toLocaleDateString()}</span>}
                                 </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};


// =================================================================
//  PROJECT DETAIL & FINANCIALS MODAL
// =================================================================
const ProjectDetailModal: React.FC<{ project: Project; laborers: Laborer[]; onClose: () => void; onDataUpdate: () => void; }> = ({ project, laborers, onClose, onDataUpdate }) => {
    const [financials, setFinancials] = useState<FinancialData | null>(null);
    const [costs, setCosts] = useState<CostEntry[]>([]);
    const [assignedTeam, setAssignedTeam] = useState<Laborer[]>([]); // <-- 1. ADDED NEW STATE
    const [isLoading, setIsLoading] = useState(true);
    const [optimizerKey, setOptimizerKey] = useState(Date.now());

    const TypedPie = Pie as React.ComponentType<any>;
    const PIE_COLORS = ['#3b82f6', '#10b981', '#f97316', '#ec4899', '#8b5cf6'];

    const fetchDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            // --- 2. UPDATED DATA FETCHING ---
            const [financialsRes, costsRes, assignedTeamRes] = await Promise.all([
                axios.get<ApiResponse<FinancialData>>(`/api/projects/${project.id}/financials`),
                axios.get<ApiResponse<CostEntry[]>>(`/api/projects/${project.id}/costs`),
                axios.get<ApiResponse<Laborer[]>>(`/api/labour/assigned/${project.id}`), 
            ]);
            setFinancials(financialsRes.data.data);
            setCosts(costsRes.data.data);
            setAssignedTeam(assignedTeamRes.data.data || []); // <-- Set the new state
        } catch (error) {
            console.error("Failed to fetch project details", error);
        } finally {
            setIsLoading(false);
        }
    }, [project.id]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleCostAdded = () => {
        fetchDetails(); 
        onDataUpdate(); 
    };
    
    const handleRequirementAdded = () => {
        setOptimizerKey(Date.now());
    };
    
    return (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-6xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">{project.name} - Project Details</h2>
                  <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="space-y-8">
                    {isLoading ? <p>Loading details...</p> : (
                        <div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 space-y-8">
                                    {financials && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-2">Financial Overview</h3>
                                            <div className="h-[250px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <TypedPie data={financials.costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} label>
                                                            {financials.costBreakdown.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                            ))}
                                                        </TypedPie>
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="mt-4 space-y-2">
                                                <div className="flex justify-between text-lg"><span className="text-gray-400">Budget:</span><span className="font-semibold text-green-400">₹{financials.budget.toLocaleString()}</span></div>
                                                <div className="flex justify-between text-lg"><span className="text-gray-400">Actuals:</span><span className="font-semibold text-yellow-400">₹{financials.totalActuals.toLocaleString()}</span></div>
                                                <div className="flex justify-between text-lg"><span className="text-gray-400">Remaining:</span><span className={`font-semibold ${financials.remainingBudget < 0 ? 'text-red-400' : 'text-white'}`}>₹{financials.remainingBudget.toLocaleString()}</span></div>
                                            </div>
                                        </div>
                                    )}
                                    {/* --- 3. ADDED THE "ASSIGNED TEAM" UI SECTION --- */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-2">Currently Assigned Team</h3>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 bg-gray-900/50 p-3 rounded-lg">
                                            {assignedTeam.length > 0 ? assignedTeam.map(l => (
                                                <div key={l.id} className="bg-gray-700/50 p-2 rounded-md flex items-center space-x-3">
                                                    <Users size={16} className="text-blue-400 flex-shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-white text-sm">{l.name}</p>
                                                        <p className="text-xs text-gray-400">{l.skill_set}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="flex items-center justify-center h-full py-4">
                                                    <p className="text-sm text-gray-500">No laborers currently assigned.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-2 space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-white mb-2">Log Labor Hours</h4>
                                        <LogHoursForm projectId={project.id} laborers={laborers} onTimeEntryAdded={handleCostAdded} />
                                    </div>
                                     <div>
                                        <h4 className="font-semibold text-white mb-2">Log Other Costs</h4>
                                        <AddCostForm projectId={project.id} onCostAdded={handleCostAdded} />
                                        <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto pr-2">
                                            {costs.map(cost => (
                                                <div key={cost.id} className="bg-gray-700/50 p-2 rounded-md flex justify-between">
                                                    <div>
                                                        <p className="font-medium text-white">{cost.cost_type}</p>
                                                        <p className="text-xs text-gray-400">{cost.description}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-white">₹{cost.amount.toLocaleString()}</p>
                                                        <p className="text-xs text-gray-400">{new Date(cost.entry_date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                     </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <AddRequirementForm projectId={project.id} onRequirementAdded={handleRequirementAdded} />
                    <WorkforceOptimizer key={optimizerKey} projectId={project.id} />
                </div>
            </div>
         </div>
    );
};

// =================================================================
//  FORM TO ADD A LABOR REQUIREMENT & OTHER COSTS
// =================================================================
const AddRequirementForm: React.FC<{ projectId: number; onRequirementAdded: () => void }> = ({ projectId, onRequirementAdded }) => {
    const [skill, setSkill] = useState('Mason');
    const [headcount, setHeadcount] = useState('1');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!skill || !headcount || !startDate || !endDate) return;
        setIsSubmitting(true);
        try {
            await axios.post('/api/workforce/requirements', {
                projectId,
                skillSetRequired: skill,
                requiredHeadcount: parseInt(headcount),
                startDate,
                endDate,
            });
            setSkill('Mason');
            setHeadcount('1');
            setStartDate('');
            setEndDate('');
            onRequirementAdded();
        } catch (error) {
            console.error("Failed to add requirement", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">Request New Labor</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end bg-gray-900/50 p-4 rounded-lg">
                <div className="sm:col-span-2">
                    <label className="text-xs text-gray-400">Skill Set</label>
                    <select value={skill} onChange={e => setSkill(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm">
                        <option>Mason</option>
                        <option>Carpenter</option>
                        <option>Electrician</option>
                        <option>Plumber</option>
                        <option>General Labor</option>
                    </select>
                </div>
                 <div>
                    <label className="text-xs text-gray-400">Headcount</label>
                    <input type="number" value={headcount} onChange={e => setHeadcount(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm" min="1" required />
                </div>
                 <div>
                    <label className="text-xs text-gray-400">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm" required />
                </div>
                 <div>
                    <label className="text-xs text-gray-400">End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm" required />
                </div>
                 <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white rounded-md py-2 text-sm w-full disabled:bg-gray-500 col-span-full sm:col-span-1">
                    {isSubmitting ? 'Adding...' : 'Add Request'}
                </button>
            </form>
        </div>
    );
};


const AddCostForm: React.FC<{ projectId: number, onCostAdded: () => void }> = ({ projectId, onCostAdded }) => {
    const [costType, setCostType] = useState('Material');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!costType || !amount || !entryDate) return;
        setIsSubmitting(true);
        try {
            await axios.post(`/api/projects/${projectId}/costs`, {
                cost_type: costType,
                amount: parseFloat(amount),
                description: description,
                entry_date: entryDate,
            });
            setAmount('');
            setDescription('');
            onCostAdded();
        } catch (error) {
            console.error("Failed to add cost", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-gray-900/50 p-2 rounded-lg">
            <select value={costType} onChange={(e) => setCostType(e.target.value)} className="bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm w-full">
                <option>Material</option><option>Subcontractor</option><option>Permit</option><option>Other</option>
            </select>
            <input type="number" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm w-full" required />
            <input type="text" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm w-full" />
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white rounded-md py-2 text-sm w-full disabled:bg-gray-500">
                {isSubmitting ? 'Adding...' : 'Add Cost'}
            </button>
        </form>
    );
};


const LogHoursForm: React.FC<{ projectId: number; laborers: Laborer[]; onTimeEntryAdded: () => void }> = ({ projectId, laborers, onTimeEntryAdded }) => {
    const [laborerId, setLaborerId] = useState<string>('');
    const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
    const [hoursWorked, setHoursWorked] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (laborers.length > 0 && !laborerId) {
            setLaborerId(String(laborers[0].id));
        }
    }, [laborers, laborerId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!laborerId || !workDate || !hoursWorked) return;
        setIsSubmitting(true);
        try {
            await axios.post('/api/labour/time-entry', {
                laborer_id: parseInt(laborerId),
                project_id: projectId,
                work_date: workDate,
                hours_worked: parseFloat(hoursWorked),
            });
            setHoursWorked('');
            onTimeEntryAdded();
        } catch (error) {
            console.error("Failed to log time entry", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-gray-900/50 p-4 rounded-lg">
            <div className="sm:col-span-2">
                <label className="text-xs text-gray-400">Select Laborer</label>
                <select value={laborerId} onChange={e => setLaborerId(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm">
                    {laborers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.skill_set})</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs text-gray-400">Work Date</label>
                <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm" required />
            </div>
            <div>
                <label className="text-xs text-gray-400">Hours Worked</label>
                <input type="number" value={hoursWorked} onChange={e => setHoursWorked(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm" step="0.5" min="0" required />
            </div>
            <button type="submit" disabled={isSubmitting} className="bg-green-600 text-white rounded-md py-2 text-sm w-full disabled:bg-gray-500 col-span-full">
                {isSubmitting ? 'Logging...' : 'Log Hours'}
            </button>
        </form>
    );
};

export default ProjectManagement;

