import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// =================================================================
//  TYPE DEFINITIONS
// =================================================================

// This interface is for the full project object, typically received from the backend
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

// This interface is for the data sent back to the parent on save
interface ProjectData {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: string;
    budget: number;
    location: string;
}

// This interface is specifically for the form's internal state, where budget can be a string
interface ProjectFormData {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: string;
    budget: string;
    location: string;
}


// Props that this component receives from its parent (ProjectManagement.tsx)
interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectData) => void;
  project: Project | null; // Null for 'Add New', an object for 'Edit'
}

// =================================================================
//  MODAL FORM COMPONENT
// =================================================================

const ProjectManager: React.FC<ProjectManagerProps> = ({ isOpen, onClose, onSave, project }) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'Planning',
    budget: '',
    location: '',
  });

  const statusOptions = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

  // This effect populates the form when editing or clears it for a new entry.
  useEffect(() => {
    if (isOpen) {
        if (project) {
            setFormData({
                name: project.name,
                description: project.description || '',
                start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
                end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
                status: project.status,
                budget: String(project.budget),
                location: project.location || '',
            });
        } else {
            // Reset form for a new project
            setFormData({
                name: '',
                description: '',
                start_date: '',
                end_date: '',
                status: 'Planning',
                budget: '',
                location: '',
            });
        }
    }
  }, [project, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert budget back to a number before sending it to the parent
    onSave({
      ...formData,
      budget: parseFloat(formData.budget) || 0,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300">Project Name</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" required />
                </div>
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-300">Location</label>
                    <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" />
                </div>
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-300">Start Date</label>
                    <input type="date" id="start_date" name="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" required />
                </div>
                 <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-300">End Date</label>
                    <input type="date" id="end_date" name="end_date" value={formData.end_date} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" />
                </div>
                 <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-300">Status</label>
                    <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white">
                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="budget" className="block text-sm font-medium text-gray-300">Budget (₹)</label>
                    <input type="number" id="budget" name="budget" value={formData.budget} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" required step="0.01" />
                </div>
            </div>
          <div className="mt-8 flex justify-end space-x-4">
             <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              {project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectManager;

