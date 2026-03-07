import React, { useEffect, useState, useMemo } from 'react';
import { Search, Calendar, Clock, User as UserIcon, PlayCircle, X, CheckCircle, AlertCircle } from 'lucide-react';
import * as o2dAPI from "../../api/o2dAPI";
import { useAuth } from "../../context/AuthContext";

interface FollowUp {
    id: number;
    client_name: string;
    sales_person: string;
    actual_order: number;
    actual_order_date: string | null;
    date_of_calling: string;
    next_calling_date: string | null;
    status: string;
    isBooked: boolean;
    quantity: string | number;
    orderDate: string | null;
    nextCall: string | null;
    salesPerson: string;
    customerName: string;
    date: string;
}

const formatDate = (date: string | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

interface FollowUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any;
    followup?: any;
    onSuccess: () => void;
}

const FollowUpModal: React.FC<FollowUpModalProps> = ({ isOpen, onClose, customer, followup, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        client_name: '',
        sales_person: '',
        date_of_calling: new Date().toISOString().split('T')[0],
        order_quantity: '',
        order_date: '',
        next_calling_date: '',
    });
    const [waitingForResponse, setWaitingForResponse] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (followup) {
                setFormData({
                    client_name: followup.customerName || '',
                    sales_person: followup.salesPerson || '',
                    date_of_calling: followup.date ? new Date(followup.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    order_quantity: followup.quantity || '',
                    order_date: followup.orderDate ? new Date(followup.orderDate).toISOString().split('T')[0] : '',
                    next_calling_date: followup.nextCall ? new Date(followup.nextCall).toISOString().split('T')[0] : '',
                });
                setWaitingForResponse(followup.status === 'Waiting for Response');
            } else {
                setFormData({
                    client_name: customer?.["Client Name"] || customer?.name || '',
                    sales_person: user?.user_name || user?.username || '',
                    date_of_calling: new Date().toISOString().split('T')[0],
                    order_quantity: '',
                    order_date: new Date().toISOString().split('T')[0],
                    next_calling_date: '',
                });
                setWaitingForResponse(false);
            }
        }
    }, [isOpen, followup, customer, user]);

    // Format YYYY-MM-DD → "20 Feb 2026" for display
    const fmtDisplay = (s: string) => {
        if (!s) return '';
        try {
            return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return s; }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const actualOrder = parseFloat(formData.order_quantity) || 0;
            const isBooked = actualOrder > 0;
            const payload = {
                client_name: formData.client_name,
                sales_person: formData.sales_person,
                actual_order: actualOrder,
                actual_order_date: isBooked ? (formData.order_date || new Date().toISOString().split('T')[0]) : null,
                date_of_calling: formData.date_of_calling,
                next_calling_date: (!isBooked && !waitingForResponse && formData.next_calling_date) ? formData.next_calling_date : null
            };
            if (followup && followup.id) {
                await o2dAPI.updateFollowup(String(followup.id), payload);
            } else {
                await o2dAPI.createFollowup(payload);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            setError(error.response?.data?.message || error.message || 'Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const inputBase = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3.5 text-slate-800 font-semibold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all focus:bg-white";

    // Styled date picker: invisible native input layered over pretty display div
    const DatePickerField = ({
        value, onChange, required = false, disabled = false, accent = 'blue'
    }: { value: string; onChange: (v: string) => void; required?: boolean; disabled?: boolean; accent?: string }) => {
        const borderColor = disabled ? 'border-slate-100' : accent === 'green' ? 'border-emerald-200' : 'border-slate-200';
        const iconColor = disabled ? 'text-slate-300' : accent === 'green' ? 'text-emerald-500' : 'text-blue-500';
        return (
            <div className="relative">
                <input
                    type="date"
                    required={required}
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onClick={(e) => !disabled && (e.target as any).showPicker?.()}
                    className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <div className={`flex items-center gap-2.5 bg-slate-50 border ${borderColor} rounded-xl px-3.5 py-3.5 transition-all peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-focus:border-blue-500 peer-focus:bg-white ${disabled ? 'opacity-40' : ''}`}>
                    <Calendar className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
                    <span className={`text-sm font-semibold ${value ? 'text-slate-800' : 'text-slate-400'}`}>
                        {value ? fmtDisplay(value) : 'Tap to select date'}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white w-full sm:w-[90%] lg:max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250">

                {/* ── Header ── */}
                <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-base sm:text-lg font-black text-slate-800">
                            {followup ? "Edit Follow Up" : "New Follow Up"}
                        </h2>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {followup ? `ID: #${followup.id}` : "New interaction record"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700 active:scale-90">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold">{error}</p>
                        </div>
                    )}

                    <form id="followup-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* ── Client Info ── */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Client Information</span>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Client Name</label>
                                <input
                                    type="text" required
                                    value={formData.client_name}
                                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                    className={inputBase}
                                    placeholder="Enter client name"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Sales Person</label>
                                    <input
                                        type="text" required
                                        value={formData.sales_person}
                                        onChange={(e) => setFormData({ ...formData, sales_person: e.target.value })}
                                        className={inputBase}
                                        placeholder="Sales rep name"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Date of Calling</label>
                                    <DatePickerField
                                        value={formData.date_of_calling}
                                        onChange={(v) => setFormData({ ...formData, date_of_calling: v })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Order Status ── */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Order Status</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Quantity (MT)</label>
                                    <input
                                        type="number"
                                        value={formData.order_quantity}
                                        onChange={(e) => setFormData({ ...formData, order_quantity: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3.5 text-slate-800 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all focus:bg-white"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Order Date</label>
                                    <DatePickerField
                                        value={formData.order_date}
                                        onChange={(v) => setFormData({ ...formData, order_date: v })}
                                        accent="green"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Follow Up Schedule ── */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                <div className="w-1 h-4 bg-purple-500 rounded-full" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Follow Up Schedule</span>
                            </div>
                            <div className={waitingForResponse ? 'opacity-40 pointer-events-none' : ''}>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Next Calling Date</label>
                                <DatePickerField
                                    value={formData.next_calling_date}
                                    onChange={(v) => setFormData({ ...formData, next_calling_date: v })}
                                    disabled={waitingForResponse}
                                />
                            </div>
                            <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors active:scale-[0.99]">
                                <input
                                    type="checkbox"
                                    checked={waitingForResponse}
                                    onChange={(e) => setWaitingForResponse(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 accent-blue-600"
                                />
                                <span className="text-xs font-bold text-slate-600">Waiting for Response (No Date)</span>
                            </label>
                        </div>

                    </form>
                </div>

                {/* ── Footer ── */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                    <button
                        type="button" onClick={onClose}
                        className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit" form="followup-form" disabled={loading}
                        className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex justify-center items-center gap-2 transition-all disabled:opacity-50 shadow-sm active:scale-95"
                    >
                        {loading ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Saving...</span></>
                        ) : (
                            <span>{followup ? 'Update Follow Up' : 'Save Follow Up'}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const FollowUpsPage: React.FC = () => {
    const { user } = useAuth();
    const [followups, setFollowups] = useState<FollowUp[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFollowup, setSelectedFollowup] = useState<FollowUp | null>(null);
    const [visibleCount, setVisibleCount] = useState(100);

    const handleCalendarClick = async (followup: FollowUp) => {
        try {
            setLoading(true);
            const response = await o2dAPI.getFollowup(String(followup.id));
            if (response.data?.data) {
                const f = response.data.data;
                const actualOrder = parseFloat(f.actual_order) || 0;
                const isBooked = actualOrder > 0;
                setSelectedFollowup({
                    ...f,
                    date: f.date_of_calling, isBooked,
                    quantity: isBooked ? actualOrder : "",
                    orderDate: isBooked ? f.actual_order_date : null,
                    status: isBooked ? 'Order Booked' : (!f.next_calling_date ? "Waiting for Response" : "Next Call Scheduled"),
                    nextCall: f.next_calling_date,
                    salesPerson: String(f.sales_person || 'Unknown').trim(),
                    customerName: f.client_name,
                    id: f.followup_id
                });
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error("Failed to fetch followup", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFollowups = async () => {
        setLoading(true);
        try {
            const response = await o2dAPI.getFollowups();
            const allFollowups = response.data?.data || [];
            setFollowups(allFollowups.map((f: any) => {
                const actualOrder = parseFloat(f.actual_order) || 0;
                const isBooked = actualOrder > 0;
                return {
                    ...f,
                    date: f.date_of_calling, isBooked,
                    quantity: isBooked ? actualOrder : "",
                    orderDate: isBooked ? f.actual_order_date : null,
                    status: isBooked ? 'Order Booked' : (!f.next_calling_date ? "Waiting for Response" : "Next Call Scheduled"),
                    nextCall: f.next_calling_date,
                    salesPerson: String(f.sales_person || 'Unknown').trim(),
                    customerName: f.client_name,
                    id: f.followup_id
                };
            }));
        } catch (error) {
            console.error("Failed to fetch followups", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFollowups(); }, []);
    useEffect(() => { setVisibleCount(100); }, [search, user]);

    const filteredFollowups = useMemo(() => {
        const lower = search.toLowerCase();
        let result = [...followups];
        if (user?.role === 'Sales') {
            const myName = (user.user_name || user.username || '').toLowerCase();
            result = result.filter(f => f.salesPerson.toLowerCase() === myName);
        }
        if (lower) {
            result = result.filter(f =>
                f.customerName?.toLowerCase().includes(lower) ||
                f.status?.toLowerCase().includes(lower) ||
                f.salesPerson?.toLowerCase().includes(lower)
            );
        }
        return result;
    }, [search, followups, user]);

    const visibleFollowups = useMemo(() => filteredFollowups.slice(0, visibleCount), [filteredFollowups, visibleCount]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 2) {
            setVisibleCount(prev => Math.min(prev + 50, filteredFollowups.length));
        }
    };

    const statusStyle = (f: FollowUp) => {
        if (f.isBooked) return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        if (f.status === 'Waiting for Response') return 'bg-amber-100 text-amber-700 border border-amber-200';
        return 'bg-blue-100 text-blue-700 border border-blue-200';
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

            {/* ── Fixed Header ── */}
            <div className="shrink-0 z-30 bg-white border-b border-slate-200 shadow-sm">
                {/* Title row */}
                <div className="px-3 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-sm sm:text-base font-black text-slate-800 leading-tight">Follow-ups</h1>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                            {filteredFollowups.length} record{filteredFollowups.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                {/* Search */}
                <div className="px-3 pb-2.5 sm:px-5 sm:pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <input
                            type="text"
                            placeholder="Search customer, status, sales person..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 sm:py-2.5 pl-9 pr-4 text-slate-800 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Loading ── */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading...</p>
                </div>
            ) : (
                <div
                    className="flex-1 overflow-auto"
                    onScroll={handleScroll}
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {/* Mobile Card List (< lg) */}
                    <div className="lg:hidden px-2 py-2 space-y-2 pb-20">
                        {visibleFollowups.length > 0 ? visibleFollowups.map((f, index) => (
                            <div key={f.id || index} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                {/* Card top */}
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-600">{formatDate(f.date)}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusStyle(f)}`}>
                                        {f.isBooked ? 'Booked' : f.status === 'Waiting for Response' ? 'Waiting' : 'Scheduled'}
                                    </span>
                                </div>
                                {/* Card body */}
                                <div className="px-3 py-2 space-y-2">
                                    <p className="text-xs font-black text-slate-900">{f.customerName}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[8px] font-black flex-shrink-0">
                                                {f.salesPerson?.charAt(0)?.toUpperCase() || 'N'}
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-500">{f.salesPerson}</span>
                                        </div>
                                        {f.isBooked && (
                                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                {f.quantity} MT · {formatDate(f.orderDate)}
                                            </span>
                                        )}
                                        {f.nextCall && !f.isBooked && (
                                            <div className="flex items-center gap-1 text-blue-600">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">{formatDate(f.nextCall)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Action */}
                                <div className="px-3 pb-2.5">
                                    <button
                                        onClick={() => handleCalendarClick(f)}
                                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-98"
                                    >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                        Edit Follow-up
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Search className="w-10 h-10 text-slate-200" />
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">No results found</p>
                            </div>
                        )}
                    </div>

                    {/* Desktop Table (>= lg) */}
                    <div className="hidden lg:block">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr>
                                    {['Action', 'Date', 'Customer', 'Sales Person', 'Status', 'Order Details', 'Next Call'].map(h => (
                                        <th key={h} className="sticky top-0 px-4 py-3 bg-slate-800 text-white first:rounded-tl-none last:rounded-tr-none z-30 shadow-sm border-b border-white/10 text-[10px] font-black tracking-widest uppercase">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {visibleFollowups.length > 0 ? visibleFollowups.map((f, index) => (
                                    <tr key={f.id || index} className="hover:bg-blue-50/40 transition-colors group">
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleCalendarClick(f)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm transition-all active:scale-95"
                                            >
                                                <PlayCircle className="w-3.5 h-3.5" />
                                                Edit
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                {formatDate(f.date)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-black text-slate-900 text-sm">{f.customerName}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 font-semibold text-slate-600 text-xs">
                                                <UserIcon className="w-3.5 h-3.5 text-purple-500" />
                                                {f.salesPerson}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusStyle(f)}`}>
                                                {f.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {f.isBooked ? (
                                                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg inline-block">
                                                    <div>Qty: {f.quantity}</div>
                                                    {f.orderDate && <div className="text-[10px] text-emerald-600/70">{formatDate(f.orderDate)}</div>}
                                                </div>
                                            ) : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {f.nextCall ? (
                                                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs bg-blue-50 px-2.5 py-1.5 rounded-lg w-fit">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDate(f.nextCall)}
                                                </div>
                                            ) : <span className="text-slate-300 text-xs italic">No schedule</span>}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-slate-300 font-bold text-sm">No results found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <FollowUpModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedFollowup(null); }}
                customer={selectedFollowup ? { name: selectedFollowup.customerName } : {}}
                followup={selectedFollowup}
                onSuccess={fetchFollowups}
            />
        </div>
    );
};

export default FollowUpsPage;
