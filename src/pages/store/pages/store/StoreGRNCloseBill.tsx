import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader, Lock, Loader2, CheckCircle, User, Calendar, Hash, BadgeCheck, RefreshCcw } from "lucide-react";
import Heading from "../../components/element/Heading";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { storeGRNApprovalApi } from "@/api/store/storeGRNApprovalApi";
import { Card } from "../../components/ui/card";
import { formatDate, formatDateTime } from "../../utils/storeUtils";

/* ================= TYPES ================= */

type StoreGRNRow = {
    planned_date?: string;
    grn_no?: string;
    grn_date?: string;
    party_name?: string;
    party_bill_no?: string;
    party_bill_amount?: number;

    sended_bill?: boolean;
    approved_by_admin?: boolean;
    approved_by_gm?: boolean;
    close_bill?: boolean;
};

/* ================= COMPONENT ================= */

export default function StoreGRNCloseBill() {
    const [rows, setRows] = useState<StoreGRNRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
    const [processingGrn, setProcessingGrn] = useState<string | null>(null);

    /* ================= FETCH DATA ================= */

    const fetchData = useCallback(async (isManual = false) => {
        setLoading(true);
        try {
            const res = await storeGRNApprovalApi.getAll();
            if (res?.success) {
                setRows((res.data as StoreGRNRow[]) || []);
            } else {
                toast.error("Failed to load Store GRN data");
            }
            if (isManual) toast.success("Data refreshed successfully");
        } catch (err) {
            console.error(err);
            toast.error("Error fetching Store GRN data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* ================= CLOSE BILL ACTION ================= */

    const handleCloseBill = async (row: StoreGRNRow) => {
        if (!row.grn_no) return;

        setProcessingGrn(row.grn_no);

        try {
            await storeGRNApprovalApi.closeBill(row.grn_no);
            toast.success(`Bill for GRN ${row.grn_no} closed successfully`);

            // Optimistic update
            setRows((prev) =>
                prev.map((r) =>
                    r.grn_no === row.grn_no
                        ? { ...r, close_bill: true }
                        : r
                )
            );
        } catch (err) {
            console.error(err);
            toast.error("Failed to close bill");
        } finally {
            setProcessingGrn(null);
        }
    };

    /* ================= FILTERING LOGIC ================= */

    const pendingRowsRaw = useMemo(() => {
        return rows.filter(r =>
            r.sended_bill &&
            r.approved_by_admin &&
            r.approved_by_gm &&
            !r.close_bill
        );
    }, [rows]);

    const historyRowsRaw = useMemo(() => {
        return rows.filter(r => r.close_bill);
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const tabRows = activeTab === "pending" ? pendingRowsRaw : historyRowsRaw;

        return tabRows.filter((r) => {
            const matchesSearch =
                !q ||
                r.grn_no?.toLowerCase().includes(q) ||
                r.party_name?.toLowerCase().includes(q) ||
                r.party_bill_no?.toLowerCase().includes(q);

            return matchesSearch;
        });
    }, [pendingRowsRaw, historyRowsRaw, search, activeTab]);

    /* ================= UI RENDERERS ================= */

    const renderAction = (row: StoreGRNRow) => {
        if (activeTab === "history") {
            return (
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <CheckCircle size={18} />
                    <span>Closed</span>
                </div>
            );
        }

        const isProcessing = processingGrn === row.grn_no;

        return (
            <Button
                size="sm"
                disabled={isProcessing}
                onClick={() => handleCloseBill(row)}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2 px-4 py-2"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Closing...</span>
                    </>
                ) : (
                    <span>Close Bill</span>
                )}
            </Button>
        );
    };

    /* ================= MAIN RENDER ================= */

    return (
        <div className="w-full p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <Heading
                heading="Store GRN – Close Bill"
                subtext="Final closure of approved GRN bills"
            >
                <Lock size={48} className="text-primary" />
            </Heading>

            {/* TABS & ACTIONS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-2">
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`pb-2 px-4 transition-all duration-300 font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 ${activeTab === "pending"
                            ? "border-orange-500 text-orange-600"
                            : "border-transparent text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Pending
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeTab === "pending" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"
                            }`}>
                            {pendingRowsRaw.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`pb-2 px-4 transition-all duration-300 font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 ${activeTab === "history"
                            ? "border-emerald-500 text-emerald-600"
                            : "border-transparent text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        History
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeTab === "history" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
                            }`}>
                            {historyRowsRaw.length}
                        </span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 md:w-80">
                        <Input
                            className="pl-4 pr-10 rounded-xl border-gray-200 focus:ring-primary/20 transition-all shadow-sm h-10"
                            placeholder="Search GRN / Party / Bill..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchData(true)}
                        disabled={loading}
                        className="rounded-xl hover:bg-primary/5 hover:text-primary transition-all shadow-sm h-10 w-10 shrink-0"
                        title="Refresh Data"
                    >
                        <RefreshCcw size={18} className={`${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="animate-spin text-primary" size={48} />
                    <p className="text-muted-foreground font-medium animate-pulse">Checking bill status...</p>
                </div>
            ) : filteredRows.length === 0 ? (
                <div className="mx-auto max-w-lg text-center p-16 border-2 border-dashed rounded-3xl bg-gray-50/50 mt-4">
                    <div className="mx-auto w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-4 text-gray-300">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No records found</h3>
                    {/* <p className="text-gray-500 mb-6 px-4">There are no bills awaiting closure in your current view.</p> */}
                    {/* <Button
                        onClick={() => { setSearch(""); fetchData(true); }}
                        variant="secondary"
                        className="rounded-xl gap-2 font-semibold"
                    >
                        <RefreshCcw size={16} />
                        Refresh Data
                    </Button> */}
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden lg:block relative border rounded-2xl bg-white shadow-xl overflow-hidden max-h-[65vh] overflow-y-auto thin-scrollbar">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 border-b sticky top-0 z-10 shadow-sm">
                                <tr className="text-slate-600 font-semibold">
                                    <th className="px-5 py-4 text-center w-36 bg-slate-50">Action</th>
                                    <th className="px-5 py-4 bg-slate-50">Planned Date & Time</th>
                                    <th className="px-5 py-4 bg-slate-50">GRN No</th>
                                    <th className="px-5 py-4 bg-slate-50">GRN Date</th>
                                    <th className="px-5 py-4 bg-slate-50">Party Information</th>
                                    <th className="px-5 py-4 bg-slate-50">Bill Number</th>
                                    <th className="px-5 py-4 text-center bg-slate-50">Final Chain</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRows.map((row) => (
                                    <tr key={row.grn_no} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-5 py-5 text-center align-middle">
                                            {renderAction(row)}
                                        </td>
                                        <td className="px-5 py-5 text-slate-700">
                                            <div className="flex flex-col">
                                                <span className="font-bold whitespace-nowrap tracking-tight">{formatDateTime(row.planned_date)}</span>
                                                <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Planned
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-5 font-black text-slate-900 text-base">{row.grn_no}</td>
                                        <td className="px-5 py-5 text-slate-600 font-medium">{formatDate(row.grn_date)}</td>
                                        <td className="px-5 py-5 font-bold text-slate-800">{row.party_name}</td>
                                        <td className="px-5 py-5">
                                            <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-600 inline-block">
                                                {row.party_bill_no}
                                            </span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <div className="flex flex-col gap-1 items-center">
                                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Chain Status</span>
                                                <div className="flex gap-1.5">
                                                    <div title="Admin Approved" className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                                                        <BadgeCheck size={14} />
                                                    </div>
                                                    <div title="GM Approved" className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                                                        <BadgeCheck size={14} />
                                                    </div>
                                                    {row.close_bill && (
                                                        <div title="Closed" className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shadow-sm border border-red-200">
                                                            <Lock size={12} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="lg:hidden grid grid-cols-1 gap-2.5 px-1.5">
                        {filteredRows.map((row) => {
                            const isHistory = activeTab === "history";
                            return (
                                <Card key={row.grn_no} className={`border-l-[6px] ${isHistory ? 'border-l-emerald-500' : 'border-l-red-500'} border-y-0 border-r-0 shadow-md bg-white overflow-hidden rounded-r-xl active:scale-[0.99] transition-transform font-sans`}>
                                    <div className="px-3 py-3">
                                        <div className="flex justify-between items-center gap-2 mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">GRN NUMBER</span>
                                                <span className="text-base font-black text-slate-900 leading-none">{row.grn_no}</span>
                                            </div>
                                            <div className="shrink-0 scale-90 origin-right">
                                                {renderAction(row)}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-50">
                                                <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <User size={14} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-800 line-clamp-1">{row.party_name}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">GRN Date</span>
                                                    <span className="text-xs font-bold text-slate-700">{formatDate(row.grn_date)}</span>
                                                </div>
                                                <div className="flex flex-col border-l pl-3 border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Bill No</span>
                                                    <span className="text-xs font-bold text-slate-700">{row.party_bill_no}</span>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50/80 px-3 py-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Planned Timing</span>
                                                    <span className="text-[11px] font-black text-slate-900">
                                                        {formatDateTime(row.planned_date)}
                                                    </span>
                                                </div>
                                                <div title="Current Status" className="shrink-0 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                                                    <div className={`w-2 h-2 rounded-full ${isHistory ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    <span className="text-[9px] font-black uppercase text-slate-500">{isHistory ? 'Closed' : 'Awaiting'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
