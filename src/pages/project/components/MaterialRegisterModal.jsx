import React, { useState } from 'react';
import axios from 'axios';
import { X, Save, Package, Ruler, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const MaterialRegisterModal = ({ isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = useState({
    material_name: '',
    unit: '',
    min_threshold: '10'
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/materials`, formData, {
        headers: { 'x-auth-token': token }
      });
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Error registering material:', err);
      alert('Failed to register new material');
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
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Register New Item</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Package size={14} /> Item Nomenclature
            </label>
            <input
              type="text"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium"
              placeholder="e.g. Cement 43 Grade"
              value={formData.material_name}
              onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Ruler size={14} /> Unit
              </label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium"
                placeholder="e.g. Bags, m3, kg"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <AlertCircle size={14} /> Min Threshold
              </label>
              <input
                type="number"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium"
                placeholder="10"
                value={formData.min_threshold}
                onChange={(e) => setFormData({ ...formData, min_threshold: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
             <AlertCircle size={16} className="text-slate-400 mt-0.5" />
             <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-wider">
               New items are registered with 0 initial stock. Use "Material Inward" to add stock to this identifier.
             </p>
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
              {loading ? 'Saving...' : <><Save size={18} /> Register Item</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialRegisterModal;
