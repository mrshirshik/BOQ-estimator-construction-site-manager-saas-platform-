import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Users, UserPlus, BarChart2, DollarSign, Briefcase, UserCheck, UserX, AlertCircle, Award, CalendarDays, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// =================================================================
//  TYPE DEFINITIONS (FOR TYPESCRIPT)
// =================================================================
interface Laborer {
  id: number;
  name: string;
  skill_set: string;
  current_status: string;
  daily_rate: number | string;
  hire_date?: string;
}

interface Project {
  id: number;
  name: string;
}

interface StatusData {
  name: string;
  value: number;
}

interface SkillCostData {
  name: string;
  cost: number;
}

interface CostAllocationData {
  name: string;
  project_id: number;
  cost: number;
}

// A generic interface to describe the shape of all our API responses
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

const TabButton: React.FC<{ children: React.ReactNode; isActive: boolean; onClick: () => void }> = ({ children, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    {children}
  </button>
);

const ChartContainer: React.FC<{ title: string; children: React.ReactElement }> = ({ title, children }) => (
    <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 h-[400px]">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height="90%">
            {children}
        </ResponsiveContainer>
    </div>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-gray-900 border border-gray-700 rounded-md shadow-lg">
          <p className="label text-white">{`${label}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
};


// =================================================================
//  MAIN LABOUR MANAGEMENT COMPONENT
// =================================================================

const LaborManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLaborer, setEditingLaborer] = useState<Laborer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [skillCostData, setSkillCostData] = useState<SkillCostData[]>([]);
  const [costAllocationData, setCostAllocationData] = useState<CostAllocationData[]>([]);
  
  const API_URL = '/api/labour';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        laborersRes,
        statusRes,
        skillCostRes,
        costAllocationRes,
      ] = await Promise.all([
        axios.get<ApiResponse<Laborer[]>>(`${API_URL}/laborers`),
        axios.get<ApiResponse<StatusData[]>>(`${API_URL}/analytics/status`),
        axios.get<ApiResponse<SkillCostData[]>>(`${API_URL}/analytics/skill-cost`),
        axios.get<ApiResponse<CostAllocationData[]>>(`${API_URL}/analytics/cost-allocation`),
      ]);

      setLaborers(laborersRes.data.data || []);
      setStatusData(statusRes.data.data || []);
      setSkillCostData(skillCostRes.data.data || []);
      setCostAllocationData(costAllocationRes.data.data || []);

    } catch (err) {
      console.error("❌ Failed to fetch labour data:", err);
      setError("Failed to load data. Please check the network console for errors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    setProjects([{ id: 1, name: "Project Alpha" }, { id: 2, name: "Project Beta" }]);
  }, [fetchData]);

  const handleSaveLaborer = async (laborerData: Omit<Laborer, 'id'>) => {
    try {
      const dataToSend = {
        ...laborerData,
        skillSet: laborerData.skill_set,
        currentStatus: laborerData.current_status
      };
      
      if (editingLaborer) {
        await axios.put(`${API_URL}/laborers/${editingLaborer.id}`, dataToSend);
      } else {
        await axios.post(`${API_URL}/laborers`, dataToSend);
      }
      setIsModalOpen(false);
      setEditingLaborer(null);
      fetchData();
    } catch (error) {
      console.error("Error saving laborer:", error);
    }
  };

  const handleDeleteLaborer = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this laborer?')) {
      try {
        await axios.delete(`${API_URL}/laborers/${id}`);
        fetchData();
      } catch (error) {
        console.error("Error deleting laborer:", error);
      }
    }
  };
  
  // --- THIS IS THE FIX ---
  // Moved useMemo hooks to the top level of the component.
  // This ensures they are called on every render, following the Rules of Hooks.
  const skills = useMemo(() => {
    const skillCounts = laborers.reduce((acc, l) => {
        acc[l.skill_set] = (acc[l.skill_set] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(skillCounts).sort((a, b) => b[1] - a[1]);
  }, [laborers]);

  const mostExperienced = useMemo(() => {
      return [...laborers]
          .filter(l => l.hire_date)
          .sort((a, b) => new Date(a.hire_date!).getTime() - new Date(b.hire_date!).getTime())
          .slice(0, 5);
  }, [laborers]);
  
  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-red-400 bg-red-900/20 border border-red-800 rounded-xl m-6">
            <AlertCircle size={48} />
            <h2 className="text-xl font-semibold mt-4">An Error Occurred</h2>
            <p className="mt-2">{error}</p>
        </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-8 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Laborers" value={laborers.length} icon={<Users size={22}/>} color="blue" />
        <StatCard title="Available Workforce" value={statusData.find(s => s.name === 'Available')?.value || 0} icon={<UserCheck size={22}/>} color="green" />
        <StatCard title="Assigned to Projects" value={statusData.find(s => s.name === 'Assigned')?.value || 0} icon={<Briefcase size={22}/>} color="yellow" />
        <StatCard 
          title="Avg. Daily Rate" 
          value={laborers.length > 0 ? `₹${(laborers.reduce((acc, l) => acc + parseFloat(l.daily_rate as string), 0) / laborers.length).toFixed(2)}` : '₹0.00'} 
          icon={<DollarSign size={22}/>} 
          color="pink" 
        />
      </div>
      <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl">
        <div className="p-6 flex justify-between items-center border-b border-gray-700/80">
          <h3 className="text-lg font-semibold text-white">Workforce Directory</h3>
          <button onClick={() => { setEditingLaborer(null); setIsModalOpen(true); }} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            <UserPlus size={16} />
            <span>Add Laborer</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700/30">
              <tr>
                {['Name', 'Skill Set', 'Status', 'Daily Rate', 'Hire Date', ''].map(h => 
                  <th key={h} className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/80">
              {laborers.map((l: Laborer) => (
                <tr key={l.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4 text-white font-medium">{l.name}</td>
                  <td className="px-6 py-4 text-gray-300">{l.skill_set}</td>
                  <td className="px-6 py-4 text-gray-300">{l.current_status}</td>
                  <td className="px-6 py-4 text-gray-300">₹{parseFloat(l.daily_rate as string).toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-300">{l.hire_date ? new Date(l.hire_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { setEditingLaborer(l); setIsModalOpen(true); }} className="text-blue-400 hover:text-blue-300">Edit</button>
                    <button onClick={() => handleDeleteLaborer(l.id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTeamDirectory = () => {
    // Hooks have been moved to the top level. This function now just renders JSX.
    const getStatusColorClass = (status: string) => {
        switch (status) {
            case 'Available': return 'bg-green-500';
            case 'Assigned': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="space-y-8 mt-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Skills Matrix</h3>
                <div className="flex flex-wrap gap-4">
                    {skills.map(([skill, count]) => (
                        <div key={skill} className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2 flex items-center space-x-3">
                            <Wrench className="text-blue-400" size={18} />
                            <span className="font-medium text-white">{skill}</span>
                            <span className="text-sm font-bold bg-gray-700 text-gray-200 rounded-full px-2 py-0.5">{count}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Team Roster</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {laborers.map(l => (
                        <div key={l.id} className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-4 flex flex-col space-y-3">
                            <div className="flex items-center space-x-3">
                                <span className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
                                    {l.name.charAt(0)}
                                </span>
                                <div>
                                    <p className="font-semibold text-white truncate">{l.name}</p>
                                    <p className="text-sm text-gray-400">{l.skill_set}</p>
                                </div>
                            </div>
                             <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Status:</span>
                                <span className="flex items-center space-x-2 font-medium">
                                    <span className={`h-2 w-2 rounded-full ${getStatusColorClass(l.current_status)}`}></span>
                                    <span>{l.current_status}</span>
                                </span>
                            </div>
                            {l.hire_date && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Member Since:</span>
                                    <span className="font-medium">{new Date(l.hire_date).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };


  const renderCostAnalytics = () => {
    const TypedTooltip = Tooltip as React.ComponentType<any>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <ChartContainer title="Cost Allocation by Project">
                <BarChart data={costAllocationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    <XAxis type="number" stroke="#a0aec0" />
                    <YAxis dataKey="name" type="category" stroke="#a0aec0" width={80} />
                    <TypedTooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} />
                    <Legend />
                    <Bar dataKey="cost" stackId="a" fill="#3b82f6" name="Total Cost (₹)" />
                </BarChart>
            </ChartContainer>
            <ChartContainer title="Total Daily Cost per Skill">
                <BarChart data={skillCostData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    <XAxis dataKey="name" stroke="#a0aec0" />
                    <YAxis stroke="#a0aec0" />
                    <TypedTooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} />
                    <Legend />
                    <Bar dataKey="cost" fill="#8b5cf6" name="Total Daily Rate (₹)" />
                </BarChart>
            </ChartContainer>
        </div>
    );
  };

  if (loading) return <div className="text-white text-center p-10">Loading Labour Data...</div>;

  return (
    <div className="p-6 text-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center space-x-3 mb-6">
          <Users size={32} className="text-blue-400" />
          <h1 className="text-3xl font-bold">Enhanced Labour Management</h1>
        </div>
        
        <div className="flex space-x-2 border-b border-gray-700 pb-2">
          <TabButton isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>Dashboard & CRUD</TabButton>
          <TabButton isActive={activeTab === 'team'} onClick={() => setActiveTab('team')}>Team Directory & Skills</TabButton>
          <TabButton isActive={activeTab === 'cost'} onClick={() => setActiveTab('cost')}>Cost & Efficiency</TabButton>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'team' && renderTeamDirectory()}
        {activeTab === 'cost' && renderCostAnalytics()}
      </div>

      {isModalOpen && 
        <LaborerModal 
          laborer={editingLaborer} 
          onClose={() => { setIsModalOpen(false); setEditingLaborer(null); }} 
          onSave={handleSaveLaborer}
        />
      }
    </div>
  );
};

// =================================================================
//  MODAL FORM COMPONENT (SELF-CONTAINED)
// =================================================================

interface LaborerModalProps {
    laborer: Laborer | null;
    onClose: () => void;
    onSave: (data: Omit<Laborer, 'id'>) => void;
}

const LaborerModal: React.FC<LaborerModalProps> = ({ laborer, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        skill_set: '',
        current_status: 'Available',
        daily_rate: '',
        hire_date: ''
    });

    useEffect(() => {
        if (laborer) {
            setFormData({
                name: laborer.name,
                skill_set: laborer.skill_set,
                current_status: laborer.current_status,
                daily_rate: String(laborer.daily_rate),
                hire_date: laborer.hire_date ? new Date(laborer.hire_date).toISOString().split('T')[0] : ''
            });
        } else {
            setFormData({ name: '', skill_set: '', current_status: 'Available', daily_rate: '', hire_date: '' });
        }
    }, [laborer]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            daily_rate: parseFloat(formData.daily_rate) || 0
        };
        onSave(dataToSave);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-6">{laborer ? 'Edit Laborer' : 'Add New Laborer'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField label="Name" name="name" value={formData.name} onChange={handleChange} required />
                    <InputField label="Skill Set" name="skill_set" value={formData.skill_set} onChange={handleChange} placeholder="e.g., Mason, Carpenter" required />
                    <InputField label="Daily Rate (₹)" name="daily_rate" type="number" value={formData.daily_rate} onChange={handleChange} required />
                    <InputField label="Hire Date" name="hire_date" type="date" value={formData.hire_date} onChange={handleChange} />
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Status</label>
                        <select name="current_status" value={formData.current_status} onChange={handleChange} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white">
                            <option>Available</option>
                            <option>Assigned</option>
                            <option>On Leave</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400">{label}</label>
        <input {...props} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" />
    </div>
);


export default LaborManagement;

