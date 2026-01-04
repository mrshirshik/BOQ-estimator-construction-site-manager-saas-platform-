// src/App.tsx

import React, { useState } from 'react';
import { 
  BarChart3, 
  Calculator, 
  Users, 
  FolderOpen, 
  Bot, 
  LayoutTemplate, 
  Package, 
  BookOpen, 
  TrendingUp 
} from 'lucide-react';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Dashboard from './components/Dashboard';
import BoqEstimator2 from './components/BoqEstimator2';
import LaborManagement from './components/LaborManagement';
import ProjectManagement from './components/ProjectManagement';
import AiCopilot from './components/AiCopilot'; 
import HousePlanGenerator from './components/HousePlanGenerator';
import ProcurementManager from './components/ProcurementManager';
import SiteDiary from './components/SiteDiary';
import CashFlowPredictor from './components/CashFlowPredictor';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const sections = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3, component: Dashboard },
    { id: 'boq-estimator', name: 'BOQ Estimator', icon: Calculator, component: BoqEstimator2 },
    { id: 'labor-management', name: 'Labor Management', icon: Users, component: LaborManagement },
    { id: 'project-management', name: 'Project Manager', icon: FolderOpen, component: ProjectManagement },
    
    // Operational Tools
    { id: 'procurement', name: 'Site Inventory', icon: Package, component: ProcurementManager },
    { id: 'site-diary', name: 'Site Diary', icon: BookOpen, component: SiteDiary },
    
    { id: 'cash-flow', name: 'Cash Flow AI', icon: TrendingUp, component: CashFlowPredictor },

    // AI Tools
    { id: 'ai-copilot', name: 'AI Copilot', icon: Bot, component: AiCopilot },
    { id: 'house-plan-generator', name: 'House Plan AI', icon: LayoutTemplate, component: HousePlanGenerator },
  ];

  const ActiveComponent = sections.find(section => section.id === activeSection)?.component || Dashboard;

  return (
    <div className="min-h-screen bg-black text-white font-sf-pro">
      <div className="flex">
        {/* Sidebar */}
        {/* FIX: Added 'z-50' to ensure sidebar stays ABOVE the dashboard video background */}
        <div className="w-64 min-h-screen bg-gradient-to-b from-gray-900/50 to-black/50 backdrop-blur-xl border-r border-gray-800/50 fixed h-full overflow-y-auto no-scrollbar z-50">
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Construction Manager service
            </h1>
            <p className="text-gray-400 text-sm mt-2">Version 1.0.0</p>
          </div>
          
          <nav className="px-4 space-y-2 pb-6">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    activeSection === section.id
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{section.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-screen ml-64">
          {/* Removed padding here to allow dashboard video to fill edges if needed */}
          <div>
            <ActiveComponent />
          </div>
        </div>
      </div>

      {/* Toast Notification Container */}
      <ToastContainer 
        position="bottom-right" 
        autoClose={5000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="dark"
      />
    </div>
  );
}

export default App;