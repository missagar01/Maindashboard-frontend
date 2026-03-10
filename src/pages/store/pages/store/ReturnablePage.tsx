// Returnable / Non-Returnable Details Page
import { useEffect, useState, useMemo } from "react";
import { storeApi } from "@/api/store/storeSystemApi";
import {
    Package, Search, RefreshCcw, FileText,
    Calendar, User, Box, Hash, Scale, CheckCircle2, Clock,
    MoreHorizontal, Smartphone, Laptop, LayoutGrid, List
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import Loading from "./Loading";

interface ReturnableItem {
    GATEPASS_TYPE: string;
    VRDATE: string;
    VRNO: string;
    PARTY_NAME: string;
    ITEM_CODE: string;
    ITEM_NAME: string;
    REMARK: string;
    UNIT: string;
    QTYISSUED: number;
    QTYRECEIVED: number;
    MOBILE: string;
    EMAIL: string;
    GATEPASS_STATUS: 'PENDING' | 'COMPLETED';
}

interface Stats {
    TOTAL_COUNT: number;
    RETURNABLE_COUNT: number;
    NON_RETURNABLE_COUNT: number;
    RETURNABLE_COMPLETED_COUNT: number;
    RETURNABLE_PENDING_COUNT: number;
}

export default function ReturnablePage() {
    const [data, setData] = useState<ReturnableItem[]>([]);
    const [stats, setStats] = useState<Stats>({
        TOTAL_COUNT: 0,
        RETURNABLE_COUNT: 0,
        NON_RETURNABLE_COUNT: 0,
        RETURNABLE_COMPLETED_COUNT: 0,
        RETURNABLE_PENDING_COUNT: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Nested Tab State
    const [mainTab, setMainTab] = useState("RETURNABLE");
    const [subTab, setSubTab] = useState("PENDING");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [detailsRes, statsRes] = await Promise.all([
                    storeApi.getReturnableDetails() as Promise<{ success: boolean; data: ReturnableItem[] }>,
                    storeApi.getReturnableStats() as Promise<{ success: boolean; data: Stats }>
                ]);

                if (detailsRes.success && detailsRes.data) {
                    setData(detailsRes.data);
                }
                if (statsRes.success && statsRes.data) {
                    setStats(statsRes.data);
                }
            } catch (error) {
                console.error("Failed to fetch returnable data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            let matchesTab = false;

            if (mainTab === "NON_RETURNABLE") {
                matchesTab = item.GATEPASS_TYPE === 'NON RETURANABLE';
            } else {
                // Main tab is RETURNABLE
                matchesTab = item.GATEPASS_TYPE === 'RETURNABLE' && item.GATEPASS_STATUS === subTab;
            }

            const matchesSearch =
                item.PARTY_NAME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.ITEM_NAME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.VRNO?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.ITEM_CODE?.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesTab && matchesSearch;
        });
    }, [data, mainTab, subTab, searchTerm]);

    if (loading) {
        return (
            <Loading
                heading="Gate Pass Tracking"
                subtext="Organizing your gate pass data..."
                icon={<RefreshCcw size={48} className="text-indigo-600 animate-spin" />}
            />
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20">
                        <Package size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Gate Pass Tracking</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage returnable and non-returnable records</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search records..."
                        className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Tabs (Returnable vs Non-Returnable) */}
            <div className="space-y-6">
                <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                    <TabsList className="bg-slate-100/80 dark:bg-slate-900 p-1.5 rounded-2xl h-auto flex flex-wrap gap-1 border border-slate-200 dark:border-slate-800">
                        <TabsTrigger value="RETURNABLE" className="flex-1 py-2.5 px-6 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-md gap-3 font-bold transition-all">
                            <RefreshCcw size={18} />
                            Returnable
                            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-lg ml-1">
                                {stats.RETURNABLE_COUNT}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="NON_RETURNABLE" className="flex-1 py-2.5 px-6 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-md gap-3 font-bold transition-all">
                            <Box size={18} />
                            Non Returnable
                            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-lg ml-1">
                                {stats.NON_RETURNABLE_COUNT}
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Sub Tabs (Pending vs Completed - Only for Returnable) */}
                {mainTab === "RETURNABLE" && (
                    <div className="flex justify-center sm:justify-start">
                        <Tabs value={subTab} onValueChange={setSubTab} className="w-full sm:w-auto">
                            <TabsList className="bg-white dark:bg-slate-900/80 p-1 rounded-xl h-auto border border-slate-100 dark:border-slate-800 shadow-sm">
                                <TabsTrigger value="PENDING" className="py-2 px-6 rounded-lg data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/20 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 gap-2 font-semibold">
                                    <Clock size={16} />
                                    Pending
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-current opacity-70">
                                        {stats.RETURNABLE_PENDING_COUNT}
                                    </span>
                                </TabsTrigger>
                                <TabsTrigger value="COMPLETED" className="py-2 px-6 rounded-lg data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/20 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 gap-2 font-semibold">
                                    <CheckCircle2 size={16} />
                                    Completed
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-current opacity-70">
                                        {stats.RETURNABLE_COMPLETED_COUNT}
                                    </span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="space-y-4">
                {/* Desktop View: Table */}
                <div className="hidden lg:block overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                                    <th className="px-4 py-4 border-b dark:border-slate-800">VR No</th>
                                    <th className="px-4 py-4 border-b dark:border-slate-800">Date</th>
                                    <th className="px-4 py-4 border-b dark:border-slate-800">Party Name</th>
                                    <th className="px-4 py-4 border-b dark:border-slate-800">Item Code</th>
                                    <th className="px-4 py-4 border-b dark:border-slate-800">Item Name</th>
                                    <th className="px-4 py-4 border-b dark:border-slate-800 text-center">Issued</th>
                                    <th className="px-4 py-4 border-b dark:border-slate-800 text-center">Received</th>
                                    <th className="px-4 py-4 border-b dark:border-slate-800 text-center">Unit</th>
                                    {mainTab === 'RETURNABLE' && (
                                        <th className="px-4 py-4 border-b dark:border-slate-800 text-center">Status</th>
                                    )}
                                    <th className="px-4 py-4 border-b dark:border-slate-800">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredData.length > 0 ? (
                                    filteredData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-indigo-950/10 transition-colors group">
                                            <td className="px-4 py-4 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                {item.VRNO}
                                            </td>
                                            <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">
                                                {new Date(item.VRDATE).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.PARTY_NAME}</span>
                                                    {item.MOBILE && <span className="text-[10px] text-slate-400">{item.MOBILE}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-xs font-mono text-slate-500">
                                                {item.ITEM_CODE}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px] block" title={item.ITEM_NAME}>
                                                    {item.ITEM_NAME}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">
                                                {item.QTYISSUED}
                                            </td>
                                            <td className="px-4 py-4 text-center text-sm font-bold">
                                                <span className={item.QTYRECEIVED > 0 ? 'text-emerald-500' : 'text-slate-300'}>
                                                    {item.QTYRECEIVED || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-400 uppercase">
                                                {item.UNIT}
                                            </td>
                                            {mainTab === 'RETURNABLE' && (
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ring-1 ${item.GATEPASS_STATUS === 'COMPLETED'
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800/40'
                                                        : 'bg-amber-50 text-amber-700 ring-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800/40'
                                                        }`}>
                                                        {item.GATEPASS_STATUS}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-4">
                                                <p className="text-xs text-slate-500 italic" title={item.REMARK}>
                                                    {item.REMARK || "-"}
                                                </p>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <EmptyState />
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile/Tablet View: Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                    {filteredData.length > 0 ? (
                        filteredData.map((item, idx) => (
                            <Card key={idx} className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden hover:ring-2 hover:ring-indigo-500/20 transition-all">
                                <CardContent className="p-0">
                                    <div className="p-5 space-y-4">
                                        {/* Top Header */}
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-3">
                                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-indigo-600">
                                                    <Box size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.ITEM_NAME}</h3>
                                                    <p className="text-[10px] font-mono text-slate-400">{item.ITEM_CODE}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${item.GATEPASS_STATUS === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {item.GATEPASS_STATUS}
                                            </span>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl">
                                            <div className="text-center border-r border-slate-200 dark:border-slate-700">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Qty Issued</p>
                                                <p className="text-lg font-black text-slate-900 dark:text-white">{item.QTYISSUED}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">{item.UNIT}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Received</p>
                                                <p className={`text-lg font-black ${item.QTYRECEIVED > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                    {item.QTYRECEIVED || 0}
                                                </p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">{item.UNIT}</p>
                                            </div>
                                        </div>

                                        {/* Info Rows */}
                                        <div className="space-y-3 px-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar size={14} />
                                                    <span>Date</span>
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(item.VRDATE).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Hash size={14} />
                                                    <span>VR Number</span>
                                                </div>
                                                <span className="font-mono font-bold text-indigo-600">{item.VRNO}</span>
                                            </div>
                                            <div className="flex items-start justify-between text-xs">
                                                <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                                                    <User size={14} />
                                                    <span>Party</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-slate-700 dark:text-slate-300">{item.PARTY_NAME}</p>
                                                    <p className="text-[10px] text-slate-400">{item.MOBILE}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remarks Section */}
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                <FileText size={12} />
                                                Remarks
                                            </p>
                                            <div className="p-3 bg-indigo-50/30 dark:bg-slate-800 rounded-xl">
                                                <p className="text-xs text-slate-500 italic leading-relaxed">
                                                    {item.REMARK || "No detailed remarks provided for this transaction."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full">
                            <EmptyState />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center mb-6 text-slate-200">
                <Search size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No records found</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto font-medium">
                Try adjusting your search criteria or switching tabs to find what you're looking for.
            </p>
        </div>
    );
}
