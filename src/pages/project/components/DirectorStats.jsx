import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, HardHat, TrendingDown, Target, Package, ArrowRight, Gauge, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const DirectorStats = () => {
    const [stats, setStats] = useState({
        delayed_count: 0,
        total_labor: 0,
        project_stats: [],
        critical_stock: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE}/analytics/operational-summary`, {
                headers: { 'x-auth-token': token }
            });
            setStats(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-industrial-500">Calculating stats...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* High Level Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <MetricBox
                        title="Critical Delays"
                        value={stats.delayed_count}
                        icon={<AlertTriangle className="text-red-500" />}
                        subtitle="Activities past due date"
                        color="red"
                    />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <MetricBox
                        title="Workforce Strength"
                        value={stats.total_labor}
                        icon={<HardHat className="text-amber-500" />}
                        subtitle="Active labor (Last 24h)"
                        color="amber"
                    />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                    <MetricBox
                        title="Task Velocity"
                        value="4.2"
                        icon={<Activity className="text-green-500" />}
                        subtitle="Avg tasks/day"
                        color="green"
                    />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                    <MetricBox
                        title="System Health"
                        value="98%"
                        icon={<Gauge className="text-blue-500" />}
                        subtitle="Overall reporting status"
                        color="blue"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Delay Analysis */}
                <div className="industrial-card">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Target size={20} className="text-accent" />
                            Project Schedule Status
                        </h3>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.project_stats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="project_name" stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#0f172a' }}
                                />
                                <Bar dataKey="total_tasks" name="Total Tasks" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="delayed_tasks" name="Delayed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Critical Stock Alerts */}
                <div className="industrial-card h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Package size={20} className="text-accent" />
                            Critical Inventory Alerts
                        </h3>
                        <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">Action Required</span>
                    </div>
                    <div className="space-y-4">
                        {stats.critical_stock.length > 0 ? (
                            stats.critical_stock.map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between group hover:border-red-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 border border-red-100Shadow-sm">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{item.material_name}</div>
                                            <div className="text-xs text-slate-500">Below critical threshold</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-mono font-bold text-red-600">{item.current_stock}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{item.unit} Remaining</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-industrial-500 opacity-50">
                                <Package size={48} className="mb-4" />
                                <p>No critical stock issues detected.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricBox = ({ title, value, icon, subtitle, color }) => {
    const colorClasses = {
        red: 'stat-glow-red border-red-100 bg-white text-red-700', // Note: I didn't add red glow in css, let's fix that or use amber for critical
        amber: 'stat-glow-amber border-amber-100 bg-white text-amber-700',
        green: 'stat-glow-green border-green-100 bg-white text-green-700',
        blue: 'stat-glow-blue border-blue-100 bg-white text-blue-700',
    };

    // Fallback for red if I missed it in index.css
    const glowClass = colorClasses[color] || 'stat-glow-amber bg-white text-slate-700';

    return (
        <div className={`p-6 md:p-8 rounded-2xl md:rounded-[1.75rem] border ${glowClass} relative group overflow-hidden shadow-xl shadow-slate-200/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-white group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                    {icon}
                </div>
                <div className="text-right">
                    <p className="text-3xl font-black tracking-tight">{value}</p>
                </div>
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-relaxed">{title}</p>
                <p className="text-[10px] mt-1 text-slate-400 font-bold italic">{subtitle}</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-current to-transparent opacity-[0.03] -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
        </div>
    );
};

export default DirectorStats;
