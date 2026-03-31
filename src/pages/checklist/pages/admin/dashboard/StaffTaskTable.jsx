"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchStaffTasksDataApi, getStaffTasksCountApi } from "@/api/checklist/dashboardApi.js"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { motion, AnimatePresence } from "../../../../../utils/framerMotionCompat"
import { XCircle, BarChart3 } from "lucide-react"

export default function StaffTasksTable({
  dashboardType,
  dashboardStaffFilter,
  departmentFilter,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [staffMembers, setStaffMembers] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [totalStaffCount, setTotalStaffCount] = useState(0)
  const [selectedMonthYear, setSelectedMonthYear] = useState("")
  const [monthYearOptions, setMonthYearOptions] = useState([])
  const itemsPerPage = 20
  const [selectedStaff, setSelectedStaff] = useState(null)

  // ── Staff Detail Modal (Same as MIS Report) ────────────────────────
  const CHART_COLORS = { Done: "#10b981", Pending: "#94a3b8" };

  const ScoreBadge = ({ score }) => {
    const s = Number(score || 0);
    const bg = s >= -20 ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : s >= -50 ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200";
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-black border shadow-sm ${bg}`}>
        {s.toFixed(1)}%
      </span>
    );
  };

  const StaffModal = () => {
    if (!selectedStaff) return null;
    const s = selectedStaff;
    const total = Number(s.totalTasks || 0);
    const done = Number(s.completedTasks || 0);
    const pending = total - done;

    const chartData = [
      { name: "Done", value: done },
      { name: "Pending", value: pending },
    ].filter(d => d.value > 0);

    const donePercent = total > 0 ? ((done / total) * 100).toFixed(1) : "0.0";

    return (
      <AnimatePresence>
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-3 bg-black/50 backdrop-blur-[4px]"
          onClick={() => setSelectedStaff(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#c41e3a]/5 to-transparent border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-0.5">{s.division || "N/A"}</p>
                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-tight mb-1">{s.department || "N/A"}</p>
                <h3 className="text-lg font-[1000] text-gray-900 uppercase tracking-tight leading-tight">{s.name}</h3>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{s.employee_id || ""}</p>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-1"
              >
                <XCircle className="h-7 w-7" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Donut Chart + Score */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="relative h-40 w-40 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.length > 0 ? chartData : [{ name: "None", value: 1 }]}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {(chartData.length > 0 ? chartData : [{ name: "None" }]).map((entry, idx) => (
                          <Cell
                            key={idx}
                            fill={CHART_COLORS[entry.name] || "#f3f4f6"}
                            className="outline-none"
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} tasks`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight leading-none mb-0.5">Done</span>
                    <span className="text-2xl font-black text-gray-800 leading-none">{donePercent}%</span>
                  </div>
                </div>

                {/* Vertical stats */}
                <div className="flex-1 space-y-2.5">
                  {[
                    { label: "Total", value: total, color: "text-blue-600", dot: "bg-blue-500" },
                    { label: "Done", value: done, color: "text-emerald-600", dot: "bg-emerald-500" },
                    { label: "Pending", value: pending, color: "text-amber-600", dot: "bg-amber-400" },
                  ].map(({ label, value, color, dot }) => (
                    <div key={label} className="flex items-center justify-between rounded-full bg-gray-50 border border-gray-100 shadow-sm py-2 px-4 transition-all hover:bg-white hover:shadow">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dot}`} />
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-tight">{label}</span>
                      </div>
                      <span className={`text-base font-black tabular-nums ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>


              {/* Category Breakdown */}
              <div className="space-y-2 mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 mb-2">Category Breakdown</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'checklist', label: 'Checklist', color: 'bg-purple-500', text: 'text-purple-600' },
                    { id: 'maintenance', label: 'Maintenance', color: 'bg-emerald-500', text: 'text-emerald-600' },
                    { id: 'housekeeping', label: 'Housekeeping', color: 'bg-orange-500', text: 'text-orange-600' }
                  ].map(cat => {
                    const data = s.breakdown?.[cat.id] || { total: 0, done: 0 };
                    if (data.total === 0) return null;
                    const pct = ((data.done / data.total) * 100).toFixed(0);
                    return (
                      <div key={cat.id} className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-xl ${cat.color} flex items-center justify-center text-white font-bold text-xs`}>
                            {cat.label[0]}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{cat.label}</p>
                            <p className={`text-xs font-bold ${cat.text}`}>{data.done} / {data.total} Done</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-800">{pct}%</p>
                          <div className="w-16 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full ${cat.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Score bar */}
              <div className="flex items-center justify-between bg-gray-900 rounded-[20px] px-5 py-3.5 shadow-xl border border-gray-800">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-red-500" />
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Performance Score</span>
                </div>
                <ScoreBadge score={s.onTimeScore} />
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // Generate month-year options (last 12 months + current month)
  const generateMonthYearOptions = useCallback(() => {
    const options = []
    const today = new Date()
    const currentMonth = today.getMonth() // 0-11
    const currentYear = today.getFullYear()

    // Add current month as default
    const currentMonthYear = `${today.toLocaleString('default', { month: 'long' })} ${currentYear}`

    // Generate options for only last month and current month
    for (let i = 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1)
      const monthName = date.toLocaleString('default', { month: 'long' })
      const year = date.getFullYear()
      const monthYear = `${monthName} ${year}`

      options.push({
        value: `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
        label: monthYear,
        isCurrent: i === 0 // Current month
      })
    }

    setMonthYearOptions(options)

    // Set default selection to current month
    if (options.length > 0 && !selectedMonthYear) {
      const currentOption = options.find(opt => opt.isCurrent)
      if (currentOption) {
        setSelectedMonthYear(currentOption.value)
      }
    }
  }, [selectedMonthYear])

  useEffect(() => {
    generateMonthYearOptions()
  }, [generateMonthYearOptions])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    setStaffMembers([])
    setHasMoreData(true)
    setTotalStaffCount(0)
  }, [dashboardType, dashboardStaffFilter, departmentFilter, selectedMonthYear])

  // Function to load staff data from server
  const loadStaffData = useCallback(async (page = 1, append = false) => {
    if (isLoadingMore) return;

    try {
      setIsLoadingMore(true)

      const role = localStorage.getItem("role")
      const loggedInUsername = localStorage.getItem("user-name")

      let finalStaffFilter = dashboardStaffFilter
      if ((!finalStaffFilter || finalStaffFilter === "all") &&
        role && role.toLowerCase() !== "admin" && role.toLowerCase() !== "superadmin") {
        finalStaffFilter = loggedInUsername
      }

      // Fetch staff data with their task summaries
      const data = await fetchStaffTasksDataApi(
        dashboardType,
        finalStaffFilter,
        page,
        itemsPerPage,
        selectedMonthYear, // Pass monthYear parameter
        departmentFilter // Pass departmentFilter
      )

      // Get total counts for both staff with tasks and total users
      if (page === 1) {
        const staffCount = await getStaffTasksCountApi(dashboardType, finalStaffFilter, departmentFilter);
        setTotalStaffCount(staffCount)
      }

      if (!data || data.length === 0) {
        setHasMoreData(false)
        if (!append) {
          setStaffMembers([])
        }
        setIsLoadingMore(false)
        return
      }

      // Filter data by selected month-year if specified
      let filteredData = data
      if (selectedMonthYear) {
        const [year, month] = selectedMonthYear.split('-').map(Number)
        filteredData = data.filter(staff => {
          // This is a placeholder - you'll need actual task dates for each staff
          // You might need to modify your API to accept month-year filter
          return true // Filter logic will go here
        })
      }

      if (append) {
        setStaffMembers(prev => [...prev, ...filteredData])
      } else {
        setStaffMembers(filteredData)
      }

      // Check if we have more data
      setHasMoreData(data.length === itemsPerPage)

    } catch (error) {
      console.error('Error loading staff data:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [dashboardType, dashboardStaffFilter, departmentFilter, isLoadingMore, selectedMonthYear])

  // Initial load when component mounts or dependencies change
  useEffect(() => {
    loadStaffData(1, false)
  }, [dashboardType, dashboardStaffFilter, departmentFilter, selectedMonthYear])

  // Function to load more data when scrolling
  const loadMoreData = () => {
    if (!isLoadingMore && hasMoreData) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadStaffData(nextPage, true)
    }
  }

  // Handle scroll event for infinite loading
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMoreData || isLoadingMore) return

      const tableContainer = document.querySelector('.staff-table-container')
      if (!tableContainer) return

      const { scrollTop, scrollHeight, clientHeight } = tableContainer
      const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.2

      if (isNearBottom) {
        loadMoreData()
      }
    }

    const tableContainer = document.querySelector('.staff-table-container')
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll)
      return () => tableContainer.removeEventListener('scroll', handleScroll)
    }
  }, [hasMoreData, isLoadingMore, currentPage])

  // Format on-time score with color coding
  const renderOnTimeScore = (score) => {
    let bgColor = "bg-red-100"
    let textColor = "text-red-800"

    if (score >= -20) {
      bgColor = "bg-green-100"
      textColor = "text-green-800"
    } else if (score >= -50) {
      bgColor = "bg-yellow-100"
      textColor = "text-yellow-800"
    }

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
        {score}%
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Show total count and active filters */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-3 md:space-y-0">
        <div className="flex flex-col space-y-2">
          {/* Month-Year Dropdown */}
          <div className="flex items-center space-x-2">
            <label htmlFor="monthYearFilter" className="text-sm font-medium text-gray-700">
              Filter by Month:
            </label>
            <select
              id="monthYearFilter"
              value={selectedMonthYear}
              onChange={(e) => setSelectedMonthYear(e.target.value)}
              className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Months</option>
              {monthYearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.isCurrent && "(Current)"}
                </option>
              ))}
            </select>
          </div>

          {totalStaffCount > 0 && (
            <div className="text-sm text-gray-600">
              Total Records: {totalStaffCount} | Showing: {staffMembers.length}
            </div>
          )}
        </div>

        {/* Show active filters */}
        <div className="flex flex-wrap gap-2">
          {dashboardStaffFilter !== "all" && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
              Staff: {dashboardStaffFilter}
            </span>
          )}
          {departmentFilter !== "all" && dashboardType === "checklist" && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              Dept Filter: {departmentFilter}
            </span>
          )}
          {selectedMonthYear && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
              Month: {monthYearOptions.find(opt => opt.value === selectedMonthYear)?.label || selectedMonthYear}
            </span>
          )}
        </div>
      </div>

      {staffMembers.length === 0 && !isLoadingMore ? (
        <div className="text-center p-8 text-gray-500">
          <p>No staff data found for the selected filters.</p>
          {selectedMonthYear && (
            <p className="text-sm mt-2">Try selecting "All Months" to see more results.</p>
          )}
          {dashboardStaffFilter !== "all" && (
            <p className="text-sm mt-2">Try selecting "All Staff Members" to see more results.</p>
          )}
        </div>
      ) : (
        <div
          className="staff-table-container overflow-hidden rounded-lg border border-gray-100"
          style={{ maxHeight: "450px", overflowY: "auto" }}
        >
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-[#c41e3a] sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight">Division</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight">Dept</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight">Total</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight">Done</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-white uppercase tracking-tight">Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {staffMembers.map((staff, index) => (
                  <tr key={`${staff.name}-${index}`} onClick={() => setSelectedStaff(staff)} className="hover:bg-red-50/5 transition-colors border-l-2 border-transparent hover:border-[#c41e3a] cursor-pointer active:scale-[0.99]">
                    <td className="px-3 py-2">
                      <div className="text-[11px] font-bold text-purple-600 uppercase tracking-tighter">{staff.division || 'N/A'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-tighter">{staff.department || 'N/A'}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-[13px] font-bold text-gray-800">{staff.name}</div>
                          {staff.verify_access && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-black rounded-md border border-blue-200 uppercase tracking-tighter">
                              {staff.verify_access}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 font-medium">{staff.employee_id || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[13px] font-bold text-blue-600">{staff.totalTasks}</td>
                    <td className="px-3 py-2 text-[13px] font-bold text-emerald-600">{staff.completedTasks}</td>
                    <td className="px-3 py-2 text-right">
                      {renderOnTimeScore(staff.onTimeScore || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-2 bg-gray-50/50 p-2">
            {staffMembers.map((staff, index) => (
              <div key={`${staff.name}-${index}`} onClick={() => setSelectedStaff(staff)} className="p-2.5 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-[#c41e3a] transition-all active:scale-[0.98] cursor-pointer">
                <div className="flex items-start gap-2 mb-2">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-[#c41e3a]/10 text-[#c41e3a] text-[10px] font-black rounded-md border border-[#c41e3a]/20">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col">
                        <h4 className="text-[14px] font-bold text-gray-800 leading-tight">{staff.name}</h4>
                        {staff.verify_access && (
                          <span className="mt-1 w-fit px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[8px] font-black rounded border border-blue-200 uppercase tracking-tighter">
                            {staff.verify_access}
                          </span>
                        )}
                      </div>
                      {renderOnTimeScore(staff.onTimeScore || 0)}
                    </div>
                    <div className="text-[10px] font-bold text-purple-600 uppercase tracking-tighter mt-0.5">
                      {staff.division || 'N/A'}
                    </div>
                    <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter mt-0.5">
                      {staff.department || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pl-7">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Total</span>
                    <span className="text-[12px] font-black text-blue-600">{staff.totalTasks}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Done</span>
                    <span className="text-[12px] font-black text-emerald-600">{staff.completedTasks}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isLoadingMore && (
            <div className="text-center py-4 bg-gray-50/50">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-solid border-[#c41e3a] border-r-transparent"></div>
              <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase">Loading more...</p>
            </div>
          )}

          {!hasMoreData && staffMembers.length > 0 && (
            <div className="text-center py-4 text-[11px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50/50">
              End of list
            </div>
          )}
        </div>
      )}
      {selectedStaff && <StaffModal />}
    </div>
  )
}
