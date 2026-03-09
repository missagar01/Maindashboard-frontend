"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom" // Import useNavigate
import AdminLayout from "../components/AdminLayout"

export default function AdminDashboard() {
  // const [filteblueData, setFilteblueData] = useState([])
  const navigate = useNavigate(); // Initialize navigate

  const handleClick = () => {
    navigate('/dashboard/assign-task');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          {/* <h1 className="text-2xl font-bold tracking-tight text-gray-700">
            SRMPL Dashboard
          </h1> */}
          <div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}