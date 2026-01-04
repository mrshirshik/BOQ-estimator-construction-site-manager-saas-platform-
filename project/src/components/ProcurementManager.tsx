// src/components/ProcurementManager.tsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    Package, 
    Plus, 
    ShoppingCart, 
    FileText, 
    TrendingUp, 
    AlertCircle, 
    Check, 
    X,
    History,
    Trash2,
    Edit2, // New Icon
    Eye    // New Icon
} from 'lucide-react';

// =================================================================
//  TYPE DEFINITIONS
// =================================================================

interface Project {
    id: number;
    name: string;
}

interface MaterialRequirement {
    id: number;
    item_name: string;
    unit: string;
    estimated_total_quantity: number;
    estimated_budget: number;
    total_fulfilled: number; 
    total_spent: number;     
}

interface Transaction {
    id: number;
    transaction_date: string;
    quantity_purchased: number;
    actual_cost: number;
    vendor_name: string;
    invoice_image_url?: string; // Can be null
    notes: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// =================================================================
//  MAIN COMPONENT
// =================================================================

const ProcurementManager: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal States
    const [isAddReqOpen, setIsAddReqOpen] = useState(false);
    const [isLogTransOpen, setIsLogTransOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    
    // Selection States
    const [selectedReq, setSelectedReq] = useState<MaterialRequirement | null>(null);
    const [editingReq, setEditingReq] = useState<MaterialRequirement | null>(null); // For editing requirements
    const [editingTrans, setEditingTrans] = useState<Transaction | null>(null); // For editing transactions

    // --- 1. Fetch Projects on Load ---
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

    // --- 2. Fetch Requirements ---
    const fetchRequirements = useCallback(async () => {
        if (!selectedProjectId) return;
        setIsLoading(true);
        try {
            const res = await axios.get<ApiResponse<MaterialRequirement[]>>(`/api/procurement/requirements/${selectedProjectId}`);
            setRequirements(res.data.data || []);
            setError(null);
        } catch (err) {
            console.error("Failed to load inventory", err);
            setError("Could not load inventory data.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedProjectId]);

    useEffect(() => {
        fetchRequirements();
    }, [fetchRequirements]);

    // --- Handlers ---
    const handleDeleteRequirement = async (id: number) => {
        if(!window.confirm("Are you sure? This will delete the material and ALL its purchase logs permanently.")) return;
        try {
            await axios.delete(`/api/procurement/requirements/${id}`);
            fetchRequirements();
        } catch (err) {
            alert("Failed to delete requirement.");
        }
    };

    // Open Modal Wrappers
    const openEditRequirement = (req: MaterialRequirement) => {
        setEditingReq(req);
        setIsAddReqOpen(true);
    };

    const openAddRequirement = () => {
        setEditingReq(null);
        setIsAddReqOpen(true);
    }

    return (
        <div className="p-6 text-white min-h-screen">
            <div className="max-w-7xl mx-auto">
                
                {/* HEADER & PROJECT SELECTOR */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center space-x-3">
                        <Package size={32} className="text-orange-500" />
                        <div>
                            <h1 className="text-3xl font-bold">Site Inventory & Procurement</h1>
                            <p className="text-gray-400 text-sm">Track material requirements, budgets, and daily purchases.</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <select 
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="appearance-none bg-gray-800 border border-gray-700 text-white py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:border-orange-500"
                            >
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        
                        <button 
                            onClick={openAddRequirement}
                            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition"
                        >
                            <Plus size={18} />
                            <span>Add Material</span>
                        </button>
                    </div>
                </div>

                {/* DASHBOARD GRID */}
                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">Loading inventory...</div>
                ) : error ? (
                    <div className="p-4 bg-red-900/20 border border-red-800 text-red-400 rounded-lg">{error}</div>
                ) : requirements.length === 0 ? (
                    <div className="text-center py-20 bg-gray-800/30 rounded-xl border border-gray-700/50">
                        <Package size={48} className="mx-auto text-gray-600 mb-4" />
                        <p className="text-xl text-gray-400">No material requirements set for this project yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requirements.map((item) => {
                            const qtyProgress = Math.min(100, (item.total_fulfilled / item.estimated_total_quantity) * 100);
                            const budget = parseFloat(String(item.estimated_budget || 0));
                            const spent = parseFloat(String(item.total_spent || 0));
                            const budgetProgress = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                            const isOverBudget = spent > budget;

                            return (
                                <div key={item.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 relative overflow-hidden group">
                                    
                                    {/* Edit & Delete Buttons (Top Right) */}
                                    <div className="absolute top-4 right-4 flex space-x-2">
                                        <button 
                                            onClick={() => openEditRequirement(item)}
                                            className="text-gray-500 hover:text-blue-400 transition p-1"
                                            title="Edit Material"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteRequirement(item.id)}
                                            className="text-gray-500 hover:text-red-500 transition p-1"
                                            title="Delete Material"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Header */}
                                    <div className="mb-6 pr-16">
                                        <h3 className="text-xl font-bold text-white">{item.item_name}</h3>
                                        <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded text-gray-300 mt-1 inline-block">
                                            Unit: {item.unit}
                                        </span>
                                    </div>

                                    {/* 1. Quantity Progress */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-400">Quantity Fulfilled</span>
                                            <span className="text-white font-mono">
                                                {item.total_fulfilled} / {item.estimated_total_quantity}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div 
                                                className="h-2 rounded-full bg-blue-500 transition-all duration-500" 
                                                style={{ width: `${qtyProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* 2. Financial Progress */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-400">Budget Used</span>
                                            <span className={isOverBudget ? "text-red-400 font-bold" : "text-white font-mono"}>
                                                ₹{spent.toLocaleString()} / ₹{budget.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`} 
                                                style={{ width: `${budgetProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => { setSelectedReq(item); setEditingTrans(null); setIsLogTransOpen(true); }}
                                            className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center"
                                        >
                                            <FileText size={16} className="mr-2" />
                                            Log Bill
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedReq(item); setIsHistoryOpen(true); }}
                                            className="py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition flex items-center justify-center"
                                        >
                                            <History size={16} className="mr-2" />
                                            History
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}
            {isAddReqOpen && (
                <AddRequirementModal 
                    projectId={selectedProjectId} 
                    initialData={editingReq} // Pass data for editing
                    onClose={() => setIsAddReqOpen(false)} 
                    onSuccess={() => { setIsAddReqOpen(false); fetchRequirements(); }} 
                />
            )}

            {isLogTransOpen && selectedReq && (
                <LogTransactionModal 
                    requirement={selectedReq}
                    initialData={editingTrans} // Pass data for editing
                    onClose={() => { setIsLogTransOpen(false); setSelectedReq(null); setEditingTrans(null); }}
                    onSuccess={() => { setIsLogTransOpen(false); setSelectedReq(null); setEditingTrans(null); fetchRequirements(); }}
                />
            )}

            {isHistoryOpen && selectedReq && (
                <HistoryModal 
                    requirement={selectedReq}
                    onClose={() => { setIsHistoryOpen(false); setSelectedReq(null); }}
                    onDeleteSuccess={() => { fetchRequirements(); }}
                    onEditClick={(trans) => { 
                        setIsHistoryOpen(false); // Close history
                        setSelectedReq(selectedReq); // Keep req selected
                        setEditingTrans(trans); // Set trans to edit
                        setIsLogTransOpen(true); // Open log modal
                    }}
                />
            )}
        </div>
    );
};


// =================================================================
//  SUB-COMPONENT: ADD/EDIT REQUIREMENT FORM
// =================================================================
const AddRequirementModal: React.FC<{ 
    projectId: string, 
    initialData: MaterialRequirement | null, 
    onClose: () => void, 
    onSuccess: () => void 
}> = ({ projectId, initialData, onClose, onSuccess }) => {
    const [itemName, setItemName] = useState(initialData?.item_name || '');
    const [estimatedQuantity, setEstimatedQuantity] = useState(initialData?.estimated_total_quantity || '');
    const [estimatedBudget, setEstimatedBudget] = useState(initialData?.estimated_budget || '');
    const [unit, setUnit] = useState(initialData?.unit || '');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (initialData) {
                // Update existing
                await axios.put(`/api/procurement/requirements/${initialData.id}`, {
                    itemName,
                    estimatedQuantity: parseFloat(String(estimatedQuantity)),
                    estimatedBudget: parseFloat(String(estimatedBudget)),
                    unit
                });
            } else {
                // Create new
                await axios.post('/api/procurement/requirements', {
                    projectId: parseInt(projectId),
                    itemName,
                    estimatedQuantity: parseFloat(String(estimatedQuantity)),
                    estimatedBudget: parseFloat(String(estimatedBudget)),
                    unit
                });
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            alert("Failed to save requirement.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">{initialData ? 'Edit Material' : 'Add Material'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Material Name</label>
                        <input type="text" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="e.g. Cement" value={itemName} onChange={e => setItemName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Total Quantity</label>
                            <input type="number" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="500" value={estimatedQuantity} onChange={e => setEstimatedQuantity(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Unit</label>
                            <input type="text" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="Bags" value={unit} onChange={e => setUnit(e.target.value)} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Estimated Budget (₹)</label>
                        <input type="number" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="200000" value={estimatedBudget} onChange={e => setEstimatedBudget(e.target.value)} required />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50">
                            {submitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// =================================================================
//  SUB-COMPONENT: LOG TRANSACTION FORM (Updated for Edit)
// =================================================================
const LogTransactionModal: React.FC<{ 
    requirement: MaterialRequirement, 
    initialData: Transaction | null,
    onClose: () => void, 
    onSuccess: () => void 
}> = ({ requirement, initialData, onClose, onSuccess }) => {
    const [date, setDate] = useState(initialData ? new Date(initialData.transaction_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [quantity, setQuantity] = useState(initialData ? String(initialData.quantity_purchased) : '');
    const [cost, setCost] = useState(initialData ? String(initialData.actual_cost) : '');
    const [vendor, setVendor] = useState(initialData?.vendor_name || '');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        
        const formData = new FormData();
        // If editing, we don't send reqId to the PUT endpoint, usually, but the backend route might not need it for updates if ID is present.
        if (!initialData) formData.append('requirementId', String(requirement.id));
        
        formData.append('transactionDate', date);
        formData.append('quantity', quantity);
        formData.append('cost', cost);
        formData.append('vendor', vendor);
        if (file) formData.append('billImage', file);

        try {
            if (initialData) {
                await axios.put(`/api/procurement/transactions/${initialData.id}`, formData, {
                     headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('/api/procurement/transactions', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            alert("Failed to save transaction.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Purchase' : 'Log Purchase'}</h2>
                        <p className="text-sm text-gray-400">{requirement.item_name} ({requirement.unit})</p>
                    </div>
                    <button onClick={onClose}><X className="text-gray-500 hover:text-white" /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Date</label>
                        <input type="date" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Qty Purchased</label>
                            <input type="number" step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="0.00" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Total Cost (₹)</label>
                            <input type="number" step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="0.00" value={cost} onChange={e => setCost(e.target.value)} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Vendor Name</label>
                        <input type="text" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="e.g. City Hardware" value={vendor} onChange={e => setVendor(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Upload Bill {initialData && "(Leave empty to keep existing)"}</label>
                        <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400" />
                    </div>

                    <button type="submit" disabled={submitting} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold mt-4 disabled:opacity-50">
                        {submitting ? 'Saving...' : 'Save Transaction'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// =================================================================
//  SUB-COMPONENT: HISTORY MODAL (Updated with View Bill & Edit)
// =================================================================
const HistoryModal: React.FC<{ 
    requirement: MaterialRequirement, 
    onClose: () => void, 
    onDeleteSuccess: () => void,
    onEditClick: (t: Transaction) => void 
}> = ({ requirement, onClose, onDeleteSuccess, onEditClick }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingBill, setViewingBill] = useState<string | null>(null); // For the bill modal

    const fetchHistory = useCallback(async () => {
        try {
            const res = await axios.get<ApiResponse<Transaction[]>>(`/api/procurement/transactions/${requirement.id}`);
            setTransactions(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [requirement.id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleDelete = async (transId: number) => {
        if(!window.confirm("Delete this transaction log?")) return;
        try {
            await axios.delete(`/api/procurement/transactions/${transId}`);
            fetchHistory();
            onDeleteSuccess();
        } catch (err) {
            alert("Failed to delete.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            {viewingBill ? (
                // Bill Viewer Overlay
                <div className="bg-gray-800 p-4 rounded-xl max-w-3xl max-h-[90vh] flex flex-col relative">
                     <button onClick={() => setViewingBill(null)} className="absolute top-2 right-2 bg-gray-900 rounded-full p-1 hover:bg-gray-700"><X size={24} /></button>
                     <img src={viewingBill} alt="Bill" className="max-w-full max-h-[80vh] object-contain rounded" />
                </div>
            ) : (
                // Main History List
                <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 shadow-2xl h-[80vh] flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Purchase History</h2>
                            <p className="text-sm text-gray-400">{requirement.item_name}</p>
                        </div>
                        <button onClick={onClose}><X className="text-gray-500 hover:text-white" /></button>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                        {loading ? (
                            <div className="text-center text-gray-500 mt-10">Loading history...</div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10">No purchases logged yet.</div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map(t => (
                                    <div key={t.id} className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-center group">
                                        <div>
                                            <p className="font-bold text-white">{new Date(t.transaction_date).toLocaleDateString()}</p>
                                            <p className="text-sm text-gray-400">{t.vendor_name || 'Unknown Vendor'}</p>
                                        </div>
                                        <div className="flex items-center space-x-6">
                                            <div className="text-right">
                                                <p className="text-white font-mono">{t.quantity_purchased} {requirement.unit}</p>
                                                <p className="text-sm text-green-400">₹{Number(t.actual_cost).toLocaleString()}</p>
                                            </div>
                                            <div className="flex space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                                                 {t.invoice_image_url && (
                                                    <button onClick={() => setViewingBill(t.invoice_image_url!)} className="p-2 bg-gray-600 rounded hover:bg-blue-600 text-white" title="View Bill">
                                                        <Eye size={16} />
                                                    </button>
                                                 )}
                                                <button onClick={() => onEditClick(t)} className="p-2 bg-gray-600 rounded hover:bg-blue-600 text-white" title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(t.id)} className="p-2 bg-gray-600 rounded hover:bg-red-600 text-white" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProcurementManager;