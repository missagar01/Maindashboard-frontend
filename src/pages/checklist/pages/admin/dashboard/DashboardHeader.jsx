"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronDown, X } from "lucide-react"
import { getTotalUsersCountApi } from "@/api/checklist/dashboardApi.js"

export default function DashboardHeader({
  dashboardType,
  setDashboardType,
  dashboardStaffFilter,
  setDashboardStaffFilter,
  availableStaff,
  userRole,
  username,
  departmentFilter,
  setDepartmentFilter,
  availableDepartments,
  isLoadingMore,
  onDateRangeChange // Add this prop to handle date range selection
}) {
  const [totalUsersCount, setTotalUsersCount] = useState(0)
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Fetch total users count
  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const count = await getTotalUsersCountApi()
        setTotalUsersCount(count)
      } catch (error) {
        console.error('Error fetching total users count:', error)
      }
    }

    fetchTotalUsers()
  }, [])

  // Apply date range filter
  const applyDateRange = () => {
    if (startDate && endDate && onDateRangeChange) {
      onDateRangeChange(startDate, endDate)
      setShowDateRangePicker(false)
    }
  }

  // Clear date range filter
  const clearDateRange = () => {
    setStartDate("")
    setEndDate("")
    if (onDateRangeChange) {
      onDateRangeChange(null, null)
    }
    setShowDateRangePicker(false)
  }

  // Get today's date in YYYY-MM-DD format for max date
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const sortedDepartments = Array.isArray(availableDepartments)
    ? [...availableDepartments]
      .filter(dept => dept != null && dept !== "")
      .sort((a, b) => (a || "").localeCompare(b || ""))
    : []

  const sortedStaff = Array.isArray(availableStaff)
    ? [...availableStaff]
      .filter(staff => staff != null && staff !== "")
      .sort((a, b) => (a || "").localeCompare(b || ""))
    : []


  return (
    <div className="flex flex-col lg:flex-row justify-between gap-4 lg:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
      <div className="flex items-center justify-between lg:justify-start gap-4">
        {(userRole === "admin" || userRole === "superadmin") && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              {/* <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total System</span> */}
              <span className="text-xs font-bold text-gray-600">Active Users</span>
            </div>
            <div className="w-10 h-10 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-green-600 font-bold text-lg">
                {totalUsersCount}
              </span>
            </div>
          </div>
        )}

        {/* Short divider on desktop */}
        <div className="hidden lg:block h-8 w-px bg-gray-100 mx-2"></div>

        <div className="flex flex-col lg:hidden">
          {/* <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Configuration</span> */}
          <span className="text-xs font-bold text-gray-600">Filters & View</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:gap-2">
        {/* Date Range Filter */}
        {(userRole === "admin" || userRole === "superadmin") && (
          <div className="relative">
            <button
              onClick={() => setShowDateRangePicker(!showDateRangePicker)}
              className={`w-full lg:w-[160px] h-9 rounded-lg border px-3 text-left bg-white transition-all text-[11px] font-bold ${startDate && endDate
                ? "border-red-200 bg-red-50/30 text-red-600"
                : "border-gray-200 text-gray-500 hover:border-red-600/30"
                }`}
            >
              <div className="truncate text-center lg:text-left flex items-center justify-between gap-1">
                <span className="truncate">{startDate && endDate ? `${startDate} - ${endDate}` : "Date Range"}</span>
                <Calendar className="h-3 w-3 opacity-40 shrink-0" />
              </div>
            </button>

            {showDateRangePicker && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] p-4 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">From</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={endDate || getTodayDate()}
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-red-100 focus:border-red-600 outline-none"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">To</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        max={getTodayDate()}
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-red-100 focus:border-red-600 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={applyDateRange}
                      disabled={!startDate || !endDate}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      Apply Filter
                    </button>
                    {startDate && endDate && (
                      <button onClick={clearDateRange} className="px-3 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <CustomDropdown
          value={dashboardType}
          onChange={setDashboardType}
          options={[
            { value: "checklist", label: "Checklist View" },
            { value: "delegation", label: "Delegation View" }
          ]}
          placeholder="Select View"
        />

        {/* Department Filter - Only show for checklist */}
        {dashboardType === "checklist" && (userRole === "admin" || userRole === "superadmin") && (
          <CustomDropdown
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={[
              { value: "all", label: "All Departments" },
              ...sortedDepartments.map(dept => ({ value: dept, label: dept }))
            ]}
            placeholder="Department"
            isFiltered={departmentFilter !== "all"}
          />
        )}

        {/* Dashboard Staff Filter */}
        {(userRole === "admin" || userRole === "superadmin") ? (
          <CustomDropdown
            value={dashboardStaffFilter}
            onChange={setDashboardStaffFilter}
            options={[
              { value: "all", label: "All Staff Members" },
              ...sortedStaff.map(name => ({ value: name, label: name }))
            ]}
            placeholder="Staff Member"
            isFiltered={dashboardStaffFilter !== "all"}
          />
        ) : (
          <div className="h-9 rounded-lg border border-gray-200 px-3 bg-gray-50 text-gray-500 text-[11px] font-bold flex items-center justify-center lg:justify-start w-full lg:w-auto">
            {username || "Current User"}
          </div>
        )}
      </div>

      {/* Backdrop for date picker and custom selects */}
      {showDateRangePicker && (
        <div className="fixed inset-0 z-[90]" onClick={() => setShowDateRangePicker(false)} />
      )}
    </div>
  );
}

// Reusable Custom Dropdown Component
function CustomDropdown({ value, onChange, options, placeholder, isFiltered = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="relative w-full lg:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full lg:min-w-[140px] h-auto min-h-[36px] rounded-lg border px-3 py-2 text-left transition-all text-[11px] font-bold flex items-center justify-between gap-2 shadow-sm ${isFiltered
          ? "border-red-200 bg-red-50/30 text-red-600"
          : "border-gray-200 bg-white text-gray-600 hover:border-red-600/30"
          }`}
      >
        <span className="whitespace-normal break-words leading-tight">{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} opacity-40 shrink-0`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 lg:left-auto lg:right-0 mt-2 w-full lg:w-64 bg-white border border-gray-100 rounded-xl shadow-2xl z-[101] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-72 overflow-y-auto custom-scrollbar p-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between gap-3 group ${value === opt.value
                    ? "bg-red-50 text-red-600"
                    : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <span className="whitespace-normal break-words leading-snug">{opt.label}</span>
                  {value === opt.value && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-sm shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
