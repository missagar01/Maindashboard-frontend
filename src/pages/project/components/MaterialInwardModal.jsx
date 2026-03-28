import React, { useState } from 'react';
import axios from 'axios';
import { X, Save, Package, Calendar, Truck, FileText } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const MaterialInwardModal = ({ isOpen, onClose, materials, onRefresh }) => {
  const [formData, setFormData] = useState({
    material_id: '',
    quantity: '',
    inward_date: new Date().toISOString().split('T')[0],
    supplier: '',
    remarks: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/materials/inward`, formData, {
        headers: { 'x-auth-token': token }
      });
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Error recording inward:', err);
      alert('Failed to record material inward');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-2xl text-accent shadow-sm">
              <Package size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Material Inward</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Package size={14} /> Material Registry
            </label>
            <select
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium"
              value={formData.material_id}
              onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
            >
              <option value="">Select Material</option>
              {materials.map(m => (
                <option key={m.material_id} value={m.material_id}>{m.material_name} ({m.unit})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <FileText size={14} /> Quantity
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium"
                placeholder="0.00"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Calendar size={14} /> Date
              </label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium"
                value={formData.inward_date}
                onChange={(e) => setFormData({ ...formData, inward_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Truck size={14} /> Supplier / Source Detail
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium"
              placeholder="Enter supplier name"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <FileText size={14} /> Remarks
            </label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium min-h-[100px]"
              placeholder="Any additional notes..."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-[0.2em]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] px-6 py-4 rounded-2xl bg-accent text-white font-black hover:bg-accent-dark transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 uppercase text-xs tracking-[0.2em] disabled:opacity-50"
            >
              {loading ? 'Saving...' : <><Save size={18} /> Record Inward</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialInwardModal;
