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
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { cn } from "../../lib/utils"
import * as o2dAPI from "../../api/o2dAPI";
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
  stateDistribution?: Array<{ STATE_NAME: string; TOTAL: number }>
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

type PerformanceRow = {
  salesPerson?: string | null
  noOfCallings?: number | string | null
  orderClients?: number | string | null
  conversionRatio?: number | string | null
  totalRsSale?: number | string | null
  avgRsSale?: number | string | null
}

const PERFORMANCE_SUMMARY_LABELS = new Set(["total", "average", "avg"])

function getPerformanceDataRows(rows: PerformanceRow[] = []) {
  return rows.filter((row) => {
    const salesPerson = String(row.salesPerson || "").trim().toLowerCase()
    return salesPerson !== "" && !PERFORMANCE_SUMMARY_LABELS.has(salesPerson)
  })
}

function getPerformanceSummary(rows: PerformanceRow[] = []) {
  const dataRows = getPerformanceDataRows(rows)
  const personCount = dataRows.length
  const totalCallings = dataRows.reduce((sum, row) => sum + Number(row.noOfCallings || 0), 0)
  const totalOrderClients = dataRows.reduce((sum, row) => sum + Number(row.orderClients || 0), 0)
  const totalRsSale = dataRows.reduce((sum, row) => sum + Number(row.totalRsSale || 0), 0)
  const totalConversionRatio = totalCallings > 0 ? ((totalOrderClients / totalCallings) * 100).toFixed(2) : "0.00"
  const totalAvgSale = totalOrderClients > 0 ? (totalRsSale / totalOrderClients).toFixed(2) : "0.00"
  const avgCallings = personCount > 0 ? (totalCallings / personCount).toFixed(2) : "0.00"
  const avgCallingsPerPerson = personCount > 0 ? (Number(avgCallings) / personCount).toFixed(2) : "0.00"
  const avgOrderClients = personCount > 0 ? (totalOrderClients / personCount).toFixed(1) : "0.0"
  const avgConversionRatio = personCount > 0
    ? (dataRows.reduce((sum, row) => sum + parseFloat(String(row.conversionRatio || "0")), 0) / personCount).toFixed(2)
    : "0.00"
  const avgTotalRsSale = personCount > 0 ? (totalRsSale / personCount).toFixed(0) : "0"
  const avgAvgRsSale = personCount > 0
    ? (dataRows.reduce((sum, row) => sum + parseFloat(String(row.avgRsSale || "0")), 0) / personCount).toFixed(2)
    : "0.00"

  return {
    dataRows,
    personCount,
    totalCallings,
    totalOrderClients,
    totalRsSale,
    totalConversionRatio,
    totalAvgSale,
    avgCallings,
    avgCallingsPerPerson,
    avgOrderClients,
    avgConversionRatio,
    avgTotalRsSale,
    avgAvgRsSale,
  }
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
  const currentEnquiryMonth = format(new Date(), "yyyy-MM")

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
  const monthlyPerformanceSummary = useMemo(
    () => getPerformanceSummary(salesPerformance),
    [salesPerformance]
  )
  const [deliveryStats, setDeliveryStats] = useState<{ monthly: any; daily: any } | null>(null)
  const [salespersonDeliveryStats, setSalespersonDeliveryStats] = useState<Record<string, any>>({})
  const dailyPerformanceSummary = useMemo(
    () => getPerformanceSummary(dailySalesPerformance),
    [dailySalesPerformance]
  )

  const getFeedbackTimestampMs = useCallback((value: unknown): number => {
    if (value == null) return 0;

    if (typeof value === "number") {
      if (value > 1_000_000_000_000) return value;
      if (value > 1_000_000_000) return value * 1000;
      return 0;
    }

    const raw = String(value).trim();
    if (!raw) return 0;

    const isoParsed = parseISO(raw);
    if (!Number.isNaN(isoParsed.getTime())) {
      return isoParsed.getTime();
    }

    const nativeParsed = Date.parse(raw);
    if (!Number.isNaN(nativeParsed)) {
      return nativeParsed;
    }

    // Fallback for DD/MM/YYYY style timestamps from sheets.
    const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!match) return 0;

    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const yearRaw = Number(match[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const hour = Number(match[4] || 0);
    const minute = Number(match[5] || 0);
    const second = Number(match[6] || 0);

    const parsed = new Date(year, month, day, hour, minute, second);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }, []);

  const fetchEnquiryReport = async () => {
    setLoadingEnquiry(true)
    try {
      const response = await o2dAPI.getCurrentMonthEnquiryReport(currentEnquiryMonth)
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

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

      const sortedFeedback = [...formattedData].sort((a, b) => {
        const aTs = getFeedbackTimestampMs(a.timestamp);
        const bTs = getFeedbackTimestampMs(b.timestamp);
        const aIsToday = aTs >= startOfToday && aTs < endOfToday ? 1 : 0;
        const bIsToday = bTs >= startOfToday && bTs < endOfToday ? 1 : 0;

        if (aIsToday !== bIsToday) {
          return bIsToday - aIsToday;
        }
        return bTs - aTs;
      });

      setFeedbackStats(stats);
      setCustomerFeedback(sortedFeedback);
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
        amount: "â‚¹0",
        balanceAmount: "â‚¹0",
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
    if (!data?.summary?.stateDistribution) return [];

    const stateData = data.summary.stateDistribution.map((item: any) => ({
      state: item.STATE_NAME && item.STATE_NAME.trim() !== '' ? item.STATE_NAME.trim() : 'UNKNOWN',
      count: item.TOTAL || 0,
    }));

    const totalCount = stateData.reduce((acc: number, curr: any) => acc + curr.count, 0);
    if (totalCount === 0) return [];

    const result: { state: string; count: number }[] = [];
    let miscCount = 0;

    stateData.forEach((entry: any) => {
      const percentage = (entry.count / totalCount) * 100;
      if (percentage < 2) {
        miscCount += entry.count;
      } else {
        result.push(entry);
      }
    });

    if (miscCount > 0) {
      result.push({ state: "Others", count: miscCount });
    }

    return result;
  }, [data?.summary?.stateDistribution]);

  const feedbackCategorySummary = useMemo(() => {
    const categories = ["Enquiry", "Loading", "Dispatch", "Lineup", "Comm.", "Product", "Staff", "Quality"];
    const totals: Record<string, number> = Object.fromEntries(categories.map((cat) => [cat, 0]));

    customerFeedback.forEach((entry) => {
      categories.forEach((cat) => {
        const value = Number(entry?.categoryRatings?.[cat] || 0);
        if (Number.isFinite(value)) totals[cat] += value;
      });
    });

    const totalReviews = customerFeedback.length;
    return categories.map((cat) => ({
      name: cat,
      count: totals[cat],
      avg: totalReviews > 0 ? Number((totals[cat] / totalReviews).toFixed(1)) : 0,
    }));
  }, [customerFeedback]);

  const mobileStateShareData = useMemo(() => {
    const mobileStatePieColors = [
      "#4f46e5",
      "#0ea5e9",
      "#059669",
      "#f59e0b",
      "#e11d48",
      "#7c3aed",
      "#0891b2",
      "#c026d3",
      "#0d9488",
      "#ea580c",
    ];

    const totalVolume = stateDistributionData.reduce((acc, curr) => acc + curr.count, 0);
    return stateDistributionData.map((entry, index) => ({
      name: entry.state,
      value: entry.count,
      percentage: totalVolume > 0 ? Number(((entry.count / totalVolume) * 100).toFixed(1)) : 0,
      fill: mobileStatePieColors[index % mobileStatePieColors.length],
    }));
  }, [stateDistributionData]);

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
              <div class="kpi-card"><div class="kpi-label">Sauda Avg (${metrics.activeItemName})</div><div class="kpi-value">â‚¹${metrics.saudaAvg}</div></div>
              <div class="kpi-card"><div class="kpi-label">Sales Avg (${metrics.activeItemName})</div><div class="kpi-value">â‚¹${metrics.salesAvg}</div></div>
              <div class="kpi-card"><div class="kpi-label">Sauda Rate (2026)</div><div class="kpi-value">â‚¹${metrics.saudaRate2026}</div></div>
              <div class="kpi-card"><div class="kpi-label">Monthly GD</div><div class="kpi-value">â‚¹${metrics.monthlyGd}</div></div>
              <div class="kpi-card"><div class="kpi-label">Daily GD</div><div class="kpi-value">â‚¹${metrics.dailyGd}</div></div>
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
    <div className="relative w-full max-w-full min-w-0 overflow-x-hidden overflow-x-clip overscroll-x-none touch-pan-y space-y-2 sm:space-y-4 p-2 sm:p-4 lg:p-8 bg-white min-h-screen font-sans" ref={dashboardRef}>
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 sm:mb-2">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-4 lg:gap-6">
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

        {/* Unified Metrics Grid - 15 cards that flow automatically */}
        <div className="mb-2 sm:mb-6">
          {(() => {
            const stripCommas = (val: string | number) => String(val ?? "").replace(/,/g, "");
            const saudaValueColors = ["text-indigo-700", "text-orange-600", "text-cyan-700"];
            const salesValueColors = ["text-emerald-600", "text-slate-800", "text-pink-600"];
            const desktopGradients = [
              "from-indigo-500 to-blue-600",
              "from-red-500 to-orange-600",
              "from-teal-500 to-cyan-600",
              "from-green-600 to-emerald-700",
              "from-slate-700 to-slate-900",
              "from-pink-500 to-fuchsia-600",
              "from-violet-500 to-indigo-600",
              "from-pink-500 to-rose-600",
              "from-indigo-400 to-violet-600",
              "from-green-500 to-emerald-600",
              "from-orange-500 to-amber-500",
              "from-cyan-500 to-teal-500",
              "from-emerald-500 to-teal-600",
              "from-teal-500 to-green-700",
              "from-fuchsia-500 to-pink-600",
            ];

            const rows = [
              ...itemAverages.map((itemData, index) => ({
                label: `Sauda - ${itemData.item}`,
                value: stripCommas(formatMetricValue(itemData.saudaAvg)),
                valueColor: saudaValueColors[index],
              })),
              ...itemAverages.map((itemData, index) => ({
                label: `Sales - ${itemData.item}`,
                value: stripCommas(formatMetricValue(itemData.salesAvg)),
                valueColor: salesValueColors[index],
              })),
              { label: "Sauda Rate", value: stripCommas(`${formatMetricValue(displayMetrics.saudaRate2026)}`), valueColor: "text-indigo-700" },
              { label: "Monthly Late", value: deliveryStats?.monthly?.score ?? "0%", valueColor: "text-rose-600" },
              { label: "Daily Late", value: deliveryStats?.daily?.score ?? "0%", valueColor: "text-violet-700" },
              { label: "Monthly GD", value: stripCommas(`${formatMetricValue(displayMetrics.monthlyGd)}`), valueColor: "text-emerald-700" },
              { label: "Daily GD", value: stripCommas(`${formatMetricValue(displayMetrics.dailyGd)}`), valueColor: "text-orange-600" },
              { label: "Working Party", value: stripCommas(formatMetricValue(displayMetrics.monthlyWorkingParty)), valueColor: "text-cyan-700" },
              { label: "Party Average", value: displayMetrics.monthlyPartyAverage, valueColor: "text-teal-700" },
              { label: "Parties Pending", value: stripCommas(formatMetricValue(displayMetrics.pendingOrdersTotal)), valueColor: "text-green-700" },
              { label: "Conversion Ratio", value: displayMetrics.conversionRatio, valueColor: "text-pink-600" },
            ];

            const getDesktopLabel = (label: string) => {
              if (label.startsWith("Sauda - ")) {
                return { top: label.replace("Sauda - ", "").toUpperCase(), sub: "SAUDA AVG" };
              }
              if (label.startsWith("Sales - ")) {
                return { top: label.replace("Sales - ", "").toUpperCase(), sub: "SALES AVG" };
              }
              return { top: label.toUpperCase(), sub: "" };
            };

            return (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px sm:gap-2">
                {rows.map((metric, idx) => {
                  const label = getDesktopLabel(metric.label);
                  return (
                    <Card
                      key={`d-${metric.label}-${idx}`}
                      className={cn(
                        "border-none rounded-md sm:rounded-xl shadow-md text-white overflow-hidden bg-gradient-to-br",
                        desktopGradients[idx % desktopGradients.length]
                      )}
                    >
                      <CardContent className="p-0.5 sm:p-2 md:p-3 min-h-[72px] sm:min-h-[110px] md:min-h-[124px] flex flex-col items-center justify-center text-center">
                        <p className="text-[11px] sm:text-[11px] font-black uppercase tracking-wide leading-tight">
                          {label.top}
                        </p>
                        {label.sub ? (
                          <p className="text-[10px] sm:text-xs font-bold uppercase text-white/90 leading-none mt-0.5">
                            {label.sub}
                          </p>
                        ) : (
                          <div className="h-[12px] sm:h-[16px]" />
                        )}
                        <div className="text-[18px] sm:text-[30px] md:text-[46px] font-black leading-none mt-1">
                          {metric.value}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Salesperson Performance Analytics - Unified Master View */}
        <div className="space-y-1 mb-4 sm:mb-6 overflow-visible sm:overflow-hidden bg-transparent sm:bg-slate-50 p-0 sm:p-3 rounded-none sm:rounded-2xl border-0 sm:border sm:border-slate-200">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            </div>
            <h2 className="min-w-0 text-base sm:text-xl font-bold text-slate-800 tracking-tight">
              Sales Person Analytics
            </h2>
            <Badge className="shrink-0 bg-white text-slate-600 border border-slate-200 font-semibold text-[10px] sm:text-xs px-2 py-0.5 shadow-sm">
              {salespersonAnalytics.length} Active
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-px">
            {salespersonAnalytics.length === 0 ? (
              <div className="py-10 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-semibold text-sm">No Performance Data Available</p>
              </div>
            ) : (
              salespersonAnalytics.map((person, index) => {
                const rowStyles = [
                  { bg: "bg-indigo-50/50", border: "border-indigo-100", accent: "text-indigo-600" },
                  { bg: "bg-emerald-50/50", border: "border-emerald-100", accent: "text-emerald-600" },
                  { bg: "bg-rose-50/50", border: "border-rose-100", accent: "text-rose-600" },
                  { bg: "bg-amber-50/50", border: "border-amber-100", accent: "text-amber-600" },
                  { bg: "bg-sky-50/50", border: "border-sky-100", accent: "text-sky-600" },
                ];
                const style = rowStyles[index % rowStyles.length];
                const stripCommas = (val: string | number | null | undefined) => String(val ?? "0").replace(/,/g, "");

                return (
                  <div key={person.name} className={cn("rounded-xl border bg-white p-2 sm:p-3 shadow-sm", style.bg, style.border)}>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-px">
                      {person.name}
                    </h3>

                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-px">
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <p className="text-sm sm:text-base font-semibold text-slate-500">Monthly Late</p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 mt-1">{stripCommas(person.delivery.monthly.score)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <p className="text-sm sm:text-base font-semibold text-slate-500">Daily Late</p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 mt-1">{stripCommas(person.delivery.daily.score)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <p className="text-sm sm:text-base font-semibold text-slate-500">Working Party</p>
                        <p className={cn("text-sm sm:text-base font-bold mt-1", style.accent)}>{stripCommas(person.workingParty.count)}</p>
                        <p className="text-sm sm:text-base text-slate-500 mt-1">Avg: {stripCommas(person.workingParty.average)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <p className="text-sm sm:text-base font-semibold text-slate-500">Pending Orders</p>
                        <p className="text-sm sm:text-base font-bold text-purple-600 mt-1">{stripCommas(person.pendingOrders.count)}</p>
                        <p className="text-sm sm:text-base text-slate-500 mt-1">Conv: {stripCommas(person.pendingOrders.ratio)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <p className="text-sm sm:text-base font-semibold text-slate-500">Monthly Revenue</p>
                        <p className="text-sm sm:text-base font-bold text-emerald-600 mt-1">₹{stripCommas(person.gd.monthly)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <p className="text-sm sm:text-base font-semibold text-slate-500">Today Revenue</p>
                        <p className="text-sm sm:text-base font-bold text-amber-600 mt-1">₹{stripCommas(person.gd.daily)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-px mt-px">
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <div className="space-y-2">
                          {person.saudaAvg.length === 0 ? (
                            <p className="text-sm sm:text-base text-slate-400">No sauda data</p>
                          ) : (
                            person.saudaAvg.map((s: any, i: number) => (
                              <div key={i} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5">
                                <span className="text-sm sm:text-base font-semibold text-slate-700">Sauda - {s.ITEM}</span>
                                <span className="text-sm sm:text-base font-bold text-indigo-600">₹{stripCommas(s.AVERAGE)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <div className="space-y-2">
                          {person.salesAvg.length === 0 ? (
                            <p className="text-sm sm:text-base text-slate-400">No sales data</p>
                          ) : (
                            person.salesAvg.map((s: any, i: number) => (
                              <div key={i} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5">
                                <span className="text-sm sm:text-base font-semibold text-slate-700">Sales - {s.ITEM}</span>
                                <span className="text-sm sm:text-base font-bold text-emerald-600">₹{stripCommas(s.AVERAGE)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sale Performance State Wise Section */}
        <Card className="border-none shadow-none bg-transparent overflow-visible mb-0 sm:shadow-sm sm:bg-white sm:overflow-hidden">
          <CardHeader className="p-0 bg-transparent border-none sm:bg-slate-50/50 sm:border-b sm:border-slate-100 sm:p-6">
            <div className="flex items-center justify-between px-0 py-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Trophy className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="space-y-0">
                  <CardTitle className="text-sm sm:text-2xl font-black text-slate-800 tracking-tight leading-none">Sale Performance State Wise</CardTitle>
                  <div className="flex items-center gap-1">
                    <span className="flex w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[10px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none m-0">Real-time Volume Analysis</p>
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
          <CardContent className="p-0 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1 sm:gap-2">
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
                const mobileStyles = [
                  { row: "border-[#C7D2FE] bg-[#F5F7FF]", labelBg: "bg-[#E9EDFF]", labelText: "text-[#1E2A78]", unitsBg: "bg-[#EEF9F4]", unitsText: "text-[#0F7A4A]", shareBg: "bg-[#FFF4E8]", shareText: "text-[#B45309]" },
                  { row: "border-[#BAE6FD] bg-[#F2FAFF]", labelBg: "bg-[#E6F6FF]", labelText: "text-[#075985]", unitsBg: "bg-[#ECFDF3]", unitsText: "text-[#047857]", shareBg: "bg-[#FFF1F2]", shareText: "text-[#BE123C]" },
                  { row: "border-[#A7F3D0] bg-[#F1FCF6]", labelBg: "bg-[#E6FCEF]", labelText: "text-[#065F46]", unitsBg: "bg-[#EEF4FF]", unitsText: "text-[#1D4ED8]", shareBg: "bg-[#FFF7ED]", shareText: "text-[#C2410C]" },
                  { row: "border-[#FDE68A] bg-[#FFFBEB]", labelBg: "bg-[#FFF7D6]", labelText: "text-[#92400E]", unitsBg: "bg-[#EEF2FF]", unitsText: "text-[#4338CA]", shareBg: "bg-[#ECFDF5]", shareText: "text-[#047857]" },
                  { row: "border-[#FBCFE8] bg-[#FFF5FA]", labelBg: "bg-[#FFEAF4]", labelText: "text-[#9D174D]", unitsBg: "bg-[#EEF9FF]", unitsText: "text-[#0E7490]", shareBg: "bg-[#F5F3FF]", shareText: "text-[#6D28D9]" },
                  { row: "border-[#DDD6FE] bg-[#F7F5FF]", labelBg: "bg-[#EEE9FF]", labelText: "text-[#5B21B6]", unitsBg: "bg-[#F0FDFA]", unitsText: "text-[#0F766E]", shareBg: "bg-[#FFF7ED]", shareText: "text-[#C2410C]" },
                  { row: "border-[#A5F3FC] bg-[#F0FDFF]", labelBg: "bg-[#E6FBFF]", labelText: "text-[#155E75]", unitsBg: "bg-[#F0F9FF]", unitsText: "text-[#1D4ED8]", shareBg: "bg-[#FFF1F2]", shareText: "text-[#BE123C]" },
                  { row: "border-[#F5D0FE] bg-[#FFF5FF]", labelBg: "bg-[#FCEBFF]", labelText: "text-[#86198F]", unitsBg: "bg-[#EEFDF5]", unitsText: "text-[#047857]", shareBg: "bg-[#EEF2FF]", shareText: "text-[#4338CA]" },
                  { row: "border-[#99F6E4] bg-[#F0FDFA]", labelBg: "bg-[#E7FCF6]", labelText: "text-[#115E59]", unitsBg: "bg-[#F8FAFC]", unitsText: "text-[#0F172A]", shareBg: "bg-[#FFF7ED]", shareText: "text-[#C2410C]" },
                  { row: "border-[#FED7AA] bg-[#FFF7ED]", labelBg: "bg-[#FFEFD8]", labelText: "text-[#9A3412]", unitsBg: "bg-[#EEF2FF]", unitsText: "text-[#3730A3]", shareBg: "bg-[#ECFDF5]", shareText: "text-[#047857]" },
                ];
                const mobileStyle = mobileStyles[index % mobileStyles.length];

                return (
                  <div key={item.state} className="w-full">
                    {/* Mobile Row View */}
                    <div className={cn("sm:hidden h-11 w-full rounded-md border px-2 py-1 grid grid-cols-[1.15fr_0.9fr_0.9fr] items-center gap-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]", mobileStyle.row)}>
                      <p className={cn("min-w-0 truncate rounded-md px-2 py-1 text-[13px] font-semibold uppercase leading-none", mobileStyle.labelBg, mobileStyle.labelText)}>
                        {item.state}
                      </p>
                      <p className={cn("rounded-md px-2 py-1 text-center text-[13px] font-semibold leading-none", mobileStyle.unitsBg, mobileStyle.unitsText)}>
                        {item.count.toLocaleString()}
                      </p>
                      <p className={cn("rounded-md px-2 py-1 text-center text-[13px] font-semibold leading-none", mobileStyle.shareBg, mobileStyle.shareText)}>
                        {percentage}%
                      </p>
                    </div>

                    <Card
                      className={cn(
                        "hidden sm:block group relative border-none transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 overflow-hidden min-h-[136px] lg:min-h-[152px] rounded-xl bg-gradient-to-br",
                        gradient
                      )}
                    >

                      {/* Decorative Elements */}
                      <div className="hidden sm:block absolute top-1 right-1 sm:top-2 sm:right-2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <Trophy className="w-7 h-7 sm:w-10 sm:h-10 text-white rotate-12" />
                      </div>

                      <CardContent className="relative z-10 h-full p-1.5 sm:p-3 lg:p-4 flex flex-col items-center justify-center text-center gap-1 sm:gap-2">
                        <div className="px-1.5 sm:px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 inline-flex items-center gap-1">
                          <span className="text-[10px] sm:text-sm font-black text-white leading-none">{item.count.toLocaleString()}</span>
                          <span className="text-[8px] sm:text-[10px] text-white/85 font-bold uppercase tracking-wide leading-none">Units</span>
                        </div>

                        <CardTitle className="w-full px-1 text-xs sm:text-base lg:text-lg font-black text-white uppercase tracking-tight leading-tight break-all drop-shadow-sm text-center">
                          {item.state}
                        </CardTitle>

                        <div className="w-14 sm:w-20 h-1 sm:h-1.5 bg-black/20 rounded-full overflow-hidden border border-white/10">
                          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${percentage}%` }}></div>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none block drop-shadow-md">
                            {percentage}%
                          </span>
                          <p className="text-[8px] sm:text-xs font-black text-white/85 uppercase tracking-wide leading-none">Market Share</p>
                        </div>
                      </CardContent>

                      {/* Premium Glass Effect Reflection */}
                      <div className="hidden sm:block absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none opacity-50"></div>

                      {/* Subtle Grainy Overlay */}
                      <div className="hidden sm:block absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
                    </Card>
                  </div>
                );
              })}
            </div>

            {/* Mobile Only: State Share Pie Chart Card */}
            <div className="sm:hidden mt-2 w-full">
              <div className="rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 px-2 py-1.5 text-center">
                <p className="text-[11px] font-black uppercase tracking-wider text-white">State Share Pie</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-white/85">State, Score & Market Share %</p>
              </div>

              {mobileStateShareData.length === 0 ? (
                <p className="py-8 text-center text-xs font-semibold text-slate-400">No state share data available</p>
              ) : (
                <>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-2">
                    <div className="relative h-56">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                        <PieChart>
                          <Pie
                            data={mobileStateShareData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={44}
                            outerRadius={84}
                            paddingAngle={2}
                            strokeWidth={1}
                            stroke="#ffffff"
                            labelLine={false}
                            label={(props: any) => {
                              const percent = Number(props?.payload?.percentage || 0);
                              if (percent < 4) return null;
                              const RADIAN = Math.PI / 180;
                              const radius = (props?.outerRadius || 0) + 12;
                              const x = (props?.cx || 0) + radius * Math.cos(-(props?.midAngle || 0) * RADIAN);
                              const y = (props?.cy || 0) + radius * Math.sin(-(props?.midAngle || 0) * RADIAN);
                              return (
                                <text
                                  x={x}
                                  y={y}
                                  fill="#0f172a"
                                  textAnchor={x > (props?.cx || 0) ? "start" : "end"}
                                  dominantBaseline="central"
                                  fontSize={10}
                                  fontWeight={800}
                                >
                                  {`${percent.toFixed(1)}%`}
                                </text>
                              );
                            }}
                          >
                            {mobileStateShareData.map((entry, idx) => (
                              <Cell key={`mobile-state-pie-${entry.name}-${idx}`} fill={entry.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Total Score</p>
                        <p className="text-base font-black text-slate-800">
                          {mobileStateShareData.reduce((sum, row) => sum + row.value, 0).toLocaleString()}
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                          {mobileStateShareData[0]?.name || "Top State"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 mt-1">
                    {mobileStateShareData.map((entry, idx) => (
                      <div
                        key={`mobile-state-row-${entry.name}-${idx}`}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5"
                      >
                        <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr] items-center gap-1">
                          <div className="min-w-0 flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                            <span className="truncate text-sm font-semibold uppercase text-slate-700">{entry.name}</span>
                          </div>
                          <span className="text-center text-sm font-bold text-slate-700">{entry.value.toLocaleString()}</span>
                          <span className="text-center text-sm font-black text-indigo-600">{entry.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(entry.percentage, 100)}%`, backgroundColor: entry.fill }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>



        {/* Top Value Cards Section - Wrapped in Scoresheet Card */}
        <div className="w-full m-0 p-0 bg-transparent border-none shadow-none overflow-visible animate-in slide-in-from-top-4 duration-500">
          <div className="m-0 p-0">
            <div className="flex items-center justify-center m-0 p-0">
              <h3 className="m-0 p-0 text-base sm:text-lg lg:text-xl font-black text-slate-800 tracking-tight text-center">ScotSheet</h3>
            </div>
          </div>
          <div className="m-0 p-0">
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1 sm:gap-1.5 lg:gap-2 m-0 p-0">
              {/* Total Customers Card */}
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-md overflow-hidden h-full">
                <CardContent className="p-1.5 sm:p-3 min-h-[74px] sm:min-h-[100px] flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-blue-100 leading-tight mb-1">Total Customers</p>
                  <div className="text-lg sm:text-xl lg:text-2xl font-black leading-none">{totalCustomers.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Total Follow-ups Card */}
              <Card className="bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white border-none shadow-md overflow-hidden h-full">
                <CardContent className="p-1.5 sm:p-3 min-h-[74px] sm:min-h-[100px] flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-purple-100 leading-tight mb-1">Total Follow-ups</p>
                  <div className="text-lg sm:text-xl lg:text-2xl font-black leading-none">{followupStats.totalFollowUps.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Orders Booked Card */}
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-md overflow-hidden h-full">
                <CardContent className="p-1.5 sm:p-3 min-h-[74px] sm:min-h-[100px] flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-emerald-100 leading-tight mb-1">Orders Booked</p>
                  <div className="text-lg sm:text-xl lg:text-2xl font-black leading-none">{followupStats.ordersBooked.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Vehicles In Card */}
              <Card className="bg-gradient-to-br from-indigo-500 to-blue-700 text-white border-none shadow-md overflow-hidden h-full">
                <CardContent className="p-1.5 sm:p-3 min-h-[74px] sm:min-h-[100px] flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-indigo-100 leading-tight mb-1">Vehicles In</p>
                  <div className="text-lg sm:text-xl lg:text-2xl font-black leading-none">{displayMetrics.wbIn.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Vehicles Out Card */}
              <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none shadow-md overflow-hidden h-full">
                <CardContent className="p-1.5 sm:p-3 min-h-[74px] sm:min-h-[100px] flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-orange-100 leading-tight mb-1">Vehicles Out</p>
                  <div className="text-lg sm:text-xl lg:text-2xl font-black leading-none">{displayMetrics.wbOut.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Vehicles Pending Card */}
              <Card className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white border-none shadow-md overflow-hidden h-full">
                <CardContent className="p-1.5 sm:p-3 min-h-[74px] sm:min-h-[100px] flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-amber-100 leading-tight mb-1">In Premises</p>
                  <div className="text-lg sm:text-xl lg:text-2xl font-black leading-none">{displayMetrics.wbPending.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>


            {/* Sales Performance Report Section */}
            <div className='w-full'>
              <div className="w-full m-0 p-0 bg-white">
                <CardHeader className="bg-white border-b border-slate-100 px-0 sm:px-4 py-1 sm:py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 sm:p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
                        <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <CardTitle className="text-base sm:text-xl font-black text-slate-800 tracking-tight text-left truncate">Monthly MeCA Score</CardTitle>
                    </div>
                    <div className="flex items-center w-full sm:w-auto">
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-full sm:w-[180px] h-8 sm:h-10 bg-slate-50 border-slate-200 font-bold text-xs sm:text-sm text-slate-700">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
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
                  <div className="sm:hidden w-full px-0 pt-0 space-y-1">
                    {salesPerformance.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-slate-400 font-medium text-sm">
                        No data available
                      </div>
                    ) : (
                      <>
                        {salesPerformance.filter(row => row.salesPerson !== 'Total').map((row, idx) => {
                          const initials = row.salesPerson.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase();
                          const avatarColor = idx % 3 === 0 ? "bg-blue-500" : idx % 3 === 1 ? "bg-purple-500" : "bg-indigo-500";

                          return (
                            <div key={idx} className="w-full rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                                <div className={`w-5 h-5 rounded-full ${avatarColor} flex items-center justify-center text-white text-[9px] font-bold shadow-sm`}>
                                  {initials}
                                </div>
                                <span className="text-[12px] sm:text-sm font-bold text-slate-800 truncate">{row.salesPerson}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 pt-1">
                                <div className="rounded-md bg-blue-50 px-1.5 py-1 flex items-center justify-between gap-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-blue-500 uppercase leading-none">Calls</p>
                                  <p className="text-[13px] sm:text-base font-bold text-blue-700 leading-none">{row.noOfCallings}</p>
                                </div>
                                <div className="rounded-md bg-violet-50 px-1.5 py-1 flex items-center justify-between gap-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-violet-500 uppercase leading-none">Orders</p>
                                  <p className="text-[13px] sm:text-base font-bold text-violet-700 leading-none">{row.orderClients}</p>
                                </div>
                                <div className="rounded-md bg-emerald-50 px-1.5 py-1 flex items-center justify-between gap-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-emerald-500 uppercase leading-none">Conv</p>
                                  <p className="text-[13px] sm:text-base font-bold text-emerald-700 leading-none">{row.conversionRatio}%</p>
                                </div>
                                <div className="rounded-md bg-amber-50 px-1.5 py-1 flex items-center justify-between gap-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-amber-600 uppercase leading-none">Sale</p>
                                  <p className="text-[13px] sm:text-base font-bold text-amber-700 leading-none">{row.totalRsSale ? Number(row.totalRsSale).toLocaleString() : '0'}</p>
                                </div>
                                <div className="rounded-md bg-indigo-50 px-1.5 py-1 flex items-center justify-between gap-2 col-span-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-indigo-500 uppercase leading-none">Avg</p>
                                  <p className="text-[13px] sm:text-base font-bold text-indigo-700 leading-none">{row.avgRsSale}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {(() => {
                          const dataRows = salesPerformance.filter(row => row.salesPerson !== 'Total');
                          if (dataRows.length === 0) return null;

                          const totalCallings = dataRows.reduce((sum, row) => sum + Number(row.noOfCallings || 0), 0);
                          const totalOrderClients = dataRows.reduce((sum, row) => sum + Number(row.orderClients || 0), 0);
                          const totalRsSale = dataRows.reduce((sum, row) => sum + Number(row.totalRsSale || 0), 0);
                          const totalConversionRatio = totalCallings > 0 ? ((totalOrderClients / totalCallings) * 100).toFixed(2) : '0.00';
                          const totalAvgSale = dataRows.reduce((sum, row) => sum + parseFloat(row.avgRsSale || '0'), 0).toFixed(2);

                          const avgCallingsValue = totalCallings / dataRows.length;
                          const avgOrderClientsValue = totalOrderClients / dataRows.length;
                          const avgConversionRatio = (dataRows.reduce((sum, row) => sum + parseFloat(row.conversionRatio || '0'), 0) / dataRows.length).toFixed(2);
                          const avgTotalRsSaleValue = totalRsSale / dataRows.length;
                          const avgAvgRsSale = avgOrderClientsValue > 0 ? (avgTotalRsSaleValue / avgOrderClientsValue).toFixed(2) : '0.00';

                          return (
                            <>
                              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-1.5 shadow-sm">
                                <p className="text-[13px] sm:text-sm font-black text-yellow-700 mb-1">TOTAL</p>
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="rounded-md bg-blue-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-blue-500 uppercase leading-none">Calls</p><p className="text-[13px] sm:text-base font-bold text-blue-700 leading-none">{totalCallings}</p></div>
                                  <div className="rounded-md bg-violet-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-violet-500 uppercase leading-none">Orders</p><p className="text-[13px] sm:text-base font-bold text-violet-700 leading-none">{totalOrderClients}</p></div>
                                  <div className="rounded-md bg-emerald-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-emerald-500 uppercase leading-none">Conv</p><p className="text-[13px] sm:text-base font-bold text-emerald-700 leading-none">{totalConversionRatio}%</p></div>
                                  <div className="rounded-md bg-amber-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-amber-600 uppercase leading-none">Sale</p><p className="text-[13px] sm:text-base font-bold text-amber-700 leading-none">{Number(totalRsSale).toLocaleString()}</p></div>
                                  <div className="rounded-md bg-indigo-50 px-1.5 py-1 flex items-center justify-between gap-2 col-span-2"><p className="text-[13px] sm:text-base text-indigo-500 uppercase leading-none">Avg</p><p className="text-[13px] sm:text-base font-bold text-indigo-700 leading-none">{totalAvgSale}</p></div>
                                </div>
                              </div>

                              <div className="rounded-lg border border-purple-200 bg-purple-50 p-1.5 shadow-sm">
                                <p className="text-[13px] sm:text-sm font-black text-purple-700 mb-1">AVERAGE</p>
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="rounded-md bg-blue-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-blue-500 uppercase leading-none">Calls</p><p className="text-[13px] sm:text-base font-bold text-blue-700 leading-none">{avgCallingsValue.toFixed(1)}</p></div>
                                  <div className="rounded-md bg-violet-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-violet-500 uppercase leading-none">Orders</p><p className="text-[13px] sm:text-base font-bold text-violet-700 leading-none">{avgOrderClientsValue.toFixed(1)}</p></div>
                                  <div className="rounded-md bg-emerald-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-emerald-500 uppercase leading-none">Conv</p><p className="text-[13px] sm:text-base font-bold text-emerald-700 leading-none">{avgConversionRatio}%</p></div>
                                  <div className="rounded-md bg-amber-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-amber-600 uppercase leading-none">Sale</p><p className="text-[13px] sm:text-base font-bold text-amber-700 leading-none">{Number(avgTotalRsSaleValue.toFixed(0)).toLocaleString()}</p></div>
                                  <div className="rounded-md bg-indigo-50 px-1.5 py-1 flex items-center justify-between gap-2 col-span-2"><p className="text-[13px] sm:text-base text-indigo-500 uppercase leading-none">Avg</p><p className="text-[13px] sm:text-base font-bold text-indigo-700 leading-none">{avgAvgRsSale}</p></div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] sm:text-sm text-white uppercase bg-blue-600 sticky top-0 z-10">
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
                                <tr key={idx} className={`${rowClass} hover:bg-emerald-50/80 transition-colors text-[10px] sm:text-sm`}>
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
                                  <td className="px-2 sm:px-4 md:px-6 py-1 sm:py-2.5 text-center text-slate-700">
                                    {row.totalRsSale ? Number(row.totalRsSale).toLocaleString() : '0'}
                                  </td>
                                  <td className="px-2 sm:px-4 md:px-6 py-1 sm:py-2.5 text-center">
                                    <span className={`${parseFloat(String(row.avgRsSale || "0")) > 50 ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
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
                              const totalAvgSale = dataRows.reduce((sum, row) => sum + parseFloat(row.avgRsSale || '0'), 0).toFixed(2);

                              return (
                                <tr className="bg-yellow-50 font-bold border-t-2 border-yellow-200 hover:bg-yellow-100/80 transition-colors text-[9px] sm:text-sm">
                                  <td className="px-3 sm:px-6 py-2 sm:py-3 font-medium flex items-center gap-1.5 sm:gap-3">
                                    <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white text-[8px] sm:text-xs font-bold shadow-sm">
                                      Î£
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
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-yellow-700">
                                    {Number(totalRsSale).toLocaleString()}
                                  </td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center">
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
                              const avgAvgRsSale = avgOrderClientsValue > 0 ? (avgTotalRsSaleValue / avgOrderClientsValue).toFixed(2) : '0.00';

                              return (
                                <tr className="bg-purple-50 font-bold border-t-2 border-purple-200 hover:bg-purple-100/80 transition-colors text-[9px] sm:text-sm">
                                  <td className="px-3 sm:px-6 py-2 sm:py-3 font-medium flex items-center gap-1.5 sm:gap-3">
                                    <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-[8px] sm:text-xs font-bold shadow-sm">
                                      Ã¸
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
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-purple-700">
                                    {Number(avgTotalRsSale).toLocaleString()}
                                  </td>
                                  <td className="px-2 sm:px-6 py-2 sm:py-3 text-center">
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
                  {monthlyPerformanceSummary.dataRows.length > 0 && (() => {
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

                    const avgCallPerDay = monthlyPerformanceSummary.personCount > 0
                      ? (monthlyPerformanceSummary.totalCallings / monthlyPerformanceSummary.personCount / daysDivisor).toFixed(2)
                      : "0.00";
                    const avgCallPerPerson = monthlyPerformanceSummary.personCount > 0
                      ? (Number(avgCallPerDay) / monthlyPerformanceSummary.personCount).toFixed(1)
                      : "0.0";

                    return (
                      <div className="mt-1 sm:mt-4 px-0 sm:px-6 pb-1 sm:pb-6">
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
                          {/* Avg Call / Day */}
                          <div className="min-w-0 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 transition-colors rounded-lg sm:rounded-xl px-2 sm:px-5 py-1.5 sm:py-3 border border-green-600">
                            <span className="block text-center font-bold text-white text-[13px] sm:text-base leading-tight">Avg Call / Day</span>
                            <span className="block text-center font-black text-white text-[13px] sm:text-base leading-none">{avgCallPerDay}</span>
                          </div>

                          {/* Avg Call / Person */}
                          <div className="min-w-0 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 transition-colors rounded-lg sm:rounded-xl px-2 sm:px-5 py-1.5 sm:py-3 border border-green-600">
                            <span className="block text-center font-bold text-white text-[13px] sm:text-base leading-tight">Avg Call / Person</span>
                            <span className="block text-center font-black text-white text-[13px] sm:text-base leading-none">{avgCallPerPerson}</span>
                          </div>

                          {/* Total Calling */}
                          <div className="min-w-0 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 transition-colors rounded-lg sm:rounded-xl px-2 sm:px-5 py-1.5 sm:py-3 border-2 border-yellow-600 shadow-lg">
                            <span className="block text-center font-bold text-slate-800 text-[13px] sm:text-base leading-tight">Total Calling</span>
                            <span className="block text-center font-black text-slate-800 text-[13px] sm:text-base leading-none">{monthlyPerformanceSummary.totalCallings.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </div>
            </div>

            {/* Daily Sales Performance Report Section */}
            <div className='w-full mt-2 sm:mt-8'>
              <Card className="border-none shadow-none sm:shadow-lg overflow-hidden bg-transparent sm:bg-white sm:rounded-xl">
                <CardHeader className="bg-transparent sm:bg-white border-b-0 sm:border-b border-slate-100 px-0 sm:px-4 py-2 sm:py-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 sm:p-2 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-200">
                        <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <CardTitle className="text-base sm:text-xl font-black text-slate-800 tracking-tight truncate">Daily MeCA Score</CardTitle>
                    </div>
                    <div className="bg-slate-100 px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-slate-600 text-xs sm:text-sm w-full sm:w-auto text-center sm:text-left">
                      {format(new Date(), "dd MMMM yyyy")}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="sm:hidden w-full px-0 pt-0 space-y-1">
                    {dailyPerformanceSummary.dataRows.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-slate-400 font-medium text-sm">
                        No data available for today
                      </div>
                    ) : (
                      <>
                        {dailyPerformanceSummary.dataRows.map((row, idx) => {
                          const initials = row.salesPerson.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase();
                          const avatarColor = idx % 3 === 0 ? "bg-blue-500" : idx % 3 === 1 ? "bg-purple-500" : "bg-indigo-500";

                          return (
                            <div key={idx} className="w-full rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                                <div className={`w-5 h-5 rounded-full ${avatarColor} flex items-center justify-center text-white text-[9px] font-bold shadow-sm`}>
                                  {initials}
                                </div>
                                <span className="text-[12px] sm:text-sm font-bold text-slate-800 truncate">{row.salesPerson}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 pt-1">
                                <div className="rounded-md bg-blue-50 px-1.5 py-1 flex items-center justify-between gap-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-blue-500 uppercase leading-none">Calls</p>
                                  <p className="text-[13px] sm:text-base font-bold text-blue-700 leading-none">{row.noOfCallings}</p>
                                </div>
                                <div className="rounded-md bg-violet-50 px-1.5 py-1 flex items-center justify-between gap-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-violet-500 uppercase leading-none">Orders</p>
                                  <p className="text-[13px] sm:text-base font-bold text-violet-700 leading-none">{row.orderClients}</p>
                                </div>
                                <div className="rounded-md bg-emerald-50 px-1.5 py-1 flex items-center justify-between gap-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-emerald-500 uppercase leading-none">Conv</p>
                                  <p className="text-[13px] sm:text-base font-bold text-emerald-700 leading-none">{row.conversionRatio}%</p>
                                </div>
                                <div className="rounded-md bg-amber-50 px-1.5 py-1 flex items-center justify-between gap-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-amber-600 uppercase leading-none">Sale</p>
                                  <p className="text-[13px] sm:text-base font-bold text-amber-700 leading-none">{row.totalRsSale ? Number(row.totalRsSale).toLocaleString() : '0'}</p>
                                </div>
                                <div className="rounded-md bg-indigo-50 px-1.5 py-1 flex items-center justify-between gap-2 col-span-2">
                                  <p className="text-[13px] sm:text-base font-semibold text-indigo-500 uppercase leading-none">Avg</p>
                                  <p className="text-[13px] sm:text-base font-bold text-indigo-700 leading-none">{row.avgRsSale}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {(() => {
                          if (dailyPerformanceSummary.dataRows.length === 0) return null;

                          return (
                            <>
                              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-1.5 shadow-sm">
                                <p className="text-[13px] sm:text-sm font-black text-yellow-700 mb-1">TOTAL</p>
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="rounded-md bg-blue-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-blue-500 uppercase leading-none">Calls</p><p className="text-[13px] sm:text-base font-bold text-blue-700 leading-none">{dailyPerformanceSummary.totalCallings}</p></div>
                                  <div className="rounded-md bg-violet-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-violet-500 uppercase leading-none">Orders</p><p className="text-[13px] sm:text-base font-bold text-violet-700 leading-none">{dailyPerformanceSummary.totalOrderClients}</p></div>
                                  <div className="rounded-md bg-emerald-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-emerald-500 uppercase leading-none">Conv</p><p className="text-[13px] sm:text-base font-bold text-emerald-700 leading-none">{dailyPerformanceSummary.totalConversionRatio}%</p></div>
                                  <div className="rounded-md bg-amber-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-amber-600 uppercase leading-none">Sale</p><p className="text-[13px] sm:text-base font-bold text-amber-700 leading-none">{Number(dailyPerformanceSummary.totalRsSale).toLocaleString()}</p></div>
                                  <div className="rounded-md bg-indigo-50 px-1.5 py-1 flex items-center justify-between gap-2 col-span-2"><p className="text-[13px] sm:text-base text-indigo-500 uppercase leading-none">Avg</p><p className="text-[13px] sm:text-base font-bold text-indigo-700 leading-none">{dailyPerformanceSummary.totalAvgSale}</p></div>
                                </div>
                              </div>

                              <div className="rounded-lg border border-purple-200 bg-purple-50 p-1.5 shadow-sm">
                                <p className="text-[13px] sm:text-sm font-black text-purple-700 mb-1">AVERAGE</p>
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="rounded-md bg-blue-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-blue-500 uppercase leading-none">Calls</p><p className="text-[13px] sm:text-base font-bold text-blue-700 leading-none">{Number(dailyPerformanceSummary.avgCallings).toFixed(1)}</p></div>
                                  <div className="rounded-md bg-violet-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-violet-500 uppercase leading-none">Orders</p><p className="text-[13px] sm:text-base font-bold text-violet-700 leading-none">{dailyPerformanceSummary.avgOrderClients}</p></div>
                                  <div className="rounded-md bg-emerald-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-emerald-500 uppercase leading-none">Conv</p><p className="text-[13px] sm:text-base font-bold text-emerald-700 leading-none">{dailyPerformanceSummary.avgConversionRatio}%</p></div>
                                  <div className="rounded-md bg-amber-50 px-1.5 py-1 flex items-center justify-between gap-2"><p className="text-[13px] sm:text-base text-amber-600 uppercase leading-none">Sale</p><p className="text-[13px] sm:text-base font-bold text-amber-700 leading-none">{Number(dailyPerformanceSummary.avgTotalRsSale).toLocaleString()}</p></div>
                                  <div className="rounded-md bg-indigo-50 px-1.5 py-1 flex items-center justify-between gap-2 col-span-2"><p className="text-[13px] sm:text-base text-indigo-500 uppercase leading-none">Avg</p><p className="text-[13px] sm:text-base font-bold text-indigo-700 leading-none">{dailyPerformanceSummary.avgAvgRsSale}</p></div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
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
                        {dailyPerformanceSummary.dataRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                              <div className="flex flex-col items-center justify-center p-4">
                                <div className="text-lg">No data available for today</div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          dailyPerformanceSummary.dataRows.map((row, idx) => {

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
                                <td className="px-2 sm:px-4 md:px-6 py-1.5 sm:py-4 text-center text-slate-700">
                                  {row.totalRsSale ? Number(row.totalRsSale).toLocaleString() : '0'}
                                </td>
                                <td className="px-2 sm:px-4 md:px-6 py-1.5 sm:py-4 text-center">
                                  <span className={`${parseFloat(String(row.avgRsSale || "0")) > 50 ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                                    {row.avgRsSale}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                        {/* Total Row */}
                        {dailyPerformanceSummary.dataRows.length > 0 && (() => {

                          return (
                            <tr className="bg-emerald-50 font-bold border-t-2 border-emerald-200 hover:bg-emerald-100/80 transition-colors text-[9px] sm:text-sm">
                              <td className="px-3 sm:px-6 py-2 sm:py-4 font-medium flex items-center gap-1.5 sm:gap-3">
                                <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[8px] sm:text-xs font-bold shadow-sm">
                                  Î£
                                </div>
                                <span className="text-emerald-700">TOTAL</span>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center text-emerald-700 font-bold">{dailyPerformanceSummary.totalCallings}</td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center text-emerald-700 font-bold">{dailyPerformanceSummary.totalOrderClients}</td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-emerald-700 font-bold">{dailyPerformanceSummary.totalConversionRatio}%</span>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center text-emerald-700 font-bold">
                                {Number(dailyPerformanceSummary.totalRsSale).toLocaleString()}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                                <span className="text-emerald-700 font-bold">{dailyPerformanceSummary.totalAvgSale}</span>
                              </td>
                            </tr>
                          );
                        })()}

                        {/* Average Row */}
                        {dailyPerformanceSummary.dataRows.length > 0 && (() => {

                          return (
                            <tr className="bg-teal-50 font-bold border-t-2 border-teal-200 hover:bg-teal-100/80 transition-colors text-[9px] sm:text-sm">
                              <td className="px-3 sm:px-6 py-2 sm:py-3 font-medium flex items-center gap-1.5 sm:gap-3">
                                <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-[8px] sm:text-xs font-bold shadow-sm">
                                  Ã¸
                                </div>
                                <span className="text-teal-700">AVERAGE</span>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-teal-700">{Number(dailyPerformanceSummary.avgCallings).toFixed(1)}</td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-teal-700">{dailyPerformanceSummary.avgOrderClients}</td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-teal-700 font-bold">{dailyPerformanceSummary.avgConversionRatio}%</span>
                                </div>
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center text-teal-700">
                                {Number(dailyPerformanceSummary.avgTotalRsSale).toLocaleString()}
                              </td>
                              <td className="px-2 sm:px-6 py-2 sm:py-3 text-center">
                                <span className="text-teal-700 font-bold">{dailyPerformanceSummary.avgAvgRsSale}</span>
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Daily Summary Statistics Cards */}
                  {dailyPerformanceSummary.dataRows.length > 0 && (() => {
                    return (
                      <div className="mt-1 sm:mt-6 flex flex-row items-stretch gap-1.5 sm:gap-4 px-0 sm:px-6 pb-1 sm:pb-6">
                        {/* Avg Call / Person */}
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-1 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 transition-colors rounded-lg px-2 sm:px-6 py-2 sm:py-3 border border-emerald-600 shadow-sm">
                          <span className="text-xs sm:text-sm font-bold text-white leading-tight truncate">Avg Call / Person</span>
                          <span className="text-sm sm:text-lg font-black text-white shrink-0">{dailyPerformanceSummary.avgCallingsPerPerson}</span>
                        </div>

                        {/* Today's Total Calling */}
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-1 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 transition-colors rounded-lg px-2 sm:px-6 py-2 sm:py-3 border border-teal-600 shadow-lg">
                          <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide leading-tight truncate">Today's Total Calling</span>
                          <span className="text-sm sm:text-lg font-black text-white shrink-0">{dailyPerformanceSummary.totalCallings.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>


          </div>
        </div>



        {/* Current Month Enquiry Report Section */}
        <div className="relative isolate w-full m-0 rounded-none border-0 border-l-0 bg-transparent shadow-none overflow-visible sm:rounded-2xl sm:border sm:border-indigo-200/70 sm:border-l-4 sm:border-l-indigo-500 sm:bg-gradient-to-br sm:from-slate-50 sm:via-white sm:to-cyan-50 sm:shadow-[0_10px_28px_rgba(15,23,42,0.10)] sm:overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18] hidden sm:block"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(99,102,241,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(45,212,191,0.12) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          ></div>

          <div className="relative z-10 m-0 px-0 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 bg-transparent sm:bg-gradient-to-r sm:from-indigo-600 sm:via-violet-600 sm:to-cyan-600 border-b-0 sm:border-b sm:border-indigo-300/40">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-base sm:text-lg md:text-2xl font-black text-indigo-700 sm:text-white tracking-tight leading-tight">
                  {`${format(new Date(), "MMMM yyyy")} Enquiry`}
                </h3>
                <p className="text-[10px] sm:text-[11px] md:text-xs text-indigo-600/80 sm:text-white/85 font-bold uppercase tracking-wider">
                  Items and total volume summary
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 px-0 sm:px-6 py-2 sm:py-4 bg-transparent sm:bg-gradient-to-b sm:from-white/80 sm:to-slate-50/70">
            {loadingEnquiry ? (
              <div className="h-20 sm:h-24 flex items-center justify-center">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading summary...
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                <div className="relative overflow-hidden rounded-xl border border-indigo-300/50 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-2.5 sm:p-4 min-h-[86px] sm:min-h-[118px] text-center shadow-[0_8px_22px_rgba(59,130,246,0.30)] flex flex-col items-center justify-center">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.18]"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
                      backgroundSize: "16px 16px",
                    }}
                  ></div>
                  <div className="relative z-10">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/85">
                      Items
                    </p>
                    <p className="text-xl sm:text-4xl font-black text-white leading-none mt-1">
                      {enquiryReport.length.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-emerald-300/50 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-500 p-2.5 sm:p-4 min-h-[86px] sm:min-h-[118px] text-center shadow-[0_8px_22px_rgba(16,185,129,0.30)] flex flex-col items-center justify-center">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.18]"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
                      backgroundSize: "16px 16px",
                    }}
                  ></div>
                  <div className="relative z-10">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/85">
                      Total Volume
                    </p>
                    <p className="text-xl sm:text-4xl font-black text-white leading-none mt-1">
                      {enquiryReport.reduce((acc, curr) => acc + Number(curr.total || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!loadingEnquiry && enquiryReport.length === 0 && (
              <p className="text-center text-slate-400 text-xs sm:text-sm font-semibold mt-3">
                No enquiry records available
              </p>
            )}
          </div>
        </div>

        {/* Customer Feedback Section - Tabular Format */}
        <div className="mt-6 sm:mt-10 space-y-2 sm:space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 px-1">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-md sm:shadow-lg shadow-orange-100">
                <MessageSquare className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xs sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 sm:gap-3">
                  CUSTOMER FEEDBACK
                  <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[10px] sm:text-sm px-2 sm:px-3 py-1 uppercase rounded-full">
                    {customerFeedback.length} REVIEWS
                  </Badge>
                </h2>
                <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                  <span className="flex w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] sm:text-sm text-slate-400 font-bold uppercase tracking-wider">Real-time Feedback & Testimonials</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => fetchCustomerFeedback()}
              variant="outline"
              className="group flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 border border-slate-200 hover:border-orange-200 hover:bg-orange-50/30 text-slate-600 rounded-lg text-[11px] sm:text-sm font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:rotate-180 transition-transform duration-500", loadingFeedback && "animate-spin")} />
              Sync Live Sheet
            </Button>
          </div>

          {/* Category Summary (New) */}
          {!loadingFeedback && feedbackCategorySummary.length > 0 && (
            <div className="w-full">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-1">
                {feedbackCategorySummary.map((summary, idx) => (
                  <div
                    key={`feedback-summary-${summary.name}-${idx}`}
                    className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-2 text-center"
                  >
                    <p className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-700 leading-none">{summary.name}</p>
                    <p className="text-base sm:text-lg font-black text-emerald-600 leading-none mt-1">{summary.avg}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile View - Cards */}
          <div className="sm:hidden space-y-2 px-0.5 pb-4">
            {loadingFeedback ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-full bg-white rounded-2xl p-3 border border-slate-100 animate-pulse space-y-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-5 bg-slate-100 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                  </div>
                  <div className="h-12 bg-slate-50 rounded-xl"></div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div key={j} className="h-4 bg-slate-100 rounded w-full"></div>
                    ))}
                  </div>
                </div>
              ))
            ) : customerFeedback.length > 0 ? (
              customerFeedback.map((item, index) => {
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={index}
                    className={cn(
                      "w-full rounded-2xl p-3 shadow-lg space-y-2.5 relative overflow-hidden text-white border-none",
                      isEven
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-100"
                        : "bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-emerald-100"
                    )}
                  >
                    {/* Customer & Firm */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="text-base font-black text-white uppercase tracking-tight leading-none truncate">{item.customer_name}</h3>
                        <p className="text-xs font-bold text-white/60 uppercase tracking-widest truncate">{item.firm_name}</p>
                      </div>
                      <div className="shrink-0 bg-white/20 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                        <p className="text-[10px] font-black text-white uppercase tracking-tighter leading-none">
                          {item.timestamp ? (
                            (() => {
                              try {
                                const date = new Date(item.timestamp);
                                return isNaN(date.getTime()) ? String(item.timestamp).split(' ')[0] : format(date, "dd MMM yyyy");
                              } catch (e) {
                                return String(item.timestamp).split(' ')[0];
                              }
                            })()
                          ) : 'No Date'}
                        </p>
                      </div>
                    </div>

                    {/* Feedback Textbox */}
                    {item.additional_feedback && (
                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10">
                        <p className="text-xs sm:text-sm text-white font-semibold leading-relaxed text-center whitespace-normal break-words">
                          {item.additional_feedback}
                        </p>
                      </div>
                    )}

                    {/* Rating Grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                      {["Enquiry", "Loading", "Dispatch", "Lineup", "Comm.", "Product", "Staff", "Quality"].map((cat) => {
                        const val = item.categoryRatings?.[cat] || 0;
                        return (
                          <div key={cat} className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-black text-white/55 uppercase tracking-[0.08em]">{cat}</span>
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
                  <TableHead className="py-2 px-1 sm:py-4 sm:px-3 text-[10px] sm:text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider text-center">S.No</TableHead>
                  <TableHead className="py-2 px-1.5 sm:py-4 sm:px-4 text-[10px] sm:text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="py-2 px-1.5 sm:py-4 sm:px-4 text-[10px] sm:text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider">Firm</TableHead>
                  <TableHead className="py-2 px-1.5 sm:py-4 sm:px-4 text-[10px] sm:text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider text-center">Feedback</TableHead>
                  {["Enquiry", "Loading", "Dispatch", "Lineup", "Comm.", "Product", "Staff", "Quality"].map((cat) => (
                    <TableHead key={cat} className="py-2 px-1 sm:py-4 sm:px-2 text-[10px] sm:text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider text-center">{cat}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-50">
                {loadingFeedback ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={12} className="py-6 sm:py-10 bg-slate-50/20"></TableCell>
                    </TableRow>
                  ))
                ) : customerFeedback.length > 0 ? (
                  customerFeedback.map((item, index) => {
                    return (
                      <TableRow key={index} className="hover:bg-slate-50/40 transition-colors border-slate-50 group">
                        <TableCell className="py-1.5 px-1 sm:py-3 sm:px-3 text-center">
                          <span className="text-xs sm:text-sm md:text-base font-black text-slate-400">{index + 1}</span>
                        </TableCell>
                        <TableCell className="py-1.5 px-1.5 sm:py-3 sm:px-4">
                          <p className="text-xs sm:text-sm md:text-base font-medium text-slate-700">{item.customer_name}</p>
                        </TableCell>
                        <TableCell className="py-1.5 px-1.5 sm:py-3 sm:px-4">
                          <p className="text-xs sm:text-sm md:text-base font-medium text-slate-700 truncate max-w-[80px] sm:max-w-[150px]">{item.firm_name}</p>
                        </TableCell>
                        <TableCell className="py-1.5 px-1.5 sm:py-3 sm:px-4 text-center">
                          <p className="text-xs sm:text-sm md:text-base font-medium text-slate-700 line-clamp-2 max-w-[100px] sm:max-w-[200px] mx-auto">
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
                    <TableCell colSpan={12} className="py-16 sm:py-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <MessageSquare className="w-10 h-10 sm:w-20 sm:h-20 text-slate-100 mb-3 sm:mb-6" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs sm:text-base">No Feedback Records Found</p>
                        <Button onClick={() => fetchCustomerFeedback()} variant="link" className="text-orange-500 font-black uppercase tracking-widest text-xs sm:text-sm mt-3 sm:mt-5">
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
            <p className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-wider">
              Showing {customerFeedback.length} Client Reviews

            </p>
            <p className="text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-wider">â— Live Sync</p>
          </div>
        </div>

      </>
    </div>
  )
}
