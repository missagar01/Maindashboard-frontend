import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import * as XLSX from "xlsx";
import {
  Search,
  Truck,
  Package,
  FileText,
  TrendingUp,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  Users,
} from "lucide-react";
import { getLrBiltyRegister } from "../../../api/transport/api";

type TransportLrBiltyRecord = Record<string, any>;

const categories = [
  {
    id: "transportation",
    title: "Transportation Reports",
    icon: Truck,
    count: 18,
    description: "Comprehensive insights into transportation operations, performance, and logistics efficiency.",
    color: "bg-[#0eb180]",
  },
  {
    id: "material",
    title: "Material Management Report",
    icon: Package,
    count: 3,
    description: "Detailed view of all material for financial tracking and analysis.",
    color: "bg-[#0eb180]",
  },
  {
    id: "payload",
    title: "PayLoader Reports",
    icon: FileText,
    count: 3,
    description: "Detailed insights into payload utilization and productivity through automated reporting.",
    color: "bg-[#7147e4]",
  },
  {
    id: "finance",
    title: "Finance Reports",
    icon: FileText,
    count: 4,
    description: "Quick access to all essential business performance reports in one place.",
    color: "bg-[#3372f1]",
  },
  {
    id: "operational",
    title: "Operational Margin Overview",
    icon: TrendingUp,
    count: 2,
    description: "Real-time insights into operational profitability across functions.",
    color: "bg-[#9061f9]",
  },
];

const reportsByCategory: Record<
  string,
  Array<{ id: string; title: string; description: string; icon?: any; color?: string }>
