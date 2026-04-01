import { useEffect, useState, useMemo } from "react";
import { storeApi } from "@/api/store/storeSystemApi";
import {
    Package,
    Search,
    Calendar,
    User,
    ClipboardList,
    Loader2,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import Heading from "../../components/element/Heading";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { compareCurrentMonthFirstDesc, parseStoreDateValue } from "./currentMonthSort";

// Custom style to show calendar picker icon (required for iframe compatibility)
const dateInputStyle = `
  input[type="date"]::-webkit-calendar-picker-indicator {
    display: block !important;
    opacity: 1 !important;
    cursor: pointer !important;
    width: 20px !important;
    height: 20px !important;
  }
`;

type StoreIssueData = {
    VRNO: string;
    VRDATE: string;
    REQUESTER: string;
    DIVISION: string;
    DEPARTMENT: string;
    ITEM_CODE: string;
    ITEM_NAME: string;
    QTYISSUED: number;
    PURPOSE: string;
};

const ITEMS_PER_PAGE = 50;

const StoreIssue = () => {
    const [issues, setIssues] = useState<StoreIssueData[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtering States
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedDivision, setSelectedDivision] = useState<string>("all");
    const [selectedDept, setSelectedDept] = useState<string>("all");
    const [selectedRequester, setSelectedRequester] = useState<string>("all");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    // Per-Column Search States
    const [colSearch, setColSearch] = useState({
        vrno: "",
        itemName: "",
        itemCode: ""
    });

    const [currentPage, setCurrentPage] = useState(1);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const fetchIssues = async () => {
            try {
                setLoading(true);
                const res: any = await storeApi.getStoreIssue();
                if (res.success) {
                    setIssues(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch store issues", err);
            } finally {
                setLoading(false);
            }
        };

        fetchIssues();
    }, []);

    // Extract unique values for dropdowns
    const divisions = useMemo(() => {
        const unique = new Set(issues.map(i => i.DIVISION).filter(Boolean));
        return ["all", ...Array.from(unique)].sort();
    }, [issues]);

    const departments = useMemo(() => {
        const unique = new Set(issues.map(i => i.DEPARTMENT).filter(Boolean));
        return ["all", ...Array.from(unique)].sort();
    }, [issues]);

    const requesters = useMemo(() => {
        const unique = new Set(issues.map(i => i.REQUESTER).filter(Boolean));
        return ["all", ...Array.from(unique)].sort();
    }, [issues]);

    // Combined filtering logic
    const filteredIssues = useMemo(() => {
        return issues.filter((issue) => {
            // Text Search
            const term = debouncedSearch.toLowerCase();
            const matchesSearch = !term ||
                issue.VRNO?.toLowerCase().includes(term) ||
                issue.REQUESTER?.toLowerCase().includes(term) ||
                issue.ITEM_NAME?.toLowerCase().includes(term) ||
                issue.ITEM_CODE?.toLowerCase().includes(term) ||
                issue.DEPARTMENT?.toLowerCase().includes(term) ||
                issue.PURPOSE?.toLowerCase().includes(term);

            // Per Column Search
            const matchesVrnoCol = !colSearch.vrno || issue.VRNO?.toLowerCase().includes(colSearch.vrno.toLowerCase());
            const matchesItemCol = !colSearch.itemName || issue.ITEM_NAME?.toLowerCase().includes(colSearch.itemName.toLowerCase());
            const matchesCodeCol = !colSearch.itemCode || issue.ITEM_CODE?.toLowerCase().includes(colSearch.itemCode.toLowerCase());

            // Dropdown: Division
            const matchesDivision = selectedDivision === "all" || issue.DIVISION === selectedDivision;

            // Dropdown: Department
            const matchesDept = selectedDept === "all" || issue.DEPARTMENT === selectedDept;

            // Dropdown: Requester
            const matchesRequester = selectedRequester === "all" || issue.REQUESTER === selectedRequester;

            // Date Range
            let matchesDate = true;
            if (issue.VRDATE) {
                const issueDate = parseStoreDateValue(issue.VRDATE);
                if (fromDate) {
                    const start = new Date(fromDate);
                    start.setHours(0, 0, 0, 0);
                    if (issueDate && issueDate < start) matchesDate = false;
                }
                if (toDate) {
                    const end = new Date(toDate);
                    end.setHours(23, 59, 59, 999);
                    if (issueDate && issueDate > end) matchesDate = false;
                }
            }

            return matchesSearch && matchesDivision && matchesDept && matchesRequester && matchesDate && matchesVrnoCol && matchesItemCol && matchesCodeCol;
        }).sort((a, b) => compareCurrentMonthFirstDesc(a.VRDATE, b.VRDATE));
    }, [issues, debouncedSearch, selectedDivision, selectedDept, selectedRequester, fromDate, toDate, colSearch]);

    // Paginate results
    const paginatedIssues = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredIssues.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredIssues, currentPage]);

    const totalPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        const date = parseStoreDateValue(dateStr);
        if (!date) return "—";
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const resetFilters = () => {
        setSearchTerm("");
        setSelectedDivision("all");
        setSelectedDept("all");
        setSelectedRequester("all");
        setFromDate("");
        setToDate("");
        setColSearch({ vrno: "", itemName: "", itemCode: "" });
        setCurrentPage(1);
    };

    return (
        <div className="w-full p-4 md:p-2 lg:p-0 space-y-6">
            <style>{dateInputStyle}</style>
            <Heading
                heading="Store Issue"
                subtext="View material issue transactions (MS)"
            >
                <Package size={48} className="text-indigo-600" />
            </Heading>

            {/* ADVANCED FILTER BAR */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-none dark:border dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-visible">
                <CardContent className="p-1">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* Search */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Universal Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <Input
                                    placeholder="Search all fields..."
                                    className="pl-9 h-10 rounded-xl border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Division Dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Division</label>
                            <select
                                className="w-full h-10 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedDivision}
                                onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
                            >
                                {divisions.map(div => (
                                    <option key={div} value={div}>{div === "all" ? "All Divisions" : div}</option>
                                ))}
                            </select>
                        </div>

                        {/* Department Dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Department</label>
                            <select
                                className="w-full h-10 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedDept}
                                onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
                            >
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept === "all" ? "All Departments" : dept}</option>
                                ))}
                            </select>
                        </div>

                        {/* Requester Dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Requester</label>
                            <select
                                className="w-full h-10 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedRequester}
                                onChange={(e) => { setSelectedRequester(e.target.value); setCurrentPage(1); }}
                            >
                                {requesters.map(req => (
                                    <option key={req} value={req}>{req === "all" ? "All Requesters" : req}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">From Date</label>
                            <Input
                                type="date"
                                className="h-10 rounded-xl border-slate-200 text-xs cursor-pointer"
                                value={fromDate}
                                onClick={(e) => {
                                    try {
                                        e.currentTarget.showPicker?.();
                                    } catch (err) {
                                        console.warn("showPicker() restricted:", err);
                                    }
                                }}
                                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">To Date</label>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    className="h-10 rounded-xl border-slate-200 text-xs flex-1 cursor-pointer"
                                    value={toDate}
                                    onClick={(e) => {
                                        try {
                                            e.currentTarget.showPicker?.();
                                        } catch (err) {
                                            console.warn("showPicker() restricted:", err);
                                        }
                                    }}
                                    onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-10 px-3 rounded-xl border-slate-200 text-indigo-600 hover:bg-indigo-50"
                                    onClick={resetFilters}
                                    title="Reset All Filters"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between px-2">
                <div className="text-sm font-bold text-slate-500">
                    Showing <span className="text-indigo-600">{filteredIssues.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredIssues.length)}</span> of <span className="text-slate-900 dark:text-white">{filteredIssues.length}</span> results
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-slate-200"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">
                            Page {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-slate-200"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                )}
            </div>

            <Card className="border-0 shadow-xl shadow-slate-200/40 dark:shadow-none dark:border dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <CardContent className="p-0">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest whitespace-nowrap min-w-[150px]">
                                        VRNO
                                        {/* <Input
                                            placeholder="Filter..."
                                            className="h-7 mt-2 text-[10px] px-2 rounded-lg font-medium"
                                            value={colSearch.vrno}
                                            onChange={(e) => setColSearch(prev => ({ ...prev, vrno: e.target.value }))}
                                        /> */}
                                    </th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest whitespace-nowrap text-center">Issue Date</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest whitespace-nowrap">Division</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest whitespace-nowrap">Department</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest whitespace-nowrap">Requester</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-center whitespace-nowrap">
                                        Item Code
                                        {/* <Input
                                            placeholder="..."
                                            className="h-7 mt-2 text-[10px] px-2 rounded-lg font-medium"
                                            value={colSearch.itemCode}
                                            onChange={(e) => setColSearch(prev => ({ ...prev, itemCode: e.target.value }))}
                                        /> */}
                                    </th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest whitespace-nowrap min-w-[200px]">
                                        Item Name
                                        {/* <Input
                                            placeholder="Search items..."
                                            className="h-7 mt-2 text-[10px] px-2 rounded-lg font-medium"
                                            value={colSearch.itemName}
                                            onChange={(e) => setColSearch(prev => ({ ...prev, itemName: e.target.value }))}
                                        /> */}
                                    </th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-center">Qty</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Purpose</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="animate-spin text-indigo-600" size={40} />
                                                <span className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">Synchronizing...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedIssues.length > 0 ? (
                                    paginatedIssues.map((issue, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-indigo-900/10 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{issue.VRNO}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold text-[10px]">
                                                    <Calendar size={12} className="text-indigo-500/50" />
                                                    {formatDate(issue.VRDATE)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {issue.DIVISION}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-xs truncate max-w-[150px]">
                                                    <ClipboardList size={12} className="text-slate-400 shrink-0" />
                                                    {issue.DEPARTMENT}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold text-xs">
                                                    <User size={12} className="text-slate-400 shrink-0" />
                                                    {issue.REQUESTER}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className="text-[10px] font-black text-indigo-500 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/20">
                                                    {issue.ITEM_CODE}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs line-clamp-1 truncate">{issue.ITEM_NAME}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <span className="text-sm font-black text-slate-900 dark:text-white">{issue.QTYISSUED}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Units</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 italic max-w-[200px] line-clamp-2">
                                                    {issue.PURPOSE || "No purpose specified"}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <Search size={40} className="text-slate-400" />
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">No matching records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* LOWER PAGINATION */}
            {totalPages > 1 && (
                <div className="flex justify-center pt-2">
                    <nav className="flex items-center gap-1 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 rounded-xl"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="-mr-2" size={16} /><ChevronLeft size={16} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-xl px-3 font-bold text-xs"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Prev
                        </Button>

                        <div className="flex items-center px-4">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                Page <span className="text-indigo-600">{currentPage}</span> of {totalPages}
                            </span>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-xl px-3 font-bold text-xs"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 rounded-xl"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight size={16} /><ChevronRight className="-ml-2" size={16} />
                        </Button>
                    </nav>
                </div>
            )}
        </div>
    );
};

export default StoreIssue;
