// src/components/SiteDiary.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
    BookOpen, 
    Calendar, 
    Sun, 
    CloudRain, 
    AlertTriangle, 
    CheckCircle, 
    Plus, 
    Camera, 
    Trash2, 
    X,
    Edit2,
    Search,
    Filter,
    ArrowUpDown,
    Eye,
    Image as ImageIcon
} from 'lucide-react';

// =================================================================
//  TYPE DEFINITIONS
// =================================================================

interface Project {
    id: number;
    name: string;
}

interface DiaryEntry {
    id: number;
    entry_date: string;
    weather_condition: string;
    activities_summary: string;
    issues_or_delays: string;
    site_photos: string[]; // Array of Base64 strings
    created_at: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// =================================================================
//  MAIN COMPONENT
// =================================================================

const SiteDiary: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null); // Lightbox

    // Filter/Sort States
    const [searchQuery, setSearchQuery] = useState('');
    const [sortDesc, setSortDesc] = useState(true);
    const [filterWeather, setFilterWeather] = useState('All');

    // --- 1. Fetch Projects ---
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await axios.get<ApiResponse<Project[]>>('/api/projects/projects');
                setProjects(res.data.data || []);
                if (res.data.data && res.data.data.length > 0) {
                    setSelectedProjectId(String(res.data.data[0].id));
                }
            } catch (err) {
                console.error("Failed to load projects", err);
            }
        };
        fetchProjects();
    }, []);

    // --- 2. Fetch Diary Entries ---
    const fetchEntries = useCallback(async () => {
        if (!selectedProjectId) return;
        setIsLoading(true);
        try {
            const res = await axios.get<ApiResponse<DiaryEntry[]>>(`/api/diary/entries/${selectedProjectId}`);
            // Ensure photos is parsed correctly if it comes as string from some DBs, though usually JSONB handles it
            const parsedData = res.data.data.map(e => ({
                ...e,
                site_photos: Array.isArray(e.site_photos) ? e.site_photos : [] 
            }));
            setEntries(parsedData);
        } catch (err) {
            console.error("Failed to load diary", err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedProjectId]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    // --- 3. Client-Side Filtering & Sorting ---
    const processedEntries = useMemo(() => {
        let result = [...entries];

        // Filter by Search Text
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(e => 
                e.activities_summary.toLowerCase().includes(q) || 
                e.issues_or_delays?.toLowerCase().includes(q)
            );
        }

        // Filter by Weather
        if (filterWeather !== 'All') {
            result = result.filter(e => e.weather_condition === filterWeather);
        }

        // Sort Date
        result.sort((a, b) => {
            const dateA = new Date(a.entry_date).getTime();
            const dateB = new Date(b.entry_date).getTime();
            return sortDesc ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [entries, searchQuery, filterWeather, sortDesc]);


    // --- Handlers ---
    const handleDelete = async (id: number) => {
        if(!window.confirm("Delete this diary entry?")) return;
        try {
            await axios.delete(`/api/diary/entries/${id}`);
            fetchEntries();
        } catch (err) {
            alert("Failed to delete entry.");
        }
    };

    const handleOpenAdd = () => {
        setEditingEntry(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (entry: DiaryEntry) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 text-white min-h-screen">
            <div className="max-w-6xl mx-auto">
                
                {/* HEADER & CONTROLS */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center space-x-3">
                            <BookOpen size={32} className="text-indigo-400" />
                            <div>
                                <h1 className="text-3xl font-bold">Digital Site Diary</h1>
                                <p className="text-gray-400 text-sm">Daily logs, progress photos, and delay tracking.</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <select 
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="bg-gray-800 border border-gray-700 text-white py-2 px-4 rounded-lg focus:outline-none focus:border-indigo-500"
                            >
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            
                            <button 
                                onClick={handleOpenAdd}
                                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition"
                            >
                                <Plus size={18} />
                                <span>New Entry</span>
                            </button>
                        </div>
                    </div>

                    {/* SEARCH & FILTER BAR */}
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search activities or issues..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 placeholder-gray-400"
                            />
                        </div>
                        
                        <div className="flex items-center space-x-3 w-full md:w-auto">
                            <div className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-2">
                                <Filter size={16} className="text-gray-400" />
                                <select 
                                    value={filterWeather} 
    onChange={(e) => setFilterWeather(e.target.value)}
    className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
>
    {/* Added bg-gray-800 to ensure options are dark with white text */}
    <option className="bg-gray-800" value="All">All Weather</option>
    <option className="bg-gray-800" value="Sunny">Sunny</option>
    <option className="bg-gray-800" value="Cloudy">Cloudy</option>
    <option className="bg-gray-800" value="Rainy">Rainy</option>
    <option className="bg-gray-800" value="Heavy Rain">Heavy Rain</option>
                                </select>
                            </div>

                            <button 
                                onClick={() => setSortDesc(!sortDesc)}
                                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition text-sm"
                            >
                                <ArrowUpDown size={16} />
                                <span>{sortDesc ? 'Newest First' : 'Oldest First'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* TIMELINE FEED */}
                {isLoading ? (
                    <div className="text-center text-gray-500 py-10">Loading diary...</div>
                ) : processedEntries.length === 0 ? (
                    <div className="text-center py-20 bg-gray-800/30 rounded-xl border border-gray-700/50">
                        <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
                        <p className="text-xl text-gray-400">No matching entries found.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {processedEntries.map((entry) => (
                            <div key={entry.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 flex flex-col md:flex-row gap-6 relative group transition hover:border-gray-600">
                                {/* Edit/Delete Buttons */}
                                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                                    <button 
                                        onClick={() => handleOpenEdit(entry)}
                                        className="bg-gray-700 p-2 rounded hover:bg-blue-600 text-gray-300 hover:text-white"
                                        title="Edit Entry"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(entry.id)}
                                        className="bg-gray-700 p-2 rounded hover:bg-red-600 text-gray-300 hover:text-white"
                                        title="Delete Entry"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Left: Photo Gallery */}
                                <div className="md:w-1/3 flex-shrink-0">
                                    {entry.site_photos && entry.site_photos.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {entry.site_photos.slice(0, 4).map((photo, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`relative rounded-lg overflow-hidden border border-gray-700 cursor-pointer hover:opacity-90 ${entry.site_photos.length === 1 ? 'col-span-2 h-48' : 'h-24'}`}
                                                    onClick={() => setViewingImage(photo)}
                                                >
                                                    <img src={photo} alt={`Site ${idx}`} className="w-full h-full object-cover" />
                                                    {/* Show +Count if more than 4 images */}
                                                    {idx === 3 && entry.site_photos.length > 4 && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
                                                            +{entry.site_photos.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full h-48 bg-gray-700/50 rounded-lg flex items-center justify-center border border-gray-700 border-dashed">
                                            <p className="text-gray-500 text-sm flex items-center"><ImageIcon size={16} className="mr-2"/> No Photos</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Content */}
                                <div className="flex-grow pr-10">
                                    <div className="flex items-center space-x-3 mb-3">
                                        <span className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-md text-sm font-mono font-bold border border-indigo-500/30">
                                            {new Date(entry.entry_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="flex items-center text-sm text-gray-300 bg-gray-700/50 px-2 py-1 rounded">
                                            {entry.weather_condition.toLowerCase().includes('rain') ? <CloudRain size={14} className="mr-1.5 text-blue-400"/> : <Sun size={14} className="mr-1.5 text-yellow-400"/>}
                                            {entry.weather_condition}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center">
                                                Activities
                                            </h4>
                                            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{entry.activities_summary}</p>
                                        </div>

                                        {entry.issues_or_delays && (
                                            <div className="bg-red-900/10 border-l-2 border-red-500 pl-3 py-2 rounded-r-md">
                                                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center">
                                                    Issues / Delays
                                                </h4>
                                                <p className="text-gray-300 text-sm italic">{entry.issues_or_delays}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- ADD/EDIT ENTRY MODAL --- */}
            {isModalOpen && (
                <EntryModal 
                    projectId={selectedProjectId} 
                    initialData={editingEntry}
                    onClose={() => setIsModalOpen(false)} 
                    onSuccess={() => { setIsModalOpen(false); fetchEntries(); }} 
                />
            )}

            {/* --- LIGHTBOX (IMAGE VIEWER) --- */}
            {viewingImage && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300"><X size={32} /></button>
                    <img src={viewingImage} alt="Full Size" className="max-w-full max-h-full rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};

// =================================================================
//  SUB-COMPONENT: ADD/EDIT ENTRY FORM
// =================================================================
const EntryModal: React.FC<{ 
    projectId: string, 
    initialData: DiaryEntry | null, 
    onClose: () => void, 
    onSuccess: () => void 
}> = ({ projectId, initialData, onClose, onSuccess }) => {
    const [date, setDate] = useState(initialData ? new Date(initialData.entry_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [weather, setWeather] = useState(initialData?.weather_condition || 'Sunny');
    const [activities, setActivities] = useState(initialData?.activities_summary || '');
    const [issues, setIssues] = useState(initialData?.issues_or_delays || '');
    const [files, setFiles] = useState<FileList | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        
        const formData = new FormData();
        if (!initialData) formData.append('projectId', projectId); // Only needed for create
        formData.append('date', date);
        formData.append('weather', weather);
        formData.append('activities', activities);
        formData.append('issues', issues);
        
        if (initialData) {
            // Pass existing photos back so backend knows to keep them
            formData.append('existingPhotos', JSON.stringify(initialData.site_photos));
        }

        if (files) {
            for (let i = 0; i < files.length; i++) {
                formData.append('sitePhotos', files[i]);
            }
        }

        try {
            if (initialData) {
                await axios.put(`/api/diary/entries/${initialData.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('/api/diary/entries', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            alert("Failed to save diary entry.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Entry' : 'Log Daily Progress'}</h2>
                    <button onClick={onClose}><X className="text-gray-500 hover:text-white" /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Date</label>
                            <input type="date" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" value={date} onChange={e => setDate(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Weather</label>
                            <select className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" value={weather} onChange={e => setWeather(e.target.value)}>
                                <option>Sunny</option>
                                <option>Cloudy</option>
                                <option>Rainy</option>
                                <option>Heavy Rain</option>
                                <option>Stormy</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Daily Activities Summary</label>
                        <textarea 
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white h-24" 
                            placeholder="e.g. Completed brickwork for ground floor..." 
                            value={activities} 
                            onChange={e => setActivities(e.target.value)} 
                            required 
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Issues / Delays (Optional)</label>
                        <textarea 
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white h-16" 
                            placeholder="e.g. Cement delivery delayed by 2 hours..." 
                            value={issues} 
                            onChange={e => setIssues(e.target.value)} 
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">
                            {initialData ? 'Add More Photos (Optional)' : 'Upload Site Photos'}
                        </label>
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 transition">
                            <input 
                                type="file" 
                                accept="image/*" 
                                multiple // ALLOW MULTIPLE FILES
                                onChange={e => setFiles(e.target.files)} 
                                className="w-full text-sm text-gray-400" 
                            />
                            <p className="text-xs text-gray-500 mt-2">Max 5 photos. (Previous photos are kept).</p>
                        </div>
                    </div>

                    <button type="submit" disabled={submitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold mt-4 disabled:opacity-50">
                        {submitting ? 'Saving...' : 'Save Entry'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SiteDiary;