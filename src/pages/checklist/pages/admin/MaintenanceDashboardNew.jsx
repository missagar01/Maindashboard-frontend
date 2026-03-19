"use client"

import { useState, useEffect } from "react"
import StatisticsCards from "./dashboard/StaticsCard.jsx"
import MaintenanceTaskNavigationTabs from "./dashboard/MaintenanceTaskNavigationTab.jsx"
import {
  getMaintenanceDashboardStatsApi,
  getMaintenanceDepartmentsApi,
  getMaintenanceStaffByDepartmentApi,
} from "@/api/checklist/maintenanceDashboardApi.js"

export default function MaintenanceDashboardNew({ dateRange }) {
  const [taskView, setTaskView] = useState("recent")
  const [searchQuery, setSearchQuery] = useState("")
  const [dashboardStaffFilter, setDashboardStaffFilter] = useState("all")
  const [availableStaff, setAvailableStaff] = useState([])
  const userRole = localStorage.getItem("role")
  const username = localStorage.getItem("user-name")

  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [availableDepartments, setAvailableDepartments] = useState([])

  // Dashboard stats
  const [displayStats, setDisplayStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
  })
  const [notDoneTask, setNotDoneTask] = useState(0)

  useEffect(() => {
    if (userRole === "user") {
      setDashboardStaffFilter(username)
      setDepartmentFilter("all")
    }
  }, [userRole, username])

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getMaintenanceDashboardStatsApi(
          dashboardStaffFilter,
          departmentFilter,
          dateRange?.startDate,
          dateRange?.endDate
        )
        setDisplayStats({
          totalTasks: stats.totalTasks,
          completedTasks: stats.completedTasks,
          pendingTasks: stats.pendingTasks,
          overdueTasks: stats.overdueTasks,
          completionRate: stats.completionRate,
        })
        setNotDoneTask(stats.notDoneTasks)
      } catch (error) {
        console.error("Error fetching maintenance dashboard stats:", error)
      }
    }

    fetchStats()
  }, [dashboardStaffFilter, departmentFilter, dateRange])

  // Fetch available departments from maintenance_task_assign
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const depts = await getMaintenanceDepartmentsApi()
        setAvailableDepartments(Array.isArray(depts) ? depts.filter(d => d) : [])
      } catch (error) {
        console.error("Error fetching maintenance departments:", error)
        setAvailableDepartments([])
      }
    }
    fetchDepartments()
  }, [])

  // Fetch available staff from maintenance_task_assign by department
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await getMaintenanceStaffByDepartmentApi(departmentFilter)
        setAvailableStaff(Array.isArray(staff) ? staff.filter(s => s) : [])
      } catch (error) {
        console.error("Error fetching maintenance staff:", error)
        setAvailableStaff([])
      }
    }
    fetchStaff()
  }, [departmentFilter])


  // Get frequency color
  const getFrequencyColor = (frequency) => {
    const freq = (frequency || "").toLowerCase()
    if (freq.includes("daily")) return "bg-blue-100 text-blue-800"
    if (freq.includes("weekly")) return "bg-green-100 text-green-800"
    if (freq.includes("monthly")) return "bg-yellow-100 text-yellow-800"
    if (freq.includes("yearly")) return "bg-purple-100 text-purple-800"
    return "bg-gray-100 text-gray-800"
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6 w-full overflow-x-hidden" style={{ width: '100%', margin: 0 }}>
      <div className="w-full space-y-3 sm:space-y-4 md:space-y-6" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Clean Header - Responsive */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-purple-600">Maintenance</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Maintenance Dashboard Overview</p>
          </div>

          {/* Filters - Responsive */}
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {userRole === "admin" && (
              <>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md border border-gray-300 bg-white text-xs sm:text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 min-w-[140px]"
                >
                  <option value="all">All Departments</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                <select
                  value={dashboardStaffFilter}
                  onChange={(e) => setDashboardStaffFilter(e.target.value)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md border border-gray-300 bg-white text-xs sm:text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 min-w-[140px]"
                >
                  <option value="all">All Staff Members</option>
                  {availableStaff.map((staff) => (
                    <option key={staff} value={staff}>
                      {staff}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <StatisticsCards
          totalTask={displayStats.totalTasks}
          completeTask={displayStats.completedTasks}
          pendingTask={displayStats.pendingTasks}
          overdueTask={displayStats.overdueTasks}
          notDoneTask={notDoneTask}
          dashboardType="maintenance"
          dateRange={dateRange}
        />

        {/* Task Navigation Tabs */}
        <MaintenanceTaskNavigationTabs
          taskView={taskView}
          setTaskView={setTaskView}
          dashboardStaffFilter={dashboardStaffFilter}
          departmentFilter={departmentFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          getFrequencyColor={getFrequencyColor}
          dateRange={dateRange}
        />
      </div>
    </div>
  )
}

