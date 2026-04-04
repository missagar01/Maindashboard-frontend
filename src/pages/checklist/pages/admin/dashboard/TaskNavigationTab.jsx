"use client"

import { Filter, ChevronDown, ChevronUp, Search, Clock, Calendar, XCircle } from "lucide-react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { fetchDashboardDataApi, getDashboardDataCount } from "@/api/checklist/dashboardApi.js"

export default function TaskNavigationTabs({
  dashboardType,
  taskView,
  setTaskView,
  searchQuery,
  setSearchQuery,
  filterStaff,
  setFilterStaff,
  getFrequencyColor,
  dashboardStaffFilter,
  departmentFilter,
  stats,
  dateRange
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [displayedTasks, setDisplayedTasks] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [itemsPerPage] = useState(50)

  const getCount = (val) => (val && typeof val === 'object' ? Number(val.count || 0) : Number(val || 0));

  // Extract primitives from dateRange to avoid identity-based re-renders
  const dateRangeStart = dateRange?.startDate || ""
  const dateRangeEnd = dateRange?.endDate || ""

  useEffect(() => {
    setCurrentPage(1)
    setDisplayedTasks([])
    setHasMoreData(true)
    setTotalCount(0)
  }, [taskView, dashboardType, dashboardStaffFilter, departmentFilter, dateRangeStart, dateRangeEnd])


  const isLoadingRef = useRef(false)

  const loadTasksFromServer = useCallback(async (page = 1, append = false) => {
    if (isLoadingRef.current) return;
    try {
      isLoadingRef.current = true
      setIsLoadingMore(true)
      const data = await fetchDashboardDataApi(
        dashboardType,
        dashboardStaffFilter,
        page,
        itemsPerPage,
        taskView,
        departmentFilter,
        dateRangeStart,
        dateRangeEnd
      )

      if (page === 1) {
        const count = await getDashboardDataCount(dashboardType, dashboardStaffFilter, taskView, departmentFilter, dateRangeStart, dateRangeEnd)

        setTotalCount(typeof count === 'object' ? count.count : count)
      }

      if (!data || data.length === 0) {
        setHasMoreData(false)
        if (!append) setDisplayedTasks([])
        setIsLoadingMore(false)
        isLoadingRef.current = false
        return
      }

      const processedTasks = data.map((task) => {
        const taskStartDate = parseTaskStartDate(task.task_start_date)
        const completionDate = task.submission_date ? parseTaskStartDate(task.submission_date) : null
        let status = "pending"
        if (completionDate || task.status === 'Yes') status = "completed"
        else if (taskStartDate && isDateInPast(taskStartDate)) status = "overdue"

        return {
          id: task.task_id,
          title: task.task_description,
          assignedTo: task.name || "Unassigned",
          taskStartDate: formatDateToDDMMYYYY(taskStartDate),
          originalTaskStartDate: task.task_start_date,
          status,
          frequency: task.frequency || "one-time",
          rating: task.color_code_for || 0,
          department: task.department || "N/A",
        }
      })

      let filteredTasks = processedTasks.filter((task) => {
        if (searchQuery && searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase().trim()
          return (
            (task.title && task.title.toLowerCase().includes(query)) ||
            (task.id && task.id.toString().includes(query)) ||
            (task.assignedTo && task.assignedTo.toLowerCase().includes(query))
          )
        }
        return true
      })

      if (append) {
        setDisplayedTasks((prev) => {
          const existingIds = new Set(prev.map(t => t.id))
          const uniqueNewTasks = filteredTasks.filter(t => !existingIds.has(t.id))
          return [...prev, ...uniqueNewTasks]
        })
      }
      else setDisplayedTasks(filteredTasks)
      setHasMoreData(data.length === itemsPerPage)
    } catch (error) {
    } finally {
      setIsLoadingMore(false)
      isLoadingRef.current = false
    }
  }, [dashboardType, dashboardStaffFilter, taskView, searchQuery, departmentFilter, itemsPerPage, dateRangeStart, dateRangeEnd])


  const parseTaskStartDate = (dateStr) => {
    if (!dateStr) return null
    if (dateStr instanceof Date) return Number.isNaN(dateStr.getTime()) ? null : new Date(dateStr)
    if (typeof dateStr !== "string") return null

    const raw = dateStr.trim()
    if (!raw) return null

    const isoMatch = raw.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/
    )
    if (isoMatch) {
      const [, year, month, day, hours = "0", minutes = "0", seconds = "0"] = isoMatch
      const parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds)
      )
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const dmyMatch = raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/
    )
    if (dmyMatch) {
      const [, day, month, year, hours = "0", minutes = "0", seconds = "0"] = dmyMatch
      const parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds)
      )
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const formatDateToDDMMYYYY = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return ""
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const isDateInPast = (date) => {
    if (!date || !(date instanceof Date)) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  useEffect(() => {
    loadTasksFromServer(1, false)
  }, [taskView, dashboardType, dashboardStaffFilter, departmentFilter, dateRangeStart, dateRangeEnd])


  useEffect(() => {
    if (currentPage === 1) loadTasksFromServer(1, false)
  }, [searchQuery])

  useEffect(() => {
    if (dashboardStaffFilter !== "all") setFilterStaff("all")
  }, [dashboardStaffFilter])

  const loadMoreData = () => {
    if (!isLoadingMore && hasMoreData) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadTasksFromServer(nextPage, true)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (!hasMoreData || isLoadingMore) return
      const tableContainer = document.querySelector('.task-table-container')
      if (!tableContainer) return
      const { scrollTop, scrollHeight, clientHeight } = tableContainer
      if (scrollHeight - scrollTop <= clientHeight * 1.5) loadMoreData()
    }
    const tableContainer = document.querySelector('.task-table-container')
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll)
      return () => tableContainer.removeEventListener('scroll', handleScroll)
    }
  }, [hasMoreData, isLoadingMore, currentPage])

  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Tab Navigation - Extremely Compact */}
      <div className="flex border-b border-gray-100">
        {useMemo(() => [
          { id: "recent", label: dashboardType === "delegation" ? "Today" : "Recent", icon: Clock, color: "text-[#c41e3a]", count: stats?.pendingTasks },
          { id: "upcoming", label: dashboardType === "delegation" ? "Future" : "Upcoming", icon: Calendar, color: "text-indigo-500", count: stats?.upcomingTasks },
          { id: "notdone", label: "Not Done", icon: XCircle, color: "text-zinc-500", count: stats?.notDoneTasks }
        ], [dashboardType, stats?.pendingTasks, stats?.upcomingTasks, stats?.notDoneTasks]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTaskView(tab.id)}
            className={`flex-1 py-3 px-1 text-center transition-all border-b-2 font-bold text-xs ${taskView === tab.id
              ? `border-[#c41e3a] ${tab.color} bg-gray-50/50`
              : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50/30"
              }`}
          >
            <span className="block">{tab.label}</span>
            <span className="text-[10px] opacity-70">({getCount(tab.count)})</span>
          </button>
        ))}
      </div>

      <div className="p-3">
        {/* Search & Filter Bar - Compact */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-red-100 focus:border-[#c41e3a] outline-none transition-all"
            />
          </div>
        </div>

        {/* Filter Content */}
        {isFilterExpanded && (
          <div className="mb-3 p-3 bg-gray-50/50 rounded-lg border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex flex-wrap gap-1.5">
              <div className="text-[9px] font-bold text-gray-400 uppercase mb-1 w-full tracking-wider">Applied</div>
              {dashboardStaffFilter !== "all" && (
                <span className="px-2 py-0.5 bg-white border border-red-100 text-[#c41e3a] rounded text-[9px] font-bold shadow-sm">
                  Staff: {dashboardStaffFilter}
                </span>
              )}
              {departmentFilter !== "all" && (
                <span className="px-2 py-0.5 bg-white border border-emerald-100 text-emerald-600 rounded text-[9px] font-bold shadow-sm">
                  Dept: {departmentFilter}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 bg-white border border-blue-100 text-blue-600 rounded text-[9px] font-bold shadow-sm">
                  Query: {searchQuery}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Table/Card Section - Extremely Compact & Responsive */}
        {displayedTasks.length === 0 && !isLoadingMore ? (
          <div className="text-center py-8 bg-gray-50/30 rounded-lg border border-dashed border-gray-200">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Empty View</p>
          </div>
        ) : (
          <div className="task-table-container overflow-hidden rounded-lg border border-gray-100" style={{ maxHeight: "450px", overflowY: "auto" }}>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-[#c41e3a] sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight">S.No</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider tracking-tight">Task</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider tracking-tight">User</th>
                    {dashboardType === "checklist" && (
                      <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider tracking-tight">Dept</th>
                    )}
                    <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider tracking-tight">Start</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-white uppercase tracking-wider tracking-tight">Freq</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {displayedTasks.map((task, index) => (
                    <tr key={`${task.id}-${task.taskStartDate}-${index}`} className="hover:bg-red-50/5 transition-colors border-l-2 border-transparent hover:border-[#c41e3a]">
                      <td className="px-3 py-2 text-[13px] font-bold text-gray-600">{index + 1}</td>
                      <td className="px-3 py-2 text-[13px] text-gray-800 font-semibold leading-tight">{task.title}</td>
                      <td className="px-3 py-2 text-[13px] text-gray-600 font-medium">{task.assignedTo}</td>
                      {dashboardType === "checklist" && (
                        <td className="px-3 py-2 text-[11px] font-bold text-indigo-600 uppercase tracking-tighter">{task.department}</td>
                      )}
                      <td className="px-3 py-2 text-[12px] font-medium text-gray-500 font-mono whitespace-nowrap">{task.taskStartDate}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm ${getFrequencyColor(task.frequency)} text-white inline-block min-w-[70px] text-center`}>
                          {task.frequency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-2 bg-gray-50/50 p-2">
              {displayedTasks.map((task, index) => (
                <div key={`${task.id}-${task.taskStartDate}-${index}`} className="p-2.5 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-[#c41e3a] transition-all active:scale-[0.98]">
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-[#c41e3a]/10 text-[#c41e3a] text-[10px] font-black rounded-md border border-[#c41e3a]/20">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-[13px] font-bold text-gray-800 leading-tight">{task.title}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-xs ${getFrequencyColor(task.frequency)} text-white whitespace-nowrap`}>
                          {task.frequency}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-7">
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-red-400"></div>
                      <span className="text-[12px] font-bold text-gray-600">{task.assignedTo}</span>
                    </div>
                    {dashboardType === "checklist" && (
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                        <span className="text-[11px] font-bold text-indigo-600">{task.department}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                      <span className="text-[11px] font-mono font-medium text-gray-500">{task.taskStartDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isLoadingMore && (
              <div className="p-3 text-center bg-gray-50/50">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#c41e3a] border-r-transparent"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
