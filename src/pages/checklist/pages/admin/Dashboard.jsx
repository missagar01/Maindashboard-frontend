"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "../../context/AuthContext"
import AdminLayout from "../../components/layout/AdminLayout.jsx"
import DashboardHeader from "./dashboard/DashboardHeader.jsx"
import StatisticsCards from "./dashboard/StaticsCard.jsx"
import TaskNavigationTabs from "./dashboard/TaskNavigationTab.jsx"
import CompletionRateCard from "./dashboard/CompletionRateCard.jsx"
import TasksOverviewChart from "./dashboard/Chart/TaskOverviewChart.jsx"
import TasksCompletionChart from "./dashboard/Chart/TaskCompletionChart.jsx"
import StaffTasksTable from "./dashboard/StaffTaskTable.jsx"
import MaintenanceDashboard from "./MaintenanceDashboardNew.jsx"
import HousekeepingDashboard from "./housekeppingDashboard.jsx"
import DivisionWiseCards from "./dashboard/DivisionWiseCards.jsx"

import {
  fetchDashboardDataApi,
  getUniqueDepartmentsApi,
  getStaffNamesByDepartmentApi,
  fetchChecklistDataByDateRangeApi,
  getChecklistDateRangeStatsApi
} from "@/api/checklist/dashboardApi.js"

const hasDashboardAdminAccess = (role = "") => {
  const normalizedRole = String(role || "").toLowerCase()
  return normalizedRole === "admin" || normalizedRole === "superadmin"
}

