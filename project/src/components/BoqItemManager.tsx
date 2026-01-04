import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, FileText } from 'lucide-react';

interface BoqItem {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  remarks: string;
  created_at: string;
}

interface NewBoqItem {
  description: string;
  quantity: string;
  unit: string;
  remarks: string;
}

function BoqItemManager() {
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [newBoqItem, setNewBoqItem] = useState<NewBoqItem>({
    description: '',
    quantity: '',
    unit: '',
    remarks: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBoqItems();
  }, []);

  const fetchBoqItems = async () => {
    try {
      const response = await fetch('/api/boq-items');
      const data = await response.json();
      if (data.success) {
        setBoqItems(data.data);
      }
    } catch (error) {
      console.error('Error fetching BOQ items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoqItem.description || !newBoqItem.quantity || !newBoqItem.unit) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/boq-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newBoqItem.description,
          quantity: parseFloat(newBoqItem.quantity),
          unit: newBoqItem.unit,
          remarks: newBoqItem.remarks,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewBoqItem({ description: '', quantity: '', unit: '', remarks: '' });
        fetchBoqItems();
      }
    } catch (error) {
      console.error('Error adding BOQ item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this BOQ item?')) return;

    try {
      const response = await fetch(`/api/boq-items/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchBoqItems();
      }
    } catch (error) {
      console.error('Error deleting BOQ item:', error);
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
        <h2 className="text-4xl font-bold text-white tracking-tight">BOQ Items Management</h2>
        <p className="text-apple-gray-100 text-lg max-w-2xl mx-auto leading-relaxed">
          Manage your Bill of Quantities items and estimates with precision
        </p>
      </div>

      {/* Add BOQ Item Form */}
      <div className="glass-effect rounded-2xl p-8 animate-fade-in">
        <h3 className="text-xl font-semibold text-white mb-8 flex items-center">
          <Package className="h-6 w-6 mr-3 text-apple-blue" />
          Add New BOQ Item
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-apple-gray-100 mb-3">
                Description
              </label>
              <input
                type="text"
                value={newBoqItem.description}
                onChange={(e) => setNewBoqItem({ ...newBoqItem, description: e.target.value })}
                className="w-full input-field"
                placeholder="Item description"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-apple-gray-100 mb-3">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newBoqItem.quantity}
                  onChange={(e) => setNewBoqItem({ ...newBoqItem, quantity: e.target.value })}
                  className="w-full input-field"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-apple-gray-100 mb-3">
                  Unit
                </label>
                <input
                  type="text"
                  value={newBoqItem.unit}
                  onChange={(e) => setNewBoqItem({ ...newBoqItem, unit: e.target.value })}
                  className="w-full input-field"
                  placeholder="m², kg, hrs"
                  required
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-apple-gray-100 mb-3">
              Remarks
            </label>
            <textarea
              value={newBoqItem.remarks}
              onChange={(e) => setNewBoqItem({ ...newBoqItem, remarks: e.target.value })}
              className="w-full input-field resize-none"
              placeholder="Additional notes or specifications"
              rows={4}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="button-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></div>
            ) : (
              <Plus className="h-5 w-5 mr-2" />
            )}
            Add BOQ Item
          </button>
        </form>
      </div>

      {/* BOQ Items Table */}
      <div className="glass-effect rounded-2xl overflow-hidden animate-slide-up">
        <div className="px-8 py-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">BOQ Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-apple-gray-100 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-apple-gray-100 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-apple-gray-100 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-apple-gray-100 uppercase tracking-wider">
                  Remarks
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
              {boqItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors duration-200 group">
                  <td className="px-8 py-6">
                    <div className="text-white font-medium">{item.description}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-white font-semibold">{item.quantity.toLocaleString()}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-apple-gray-100">{item.unit}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-apple-gray-100 max-w-xs truncate">
                      {item.remarks || '-'}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-apple-gray-100">
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                        className="text-apple-blue hover:text-white p-2 rounded-lg hover:bg-apple-blue/20 transition-all duration-200"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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
          {boqItems.length === 0 && (
            <div className="text-center py-16">
              <FileText className="mx-auto h-16 w-16 text-apple-gray-200 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No BOQ items</h3>
              <p className="text-apple-gray-100">Get started by adding your first BOQ item</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BoqItemManager;