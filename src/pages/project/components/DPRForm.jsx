import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2, Loader2, HardHat, ClipboardList } from 'lucide-react';
import { createLog, listTasksForStructure, listWorkAreas } from '../../../api/project/projectApi';
import useProjectOptions from '../hooks/useProjectOptions';

const getInitialFormData = () => ({
  progress_date: new Date().toISOString().split('T')[0],
  quantity_completed: '',
  labour_count: '',
  remarks: ''
});

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.rows)) {
    return data.rows;
  }

  return [];
};

const DPRForm = () => {
  const { projects, projectsLoading, projectsError } = useProjectOptions();
  const [selectedProject, setSelectedProject] = useState('');
  const [structures, setStructures] = useState([]);
  const [selectedStructure, setSelectedStructure] = useState('');
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('');

  const [formData, setFormData] = useState(getInitialFormData);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100/90";
  const primaryButtonClass =
    "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_30px_-18px_rgba(249,115,22,0.85)] transition hover:brightness-105 disabled:opacity-50 sm:w-auto sm:min-w-[220px]";
  const secondaryButtonClass =
    "w-full rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:min-w-[180px]";
  const fieldLabelClass =
    "ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400";

  // Fetch structures when project changes
  useEffect(() => {
    if (selectedProject) {
      void fetchStructures(selectedProject);
      setSelectedStructure('');
      setActivities([]);
      setSelectedActivity('');
    } else {
      setStructures([]);
      setSelectedStructure('');
      setActivities([]);
      setSelectedActivity('');
    }
  }, [selectedProject]);

  // Fetch activities when structure changes
  useEffect(() => {
    if (selectedStructure) {
      void fetchActivities(selectedStructure);
      setSelectedActivity('');
    } else {
      setActivities([]);
      setSelectedActivity('');
    }
  }, [selectedStructure]);

  const resetFormState = ({ clearProjectSelection = false } = {}) => {
    setFormData(getInitialFormData());
    setSelectedActivity('');

    if (clearProjectSelection) {
      setSelectedProject('');
      setStructures([]);
      setSelectedStructure('');
      setActivities([]);
    }
  };

  const fetchStructures = async (projectId) => {
    try {
      const data = await listWorkAreas(projectId);
      setStructures(normalizeListResponse(data));
    } catch (err) {
      console.error('Error fetching structures:', err);
      setStructures([]);
    }
  };

  const fetchActivities = async (structureId) => {
    try {
      const data = await listTasksForStructure(structureId);
      setActivities(normalizeListResponse(data));
    } catch (err) {
      console.error('Error fetching activities:', err);
      setActivities([]);
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
      await createLog({
        activity_id: selectedActivity,
        ...formData
      });
      setStatus({ type: 'success', message: 'Progress log saved successfully!' });
      resetFormState({ clearProjectSelection: true });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to save log. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:rounded-[2rem]">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.92))] px-4 py-5 sm:px-8 sm:py-8 xl:px-10 xl:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="w-fit rounded-[1.25rem] border border-amber-100 bg-amber-50 p-3 text-amber-500 shadow-sm sm:rounded-[1.5rem] sm:p-4">
              <ClipboardList size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-600/80">Civil Track Workspace</p>
              <h2 className="mt-2 text-[1.85rem] font-black tracking-tight text-slate-900 sm:text-3xl xl:text-[2.1rem]">Daily Progress Registry</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                Capture site progress, workforce movement, and remarks in one shared reporting flow.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white px-4 py-4 sm:px-8 sm:py-8 xl:px-10 xl:py-10">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Project Selection */}
            <div className="space-y-2">
              <label className={fieldLabelClass}>Project</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={inputClass}
                disabled={projectsLoading}
                required
              >
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                ))}
              </select>
              {!projectsLoading && projects.length === 0 ? (
                <p className="ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
                  {projectsError || 'No project options loaded'}
                </p>
              ) : null}
            </div>

            {/* Structure Selection */}
            <div className="space-y-2">
              <label className={fieldLabelClass}>Structure / Area</label>
              <select
                value={selectedStructure}
                onChange={(e) => setSelectedStructure(e.target.value)}
                className={inputClass}
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
              <label className={fieldLabelClass}>Activity (BOQ Item)</label>
              <select
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                className={inputClass}
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

          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 lg:grid-cols-3 sm:pt-8">
            {/* Date */}
            <div className="space-y-2">
              <label className={fieldLabelClass}>Log Date</label>
              <input
                type="date"
                value={formData.progress_date}
                onChange={(e) => setFormData({ ...formData, progress_date: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className={fieldLabelClass}>Quantity Done</label>
              <div className="relative group">
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity_completed}
                  onChange={(e) => setFormData({ ...formData, quantity_completed: e.target.value })}
                  placeholder="0.00"
                  className={`${inputClass} pr-16`}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-slate-400">
                  {activities.find(a => a.activity_id == selectedActivity)?.unit || 'unit'}
                </span>
              </div>
            </div>

            {/* Labour Count */}
            <div className="space-y-2">
              <label className={fieldLabelClass}>Labor Strength</label>
              <div className="relative group">
                <HardHat size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" />
                <input
                  type="number"
                  value={formData.labour_count}
                  onChange={(e) => setFormData({ ...formData, labour_count: e.target.value })}
                  placeholder="Total workers"
                  className={`${inputClass} pl-12`}
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <label className={fieldLabelClass}>Remarks / Site Observations</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Enter site issues, weather conditions, or delay reasons..."
              className={`${inputClass} h-28 resize-none sm:h-36`}
            />
          </div>

          {/* Status Messages */}
          {status.message && (
            <div className={`flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center ${status.type === 'success' ? 'border border-green-100 bg-green-50 text-green-700' : 'border border-red-100 bg-red-50 text-red-700'}`}>
              <div className={`w-fit rounded-full p-2 ${status.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <p className="font-bold uppercase text-xs tracking-widest">{status.type === 'success' ? 'Success' : 'Attention Required'}</p>
                <p className="text-sm font-medium opacity-80">{status.message}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end sm:pt-8">
            <button
              type="button"
              onClick={() => {
                resetFormState({ clearProjectSelection: true });
                setStatus({ type: '', message: '' });
              }}
              className={secondaryButtonClass}
            >
              System Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className={primaryButtonClass}
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
