import { useState, useEffect, useMemo } from "react";
import {
    Loader2, FileText, Calendar, User, Package,
    AlertCircle, Download, X
} from "lucide-react";
import * as o2dAPI from "../../api/o2dAPI";
import { useAuth } from "../../context/AuthContext";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import * as XLSX from "xlsx";

interface EnquiryRecord {
    id: number;
    item_type: string;
    size: string;
    thickness: number;
    enquiry_date: string;
    customer: string;
    quantity: number | null;
    sales_executive: string;
    created_at: string;
}

const EnqList = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [visibleCount, setVisibleCount] = useState(100);

    useEffect(() => { if (user) fetchEnquiries(); }, [user]);

    const fetchEnquiries = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await o2dAPI.getAllEnquiries();
            if (response.data.success) {
                let data = response.data.data;
                if (user?.role === 'user') {
                    const name = (user.user_name || user.username || "").trim().toLowerCase();
                    data = data.filter((e: EnquiryRecord) =>
                        e.sales_executive?.trim().toLowerCase() === name
                    );
                }
                setEnquiries(data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to fetch enquiries");
        } finally {
            setLoading(false);
        }
    };

    const fmtDate = (d: string) => {
        try { return format(new Date(d), "dd MMM yy"); } catch { return d; }
    };

    const filteredEnquiries = useMemo(() => {
        if (!startDate && !endDate) return enquiries;
        return enquiries.filter((enq) => {
            if (!enq.enquiry_date) return false;
            try {
                const dt = parseISO(enq.enquiry_date);
                const s = startDate ? startOfDay(parseISO(startDate)) : null;
                const e = endDate ? endOfDay(parseISO(endDate)) : null;
                if (s && e) return isWithinInterval(dt, { start: s, end: e });
                if (s) return dt >= s;
                if (e) return dt <= e;
                return true;
            } catch { return false; }
        });
    }, [enquiries, startDate, endDate]);

    const visibleEnquiries = useMemo(
        () => filteredEnquiries.slice(0, visibleCount),
        [filteredEnquiries, visibleCount]
    );

    useEffect(() => { setVisibleCount(100); }, [startDate, endDate]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 2) {
            setVisibleCount(prev => Math.min(prev + 50, filteredEnquiries.length));
        }
    };

    const handleDownload = () => {
        if (!filteredEnquiries.length) return;
        const rows = filteredEnquiries.map(e => ({
            "ID": e.id,
            "Date": format(new Date(e.enquiry_date), "dd/MM/yyyy"),
            "Customer": e.customer,
            "Item Type": e.item_type,
            "Size": e.size,
            "Thickness (mm)": e.thickness,
            "Quantity (MT)": e.quantity || 0,
            "Sales Executive": e.sales_executive,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Enquiries");
        XLSX.writeFile(wb, `Enquiry_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`);
    };

    const totalQty = filteredEnquiries.reduce((s, e) => s + (Number(e.quantity) || 0), 0);

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">

            {/* ── Fixed Top Bar ── */}
            <div className="shrink-0 z-30 bg-white border-b border-slate-200 shadow-sm">

                {/* Title row */}
                <div className="flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg flex-shrink-0">
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Enquiry List</h1>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                                {user?.role === 'admin' ? 'All enquiries' : 'Your enquiries'}
                            </p>
                        </div>
                    </div>

                    {/* Inline stats */}
                    <div className="flex items-center gap-3 sm:gap-6">
                        <div className="text-right">
                            <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Records</p>
                            <p className="text-sm sm:text-base font-black text-slate-700">{filteredEnquiries.length.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Qty</p>
                            <p className="text-sm sm:text-base font-black text-blue-600">
                                {totalQty.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium ml-0.5">MT</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter row */}
                <div className="flex items-center gap-1.5 sm:gap-3 px-3 pb-2 sm:px-5 sm:pb-3 overflow-x-auto">
                    {/* From date */}
                    <div className="relative flex-shrink-0">
                        <span className="absolute -top-1.5 left-2 px-0.5 bg-white text-[8px] font-bold text-slate-400 uppercase tracking-wider z-10">From</span>
                        <div className="relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none z-10" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch { } }}
                                className="pl-6 pr-1.5 py-1.5 w-32 sm:w-40 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    <span className="text-slate-300 font-bold text-xs flex-shrink-0">—</span>

                    {/* To date */}
                    <div className="relative flex-shrink-0">
                        <span className="absolute -top-1.5 left-2 px-0.5 bg-white text-[8px] font-bold text-slate-400 uppercase tracking-wider z-10">To</span>
                        <div className="relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none z-10" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch { } }}
                                className="pl-6 pr-1.5 py-1.5 w-32 sm:w-40 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {(startDate || endDate) && (
                        <button
                            onClick={() => { setStartDate(""); setEndDate(""); }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Export button */}
                    <button
                        onClick={handleDownload}
                        disabled={!filteredEnquiries.length}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all active:scale-95 text-xs flex-shrink-0 shadow-sm"
                    >
                        <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden xs:inline sm:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="mx-3 mt-3 bg-rose-50 border-l-4 border-rose-500 p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <p className="text-rose-800 font-semibold text-xs sm:text-sm">{error}</p>
                </div>
            )}

            {/* ── Content ── */}
            <div
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 animate-spin" />
                        <p className="text-slate-500 font-medium text-sm">Loading enquiries...</p>
                    </div>
                ) : filteredEnquiries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 gap-3">
                        <FileText className="w-12 h-12 text-slate-300" />
                        <p className="text-base font-semibold text-slate-700">No Enquiries Found</p>
                        <p className="text-xs text-slate-400 text-center">
                            {startDate || endDate
                                ? "No records match your date range."
                                : user?.role === 'admin'
                                    ? "No enquiries have been created yet."
                                    : "You haven't created any enquiries yet."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ─── Mobile Card List (< lg) ─── */}
                        <div className="lg:hidden px-2 py-2 space-y-2 pb-20">
                            {visibleEnquiries.map((enq) => (
                                <div key={enq.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                    {/* Card top band */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-400">#{enq.id}</span>
                                            <span className="w-px h-3 bg-slate-200" />
                                            <span className="text-[10px] font-bold text-slate-600">{fmtDate(enq.enquiry_date)}</span>
                                        </div>
                                        {enq.quantity ? (
                                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                                                {enq.quantity} MT
                                            </span>
                                        ) : (
                                            <span className="text-[9px] text-slate-300 italic">No qty</span>
                                        )}
                                    </div>

                                    {/* Card body */}
                                    <div className="px-3 py-2 space-y-2">
                                        {/* Customer */}
                                        <p className="text-xs font-black text-slate-900 leading-tight">{enq.customer}</p>

                                        {/* Specs row */}
                                        <div className="grid grid-cols-3 gap-0 rounded-lg overflow-hidden border border-slate-100 text-center text-[9px]">
                                            <div className="px-1 py-1.5 bg-purple-50">
                                                <span className="block font-black text-purple-400 uppercase tracking-wider mb-0.5">Type</span>
                                                <span className="font-black text-purple-700 text-[10px]">{enq.item_type}</span>
                                            </div>
                                            <div className="px-1 py-1.5 bg-slate-50 border-x border-slate-100">
                                                <span className="block font-black text-slate-400 uppercase tracking-wider mb-0.5">Size</span>
                                                <span className="font-bold text-slate-700 text-[10px]">{enq.size}</span>
                                            </div>
                                            <div className="px-1 py-1.5 bg-slate-50">
                                                <span className="block font-black text-slate-400 uppercase tracking-wider mb-0.5">Thick</span>
                                                <span className="font-bold text-slate-700 text-[10px]">{enq.thickness}mm</span>
                                            </div>
                                        </div>

                                        {/* Executive */}
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-[8px] flex-shrink-0">
                                                {enq.sales_executive?.charAt(0)?.toUpperCase() || 'N'}
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-500 truncate">
                                                {enq.sales_executive || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Load more indicator */}
                            {visibleCount < filteredEnquiries.length && (
                                <div className="flex justify-center py-4">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        Showing {visibleCount} of {filteredEnquiries.length} — scroll to load more
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="hidden lg:block">
                            <table className="w-full border-separate border-spacing-0 text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {['#', 'Date', 'Customer', 'Item Type', 'Size', 'Thickness', 'Quantity', 'Sales Executive'].map(h => (
                                            <th key={h} className="sticky top-0 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap bg-slate-50 z-20 shadow-sm border-b-2 border-slate-200">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {visibleEnquiries.map((enq, i) => (
                                        <tr key={enq.id} className="hover:bg-blue-50/40 transition-colors group">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-600 font-bold text-xs group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                                    {i + 1}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                                                {fmtDate(enq.enquiry_date)}
                                            </td>
                                            <td className="px-4 py-3 max-w-[180px]">
                                                <span className="text-xs font-semibold text-slate-900 truncate block" title={enq.customer}>
                                                    {enq.customer}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                                    {enq.item_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                                                {enq.size}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                                                    {enq.thickness} mm
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {enq.quantity ? (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                        {enq.quantity} MT
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300 italic">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-[9px] flex-shrink-0">
                                                        {enq.sales_executive?.charAt(0)?.toUpperCase() || 'N'}
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-600">
                                                        {enq.sales_executive || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {visibleCount < filteredEnquiries.length && (
                                <div className="flex justify-center py-4 border-t border-slate-100">
                                    <span className="text-xs text-slate-400">
                                        Showing {visibleCount} of {filteredEnquiries.length} — scroll to load more
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EnqList;
