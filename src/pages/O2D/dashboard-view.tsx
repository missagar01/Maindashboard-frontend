"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { AlertCircle, Filter, Loader2, RefreshCw, X, Trophy, Database, User, Percent, Truck, Target, TrendingUp, ArrowUpRight, Activity, Quote, MessageSquare, Star } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "../../context/AuthContext"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { ChartContainer, ChartTooltip } from "./ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { cn } from "../../lib/utils"
import { o2dAPI } from "../../services/o2dAPI";
import { Input } from "./ui/input"
import { endOfMonth, startOfMonth, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
type DashboardRow = {
  indate?: string | null
  outdate?: string | null
  gateOutTime?: string | null
  orderVrno?: string | null
  gateVrno?: string | null
  wslipno?: string | null
  salesPerson?: string | null
  partyName?: string | null
  itemName?: string | null
  invoiceNo?: string | null
  stateName?: string | null
}

type DashboardSummary = {
  monthlyStats?: Array<{ SALES_PERSON: string; MONTHLY_WORKING_PARTY: number; MONTHLY_PARTY_AVERAGE: string }>
  monthlyWorkingParty?: number // Keep optional for safety
  monthlyPartyAverage?: string // Keep optional for safety
  pendingStats?: Array<{ SALES_PERSON: string; TOTAL: number; CONVERSION_RATIO: string }>
  pendingOrdersTotal?: number
  conversionRatio?: string
  gdStats?: Array<{ SALES_PERSON: string; MONTHLY_GD: number; DAILY_GD: number; MONTHLY_QTY: number; DAILY_QTY: number }>
  monthlyGd?: number
  dailyGd?: number
  saudaAvg?: Array<{ ITEM: string; AVERAGE: number }>
  allSaudaAvg?: Array<{ SALES_PERSON: string; ITEM: string; AVERAGE: number }>
  salesAvg?: Array<{ SALES_PERSON: string; ITEM: string; AVERAGE: number }>
  saudaRate2026?: number
}

type DashboardFilters = {
  parties?: string[]
  items?: string[]
  salesPersons?: string[]
  states?: string[]
}

type DashboardResponse = {
  summary?: DashboardSummary
  filters?: DashboardFilters
  rows?: DashboardRow[]
  lastUpdated?: string
  appliedFilters?: Record<string, string | null>
}

// Using o2dAPI service instead of direct fetch

function DatePicker({
  date,
  setDate,
  label
}: {
  date: string;
  setDate: (date: string) => void;
  label: string
}) {
  const selectedDate = date ? new Date(date) : undefined;

  return (
    <div className="space-y-1 sm:space-y-2">
      <label className="text-[10px] sm:text-sm font-bold text-slate-600 uppercase tracking-wider">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-medium bg-white border-indigo-200 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all h-8 sm:h-10 px-2 sm:px-4 text-[10px] sm:text-sm shadow-sm",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4 text-indigo-500" />
            {date ? format(selectedDate!, "MMM d, yyyy") : <span className="text-[10px] sm:text-xs">Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white border border-slate-200 shadow-lg rounded-lg" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
            initialFocus
            className="rounded-md border-none bg-white"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DashboardView() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [selectedParty, setSelectedParty] = useState("All Parties")
  const [selectedItem, setSelectedItem] = useState("All Items")
  const [selectedSales, setSelectedSales] = useState("All Salespersons")
  const [selectedState, setSelectedState] = useState("All States")
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"))

  // Custom Date Filters
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  )
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  )

  const [enquiryReport, setEnquiryReport] = useState<any[]>([])
  const [loadingEnquiry, setLoadingEnquiry] = useState(false)

  const [customerFeedback, setCustomerFeedback] = useState<any[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [feedbackStats, setFeedbackStats] = useState<any[]>([])

  const dashboardRef = useRef<HTMLDivElement | null>(null)

  // New Stats State
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [followupStats, setFollowupStats] = useState({ totalFollowUps: 0, ordersBooked: 0 })
  const [salesPerformance, setSalesPerformance] = useState<any[]>([])
  const [dailySalesPerformance, setDailySalesPerformance] = useState<any[]>([]) // New state for daily stats
  const [deliveryStats, setDeliveryStats] = useState<{ monthly: any; daily: any } | null>(null)
  const [salespersonDeliveryStats, setSalespersonDeliveryStats] = useState<Record<string, any>>({})

  const fetchEnquiryReport = async () => {
    setLoadingEnquiry(true)
    try {
      const response = await o2dAPI.getCurrentMonthEnquiryReport(selectedMonth)
      if (response.data?.success) {
        setEnquiryReport(response.data.data)
      }
    } catch (err) {
      console.error("Error fetching enquiry report:", err)
    } finally {
      setLoadingEnquiry(false)
    }
  }

  const fetchCustomerFeedback = async () => {
    setLoadingFeedback(true);

    try {
      const response = await o2dAPI.getCustomerFeedback({ sheetName: "Form Responses 1" });
      const payload = response?.data;

      if (!payload?.success || !Array.isArray(payload.data)) {
        throw new Error(payload?.error || payload?.message || "Invalid feedback response");
      }

      const rows = payload.data.slice(1); // Skip headers row
      console.log("Sync success. Records loaded:", rows.length);

      if (rows.length === 0) {
        setFeedbackStats([]);
        setCustomerFeedback([]);
        return;
      }

      // Map column headers from your sheet (G to N)
      const categoryNames = ["Enquiry", "Loading", "Dispatch", "Lineup", "Comm.", "Product", "Staff", "Quality"];
      const categorySums = new Array(8).fill(0);
      const categoryCounts = new Array(8).fill(0);

      const formattedData = rows.map((row: any[]) => {
        // Average ratings from indices 6 to 13 (Columns G to N)
        const ratingCols = row.slice(6, 14);
        ratingCols.forEach((val, idx) => {
          const numericVal = typeof val === "number" ? val : Number(val);
          if (Number.isFinite(numericVal)) {
            categorySums[idx] += numericVal;
            categoryCounts[idx]++;
          }
        });

        const validRatings = ratingCols
          .map((v) => (typeof v === "number" ? v : Number(v)))
          .filter((v) => Number.isFinite(v));
        const avg = validRatings.length > 0
          ? Math.round(validRatings.reduce((a, b) => a + b, 0) / validRatings.length)
          : 5;

        // Clean up names and feedback
        const customerName = typeof row[3] === "string" ? row[3].trim() : "Valued Customer";
        const firmName = typeof row[4] === "string" ? row[4].trim() : "Partner Firm";
        const rawFeedback = row[14];
        const feedback = (typeof rawFeedback === "string" && rawFeedback.trim())
          ? rawFeedback.trim()
          : (typeof rawFeedback === "number" ? `Rating: ${rawFeedback}` : "Quality product and professional service.");

        // Store individual category ratings
        const categoryRatings: Record<string, number> = {};
        categoryNames.forEach((name, idx) => {
          const val = ratingCols[idx];
          const numericVal = typeof val === "number" ? val : Number(val);
          categoryRatings[name] = Number.isFinite(numericVal) ? numericVal : 0;
        });

        return {
          timestamp: row[1],
          email: row[2],
          customer_name: customerName || "Valued Customer",
          firm_name: firmName || "Partner Firm",
          contact: row[5] != null ? String(row[5]).trim() : "",
          additional_feedback: feedback,
          rating: avg,
          categoryRatings,
          status: avg >= 4 ? "Positive" : avg >= 3 ? "Neutral" : "Negative"
        };
      });

      const stats = categoryNames.map((name, i) => ({
        name,
        score: categoryCounts[i] > 0 ? (categorySums[i] / categoryCounts[i]).toFixed(1) : "5.0"
      }));

      setFeedbackStats(stats);
      setCustomerFeedback(formattedData);
    } catch (err: any) {
      console.error("Feedback Fetch Failure:", err.message);
      // Let the UI show "No Records Found" with retry option
      setCustomerFeedback([]);
      setFeedbackStats([]);
    } finally {
      setLoadingFeedback(false)
    }
  }

  const fetchAdditionalStats = async () => {
    // 1. Fetch Client Count (Independent of date filter)
    try {
      const countRes = await o2dAPI.getClientCount()
      if (countRes.data?.success) {
        setTotalCustomers(countRes.data.data)
      }
    } catch (err) {
      console.error("Error fetching client count:", err)
    }

    // 2. Fetch Sales/Followup Stats (Dependent on date range and salesperson)
    try {
      const params: any = {
        startDate,
        endDate
      }

      // Daily params (Today only)
      const today = format(new Date(), "yyyy-MM-dd");
      const dailyParams: any = {
        startDate: today,
        endDate: today
      };

      // Add salesPerson filter if selected
      if (selectedSales !== "All Salespersons") {
        params.salesPerson = selectedSales
        dailyParams.salesPerson = selectedSales;
      }

      const [statsRes, perfRes, dailyPerfRes, deliveryRes, salespersonStatsRes] = await Promise.all([
        o2dAPI.getFollowupStats(), // No params = Global Total
        o2dAPI.getSalesPerformance(params), // Respects filter (Selected Month)
        o2dAPI.getSalesPerformance(dailyParams), // Today's Stats
        o2dAPI.getDeliveryStats(params), // Respects filter (now includes salesPerson)
        o2dAPI.getSalespersonDeliveryStats({ startDate, endDate }) // Get all salesperson stats
      ])

      if (statsRes.data?.success) setFollowupStats(statsRes.data.data)
      if (perfRes.data?.success) setSalesPerformance(perfRes.data.data)
      if (dailyPerfRes.data?.success) setDailySalesPerformance(dailyPerfRes.data.data)
      if (deliveryRes.data?.success) {
        setDeliveryStats(deliveryRes.data.data);
      }
      if (salespersonStatsRes.data?.success) {
        setSalespersonDeliveryStats(salespersonStatsRes.data.data);
      }

    } catch (err) {
      console.error("Error fetching sales/followup stats:", err)
    }
  }

  // Update dates when selectedMonth changes
  useEffect(() => {
    if (selectedMonth === "All Months") {
      setStartDate("2024-01-01")
      setEndDate(format(new Date(), "yyyy-MM-dd"))
    } else if (selectedMonth !== "Custom Range") {
      const [year, month] = selectedMonth.split("-")
      const fromDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const toDate = endOfMonth(fromDate)
      setStartDate(format(fromDate, "yyyy-MM-dd"))
      setEndDate(format(toDate, "yyyy-MM-dd"))
    }
  }, [selectedMonth])

  useEffect(() => {
    // Fetch stats when dates or salesperson filter change
    fetchAdditionalStats()
  }, [startDate, endDate, selectedSales])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Build query params for proper Redis caching
      const params: any = {}
      if (selectedParty !== "All Parties") params.partyName = selectedParty
      if (selectedItem !== "All Items") params.itemName = selectedItem
      if (selectedSales !== "All Salespersons") params.salesPerson = selectedSales
      if (selectedState !== "All States") params.stateName = selectedState

      if (selectedMonth === "All Months" || selectedMonth === "Custom Range") {
        params.fromDate = startDate
        params.toDate = endDate
      } else {
        const [year, month] = selectedMonth.split("-")
        const fromDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        let toDate = new Date(parseInt(year), parseInt(month), 0)

        // If it's the current month (matching year & month), use today as toDate
        const now = new Date();
        if (parseInt(year) === now.getFullYear() && (parseInt(month) - 1) === now.getMonth()) {
          toDate = now;
        }

        params.fromDate = format(fromDate, "yyyy-MM-dd")
        params.toDate = format(toDate, "yyyy-MM-dd")
      }

      const response = await o2dAPI.getDashboardSummary(params)
      const payload = response.data
      if (!payload?.success || !payload?.data) {
        throw new Error("Invalid dashboard response")
      }
      setData(payload.data as DashboardResponse)
      setLastUpdated(payload.data.lastUpdated ? new Date(payload.data.lastUpdated) : new Date())

      // Also fetch secondary reports
      fetchEnquiryReport()
      fetchCustomerFeedback()
    } catch (err: unknown) {
      console.error("Error fetching dashboard:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load dashboard data"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selectedSales, selectedMonth, startDate, endDate])

  useEffect(() => {
    // Reset filters on mount to ensure a clean slate
    setSelectedParty("All Parties");
    setSelectedItem("All Items");
    setSelectedSales("All Salespersons");
    setSelectedState("All States");
    setSelectedMonth(format(new Date(), "yyyy-MM"));
  }, []);

  useEffect(() => {
    if (authLoading) {
      return
    }

    fetchDashboard()
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [authLoading, fetchDashboard])

  const filteredData = useMemo(() => {
    const rows = data?.rows || []
    return rows.filter((row) => {
      const partyName = row.partyName?.trim() || ""
      const itemName = row.itemName?.trim() || ""
      const salesName = row.salesPerson?.trim() || ""
      const stateName = (row.stateName || (row as Record<string, unknown>).state || (row as Record<string, unknown>).STATE || "").toString().trim()

      if (selectedSales !== "All Salespersons" && salesName !== selectedSales) return false

      return true
    })
  }, [data?.rows, selectedSales])

  const hasActiveFilters =
    selectedSales !== "All Salespersons" ||
    selectedMonth !== format(new Date(), "yyyy-MM") ||
    startDate !== format(startOfMonth(new Date()), "yyyy-MM-dd") ||
    endDate !== format(new Date(), "yyyy-MM-dd")

  const calculateFilteredMetrics = () => {
    const rows = filteredData || []
    const summary: DashboardSummary = data?.summary || {}

    const saudaAvgList = summary.saudaAvg || [];
    const salesAvgList = summary.salesAvg || [];

    let targetItem = 'PIPE';
    // Item filtering is removed from UI, defaulting to PIPE average calculation
    // but preserving the logic structure in case it's needed later.


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saudaAvg = saudaAvgList.find((x: any) => x.ITEM === targetItem)?.AVERAGE || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const salesAvg = salesAvgList.find((x: any) => x.ITEM === targetItem)?.AVERAGE || 0;

    // Calculate Dynamic Working Party Stats
    const monthlyStats = summary.monthlyStats || [];
    const relevantStats = selectedSales !== "All Salespersons"
      ? monthlyStats.filter((s: any) => s.SALES_PERSON === selectedSales)
      : monthlyStats;

    // Calculate Vehicle Status Metrics
    const wbIn = rows.filter(r => r.indate).length;
    const wbOut = rows.filter(r => r.outdate).length;
    const wbPending = rows.filter(r => r.indate && !r.outdate).length;

    // Use totalCustomers for pool size if available, fallback to 900
    const clientPool = totalCustomers || 900;

    const calculatedWorkingParty = relevantStats.reduce((sum: number, stat: any) => sum + (stat.MONTHLY_WORKING_PARTY || 0), 0);
    const calculatedPartyAverage = ((calculatedWorkingParty / clientPool) * 100).toFixed(2) + '%';

    // Calculate Dynamic Pending Order Stats
    const pendingStats = summary.pendingStats || [];
    const relevantPendingStats = selectedSales !== "All Salespersons"
      ? pendingStats.filter((s: any) => s.SALES_PERSON === selectedSales)
      : pendingStats;


    const calculatedPendingTotal = relevantPendingStats.reduce((sum: number, stat: any) => sum + (stat.TOTAL || 0), 0);
    const calculatedConversionRatio = ((calculatedPendingTotal / clientPool) * 100).toFixed(2) + '%';

    // Calculate Dynamic GD Stats
    const gdStats = summary.gdStats || [];
    const relevantGdStats = selectedSales !== "All Salespersons"
      ? gdStats.filter((s: any) => s.SALES_PERSON === selectedSales)
      : gdStats;

    let totalMonthlySummary = 0;
    let totalMonthlyQty = 0;
    let totalDailySummary = 0;
    let totalDailyQty = 0;

    relevantGdStats.forEach((s: any) => {
      const monQty = s.MONTHLY_QTY || 0;
      const dayQty = s.DAILY_QTY || 0;

      // GD = Summary / Qty  => Summary = GD * Qty
      totalMonthlySummary += (s.MONTHLY_GD || 0) * monQty;
      totalMonthlyQty += monQty;

      totalDailySummary += (s.DAILY_GD || 0) * dayQty;
      totalDailyQty += dayQty;
    });

    const calculatedMonthlyGd = totalMonthlyQty ? Math.round(totalMonthlySummary / totalMonthlyQty) : 0;
    const calculatedDailyGd = totalDailyQty ? Math.round(totalDailySummary / totalDailyQty) : 0;

    return {
      monthlyWorkingParty: calculatedWorkingParty,
      monthlyPartyAverage: calculatedPartyAverage,
      pendingOrdersTotal: calculatedPendingTotal,
      conversionRatio: calculatedConversionRatio,
      saudaAvg,
      salesAvg,
      saudaRate2026: summary.saudaRate2026 ?? 0,
      monthlyGd: calculatedMonthlyGd,
      dailyGd: calculatedDailyGd,
      activeItemName: targetItem === 'STRIPS' ? 'Strips' : targetItem === 'BILLET' ? 'Billet' : 'Pipe',
      wbIn,
      wbOut,
      wbPending,
      totalAmount: 0,
      totalPaymentsReceived: 0,
      pendingPayments: 0,
      paymentSuccessRate: 0,
    }
  }

  const displayMetrics = calculateFilteredMetrics()

  const formatMetricValue = (value?: number | string | null) => {
    if (typeof value === "number") {
      return value.toLocaleString("en-IN")
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
    return "0"
  }



  // Get all three item averages for the composite card
  const getItemAverages = () => {
    const summary: DashboardSummary = data?.summary || {}
    const saudaAvgList = summary.allSaudaAvg || []
    const salesAvgList = summary.salesAvg || []

    const items = ['PIPE', 'STRIPS', 'BILLET']
    return items.map(item => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const saudaAvg = saudaAvgList.find((x: any) => x.ITEM === item)?.AVERAGE || 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const salesAvg = salesAvgList.find((x: any) => x.ITEM === item)?.AVERAGE || 0
      return {
        item: item === 'STRIPS' ? 'Strip' : item === 'BILLET' ? 'Billet' : 'Pipe',
        saudaAvg,
        salesAvg,
      }
    })
  }

  const itemAverages = getItemAverages()

  const stateOptions = useMemo(() => {
    if (data?.filters?.states && data.filters.states.length > 0) return data.filters.states
    const rows = data?.rows || []
    const set = new Set<string>()
    rows.forEach((row) => {
      const value = (row.stateName || (row as Record<string, unknown>).state || (row as Record<string, unknown>).STATE || "").toString().trim()
      if (value) set.add(value)
    })
    return Array.from(set).sort()
  }, [data?.filters?.states, data?.rows])

  const COLORS = [
    "#2563eb", // Blue
    "#7c3aed", // Violet
    "#db2777", // Pink
    "#ea580c", // Orange
    "#059669", // Emerald
    "#0891b2", // Cyan
    "#4f46e5", // Indigo
    "#eab308", // Yellow
    "#dc2626", // Red
    "#16a34a", // Green
    "#94a3b8"  // Slate (for Others)
  ]

  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const map: Record<string, number> = {}
    filteredData.forEach((row) => {
      const name = row.partyName?.trim()
      if (!name) return
      map[name] = (map[name] || 0) + 1
    })

    const sorted = Object.entries(map).sort(([, a], [, b]) => b - a)
    const top10 = sorted.slice(0, 10)
    const others = sorted.slice(10)

    const dataPoints = top10.map(([name, value], index) => ({
      name,
      value,
      fill: COLORS[index % COLORS.length],
    }))

    if (others.length > 0) {
      const othersTotal = others.reduce((sum, [, value]) => sum + value, 0)
      dataPoints.push({ name: "Others", value: othersTotal, fill: "#999999" })
    }

    return dataPoints
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData])

  const top10Customers = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []
    const map: Record<
      string,
      { name: string; dispatchCount: number; items: Set<string>; totalQty: number; balanceAmount: number }
    > = {}

    filteredData.forEach((row) => {
      const name = row.partyName?.trim()
      if (!name) return

      if (!map[name]) {
        map[name] = { name, dispatchCount: 0, items: new Set<string>(), totalQty: 0, balanceAmount: 0 }
      }

      if (row.itemName) map[name].items.add(row.itemName.trim())
      map[name].dispatchCount += 1
    })

    return Object.values(map)
      .sort((a, b) => b.dispatchCount - a.dispatchCount)
      .slice(0, 10)
      .map((customer, index) => ({
        rank: index + 1,
        name: customer.name,
        dispatches: customer.dispatchCount,
        amount: "₹0",
        balanceAmount: "₹0",
        itemNames: Array.from(customer.items).join(", "),
        totalQty: customer.totalQty.toFixed(2),
      }))
  }, [filteredData])

  const salespersonAnalytics = useMemo(() => {
    const summary: DashboardSummary = data?.summary || {};
    const analytics: Record<string, any> = {};

    // Helper to initialize salesperson object
    const initPerson = (name: string) => {
      if (!name) return;
      if (!analytics[name]) {
        analytics[name] = {
          name,
          saudaAvg: [],
          salesAvg: [],
          workingParty: { count: 0, average: '0%' },
          pendingOrders: { count: 0, ratio: '0%' },
          gd: { monthly: 0, daily: 0 },
          delivery: salespersonDeliveryStats[name] || {
            monthly: { score: '0%', total: 0, late: 0 },
            daily: { score: '0%', total: 0, late: 0 }
          }
        };
      }
    };

    // 1. Sauda Averages
    (summary.allSaudaAvg || []).forEach(s => {
      initPerson(s.SALES_PERSON);
      if (analytics[s.SALES_PERSON]) analytics[s.SALES_PERSON].saudaAvg.push(s);
    });

    // 2. Sales Averages
    (summary.salesAvg || []).forEach(s => {
      initPerson(s.SALES_PERSON);
      if (analytics[s.SALES_PERSON]) analytics[s.SALES_PERSON].salesAvg.push(s);
    });

    // 3. Working Party
    (summary.monthlyStats || []).forEach(s => {
      initPerson(s.SALES_PERSON);
      if (analytics[s.SALES_PERSON]) {
        analytics[s.SALES_PERSON].workingParty = {
          count: s.MONTHLY_WORKING_PARTY,
          average: s.MONTHLY_PARTY_AVERAGE
        };
      }
    });

    // 4. Pending Orders
    (summary.pendingStats || []).forEach(s => {
      initPerson(s.SALES_PERSON);
      if (analytics[s.SALES_PERSON]) {
        analytics[s.SALES_PERSON].pendingOrders = {
          count: s.TOTAL,
          ratio: s.CONVERSION_RATIO
        };
      }
    });

    // 5. GD Stats
    (summary.gdStats || []).forEach(s => {
      initPerson(s.SALES_PERSON);
      if (analytics[s.SALES_PERSON]) {
        analytics[s.SALES_PERSON].gd = {
          monthly: s.MONTHLY_GD,
          daily: s.DAILY_GD
        };
      }
    });

    // Also ensure people from delivery stats are included even if no other data
    Object.keys(salespersonDeliveryStats).forEach(name => {
      initPerson(name);
    });

    let persons = Object.entries(analytics)
      .sort(([a], [b]) => a.localeCompare(b));

    if (selectedSales !== "All Salespersons") {
      persons = persons.filter(([name]) => name === selectedSales);
    }

    return persons.map(([, data]) => data);
  }, [data?.summary, salespersonDeliveryStats, selectedSales]);

  const stateDistributionData = useMemo(() => {
    if (!filteredData) return [];
    const stateMap: Record<string, number> = {};
    filteredData.forEach(row => {
      // Handle multiple potential state field names from backend
      const stateName = (row.stateName || (row as any).state || (row as any).STATE || "").toString().trim();
      if (stateName) {
        stateMap[stateName] = (stateMap[stateName] || 0) + 1;
      }
    });

    const entries = Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    const totalCount = entries.reduce((acc, curr) => acc + curr.count, 0);
    if (totalCount === 0) return [];

    const result: { state: string; count: number }[] = [];
    let miscCount = 0;

    entries.forEach(entry => {
      const percentage = (entry.count / totalCount) * 100;
      if (percentage < 2) {
        miscCount += entry.count;
      } else {
        result.push(entry);
      }
    });

    if (miscCount > 0) {
      result.push({ state: "Miscellaneous", count: miscCount });
    }

    return result;
  }, [filteredData]);

  const downloadPDF = async () => {
    if (!dashboardRef.current) {
      alert("Dashboard content not ready for download")
      return
    }

    try {
      const metrics = displayMetrics
      const top10Data = top10Customers

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Dashboard Report</title>
          <style>
            @page { margin: 20mm; size: A4; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; background: white; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .header h1 { font-size: 28px; color: #1e40af; margin-bottom: 5px; }
            .header .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 10px; }
            .timestamp { font-size: 12px; color: #9ca3af; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: 600; color: #1e40af; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background: #f9fafb; }
            .kpi-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
            .kpi-value { font-size: 20px; font-weight: 700; color: #1e40af; }
            .kpi-value.amount { color: #059669; }
            .kpi-value.alert { color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background: #f3f4f6; color: #374151; font-weight: 600; padding: 12px 8px; text-align: left; border: 1px solid #d1d5db; }
            td { padding: 10px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
            tr:nth-child(even) { background: #f9fafb; }
            tr:hover { background: #f3f4f6; }
            .filters-section { background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; }
            .filter-item { display: inline-block; background: white; padding: 5px 10px; margin: 5px; border-radius: 15px; border: 1px solid #d1d5db; font-size: 12px; }
            .no-data { text-align: center; color: #6b7280; font-style: italic; padding: 20px; }
            .page-break { page-break-before: always; }
            @media print { body { print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dashboard Report</h1>
            <div class="subtitle">Filtered view of O2D operations</div>
            <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
          </div>

          <div class="section">
            <div class="section-title">Key Performance Indicators</div>
            <div class="kpi-grid">
              <div class="kpi-card"><div class="kpi-label">Monthly Working Party</div><div class="kpi-value">${metrics.monthlyWorkingParty}</div></div>
              <div class="kpi-card"><div class="kpi-label">Monthly Party Average</div><div class="kpi-value">${metrics.monthlyPartyAverage}</div></div>
              <div class="kpi-card"><div class="kpi-label">Parties Pending Order</div><div class="kpi-value">${metrics.pendingOrdersTotal}</div></div>
              <div class="kpi-card"><div class="kpi-label">Conversion Ratio</div><div class="kpi-value alert">${metrics.conversionRatio}</div></div>
              <div class="kpi-card"><div class="kpi-label">Sauda Avg (${metrics.activeItemName})</div><div class="kpi-value">₹${metrics.saudaAvg}</div></div>
              <div class="kpi-card"><div class="kpi-label">Sales Avg (${metrics.activeItemName})</div><div class="kpi-value">₹${metrics.salesAvg}</div></div>
              <div class="kpi-card"><div class="kpi-label">Sauda Rate (2026)</div><div class="kpi-value">₹${metrics.saudaRate2026}</div></div>
              <div class="kpi-card"><div class="kpi-label">Monthly GD</div><div class="kpi-value">₹${metrics.monthlyGd}</div></div>
              <div class="kpi-card"><div class="kpi-label">Daily GD</div><div class="kpi-value">₹${metrics.dailyGd}</div></div>
            </div>
          </div>

          ${hasActiveFilters
          ? `
          <div class="section">
            <div class="section-title">Applied Filters</div>
            <div class="filters-section">
              ${selectedParty !== "All Parties" ? `<span class="filter-item">Party: ${selectedParty}</span>` : ""}
              ${selectedItem !== "All Items" ? `<span class="filter-item">Item: ${selectedItem}</span>` : ""}
              ${selectedState !== "All States" ? `<span class="filter-item">State: ${selectedState}</span>` : ""}
              ${selectedSales !== "All Salespersons" ? `<span class="filter-item">Sales: ${selectedSales}</span>` : ""}
              ${selectedMonth !== "All Months" ? `<span class="filter-item">Month: ${new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>` : ""}
            </div>
          </div>
          `
          : ""
        }

          <div class="section">
            <div class="section-title">Top 10 Customers</div>
            ${top10Data.length > 0
          ? `
            <table>
              <thead>
                <tr><th style="width:8%">Rank</th><th style="width:40%">Customer Name</th><th style="width:20%">Dispatches</th><th style="width:32%">Items</th></tr>
              </thead>
              <tbody>
                ${top10Data
            .map(
              (customer) => `
                <tr>
                  <td>${customer.rank}</td>
                  <td>${customer.name}</td>
                  <td>${customer.dispatches}</td>
                  <td>${customer.itemNames}</td>
                </tr>`,
            )
            .join("")}
              </tbody>
            </table>
            `
          : '<div class="no-data">No customer data available</div>'
        }
          </div>

          <div class="section page-break">
            <div class="section-title">Filtered Results (${filteredData?.length || 0} total records)</div>
            ${filteredData && filteredData.length > 0
          ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 6%">Sr.No.</th>
                  <th style="width: 30%">Party Name</th>
                  <th style="width: 20%">Item</th>
                  <th style="width: 14%">In Date</th>
                  <th style="width: 14%">Out Date</th>
                  <th style="width: 16%">Invoice No.</th>
                </tr>
              </thead>
              <tbody>
                ${filteredData
            .slice(0, 100)
            .map(
              (row, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${row.partyName || "-"}</td>
                  <td>${row.itemName || "-"}</td>
                  <td>${row.indate ? new Date(row.indate).toLocaleDateString() : "-"}</td>
                  <td>${row.outdate ? new Date(row.outdate).toLocaleDateString() : "-"}</td>
                  <td>${row.invoiceNo || "-"}</td>
                </tr>`,
            )
            .join("")}
              </tbody>
            </table>
            ${filteredData.length > 100 ? `<div style="margin-top: 15px; font-size: 12px; color: #6b7280; text-align: center;">Showing first 100 records of ${filteredData.length} total results</div>` : ""}
            `
          : '<div class="no-data">No records found matching your filters</div>'
        }
          </div>
        </body>
        </html>
      `

      const printWindow = window.open("", "_blank", "width=900,height=650")
      if (!printWindow) {
        alert("Popup blocked. Please allow popups to download the PDF.")
        return
      }

      printWindow.document.open()
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()

      setTimeout(() => {
        printWindow.print()
      }, 300)
    } catch (err) {
      console.error("Error generating PDF:", err)
      alert("Error generating PDF. Please try again.")
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <p className="text-lg font-semibold text-gray-700">Loading dashboard data...</p>
            <p className="text-sm text-gray-500">Please wait while we fetch your data</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      </div>
    )
  }



  // New Stats State (Moved to top)

  return (
    <div className="relative space-y-2 sm:space-y-4 p-2 sm:p-4 lg:p-8 bg-white min-h-screen" ref={dashboardRef}>
      {loading && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center justify-center space-y-4 bg-white rounded-lg shadow-2xl p-8">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="text-lg font-semibold text-gray-700">Loading...</p>
          </div>
        </div>
      )}






      {/* O2D Dashboard Content */}
      <>
        <div className="flex items-center justify-between">
          <div>
            {lastUpdated && <p className="text-[10px] sm:text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <h3 className="flex items-center gap-1.5 sm:gap-2 text-indigo-700 text-sm sm:text-lg font-semibold">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
              Dashboard Filters
            </h3>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSales("All Salespersons")
                  setSelectedMonth(format(new Date(), "yyyy-MM"))
                  setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"))
                  setEndDate(format(new Date(), "yyyy-MM-dd"))
                }}
                className="ignore-pdf bg-red-50 text-red-600 hover:bg-red-100 border-red-200 h-8"
              >
                <X className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-4 lg:gap-6">
            {/* Date Pickers */}
            <DatePicker
              label="From Date"
              date={startDate}
              setDate={(val) => {
                setStartDate(val)
                setSelectedMonth("Custom Range")
              }}
            />
            <DatePicker
              label="To Date"
              date={endDate}
              setDate={(val) => {
                setEndDate(val)
                setSelectedMonth("Custom Range")
              }}
            />
          </div>

          {hasActiveFilters && (
            <div className="mt-2 sm:mt-4 flex flex-wrap gap-1 sm:gap-2 pt-1.5 sm:pt-3 border-t border-slate-100">
              {selectedSales !== "All Salespersons" && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-[9px] sm:text-xs">
                  Sales: {selectedSales}
                </Badge>
              )}
              {selectedMonth !== "All Months" && selectedMonth !== "Custom Range" && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[9px] sm:text-xs">
                  Month: {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Badge>
              )}
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 text-[9px] sm:text-xs">
                Range: {format(new Date(startDate), "MMM d")} - {format(new Date(endDate), "MMM d, yyyy")}
              </Badge>
            </div>
          )}
        </div>

        {/* All Sauda Average & Sales Average - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
          {/* All Sauda Average Card */}
          <Card className="border-l-2 border-l-purple-600 bg-gradient-to-br from-purple-50/50 to-white shadow-sm">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent p-2 sm:p-3 pb-1 sm:pb-1.5">
              <CardTitle className="text-[10px] sm:text-xs lg:text-sm text-purple-800 font-bold">All Sauda Average</CardTitle>
              <CardDescription className="text-[7px] sm:text-[9px] text-purple-700/80 hidden sm:block">
                Average rates for Pipe, Billet, and Strip
              </CardDescription>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2.5">
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {itemAverages.map((itemData, index) => {
                  const gradients = [
                    'from-indigo-500 via-indigo-600 to-blue-600',
                    'from-red-500 via-orange-500 to-orange-600',
                    'from-teal-500 via-cyan-500 to-cyan-600'
                  ]
                  return (
                    <Card
                      key={`sauda-${itemData.item}`}
                      className={cn(
                        "shadow-sm border-none",
                        `bg-gradient-to-br ${gradients[index]} text-white`
                      )}
                    >
                      <CardContent className="p-1.5 sm:p-2.5">
                        <p className="text-[7px] sm:text-[10px] font-semibold text-white/90">{itemData.item}</p>
                        <p className="text-[6px] sm:text-[8px] text-white/60 font-medium">Sauda Average</p>
                        <p className="text-[10px] sm:text-sm lg:text-lg font-bold text-white leading-tight mt-0.5">
                          ₹{formatMetricValue(itemData.saudaAvg)}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Current Month Sales Average Card */}
          <Card className="border-l-2 border-l-orange-600 bg-gradient-to-br from-orange-50/50 to-white shadow-sm">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-transparent p-2 sm:p-3 pb-1 sm:pb-1.5">
              <CardTitle className="text-[10px] sm:text-xs lg:text-sm text-orange-800 font-bold">Current Month Sales Average</CardTitle>
              <CardDescription className="text-[7px] sm:text-[9px] text-orange-700/80 hidden sm:block">
                Sales average rates for Pipe, Billet, and Strip
              </CardDescription>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2.5">
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {itemAverages.map((itemData, index) => {
                  const colors = [
                    '#099438ff',
                    '#142b49ff',
                    '#E3227C'
                  ]
                  return (
                    <Card
                      key={`sales-${itemData.item}`}
                      className="shadow-sm text-white border-none"
                      style={{ background: colors[index] }}
                    >
                      <CardContent className="p-1.5 sm:p-2.5">
                        <p className="text-[7px] sm:text-[10px] font-semibold text-white/90">{itemData.item}</p>
                        <p className="text-[6px] sm:text-[8px] text-white/60 font-medium">Sales Average</p>
                        <p className="text-[10px] sm:text-sm lg:text-lg font-bold text-white leading-tight mt-0.5">
                          ₹{formatMetricValue(itemData.salesAvg)}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Summary Cards - Compact Layout */}
        <div className="space-y-2 sm:space-y-3">
          {/* Row 1: Sauda Rate + GD Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {/* Sauda Rate Composite Card */}
            <Card className="border-l-2 border-l-purple-500 bg-gradient-to-br from-purple-50/30 to-white shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent p-2 sm:p-2.5 pb-1 sm:pb-1.5">
                <CardTitle className="text-[10px] sm:text-xs text-purple-800 font-bold">Sauda Rate & Late Delivery</CardTitle>
                <CardDescription className="text-[7px] sm:text-[9px] text-purple-700/80 hidden sm:block">
                  Current month party & delivery percent
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1.5 sm:p-2.5">
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  <Card className="bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 text-white border-none shadow-sm">
                    <CardContent className="p-1.5 sm:p-2.5 flex flex-col items-center text-center">
                      <p className="text-[7px] sm:text-[10px] font-bold text-purple-100">Sauda Rate</p>
                      <div className="text-[10px] sm:text-sm lg:text-lg font-black text-white leading-tight mt-0.5">
                        ₹{formatMetricValue(displayMetrics.saudaRate2026)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 text-white border-none shadow-sm">
                    <CardContent className="p-1.5 sm:p-2.5 flex flex-col items-center text-center">
                      <p className="text-[7px] sm:text-[10px] font-bold text-pink-100">Monthly Late</p>
                      <div className="text-[10px] sm:text-sm lg:text-lg font-black text-white leading-tight mt-0.5">
                        {deliveryStats?.monthly?.score ?? '0%'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600 text-white border-none shadow-sm">
                    <CardContent className="p-1.5 sm:p-2.5 flex flex-col items-center text-center">
                      <p className="text-[7px] sm:text-[10px] font-bold text-indigo-100">Daily Late</p>
                      <div className="text-[10px] sm:text-sm lg:text-lg font-black text-white leading-tight mt-0.5">
                        {deliveryStats?.daily?.score ?? '0%'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* GD Metrics Composite Card */}
            <Card className="border-l-2 border-l-green-500 bg-white shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-2 sm:p-2.5 pb-1 sm:pb-1.5">
                <CardTitle className="text-[10px] sm:text-xs text-green-800 font-bold">GD Metrics</CardTitle>
                <CardDescription className="text-[7px] sm:text-[9px] text-green-700/80 hidden sm:block">
                  Gross dispatch statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1.5 sm:p-2.5">
                <div className="grid grid-cols-2 gap-1 sm:gap-2">
                  <Card className="bg-gradient-to-br from-green-400 via-green-500 to-green-600 text-white border-none shadow-sm">
                    <CardContent className="p-1.5 sm:p-2.5 flex flex-col items-center text-center">
                      <p className="text-[7px] sm:text-[10px] font-bold text-green-100">Monthly GD</p>
                      <div className="text-[10px] sm:text-sm lg:text-lg font-black text-white leading-tight mt-0.5">
                        ₹{formatMetricValue(displayMetrics.monthlyGd)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white border-none shadow-sm">
                    <CardContent className="p-1.5 sm:p-2.5 flex flex-col items-center text-center">
                      <p className="text-[7px] sm:text-[10px] font-bold text-orange-100">Daily GD</p>
                      <div className="text-[10px] sm:text-sm lg:text-lg font-black text-white leading-tight mt-0.5">
                        ₹{formatMetricValue(displayMetrics.dailyGd)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Working Party & Pending Order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {/* Working Party Composite Card */}
            <Card className="border-l-2 border-l-cyan-500 bg-white shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-2 sm:p-2.5 pb-1 sm:pb-1.5">
                <CardTitle className="text-[10px] sm:text-xs text-cyan-800 font-bold">Working Party Metrics</CardTitle>
                <CardDescription className="text-[7px] sm:text-[9px] text-cyan-700/80 hidden sm:block">
                  Current month party statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1.5 sm:p-2.5">
                <div className="grid grid-cols-2 gap-1 sm:gap-2">
                  <Card className="bg-gradient-to-br from-cyan-400 via-cyan-500 to-teal-500 text-white border-none shadow-sm">
                    <CardContent className="p-1.5 sm:p-2.5 flex flex-col items-center text-center">
                      <p className="text-[7px] sm:text-[10px] font-bold text-cyan-100">Working Party</p>
                      <div className="text-[10px] sm:text-sm lg:text-lg font-black text-white leading-tight mt-0.5">
                        {formatMetricValue(displayMetrics.monthlyWorkingParty)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white border-none shadow-sm">
                    <CardContent className="p-1.5 sm:p-2.5 flex flex-col items-center text-center">
                      <p className="text-[7px] sm:text-[10px] font-bold text-emerald-100">Party Average</p>
                      <div className="text-[10px] sm:text-sm lg:text-lg font-black text-white leading-tight mt-0.5">
                        {displayMetrics.monthlyPartyAverage}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Pending Orders Composite Card */}
            <Card className="border-l-2 border-l-teal-500 bg-white shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-2 sm:p-2.5 pb-1 sm:pb-1.5">
                <CardTitle className="text-[10px] sm:text-xs text-teal-800 font-bold">Pending Order Metrics</CardTitle>
                <CardDescription className="text-[7px] sm:text-[9px] text-teal-700/80 hidden sm:block">
                  Order conversion statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1.5 sm:p-2.5">
                <div className="grid grid-cols-2 gap-1 sm:gap-2">
                  <Card className="bg-gradient-to-br from-teal-500 via-emerald-600 to-green-700 text-white border-none shadow-sm">
                    <CardContent className="p-1.5 sm:p-2.5 flex flex-col items-center text-center">
                      <p className="text-[7px] sm:text-[10px] font-bold text-teal-100">Parties Pending</p>
                      <div className="text-[10px] sm:text-sm lg:text-lg font-black text-white leading-tight mt-0.5">
                        {formatMetricValue(displayMetrics.pendingOrdersTotal)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600 text-white border-none shadow-sm">
                    <CardContent className="p-1.5 sm:p-2.5 flex flex-col items-center text-center">
                      <p className="text-[7px] sm:text-[10px] font-bold text-pink-100">Conversion Ratio</p>
                      <div className="text-[10px] sm:text-sm lg:text-lg font-black text-white leading-tight mt-0.5">
                        {displayMetrics.conversionRatio}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>


        {/* Salesperson Performance Analytics - Unified Master View */}
        <div className="space-y-3 sm:space-y-10 mb-4 sm:mb-10 overflow-hidden bg-slate-50/50 p-2 sm:p-8 rounded-xl sm:rounded-[3rem]">
          <div className="flex items-center justify-between px-1 mb-3 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="w-7 h-7 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white flex items-center justify-center shadow-md sm:shadow-lg border border-slate-100 ring-2 sm:ring-4 ring-white">
                <User className="w-3.5 h-3.5 sm:w-7 sm:h-7 text-slate-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  SALES PERSION ANALYTICS
                  <Badge className="bg-white text-slate-500 border border-slate-200 font-black text-[10px] sm:text-xs px-2 py-0.5 shadow-sm">
                    {salespersonAnalytics.length} ACTIVE
                  </Badge>
                </h2>
                <p className="text-[8px] sm:text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5 sm:mt-1">Comprehensive Performance Scorecards</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-10">
            {salespersonAnalytics.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Database className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No Performance Data Available</p>
                <p className="text-slate-300 text-xs mt-2 uppercase font-bold">Try adjusting your filters or date range</p>
              </div>
            ) : (
              salespersonAnalytics.map((person, index) => {
                const cardStyles = [
                  {
                    bg: "bg-gradient-to-br from-indigo-50/70 via-white to-white",
                    border: "border-l-[6px] border-l-indigo-500",
                    shadow: "shadow-indigo-100",
                    accent: "text-indigo-600",
                    badge: "bg-indigo-100 text-indigo-700",
                    avatar: "bg-indigo-500 shadow-indigo-200"
                  },
                  {
                    bg: "bg-gradient-to-br from-emerald-50/70 via-white to-white",
                    border: "border-l-[6px] border-l-emerald-500",
                    shadow: "shadow-emerald-100",
                    accent: "text-emerald-600",
                    badge: "bg-emerald-100 text-emerald-700",
                    avatar: "bg-emerald-500 shadow-emerald-200"
                  },
                  {
                    bg: "bg-gradient-to-br from-rose-50/70 via-white to-white",
                    border: "border-l-[6px] border-l-rose-500",
                    shadow: "shadow-rose-100",
                    accent: "text-rose-600",
                    badge: "bg-rose-100 text-rose-700",
                    avatar: "bg-rose-500 shadow-rose-200"
                  },
                  {
                    bg: "bg-gradient-to-br from-amber-50/70 via-white to-white",
                    border: "border-l-[6px] border-l-amber-500",
                    shadow: "shadow-amber-100",
                    accent: "text-amber-600",
                    badge: "bg-amber-100 text-amber-700",
                    avatar: "bg-amber-500 shadow-amber-200"
                  },
                  {
                    bg: "bg-gradient-to-br from-sky-50/70 via-white to-white",
                    border: "border-l-[6px] border-l-sky-500",
                    shadow: "shadow-sky-100",
                    accent: "text-sky-600",
                    badge: "bg-sky-100 text-sky-700",
                    avatar: "bg-sky-500 shadow-sky-200"
                  },
                  {
                    bg: "bg-gradient-to-br from-violet-50/70 via-white to-white",
                    border: "border-l-[6px] border-l-violet-500",
                    shadow: "shadow-violet-100",
                    accent: "text-violet-600",
                    badge: "bg-violet-100 text-violet-700",
                    avatar: "bg-violet-500 shadow-violet-200"
                  },
                  {
                    bg: "bg-gradient-to-br from-teal-50/70 via-white to-white",
                    border: "border-l-[6px] border-l-teal-500",
                    shadow: "shadow-teal-100",
                    accent: "text-teal-600",
                    badge: "bg-teal-100 text-teal-700",
                    avatar: "bg-teal-500 shadow-teal-200"
                  },
                  {
                    bg: "bg-gradient-to-br from-slate-100/70 via-white to-white",
                    border: "border-l-[6px] border-l-slate-700",
                    shadow: "shadow-slate-200",
                    accent: "text-slate-700",
                    badge: "bg-slate-200 text-slate-700",
                    avatar: "bg-slate-700 shadow-slate-300"
                  },
                ];
                const style = cardStyles[index % cardStyles.length];

                return (
                  <Card
                    key={person.name}
                    className={cn(
                      "group border-none shadow-lg sm:shadow-2xl overflow-hidden transition-all duration-500 flex flex-col rounded-xl sm:rounded-[2.5rem] p-2.5 sm:p-8 lg:p-12",
                      style.bg,
                      style.border,
                      style.shadow
                    )}
                  >
                    {/* Header Row - Premium Identity Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-8 mb-3 sm:mb-12">
                      <div className="flex items-center gap-2.5 sm:gap-6">
                        <div className={cn(
                          "w-10 h-10 sm:w-18 sm:h-18 rounded-lg sm:rounded-[2rem] flex items-center justify-center text-white text-xs sm:text-2xl font-black shadow-md sm:shadow-lg ring-2 sm:ring-8 ring-white/50 transition-transform group-hover:scale-105 duration-500",
                          style.avatar
                        )}>
                          {person.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5 sm:space-y-2">
                          <h3 className="text-sm sm:text-3xl lg:text-4xl font-black tracking-tight uppercase text-slate-800 lg:group-hover:text-slate-900 transition-colors">
                            {person.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Badge className={cn("px-2 py-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-widest border-none", style.badge)}>
                              Performance Lead
                            </Badge>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                              <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Status</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:gap-4 w-full lg:w-auto">
                        <div className="flex-1 lg:flex-none bg-white/50 backdrop-blur-xl rounded-lg sm:rounded-[2rem] p-2 sm:p-6 border border-white/60 text-center min-w-[80px] sm:min-w-[140px] shadow-sm hover:shadow-md transition-all">
                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Monthly Late</p>
                          <p className="text-base sm:text-3xl font-black text-slate-800 leading-none">{person.delivery.monthly.score}</p>
                          <div className="w-full h-0.5 sm:h-1 bg-slate-100 rounded-full mt-1.5 sm:mt-3 overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-1000", parseFloat(person.delivery.monthly.score) > 20 ? "bg-rose-400" : "bg-emerald-400")}
                              style={{ width: person.delivery.monthly.score }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex-1 lg:flex-none bg-white/50 backdrop-blur-xl rounded-lg sm:rounded-[2rem] p-2 sm:p-6 border border-white/60 text-center min-w-[80px] sm:min-w-[140px] shadow-sm hover:shadow-md transition-all">
                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Daily Late</p>
                          <p className="text-base sm:text-3xl font-black text-slate-800 leading-none">{person.delivery.daily.score}</p>
                          <div className="w-full h-0.5 sm:h-1 bg-slate-100 rounded-full mt-1.5 sm:mt-3 overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-1000", parseFloat(person.delivery.daily.score) > 20 ? "bg-rose-400" : "bg-emerald-400")}
                              style={{ width: person.delivery.daily.score }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-0 space-y-4 sm:space-y-16">
                      {/* Operational Metrics Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-10">
                        {/* Logistics Section */}
                        <div className="bg-white/30 backdrop-blur-md rounded-xl sm:rounded-[3rem] p-3 sm:p-10 border border-white shadow-[0_8px_32px_rgba(0,0,0,0.02)] relative overflow-hidden group/box">
                          <div className="absolute top-0 right-0 p-3 sm:p-8 opacity-5 group-hover/box:opacity-10 transition-opacity">
                            <Truck className="w-8 h-8 sm:w-24 sm:h-24 text-slate-900" />
                          </div>

                          <h4 className="text-[8px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-8 flex items-center gap-1.5 sm:gap-2">
                            <span className={cn("w-2 h-2 rounded-full", style.avatar)}></span>
                            Logistics & Client Base
                          </h4>

                          <div className="grid grid-cols-2 gap-2 sm:gap-8 relative z-10">
                            <div className="space-y-0.5 sm:space-y-1">
                              <p className="text-[7px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Working Party</p>
                              <div className="flex flex-col">
                                <span className={cn("text-lg sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight", style.accent)}>
                                  {person.workingParty.count}
                                </span>
                                <span className="text-[7px] sm:text-[10px] font-black text-slate-300 mt-0.5 uppercase tracking-wider">
                                  Avg: {person.workingParty.average}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                              <p className="text-[7px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending Orders</p>
                              <div className="flex flex-col">
                                <span className="text-lg sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-purple-600">
                                  {person.pendingOrders.count}
                                </span>
                                <span className="text-[7px] sm:text-[10px] font-black text-slate-300 mt-0.5 uppercase tracking-wider">
                                  Conv: {person.pendingOrders.ratio}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dispatch Section */}
                        <div className="bg-white/30 backdrop-blur-md rounded-xl sm:rounded-[3rem] p-3 sm:p-10 border border-white shadow-[0_8px_32px_rgba(0,0,0,0.02)] relative overflow-hidden group/box">
                          <div className="absolute top-0 right-0 p-3 sm:p-8 opacity-5 group-hover/box:opacity-10 transition-opacity">
                            <Trophy className="w-8 h-8 sm:w-24 sm:h-24 text-slate-900" />
                          </div>

                          <h4 className="text-[8px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-8 flex items-center gap-1.5 sm:gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            Dispatch Economics
                          </h4>

                          <div className="grid grid-cols-2 gap-2 sm:gap-8 relative z-10">
                            <div className="space-y-0.5 sm:space-y-1 group-hover/box:translate-x-1 transition-transform">
                              <p className="text-[7px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monthly Revenue GD</p>
                              <p className="text-lg sm:text-4xl lg:text-5xl font-black text-emerald-600 tracking-tight leading-tight">
                                ₹{person.gd.monthly.toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="space-y-0.5 sm:space-y-1 group-hover/box:translate-x-1 transition-transform">
                              <p className="text-[7px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today's Performance</p>
                              <p className="text-lg sm:text-4xl lg:text-5xl font-black text-amber-600 tracking-tight leading-tight">
                                ₹{person.gd.daily.toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pricing Benchmarks Section */}
                      <div className="space-y-3 sm:space-y-12">
                        <div className="flex items-center gap-3 sm:gap-6">
                          <h4 className="text-[9px] sm:text-[14px] font-black text-slate-800 uppercase tracking-[0.2em] sm:tracking-[0.4em] whitespace-nowrap">Pricing Benchmarks</h4>
                          <div className="h-px w-full bg-gradient-to-r from-slate-200 to-transparent"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 lg:gap-12">
                          {/* Sauda Benchmarks */}
                          <div className="space-y-1.5 sm:space-y-4">
                            <div className="flex items-center justify-between px-1 sm:px-2">
                              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
                                <Database className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Sauda Average Rate
                              </p>
                            </div>
                            <div className="space-y-1 sm:space-y-2">
                              {person.saudaAvg.length === 0 ? (
                                <p className="text-[10px] font-bold text-slate-300 uppercase italic px-4 py-3 bg-slate-50/50 rounded-2xl">No data available</p>
                              ) : (
                                person.saudaAvg.map((s: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between bg-white/60 backdrop-blur-sm px-2.5 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-2xl border border-white hover:bg-white hover:shadow-lg transition-all group/item">
                                    <span className="text-[8px] sm:text-xs font-black text-slate-600 uppercase tracking-widest">{s.ITEM}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] sm:text-xl font-black font-mono text-indigo-600 tracking-tighter">₹{s.AVERAGE.toLocaleString("en-IN")}</span>
                                      <span className="w-1 h-1 rounded-full bg-indigo-200"></span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Sales Benchmarks */}
                          <div className="space-y-1.5 sm:space-y-4">
                            <div className="flex items-center justify-between px-1 sm:px-2">
                              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
                                <Percent className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Month Sales Avg Rate
                              </p>
                            </div>
                            <div className="space-y-1 sm:space-y-2">
                              {person.salesAvg.length === 0 ? (
                                <p className="text-[10px] font-bold text-slate-300 uppercase italic px-4 py-3 bg-slate-50/50 rounded-2xl">No data available</p>
                              ) : (
                                person.salesAvg.map((s: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between bg-white/60 backdrop-blur-sm px-2.5 sm:px-6 py-2 sm:py-4 rounded-lg sm:rounded-2xl border border-white hover:bg-white hover:shadow-lg transition-all group/item">
                                    <span className="text-[8px] sm:text-xs font-black text-slate-600 uppercase tracking-widest">{s.ITEM}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] sm:text-xl font-black font-mono text-emerald-600 tracking-tighter">₹{s.AVERAGE.toLocaleString("en-IN")}</span>
                                      <span className="w-1 h-1 rounded-full bg-emerald-200"></span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>



        {/* Sale Performance State Wise Section */}
        <Card className="border-none shadow-sm bg-white overflow-hidden mb-10">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-2 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Trophy className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-xs sm:text-2xl font-black text-slate-800 tracking-tight">Sale Performance State Wise</CardTitle>
                  <div className="flex items-center gap-1.5">
                    <span className="flex w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Volume Analysis</p>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <Badge variant="secondary" className="text-slate-600 font-bold text-[10px] bg-slate-100 hover:bg-slate-200 border-none">ALL STATES</Badge>
                <Badge className="bg-white text-indigo-600 border border-slate-200 shadow-sm font-black text-[10px]">
                  {stateDistributionData.length} ACTIVE
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-1.5 sm:p-6">

            <div className="grid grid-cols-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1.5 sm:gap-6">
              {stateDistributionData.map((item, index) => {
                const totalVolume = stateDistributionData.reduce((acc, curr) => acc + curr.count, 0);
                const percentage = totalVolume > 0 ? ((item.count / totalVolume) * 100).toFixed(1) : "0";

                const gradients = [
                  "from-indigo-600 via-indigo-700 to-indigo-800 shadow-indigo-200/50", // Indigo
                  "from-sky-500 via-sky-600 to-sky-700 shadow-sky-200/50", // Sky
                  "from-emerald-600 via-emerald-700 to-emerald-800 shadow-emerald-200/50", // Emerald
                  "from-amber-500 via-amber-600 to-amber-700 shadow-amber-200/50", // Amber
                  "from-rose-500 via-rose-600 to-rose-700 shadow-rose-200/50", // Red/Rose
                  "from-violet-600 via-violet-700 to-violet-800 shadow-violet-200/50", // Violet
                  "from-cyan-600 via-cyan-700 to-cyan-800 shadow-cyan-200/50", // Cyan
                  "from-fuchsia-600 via-fuchsia-700 to-fuchsia-800 shadow-fuchsia-200/50", // Pink/Fuchsia
                  "from-teal-600 via-teal-700 to-teal-800 shadow-teal-200/50", // Teal
                  "from-orange-500 via-orange-600 to-orange-700 shadow-orange-200/50", // Orange
                ];
                const gradient = gradients[index % gradients.length];

                return (
                  <Card
                    key={item.state}
                    className={cn(
                      "group relative border-none transition-all duration-500 shadow-lg hover:shadow-2xl hover:-translate-y-2 overflow-hidden flex flex-col justify-between min-h-[100px] sm:min-h-[150px] lg:min-h-[170px] bg-gradient-to-br",
                      gradient
                    )}
                  >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                      <Trophy className="w-8 h-8 sm:w-16 sm:h-16 text-white rotate-12" />
                    </div>

                    <CardHeader className="p-1.5 sm:p-4 lg:p-5 pb-0 relative z-10">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center justify-center min-w-5 h-5 sm:min-w-7 sm:h-7 px-1 sm:px-2 rounded-md sm:rounded-lg bg-white/20 backdrop-blur-md border border-white/20 group-hover:bg-white/30 transition-all duration-300">
                          <span className="text-[7px] sm:text-[10px] font-black text-white uppercase tracking-tighter">
                            {item.state === "Miscellaneous" ? "OTHER" : `Rank #${index + 1}`}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="px-1 sm:px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center gap-1 sm:gap-1.5">
                            <span className="text-[8px] sm:text-[11px] font-black text-white font-mono">{item.count.toLocaleString()}</span>
                            <span className="text-[6px] sm:text-[8px] text-white/60 font-bold uppercase tracking-widest">Units</span>
                          </div>
                          <div className="w-10 sm:w-14 h-1 sm:h-1.5 bg-black/20 rounded-full mt-1 sm:mt-2 overflow-hidden border border-white/5">
                            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      </div>
                      <CardTitle className="text-[9px] sm:text-base lg:text-lg font-black text-white uppercase tracking-tighter mt-2 sm:mt-4 lg:mt-5 group-hover:tracking-normal transition-all truncate drop-shadow-sm">
                        {item.state}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-1.5 sm:p-4 lg:p-5 pt-1 sm:pt-3 flex items-end justify-between relative z-10">
                      <div className="space-y-0">
                        <span className="text-xs sm:text-3xl lg:text-4xl font-black text-white tracking-widest leading-none block drop-shadow-md">
                          {percentage}%
                        </span>
                        <p className="text-[7px] sm:text-[10px] font-black text-white/60 uppercase tracking-widest">Market Share</p>
                      </div>

                      {/* Visual Signal Element */}
                      <div className="hidden sm:flex items-end gap-1 h-10 px-2 py-1 rounded-lg bg-black/10 backdrop-blur-sm border border-white/5">
                        {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
                          <div
                            key={i}
                            className="w-1.5 bg-white rounded-full transition-all duration-700 group-hover:opacity-100"
                            style={{
                              height: `${h * 100}%`,
                              opacity: 0.2 + (i * 0.15)
                            }}
                          />
                        ))}
                      </div>
                    </CardContent>

                    {/* Premium Glass Effect Reflection */}
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none opacity-50"></div>

                    {/* Subtle Grainy Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>


        {/* Current Month Enquiry Report Section */}
        <Card className="border-l-4 border-l-emerald-500 bg-white shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent border-b border-emerald-100 p-4 md:p-6">
            <div className="flex flex-col gap-4">
              {/* Top Row: Title & Month Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl shadow-sm">
                    <Database className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-tight">
                      {selectedMonth === "All Months"
                        ? "Overall Enquiry Report"
                        : `${format(new Date(selectedMonth + "-01"), "MMMM yyyy")} Enquiry Report`}
                    </CardTitle>
                    <CardDescription className="text-[11px] md:text-xs text-emerald-700/70 font-bold uppercase tracking-wider">
                      Aggregated enquiry volume by size and thickness
                    </CardDescription>
                  </div>
                </div>

                <div className="w-full sm:w-auto">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full sm:w-[160px] h-9 border-emerald-200 text-emerald-700 bg-white shadow-sm text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-50 transition-colors">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Months">All Months</SelectItem>
                      {(() => {
                        const months = []
                        const startDate = new Date(2025, 3, 1)
                        const currentDate = new Date()
                        for (let d = new Date(startDate); d <= currentDate; d.setMonth(d.getMonth() + 1)) {
                          const year = d.getFullYear()
                          const monthStr = (d.getMonth() + 1).toString().padStart(2, '0')
                          const value = `${year}-${monthStr}`
                          const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          months.push(<SelectItem key={value} value={value}>{label}</SelectItem>)
                        }
                        return months.reverse()
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bottom Row: Badges & Stats */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Badge className="bg-emerald-500 text-white border-none font-bold px-3 py-1.5 text-[10px] md:text-[11px] uppercase tracking-widest shadow-md">
                  {enquiryReport.length} ITEMS
                </Badge>

                {enquiryReport.length > 0 && (
                  <div className="flex items-center gap-3 bg-emerald-600 text-white px-4 py-1.5 rounded-full shadow-lg ml-0 sm:ml-auto">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-80">Total Volume</span>
                    <span className="text-sm md:text-base font-black font-mono">
                      {enquiryReport.reduce((acc, curr) => acc + Number(curr.total), 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="max-h-[650px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-100 relative">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-sm shadow-sm">
                  <TableRow className="hover:bg-transparent border-b-2 border-emerald-100">
                    <TableHead className="w-[60px] md:w-[80px] font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4 pl-6">S.No</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4">Item Type</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4">Size</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4 text-center">Thickness</TableHead>

                    <TableHead className="font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4 text-right pr-6">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEnquiry ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Report...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : enquiryReport.length > 0 ? (
                    enquiryReport.map((item, index) => {
                      const gradients = [
                        "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)",
                        "linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)"
                      ];
                      const rowGradient = gradients[index % gradients.length];

                      return (
                        <TableRow
                          key={index}
                          style={{ background: rowGradient }}
                          className="border-b border-white/10 group transition-none"
                        >
                          <TableCell className="font-bold text-white/90 py-2 sm:py-3 lg:py-5 pl-4 sm:pl-6 text-[10px] sm:text-xs">{index + 1}</TableCell>
                          <TableCell className="py-2 sm:py-3 lg:py-5">
                            <Badge variant="outline" className="font-black uppercase tracking-widest text-[8px] sm:text-[10px] md:text-xs border-white/40 text-white bg-white/10 px-1.5 sm:px-3 py-0.5 sm:py-1">
                              {item.item_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-black text-white py-2 sm:py-3 lg:py-5 text-[10px] sm:text-xs md:text-sm">{item.size}</TableCell>
                          <TableCell className="text-center py-2 sm:py-3 lg:py-5">
                            <span className="px-1.5 sm:px-3 py-0.5 sm:py-1.5 bg-white/95 border border-transparent rounded-md sm:rounded-lg font-mono font-bold text-slate-800 text-[10px] sm:text-[11px] md:text-sm shadow-md inline-block">
                              {item.thickness}
                            </span>
                          </TableCell>

                          <TableCell className="text-right py-2 sm:py-3 lg:py-5 pr-4 sm:pr-6">
                            <span className="font-black text-sm sm:text-base md:text-lg text-white font-mono tracking-tighter">
                              {Number(item.total).toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 py-10">
                          <div className="p-4 bg-slate-50 rounded-full">
                            <AlertCircle className="h-10 w-10 text-slate-300" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Records Found</p>
                            <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Try selecting a different month</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Top Value Cards Section - Wrapped in Scoresheet Card */}
        <Card className="w-full bg-white border-none shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-white border-b border-slate-100 p-2 sm:p-4 lg:py-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-5 sm:h-5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
              </div>
              <CardTitle className="text-xs sm:text-lg lg:text-xl font-black text-slate-800 tracking-tight">ScotSheet</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-1.5 sm:p-3 lg:p-6">
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-1 sm:gap-3 lg:gap-6">
              {/* Total Customers Card */}
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-md overflow-hidden relative group">
                <CardContent className="p-1.5 sm:p-3 lg:p-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-5 sm:h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </div>
                  <p className="text-[7px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-blue-100 leading-none mb-0.5">Total Customers</p>
                  <div className="text-[10px] sm:text-2xl lg:text-3xl font-black tracking-tighter">{totalCustomers.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Total Follow-ups Card */}
              <Card className="bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white border-none shadow-md overflow-hidden relative group">
                <CardContent className="p-1.5 sm:p-3 lg:p-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-5 sm:h-5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </div>
                  <p className="text-[7px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-purple-100 leading-none mb-0.5">Total Follow-ups</p>
                  <div className="text-[10px] sm:text-2xl lg:text-3xl font-black tracking-tighter">{followupStats.totalFollowUps.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Orders Booked Card */}
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-md overflow-hidden relative group">
                <CardContent className="p-1.5 sm:p-3 lg:p-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-5 sm:h-5"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p className="text-[7px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-emerald-100 leading-none mb-0.5">Orders Booked</p>
                  <div className="text-[10px] sm:text-2xl lg:text-3xl font-black tracking-tighter">{followupStats.ordersBooked.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Vehicles In Card */}
              <Card className="bg-gradient-to-br from-indigo-500 to-blue-700 text-white border-none shadow-md overflow-hidden relative group">
                <CardContent className="p-1.5 sm:p-3 lg:p-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-5 sm:h-5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 13.1V16c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>
                  </div>
                  <p className="text-[7px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-indigo-100 leading-none mb-0.5">Vehicles In</p>
                  <div className="text-[10px] sm:text-2xl lg:text-3xl font-black tracking-tighter">{displayMetrics.wbIn.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Vehicles Out Card */}
              <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none shadow-md overflow-hidden relative group">
                <CardContent className="p-1.5 sm:p-3 lg:p-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-5 sm:h-5"><path d="M10 17h4V5H2v12h3" /><path d="M20 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C19.7 10.6 17 10 17 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H10" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>
                  </div>
                  <p className="text-[7px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-orange-100 leading-none mb-0.5">Vehicles Out</p>
                  <div className="text-[10px] sm:text-2xl lg:text-3xl font-black tracking-tighter">{displayMetrics.wbOut.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Vehicles Pending Card */}
              <Card className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white border-none shadow-md overflow-hidden relative group">
                <CardContent className="p-1.5 sm:p-3 lg:p-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-5 sm:h-5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </div>
                  <p className="text-[7px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-amber-100 leading-none mb-0.5">In Premises</p>
                  <div className="text-[10px] sm:text-2xl lg:text-3xl font-black tracking-tighter">{displayMetrics.wbPending.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>


            {/* Sales Performance Report Section */}
            <div className='w-full'>
              <Card className="border-none shadow-lg overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-100 py-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
                        <Filter className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">Monthly MeCA Score</CardTitle>
                    </div>
                    <div>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200 font-bold text-slate-700">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All Months">All Months</SelectItem>
                          {
                            // Dynamic Month List - Last 12 months + typical range
                            Array.from({ length: 18 }, (_, i) => {
                              const d = new Date();
                              d.setMonth(d.getMonth() - i + 1); // +1 to include maybe future month or current
                              return format(d, "yyyy-MM");
                            }).map(m => (
                              <SelectItem key={m} value={m}>
                                {new Date(m).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] sm:text-xs text-white uppercase bg-blue-600 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider">Sales Person</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center">No of Callings</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center">Order Clients</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center whitespace-nowrap">Conv. Ratio</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center whitespace-nowrap">Total Sale</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center whitespace-nowrap">Avg Sale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salesPerformance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                              <div className="flex flex-col items-center justify-center p-4">
                                <div className="text-lg">No data available</div>
                                <div className="text-sm mt-1">Try selecting a different date range</div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <>
                            {salesPerformance.filter(row => row.salesPerson !== 'Total').map((row, idx) => {

                              const rowClass = idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";

                              // Generate avatar initials
                              const initials = row.salesPerson.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase();

                              // Determine avatar color
                              const avatarColor = idx % 3 === 0 ? "bg-blue-500" : idx % 3 === 1 ? "bg-purple-500" : "bg-indigo-500";

                              return (
                                <tr key={idx} className={`${rowClass} hover:bg-emerald-50/80 transition-colors text-[8px] sm:text-[10px]`}>
                                  <td className="px-2 sm:px-4 md:px-6 py-1 sm:py-1.5 font-medium flex items-center gap-1.5 sm:gap-2">
                                    <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full ${avatarColor} flex items-center justify-center text-white text-[7px] sm:text-[9px] font-bold shadow-sm shrink-0`}>
                                      {initials}
                                    </div>
                                    <span className="truncate max-w-[70px] sm:max-w-none">{row.salesPerson}</span>
                                  </td>
                                  <td className="px-2 sm:px-4 md:px-6 py-1 sm:py-2.5 text-center">{row.noOfCallings}</td>
                                  <td className="px-2 sm:px-4 md:px-6 py-1 sm:py-2.5 text-center">{row.orderClients}</td>
                                  <td className="px-2 sm:px-4 md:px-6 py-1 sm:py-2.5 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-slate-700 font-bold">{row.conversionRatio}%</span>
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-4 md:px-6 py-1 sm:py-2.5 text-center font-mono text-slate-700">
                                    {row.totalRsSale ? Number(row.totalRsSale).toLocaleString() : '0'}
                                  </td>
                                  <td className="px-2 sm:px-4 md:px-6 py-1 sm:py-2.5 text-center font-mono">
                                    <span className={`${parseFloat(row.avgRsSale) > 50 ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                                      {row.avgRsSale}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}

                            {/* Total Row */}
                            {(() => {
                              const dataRows = salesPerformance.filter(row => row.salesPerson !== 'Total');
                              if (dataRows.length === 0) return null;

                              const totalCallings = dataRows.reduce((sum, row) => sum + Number(row.noOfCallings || 0), 0);
                              const totalOrderClients = dataRows.reduce((sum, row) => sum + Number(row.orderClients || 0), 0);
                              const totalRsSale = dataRows.reduce((sum, row) => sum + Number(row.totalRsSale || 0), 0);

                              const totalConversionRatio = totalCallings > 0 ? ((totalOrderClients / totalCallings) * 100).toFixed(2) : '0.00';
                              // Avg Sale for Total = Total Sale / Total Order Clients
                              const totalAvgSale = totalOrderClients > 0 ? (totalRsSale / totalOrderClients).toFixed(2) : '0.00';

                              return (
                                <tr className="bg-yellow-50 font-bold border-t-2 border-yellow-200 hover:bg-yellow-100/80 transition-colors text-[9px] sm:text-sm">
                                  <td className="px-3 sm:px-6 py-2 sm:py-3 font-medium flex items-center gap-1.5 sm:gap-3">
                                    <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white text-[8px] sm:text-xs font-bold shadow-sm">
                                      Σ
                                    </div>
                                    <span className="text-yellow-700">TOTAL</span>
                                  </td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-yellow-700">{totalCallings}</td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-yellow-700">{totalOrderClients}</td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-yellow-700 font-bold">{totalConversionRatio}%</span>
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center font-mono text-yellow-700">
                                    {Number(totalRsSale).toLocaleString()}
                                  </td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center font-mono">
                                    <span className="text-yellow-700 font-bold">{totalAvgSale}</span>
                                  </td>
                                </tr>
                              );
                            })()}

                            {/* Average Row */}
                            {(() => {
                              // Filter out the Total row for average calculation
                              const dataRows = salesPerformance.filter(row => row.salesPerson !== 'Total');
                              if (dataRows.length === 0) return null;

                              const avgCallingsValue = dataRows.reduce((sum, row) => sum + Number(row.noOfCallings || 0), 0) / dataRows.length;
                              const avgOrderClientsValue = dataRows.reduce((sum, row) => sum + Number(row.orderClients || 0), 0) / dataRows.length;
                              const avgCallings = avgCallingsValue.toFixed(1);
                              const avgOrderClients = avgOrderClientsValue.toFixed(1);
                              const avgConversionRatio = (dataRows.reduce((sum, row) => sum + parseFloat(row.conversionRatio || '0'), 0) / dataRows.length).toFixed(2);
                              const avgTotalRsSaleValue = dataRows.reduce((sum, row) => sum + Number(row.totalRsSale || 0), 0) / dataRows.length;
                              const avgTotalRsSale = avgTotalRsSaleValue.toFixed(0);
                              // Average Rs Sale = Average Total Rs Sale / Average Order Clients
                              const avgAvgRsSale = avgOrderClientsValue > 0 ? (avgTotalRsSaleValue / avgOrderClientsValue).toFixed(2) : '0.00';

                              return (
                                <tr className="bg-purple-50 font-bold border-t-2 border-purple-200 hover:bg-purple-100/80 transition-colors text-[9px] sm:text-sm">
                                  <td className="px-3 sm:px-6 py-2 sm:py-3 font-medium flex items-center gap-1.5 sm:gap-3">
                                    <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-[8px] sm:text-xs font-bold shadow-sm">
                                      ø
                                    </div>
                                    <span className="text-purple-700">AVERAGE</span>
                                  </td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-purple-700">{avgCallings}</td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-purple-700">{avgOrderClients}</td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-purple-700 font-bold">{avgConversionRatio}%</span>
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center font-mono text-purple-700">
                                    {Number(avgTotalRsSale).toLocaleString()}
                                  </td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center font-mono">
                                    <span className="text-purple-700 font-bold">{avgAvgRsSale}</span>
                                  </td>
                                </tr>
                              );
                            })()}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Statistics Tables - Excel Format */}
                  {salesPerformance.length > 0 && (() => {
                    const dataRows = salesPerformance.filter(row => row.salesPerson !== 'Total');
                    if (dataRows.length === 0) return null;

                    // Calculate statistics
                    const totalCallings = dataRows.reduce((sum, row) => sum + Number(row.noOfCallings || 0), 0);

                    // Get number of days to divide by
                    let daysDivisor = 30; // default
                    if (selectedMonth !== "All Months") {
                      const [year, month] = selectedMonth.split('-').map(Number);
                      const now = new Date();
                      // If selected month is current month, use today's date
                      if (year === now.getFullYear() && month === (now.getMonth() + 1)) {
                        daysDivisor = now.getDate();
                      } else {
                        daysDivisor = new Date(year, month, 0).getDate();
                      }
                    }

                    const avgCallPerDayValue = totalCallings / daysDivisor;
                    const avgCallPerDayRounded = Math.ceil(avgCallPerDayValue);
                    const avgCallPerDay = avgCallPerDayRounded.toFixed(2);
                    // Average Call Per Person = Average Call Per Day (Rounded) / Number of Sales Persons
                    const avgCallPerPerson = (avgCallPerDayRounded / dataRows.length).toFixed(2);

                    return (
                      <div className="mt-6 px-6 pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          {/* Avg Call / Day */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 transition-colors rounded-lg px-3 sm:px-5 py-2.5 sm:py-3 border border-green-600">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">📊</div>
                              <span className="font-bold text-white text-[11px] sm:text-sm whitespace-nowrap">Avg Call / Day</span>
                            </div>
                            <span className="font-black text-white text-sm sm:text-lg font-mono">{avgCallPerDay}</span>
                          </div>

                          {/* Avg Call / Person */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 transition-colors rounded-lg px-3 sm:px-5 py-2.5 sm:py-3 border border-green-600">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">👥</div>
                              <span className="font-bold text-white text-[11px] sm:text-sm whitespace-nowrap">Avg Call / Person</span>
                            </div>
                            <span className="font-black text-white text-sm sm:text-lg font-mono">{avgCallPerPerson}</span>
                          </div>

                          {/* Total Calling */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 transition-colors rounded-lg px-3 sm:px-5 py-2.5 sm:py-3 border-2 border-yellow-600 shadow-lg">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-800/20 flex items-center justify-center text-slate-800 text-[10px] sm:text-xs font-bold">📞</div>
                              <span className="font-bold text-slate-800 text-[11px] sm:text-sm whitespace-nowrap">Total Calling</span>
                            </div>
                            <span className="font-black text-slate-800 text-base sm:text-xl font-mono">{totalCallings.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Daily Sales Performance Report Section */}
            <div className='w-full mt-8'>
              <Card className="border-none shadow-lg overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-100 py-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-200">
                        <Filter className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">Daily MeCA Score</CardTitle>
                    </div>
                    <div className="bg-slate-100 px-4 py-2 rounded-lg font-bold text-slate-600 text-sm">
                      {format(new Date(), "dd MMMM yyyy")}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] sm:text-xs text-white uppercase bg-emerald-600 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider">Sales Person</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center">No of Callings</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center">Order Clients</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center whitespace-nowrap">Conv. Ratio</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center whitespace-nowrap">Total Sale</th>
                          <th scope="col" className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 font-bold tracking-wider text-center whitespace-nowrap">Avg Sale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailySalesPerformance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                              <div className="flex flex-col items-center justify-center p-4">
                                <div className="text-lg">No data available for today</div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          dailySalesPerformance.filter(row => row.salesPerson !== 'Total').map((row, idx) => {

                            const rowClass = idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";

                            // Generate avatar initials
                            const initials = row.salesPerson.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase();

                            // Determine avatar color
                            const avatarColor = idx % 3 === 0 ? "bg-emerald-500" : idx % 3 === 1 ? "bg-teal-500" : "bg-green-500";

                            return (
                              <tr key={idx} className={`${rowClass} hover:bg-emerald-50/80 transition-colors text-[9px] sm:text-sm`}>
                                <td className="px-2 sm:px-4 md:px-6 py-1.5 sm:py-4 font-medium flex items-center gap-1.5 sm:gap-3">
                                  <div className={`w-5 h-5 sm:w-8 sm:h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-[8px] sm:text-xs font-bold shadow-sm shrink-0`}>
                                    {initials}
                                  </div>
                                  <span className="truncate max-w-[70px] sm:max-w-none">{row.salesPerson}</span>
                                </td>
                                <td className="px-2 sm:px-4 md:px-6 py-1.5 sm:py-4 text-center">{row.noOfCallings}</td>
                                <td className="px-2 sm:px-4 md:px-6 py-1.5 sm:py-4 text-center">{row.orderClients}</td>
                                <td className="px-2 sm:px-4 md:px-6 py-1.5 sm:py-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="text-slate-700 font-bold">{row.conversionRatio}%</span>
                                  </div>
                                </td>
                                <td className="px-2 sm:px-4 md:px-6 py-1.5 sm:py-4 text-center font-mono text-slate-700">
                                  {row.totalRsSale ? Number(row.totalRsSale).toLocaleString() : '0'}
                                </td>
                                <td className="px-2 sm:px-4 md:px-6 py-1.5 sm:py-4 text-center font-mono">
                                  <span className={`${parseFloat(row.avgRsSale) > 50 ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                                    {row.avgRsSale}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                        {/* Total Row */}
                        {dailySalesPerformance.length > 0 && (() => {
                          // Filter out the Total row for total calculation
                          const dataRows = dailySalesPerformance.filter(row => row.salesPerson !== 'Total');
                          if (dataRows.length === 0) return null;

                          const totalCallings = dataRows.reduce((sum, row) => sum + Number(row.noOfCallings || 0), 0);
                          const totalOrderClients = dataRows.reduce((sum, row) => sum + Number(row.orderClients || 0), 0);
                          const totalConversionRatio = totalCallings > 0 ? ((totalOrderClients / totalCallings) * 100).toFixed(2) : '0.00';
                          const totalTotalRsSale = dataRows.reduce((sum, row) => sum + Number(row.totalRsSale || 0), 0);
                          const totalAvgRsSale = totalOrderClients > 0 ? (totalTotalRsSale / totalOrderClients).toFixed(2) : '0.00';

                          return (
                            <tr className="bg-emerald-50 font-bold border-t-2 border-emerald-200 hover:bg-emerald-100/80 transition-colors text-[9px] sm:text-sm">
                              <td className="px-3 sm:px-6 py-2 sm:py-4 font-medium flex items-center gap-1.5 sm:gap-3">
                                <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[8px] sm:text-xs font-bold shadow-sm">
                                  Σ
                                </div>
                                <span className="text-emerald-700">TOTAL</span>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center text-emerald-700 font-bold">{totalCallings}</td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center text-emerald-700 font-bold">{totalOrderClients}</td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-emerald-700 font-bold">{totalConversionRatio}%</span>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center font-mono text-emerald-700 font-bold">
                                {Number(totalTotalRsSale).toLocaleString()}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center font-mono">
                                <span className="text-emerald-700 font-bold">{totalAvgRsSale}</span>
                              </td>
                            </tr>
                          );
                        })()}

                        {/* Average Row */}
                        {dailySalesPerformance.length > 0 && (() => {
                          const dataRows = dailySalesPerformance.filter(row => row.salesPerson !== 'Total');
                          if (dataRows.length === 0) return null;

                          const avgCallings = (dataRows.reduce((sum, row) => sum + Number(row.noOfCallings || 0), 0) / dataRows.length).toFixed(1);
                          const avgOrderClients = (dataRows.reduce((sum, row) => sum + Number(row.orderClients || 0), 0) / dataRows.length).toFixed(1);
                          const avgConversionRatio = (dataRows.reduce((sum, row) => sum + parseFloat(row.conversionRatio || '0'), 0) / dataRows.length).toFixed(2);
                          const avgTotalRsSale = (dataRows.reduce((sum, row) => sum + Number(row.totalRsSale || 0), 0) / dataRows.length).toFixed(0);
                          const avgAvgRsSale = (dataRows.reduce((sum, row) => sum + parseFloat(row.avgRsSale || '0'), 0) / dataRows.length).toFixed(2);

                          return (
                            <tr className="bg-teal-50 font-bold border-t-2 border-teal-200 hover:bg-teal-100/80 transition-colors text-[9px] sm:text-sm">
                              <td className="px-3 sm:px-6 py-2 sm:py-3 font-medium flex items-center gap-1.5 sm:gap-3">
                                <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-[8px] sm:text-xs font-bold shadow-sm">
                                  ø
                                </div>
                                <span className="text-teal-700">AVERAGE</span>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-teal-700">{avgCallings}</td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-teal-700">{avgOrderClients}</td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-teal-700 font-bold">{avgConversionRatio}%</span>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center font-mono text-teal-700">
                                {Number(avgTotalRsSale).toLocaleString()}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center font-mono">
                                <span className="text-teal-700 font-bold">{avgAvgRsSale}</span>
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Daily Summary Statistics Tables */}
                  {dailySalesPerformance.length > 0 && (() => {
                    const dataRows = dailySalesPerformance.filter(row => row.salesPerson !== 'Total');
                    if (dataRows.length === 0) return null;

                    const totalCallings = dataRows.reduce((sum, row) => sum + Number(row.noOfCallings || 0), 0);
                    const avgCallPerPerson = (totalCallings / dataRows.length).toFixed(2);

                    return (
                      <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-4 px-6 pb-6">
                        <div className="flex-1 overflow-x-auto">
                          <table className="w-full text-[11px] sm:text-xs md:text-sm">
                            <tbody>
                              <tr className="bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 transition-colors shadow-sm">
                                <td className="px-3 sm:px-6 py-2 sm:py-3 font-bold text-white border border-emerald-600 rounded-l-lg">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">
                                      👤
                                    </div>
                                    <span className="whitespace-nowrap">Avg Call / Person</span>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-2 sm:py-3 font-black text-white text-right border border-emerald-600 rounded-r-lg text-sm sm:text-lg font-mono">
                                  {avgCallPerPerson}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                          <table className="w-full text-[11px] sm:text-xs md:text-sm">
                            <tbody>
                              <tr className="bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 transition-colors shadow-lg">
                                <td className="px-3 sm:px-6 py-3 sm:py-3.5 font-bold text-white border border-teal-600 rounded-l-lg">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">
                                      📞
                                    </div>
                                    <span className="whitespace-nowrap uppercase tracking-wider">Today's Total Calling</span>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-3.5 font-black text-white text-right border border-teal-600 rounded-r-lg text-base sm:text-lg font-mono">
                                  {totalCallings.toLocaleString()}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Customer Feedback Section - Tabular Format */}
        <div className="mt-6 sm:mt-10 space-y-2 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 px-1">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-md sm:shadow-lg shadow-orange-100">
                <MessageSquare className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xs sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 sm:gap-3">
                  CUSTOMER FEEDBACK
                  <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[8px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 uppercase rounded-full">
                    {customerFeedback.length} REVIEWS
                  </Badge>
                </h2>
                <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                  <span className="flex w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[7px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Real-time Feedback & Testimonials</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => fetchCustomerFeedback()}
              variant="outline"
              className="group flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 border border-slate-200 hover:border-orange-200 hover:bg-orange-50/30 text-slate-600 rounded-lg text-[9px] sm:text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:rotate-180 transition-transform duration-500", loadingFeedback && "animate-spin")} />
              Sync Live Sheet
            </Button>
          </div>

          {/* Mobile View - Cards */}
          <div className="sm:hidden space-y-4 px-1 pb-10">
            {loadingFeedback ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[24px] p-6 border border-slate-100 animate-pulse space-y-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-slate-100 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                  </div>
                  <div className="h-16 bg-slate-50 rounded-2xl"></div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div key={j} className="h-4 bg-slate-100 rounded w-full"></div>
                    ))}
                  </div>
                </div>
              ))
            ) : customerFeedback.length > 0 ? (
              customerFeedback.map((item, index) => {
                let dateDisplay = "N/A";
                try {
                  if (item.timestamp) {
                    const d = new Date(item.timestamp);
                    if (!isNaN(d.getTime())) {
                      dateDisplay = format(d, 'dd/MM/yyyy HH:mm');
                    }
                  }
                } catch (e) { }

                const isEven = index % 2 === 0;

                return (
                  <div
                    key={index}
                    className={cn(
                      "rounded-[24px] p-6 shadow-xl space-y-5 relative overflow-hidden text-white border-none",
                      isEven
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-100"
                        : "bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-emerald-100"
                    )}
                  >
                    {/* Header: S.No and Date */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-white/40">#{index + 1}</span>
                      <span className="w-2 h-2 rounded-full bg-white/90 shadow-sm shadow-white/20 animate-pulse"></span>
                      <span className="text-[10px] font-black text-white/70 tracking-[0.1em]">{dateDisplay}</span>
                    </div>

                    {/* Customer & Firm */}
                    <div className="space-y-1">
                      <h3 className="text-lg font-[900] text-white uppercase tracking-tight leading-none">{item.customer_name}</h3>
                      <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{item.firm_name}</p>
                    </div>

                    {/* Feedback Textbox */}
                    {item.additional_feedback && (
                      <div className="bg-white/10 backdrop-blur-md rounded-[20px] p-4 border border-white/10">
                        <p className="text-[12px] text-white font-black italic leading-relaxed text-center">
                          "{item.additional_feedback}"
                        </p>
                      </div>
                    )}

                    {/* Rating Grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-2">
                      {["Enquiry", "Loading", "Dispatch", "Lineup", "Comm.", "Product", "Staff", "Quality"].map((cat) => {
                        const val = item.categoryRatings?.[cat] || 0;
                        return (
                          <div key={cat} className="flex items-center justify-between gap-1">
                            <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.1em]">{cat}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "w-2.5 h-2.5",
                                    i < val ? "fill-white text-white" : "text-white/20"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Feedback Records Found</p>
              </div>
            )}
          </div>

          {/* Desktop View - Tabular Format */}
          <div className="hidden sm:block overflow-x-auto max-h-[700px] overflow-y-auto">
            <Table className="min-w-[900px]">
              <TableHeader className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-sm shadow-sm border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="py-2 px-1 sm:py-4 sm:px-3 text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">S.No</TableHead>
                  <TableHead className="py-2 px-1.5 sm:py-4 sm:px-4 text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Date</TableHead>
                  <TableHead className="py-2 px-1.5 sm:py-4 sm:px-4 text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="py-2 px-1.5 sm:py-4 sm:px-4 text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Firm</TableHead>
                  <TableHead className="py-2 px-1.5 sm:py-4 sm:px-4 text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Feedback</TableHead>
                  {["Enquiry", "Loading", "Dispatch", "Lineup", "Comm.", "Product", "Staff", "Quality"].map((cat) => (
                    <TableHead key={cat} className="py-2 px-1 sm:py-4 sm:px-2 text-[6px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">{cat}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-50">
                {loadingFeedback ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={13} className="py-6 sm:py-10 bg-slate-50/20"></TableCell>
                    </TableRow>
                  ))
                ) : customerFeedback.length > 0 ? (
                  customerFeedback.map((item, index) => {
                    let dateDisplay = "N/A";
                    try {
                      if (item.timestamp) {
                        const d = new Date(item.timestamp);
                        if (!isNaN(d.getTime())) {
                          dateDisplay = format(d, 'dd/MM/yyyy HH:mm');
                        }
                      }
                    } catch (e) {
                      console.error("Date parse error:", e);
                    }

                    return (
                      <TableRow key={index} className="hover:bg-slate-50/40 transition-colors border-slate-50 group">
                        <TableCell className="py-1.5 px-1 sm:py-3 sm:px-3 text-center">
                          <span className="text-[8px] sm:text-xs font-black text-slate-400">{index + 1}</span>
                        </TableCell>
                        <TableCell className="py-1.5 px-1.5 sm:py-3 sm:px-4">
                          <p className="text-[8px] sm:text-[11px] font-bold text-slate-500 whitespace-nowrap">{dateDisplay}</p>
                        </TableCell>
                        <TableCell className="py-1.5 px-1.5 sm:py-3 sm:px-4">
                          <p className="text-[8px] sm:text-xs font-black text-slate-800 uppercase tracking-tight">{item.customer_name}</p>
                        </TableCell>
                        <TableCell className="py-1.5 px-1.5 sm:py-3 sm:px-4">
                          <p className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase truncate max-w-[80px] sm:max-w-[150px]">{item.firm_name}</p>
                        </TableCell>
                        <TableCell className="py-1.5 px-1.5 sm:py-3 sm:px-4 text-center">
                          <p className="text-[7px] sm:text-[11px] text-slate-800 font-bold italic leading-snug line-clamp-2 max-w-[100px] sm:max-w-[200px] mx-auto">
                            {item.additional_feedback}
                          </p>
                        </TableCell>
                        {["Enquiry", "Loading", "Dispatch", "Lineup", "Comm.", "Product", "Staff", "Quality"].map((cat) => {
                          const val = item.categoryRatings?.[cat] || 0;
                          return (
                            <TableCell key={cat} className="py-1.5 px-0.5 sm:py-3 sm:px-1 text-center">
                              <div className="flex items-center justify-center gap-0">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={cn("w-2 h-2 sm:w-3 sm:h-3", i < val ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                                ))}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="py-16 sm:py-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <MessageSquare className="w-10 h-10 sm:w-20 sm:h-20 text-slate-100 mb-3 sm:mb-6" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] sm:text-sm">No Feedback Records Found</p>
                        <Button onClick={() => fetchCustomerFeedback()} variant="link" className="text-orange-500 font-black uppercase tracking-widest text-[8px] sm:text-[10px] mt-2 sm:mt-4">
                          Retry Connecting to Sheets
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 px-1">
            <p className="text-[8px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Showing {customerFeedback.length} Client Reviews
            </p>
            <p className="text-[8px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-wider">● Live Sync</p>
          </div>
        </div>

      </>
    </div>
  )
}
