import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Sparkles } from 'lucide-react'; // 1. Import the Sparkles icon

// --- Type Definitions ---
interface Rate {
  id: number;
  item_name: string;
  unit: string;
  rate_value: number;
  keywords: string;
}

type RateFormState = Omit<Rate, 'id' | 'rate_value'> & {
  id: number | null;
  rate_value: string;
};

interface BoqItem {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

// 2. Updated interface to include the new 'isAiSuggestion' flag
interface ProcessedBoqItem {
  item_no: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | null;
  total: number | null;
  isAiSuggestion?: boolean; 
}

interface ProcessedData {
  processedItems: ProcessedBoqItem[];
  projectTotal: number;
}

// --- Helper Functions ---
const formatCurrency = (value: number | null | undefined): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value || 0);
};

// --- Reusable UI Components ---
const TabButton: React.FC<{ children: React.ReactNode; isActive: boolean; onClick: () => void; }> = ({ children, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
    }`}
  >
    {children}
  </button>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; }> = ({ children, className = '' }) => (
  <div className={`bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-xl p-6 ${className}`}>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ ...props }) => (
    <input
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        {...props}
    />
);

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger'; type?: 'button' | 'submit' | 'reset'; disabled?: boolean; }> = ({ children, onClick, variant = 'primary', type = 'button', disabled = false }) => {
    const baseClasses = "px-4 py-2 font-semibold text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out";
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    };
    const disabledClasses = "disabled:bg-gray-400 disabled:cursor-not-allowed";
    return (
        <button type={type} onClick={onClick} className={`${baseClasses} ${variants[variant]} ${disabledClasses}`} disabled={disabled}>
            {children}
        </button>
    );
};

const Table: React.FC<{ headers: string[]; children: React.ReactNode; }> = ({ headers, children }) => (
    <div className="overflow-x-auto bg-gray-900/50 rounded-lg shadow border border-gray-800/50">
        <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800/50">
                <tr>
                    {headers.map((header) => (
                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-800">
                {children}
            </tbody>
        </table>
    </div>
);

// --- Main Component ---
const BoqEstimator2: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('uploader');
  
  const [rates, setRates] = useState<Rate[]>([]);
  const [rateForm, setRateForm] = useState<RateFormState>({ id: null, item_name: '', unit: '', rate_value: '', keywords: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData>({ processedItems: [], projectTotal: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);

  const API_BASE_URL = '/api/boq';

  const fetchRates = useCallback(async () => {
    try {
      const response = await axios.get<Rate[]>(`${API_BASE_URL}/rates`);
      setRates(response.data);
    } catch (error) {
      console.error("Error fetching rates:", error);
    }
  }, []);

  const fetchBoqItems = useCallback(async () => {
    try {
      const response = await axios.get<BoqItem[]>(`${API_BASE_URL}/items`);
      setBoqItems(response.data);
    } catch (error) {
      console.error("Error fetching BOQ items:", error);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    fetchBoqItems();
  }, [fetchRates, fetchBoqItems]);

  const handleRateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rateForm.rate_value || isNaN(parseFloat(rateForm.rate_value))) {
        alert("Please enter a valid number for the rate.");
        return;
    }
    const { id, ...formData } = rateForm;
    const dataToSend = { ...formData, rate_value: parseFloat(formData.rate_value) };
    try {
      if (id) {
        await axios.put(`${API_BASE_URL}/rates/${id}`, dataToSend);
      } else {
        await axios.post(`${API_BASE_URL}/rates`, dataToSend);
      }
      setRateForm({ id: null, item_name: '', unit: '', rate_value: '', keywords: '' });
      fetchRates();
    } catch (error) { console.error("Error saving rate:", error); }
  };

  const handleEditRate = (rate: Rate) => {
    setRateForm({ ...rate, rate_value: String(rate.rate_value) });
  };
  
  const handleDeleteRate = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this rate?')) {
      try {
        await axios.delete(`${API_BASE_URL}/rates/${id}`);
        fetchRates();
      } catch (error) { console.error("Error deleting rate:", error); }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { setSelectedFile(e.target.files[0]); }
  };

  const handleBoqUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('boqFile', selectedFile);
    setIsProcessing(true);
    try {
      const response = await axios.post<ProcessedData>(`${API_BASE_URL}/upload-boq`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProcessedData(response.data);
      fetchBoqItems(); 
    } catch (error) { console.error("Error uploading BOQ file:", error);
    } finally { setIsProcessing(false); }
  };

  const handleDownloadBoq = async () => {
    try {
      const response = await axios.get<Blob>(`${API_BASE_URL}/download-boq`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'Processed_BOQ.xlsx';
      if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch.length === 2) filename = filenameMatch[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) { console.error("Error downloading BOQ file:", error); }
  };

  const handleClearBoqItems = async () => {
    if (window.confirm('Are you sure you want to delete ALL processed BOQ items? This action cannot be undone.')) {
      try {
        await axios.delete(`${API_BASE_URL}/items/clear`);
        fetchBoqItems();
        setProcessedData({ processedItems: [], projectTotal: 0 });
      } catch (error) { console.error("Error clearing BOQ items:", error); }
    }
  };
  
  const renderRateManager = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        <div className="lg:col-span-1">
            <Card>
                <h3 className="text-xl font-bold text-white mb-4">{rateForm.id ? 'Edit Rate' : 'Add New Rate'}</h3>
                <form onSubmit={handleRateSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Item Name</label>
                        <Input name="item_name" value={rateForm.item_name} onChange={handleRateInputChange} placeholder="e.g., Excavation" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Unit</label>
                            <Input name="unit" value={rateForm.unit} onChange={handleRateInputChange} placeholder="e.g., cum" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Rate</label>
                            <Input name="rate_value" type="number" step="0.01" value={rateForm.rate_value} onChange={handleRateInputChange} placeholder="e.g., 450.50" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Keywords (comma-separated)</label>
                        <Input name="keywords" value={rateForm.keywords} onChange={handleRateInputChange} placeholder="e.g., soil, earthwork, digging" />
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button variant="secondary" onClick={() => setRateForm({ id: null, item_name: '', unit: '', rate_value: '', keywords: '' })}>Cancel</Button>
                        <Button type="submit">{rateForm.id ? 'Update Rate' : 'Save Rate'}</Button>
                    </div>
                </form>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Table headers={['Item Name', 'Unit', 'Rate', 'Keywords', 'Actions']}>
                {rates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-800/40">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{rate.item_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{rate.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatCurrency(rate.rate_value)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 max-w-xs truncate">{rate.keywords}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button onClick={() => handleEditRate(rate)} className="text-blue-400 hover:text-blue-300">Edit</button>
                            <button onClick={() => handleDeleteRate(rate.id)} className="text-red-400 hover:text-red-300">Delete</button>
                        </td>
                    </tr>
                ))}
            </Table>
        </div>
    </div>
  );

  const renderBoqUploader = () => (
    <div className="mt-6 space-y-6">
        <Card className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-white">Upload BOQ Excel File</h3>
                <p className="text-sm text-gray-400 mt-1">
                    Use a .xlsx file with columns: <strong>Item No.</strong>, <strong>Description</strong>, <strong>Quantity</strong>, <strong>Unit</strong>. The Rate and Amount will be auto-filled.
                </p>
                <div className="mt-4 flex items-center space-x-4">
                    <Input type="file" accept=".xlsx" onChange={handleFileChange} className="flex-grow"/>
                    <Button onClick={handleBoqUpload} disabled={!selectedFile || isProcessing}>
                        {isProcessing ? 'Processing...' : 'Upload & Process'}
                    </Button>
                </div>
            </div>
            <div className="md:col-span-1 bg-blue-500/10 p-4 rounded-lg text-center border border-blue-500/30">
                <h4 className="text-md font-medium text-gray-300">Total Estimated Project Cost</h4>
                <p className="text-3xl font-bold text-blue-400 mt-1">{formatCurrency(processedData.projectTotal)}</p>
            </div>
        </Card>

        {processedData.processedItems.length > 0 && (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Processing Results</h3>
                    <Button onClick={handleDownloadBoq} variant='secondary'>Download Processed BOQ</Button>
                </div>
                <Table headers={['Item No.', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount']}>
                    {processedData.processedItems.map((item, index) => (
                        <tr key={index} className={!item.rate ? 'bg-red-500/10' : (item.isAiSuggestion ? 'bg-purple-500/10' : 'hover:bg-gray-800/40')}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{item.item_no}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-200">{item.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.unit}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.isAiSuggestion ? 'text-purple-400 font-semibold' : 'text-gray-400'}`}>
                                {item.rate ? (
                                    <div className="flex items-center space-x-2">
                                        <span>{formatCurrency(item.rate)}</span>
                                        {/* FIX: Wrap the icon in a span with a title attribute */}
                                        {item.isAiSuggestion && <span title="AI Suggestion"><Sparkles size={14} className="text-purple-400" /></span>}
                                    </div>
                                ) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-200">{item.total ? formatCurrency(item.total) : 'N/A'}</td>
                        </tr>
                    ))}
                </Table>
            </Card>
        )}
    </div>
  );

  const renderBoqItemsManager = () => (
    <div className="mt-6">
        <Card>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white">Stored BOQ Items</h3>
                    <p className="text-sm text-gray-400">This table shows all items currently saved in the database from previous uploads.</p>
                </div>
                {boqItems.length > 0 && (<Button onClick={handleClearBoqItems} variant="danger">Clear All Items</Button>)}
            </div>
            {boqItems.length > 0 ? (
                <Table headers={['Description', 'Quantity', 'Unit', 'Rate', 'Total']}>
                    {boqItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-800/40">
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-200">{item.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.unit}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatCurrency(item.rate)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-200">{formatCurrency(item.total)}</td>
                        </tr>
                    ))}
                </Table>
            ) : (
                <div className="text-center py-10"><p className="text-gray-500">No BOQ items found in the database.</p></div>
            )}
        </Card>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white">BOQ Estimator Module</h1>
        <div className="border-b border-gray-800 mt-6">
          <nav className="flex space-x-2" aria-label="Tabs">
            <TabButton isActive={activeTab === 'uploader'} onClick={() => setActiveTab('uploader')}>BOQ Uploader & Results</TabButton>
            <TabButton isActive={activeTab === 'manager'} onClick={() => setActiveTab('manager')}>Rate Manager</TabButton>
            <TabButton isActive={activeTab === 'items'} onClick={() => setActiveTab('items')}>BOQ Items Manager</TabButton>
          </nav>
        </div>
        <div>
          {activeTab === 'manager' && renderRateManager()}
          {activeTab === 'uploader' && renderBoqUploader()}
          {activeTab === 'items' && renderBoqItemsManager()}
        </div>
      </div>
    </div>
  );
};

export default BoqEstimator2;

