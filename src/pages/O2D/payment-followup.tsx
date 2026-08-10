import { useState, useEffect, useMemo } from "react";
import {
    Loader2, Receipt, AlertCircle, RefreshCw, Save, Calendar, X, Truck, Package, CalendarClock, CheckSquare, Search,
} from "lucide-react";
import * as o2dAPI from "../../api/o2dAPI";
import { cn } from "../../lib/utils";

interface InvoiceFollowup {
    vrno: string;
    invoice_date: string;
    planned_date: string | null;
    party_name: string;
    truck_no: string;
    item_name: string;
    payment_status: "pending" | "advance" | "half" | "full";
    remarks: string;
    updated_by: string | null;
    updated_at: string | null;
}

const ALL_STATUS_OPTIONS: { value: InvoiceFollowup["payment_status"]; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "advance", label: "Advance Received" },
    { value: "half", label: "Half Received" },
    { value: "full", label: "Full Received" },
];

// "Pending" is just the default for invoices with no entry yet — it should never be
// explicitly selectable/savable, so it's excluded from the editable dropdowns.
const STATUS_OPTIONS = ALL_STATUS_OPTIONS.filter((o) => o.value !== "pending");

const STATUS_LABEL: Record<string, string> = Object.fromEntries(ALL_STATUS_OPTIONS.map((o) => [o.value, o.label]));

