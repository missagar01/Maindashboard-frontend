"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Clock, AlertTriangle, CheckCircle, Wrench, DollarSign, BarChart2, Calendar } from "lucide-react"
import axiosInstance from "@/api/checklist/axiosInstance.js"

const MaintenanceDashboard = () => {
  const [sheetDate, setSheetData] = useState([])
  const [maintenanceTasks, setMaintenanceTasks] = useState([])
  const [totalMaintenanceTasksCompleted, setTotalMaintenanceTasksCompleted] = useState(0)
  const [totalMaintenanceTasksOverdue, setTotalMaintenanceTasksOverdue] = useState(0)
  const [maintenanceCostData, setMaintenanceCostData] = useState([])
  const [departmentCostData, setDepartmentCostData] = useState([])
  const [frequentRepairData, setFrequentRepairData] = useState([])
  const [totalCost, setTotalCost] = useState(0)

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name"); // your login stores `user-name`


  const formatIndianCurrency = (num) => {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)}Cr`
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)}L`
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(2)}K`
    } else {
      return `₹${num.toLocaleString()}`
    }
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, machineCostRes, deptRes, freqRes] = await Promise.all([
          axiosInstance.get(`/api/mainatce/dashboard/stats`, {
            params: { role, username }
          }),

          axiosInstance.get(`/api/mainatce/dashboard/maintenance-costs`, {
            params: { role, username }
          }),

          axiosInstance.get(`/api/mainatce/dashboard/department-costs`, {
            params: { role, username }
          }),

          axiosInstance.get(`/api/mainatce/dashboard/frequencies`, {
            params: { role, username }
          }),
        ]);


        const stats = statsRes.data.data

        setSheetData(new Array(stats.total_machines).fill(0))
        setMaintenanceTasks(new Array(stats.total_tasks).fill(0))
        setTotalMaintenanceTasksCompleted(stats.completed_tasks)
        setTotalMaintenanceTasksOverdue(stats.overdue_tasks)
        setTotalCost(stats.total_maintenance_cost)

        setMaintenanceCostData(machineCostRes.data.data)
        setDepartmentCostData(deptRes.data.data)
        setFrequentRepairData(freqRes.data.data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance Dashboard</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-white rounded-xl shadow p-6 flex items-start">
          <div className="p-1 rounded-full bg-blue-100 mr-4">
            <Wrench size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Machines</p>
            <h3 className="text-2xl font-bold text-gray-800">{sheetDate?.length}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex items-start">
          <div className="p-1 rounded-full bg-indigo-100 mr-4">
            <Calendar size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Tasks</p>
            <h3 className="text-2xl font-bold text-gray-800">{maintenanceTasks?.length}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex items-start">
          <div className="p-1 rounded-full bg-green-100 mr-4">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Tasks Complete</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalMaintenanceTasksCompleted}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex items-start">
          <div className="p-1 rounded-full bg-amber-100 mr-4">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Tasks Pending</p>
            <h3 className="text-2xl font-bold text-gray-800">
              {maintenanceTasks.length - totalMaintenanceTasksCompleted}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex items-start">
          <div className="p-1 rounded-full bg-red-100 mr-4">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Tasks Overdue</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalMaintenanceTasksOverdue}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex items-start">
          <div className="p-1 rounded-full bg-purple-100 mr-4">
            <DollarSign size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Cost</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatIndianCurrency(totalCost)}</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <BarChart2 size={20} className="mr-2 text-indigo-600" />
              Maintenance Cost
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintenanceCostData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="maintenanceCost" name="Maintenance Cost" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <DollarSign size={20} className="mr-2 text-indigo-600" />
              Department Cost Analysis
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentCostData}
                  dataKey="cost"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {departmentCostData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={["#4F46E5", "#60A5FA", "#F59E0B", "#10B981"][index % 4]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Wrench size={20} className="mr-2 text-indigo-600" />
              Frequent Maintenance
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequentRepairData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="repairs" name="Number of Repairs" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MaintenanceDashboard
