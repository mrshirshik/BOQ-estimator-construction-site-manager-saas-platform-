import React, { useState, useEffect } from 'react';
import { Upload, Download, Plus, DollarSign, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Rate {
  id: number;
  item_name: string;
  unit: string;
  rate_value: number;
}

interface BoqItem {
  id?: number;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  remarks?: string;
}

interface NewRate {
  itemName: string;
  unit: string;
  rateValue: string;
}

function BoqEstimator() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [newRate, setNewRate] = useState<NewRate>({ itemName: '', unit: '', rateValue: '' });
  const [editingRateId, setEditingRateId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [estimating, setEstimating] = useState(false);

  // Fetch rates from backend
  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const response = await fetch('/api/rates');
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setRates(data.data);
        console.log('✅ Rates fetched:', data.data);
      } else {
        console.warn('⚠️ Failed to fetch rates:', data.message || 'No data');
        setRates([]);
      }
    } catch (error) {
      console.error('❌ Error fetching rates:', error);
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRate.itemName || !newRate.unit || !newRate.rateValue) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: newRate.itemName,
          unit: newRate.unit,
          rateValue: parseFloat(newRate.rateValue),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewRate({ itemName: '', unit: '', rateValue: '' });
        fetchRates();
      } else {
        console.warn('⚠️ Failed to add rate:', data.message);
      }
    } catch (error) {
      console.error('❌ Error adding rate:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;
    try {
      const response = await fetch(`/api/rates/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) fetchRates();
    } catch (error) {
      console.error('❌ Error deleting rate:', error);
    }
  };

  const fuzzyMatch = (description: string, itemName: string): number => {
    const desc = description.toLowerCase();
    const item = itemName.toLowerCase();
    if (desc === item) return 1.0;
    if (desc.includes(item) || item.includes(desc)) return 0.8;
    const descWords = desc.split(/\s+/);
    const itemWords = item.split(/\s+/);
    const commonWords = descWords.filter(word => itemWords.includes(word));
    if (commonWords.length > 0) return (commonWords.length / Math.max(descWords.length, itemWords.length)) * 0.6;
    return 0;
  };

  const findBestRate = (description: string): Rate | null => {
    let bestMatch: Rate | null = null;
    let bestScore = 0;
    rates.forEach(rate => {
      const score = fuzzyMatch(description, rate.item_name);
      if (score > bestScore && score > 0.3) {
        bestMatch = rate;
        bestScore = score;
      }
    });
    return bestMatch;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEstimating(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (!e.target?.result) throw new Error('Empty file');
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processedItems: BoqItem[] = (jsonData as any[]).map(row => {
          const description = row.Description || row.description || '';
          const quantity = parseFloat(row.Quantity ?? row.quantity ?? 0) || 0;
          const unit = row.Unit || row.unit || '';
          const matchedRate = findBestRate(description);
          const rate = matchedRate?.rate_value ?? 0;
          const amount = quantity * rate;
          return {
            description,
            quantity,
            unit,
            rate,
            amount,
            remarks: matchedRate ? `Matched with: ${matchedRate.item_name}` : 'No matching rate found'
          };
        });

        setBoqItems(processedItems);
        console.log('✅ BOQ items processed:', processedItems);
      } catch (error) {
        console.error('❌ Error processing Excel file:', error);
        alert('Error processing Excel file. Please check the format.');
      } finally {
        setEstimating(false);
      }
    };

    reader.onerror = (err) => {
      console.error('❌ FileReader error:', err);
      setEstimating(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const exportToExcel = () => {
    if (boqItems.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(boqItems.map(item => ({
      Description: item.description,
      Quantity: item.quantity,
      Unit: item.unit,
      Rate: item.rate,
      Amount: item.amount,
      Remarks: item.remarks
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BOQ Estimate');
    XLSX.writeFile(workbook, 'boq_estimate.xlsx');
  };

  const totalEstimate = boqItems.reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-apple-blue/30 border-t-apple-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 animate-slide-up">
        <h2 className="text-4xl font-bold text-white tracking-tight">BOQ Estimator</h2>
        <p className="text-apple-gray-100 text-lg max-w-2xl mx-auto leading-relaxed">
          Upload Excel BOQ data and get automated estimates using intelligent rate matching
        </p>
      </div>

      {/* Upload Section */}
      <div className="glass-effect rounded-2xl p-8 animate-fade-in">
        <h3 className="text-xl font-semibold text-white mb-8 flex items-center">
          <Upload className="h-6 w-6 mr-3 text-apple-blue" />
          Upload BOQ Excel File
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="w-full input-field"
              disabled={estimating}
            />
            <p className="text-sm text-apple-gray-100 mt-3">
              Expected columns: Description, Quantity, Unit
            </p>
          </div>
          <div className="flex items-center justify-center">
            {estimating ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-apple-blue/30 border-t-apple-blue mx-auto mb-4"></div>
                <p className="text-apple-gray-100">Processing BOQ data...</p>
              </div>
            ) : boqItems.length > 0 ? (
              <div className="text-center">
                <div className="text-3xl font-bold text-apple-green mb-2">
                  ${totalEstimate.toLocaleString()}
                </div>
                <p className="text-apple-gray-100 mb-4">Total Estimate</p>
                <button
                  onClick={exportToExcel}
                  className="button-primary flex items-center"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export Results
                </button>
              </div>
            ) : (
              <div className="text-center text-apple-gray-100">
                <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Upload an Excel file to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoqEstimator;
