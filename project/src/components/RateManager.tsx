import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, DollarSign } from 'lucide-react';

interface Rate {
  id: number;
  item_name: string;
  unit: string;
  rate_value: number;
  created_at: string;
}

interface NewRate {
  itemName: string;
  unit: string;
  rateValue: string;
}

function RateManager() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [newRate, setNewRate] = useState<NewRate>({ itemName: '', unit: '', rateValue: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const response = await fetch('/api/rates');
      const data = await response.json();
      if (data.success) {
        setRates(data.data);
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      }
    } catch (error) {
      console.error('Error adding rate:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: number, updatedRate: Partial<Rate>) => {
    try {
      const response = await fetch(`/api/rates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRate),
      });

      const data = await response.json();
      if (data.success) {
        setEditingId(null);
        fetchRates();
      }
    } catch (error) {
      console.error('Error updating rate:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      const response = await fetch(`/api/rates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchRates();
      }
    } catch (error) {
      console.error('Error deleting rate:', error);
    }
  };

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
        <h2 className="text-4xl font-bold text-white tracking-tight">Rate Management</h2>
        <p className="text-apple-gray-100 text-lg max-w-2xl mx-auto leading-relaxed">
          Manage construction material and labor rates with precision
        </p>
      </div>

      {/* Add Rate Form */}
      <div className="glass-effect rounded-2xl p-8 animate-fade-in">
        <h3 className="text-xl font-semibold text-white mb-8 flex items-center">
          <DollarSign className="h-6 w-6 mr-3 text-apple-blue" />
          Add New Rate
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-apple-gray-100 mb-3">
              Item Name
            </label>
            <input
              type="text"
              value={newRate.itemName}
              onChange={(e) => setNewRate({ ...newRate, itemName: e.target.value })}
              className="w-full input-field"
              placeholder="e.g., Concrete Mix"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-apple-gray-100 mb-3">
              Unit
            </label>
            <input
              type="text"
              value={newRate.unit}
              onChange={(e) => setNewRate({ ...newRate, unit: e.target.value })}
              className="w-full input-field"
              placeholder="e.g., m³, kg, hrs"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-apple-gray-100 mb-3">
              Rate Value
            </label>
            <input
              type="number"
              step="0.01"
              value={newRate.rateValue}
              onChange={(e) => setNewRate({ ...newRate, rateValue: e.target.value })}
              className="w-full input-field"
              placeholder="0.00"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Rate
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Rates Table */}
      <div className="glass-effect rounded-2xl overflow-hidden animate-slide-up">
        <div className="px-8 py-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">Current Rates</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-apple-gray-100 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-apple-gray-100 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-apple-gray-100 uppercase tracking-wider">
                  Rate Value
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-apple-gray-100 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-8 py-4 text-right text-xs font-semibold text-apple-gray-100 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-white/5 transition-colors duration-200 group">
                  <td className="px-8 py-6 whitespace-nowrap">
                    {editingId === rate.id ? (
                      <input
                        type="text"
                        defaultValue={rate.item_name}
                        className="w-full input-field"
                        onBlur={(e) => handleEdit(rate.id, { item_name: e.target.value })}
                      />
                    ) : (
                      <div className="text-white font-medium">{rate.item_name}</div>
                    )}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-apple-gray-100">{rate.unit}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-white font-semibold">
                      ${rate.rate_value.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-apple-gray-100">
                      {new Date(rate.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => setEditingId(editingId === rate.id ? null : rate.id)}
                        className="text-apple-blue hover:text-white p-2 rounded-lg hover:bg-apple-blue/20 transition-all duration-200"
                      >
                        {editingId === rate.id ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Edit2 className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className="text-apple-red hover:text-white p-2 rounded-lg hover:bg-apple-red/20 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rates.length === 0 && (
            <div className="text-center py-16">
              <DollarSign className="mx-auto h-16 w-16 text-apple-gray-200 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No rates found</h3>
              <p className="text-apple-gray-100">Add your first rate to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RateManager;