export default function AdminDashboard() {
  const [dashboardType, setDashboardType] = useState("checklist")
  const [taskView, setTaskView] = useState("recent")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterStaff, setFilterStaff] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [dashboardStaffFilter, setDashboardStaffFilter] = useState("all")
  const [availableStaff, setAvailableStaff] = useState([])
  const userRole = localStorage.getItem("role")
  const username = localStorage.getItem("user-name")
  const designation = localStorage.getItem("designation")
  const division = localStorage.getItem("division")
  const isPrivilegedUser = hasDashboardAdminAccess(userRole)
  const [dashboardView, setDashboardView] = useState("checklist") // New state for dashboard 

  // Get system_access and role to check if user has housekeeping access
  // Allow users to see housekeeping if they have user_access1 (departments) or system_access includes housekeeping
  const systemAccess = (localStorage.getItem("system_access") || "").split(',').map(item => item.trim().toLowerCase())
  const userAccess1 = localStorage.getItem("user_access1") || localStorage.getItem("userAccess1") || ""
  const hasUserDepartments = userRole?.toLowerCase() === "user" && userAccess1.trim() !== ""

  // For admin: show if system_access is empty or includes 'housekeeping'
  // For user: show if they have user_access1 (departments) OR if system_access includes 'housekeeping'
  const hasHousekeepingAccess = userRole?.toLowerCase() === "user"
    ? (hasUserDepartments || systemAccess.includes('housekeeping'))
    : (systemAccess.length === 0 || systemAccess.includes('housekeeping'))


  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [allTasks, setAllTasks] = useState([])
  const [batchSize] = useState(1000)
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [availableDepartments, setAvailableDepartments] = useState([])

  // State for department data
  const [departmentData, setDepartmentData] = useState({
    allTasks: [],
    staffMembers: [],
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    upcomingTasks: 0,
    notDoneTasks: 0,
    completionRate: 0,
    barChartData: [],
    pieChartData: [],
    completedRatingOne: 0,
    completedRatingTwo: 0,
    completedRatingThreePlus: 0,
  })

  // New state for date range filtering
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
    filtered: false,
  })

  // State to store filtered statistics
  const [filteredDateStats, setFilteredDateStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    upcomingTasks: 0,
    completionRate: 0,
  })

  const { 
    dashboardStats, 
    fetchDashboardStats, 
    fetchDashboardData: contextFetchDashboardData 
  } = useAuth()

  const { totalTask, completeTask, pendingTask, overdueTask, notDoneTask, upcomingTask } = dashboardStats

  useEffect(() => {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    if (role && !hasDashboardAdminAccess(role)) {
      setDashboardStaffFilter(username);
      setFilterStaff(username);
      setDepartmentFilter("all");        // non-admin cannot filter department by default
    }
  }, []);



  // Handle date range change from DashboardHeader
  const handleDateRangeChange = async (startDate, endDate) => {
    if (startDate && endDate) {
      // Set date range state
      setDateRange({
        startDate,
        endDate,
        filtered: true
      });

      // Fetch data with date range filter
      try {
        setIsLoadingMore(true);

        if (dashboardType === "checklist") {
          // Use the new date range API for checklist
          const filteredData = await fetchChecklistDataByDateRangeApi(
            startDate,
            endDate,
            dashboardStaffFilter,
            departmentFilter,
            1,
            batchSize,
            'all'
          );

          // Update available staff for the dropdown
          await updateAvailableStaff(filteredData, dashboardType, departmentFilter);

          // Also get statistics for the date range
          const stats = await getChecklistDateRangeStatsApi(
            startDate,
            endDate,
            dashboardStaffFilter,
            departmentFilter
          );

          // Process the filtered data
          processFilteredData(filteredData, stats);
        } else {
          // For delegation, use the existing logic with date filtering
          await fetchDepartmentDataWithDateRange(startDate, endDate);
        }
      } catch (error) {
        console.error("Error fetching date range data:", error);
      } finally {
        setIsLoadingMore(false);
      }
    } else {
      // Clear date range filter
      setDateRange({
        startDate: "",
        endDate: "",
        filtered: false
      });
      setFilteredDateStats({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
      });

      // Reload original data without date filter
      fetchDepartmentData(1, false);
    }
  };


  const processFilteredData = (data, stats) => {
    const username = localStorage.getItem("user-name");
    const currentUserRole = localStorage.getItem("role");
    const canViewAllStaff = hasDashboardAdminAccess(currentUserRole);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;
    let upcomingTasks = 0;

    const monthlyData = {
      Jan: { completed: 0, pending: 0 },
      Feb: { completed: 0, pending: 0 },
      Mar: { completed: 0, pending: 0 },
      Apr: { completed: 0, pending: 0 },
      May: { completed: 0, pending: 0 },
      Jun: { completed: 0, pending: 0 },
      Jul: { completed: 0, pending: 0 },
      Aug: { completed: 0, pending: 0 },
      Sep: { completed: 0, pending: 0 },
      Oct: { completed: 0, pending: 0 },
      Nov: { completed: 0, pending: 0 },
      Dec: { completed: 0, pending: 0 },
    };

    // Process tasks
    const processedTasks = data
      .map((task) => {
        // Skip if not assigned to current user (for non-admin)
        if (!canViewAllStaff && task.name?.toLowerCase() !== username?.toLowerCase()) {
          return null;
        }

        const taskStartDate = parseTaskStartDate(task.task_start_date);
        const completionDate = task.submission_date ? parseTaskStartDate(task.submission_date) : null;

        let status = "pending";
        if (completionDate) {
          status = "completed";
        } else if (taskStartDate && isDateInPast(taskStartDate)) {
          status = "overdue";
        }

        // Count tasks for statistics - include ALL tasks in the date range
        if (taskStartDate) {
          totalTasks++;

          if (dashboardType === "checklist") {
            // For checklist: Use status field directly
            if (task.status === 'Yes') {
              completedTasks++;
            } else {
              pendingTasks++;
            }

            // Overdue tasks for checklist: past tasks with status not 'Yes'
            if (taskStartDate && taskStartDate < today && task.status !== 'Yes') {
              overdueTasks++;
            }
            if (
              taskStartDate &&
              taskStartDate > today &&
              !task.submission_date &&
              task.status !== "Yes"
            ) {
              upcomingTasks++;
            }
          } else {
            // For delegation: Use submission_date
            if (task.submission_date) {
              completedTasks++;
            } else {
              pendingTasks++;
              if (taskStartDate && taskStartDate < today) {
                overdueTasks++;
              }
            }
            if (
              taskStartDate &&
              taskStartDate > today &&
              !task.submission_date &&
              (!task.status || task.status !== "completed")
            ) {
              upcomingTasks++;
            }
          }
        }

        // Update monthly data
        if (taskStartDate) {
          const monthName = taskStartDate.toLocaleString("default", { month: "short" });
          if (monthlyData[monthName]) {
            if (status === "completed") {
              monthlyData[monthName].completed++;
            } else {
              monthlyData[monthName].pending++;
            }
          }
        }

        return {
          id: task.task_id,
          title: task.task_description,
          assignedTo: task.name || "Unassigned",
          taskStartDate: formatDateToDDMMYYYY(taskStartDate),
          originalTaskStartDate: task.task_start_date,
          submission_date: task.submission_date,
          status,
          frequency: task.frequency || "one-time",
          rating: task.color_code_for || 0,
        };
      })
      .filter(Boolean);

    const barChartData = Object.entries(monthlyData).map(([name, data]) => ({
      name,
      completed: data.completed,
      pending: data.pending,
    }));

    // Use stats from API if available, otherwise use our calculations
    const finalStats = {
      totalTasks: stats?.totalTasks ?? totalTasks,
      completedTasks: stats?.completedTasks ?? completedTasks,
      pendingTasks: stats?.pendingTasks ?? pendingTasks,
      overdueTasks: stats?.overdueTasks ?? overdueTasks,
      upcomingTasks: stats?.upcomingTasks ?? upcomingTasks,
      notDoneTasks: stats?.notDoneTasks ?? 0,
      completionRate: stats?.completionRate ?? (totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0)
    };

    const getVal = (v) => (v && typeof v === 'object' ? v.count : v);

    const pieChartData = [
      { name: "Completed", value: getVal(finalStats.completedTasks), color: "#22c55e" },
      { name: "Pending", value: getVal(finalStats.pendingTasks), color: "#facc15" },
      { name: "Overdue", value: getVal(finalStats.overdueTasks), color: "#ef4444" },
      { name: "Not Done", value: getVal(finalStats.notDoneTasks), color: "#94a3b8" },
    ];

    // Update department data with filtered results
    setDepartmentData(prev => ({
      ...prev,
      allTasks: processedTasks,
      totalTasks: finalStats.totalTasks,
      completedTasks: finalStats.completedTasks,
      pendingTasks: finalStats.pendingTasks,
      overdueTasks: finalStats.overdueTasks,
      upcomingTasks: finalStats.upcomingTasks,
      completionRate: finalStats.completionRate,
      barChartData,
      pieChartData,
    }));

    // Update filtered stats for StatisticsCards
    setFilteredDateStats({
      totalTasks: finalStats.totalTasks,
      completedTasks: finalStats.completedTasks,
      pendingTasks: finalStats.pendingTasks,
      overdueTasks: finalStats.overdueTasks,
      upcomingTasks: finalStats.upcomingTasks,
      notDoneTasks: finalStats.notDoneTasks,
      completionRate: finalStats.completionRate,
    });
  };

  const fetchDepartmentDataWithDateRange = async (startDate, endDate, page = 1, append = false) => {
    try {
      const data = await fetchDashboardDataApi(dashboardType, dashboardStaffFilter, page, batchSize, 'all', departmentFilter);

      // Filter data by date range on client side
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const filteredData = data.filter(task => {
        const taskDate = parseTaskStartDate(task.task_start_date);
        return taskDate && taskDate >= start && taskDate <= end;
      });

      // Calculate stats manually with proper logic
      let totalTasks = filteredData.length;
      let completedTasks = 0;
      let pendingTasks = 0;
      let overdueTasks = 0;
      let notDoneTasks = 0;

      filteredData.forEach(task => {
        const taskDate = parseTaskStartDate(task.task_start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dashboardType === "checklist") {
          // For checklist: Use status field
          if (task.status === 'Yes') {
            completedTasks++;
          } else if (task.status === 'No') {
            notDoneTasks++;
            pendingTasks++; // Not done tasks are also pending
          } else {
            // For null or other status
            pendingTasks++;
          }

          // Overdue tasks for checklist: past tasks with status not 'Yes'
          if (taskDate && taskDate < today && task.status !== 'Yes') {
            overdueTasks++;
          }
        } else {
          // Delegation logic
          if (task.submission_date) {
            completedTasks++;
          } else {
            pendingTasks++;
            if (taskDate && taskDate < today) {
              overdueTasks++;
            }
          }
          // For delegation, not done is simply pending tasks
          notDoneTasks = pendingTasks;
        }
      });

      const stats = {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        notDoneTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0
      };

      // Update available staff for the dropdown
      await updateAvailableStaff(filteredData, dashboardType, departmentFilter);

      processFilteredData(filteredData, stats);
    } catch (error) {
      console.error("Error fetching data with date range:", error);
    }
  };

  // Updated date parsing function to handle both formats
  const parseTaskStartDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null

    // Handle YYYY-MM-DD format (ISO format from Supabase)
    if (dateStr.includes("-") && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = new Date(dateStr)
      return isNaN(parsed) ? null : parsed
    }

    // Handle DD/MM/YYYY format (with or without time)
    if (dateStr.includes("/")) {
      // Split by space first to separate date and time
      const parts = dateStr.split(" ")
      const datePart = parts[0] // "25/08/2025"

      const dateComponents = datePart.split("/")
      if (dateComponents.length !== 3) return null

      const [day, month, year] = dateComponents.map(Number)

      if (!day || !month || !year) return null

      // Create date object (month is 0-indexed)
      const date = new Date(year, month - 1, day)

      // If there's time component, parse it
      if (parts.length > 1) {
        const timePart = parts[1] // "09:00:00"
        const timeComponents = timePart.split(":")
        if (timeComponents.length >= 2) {
          const [hours, minutes, seconds] = timeComponents.map(Number)
          date.setHours(hours || 0, minutes || 0, seconds || 0)
        }
      }

      return isNaN(date) ? null : date
    }

    // Fallback: Try ISO format
    const parsed = new Date(dateStr)
    return isNaN(parsed) ? null : parsed
  }

  // Helper function to format date from ISO format to DD/MM/YYYY
  const formatLocalDate = (isoDate) => {
    if (!isoDate) return ""
    const date = new Date(isoDate)
    return formatDateToDDMMYYYY(date)
  }

  // Format date as DD/MM/YYYY
  const formatDateToDDMMYYYY = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return ""
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Check if date is today
  const isDateToday = (date) => {
    if (!date || !(date instanceof Date)) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Check if date is in the past (excluding today)
  const isDateInPast = (date) => {
    if (!date || !(date instanceof Date)) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  // Check if date is in the future (excluding today)
  const isDateFuture = (date) => {
    if (!date || !(date instanceof Date)) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate > today
  }

  // Function to check if a date is tomorrow
  const isDateTomorrow = (dateStr) => {
    const date = parseTaskStartDate(dateStr)
    if (!date) return false
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return date.getTime() === tomorrow.getTime()
  }

  // Helper function to update available staff list
  const updateAvailableStaff = async (data, type, dept) => {
    let uniqueStaff;
    if (type === 'checklist' && dept !== 'all') {
      try {
        uniqueStaff = await getStaffNamesByDepartmentApi(dept);
        if (!Array.isArray(uniqueStaff)) uniqueStaff = [];
      } catch (error) {
        console.error('Error fetching staff by department:', error);
        uniqueStaff = [...new Set(data.map(t => t.name).filter(n => n && n.trim() !== ""))];
      }
    } else {
      uniqueStaff = [...new Set(data.map(t => t.name).filter(n => n && n.trim() !== ""))];
    }

    if (!isPrivilegedUser && username) {
      if (!uniqueStaff.some(s => s?.toLowerCase() === username?.toLowerCase())) {
        uniqueStaff.push(username);
      }
    }
    setAvailableStaff(uniqueStaff);
  };

  const fetchDepartmentData = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setIsLoadingMore(true)
        setHasMoreData(true)
      } else {
        setIsLoadingMore(true)
      }

      // Use the updated API function with department filter
      const data = await fetchDashboardDataApi(dashboardType, dashboardStaffFilter, page, batchSize, 'all', departmentFilter)

      if (!data || data.length === 0) {
        if (page === 1) {
          setDepartmentData(prev => ({
            ...prev,
            allTasks: [],
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            overdueTasks: 0,
            completionRate: 0,
          }))
        }
        setHasMoreData(false)
        setIsLoadingMore(false)
        return
      }

      const username = localStorage.getItem("user-name")
      const currentUserRole = localStorage.getItem("role")
      const canViewAllStaff = hasDashboardAdminAccess(currentUserRole)
      const today = new Date()
      today.setHours(23, 59, 59, 999)

      let totalTasks = 0
      let completedTasks = 0
      let pendingTasks = 0
      let overdueTasks = 0
      let completedRatingOne = 0
      let completedRatingTwo = 0
      let completedRatingThreePlus = 0

      const monthlyData = {
        Jan: { completed: 0, pending: 0 },
        Feb: { completed: 0, pending: 0 },
        Mar: { completed: 0, pending: 0 },
        Apr: { completed: 0, pending: 0 },
        May: { completed: 0, pending: 0 },
        Jun: { completed: 0, pending: 0 },
        Jul: { completed: 0, pending: 0 },
        Aug: { completed: 0, pending: 0 },
        Sep: { completed: 0, pending: 0 },
        Oct: { completed: 0, pending: 0 },
        Nov: { completed: 0, pending: 0 },
        Dec: { completed: 0, pending: 0 },
      }

      // FIRST: Filter data by dashboard type - REMOVE this filter for checklist to include all tasks
      let filteredData = data

      // Update unique staff names for the dropdown
      await updateAvailableStaff(data, dashboardType, departmentFilter);

      // SECOND: Apply dashboard staff filter ONLY if not "all"
      if (dashboardStaffFilter !== "all") {
        filteredData = filteredData.filter(
          (task) => task.name && task.name.toLowerCase() === dashboardStaffFilter.toLowerCase(),
        )
      }

      // Process tasks with your field names
      const processedTasks = filteredData
        .map((task) => {
          // Skip if not assigned to current user (for non-admin)
          if (!canViewAllStaff && task.name?.toLowerCase() !== username?.toLowerCase()) {
            return null;
          }

          // FIXED: Use correct field name from your Supabase data
          const taskStartDate = parseTaskStartDate(task.task_start_date);
          const completionDate = task.submission_date ? parseTaskStartDate(task.submission_date) : null;

          let status = "pending";
          if (completionDate) {
            status = "completed";
          } else if (taskStartDate && isDateInPast(taskStartDate)) {
            status = "overdue";
          }

          // Only count tasks up to today for cards (but keep all tasks for table display)
          if (taskStartDate && taskStartDate <= today) {
            if (status === "completed") {
              completedTasks++;
              if (dashboardType === "delegation" && task.submission_date) {
                if (task.color_code_for === 1) completedRatingOne++;
                else if (task.color_code_for === 2) completedRatingTwo++;
                else if (task.color_code_for >= 3) completedRatingThreePlus++;
              }
            } else {
              pendingTasks++;
              if (status === "overdue") overdueTasks++;
            }
            totalTasks++;
          }

          // Update monthly data for all tasks
          if (taskStartDate) {
            const monthName = taskStartDate.toLocaleString("default", { month: "short" });
            if (monthlyData[monthName]) {
              if (status === "completed") {
                monthlyData[monthName].completed++;
              } else {
                monthlyData[monthName].pending++;
              }
            }
          }

          return {
            id: task.task_id,
            title: task.task_description,
            assignedTo: task.name || "Unassigned",
            taskStartDate: formatDateToDDMMYYYY(taskStartDate),
            originalTaskStartDate: task.task_start_date,
            submission_date: task.submission_date,
            status,
            frequency: task.frequency || "one-time",
            rating: task.color_code_for || 0,
          };
        })
        .filter(Boolean);

      const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0

      const barChartData = Object.entries(monthlyData).map(([name, data]) => ({
        name,
        completed: data.completed,
        pending: data.pending,
      }))

      const pieChartData = [
        { name: "Completed", value: completedTasks, color: "#22c55e" },
        { name: "Pending", value: pendingTasks, color: "#facc15" },
        { name: "Overdue", value: overdueTasks, color: "#ef4444" },
      ]

      const staffMap = new Map()

      if (processedTasks.length > 0) {
        processedTasks.forEach((task) => {
          const taskDate = parseTaskStartDate(task.originalTaskStartDate)
          // Only include tasks up to today for staff calculations
          if (taskDate && taskDate <= today) {
            const assignedTo = task.assignedTo || "Unassigned"
            if (!staffMap.has(assignedTo)) {
              staffMap.set(assignedTo, {
                name: assignedTo,
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
              })
            }
            const staff = staffMap.get(assignedTo)
            staff.totalTasks++
            if (task.status === "completed") {
              staff.completedTasks++
            } else {
              staff.pendingTasks++
            }
          }
        })
      }

      const staffMembers = Array.from(staffMap.values()).map((staff) => ({
        ...staff,
        id: (staff.name || "unassigned").replace(/\s+/g, "-").toLowerCase(),
        email: `${(staff.name || "unassigned").toLowerCase().replace(/\s+/g, ".")}@example.com`,
        progress: staff.totalTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0,
      }))

      setDepartmentData(prev => {
        const updatedTasks = append
          ? [...prev.allTasks, ...processedTasks]
          : processedTasks

        return {
          allTasks: updatedTasks,
          staffMembers,
          totalTasks: append ? prev.totalTasks + totalTasks : totalTasks,
          completedTasks: append ? prev.completedTasks + completedTasks : completedTasks,
          pendingTasks: append ? prev.pendingTasks + pendingTasks : pendingTasks,
          overdueTasks: append ? prev.overdueTasks + overdueTasks : overdueTasks,
          completionRate: append
            ? (updatedTasks.filter(t => t.status === "completed").length / updatedTasks.length * 100).toFixed(1)
            : completionRate,
          barChartData,
          pieChartData,
          completedRatingOne: append ? prev.completedRatingOne + completedRatingOne : completedRatingOne,
          completedRatingTwo: append ? prev.completedRatingTwo + completedRatingTwo : completedRatingTwo,
          completedRatingThreePlus: append ? prev.completedRatingThreePlus + completedRatingThreePlus : completedRatingThreePlus,
        }
      })

      // Check if we have more data to load
      if (data.length < batchSize) {
        setHasMoreData(false)
      }

      setIsLoadingMore(false)
    } catch (error) {
      // Error fetching data
      setIsLoadingMore(false)
    }
  }

  const fetchDepartments = async () => {
    if (dashboardType === 'checklist') {
      try {
        const departments = await getUniqueDepartmentsApi();

        // Get user's department access
        const userAccess = localStorage.getItem("user_access") || "";

        const userDepartments = userAccess
          ? userAccess.split(',').map(dept => dept.trim().toLowerCase())
          : [];

        // Filter departments based on user access for admin users
        let filteredDepartments = departments;
        if (userRole === "admin" && userDepartments.length > 0) {
          filteredDepartments = departments.filter(dept =>
            userDepartments.includes(dept.toLowerCase())
          );
        }

        setAvailableDepartments(filteredDepartments);
      } catch (error) {
        // Error fetching departments
        setAvailableDepartments([]);
      }
    } else {
      setAvailableDepartments([]);
    }
  }

  useEffect(() => {
    fetchDepartments();
  }, [dashboardType, userRole]);

  // Reset staff filter when department filter changes
  useEffect(() => {
    if (dashboardType === 'checklist') {
      setDashboardStaffFilter("all");
    }
  }, [departmentFilter, dashboardType]);

  // Add scroll event listener for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const tableContainer = document.querySelector('.task-table-container')
      if (!tableContainer) return

      const { scrollTop, scrollHeight, clientHeight } = tableContainer
      const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.2

      if (isNearBottom && !isLoadingMore && hasMoreData) {
        loadMoreData()
      }
    }

    const tableContainer = document.querySelector('.task-table-container')
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll)
      return () => tableContainer.removeEventListener('scroll', handleScroll)
    }
  }, [isLoadingMore, hasMoreData])

  useEffect(() => {
    if (dateRange.filtered) {
      // If date range is filtered, refresh with date range logic
      handleDateRangeChange(dateRange.startDate, dateRange.endDate);
    } else {
      // Fetch detailed data for charts and tables
      fetchDepartmentData(1, false)
    }

    fetchDashboardStats(dashboardType, dashboardStaffFilter, departmentFilter)
  }, [dashboardType, dashboardStaffFilter, departmentFilter, fetchDashboardStats, dateRange.filtered])

  // Filter tasks based on criteria
  const filteredTasks = departmentData.allTasks.filter((task) => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false
    if (filterStaff !== "all" && task.assignedTo.toLowerCase() !== filterStaff.toLowerCase()) {
      return false
    }
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

  // Reset dashboard staff filter when dashboard type changes
  useEffect(() => {
    if (userRole && !isPrivilegedUser) {
      setDashboardStaffFilter(username)
    } else {
      setDashboardStaffFilter("all")
    }
    setDepartmentFilter("all")
    setCurrentPage(1)
    setHasMoreData(true)
    // Clear date range when dashboard type changes
    setDateRange({
      startDate: "",
      endDate: "",
      filtered: false
    });
  }, [dashboardType, isPrivilegedUser, userRole, username])

  const getTasksByView = (view) => {
    return filteredTasks.filter((task) => {
      const taskDate = parseTaskStartDate(task.originalTaskStartDate);
      if (!taskDate) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const taskDateOnly = new Date(taskDate);
      taskDateOnly.setHours(0, 0, 0, 0);

      switch (view) {
        case "recent":
          // For delegation, show today's tasks regardless of completion status
          if (dashboardType === "delegation") {
            return isDateToday(taskDate);
          }
          // For checklist, show today's tasks but exclude completed ones
          return isDateToday(taskDate) && task.status !== "completed";

        case "upcoming":
          // For delegation, show tomorrow's tasks regardless of completion status
          if (dashboardType === "delegation") {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return taskDateOnly.getTime() === tomorrow.getTime();
          }
          // For checklist, show only tomorrow's tasks
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return taskDateOnly.getTime() === tomorrow.getTime();

        case "overdue":
          // For delegation, show tasks that are past due and have null submission_date
          if (dashboardType === "delegation") {
            return taskDateOnly < today && !task.submission_date;
          }
          // For checklist, show tasks that are past due and not completed
          return taskDateOnly < today && task.status !== "completed";

        default:
          return true;
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500 hover:bg-green-600 text-white"
      case "pending":
        return "bg-amber-500 hover:bg-amber-600 text-white"
      case "overdue":
        return "bg-red-500 hover:bg-red-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"

    }
  }

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case "one-time":
        return "bg-gray-500 hover:bg-gray-600 text-white"
      case "daily":
        return "bg-blue-500 hover:bg-blue-600 text-white"
      case "weekly":
        return "bg-purple-500 hover:bg-purple-600 text-white"
      case "fortnightly":
        return "bg-indigo-500 hover:bg-indigo-600 text-white"
      case "monthly":
        return "bg-orange-500 hover:bg-orange-600 text-white"
      case "quarterly":
        return "bg-amber-500 hover:bg-amber-600 text-white"
      case "yearly":
        return "bg-emerald-500 hover:bg-emerald-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate filtered stats for cards - same logic as table
  const cardStats = (() => {
    // Filter tasks that are not upcoming (due today or before)
    const filteredTasks = departmentData.allTasks.filter((task) => {
      const taskDate = parseTaskStartDate(task.originalTaskStartDate)
      return taskDate && taskDate <= today
    })

    const totalTasks = filteredTasks.length
    const completedTasks = filteredTasks.filter((task) => task.status === "completed").length
    const pendingTasks = totalTasks - completedTasks
    const overdueTasks = filteredTasks.filter((task) => task.status === "overdue").length

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
    }
  })()

  // Function to load more data when scrolling
  const loadMoreData = () => {
    if (!isLoadingMore && hasMoreData) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchDepartmentData(nextPage, true)
    }
  }

  // Memoize the dateRangeProp so children receive a stable reference
  const dateRangeProp = useMemo(() => {
    return dateRange.filtered ? dateRange : null;
  }, [dateRange.filtered, dateRange.startDate, dateRange.endDate]);

  // Determine which statistics to show based on date range filter
  const displayStats = useMemo(() => {
    return dateRange.filtered ? {
      totalTasks: filteredDateStats.totalTasks || 0,
      completedTasks: filteredDateStats.completedTasks || 0,
      pendingTasks: filteredDateStats.pendingTasks || 0,
      overdueTasks: filteredDateStats.overdueTasks || 0,
      upcomingTasks: filteredDateStats.upcomingTasks || 0,
      notDoneTasks: filteredDateStats.notDoneTasks || 0,
    } : {
      totalTasks: totalTask || 0,
      completedTasks: completeTask || 0,
      pendingTasks: pendingTask || 0,
      overdueTasks: overdueTask || 0,
      upcomingTasks: upcomingTask || 0,
      notDoneTasks: notDoneTask || 0,
    };
  }, [dateRange.filtered, filteredDateStats, totalTask, completeTask, pendingTask, overdueTask, upcomingTask, notDoneTask]);


  // const notDoneTask = (displayStats.totalTasks || 0) - (displayStats.completedTasks || 0);


  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Navigation Buttons for Checklist, Housekeeping, Maintenance - HIDDEN
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setDashboardView("checklist")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${dashboardView === "checklist"
                ? "bg-indigo-600 text-white border-b-2 border-indigo-600"
                : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
            >
              Checklist
            </button>
            ...
          </div>
        </div>
        */}

        <DashboardHeader
          dashboardType={dashboardType}
          setDashboardType={setDashboardType}
          dashboardStaffFilter={dashboardStaffFilter}
          setDashboardStaffFilter={setDashboardStaffFilter}
          availableStaff={availableStaff}
          userRole={userRole}
          username={username}
          departmentFilter={departmentFilter}
          setDepartmentFilter={setDepartmentFilter}
          availableDepartments={availableDepartments}
          isLoadingMore={isLoadingMore}
          onDateRangeChange={handleDateRangeChange}
        />

        {/* Render the selected dashboard view */}
        {dashboardView === "checklist" && (
          <>

            <StatisticsCards
              totalTask={displayStats.totalTasks}
              completeTask={displayStats.completedTasks}
              pendingTask={displayStats.pendingTasks}
              overdueTask={displayStats.overdueTasks}
              upcomingTasks={displayStats.upcomingTasks}
              notDoneTasks={displayStats.notDoneTasks}
              dashboardType={dashboardType}
              dateRange={dateRangeProp}
              username={username}
              userRole={userRole}
              designation={designation}
            />

            {(username === "AAKASH AGRAWAL" || username === "Sheelesh Marele" || designation?.toLowerCase() === "division hod") && (
              <>
                <div className="flex items-center gap-4 my-8">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <h2 className="text-lg font-bold text-gray-600 uppercase tracking-[0.2em]">
                    Division wise Analysis
                  </h2>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                <DivisionWiseCards dateRange={dateRangeProp} userRole={userRole} username={username} designation={designation} division={division} />
              </>
            )}

            <TaskNavigationTabs
              taskView={taskView}
              setTaskView={setTaskView}
              dashboardType={dashboardType}
              dashboardStaffFilter={dashboardStaffFilter}
              departmentFilter={departmentFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterStaff={filterStaff}
              setFilterStaff={setFilterStaff}
              departmentData={departmentData}
              getTasksByView={getTasksByView}
              getFrequencyColor={getFrequencyColor}
              isLoadingMore={isLoadingMore}
              hasMoreData={hasMoreData}
              stats={displayStats}
              dateRange={dateRangeProp}
            />

            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-purple-200 shadow-md bg-white">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                    <h3 className="text-red-900 font-medium">Staff Task Summary</h3>
                    <p className="text-gray-700 text-sm">Overview of tasks assigned to each staff member</p>
                  </div>
                  <div className="p-4">
                    <StaffTasksTable
                      dashboardType={dashboardType}
                      dashboardStaffFilter={dashboardStaffFilter}
                      departmentFilter={departmentFilter}
                      parseTaskStartDate={parseTaskStartDate}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {dashboardView === "maintenance" && <MaintenanceDashboard dateRange={dateRange.filtered ? dateRange : null} />}
        {dashboardView === "housekeeping" && <HousekeepingDashboard dateRange={dateRange.filtered ? dateRange : null} />}
      </div>
    </AdminLayout>
  )
}
