"use client"

import { Filter, ChevronDown, ChevronUp } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  fetchMaintenanceDashboardDataApi,
} from "@/api/checklist/maintenanceDashboardApi.js"

export default function MaintenanceTaskNavigationTabs({
  taskView,
  setTaskView,
  searchQuery,
  setSearchQuery,
  getFrequencyColor,
  dashboardStaffFilter,
  departmentFilter,
  dateRange,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [displayedTasks, setDisplayedTasks] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const itemsPerPage = 50
  const tableContainerRef = useRef(null)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    setDisplayedTasks([])
    setHasMoreData(true)
    setTotalCount(0)
  }, [taskView, dashboardStaffFilter, departmentFilter])

  const isLoadingRef = useRef(false)

  // Function to load tasks from server
  const loadTasksFromServer = useCallback(
    async (page = 1, append = false) => {
      if (isLoadingRef.current) return

      try {
        isLoadingRef.current = true
        setIsLoadingMore(true)

        const response = await fetchMaintenanceDashboardDataApi(
          dashboardStaffFilter,
          page,
          itemsPerPage,
          taskView,
          departmentFilter,
          dateRange?.startDate,
          dateRange?.endDate
        )

        // Extract data and total count from API response
        const data = response.data || response || []
        const total = response.total || 0

        // Set total count from API response (only on first load)
        if (page === 1) {
          setTotalCount(total)
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
          setHasMoreData(false)
          if (!append) {
            setDisplayedTasks([])
          }
          setIsLoadingMore(false)
          isLoadingRef.current = false
          return
        }

        // Process maintenance tasks - transform to checklist format
        const processedTasks = (Array.isArray(data) ? data : []).map((task) => {
          if (!task) return null;

          const taskStartDate = parseTaskStartDate(task.Task_Start_Date || task.task_start_date)
          const completionDate = (task.Actual_Date || task.actual_date)
            ? parseTaskStartDate(task.Actual_Date || task.actual_date)
            : null

          let status = "pending"
          if (completionDate || task.Actual_Date || task.actual_date) {
            status = "completed"
          } else if (taskStartDate && isDateInPast(taskStartDate)) {
            status = "overdue"
          }

          return {
            id: task.id || task.Task_No || task.task_no || `task-${Math.random()}`,
            title: task.Description || task.Description || task.task_description || "No description",
            assignedTo: task.Doer_Name || task.doer_name || "Unassigned",
            taskStartDate: formatDateToDDMMYYYY(taskStartDate),
            originalTaskStartDate: task.Task_Start_Date || task.task_start_date,
            status,
            submissionDate: completionDate,
            frequency: task.Frequency || task.frequency || "one-time",
            department: task.machine_department || task.department || "N/A",
            machineName: task.Machine_Name || task.machine_name || "N/A",
            serialNo: task.Serial_No || task.serial_no || "N/A",
          }
        }).filter(Boolean)

        // Apply client-side search filter if needed
        let filteredTasks = processedTasks.filter((task) => {
          if (searchQuery && searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase().trim()
            return (
              (task.title &&
                task.title.toLowerCase().includes(query)) ||
              (task.id && task.id.toString().includes(query)) ||
              (task.assignedTo &&
                task.assignedTo.toLowerCase().includes(query)) ||
              (task.machineName &&
                task.machineName.toLowerCase().includes(query)) ||
              (task.serialNo &&
                task.serialNo.toLowerCase().includes(query))
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
        } else {
          setDisplayedTasks(filteredTasks)
        }

        // Check if we have more data
        setHasMoreData(data.length === itemsPerPage)
      } catch (error) {
        console.error("Error loading maintenance tasks:", error)
      } finally {
        setIsLoadingMore(false)
        isLoadingRef.current = false
      }
    },
    [
      dashboardStaffFilter,
      taskView,
      searchQuery,
      departmentFilter,
      itemsPerPage,
      dateRange,
    ]
  )

  // Helper functions
  const parseTaskStartDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null

    if (dateStr.includes("-") && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = new Date(dateStr)
      return isNaN(parsed) ? null : parsed
    }

    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ")
      const datePart = parts[0]
      const dateComponents = datePart.split("/")
      if (dateComponents.length !== 3) return null

      const [day, month, year] = dateComponents.map(Number)
      if (!day || !month || !year) return null

      const date = new Date(year, month - 1, day)
      if (parts.length > 1) {
        const timePart = parts[1]
        const timeComponents = timePart.split(":")
        if (timeComponents.length >= 2) {
          const [hours, minutes, seconds] = timeComponents.map(Number)
          date.setHours(hours || 0, minutes || 0, seconds || 0)
        }
      }
      return isNaN(date) ? null : date
    }

    const parsed = new Date(dateStr)
    return isNaN(parsed) ? null : parsed
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

  // Load tasks when component mounts or filters change
  useEffect(() => {
    loadTasksFromServer(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskView, dashboardStaffFilter, departmentFilter, dateRange])

  // Reload when search query changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasksFromServer(1, false)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!hasMoreData || isLoadingMore) return

    const container = tableContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200

    if (isNearBottom) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadTasksFromServer(nextPage, true)
    }
  }, [hasMoreData, isLoadingMore, currentPage, loadTasksFromServer])

  // Set up scroll listener for infinite scroll
  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Filter tasks by view
  const getFilteredTasks = () => {
    return displayedTasks
  }

  const filteredTasks = getFilteredTasks()

  return (
    <div className="space-y-4 w-full">
      {/* Tabs - Full Width Grid like Checklist - Sticky */}
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="grid grid-cols-3">
          <button
            onClick={() => setTaskView("recent")}
            className={`py-3 text-center font-medium transition-colors ${taskView === "recent"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            Recent Tasks
          </button>
          <button
            onClick={() => setTaskView("upcoming")}
            className={`py-3 text-center font-medium transition-colors ${taskView === "upcoming"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            Upcoming Tasks
          </button>
          <button
            onClick={() => setTaskView("notdone")}
            className={`py-3 text-center font-medium transition-colors ${taskView === "notdone"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            Not Done Tasks
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          <Filter className="h-4 w-4" />
          Filters
          {isFilterExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Task count */}
      <div className="text-sm text-gray-600 w-full">
        Total {taskView === "recent" ? "Recent" : taskView === "upcoming" ? "Upcoming" : "Not Done"} Tasks: {totalCount} | Showing: {filteredTasks.length}
      </div>

      {/* Task table - with infinite scroll */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden w-full">
        <div
          ref={tableContainerRef}
          className="overflow-x-auto w-full task-table-container"
          style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                  SEQ NO.
                </th>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                  TASK ID
                </th>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                  TASK DESCRIPTION
                </th>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 hidden md:table-cell">
                  ASSIGNED TO
                </th>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 hidden lg:table-cell">
                  DEPARTMENT
                </th>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 hidden lg:table-cell">
                  MACHINE
                </th>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                  TASK START DATE
                </th>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                  SUBMISSION DATE
                </th>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 hidden sm:table-cell">
                  FREQUENCY
                </th>
                <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    {isLoadingMore ? "Loading..." : "No tasks found"}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task, index) => (
                  <tr
                    key={task.id || index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <span className="font-medium">{task.id}</span>
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 max-w-[150px] sm:max-w-xs truncate">
                      {task.title}
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                      {task.assignedTo}
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                      {task.department}
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                      <div className="max-w-xs truncate">
                        {task.machineName} ({task.serialNo})
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {task.taskStartDate}
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {task.submissionDate ? formatDateToDDMMYYYY(task.submissionDate) : '-'}
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getFrequencyColor
                          ? getFrequencyColor(task.frequency)
                          : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {task.frequency}
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${task.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : task.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                          }`}
                      >
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
              {isLoadingMore && (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    Loading more tasks...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

