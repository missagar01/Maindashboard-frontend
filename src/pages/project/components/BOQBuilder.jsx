import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Save, Trash2, ChevronRight, Layers, ListChecks, Loader2, AlertCircle, Warehouse, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const BOQBuilder = ({ projects }) => {
  const [user] = useState(JSON.parse(localStorage.getItem('user')));
  const [selectedProject, setSelectedProject] = useState('');
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newStructure, setNewStructure] = useState({ name: '', level_type: 'Area' });
  const [addingActivity, setAddingActivity] = useState(null); // ID of structure being edited
  const [newActivity, setNewActivity] = useState({ activity_name: '', planned_quantity: '', unit: '' });

  useEffect(() => {
    if (selectedProject) {
      fetchData(selectedProject);
    }
  }, [selectedProject]);

  const fetchData = async (projectId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const sRes = await axios.get(`${API_BASE}/work-areas/${projectId}`, {
        headers: { 'x-auth-token': token }
      });
      const structuresWithTasks = await Promise.all(sRes.data.map(async (s) => {
        const tRes = await axios.get(`${API_BASE}/tasks/${s.structure_id}`, {
          headers: { 'x-auth-token': token }
        });
        return { ...s, activities: tRes.rows || tRes.data };
      }));
      setStructures(structuresWithTasks);
    } catch (err) {
      console.error('Error fetching BOQ data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStructure = async (e) => {
    e.preventDefault();
    if (!selectedProject || !newStructure.name) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/work-areas`, {
        project_id: selectedProject,
        name: newStructure.name,
        level_type: newStructure.level_type,
        parent_id: null
      }, {
        headers: { 'x-auth-token': token }
      });
      setNewStructure({ name: '', level_type: 'Area' });
      fetchData(selectedProject);
    } catch (err) {
      console.error('Error creating structure:', err);
    }
  };

  const handleAddActivity = async (structureId) => {
    if (!newActivity.activity_name || !newActivity.planned_quantity) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/tasks`, {
        structure_id: structureId,
        ...newActivity
      }, {
        headers: { 'x-auth-token': token }
      });
      setNewActivity({ activity_name: '', planned_quantity: '', unit: '' });
      setAddingActivity(null);
      fetchData(selectedProject);
    } catch (err) {
      console.error('Error adding activity:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="industrial-card-colorful group">
        <div className="flex items-center gap-5 mb-10">
          <div className="p-4 bg-white/20 backdrop-blur-xl rounded-[1.5rem] text-white border border-white/20 shadow-2xl animate-float">
            <Layers size={32} />
          </div>
          <div className="text-white">
            <h2 className="text-3xl font-black tracking-tighter">Architecture Architect</h2>
            <p className="text-white/60 text-sm font-bold uppercase tracking-widest mt-1">Design structural hierarchies & quantified work paths</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-slate-100 pb-10 mb-10 items-end">
          <div className="lg:col-span-5 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em]">Deployment Target</label>
            <div className="relative group">
               <Warehouse className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
               <select
                 className="w-full input-field py-4 !pl-12"
                 value={selectedProject}
                 onChange={(e) => setSelectedProject(e.target.value)}
               >
                 <option value="">Select Project Infrastructure...</option>
                 {projects.map(p => (
                   <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                 ))}
               </select>
            </div>
          </div>

          {(user?.role === 'admin' || user?.role === 'manager') ? (
            <form onSubmit={handleCreateStructure} className="lg:col-span-7 flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em]">New Structural Node</label>
                <input
                  type="text"
                  placeholder="e.g. Block A - First Floor"
                  className="w-full input-field py-4"
                  value={newStructure.name}
                  onChange={(e) => setNewStructure({ ...newStructure, name: e.target.value })}
                  disabled={!selectedProject}
                />
              </div>
              <button
                type="submit"
                disabled={!selectedProject || !newStructure.name}
                className="px-8 py-4 bg-accent text-white font-black rounded-2xl shadow-lg shadow-accent/20 flex items-center justify-center gap-3 transition-all uppercase text-xs tracking-[0.2em] whitespace-nowrap disabled:opacity-50 disabled:shadow-none min-w-[200px]"
              >
                <Plus size={20} /> Deploy Node
              </button>
            </form>
          ) : (
            <div className="lg:col-span-7 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
               <AlertCircle size={18} className="text-slate-400" />
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                 Architecture modification restricted to Administrative access
               </p>
            </div>
          )}
        </div>

        {!selectedProject ? (
          <div className="py-24 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto border border-slate-100 shadow-sm opacity-50">
               <Layers size={40} className="text-slate-300" />
            </div>
            <div>
               <h4 className="text-xl font-black text-slate-900 tracking-tight">System Idle</h4>
               <p className="text-slate-400 font-medium text-sm mt-1 max-w-xs mx-auto">Select a project to load its structural schematic and begin building task trees.</p>
            </div>
          </div>
        ) : loading ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-accent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest leading-relaxed">Decrypting Structural Schematics...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {structures.length === 0 && (
              <div className="p-12 text-center rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">
                No Structural Nodes Defined
              </div>
            )}

            {structures.map((s, idx) => (
              <div 
                key={s.structure_id} 
                className="bg-white border border-slate-100 rounded-[1.75rem] overflow-hidden shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-accent/5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="p-4 md:p-8 bg-slate-50/50 border-b border-slate-50 flex justify-between items-center group/header gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-accent border border-slate-100 shadow-sm group-hover/header:rotate-90 transition-transform duration-500">
                      <ChevronRight size={24} className={addingActivity === s.structure_id ? 'rotate-90' : ''} />
                    </div>
                    <div>
                        <h4 className="font-black text-xl text-slate-900 tracking-tight">{s.name}</h4>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm shadow-amber-500/20">{s.level_type}</span>
                          <span className="text-[9px] bg-slate-200/50 px-2 py-0.5 rounded-full font-black text-slate-500 uppercase tracking-widest">Structural Node</span>
                        </div>
                    </div>
                  </div>
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <button
                      onClick={() => setAddingActivity(addingActivity === s.structure_id ? null : s.structure_id)}
                      className={`px-4 md:px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-lg shrink-0 ${
                        addingActivity === s.structure_id 
                        ? 'bg-slate-200 text-slate-600 shadow-none' 
                        : 'bg-accent text-white hover:bg-amber-500 shadow-accent/20'
                      }`}
                    >
                      {addingActivity === s.structure_id ? <X size={16} /> : <Plus size={16} />}
                      <span className="hidden sm:inline">{addingActivity === s.structure_id ? 'Cancel' : 'Add Activity'}</span>
                    </button>
                  )}
                </div>

                <div className="p-8">
                  {addingActivity === s.structure_id && (
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 mb-8 border-l-4 border-l-accent animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Activity Classification</label>
                          <input
                            type="text"
                            className="w-full input-field py-4"
                            placeholder="e.g. Reinforcement Steel Work"
                            value={newActivity.activity_name}
                            onChange={(e) => setNewActivity({ ...newActivity, activity_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Planned Qty</label>
                          <input
                            type="number"
                            className="w-full input-field py-4"
                            placeholder="0.00"
                            value={newActivity.planned_quantity}
                            onChange={(e) => setNewActivity({ ...newActivity, planned_quantity: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Unit</label>
                          <input
                            type="text"
                            className="w-full input-field py-4"
                            placeholder="MT/m3/etc"
                            value={newActivity.unit}
                            onChange={(e) => setNewActivity({ ...newActivity, unit: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 justify-end mt-8 pt-6 border-t border-slate-200/50">
                        <button
                          onClick={() => handleAddActivity(s.structure_id)}
                          className="px-8 py-4 bg-accent text-white font-black rounded-2xl shadow-lg shadow-accent/20 flex items-center gap-3 transition-all uppercase text-xs tracking-[0.2em]"
                        >
                          <Save size={18} /> Deploy Activity
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="text-slate-400 text-left uppercase tracking-[0.2em] font-black text-[9px] border-b border-slate-50">
                          <th className="pb-4 pl-2">Quantified Activity</th>
                          <th className="pb-4">Target Volume</th>
                          <th className="pb-4 text-right pr-2">Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {s.activities && s.activities.map(a => (
                          <tr key={a.activity_id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 pl-2 flex items-center gap-4">
                               <div className="p-2 bg-slate-50 rounded-lg text-slate-300 group-hover:text-accent transition-colors">
                                  <ListChecks size={16} />
                               </div>
                              <span className="font-bold text-slate-700 text-sm">{a.activity_name}</span>
                            </td>
                            <td className="py-4 font-mono font-black text-slate-900 text-xs uppercase">
                               {a.planned_quantity} <span className="text-slate-400 ml-1">{a.unit}</span>
                            </td>
                            <td className="py-4 text-right pr-2">
                              <button className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!s.activities || s.activities.length === 0) && !addingActivity && (
                      <div className="py-12 text-center text-slate-300 font-bold uppercase text-[9px] tracking-widest bg-slate-50/30 rounded-2xl">
                        Awaiting activity deployment
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BOQBuilder;
