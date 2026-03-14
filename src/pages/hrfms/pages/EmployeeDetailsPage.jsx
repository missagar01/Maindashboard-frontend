import React, { useState, useEffect, useCallback } from 'react';
import { useAutoSync } from '../hooks/useAutoSync';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Mail, Phone, Building, Briefcase,
    ShieldCheck, Clock, CheckCircle2, XCircle,
    Calendar, Plane, Ticket, MapPin, FileText,
    Download, User, Hash, Award, Zap
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { getEmployeeFullDetails } from '../../../api/hrfms/dashboardApi';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { getFileNameFromUrl, isPdfFileUrl, resolveUploadedFileUrl } from '../../../utils/fileUrl';

const ImageWithFallback = ({ src, alt, className, onClick, fallbackIcon: FallbackIcon }) => {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [src]);

    if (error || !src) {
        return (
            <div className={`${className} flex flex-col items-center justify-center bg-gray-100 text-gray-300 gap-1`}>
                <FallbackIcon size={className.includes('w-28') || className.includes('w-full') ? 40 : 24} strokeWidth={1} />
                {error && src && <small className="text-[8px]">Error</small>}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onClick={onClick}
            onError={() => setError(true)}
        />
    );
};

const EmployeeDetailsPage = () => {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDetails = useCallback(async (isAutoSync = false) => {
        if (!employeeId || !token) return;

        try {
            if (!isAutoSync) setLoading(true);
            const res = await getEmployeeFullDetails(token, employeeId);
            if (res.success) {
                setData(res.data);
            } else {
                toast.error(res.message || 'Failed to fetch employee details');
                navigate('/hrfms/employee-create');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error loading details');
            navigate('/hrfms/employee-create');
        } finally {
            if (!isAutoSync) setLoading(false);
        }
    }, [employeeId, token, navigate]);

    useAutoSync(fetchDetails, 15000);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#f8fafc]">
                <div className="relative">
                    <div className="animate-spin rounded-full h-20 w-20 border-[3px] border-indigo-100 border-t-indigo-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap size={24} className="text-indigo-600 animate-pulse" />
                    </div>
                </div>
                <p className="mt-8 text-gray-900 font-black text-xl tracking-tight">Syncing Master Node...</p>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-2">Accessing secure employee archives</p>
            </div>
        );
    }

    if (!data) return null;

    const attendanceRate = ((data.attendanceSummary.present / (data.attendanceSummary.total || 1)) * 100).toFixed(1);

    return (
        <div className="min-h-screen bg-[#f8fafc] w-full pb-10 overflow-x-hidden">
            {/* Top Navigation Bar */}
            <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate('/hrfms/employee-create')}
                        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold transition-all group"
                    >
                        <div className="p-1.5 bg-gray-50 group-hover:bg-indigo-50 rounded-lg transition-colors">
                            <ArrowLeft size={16} />
                        </div>
                        <span className="hidden sm:inline-block uppercase tracking-widest text-[9px]">Back to Directory</span>
                    </button>
                    <div className="h-6 w-[1px] bg-gray-100"></div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h1 className="text-base font-black text-gray-900 leading-none tracking-tight">{data.profile.user_name}</h1>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{data.profile.employee_id} • {data.profile.department}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${data.profile.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {data.profile.status}
                    </span>
                </div>
            </nav>

            <div className="p-4 sm:p-6 space-y-6 max-w-[1500px] mx-auto">

                {/* Row 1: Key Performance Indicators - Smaller Size & Unique Gradients */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard label="Attendance" value={`${attendanceRate}%`} icon={Zap} gradient="from-indigo-600 to-purple-600" subtext={`${data.attendanceSummary.present} Present`} progress={attendanceRate} />
                    <KPICard label="Leave Load" value={data.leaves?.length || 0} icon={Calendar} gradient="from-amber-400 to-orange-500" subtext="Units this cycle" progress={(data.leaves?.length / 20) * 100} />
                    <KPICard label="Field Ops" value={data.visits?.length || 0} icon={MapPin} gradient="from-emerald-400 to-teal-500" subtext="Total site logs" progress={100} />
                    <KPICard label="Logistics" value={data.travels?.length || 0} icon={Plane} gradient="from-rose-400 to-pink-500" subtext="Missions logged" progress={100} />
                </div>

                {/* Row 2: Profile & Attendance Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* Profile Core (4/12) */}
                    <section className="lg:col-span-4 h-full">
                        <div className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-gray-200/40 border border-gray-100 flex flex-col items-center relative overflow-hidden h-full">
                            {/* Inner Background Gradient Accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                            <div className="relative mb-4 pt-2">
                                <div className="w-28 h-28 rounded-[1.8rem] bg-gradient-to-tr from-indigo-500 to-purple-500 p-1 shadow-xl">
                                    <div className="w-full h-full bg-white rounded-[1.6rem] p-1 transition-transform hover:scale-105 duration-500 overflow-hidden">
                                        <ImageWithFallback
                                            src={resolveUploadedFileUrl(data.profile.profile_img)}
                                            alt="Profile"
                                            className="w-full h-full object-cover rounded-[1.3rem]"
                                            fallbackIcon={User}
                                        />
                                    </div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-xl shadow-lg border border-gray-50">
                                    <ShieldCheck className="text-indigo-600" size={14} />
                                </div>
                            </div>

                            <div className="text-center space-y-1">
                                <h2 className="text-lg font-black text-gray-900 tracking-tight">{data.profile.user_name}</h2>
                                <p className="text-indigo-600 font-black tracking-[0.2em] text-[8px] uppercase bg-indigo-50 px-3 py-1 rounded-full inline-block">{data.profile.designation || 'SYSTEM ASSET'}</p>
                            </div>

                            <div className="w-full mt-5 grid grid-cols-1 gap-2">
                                <ProfileInsight icon={Hash} label="Employee ID" value={data.profile.employee_id} gradient="from-slate-50 to-slate-100/50" />
                                <ProfileInsight icon={Mail} label="Corporate Email" value={data.profile.email_id} gradient="from-indigo-50 to-indigo-100/30" />
                                <ProfileInsight icon={Phone} label="Contact Line" value={data.profile.number} gradient="from-purple-50 to-purple-100/30" />
                                <ProfileInsight icon={Building} label="Sector Unit" value={data.profile.department} gradient="from-amber-50 to-amber-100/30" />
                                <ProfileInsight icon={Briefcase} label="Rank / Desig" value={data.profile.designation || 'Standard Node'} gradient="from-emerald-50 to-emerald-100/30" />
                                <ProfileInsight icon={Award} label="System Role" value={data.profile.role} highlight gradient="from-indigo-600 to-indigo-700" />
                            </div>

                            {/* New System Configuration Block */}
                            <div className="w-full mt-6 pt-6 border-t border-gray-50 space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">System Configuration</span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${data.profile.Admin === 'Yes' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                                        {data.profile.Admin === 'Yes' ? 'Root Admin' : 'Standard User'}
                                    </span>
                                </div>

                                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-50">
                                    <h4 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">Software Permissions Matrix</h4>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        {(() => {
                                            let pages = [];
                                            try {
                                                const pageAccess = data.profile.page_access;
                                                if (Array.isArray(pageAccess)) pages = pageAccess;
                                                else if (typeof pageAccess === 'string') {
                                                    if (pageAccess.startsWith('[')) pages = JSON.parse(pageAccess);
                                                    else pages = pageAccess.split(',').map(p => p.trim()).filter(Boolean);
                                                }
                                            } catch (err) { pages = []; }

                                            if (pages.length === 0) return <p className="text-[8px] text-gray-300 italic py-2">Standard Operational Access</p>;

                                            return pages.map((p, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-white border border-gray-100 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-tighter shadow-sm hover:text-indigo-600 transition-colors">
                                                    {(p === '/' || p === '/dashboard') ? 'Dashboard' : p.replace(/^\/+/, '').replace(/-/g, ' ')}
                                                </span>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>


                    {/* Attendance Engine & Documents (8/12) */}
                    <section className="lg:col-span-8 h-full flex flex-col gap-6">
                        <div className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-gray-200/40 border border-gray-100 flex flex-col relative overflow-hidden flex-1">
                            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="space-y-0.5">
                                    <h3 className="text-[13px] font-black text-gray-900 tracking-tight uppercase">Attendance Report</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col text-right">
                                        <span className="text-[6px] font-black text-gray-300 uppercase leading-none mb-0.5">Health Score</span>
                                        <span className="text-sm font-black text-indigo-600 leading-tight">{attendanceRate}%</span>
                                    </div>
                                    <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                        <Clock size={12} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center">
                                <div className="max-w-[650px] w-full">
                                    <AttendanceMatrix attendanceDetails={data.attendanceSummary.details} />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1.5 border-t border-gray-50 pt-3">
                                <MatrixLegand color="#6366f1" label="Active" />
                                <MatrixLegand color="#f59e0b" label="Logged" />
                                <MatrixLegand color="#f43f5e" label="Missing" />
                                <MatrixLegand color="#e2e8f0" label="Planned" />
                            </div>
                        </div>

                        {/* Document Quick Access - Updated for Multiple Documents & PDF */}
                        {data.profile.document_img && (Array.isArray(data.profile.document_img) ? data.profile.document_img : [data.profile.document_img]).length > 0 && (
                            <div className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-gray-200/40 border border-gray-100 overflow-hidden relative group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-black text-gray-900 text-[10px] flex items-center gap-2 uppercase tracking-tight">
                                        <FileText size={14} className="text-emerald-500" /> System Verification Documents
                                    </h4>
                                    <span className="px-2 py-0.5 bg-gray-50 rounded text-[8px] font-black text-gray-400 uppercase">
                                        {(Array.isArray(data.profile.document_img) ? data.profile.document_img : [data.profile.document_img]).length} Files
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(Array.isArray(data.profile.document_img) ? data.profile.document_img : [data.profile.document_img]).map((url, idx) => {
                                        const resolvedUrl = resolveUploadedFileUrl(url);
                                        const isPdf = isPdfFileUrl(url);
                                        const fileName = getFileNameFromUrl(url).split('-').pop(); // Show cleaner name

                                        return (
                                            <div key={idx} className="relative rounded-xl overflow-hidden bg-gray-50 group/doc border border-gray-100 transition-all hover:border-emerald-200 shadow-sm">
                                                {isPdf ? (
                                                    <div className="flex flex-col items-center justify-center p-6 gap-2 text-red-500 min-h-[140px]">
                                                        <div className="p-3 bg-red-50 rounded-2xl">
                                                            <FileText size={32} />
                                                        </div>
                                                        <span className="text-[9px] text-gray-600 font-black truncate max-w-full px-2 uppercase tracking-tighter">{fileName}</span>
                                                        <a
                                                            href={resolvedUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="mt-1 flex items-center gap-1.5 px-3 py-1 bg-white text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm hover:bg-emerald-50 transition-colors"
                                                        >
                                                            <Download size={10} /> View PDF
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <div className="relative aspect-video sm:aspect-square flex items-center justify-center overflow-hidden h-full min-h-[140px]">
                                                        <ImageWithFallback
                                                            src={resolvedUrl}
                                                            alt={`Document ${idx + 1}`}
                                                            className="w-full h-full object-cover opacity-90 group-hover/doc:opacity-100 transition-opacity cursor-pointer"
                                                            onClick={() => window.open(resolvedUrl, '_blank')}
                                                            fallbackIcon={FileText}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent opacity-0 group-hover/doc:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-white text-[8px] font-black uppercase tracking-widest truncate max-w-[120px]">
                                                                    {fileName}
                                                                </p>
                                                                <a
                                                                    href={resolvedUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/40 transition-colors"
                                                                >
                                                                    <Download size={12} />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </section>
                </div >

                {/* Row 3: History & Logs Analysis */}
                <section className="bg-white rounded-[1.5rem] p-8 shadow-lg shadow-gray-200/40 border border-gray-100 space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 opacity-80"></div>
                    <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Audit Logs</h3>
                            <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em]">Transaction History Analytics</p>
                        </div>
                        <div className="px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-black text-gray-900">
                            Node Count: {(data.leaves?.length || 0) + (data.travels?.length || 0) + (data.tickets?.length || 0) + (data.visits?.length || 0)}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-12">
                        <ActivityAnalyzer title="Leave Stacks" icon={Calendar} data={data.leaves} type="leave" gradient="from-indigo-400 to-indigo-600" />
                        <ActivityAnalyzer title="Logistics Wire" icon={Plane} data={data.travels} type="travel" gradient="from-rose-400 to-rose-600" />
                        <ActivityAnalyzer title="Ticket Hub" icon={Ticket} data={data.tickets} type="ticket" gradient="from-amber-400 to-amber-600" />
                        <ActivityAnalyzer title="Site Nodes" icon={MapPin} data={data.visits} type="visit" gradient="from-emerald-400 to-emerald-600" />
                    </div>
                </section >

            </div >
        </div >
    );
};

// --- ELITE UI MODULES ---

const KPICard = ({ label, value, icon: Icon, gradient, subtext, progress }) => {
    return (
        <div className={`p-5 rounded-[1.5rem] bg-gradient-to-br ${gradient} text-white flex flex-col justify-between h-36 shadow-xl transition-all hover:scale-[1.02] cursor-default group overflow-hidden relative`}>
            {/* Background Decorative Graphic */}
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                <Icon size={100} strokeWidth={1} />
            </div>

            <div className="flex items-start justify-between relative z-10">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                    <Icon size={18} />
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/70 mb-0.5">{label}</p>
                    <h4 className="text-2xl font-black tracking-tighter leading-none">{value}</h4>
                </div>
            </div>

            <div className="space-y-2 relative z-10">
                <p className="text-[9px] font-bold text-white/80">{subtext}</p>
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const ProfileInsight = ({ icon: Icon, label, value, highlight, gradient }) => (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all border group relative overflow-hidden ${highlight ? `bg-gradient-to-br ${gradient} text-white border-transparent shadow-lg shadow-indigo-200` : `bg-gradient-to-br ${gradient} border-gray-50 hover:border-indigo-100`}`}>
        <div className={`p-2 rounded-xl shadow-sm scale-90 ${highlight ? 'bg-white/20' : 'bg-white text-indigo-600'}`}>
            <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
            <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 ${highlight ? 'text-indigo-100/70' : 'text-gray-400'}`}>{label}</p>
            <p className={`text-[11px] font-black truncate ${highlight ? 'text-white' : 'text-gray-900 font-bold'}`}>{value || '---'}</p>
        </div>
    </div>
);

const AttendanceMatrix = ({ attendanceDetails }) => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const startDayIdx = getDay(monthStart);

    const getLookupDate = (date) => {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    return (
        <div className="grid grid-cols-7 gap-1 px-1">
            {weekDays.map(d => <div key={d} className="text-center text-[6px] font-black text-gray-300 uppercase tracking-[0.2em] pb-1">{d}</div>)}
            {Array.from({ length: startDayIdx }).map((_, i) => <div key={i} className="aspect-square bg-gray-50/10" />)}
            {days.map(day => {
                const ds = getLookupDate(day);
                const status = attendanceDetails?.[ds];
                const isToday = isSameDay(day, new Date());

                let style = 'bg-gray-50 text-gray-300 border-transparent';
                if (status === 'P') style = 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-100 border-emerald-400';
                if (status === 'A') style = 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md shadow-rose-100 border-rose-400';

                return (
                    <div key={ds} className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all duration-300 relative group/day cursor-default ${style}`}>
                        <span className="text-[14px] font-black tracking-tighter leading-none">{format(day, 'd')}</span>
                        {status && <span className="text-[7px] font-black absolute bottom-1.5 opacity-60 leading-none">{status === 'P' ? 'OK' : 'MS'}</span>}
                        {isToday && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white border-2 border-indigo-600 rounded-full z-10 shadow-sm"></div>}
                    </div>
                );
            })}
        </div>
    );
};


const ActivityAnalyzer = ({ title, icon: Icon, data, type, gradient }) => (
    <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <h4 className="flex items-center gap-2.5 font-black text-gray-900 tracking-tight text-xs uppercase">
                <div className={`p-1.5 bg-gradient-to-br ${gradient} text-white rounded-lg shadow-md lg:scale-110`}>
                    <Icon size={12} />
                </div>
                {title}
            </h4>
            <span className="px-2 py-0.5 bg-gray-50 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-widest">{data?.length || 0} TOTAL</span>
        </div>

        <div className="space-y-2.5">
            {data?.length > 0 ? data.slice(0, 4).map((log, i) => (
                <div key={i} className="group bg-white p-4 rounded-2xl border border-gray-50 hover:border-indigo-100 hover:shadow-lg hover:shadow-gray-100 transition-all duration-500 flex items-center gap-4 relative overflow-hidden active:scale-[0.98]">
                    {/* Subtle Side Color Indicator */}
                    <div className={`absolute left-0 top-0 w-1 h-full bg-gradient-to-b ${gradient}`}></div>

                    <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-gray-300" />
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{formatDate(log.from_date || log.created_at)}</span>
                        </div>
                        <p className="text-[11px] font-black text-gray-800 leading-tight line-clamp-1">{type === 'leave' && log.reason}{type === 'travel' && log.to_city}{type === 'ticket' && log.travels_name}{type === 'visit' && log.person_name}</p>
                    </div>

                    <div className="text-right">
                        <StatusBadge status={log.request_status || log.approved_by_status} />
                    </div>
                </div>
            )) : (
                <div className="p-10 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="p-3 bg-white rounded-full text-gray-200 shadow-sm mb-3">
                        <Icon size={24} strokeWidth={1} />
                    </div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] opacity-80 leading-none">Zero Node Data</p>
                </div>
            )}

            {data?.length > 4 && (
                <button className={`w-full py-2.5 bg-white text-[8px] font-black text-indigo-600 uppercase tracking-[0.3em] hover:bg-indigo-50 rounded-xl transition-all border border-dashed border-indigo-100 shadow-sm`}>
                    Analyze full stack (+{data.length - 4})
                </button>
            )}
        </div>
    </div>
);

const MatrixLegand = ({ color, label }) => (
    <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100 shadow-inner">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
);

const StatusBadge = ({ status }) => {
    const s = (status || 'Pending').toLowerCase();
    let colors = 'bg-gray-100 text-gray-400';
    if (s.includes('approv') || s === 'completed' || s === 'booked') colors = 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (s.includes('reject') || s === 'cancelled') colors = 'bg-rose-50 text-rose-700 border-rose-100';
    if (s === 'pending') colors = 'bg-amber-50 text-amber-700 border-amber-100';

    return (
        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${colors}`}>
            {status || 'Pending'}
        </span>
    );
};

const formatDate = (date) => {
    if (!date) return '---';
    try {
        return format(new Date(date), 'dd MMM yyyy');
    } catch {
        return 'Invalid Code';
    }
};

export default EmployeeDetailsPage;
