import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader, FileText, CheckCircle, Loader2, Calendar, User, Hash, RefreshCcw } from "lucide-react";
import Heading from "../../components/element/Heading";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { storeGRNApi } from "@/api/store/storeGRNApi";
import { storeGRNApprovalApi } from "@/api/store/storeGRNApprovalApi";
import { Card } from "../../components/ui/card";
import { formatDate, formatDateTime, formatCurrency } from "../../utils/storeUtils";

/* ================= TYPES ================= */

type OracleRow = {
    PLANNEDDATE?: string;
    VRNO?: string;
    VRDATE?: string;
    PARTYNAME?: string;
    PARTYBILLNO?: string;
    PARTYBILLAMT?: number;
};

type PGRow = {
    planned_date?: string;
    grn_no?: string;
    grn_date?: string;
    party_name?: string;
    party_bill_no?: string;
    party_bill_amount?: number;
    sended_bill?: boolean;
    approved_by_admin?: boolean;
};

/* ================= COMPONENT ================= */

export default function StoreGRN() {
    const [oracleRows, setOracleRows] = useState<OracleRow[]>([]);
    const [pgRows, setPgRows] = useState<PGRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
    const [processingGrn, setProcessingGrn] = useState<string | null>(null);

    /* ================= FETCH DATA ================= */

    const fetchData = useCallback(async (isManual = false) => {
        setLoading(true);
        try {
            const [oracleRes, pgRes] = await Promise.all([
                storeGRNApi.getPending(),
                storeGRNApprovalApi.getAll()
            ]);

            if (oracleRes?.success) {
                setOracleRows(oracleRes.data || []);
            }
            if (pgRes?.success) {
                setPgRows((pgRes.data as PGRow[]) || []);
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

    /* ================= SEND BILL ================= */

    const handleSendBill = async (row: OracleRow) => {
        if (!row.VRNO) return;

        setProcessingGrn(row.VRNO);

        try {
            await storeGRNApprovalApi.sendBill({
                planned_date: row.PLANNEDDATE,
                grn_no: row.VRNO,
                grn_date: row.VRDATE,
                party_name: row.PARTYNAME,
                party_bill_no: row.PARTYBILLNO,
                party_bill_amount: row.PARTYBILLAMT,
            });

            toast.success(`Bill for GRN ${row.VRNO} sended successfully`);
            await fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to send bill");
        } finally {
            setProcessingGrn(null);
        }
    };

    /* ================= FILTERING LOGIC ================= */

    const historyRowsRaw = useMemo(() => {
        return pgRows.filter(r => r.sended_bill && r.approved_by_admin);
    }, [pgRows]);

    const pendingRowsRaw = useMemo(() => {
        const historyNos = new Set(historyRowsRaw.map(r => r.grn_no));
        return oracleRows.filter(o => !historyNos.has(o.VRNO));
    }, [oracleRows, historyRowsRaw]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const baseRows = activeTab === "pending" ? pendingRowsRaw : historyRowsRaw;

        return baseRows.filter((r: any) => {
            const grnNo = r.VRNO || r.grn_no || "";
            const party = r.PARTYNAME || r.party_name || "";
            const billNo = r.PARTYBILLNO || r.party_bill_no || "";

            const matchesSearch =
                !q ||
                grnNo.toLowerCase().includes(q) ||
                party.toLowerCase().includes(q) ||
                billNo.toLowerCase().includes(q);

            return matchesSearch;
        });
    }, [pendingRowsRaw, historyRowsRaw, search, activeTab]);

    /* ================= UI RENDERERS ================= */

    const renderAction = (r: any) => {
        const grn_no = r.VRNO || r.grn_no;
        if (activeTab === "history") {
            return (
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <CheckCircle size={18} />
                    <span>Sended</span>
                </div>
            );
        }

        const isProcessing = processingGrn === grn_no;

        return (
            <Button
                size="sm"
                disabled={isProcessing}
                onClick={() => handleSendBill(r)}
                className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Sending...</span>
                    </>
                ) : (
                    <span>Send Bill</span>
                )}
            </Button>
        );
    };

    /* ================= MAIN RENDER ================= */

    return (
        <div className="w-full p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <Heading
                heading="Store GRN"
                subtext="Process pending GRNs and view history"
            >
                <FileText size={32} className="text-primary" />
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
                    <p className="text-muted-foreground font-medium animate-pulse">Synchronizing Store Data...</p>
                </div>
            ) : filteredRows.length === 0 ? (
                <div className="mx-auto max-w-lg text-center p-16 border-2 border-dashed rounded-3xl bg-gray-50/50 mt-4">
                    <div className="mx-auto w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-4 text-gray-300">
                        <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No records found</h3>
                    <p className="text-gray-500 mb-6 px-4">There are no GRNs matching your current filters or tab.</p>
                    <Button 
                        onClick={() => { setSearch(""); fetchData(true); }}
                        variant="secondary"
                        className="rounded-xl gap-2 font-semibold"
                    >
                        <RefreshCcw size={16} />
                        Refresh Data
                    </Button>
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden lg:block relative border rounded-2xl bg-white shadow-xl overflow-hidden max-h-[65vh] overflow-y-auto thin-scrollbar">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 border-b sticky top-0 z-10 shadow-sm">
                                <tr className="text-slate-600 font-semibold">
                                    <th className="px-5 py-4 text-center w-32 bg-slate-50">Action</th>
                                    <th className="px-5 py-4 bg-slate-50">Planned Date & Time</th>
                                    <th className="px-5 py-4 bg-slate-50">GRN Details</th>
                                    <th className="px-5 py-4 bg-slate-50">Party Information</th>
                                    <th className="px-5 py-4 whitespace-nowrap bg-slate-50">Bill Number</th>
                                    <th className="px-5 py-4 text-right bg-slate-50">Bill Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRows.map((r: any) => {
                                    const grn_no = r.VRNO || r.grn_no;
                                    const planned_date = r.PLANNEDDATE || r.planned_date;
                                    const grn_date = r.VRDATE || r.grn_date;
                                    const party_name = r.PARTYNAME || r.party_name;
                                    const bill_no = r.PARTYBILLNO || r.party_bill_no;
                                    const bill_amt = r.PARTYBILLAMT || r.party_bill_amount;

                                    return (
                                        <tr key={grn_no} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-5 py-5 text-center align-middle">
                                                {renderAction(r)}
                                            </td>
                                            <td className="px-5 py-5 text-slate-700">
                                                <div className="flex flex-col">
                                                    <span className="font-bold whitespace-nowrap tracking-tight">{formatDateTime(planned_date)}</span>
                                                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black flex items-center gap-1">
                                                        <div className="w-1 h-1 rounded-full bg-orange-400" /> Planned
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-base">{grn_no}</span>
                                                    <span className="text-xs text-slate-500 mt-0.5 font-medium">{formatDate(grn_date)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-5">
                                                <span className="font-bold text-slate-800 line-clamp-1 max-w-[250px]">{party_name}</span>
                                            </td>
                                            <td className="px-5 py-5">
                                                <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-600 inline-block">
                                                    {bill_no}
                                                </span>
                                            </td>
                                            <td className="px-5 py-5 text-right font-black text-primary text-base">
                                                {formatCurrency(bill_amt)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="lg:hidden grid grid-cols-1 gap-3 px-1">
                        {filteredRows.map((r: any) => {
                            const isHistory = activeTab === "history";
                            const grn_no = r.VRNO || r.grn_no;
                            const planned_date = r.PLANNEDDATE || r.planned_date;
                            const grn_date = r.VRDATE || r.grn_date;
                            const party_name = r.PARTYNAME || r.party_name;
                            const bill_no = r.PARTYBILLNO || r.party_bill_no;
                            const bill_amt = r.PARTYBILLAMT || r.party_bill_amount;

                            return (
                                <Card key={grn_no} className={`border-l-[6px] ${isHistory ? 'border-l-emerald-500' : 'border-l-orange-500'} border-y-0 border-r-0 shadow-md bg-white overflow-hidden rounded-r-xl active:scale-[0.99] transition-transform`}>
                                    <div className="px-3 py-3">
                                        <div className="flex justify-between items-center gap-2 mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">GRN NUMBER</span>
                                                <span className="text-base font-black text-slate-900 leading-none">{grn_no}</span>
                                            </div>
                                            <div className="shrink-0 scale-90 origin-right">
                                                {renderAction(r)}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-50">
                                                <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <User size={14} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-800 line-clamp-1">{party_name}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">GRN Date</span>
                                                    <span className="text-xs font-bold text-slate-700">{formatDate(grn_date)}</span>
                                                </div>
                                                <div className="flex flex-col border-l pl-3 border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Bill No</span>
                                                    <span className="text-xs font-bold text-slate-700">{bill_no}</span>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50/80 px-3 py-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Planned Timing</span>
                                                    <span className="text-[11px] font-black text-slate-900">
                                                        {formatDateTime(planned_date)}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Amount</span>
                                                    <span className="text-sm font-black text-primary">{formatCurrency(bill_amt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}



