import React, { useState, useEffect } from 'react';
import { AlertTriangle, HardHat, TrendingDown, Target, Package, ArrowRight, Gauge, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { getOperationalSummary } from '../../../api/project/projectApi';

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
            const data = await getOperationalSummary();
            setStats((current) => ({
                ...current,
                ...(data || {}),
                project_stats: Array.isArray(data?.project_stats) ? data.project_stats : current.project_stats,
                critical_stock: Array.isArray(data?.critical_stock) ? data.critical_stock : current.critical_stock,
            }));
            setLoading(false);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-industrial-500">Calculating stats...</div>;

    return (
        <div className="space-y-6">
            {/* High Level Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
                <MetricBox
                    title="Critical Delays"
                    value={stats.delayed_count}
                    icon={<AlertTriangle className="text-red-500" />}
                    subtitle="Activities past due date"
                    color="red"
                />
                <MetricBox
                    title="Workforce Strength"
                    value={stats.total_labor}
                    icon={<HardHat className="text-amber-500" />}
                    subtitle="Active labor (Last 24h)"
                    color="amber"
                />
                <MetricBox
                    title="Task Velocity"
                    value="4.2"
                    icon={<Activity className="text-green-500" />}
                    subtitle="Avg tasks/day"
                    color="green"
                />
                <MetricBox
                    title="System Health"
                    value="98%"
                    icon={<Gauge className="text-blue-500" />}
                    subtitle="Overall reporting status"
                    color="blue"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Project Delay Analysis */}
                <div className="rounded-[1.75rem] border border-amber-100 bg-gradient-to-br from-white via-amber-50/60 to-orange-50 p-5 shadow-xl shadow-amber-100/25 md:p-8">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Target size={20} className="text-accent" />
                            Project Schedule Status
                        </h3>
                    </div>
                    <div className="h-[280px] sm:h-[300px]">
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
                <div className="h-full rounded-[1.75rem] border border-rose-100 bg-gradient-to-br from-white via-rose-50/45 to-orange-50/35 p-5 shadow-xl shadow-rose-100/20 md:p-8">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Package size={20} className="text-accent" />
                            Critical Inventory Alerts
                        </h3>
                        <span className="w-fit rounded bg-red-400/10 px-2 py-1 text-[10px] font-bold uppercase text-red-400">Action Required</span>
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
    const theme = {
        red: {
            card: 'border-rose-200/70 text-rose-700 shadow-rose-100/60',
            panel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(255,242,243,0.94)_46%,rgba(255,228,231,0.92)_100%)]',
            rail: 'bg-gradient-to-b from-rose-500 via-red-500 to-rose-400',
            value: 'text-rose-600',
            iconWrap: 'bg-white/92 ring-rose-100/90',
            subtitle: 'text-rose-400/85',
            orb: 'bg-[radial-gradient(circle,rgba(251,113,133,0.18)_0%,rgba(251,113,133,0.08)_38%,transparent_72%)]',
        },
        amber: {
            card: 'border-amber-200/70 text-amber-700 shadow-amber-100/60',
            panel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(255,250,235,0.95)_44%,rgba(254,243,199,0.9)_100%)]',
            rail: 'bg-gradient-to-b from-amber-400 via-orange-400 to-amber-500',
            value: 'text-amber-600',
            iconWrap: 'bg-white/92 ring-amber-100/90',
            subtitle: 'text-amber-500/80',
            orb: 'bg-[radial-gradient(circle,rgba(251,191,36,0.22)_0%,rgba(251,191,36,0.1)_38%,transparent_72%)]',
        },
        green: {
            card: 'border-emerald-200/70 text-emerald-700 shadow-emerald-100/60',
            panel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(240,253,244,0.96)_42%,rgba(220,252,231,0.9)_100%)]',
            rail: 'bg-gradient-to-b from-emerald-400 via-green-500 to-emerald-500',
            value: 'text-emerald-600',
            iconWrap: 'bg-white/92 ring-emerald-100/90',
            subtitle: 'text-emerald-500/80',
            orb: 'bg-[radial-gradient(circle,rgba(16,185,129,0.22)_0%,rgba(16,185,129,0.1)_38%,transparent_72%)]',
        },
        blue: {
            card: 'border-blue-200/70 text-blue-700 shadow-blue-100/60',
            panel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(239,246,255,0.96)_42%,rgba(219,234,254,0.9)_100%)]',
            rail: 'bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-500',
            value: 'text-blue-600',
            iconWrap: 'bg-white/92 ring-blue-100/90',
            subtitle: 'text-blue-500/80',
            orb: 'bg-[radial-gradient(circle,rgba(59,130,246,0.22)_0%,rgba(59,130,246,0.1)_38%,transparent_72%)]',
        },
    }[color] || {
        card: 'border-slate-200/70 text-slate-700 shadow-slate-200/50',
        panel: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.95)_42%,rgba(241,245,249,0.9)_100%)]',
        rail: 'bg-gradient-to-b from-slate-400 via-slate-500 to-slate-400',
        value: 'text-slate-700',
        iconWrap: 'bg-white/92 ring-slate-200/90',
        subtitle: 'text-slate-400/85',
        orb: 'bg-[radial-gradient(circle,rgba(148,163,184,0.18)_0%,rgba(148,163,184,0.08)_38%,transparent_72%)]',
    };

    return (
        <div className={`relative min-h-[145px] overflow-hidden rounded-[1.5rem] border p-4 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl sm:min-h-[165px] sm:p-5 md:rounded-[1.75rem] md:p-7 ${theme.card} ${theme.panel}`}>
            <div className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${theme.rail}`} />
            <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${theme.orb} sm:h-36 sm:w-36`} />
            <div className="mb-6 flex items-start justify-between gap-3 sm:mb-7 sm:gap-4">
                <div className={`relative z-10 rounded-2xl p-2.5 shadow-sm ring-1 transition-all duration-300 group-hover:scale-110 group-hover:bg-white group-hover:shadow-lg sm:p-3 ${theme.iconWrap}`}>
                    {icon}
                </div>
                <div className="relative z-10 text-right">
                    <p className={`text-2xl font-black tracking-tight sm:text-3xl ${theme.value}`}>{value}</p>
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 leading-relaxed sm:text-[11px]">{title}</p>
                <p className={`mt-1 text-[10px] font-bold italic leading-relaxed ${theme.subtitle}`}>{subtitle}</p>
            </div>
        </div>
    );
};

export default DirectorStats;