const PaymentFollowup = () => {
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState<InvoiceFollowup[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [savingVrno, setSavingVrno] = useState<string | null>(null);

    const [fromDate, setFromDate] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | InvoiceFollowup["payment_status"]>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState<InvoiceFollowup["payment_status"]>("full");
    const [bulkRemarks, setBulkRemarks] = useState("");
    const [bulkSaving, setBulkSaving] = useState(false);

    // vrnos with local edits that haven't been sent to the server yet
    const [dirty, setDirty] = useState<Set<string>>(new Set());

    useEffect(() => { fetchInvoices(); }, []);

    const fetchInvoices = async (date?: string) => {
        setLoading(true);
        setError(null);
        setSelected(new Set());
        setDirty(new Set());
        try {
            const response = await o2dAPI.getPaymentFollowup(date ?? fromDate ?? undefined);
            if (response.data.success) setInvoices(response.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to fetch invoices");
        } finally {
            setLoading(false);
        }
    };

    const toggleOne = (vrno: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(vrno)) next.delete(vrno); else next.add(vrno);
            return next;
        });
    };

    const toggleAll = (list: InvoiceFollowup[]) => {
        setSelected((prev) => {
            const allSelected = list.length > 0 && list.every((inv) => prev.has(inv.vrno));
            if (allSelected) return new Set();
            return new Set(list.map((inv) => inv.vrno));
        });
    };

    const handleBulkApply = async () => {
        if (!selected.size) return;
        setBulkSaving(true);
        setError(null);
        try {
            const response = await o2dAPI.bulkUpdatePaymentFollowupStatus(Array.from(selected), {
                payment_status: bulkStatus,
                remarks: bulkRemarks || undefined,
            });
            if (response.data.success) {
                const updates: Record<string, any> = {};
                for (const row of response.data.data) updates[row.vrno] = row;
                setInvoices((prev) => prev.map((inv) => (
                    updates[inv.vrno]
                        ? {
                            ...inv,
                            payment_status: updates[inv.vrno].payment_status,
                            remarks: updates[inv.vrno].remarks || "",
                            updated_by: updates[inv.vrno].updated_by,
                            updated_at: updates[inv.vrno].updated_at,
                        }
                        : inv
                )));
                setDirty((prev) => {
                    const next = new Set(prev);
                    for (const vrno of Object.keys(updates)) next.delete(vrno);
                    return next;
                });
                setSelected(new Set());
                setBulkRemarks("");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to bulk update invoices");
        } finally {
            setBulkSaving(false);
        }
    };

    // Local-only edit — nothing is sent to the server until Save/Apply is clicked.
    const updateRow = (vrno: string, patch: Partial<InvoiceFollowup>) => {
        setInvoices((prev) => prev.map((inv) => (inv.vrno === vrno ? { ...inv, ...patch } : inv)));
        setDirty((prev) => new Set(prev).add(vrno));
    };

    const handleSave = async (inv: InvoiceFollowup) => {
        setSavingVrno(inv.vrno);
        setError(null);
        try {
            const response = await o2dAPI.updatePaymentFollowupStatus(inv.vrno, {
                payment_status: inv.payment_status,
                remarks: inv.remarks,
            });
            if (response.data.success) {
                setInvoices((prev) => prev.map((row) => (row.vrno === inv.vrno
                    ? { ...row, updated_by: response.data.data.updated_by, updated_at: response.data.data.updated_at }
                    : row
                )));
                setDirty((prev) => {
                    const next = new Set(prev);
                    next.delete(inv.vrno);
                    return next;
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || `Failed to update ${inv.vrno}`);
        } finally {
            setSavingVrno(null);
        }
    };

    useEffect(() => { setSelected(new Set()); }, [statusFilter, searchQuery]);

    const counts = useMemo(() => ({
        all: invoices.length,
        pending: invoices.filter((i) => i.payment_status === "pending").length,
        advance: invoices.filter((i) => i.payment_status === "advance").length,
        half: invoices.filter((i) => i.payment_status === "half").length,
        full: invoices.filter((i) => i.payment_status === "full").length,
    }), [invoices]);

    const filteredInvoices = useMemo(() => {
        let result = statusFilter === "all" ? invoices : invoices.filter((i) => i.payment_status === statusFilter);

        const query = searchQuery.trim().toLowerCase();
        if (query) {
            result = result.filter((i) =>
                i.party_name?.toLowerCase().includes(query) || i.vrno?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [invoices, statusFilter, searchQuery]);

    const fmtDateTime = (d: string | null) => {
        if (!d) return "—";
        try { return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-2 sm:p-4 lg:p-6">
            <div className="w-full mx-auto space-y-4">

                {/* Header */}
                <div className="bg-[#1e40af] px-3 py-2.5 sm:px-6 sm:py-4 rounded-t-xl flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-white/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-white text-sm sm:text-lg font-bold tracking-tight leading-tight">CRM FMS</h1>
                            <p className="text-blue-200 text-[8px] sm:text-[10px] uppercase font-bold tracking-widest hidden sm:block">
                                MS Pipe Invoices &middot; Mark Advance / Half / Full Payment
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/60 pointer-events-none" />
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => { setFromDate(e.target.value); fetchInvoices(e.target.value); }}
                                onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch { } }}
                                className="pl-6 pr-2 py-1.5 bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white placeholder-white/60 outline-none [color-scheme:dark]"
                                title="Invoice date from"
                            />
                        </div>
                        {fromDate && (
                            <button
                                onClick={() => { setFromDate(""); fetchInvoices(""); }}
                                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all border border-white/10"
                                title="Reset to current month"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => fetchInvoices()}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all border border-white/10"
                            title="Refresh"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        placeholder="Search by party name or invoice (Vr No)..."
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {([
                        ["all", "All", counts.all],
                        ["pending", "Pending", counts.pending],
                        ["advance", "Advance", counts.advance],
                        ["half", "Half", counts.half],
                        ["full", "Full", counts.full],
                    ] as const).map(([key, label, count]) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key)}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                statusFilter === key
                                    ? "bg-[#1e40af] text-white border-[#1e40af]"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                            )}
                        >
                            {label} <span className="opacity-70">({count})</span>
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <p className="text-rose-800 font-semibold text-xs sm:text-sm">{error}</p>
                    </div>
                )}

                {/* Bulk action bar */}
                {selected.size > 0 && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-black text-blue-700">
                            <CheckSquare className="w-3.5 h-3.5" />
                            {selected.size} selected
                        </div>
                        <select
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value as InvoiceFollowup["payment_status"])}
                            className="px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                        >
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <input
                            value={bulkRemarks}
                            onChange={(e) => setBulkRemarks(e.target.value)}
                            className="flex-1 min-w-[140px] px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                            placeholder="Remarks (optional, applies to all selected)"
                        />
                        <button
                            onClick={handleBulkApply}
                            disabled={bulkSaving}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                        >
                            {bulkSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Apply to {selected.size}
                        </button>
                        <button
                            onClick={() => setSelected(new Set())}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all"
                        >
                            <X className="w-3 h-3" /> Clear
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-slate-500 font-medium text-sm">Loading invoices...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 gap-3 bg-white border border-slate-100 rounded-xl">
                        <Receipt className="w-10 h-10 text-slate-300" />
                        <p className="text-base font-semibold text-slate-700">No invoices found</p>
                        <p className="text-xs text-slate-400 text-center">Try changing the invoice date filter or search query.</p>
                    </div>
                ) : (
                    <>
                        {/* ─── Mobile Card List (< lg) — no horizontal scroll ─── */}
                        <div className="lg:hidden space-y-2.5">
                            <label className="flex items-center gap-2 px-1 text-[11px] font-bold text-slate-500">
                                <input
                                    type="checkbox"
                                    checked={filteredInvoices.length > 0 && filteredInvoices.every((inv) => selected.has(inv.vrno))}
                                    onChange={() => toggleAll(filteredInvoices)}
                                    className="w-3.5 h-3.5 accent-blue-600"
                                />
                                Select all
                            </label>
                            {filteredInvoices.map((inv) => (
                                <div key={inv.vrno} className={cn("bg-white rounded-xl border overflow-hidden", dirty.has(inv.vrno) ? "border-amber-300" : "border-slate-200")}>
                                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(inv.vrno)}
                                                onChange={() => toggleOne(inv.vrno)}
                                                className="w-3.5 h-3.5 accent-blue-600 flex-shrink-0"
                                            />
                                            <span className="text-xs font-black text-blue-700">{inv.vrno}</span>
                                            <span className="w-px h-3 bg-slate-200" />
                                            <span className="text-[11px] font-semibold text-slate-500">{inv.invoice_date}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{STATUS_LABEL[inv.payment_status]}</span>
                                    </div>

                                    <div className="px-3 py-2.5 space-y-2.5">
                                        <p className="text-sm font-black text-slate-900 leading-tight truncate">{inv.party_name}</p>

                                        <div className="grid grid-cols-3 gap-0 rounded-lg overflow-hidden border border-slate-100 text-center text-[9px]">
                                            <div className="px-1.5 py-1.5 bg-slate-50 border-r border-slate-100">
                                                <span className="flex items-center justify-center gap-0.5 font-black text-slate-400 uppercase tracking-wider mb-0.5"><Truck className="w-2.5 h-2.5" /> Truck</span>
                                                <span className="font-bold text-slate-700 text-[10px]">{inv.truck_no || "—"}</span>
                                            </div>
                                            <div className="px-1.5 py-1.5 bg-slate-50 border-r border-slate-100">
                                                <span className="flex items-center justify-center gap-0.5 font-black text-slate-400 uppercase tracking-wider mb-0.5"><Package className="w-2.5 h-2.5" /> Item</span>
                                                <span className="font-bold text-slate-700 text-[10px]">{inv.item_name || "—"}</span>
                                            </div>
                                            <div className="px-1.5 py-1.5 bg-blue-50">
                                                <span className="flex items-center justify-center gap-0.5 font-black text-blue-400 uppercase tracking-wider mb-0.5"><CalendarClock className="w-2.5 h-2.5" /> Planned</span>
                                                <span className="font-bold text-blue-700 text-[10px]">{inv.planned_date || "—"}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Payment Status</label>
                                            <select
                                                value={inv.payment_status}
                                                onChange={(e) => updateRow(inv.vrno, { payment_status: e.target.value as InvoiceFollowup["payment_status"] })}
                                                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                                            >
                                                {inv.payment_status === "pending" && (
                                                    <option value="pending" disabled hidden>Select Status</option>
                                                )}
                                                {STATUS_OPTIONS.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Remarks</label>
                                            <input
                                                value={inv.remarks}
                                                onChange={(e) => updateRow(inv.vrno, { remarks: e.target.value })}
                                                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                                                placeholder="Remarks"
                                            />
                                        </div>

                                        {dirty.has(inv.vrno) && (
                                            <p className="text-[9px] font-bold text-amber-600 text-center">Unsaved changes — click Save to update</p>
                                        )}

                                        <button
                                            onClick={() => handleSave(inv)}
                                            disabled={savingVrno === inv.vrno || inv.payment_status === "pending" || !dirty.has(inv.vrno)}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1e40af] text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {savingVrno === inv.vrno
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <Save className="w-3.5 h-3.5" />}
                                            Save
                                        </button>

                                        {inv.updated_by && (
                                            <p className="text-[9px] text-slate-400 text-center">
                                                Last updated by {inv.updated_by}, {fmtDateTime(inv.updated_at)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ─── Desktop Table (lg+) ─── */}
                        <div className="hidden lg:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
                            <table className="w-full border-separate border-spacing-0 text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="sticky top-0 px-3 py-2.5 bg-slate-50 z-10 border-b-2 border-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={filteredInvoices.length > 0 && filteredInvoices.every((inv) => selected.has(inv.vrno))}
                                                onChange={() => toggleAll(filteredInvoices)}
                                                className="w-3.5 h-3.5 accent-blue-600"
                                            />
                                        </th>
                                        {['#', 'Vr No', 'Date', 'Planned Date', 'Party Name', 'Truck No', 'Item', 'Payment Status', 'Remarks', 'Last Updated', ''].map((h) => (
                                            <th key={h} className="sticky top-0 px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap bg-slate-50 z-10 border-b-2 border-slate-200">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredInvoices.map((inv, i) => (
                                        <tr key={inv.vrno} className={cn("hover:bg-slate-50/60 transition-colors", selected.has(inv.vrno) && "bg-blue-50/50", dirty.has(inv.vrno) && "bg-amber-50/60")}>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(inv.vrno)}
                                                    onChange={() => toggleOne(inv.vrno)}
                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-xs font-semibold text-slate-500 whitespace-nowrap">{i + 1}</td>
                                            <td className="px-3 py-2 text-xs font-black text-slate-700 whitespace-nowrap">{inv.vrno}</td>
                                            <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{inv.invoice_date}</td>
                                            <td className="px-3 py-2 text-xs text-blue-700 font-semibold whitespace-nowrap">{inv.planned_date || "—"}</td>
                                            <td className="px-3 py-2 text-xs text-slate-700 font-semibold whitespace-nowrap max-w-[220px] truncate" title={inv.party_name}>{inv.party_name}</td>
                                            <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{inv.truck_no}</td>
                                            <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{inv.item_name}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <select
                                                    value={inv.payment_status}
                                                    onChange={(e) => updateRow(inv.vrno, { payment_status: e.target.value as InvoiceFollowup["payment_status"] })}
                                                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                                                >
                                                    {inv.payment_status === "pending" && (
                                                        <option value="pending" disabled hidden>Select Status</option>
                                                    )}
                                                    {STATUS_OPTIONS.map((o) => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <input
                                                    value={inv.remarks}
                                                    onChange={(e) => updateRow(inv.vrno, { remarks: e.target.value })}
                                                    className="w-40 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                                                    placeholder="Remarks"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-[10px] text-slate-400 whitespace-nowrap">
                                                {inv.updated_by ? (
                                                    <>
                                                        by {inv.updated_by}<br />
                                                        {fmtDateTime(inv.updated_at)}
                                                    </>
                                                ) : "—"}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleSave(inv)}
                                                        disabled={savingVrno === inv.vrno || inv.payment_status === "pending" || !dirty.has(inv.vrno)}
                                                        className={cn(
                                                            "flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[10px] font-bold transition-all disabled:opacity-50",
                                                            dirty.has(inv.vrno)
                                                                ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                                : "border-slate-300 text-slate-600 hover:border-slate-400"
                                                        )}
                                                    >
                                                        {savingVrno === inv.vrno
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Save className="w-3 h-3" />}
                                                        Save
                                                    </button>
                                                    {dirty.has(inv.vrno) && (
                                                        <span className="text-[9px] font-bold text-amber-600">Unsaved</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentFollowup;
