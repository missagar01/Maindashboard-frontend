import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, AlertCircle, CheckCircle2, Loader2, ChevronRight, HardHat, ClipboardList } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const DPRForm = ({ projects }) => {
  const [selectedProject, setSelectedProject] = useState('');
  const [structures, setStructures] = useState([]);
  const [selectedStructure, setSelectedStructure] = useState('');
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('');

  const [formData, setFormData] = useState({
    progress_date: new Date().toISOString().split('T')[0],
    quantity_completed: '',
    labour_count: '',
    remarks: ''
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Fetch structures when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchStructures(selectedProject);
      setSelectedStructure('');
      setActivities([]);
      setSelectedActivity('');
    }
  }, [selectedProject]);

  // Fetch activities when structure changes
  useEffect(() => {
    if (selectedStructure) {
      fetchActivities(selectedStructure);
      setSelectedActivity('');
    }
  }, [selectedStructure]);

  const fetchStructures = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/work-areas/${projectId}`, {
        headers: { 'x-auth-token': token }
      });
      setStructures(res.data);
    } catch (err) {
      console.error('Error fetching structures:', err);
    }
  };

  const fetchActivities = async (structureId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/tasks/${structureId}`, {
        headers: { 'x-auth-token': token }
      });
      setActivities(res.data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedActivity) {
      setStatus({ type: 'error', message: 'Please select an activity' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/logs`, {
        activity_id: selectedActivity,
        ...formData
      }, {
        headers: { 'x-auth-token': token }
      });
      setStatus({ type: 'success', message: 'Progress log saved successfully!' });
      setFormData({
        ...formData,
        quantity_completed: '',
        labour_count: '',
        remarks: ''
      });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to save log. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="industrial-card-colorful p-1 bg-gradient-to-r from-amber-500 to-red-600 rounded-2xl md:rounded-[2rem] overflow-hidden">
        <div className="bg-white/95 backdrop-blur-md p-6 md:p-10 rounded-[0.95rem] md:rounded-[1.95rem]">
          <div className="flex items-center gap-6 mb-10">
            <div className="bg-gradient-to-br from-amber-400 to-red-500 p-4 rounded-[1.5rem] text-white shadow-xl shadow-amber-500/20 animate-float">
              <ClipboardList size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Daily Progress Registry</h2>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-1 italic">Propagate site-level achievements into system metrics</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Project Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full input-field py-4"
                required
              >
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                ))}
              </select>
            </div>

            {/* Structure Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Structure / Area</label>
              <select
                value={selectedStructure}
                onChange={(e) => setSelectedStructure(e.target.value)}
                className="w-full input-field py-4"
                disabled={!selectedProject}
                required
              >
                <option value="">Select Structure</option>
                {structures.map(s => (
                  <option key={s.structure_id} value={s.structure_id}>{s.name || `Structure ${s.structure_id}`}</option>
                ))}
              </select>
            </div>

            {/* Activity Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Activity (BOQ Item)</label>
              <select
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                className="w-full input-field py-4"
                disabled={!selectedStructure}
                required
              >
                <option value="">Select Activity</option>
                {activities.map(a => (
                  <option key={a.activity_id} value={a.activity_id}>{a.activity_name} ({a.unit})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
            {/* Date */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Log Date</label>
              <input
                type="date"
                value={formData.progress_date}
                onChange={(e) => setFormData({ ...formData, progress_date: e.target.value })}
                className="w-full input-field py-4"
                required
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Quantity Done</label>
              <div className="relative group">
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity_completed}
                  onChange={(e) => setFormData({ ...formData, quantity_completed: e.target.value })}
                  placeholder="0.00"
                  className="w-full input-field py-4 pr-16"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded-md">
                  {activities.find(a => a.activity_id == selectedActivity)?.unit || 'unit'}
                </span>
              </div>
            </div>

            {/* Labour Count */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Labor Strength</label>
              <div className="relative group">
                <HardHat size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" />
                <input
                  type="number"
                  value={formData.labour_count}
                  onChange={(e) => setFormData({ ...formData, labour_count: e.target.value })}
                  placeholder="Total workers"
                  className="w-full input-field py-4 !pl-12"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Remarks / Site Observations</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Enter site issues, weather conditions, or delay reasons..."
              className="w-full input-field h-32 resize-none py-4"
            />
          </div>

          {/* Status Messages */}
          {status.message && (
            <div className={`p-5 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              <div className={`p-2 rounded-full ${status.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <p className="font-bold uppercase text-xs tracking-widest">{status.type === 'success' ? 'Success' : 'Attention Required'}</p>
                <p className="text-sm font-medium opacity-80">{status.message}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-10 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  quantity_completed: '',
                  labour_count: '',
                  remarks: ''
                });
                setSelectedActivity('');
              }}
              className="btn-secondary min-w-[160px]"
            >
              System Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary min-w-[200px]"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {loading ? 'Processing...' : 'Deploy Progress Log'}
            </button>
          </div>
        </form>
      </div>
    </div>

      {/* Quick Summary / History below the form can be added here */}
    </div>
  );
};

export default DPRForm;