> = {
  transportation: [
    { id: "do-po", title: "DO/PO Register", description: "Maintain records of loading orders issued for dispatch and vehicle allotment.", icon: Package, color: "bg-indigo-500" },
    { id: "placement", title: "Placement Register", description: "Track and manage scheduled vehicle placements for streamlined logistics.", icon: Package, color: "bg-indigo-500" },
    { id: "master-lr", title: "Master LR Details Report", description: "Comprehensive record of all Lorry Receipts with full consignment data.", icon: Package, color: "bg-indigo-500" },
    { id: "lr-bilty", title: "LR Register", description: "Record and manage consignment details with accurate LR (Lorry Receipt) tracking.", icon: Package, color: "bg-indigo-500" },
    { id: "truck-diesel", title: "Truck Wise Diesel Summary Report", description: "Summarized diesel usage and expenses categorized by individual trucks.", icon: Package, color: "bg-indigo-500" },
    { id: "freight-advance", title: "Freight Advance Details", description: "Track advance payments issued against freight for trips and consignments.", icon: Package, color: "bg-indigo-500" },
    { id: "pump-diesel", title: "Pump Wise Diesel Details", description: "Breakdown of diesel consumption and costs per fuel pump.", icon: Package, color: "bg-indigo-500" },
    { id: "pod-register", title: "POD Register", description: "Consolidated register of received Proof of Delivery documents.", icon: Package, color: "bg-indigo-500" },
    { id: "freight-advice", title: "Freight Advice summary Report", description: "Concise overview of freight costs, charges, and shipment details for quick reference.", icon: Package, color: "bg-indigo-500" },
    { id: "service-bill", title: "Service Bill Summary", description: "Summarized view of vehicle service expenses and billing details.", icon: Package, color: "bg-indigo-500" },
    { id: "lr-pending-pod", title: "Lr Pending for POD Details", description: "Track undelivered Proof of Delivery documents for completed trips.", icon: Package, color: "bg-indigo-500" },
    { id: "lr-pending-freight", title: "LR Pending for Freight Advice Report", description: "Freight advice documents awaiting verification or approval.", icon: Package, color: "bg-indigo-500" },
    { id: "lr-pending-service", title: "LR Pending For Service Bill", description: "Track Lorry Receipts awaiting processing in service billing.", icon: Package, color: "bg-indigo-500" },
    { id: "statutory-expiry", title: "Vehicle Statutory Expiry Details", description: "Stay updated on upcoming expiries of essential vehicle documents.", icon: Package, color: "bg-indigo-500" },
    { id: "statutory-details", title: "Vehicle Statutory Details", description: "View complete compliance data for vehicle permits, insurance, and fitness.", icon: Package, color: "bg-indigo-500" },
    { id: "vehicle-handover", title: "Vehicle Handover Register", description: "Record details of vehicle handovers between drivers or departments.", icon: Package, color: "bg-indigo-500" },
    { id: "vehicle-takeover", title: "Vehicle Takeover Register", description: "Log vehicle takeovers for accountability and operational tracking.", icon: Package, color: "bg-indigo-500" },
    { id: "internal-transfer", title: "Internal Transfer", description: "Track and manage vehicle or goods movement within internal locations or branches.", icon: Package, color: "bg-indigo-500" },
  ],
  material: [
    { id: "scrap-pending", title: "Scrap Item Pending Report", description: "Scrap item pending for Received", icon: Package, color: "bg-emerald-500" },
    { id: "accessory-report", title: "Accessory Report", description: "Report related to accessory", icon: Package, color: "bg-emerald-500" },
    { id: "accessory-issued", title: "Accessories issued but not freighted", description: "Logs material or goods issued", icon: Package, color: "bg-indigo-500" },
  ],
  payload: [
    { id: "pl-reports", title: "PayLoader Reports", description: "Comprehensive reports tracking payload operations, performance, and efficiency for better monitoring and decision-making.", icon: Package, color: "bg-indigo-500" },
    { id: "pl-shift-change", title: "Equipment Shift Change Reports", description: "Detailed insights into equipment shift changes, including timelines, responsible personnel, and affected assets.", icon: Package, color: "bg-indigo-500" },
    { id: "pl-diesel-browser", title: "Diesel Browser Register Report", description: "Logs for diesel expenditures", icon: Package, color: "bg-indigo-500" },
  ],
  finance: [
    { id: "day-book", title: "Day Book Report", description: "Stay updated with daily cash flow and transactional snapshots.", icon: FileText, color: "bg-blue-500" },
    { id: "account-ledger", title: "Account Ledger", description: "Real-time view of all financial movements across your accounts.", icon: Users, color: "bg-emerald-500" },
    { id: "receivable-payable", title: "Receivable/Payable Report", description: "Comprehensive overview of all receivables and payables.", icon: Truck, color: "bg-pink-500" },
    { id: "statutory-compliance", title: "Statutory Compliance Report Page", description: "Track pending documents with smart due-date visibility.", icon: FileText, color: "bg-indigo-500" },
  ],
  operational: [
    { id: "lr-margin", title: "Lr Wise Margin Report", description: "Detailed margin analysis based on individual LR entries.", icon: Truck, color: "bg-blue-500" },
    { id: "vehicle-margin", title: "Vehicle Wise Margin Report", description: "Profitability breakdown by vehicle for cost and revenue insights.", icon: Package, color: "bg-emerald-500" },
  ],
};

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function TransportReports() {
  const navigate = useNavigate();
  const [viewStep, setViewStep] = useState(2);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("transportation");
  const [selectedReport, setSelectedReport] = useState<string | null>("lr-bilty");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<TransportLrBiltyRecord[]>([]);

  // Infinite Scroll States
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Filters for Report View
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2026-04-30");
  const [tableSearch, setTableSearch] = useState("");

  const fetchData = async (reportId: string | null, pageNumber = 1, append = false) => {
    if (reportId !== "lr-bilty") {
      setRecords([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    if (append) setIsFetchingMore(true);
    else setLoading(true);

    setError(null);
    try {
      const data = await getLrBiltyRegister({
        page: pageNumber,
        limit: 30,
        startDate,
        endDate
      });

      const newRecords = data.records;
      setRecords(prev => append ? [...prev, ...newRecords] : newRecords);
      setTotalCount(data.count || 0);
      setHasMore(newRecords.length >= 30);
    } catch (err: any) {
      setError(err.message || "Failed to fetch report data");
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchData("lr-bilty", 1, false);
  }, []);

  const handleApplyFilter = () => {
    setPage(1);
    fetchData(selectedReport, 1, false);
  };

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || isFetchingMore || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(prev => {
          const next = prev + 1;
          fetchData(selectedReport, next, true);
          return next;
        });
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading, isFetchingMore, hasMore, selectedReport]);

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setViewStep(1);
  };

  const handleReportClick = (reportId: string) => {
    setSelectedReport(reportId);
    setPage(1);
    fetchData(reportId, 1, false);
    setViewStep(2);
  };

  const handleBack = () => {
    if (viewStep === 2) {
      setViewStep(0);
    } else if (viewStep === 1) {
      setViewStep(0);
      setSelectedCategory(null);
    } else {
      navigate("/transport/dashboard");
    }
  };

  // Excel Export Logic
  const handleExportExcel = () => {
    if (records.length === 0) return;

    const exportData = records.map((r, i) => ({
      "S.No": i + 1,
      "LR Code": r.lr_bilty_code || "",
      "Manual LR": r.manual_lr_no || "",
      "Date": r.lr_bilty_date ? shortDateFormatter.format(new Date(r.lr_bilty_date)) : "",
      "Consignor": r.consignor_name || "",
      "Consignee": r.consignee_name || "",
      "From": r.source_name || "",
      "To": r.destination_name || "",
      "Vehicle No": r.vehicle_no || "",
      "Item": r.item_name || "",
      "Quantity": r.lr_bilty_qty || 0,
      "Unit": r.measuring_unit_name || "",
      "Status": (r.lr_bilty_status || r.status || "PENDING")?.split('_').pop()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LR Register");
    XLSX.writeFile(wb, `LR_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredCategories = categories.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentCategory = categories.find((c) => c.id === selectedCategory);
  const currentReports = selectedCategory ? reportsByCategory[selectedCategory] || [] : [];
  const currentReportObj = currentReports.find((r) => r.id === selectedReport);

  const tableData = useMemo(() => {
    let filtered = records;

    // Local filtering (Search)
    if (!tableSearch) return filtered;
    return filtered.filter((r) =>
      Object.values(r).some((val) =>
        String(val).toLowerCase().includes(tableSearch.toLowerCase())
      )
    );
  }, [records, tableSearch]);

  const stats = useMemo(() => {
    const loadedQty = tableData.reduce((sum, r) => sum + (parseFloat(r.lr_bilty_qty) || 0), 0);
    const uniqueVehicles = new Set(tableData.map((r) => r.vehicle_no)).size;
    return {
      totalRecords: totalCount || tableData.length,
      totalQty: loadedQty,
      uniqueVehicles: uniqueVehicles,
    };
  }, [tableData, totalCount]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header Filter / Search Area */}
      <div className="bg-white px-4 py-4 sm:px-6 border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 active:scale-95"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-black text-slate-900 leading-tight">
                  {viewStep === 0
                    ? "Transport Reports"
                    : viewStep === 1
                      ? currentCategory?.title
                      : currentReportObj?.title}
                </h1>
                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.15em]">
                  {viewStep === 0 ? "Fleet Intelligence Hub" : `Reports / ${currentCategory?.title}`}
                </p>
              </div>
            </div>
            {viewStep === 2 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyFilter}
                  className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95 shadow-sm"
                  title="Reload Data"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            )}
          </div>

          {viewStep === 0 && (
            <div className="relative group w-full">
              <input
                type="text"
                placeholder="Search across reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/50"
              />
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
          )}
        </div>
      </div>

      <div className="p-0 sm:p-5">
        {/* Step 0: Category Grid */}
        {viewStep === 0 && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="group relative bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-2xl hover:translate-y-[-4px] transition-all duration-500 cursor-pointer overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className={`${category.color} p-4 rounded-2xl text-white shadow-xl shadow-black/5 group-hover:scale-110 transition-transform duration-500`}>
                    <category.icon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest bg-indigo-500/10 text-indigo-600 px-4 py-1.5 rounded-full border border-indigo-100">
                    <span>{category.count} Files</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">{category.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium opacity-80">
                  {category.description}
                </p>
                <div className="absolute bottom-0 left-0 h-1.5 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Report List Grid */}
        {viewStep === 1 && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentReports.map((report) => {
              const Icon = report.icon || Package;
              return (
                <div
                  key={report.id}
                  onClick={() => handleReportClick(report.id)}
                  className="bg-white border border-slate-200 rounded-[28px] p-5 flex items-center gap-5 shadow-sm hover:shadow-xl hover:bg-white hover:border-indigo-100 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className={`${report.color || 'bg-[#4f46e5]'} p-3.5 rounded-2xl text-white shadow-lg shadow-black/5 group-hover:rotate-6 transition-transform`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-base text-slate-800 truncate group-hover:text-indigo-600">
                      {report.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-black uppercase tracking-widest truncate opacity-80">
                      Standard Module Report
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 2: Specific Report View */}
        {viewStep === 2 && (
          <div className="space-y-0 sm:space-y-5">
            {/* Filter Section - Full Width on Mobile */}
            <div className="bg-white sm:rounded-[32px] p-4 sm:p-6 border-b sm:border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="grid grid-cols-2 sm:flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl group focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                    <div className="flex flex-col">
                      <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Start Date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-[11px] sm:text-sm font-black text-slate-900 focus:outline-none p-0 cursor-pointer w-full"
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl group focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">End Date</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-[11px] sm:text-sm font-black text-slate-900 focus:outline-none p-0 cursor-pointer w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setStartDate("2026-04-01");
                      setEndDate("2026-04-30");
                    }}
                    className="flex-1 sm:flex-none px-6 py-3.5 text-slate-600 font-bold text-xs hover:bg-slate-50 rounded-2xl transition-all border border-slate-100 active:scale-95"
                  >
                    Clear Filter
                  </button>
                  <button
                    onClick={handleApplyFilter}
                    className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-8 py-3.5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/20 active:scale-95 transition-all"
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area - Full Width on Mobile */}
            <div className="p-0 sm:p-0 space-y-4">
              {/* Metrics Grid */}
              <div className="px-4 sm:px-0 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Records', val: stats.totalRecords, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: FileText },
                  { label: 'Total Weight', val: numberFormatter.format(stats.totalQty), sub: 'MT', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Package },
                  { label: 'Vehicles', val: stats.uniqueVehicles, color: 'text-amber-600', bg: 'bg-amber-50', icon: Truck },
                  { label: 'Efficiency', val: tableData.length > 0 ? (stats.totalQty / tableData.length).toFixed(2) : 0, color: 'text-rose-600', bg: 'bg-rose-50', icon: TrendingUp }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 sm:mb-2">{stat.label}</p>
                    <div className="flex items-baseline gap-1">
                      <p className={`text-xl sm:text-2xl font-black ${stat.color}`}>{stat.val}</p>
                      {stat.sub && <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 lowercase">{stat.sub}</span>}
                    </div>
                    <stat.icon className={`absolute -right-2 -bottom-2 h-16 w-16 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 ${stat.color}`} />
                  </div>
                ))}
              </div>

              {/* Table Search & Export */}
              <div className="px-4 sm:px-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search visible records..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[20px] text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleExportExcel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3.5 bg-emerald-600 text-white rounded-[20px] text-sm font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/10 active:scale-95"
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </button>
                </div>
              </div>

              {/* Data Container - Full width mobile */}
              <div className="bg-white sm:border border-slate-200 sm:rounded-[40px] overflow-hidden shadow-sm">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 whitespace-nowrap">
                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 w-16 text-center">#</th>
                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">ID / Reference</th>
                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Date Info</th>
                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Parties Involved</th>
                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Logistics Route</th>
                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Equipment</th>
                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Net Wt.</th>
                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Lifecycle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading && page === 1 ? (
                        <tr>
                          <td colSpan={8} className="py-32 text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto" />
                            <p className="text-sm font-black text-slate-400 mt-6 uppercase tracking-[0.3em]">Synchronizing Registry</p>
                          </td>
                        </tr>
                      ) : tableData.length > 0 ? (
                        <>
                          {tableData.map((record, idx) => (
                            <tr key={record.id || record.lr_bilty_id || idx} className="hover:bg-slate-50/50 transition-all group cursor-default">
                              <td className="px-8 py-5 text-center">
                                <span className="text-[11px] font-black text-slate-300 group-hover:text-indigo-400">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                                    {record.lr_bilty_code || "N/A"}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-wider">
                                    REF No: {record.manual_lr_no || "PE-000"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Calendar className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm font-black text-slate-700">
                                    {record.lr_bilty_date ? shortDateFormatter.format(new Date(record.lr_bilty_date)) : "N/A"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                    <span className="text-[12px] font-black text-slate-600 uppercase">
                                      {record.consignor_name || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                    <span className="text-[11px] font-bold text-indigo-400 uppercase">
                                      {record.consignee_name || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-2 font-black text-[12px] text-slate-800">
                                  <span className="uppercase">{record.source_name || "Point A"}</span>
                                  <div className="h-px w-4 bg-slate-200" />
                                  <span className="uppercase text-indigo-500">{record.destination_name || "Point B"}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col">
                                  <span className="text-[12px] font-black text-slate-700">{record.vehicle_no || "No Data"}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{record.item_name || "Misc Material"}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="text-base font-black text-slate-900 tabular-nums">
                                    {record.lr_bilty_qty ? numberFormatter.format(parseFloat(record.lr_bilty_qty)) : "0.00"}
                                  </span>
                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{record.measuring_unit_name || 'MT'}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-center">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${record.lr_bilty_status === 'LR_BILTY_PREPARED' || record.status === 'DONE'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : 'bg-amber-50 text-amber-600 border-amber-100'
                                  }`}>
                                  {(record.lr_bilty_status || record.status || 'PROCESSED')?.split('_').pop()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-8 py-24 text-center">
                            <FileText className="h-16 w-16 text-slate-100 mx-auto mb-6" />
                            <p className="text-base font-black text-slate-400 uppercase tracking-widest">No Records Found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Layout - Full Width & Premium */}
                <div className="lg:hidden">
                  {loading && page === 1 ? (
                    <div className="py-32 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
                    </div>
                  ) : tableData.length > 0 ? (
                    <div className="flex flex-col divide-y divide-slate-100">
                      {tableData.map((record, idx) => (
                        <div key={record.id || record.lr_bilty_id || idx} className="bg-white p-6 active:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-4">
                              <div className="h-11 w-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-slate-900/10">
                                {idx + 1}
                              </div>
                              <div>
                                <h4 className="font-black text-base text-slate-900">{record.lr_bilty_code || "N/A"}</h4>
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Ref: {record.manual_lr_no || "N/A"}</p>
                              </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${record.lr_bilty_status === 'LR_BILTY_PREPARED' || record.status === 'DONE'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                              {(record.lr_bilty_status || record.status || 'PENDING')?.split('_').pop()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-y-6 mt-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parties</p>
                              <p className="text-[12px] font-black text-slate-800 leading-tight uppercase">{record.consignor_name || 'N/A'}</p>
                              <p className="text-[11px] font-bold text-indigo-500 leading-tight border-l-2 border-indigo-100 pl-2 mt-1 uppercase italic">{record.consignee_name || 'N/A'}</p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route Analysis</p>
                              <p className="text-[12px] font-black text-slate-900 uppercase">
                                {record.source_name || "A"} <span className="inline-block px-1 text-slate-300">→</span> <span className="text-indigo-500">{record.destination_name || "B"}</span>
                              </p>
                              <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase italic">Dispatch Mode</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fleet & Load</p>
                              <p className="text-[12px] font-bold text-slate-800 uppercase tracking-tight">{record.item_name || 'Material'}</p>
                              <div className="inline-flex items-center gap-1.5 mt-1 bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-amber-100">
                                <Truck className="h-3 w-3" />
                                {record.vehicle_no || 'VEH-000'}
                              </div>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Quantity</p>
                              <p className="text-xl font-black text-slate-900 leading-none">
                                {record.lr_bilty_qty ? numberFormatter.format(parseFloat(record.lr_bilty_qty)) : "0.00"}
                              </p>
                              <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mt-1 inline-block bg-indigo-50 px-2 py-0.5 rounded-md">{record.measuring_unit_name || 'MT'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-32 text-center bg-slate-50/50">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Zero Records Found</p>
                    </div>
                  )}
                </div>

                {/* Infinite Scroll Trigger & Loader */}
                <div ref={lastElementRef} className="py-12 flex flex-col items-center justify-center bg-slate-50/30">
                  {isFetchingMore ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-2 w-2 bg-indigo-500 rounded-full" />
                        </div>
                      </div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Syncing Next Batch</p>
                    </div>
                  ) : hasMore ? (
                    <div className="flex items-center gap-4 text-slate-300">
                      <div className="h-px w-12 bg-slate-200" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Scroll to Discover</p>
                      <div className="h-px w-12 bg-slate-200" />
                    </div>
                  ) : records.length > 0 ? (
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center">
                        <Package className="h-5 w-5 text-slate-300" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Inventory Exhausted</p>
                    </div>
                  ) : null}
                </div>

                {/* Footer Status Bar */}
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Displaying {records.length} <span className="text-white">/</span> {totalCount} Entities
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-px bg-slate-700" />
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                      REGISTRY STRETCH <span className="text-white ml-2">P-0{page}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
