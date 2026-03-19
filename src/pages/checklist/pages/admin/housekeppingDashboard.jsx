"use client"

import { useEffect, useState } from "react"
import AdminLayout from "../../components/layout/AdminLayout.jsx"
import StatisticsCards from "./housekepping-dashboard-content/StaticsCard.jsx"
import TaskNavigationTabs from "./housekepping-dashboard-content/TaskNavigationTab.jsx"

export default function HousekeepingDashboard({ dateRange }) {
  const [dashboardType] = useState("checklist")
  const [taskView, setTaskView] = useState("recent")
  const [searchQuery] = useState("")
  const [dashboardStaffFilter, setDashboardStaffFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [userRole, setUserRole] = useState("")
  const [, setFilterStaff] = useState("all")
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    notdone: 0,
  })

  // Load user info - for user role, backend handles filtering via JWT token
  useEffect(() => {
    const role = localStorage.getItem("role") || ""
    setUserRole(role)

    // For user role: Backend automatically filters by user_access1 from JWT token
    // Don't set departmentFilter - backend will use token-based filtering
    // For admin: departmentFilter can be changed via dropdown
    if (role.toLowerCase() !== "user") {
      // Admin can use "all" or specific department
      setDepartmentFilter("all")
    } else {
      // For user role, keep as "all" but backend will filter by user_access1 from token
      // The dropdown will be disabled for users
      setDepartmentFilter("all")
    }
  }, [])

  // Keep staff filter reset in sync with dashboard/department changes
  useEffect(() => {
    if (dashboardType === "checklist") {
      setDashboardStaffFilter("all")
    }
  }, [departmentFilter, dashboardType])

  // Reset filters when dashboard type changes (but preserve user_access filter for user role)
  useEffect(() => {
    setDashboardStaffFilter("all")
    // Don't reset departmentFilter if user role is "user" - keep their access filter
    if (userRole.toLowerCase() !== "user") {
      setDepartmentFilter("all")
    }
  }, [dashboardType, userRole])

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case "one-time":
        return "bg-gray-500 hover:bg-gray-600 text-white"
      case "daily":
        return "bg-blue-500 hover:bg-blue-600 text-white"
      case "weekly":
        return "bg-gray-500 hover:bg-gray-600 text-white"
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

  return (
    // <AdminLayout>
    <div className="space-y-6">
      <StatisticsCards
        totalTask={stats.total}
        completeTask={stats.completed}
        pendingTask={stats.pending}
        overdueTask={stats.overdue}
        notDoneTask={stats.notdone}
        dashboardType="housekeeping"
        dateRange={dateRange}
      />

      <TaskNavigationTabs
        taskView={taskView}
        setTaskView={setTaskView}
        dashboardType={dashboardType}
        dashboardStaffFilter={dashboardStaffFilter}
        departmentFilter={departmentFilter}
        searchQuery={searchQuery}
        setFilterStaff={setFilterStaff}
        getFrequencyColor={getFrequencyColor}
        dateRange={dateRange}
      />
    </div>
    // </AdminLayout>
  )
}
