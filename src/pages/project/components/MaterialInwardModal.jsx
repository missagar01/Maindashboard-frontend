import React, { useEffect, useState } from 'react';
import { X, Save, Package, Calendar, Truck, FileText } from 'lucide-react';
import { createMaterialInward } from '../../../api/project/projectApi';

const emptyFormState = {
  material_id: '',
  quantity: '',
  inward_date: new Date().toISOString().split('T')[0],
  supplier: '',
  remarks: ''
};

const MaterialInwardModal = ({ isOpen, onClose, materials, onRefresh }) => {
  const [formData, setFormData] = useState(emptyFormState);
  const [loading, setLoading] = useState(false);
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100';
  const fieldLabelClass =
    'ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500';
  const primaryButtonClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_30px_-18px_rgba(249,115,22,0.85)] transition hover:brightness-105 disabled:opacity-50 sm:w-auto sm:min-w-[220px]';
  const secondaryButtonClass =
    'inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:min-w-[180px]';

  useEffect(() => {
    if (!isOpen) {
      setFormData(emptyFormState);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createMaterialInward(formData);
      onRefresh();
      onClose();
      setFormData(emptyFormState);
    } catch (err) {
      console.error('Error recording inward:', err);
      alert('Failed to record material inward');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="mx-auto my-4 w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.18)] sm:my-8 sm:max-h-[90vh] sm:rounded-[2rem]">
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.92))] px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="rounded-[1.2rem] border border-amber-100 bg-amber-50 p-3 text-amber-500 shadow-sm">
              <Package size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600/80">
                  Material Registry
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">
                  Material Inward
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Record incoming stock, source details, and inward remarks in one step.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
          <div className="space-y-2">
            <label className={fieldLabelClass}>
              <Package size={14} /> Material Registry
            </label>
            <select
              required
              className={inputClass}
              value={formData.material_id}
              onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
            >
              <option value="">Select Material</option>
              {materials.map(m => (
                <option key={m.material_id} value={m.material_id}>{m.material_name} ({m.unit})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={fieldLabelClass}>
                <FileText size={14} /> Quantity
              </label>
              <input
                type="number"
                step="0.01"
                required
                className={inputClass}
                placeholder="0.00"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className={fieldLabelClass}>
                <Calendar size={14} /> Date
              </label>
              <input
                type="date"
                required
                className={inputClass}
                value={formData.inward_date}
                onChange={(e) => setFormData({ ...formData, inward_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={fieldLabelClass}>
              <Truck size={14} /> Supplier / Source Detail
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="Enter supplier name"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className={fieldLabelClass}>
              <FileText size={14} /> Remarks
            </label>
            <textarea
              className={`${inputClass} min-h-[110px] resize-none`}
              placeholder="Any additional notes..."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={primaryButtonClass}
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
