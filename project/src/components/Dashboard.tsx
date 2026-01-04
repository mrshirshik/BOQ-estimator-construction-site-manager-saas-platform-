// src/components/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { 
    Building2, 
    Calculator, 
    Users, 
    BarChart as BarChartIcon,
    Activity, 
    ArrowUpRight, 
    Package,
    ArrowRight,
    Sparkles,
    Plus,
    Clock,
    FileText,
    Zap,
    TrendingUp
} from 'lucide-react';
import MagicBento, { CardData } from './MagicBento';

interface DashboardStats {
  totalProjects: number;
  totalRates: number;
  totalBoqItems: number;
  totalLaborers: number;
  projectHealthData: { name: string; budget: number; actuals: number }[];
  recentActivity: { type: string; description: string; date: string; project_name: string }[];
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalRates: 0,
    totalBoqItems: 0,
    totalLaborers: 0,
    projectHealthData: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={24} className="text-purple-400 animate-pulse" />
            </div>
        </div>
      </div>
    );
  }

  // Calculate Overall Budget Utilization
  const totalBudget = stats.projectHealthData.reduce((acc, curr) => acc + parseFloat(String(curr.budget)), 0);
  const totalSpent = stats.projectHealthData.reduce((acc, curr) => acc + parseFloat(String(curr.actuals)), 0);
  const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // 1. Top Stats Cards (Standard Aspect Ratio is fine here)
  const topCards: CardData[] = [
    {
        id: 'projects',
        title: stats.totalProjects,
        description: 'Active Projects',
        label: 'Projects',
        color: '#0a0f1e',
        icon: <Building2 size={24} className="text-blue-400" />
    },
    {
        id: 'workforce',
        title: stats.totalLaborers,
        description: 'Registered Workforce',
        label: 'Workforce',
        color: '#1a0b05',
        icon: <Users size={24} className="text-orange-400" />
    },
    {
        id: 'estimates',
        title: stats.totalBoqItems,
        description: 'BOQ Items',
        label: 'Estimates',
        color: '#140518',
        icon: <Calculator size={24} className="text-purple-400" />
    },
    {
        id: 'rates',
        title: stats.totalRates,
        description: 'Market Rates',
        label: 'Database',
        color: '#05180b',
        icon: <BarChartIcon size={24} className="text-green-400" />
    }
  ];

  // 2. Bottom Activity & Budget Cards
  const bottomCards: CardData[] = [
    {
        id: 'activity',
        colSpan: 2,
        color: 'rgba(10, 10, 16, 0.8)',
        // FIX: '!aspect-auto' removes the 4/3 ratio. 'h-[420px]' forces a fixed height.
        // This shrinks the activity card (which was too tall) and ensures consistency.
        className: '!aspect-auto h-[420px]', 
        children: (
            <div className="h-full flex flex-col relative z-10">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <Activity size={20} className="text-orange-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Recent Updates</h3>
                    </div>
                    <button className="text-xs font-medium text-gray-400 hover:text-white transition flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/5 hover:bg-white/5 z-20">
                        View Full Log <ArrowRight size={12} />
                    </button>
                </div>
                
                {/* Timeline Content - Expanded to fill the fixed height */}
                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4 pr-2 z-20">
                    {stats.recentActivity.length > 0 ? stats.recentActivity.map((act, idx) => (
                        <div key={idx} className="flex gap-4 group">
                            <div className="flex flex-col items-center mt-1">
                                <div className={`w-2 h-2 rounded-full ${act.type === 'diary' ? 'bg-blue-500' : 'bg-orange-500'} shadow-[0_0_10px_currentColor]`}></div>
                                {idx !== stats.recentActivity.length - 1 && (
                                    <div className="w-0.5 flex-grow bg-white/10 mt-2 group-hover:bg-white/20 transition-colors"></div>
                                )}
                            </div>
                            <div className="pb-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                                        {act.project_name}
                                    </span>
                                    <span className="text-[10px] text-gray-500 border border-white/10 px-1.5 rounded">
                                        {new Date(act.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed font-light line-clamp-2">
                                    {act.description}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <Activity size={32} className="mb-2 opacity-20" />
                            <p className="text-sm">No recent activity found.</p>
                        </div>
                    )}
                </div>
            </div>
        )
    },
    {
        id: 'budget-efficiency',
        colSpan: 1,
        color: 'rgba(10, 10, 16, 0.8)',
        // FIX: '!aspect-auto' removes the 4/3 ratio. 'h-[420px]' forces a fixed height.
        // This makes the budget card taller, preventing the cut-off.
        className: '!aspect-auto h-[420px]',
        children: (
            <div className="h-full flex flex-col relative z-10 justify-between p-2">
                 
                 {/* Card Header */}
                 <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                        <TrendingUp size={16} className="text-green-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Capital Efficiency</h3>
                </div>

                {/* Circular Gauge (SVG) */}
                <div className="flex items-center justify-center py-2 flex-grow">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                        {/* Outer Glow Circle */}
                        <div className="absolute inset-0 rounded-full bg-green-500/10 blur-xl"></div>
                        
                        <svg className="w-full h-full transform -rotate-90">
                            {/* Background Circle */}
                            <circle
                                cx="88"
                                cy="88"
                                r="70"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="12"
                                fill="transparent"
                            />
                            {/* Progress Circle */}
                            <circle
                                cx="88"
                                cy="88"
                                r="70"
                                stroke="#22c55e"
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={440} // 2 * pi * 70
                                strokeDashoffset={440 - (440 * budgetUtilization) / 100}
                                strokeLinecap="round"
                                className="drop-shadow-[0_0_10px_rgba(34,197,94,0.8)] transition-all duration-1000 ease-out"
                            />
                        </svg>
                        
                        {/* Center Text */}
                        <div className="absolute flex flex-col items-center">
                            <span className="text-5xl font-black text-white drop-shadow-lg">{budgetUtilization}%</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-2">Deployed</span>
                        </div>
                    </div>
                </div>

                {/* Footer Text */}
                <div className="text-center bg-white/5 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Total Active Budget</p>
                    <p className="text-xs text-gray-200 font-mono font-bold">
                         ₹{new Intl.NumberFormat('en-IN', { notation: "compact", compactDisplay: "short" }).format(totalSpent)} / 
                         ₹{new Intl.NumberFormat('en-IN', { notation: "compact", compactDisplay: "short" }).format(totalBudget)}
                    </p>
                </div>
            </div>
        )
    }
  ];

  return (
    <div className="min-h-screen w-full relative text-white selection:bg-purple-500/30 overflow-hidden">
      
      {/* --- VIDEO BACKGROUND LAYER --- */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed top-0 left-0 min-w-full min-h-full object-cover z-0 opacity-80"
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      {/* --- DARK OVERLAY LAYER --- */}
      <div className="fixed top-0 left-0 w-full h-full bg-[#050505]/85 z-0 backdrop-blur-[3px]"></div>

      {/* --- CONTENT LAYER --- */}
      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-10">
      
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-2xl">
                    Dashboard
                </h1>
                <p className="text-gray-200 mt-2 text-lg font-medium tracking-wide drop-shadow-md flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Real-time Operations Overview
                </p>
            </div>
            <div className="text-right">
                <div className="inline-flex items-center px-5 py-2 rounded-full bg-black/60 border-2 border-white/20 backdrop-blur-xl text-sm font-bold text-white shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <Sparkles size={16} className="text-yellow-400 mr-2" />
                    System v1.0
                </div>
            </div>
        </div>

        {/* TOP ROW: STATS (4 Columns) */}
        <div className="w-full">
             <MagicBento 
                cards={topCards}
                textAutoHide={false}
                enableStars={true}
                enableSpotlight={true}
                enableBorderGlow={true}
                enableTilt={true}
                enableMagnetism={true}
                clickEffect={true}
                spotlightRadius={600}
                particleCount={30}
                glowColor="160, 60, 255"
            />
        </div>

        {/* BOTTOM ROW: ACTIVITY & BUDGET GAUGE (3 Columns) */}
        <div className="w-full">
             <MagicBento 
                cards={bottomCards}
                gridClassName="lg:grid-cols-3" // Force 3 column layout
                textAutoHide={false}
                enableStars={true}      
                enableSpotlight={true} 
                enableBorderGlow={true} 
                enableTilt={true}       
                enableMagnetism={true}  
                clickEffect={true}
                spotlightRadius={600}   
                particleCount={30}      
                glowColor="160, 60, 255" 
            />
        </div>

      </div>
    </div>
  );
}

export default Dashboard;