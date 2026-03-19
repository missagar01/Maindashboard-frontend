// components/TaskNavigationTabs.js
"use client"

import { Filter, ChevronDown, ChevronUp } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../../../context/AuthContext";
import { formatDateTime } from "../../../utils/taskNormalizer.js"

export default function TaskNavigationTabs({
  dashboardType,
  taskView,
  setTaskView,
  searchQuery,
  setFilterStaff,
  getFrequencyColor,
  dashboardStaffFilter,
  departmentFilter,
  dateRange
}) {
  const { 
    housekeepingState, 
    fetchHousekeepingTaskCountsAction, 
    fetchHousekeepingDashboardTasksAction 
  } = useAuth();
  
  const { loadingDashboardTasks, taskCounts } = housekeepingState || {}

  const [currentPage, setCurrentPage] = useState(1)
  const [displayedTasks, setDisplayedTasks] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const totalItemsLoadedRef = useRef(0) // Track total items loaded from API (before filtering)
  const scrollContainerRef = useRef(null)
  const itemsPerPage = 50

  // Removed: doerName2Selections, userRole, and DOER2_OPTIONS - no longer needed after removing Doer Name 2 and Remarks columns

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    setDisplayedTasks([])
    setHasMoreData(true)
    setTotalCount(0)
    totalItemsLoadedRef.current = 0
  }, [taskView, dashboardType, dashboardStaffFilter, departmentFilter, dateRange])

  // Function to get task status based on submission_date
  const getTaskStatus = (submissionDate, status) => {
    if (submissionDate || status === 'Yes') {
      return "Completed";
    } else {
      return "Pending";
    }
  }

  // Function to load all task counts
  // Backend automatically filters by user_access from JWT token for user role
  const loadTaskCounts = useCallback(async () => {
    try {
      // Backend gets user_access from JWT token automatically for user role
      // For admin, pass department filter if selected
      const role = localStorage.getItem("role") || ""
      let departmentFilters = {}

      if (role.toLowerCase() !== "user" && departmentFilter && departmentFilter !== "all") {
        // For admin, use selected department filter
        departmentFilters.department = departmentFilter
      }

      if (dateRange?.startDate && dateRange?.endDate) {
        departmentFilters.startDate = dateRange.startDate
        departmentFilters.endDate = dateRange.endDate
      }
      // For user role, backend handles filtering from token - no need to pass department

      await fetchHousekeepingTaskCountsAction(departmentFilters);
    } catch {
      // Error handled by Redux
    }
  }, [departmentFilter, fetchHousekeepingTaskCountsAction, dateRange]);

  // Function to load tasks from API with pagination - optimized like checklist/maintenance
  const loadTasksFromApi = useCallback(async (page = 1, append = false) => {
    // Prevent duplicate calls
    if (isLoadingMore || loadingDashboardTasks) {
      return;
    }

    // Prevent loading if no more data
    if (append && !hasMoreData) {
      return;
    }

    try {
      setIsLoadingMore(true)

      let totalCountFromApi = 0;
      let allApiData = [];

      // Backend automatically filters by user_access from JWT token for user role
      // For admin, pass department filter if selected
      const role = localStorage.getItem("role") || ""
      let departmentFilters = {}

      if (role.toLowerCase() !== "user" && departmentFilter && departmentFilter !== "all") {
        // For admin, use selected department filter
        departmentFilters.department = departmentFilter
      }

      if (dateRange?.startDate && dateRange?.endDate) {
        departmentFilters.startDate = dateRange.startDate
        departmentFilters.endDate = dateRange.endDate
      }
      // For user role, backend handles filtering from token - no need to pass department

      // Map taskView to API taskType
      let taskType = "recent";
      if (taskView === "notdone") taskType = "notdone";
      else if (taskView === "overdue") taskType = "overdue";
      else if (taskView === "upcoming") taskType = "upcoming";
      else if (taskView === "recent") taskType = "recent";

      // For initial load, fetch 2 pages (100 items) at once
      if (!append && page === 1) {
        const [page1Result, page2Result] = await Promise.all([
          fetchHousekeepingDashboardTasksAction({
            taskType,
            page: 1,
            limit: itemsPerPage,
            filters: departmentFilters
          }),
          fetchHousekeepingDashboardTasksAction({
            taskType,
            page: 2,
            limit: itemsPerPage,
            filters: departmentFilters
          })
        ]);

        allApiData = [...(page1Result?.items || []), ...(page2Result?.items || [])];
        totalCountFromApi = page1Result?.total || 0;
        setCurrentPage(2); // Set to page 2 since we loaded 2 pages
      } else {
        // For subsequent loads, fetch single page
        const result = await fetchHousekeepingDashboardTasksAction({
          taskType,
          page,
          limit: itemsPerPage,
          filters: departmentFilters
        });

        allApiData = result?.items || [];
        totalCountFromApi = result?.total || 0;
      }

      // Set total count from API - use taskCounts from Redux if available, otherwise use API total
      if (!append) {
        // Use taskCounts from Redux based on current taskView
        let countFromRedux = 0;
        if (taskView === "recent") {
          countFromRedux = taskCounts?.recent || 0;
        } else if (taskView === "upcoming") {
          countFromRedux = taskCounts?.upcoming || 0;
        } else if (taskView === "overdue") {
          countFromRedux = taskCounts?.overdue || 0;
        } else if (taskView === "notdone") {
          countFromRedux = taskCounts?.notdone || 0;
        }
        // Use Redux count if available, otherwise use API total
        setTotalCount(countFromRedux > 0 ? countFromRedux : totalCountFromApi);
      }

      if (!allApiData || allApiData.length === 0) {
        setHasMoreData(false)
        if (!append) {
          setDisplayedTasks([])
        }
        setIsLoadingMore(false)
        return
      }

      // Process the data
      const processedTasks = allApiData.map((task) => {
        return {
          id: task.task_id,
          title: task.task_description,
          assignedTo: task.name || "Unassigned",
          taskStartDate: task.task_start_date, // show raw backend value
          originalTaskStartDate: task.task_start_date,
          status: getTaskStatus(task.submission_date, task.status), // Add status field
          submissionDate: task.submission_date || null,
          frequency: task.frequency || "one-time",
          rating: task.color_code_for || 0,
          department: task.department || "N/A",
          remarks: task.remark || "",
          rawTaskStartDate: task.task_start_date,
          rawSubmissionDate: task.submission_date,
          doerName2: task.doer_name2 || "", // Add doer_name2 for DOER2 select box
        }
      })

      // Apply filters
      let filteredTasks = processedTasks.filter((task) => {
        // Apply search filter
        if (searchQuery && searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase().trim()
          const matchesSearch = (
            (task.title && task.title.toLowerCase().includes(query)) ||
            (task.id && task.id.toString().includes(query)) ||
            (task.assignedTo && task.assignedTo.toLowerCase().includes(query)) ||
            (task.remarks && task.remarks.toLowerCase().includes(query)) ||
            (task.taskStartDate && task.taskStartDate.toLowerCase().includes(query)) ||
            (task.status && task.status.toLowerCase().includes(query))
          )
          if (!matchesSearch) return false;
        }

        return true;
      })

      // Calculate total items loaded from API (before filtering)
      // Track this in a ref so we can use it synchronously
      if (append) {
        totalItemsLoadedRef.current = totalItemsLoadedRef.current + allApiData.length;
      } else {
        totalItemsLoadedRef.current = allApiData.length;
      }
      const currentTotalLoaded = totalItemsLoadedRef.current;

      // Update displayed tasks
      if (append) {
        setDisplayedTasks(prev => {
          // Avoid duplicates by checking if task already exists
          const existingIds = new Set(prev.map(t => t.id));
          const newTasks = filteredTasks.filter(t => !existingIds.has(t.id));
          return [...prev, ...newTasks];
        });
      } else {
        setDisplayedTasks(filteredTasks);
      }

      // Check if there's more data to load
      // Compare total items loaded from API (not filtered count) with total available
      const hasMore = currentTotalLoaded < totalCountFromApi && allApiData.length > 0;
      setHasMoreData(hasMore);

    } catch {
      // Error loading tasks
    } finally {
      setIsLoadingMore(false)
    }
  }, [taskView, searchQuery, isLoadingMore, itemsPerPage, departmentFilter, loadingDashboardTasks, taskCounts, hasMoreData, dateRange])

  // Update totalCount when taskView or taskCounts change
  useEffect(() => {
    if (taskView === "recent") {
      setTotalCount(taskCounts?.recent || 0);
    } else if (taskView === "upcoming") {
      setTotalCount(taskCounts?.upcoming || 0);
    } else if (taskView === "notdone") { // Changed from "overdue"
      setTotalCount(taskCounts?.notdone || 0); // Changed from "overdue"
    }
  }, [taskView, taskCounts])

  // Initial load when component mounts or key dependencies change
  useEffect(() => {
    setCurrentPage(1);
    setDisplayedTasks([]);
    setHasMoreData(true);
    totalItemsLoadedRef.current = 0;
    loadTasksFromApi(1, false);
    loadTaskCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskView, dashboardType, dashboardStaffFilter, departmentFilter, dateRange])

  // Load when search changes
  useEffect(() => {
    if (currentPage === 1) {
      loadTasksFromApi(1, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, currentPage])

  // Infinite scroll handler - simple like checklist/maintenance
  const handleScroll = useCallback(() => {
    if (!hasMoreData || isLoadingMore || loadingDashboardTasks) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Check if near bottom (within 200px of bottom)
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 200;

    if (isNearBottom) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadTasksFromApi(nextPage, true);
    }
  }, [hasMoreData, isLoadingMore, loadingDashboardTasks, currentPage, loadTasksFromApi])

  // Attach scroll listener - simple approach like checklist/maintenance
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll])

  // Reset local staff filter when dashboardStaffFilter changes
  useEffect(() => {
    if (dashboardStaffFilter !== "all") {
      setFilterStaff("all")
    }
  }, [dashboardStaffFilter, setFilterStaff])

  // Render table headers based on task view
  const renderTableHeaders = () => {
    const baseHeaders = [
      { key: 'seq', label: 'Seq No.' },
      { key: 'id', label: 'Task ID' },
      { key: 'title', label: 'Task Description' },
      { key: 'assignedTo', label: 'Assigned To' },
    ];

    if (dashboardType === "checklist") {
      baseHeaders.push({ key: 'department', label: 'Department' });
    }

    baseHeaders.push(
      { key: 'taskStartDate', label: 'Task Start Date' },
      { key: 'submissionDate', label: 'Submission Date' },
      { key: 'frequency', label: 'Frequency' }
    );

    // Add Status column for Recent tasks
    if (taskView === "recent") {
      baseHeaders.push({ key: 'status', label: 'Status' });
    }

    // Removed: Doer Name 2 and Remarks columns from housekeeping dashboard
    // Doer Name 2 column removed (was for user role)
    // Remarks column removed (was for upcoming tasks)

    return baseHeaders;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Tab Headers with Counts */}
      <div className="grid grid-cols-3">
        <button
          className={`py-3 text-center font-medium transition-colors relative ${taskView === "recent" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          onClick={() => setTaskView("recent")}
        >
          {dashboardType === "delegation" ? "Today Tasks" : "Today's Tasks"}

        </button>
        <button
          className={`py-3 text-center font-medium transition-colors relative ${taskView === "upcoming" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          onClick={() => setTaskView("upcoming")}
        >
          {dashboardType === "delegation" ? "Future Tasks" : "Upcoming Tasks"}

        </button>
        <button
          className={`py-3 text-center font-medium transition-colors relative ${taskView === "notdone" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          onClick={() => setTaskView("notdone")}
        >
          Not Done Tasks

        </button>
      </div>

      <div className="p-4">
        {/* Total Count Display */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Total Tasks:
              <span className="ml-2 text-blue-600 font-bold">
                {taskView === "recent"
                  ? (taskCounts?.recent || 0)
                  : taskView === "upcoming"
                    ? (taskCounts?.upcoming || 0)
                    : taskView === "overdue"
                      ? (taskCounts?.overdue || 0)
                      : taskView === "notdone"
                        ? (taskCounts?.notdone || 0)
                        : 0}
              </span>
            </span>
            <div className="text-xs text-gray-500">
              Showing {displayedTasks.length} of {totalCount} tasks
            </div>
          </div>
        </div>

        {displayedTasks.length === 0 && !isLoadingMore ? (
          <div className="text-center p-8 text-gray-500">
            <p>
              {taskView === "recent"
                ? "No tasks found for today."
                : `No tasks found for ${taskView} view.`
              }
            </p>
            {(dashboardStaffFilter !== "all" || departmentFilter !== "all") && (
              <p className="text-sm mt-2">Try adjusting your filters to see more results.</p>
            )}
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="task-table-container overflow-x-auto"
            style={{ maxHeight: "400px", overflowY: "auto", position: "relative" }}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {renderTableHeaders().map((header) => (
                    <th
                      key={header.key}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedTasks.map((task, index) => {
                  const sequenceNumber = index + 1;

                  return (
                    <tr key={`${task.id}-${task.taskStartDate}-${sequenceNumber}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                        {sequenceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{task.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.assignedTo}</td>
                      {dashboardType === "checklist" && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.department}</td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.taskStartDate && task.taskStartDate !== '—' ? formatDateTime(task.taskStartDate) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.submissionDate ? formatDateTime(task.submissionDate, true) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(task.frequency)}`}>
                          {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)}
                        </span>
                      </td>

                      {/* Status column - only for Recent tasks */}
                      {taskView === "recent" && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                      )}

                      {/* Removed: Remarks and Doer Name 2 columns from housekeeping dashboard */}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isLoadingMore && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500 mt-2">Loading tasks...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
