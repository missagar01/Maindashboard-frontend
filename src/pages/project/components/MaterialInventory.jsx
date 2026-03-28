import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, TrendingUp, AlertTriangle, Search, Filter, ArrowUpRight, ArrowDownRight, Warehouse, MinusCircle, PlusCircle, Plus } from 'lucide-react';
import MaterialInwardModal from './MaterialInwardModal';
import MaterialConsumptionModal from './MaterialConsumptionModal';
import MaterialRegisterModal from './MaterialRegisterModal';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const MaterialInventory = () => {
  const [user] = useState(JSON.parse(localStorage.getItem('user')));
  const [materials, setMaterials] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inwardOpen, setInwardOpen] = useState(false);
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [matRes, logRes] = await Promise.all([
        axios.get(`${API_BASE}/materials`, { headers: { 'x-auth-token': token } }),
        axios.get(`${API_BASE}/materials/logs`, { headers: { 'x-auth-token': token } })
      ]);
      setMaterials(matRes.data);
      setLogs(logRes.data);
    } catch (err) {
      console.error('Error fetching material data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-accent/5 rounded-[1.5rem] text-accent border border-accent/10">
            <Warehouse size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Material Registry</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Real-time inventory tracking and audit logs</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              onClick={() => setRegisterOpen(true)}
              className="btn-secondary"
            >
              <Plus size={16} /> Register New ID
            </button>
          )}
          <button
            onClick={() => setInwardOpen(true)}
            className="btn-primary"
          >
            <PlusCircle size={20} /> Material Inward
          </button>
          <button
            onClick={() => setConsumptionOpen(true)}
            className="px-6 py-4 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-100 rounded-2xl font-black text-xs transition-all flex items-center gap-2 uppercase tracking-[0.1em] shadow-lg shadow-red-500/10 active:scale-95"
          >
            <MinusCircle size={18} /> Log Consumption
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 industrial-card animate-pulse bg-slate-50 border-slate-100"></div>)
        ) : materials.length === 0 ? (
          <div className="col-span-full industrial-card py-24 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
               <Package size={48} className="text-slate-200" />
            </div>
            <h4 className="text-xl font-black text-slate-900 mb-2">Registry is Empty</h4>
            <p className="text-slate-400 font-medium max-w-xs mx-auto text-sm">No materials have been defined. Use "Register Item" to begin tracking materials.</p>
          </div>
        ) : (
          materials.map((m, idx) => (
            <div 
              key={m.material_id} 
              className={`industrial-card group relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 ${
                Number(m.current_stock) <= Number(m.min_threshold) ? 'stat-glow-red' : 'stat-glow-green'
              }`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-125 transition-all duration-700 pointer-events-none">
                <Package size={120} />
              </div>
              
              <div className="flex justify-between items-start mb-10 relative z-10">
                <div className={`p-4 bg-slate-50 rounded-2xl text-${Number(m.current_stock) <= Number(m.min_threshold) ? 'red' : 'green'}-500 border border-slate-100 shadow-sm group-hover:scale-110 group-hover:bg-white group-hover:shadow-md transition-all duration-300`}>
                  <Package size={28} />
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1 block leading-none">Inventory Level</span>
                  <p className={`text-4xl font-black tracking-tighter ${Number(m.current_stock) <= Number(m.min_threshold) ? 'text-red-500' : 'text-slate-900'}`}>
                    {Number(m.current_stock).toLocaleString()}
                    <span className="text-sm ml-1 text-slate-400 font-bold uppercase tracking-widest">{m.unit}</span>
                  </p>
                </div>
              </div>
              
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-slate-900 mb-1 truncate tracking-tight">{m.material_name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-slate-50 pb-6 italic">Tracking ID: MAT-{m.material_id.toString().padStart(4, '0')}</p>

                <div className="flex justify-between items-center bg-slate-50/- p-1 rounded-2xl">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    Number(m.current_stock) <= Number(m.min_threshold) 
                    ? 'bg-red-50 text-red-500 border border-red-100 shadow-md shadow-red-500/10' 
                    : 'bg-green-50 text-green-600 border border-green-100 shadow-md shadow-green-500/10'
                  }`}>
                    {Number(m.current_stock) <= Number(m.min_threshold) ? (
                      <><AlertTriangle size={14} className="animate-pulse" /> Critical Alert</>
                    ) : (
                      <><TrendingUp size={14} /> Stabilized</>
                    )}
                  </div>
                  <button className="text-[10px] font-black uppercase text-accent hover:bg-accent/10 p-2 px-4 rounded-xl transition-all tracking-widest flex items-center gap-1 group/btn">
                    Audit <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Material Logs Table */}
      <div className="industrial-card">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 border border-slate-100">
                 <Filter size={20} />
               </div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">System Audit logs</h3>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                       type="text" 
                       placeholder="Search logs..." 
                       className="bg-slate-50 border border-slate-100 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent/30 transition-all w-64"
                    />
                </div>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-50 text-slate-400 text-left">
                <th className="pb-6 font-black uppercase tracking-[0.2em] text-[10px] pl-2">Timeline</th>
                <th className="pb-6 font-black uppercase tracking-[0.2em] text-[10px]">Operation</th>
                <th className="pb-6 font-black uppercase tracking-[0.2em] text-[10px]">Resource</th>
                <th className="pb-6 font-black uppercase tracking-[0.2em] text-[10px]">Delta</th>
                <th className="pb-6 font-black uppercase tracking-[0.2em] text-[10px]">Reference Activity</th>
                <th className="pb-6 font-black uppercase tracking-[0.2em] text-[10px]">Observations</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr className="text-slate-400 italic">
                  <td colSpan="6" className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                        <Search size={40} />
                        <p className="font-bold text-sm tracking-widest uppercase">No transactions detected</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={`${log.type}-${log.id}-${idx}`} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 font-bold text-xs text-slate-500 pl-2">
                       {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                         log.type === 'inward' 
                         ? 'bg-green-50 text-green-600 border-green-100' 
                         : 'bg-red-50 text-red-500 border-red-100'
                        }`}>
                         {log.type === 'inward' ? <ArrowDownRight size={10} className="inline mr-1" /> : <ArrowUpRight size={10} className="inline mr-1" />}
                        {log.type}
                      </span>
                    </td>
                    <td className="py-5 font-black text-slate-900 text-sm whitespace-nowrap">{log.material_name}</td>
                    <td className="py-5">
                        <span className={`font-mono font-black text-sm ${log.type === 'inward' ? 'text-green-600' : 'text-red-500'}`}>
                           {log.type === 'inward' ? '+' : '-'}{log.quantity}
                           <span className="text-[10px] ml-1 opacity-50">units</span>
                        </span>
                    </td>
                    <td className="py-5">
                       <p className="text-xs font-bold text-slate-500 underline decoration-slate-200 underline-offset-4 decoration-2">{log.reference || 'SYSTEM_GEN'}</p>
                    </td>
                    <td className="py-5">
                       <p className="text-xs text-slate-400 font-medium italic truncate max-w-[200px]" title={log.remarks}>
                         {log.remarks || 'No automated remarks'}
                       </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MaterialRegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRefresh={fetchData}
      />
      <MaterialInwardModal
        isOpen={inwardOpen}
        onClose={() => setInwardOpen(false)}
        materials={materials}
        onRefresh={fetchData}
      />
      <MaterialConsumptionModal
        isOpen={consumptionOpen}
        onClose={() => setConsumptionOpen(false)}
        materials={materials}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default MaterialInventory;
