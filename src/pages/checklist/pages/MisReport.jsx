"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchStaffTasksDataApi, exportAllStaffTasksApi, getStaffTasksCountApi, getUniqueDepartmentsApi } from "@/api/checklist/dashboardApi.js"
import AdminLayout from '../components/layout/AdminLayout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from '../../../utils/framerMotionCompat';
import { XCircle, BarChart3 } from 'lucide-react';

function MisReportPage() {
    const userRole = (localStorage.getItem("role") || "").toLowerCase().trim()
    const username = (localStorage.getItem("user-name") || "").trim()
    const userDesignation = (localStorage.getItem("designation") || "").toLowerCase().trim()
    const userDepartment = (localStorage.getItem("department") || "").trim()
    const userDivision = (localStorage.getItem("division") || "").trim()

    const [dashboardStaffFilter, setDashboardStaffFilter] = useState(() => {
        const isAdmin = userRole === "admin" || userRole === "superadmin";
        if (isAdmin || userDesignation.includes("hod") || userDesignation.includes("manager")) return "all";
        return username || "all";
    })
    const [departmentFilter, setDepartmentFilter] = useState(() => {
        const isAdmin = userRole === "admin" || userRole === "superadmin";
        if (isAdmin || userDesignation.includes("division hod")) return "all";
        if (userDesignation.includes("manager")) return (userDepartment && userDepartment !== "all") ? userDepartment : "all";
        return "all";
    })
    const [divisionFilter, setDivisionFilter] = useState(() => {
        const isAdmin = userRole === "admin" || userRole === "superadmin";
        if (isAdmin) return "all";
        if (userDesignation.includes("manager") || userDesignation.includes("division hod")) return (userDivision && userDivision !== "all") ? userDivision : "all";
        return "all";
    })
    const [selectedMonthYear, setSelectedMonthYear] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [staffMembers, setStaffMembers] = useState([])
    const [filteredStaffMembers, setFilteredStaffMembers] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [totalStaffCount, setTotalStaffCount] = useState(0)
    const [availableStaff, setAvailableStaff] = useState([])
    const [availableDepartments, setAvailableDepartments] = useState([])
    const [monthYearOptions, setMonthYearOptions] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
    const [selectedStaff, setSelectedStaff] = useState(null)
    const [sortBy, setSortBy] = useState("score")
    const [sortOrder, setSortOrder] = useState("asc")
    const itemsPerPage = 50


    // ── Additional Safety Filter Initialization ─────────────────────
    useEffect(() => {
        const isAdmin = userRole === "admin" || userRole === "superadmin";
        if (isAdmin) return;

        // If Manager and filters are still "all", force them
        if (userDesignation.includes("manager")) {
            if (divisionFilter === "all" && userDivision && userDivision !== "all") {
                setDivisionFilter(userDivision);
            }
            if (departmentFilter === "all" && userDepartment && userDepartment !== "all") {
                setDepartmentFilter(userDepartment);
            }
        }
        // If HOD and filters are still "all", force division
        else if (userDesignation.includes("division hod")) {
            if (divisionFilter === "all" && userDivision && userDivision !== "all") {
                setDivisionFilter(userDivision);
            }
        }
        // If regular user and staff filter is still "all", force self
        else if (userRole === "user") {
            if (dashboardStaffFilter === "all" && username) {
                setDashboardStaffFilter(username);
            }
        }
    }, [userRole, userDesignation, userDivision, userDepartment, username]);

    // ── Staff Detail Modal ──────────────────────────────────────────
    const CHART_COLORS = { Done: '#10b981', Pending: '#94a3b8' };

    const ScoreBadge = ({ score }) => {
        const s = Number(score || 0);
        const bg = s >= -20 ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : s >= -50 ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-red-100 text-red-800 border-red-200';
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-black border shadow-sm ${bg}`}>
                {s.toFixed(1)}%
            </span>
        );
    };

    const StaffModal = () => {
        if (!selectedStaff) return null;
        const s = selectedStaff;
        const total = s.totalTasks || 0;
        const done = s.completedTasks || 0;
        const pending = s.pendingTasks || (total - done);
        const chartData = [
            { name: 'Done', value: done },
            { name: 'Pending', value: pending },
        ].filter(d => d.value > 0);
        const donePercent = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0';

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
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-5 py-4 bg-gradient-to-r from-[#c41e3a]/10 to-transparent border-b border-gray-100 flex items-start justify-between">
                            <div>
                                <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-0.5">{s.division || 'N/A'}</p>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight mb-1">{s.department || 'N/A'}</p>
                                <h3 className="text-base font-[1000] text-gray-900 uppercase tracking-tight leading-tight">{s.name}</h3>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.employee_id || ''}</p>
                            </div>
                            <button
                                onClick={() => setSelectedStaff(null)}
                                className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-1"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5">
                            {/* Donut Chart + Score */}
                            <div className="flex items-center justify-between gap-4 mb-5">
                                <div className="relative h-36 w-36 flex-shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData.length > 0 ? chartData : [{ name: 'None', value: 1 }]}
                                                cx="50%" cy="50%"
                                                innerRadius={40} outerRadius={62}
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {(chartData.length > 0 ? chartData : [{ name: 'None' }]).map((entry, idx) => (
                                                    <Cell
                                                        key={idx}
                                                        fill={CHART_COLORS[entry.name] || '#e5e7eb'}
                                                        className="outline-none"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v, n) => [`${v} tasks`, n]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Done</span>
                                        <span className="text-xl font-black text-gray-800">{donePercent}%</span>
                                    </div>
                                </div>

                                {/* Right stats */}
                                <div className="flex-1 space-y-2">
                                    {[
                                        { label: 'Total', value: total, color: 'text-blue-600', dot: 'bg-blue-500' },
                                        { label: 'Done', value: done, color: 'text-emerald-600', dot: 'bg-emerald-500' },
                                        { label: 'Pending', value: pending, color: 'text-amber-600', dot: 'bg-amber-400' },
                                    ].map(({ label, value, color, dot }) => (
                                        <div key={label} className="flex items-center justify-between rounded-full bg-gray-50 border border-gray-100 shadow-sm py-1.5 px-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${dot}`} />
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">{label}</span>
                                            </div>
                                            <span className={`text-sm font-black tabular-nums ${color}`}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Score row */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Completion Score</span>
                                <ScoreBadge score={s.completion_score} />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    };
    // ── End Staff Detail Modal ──────────────────────────────────────

    // ── Permission Check ──────────────────────────────────────────────
    const isAuthorized = true; // Access is now handled by AdminLayout, we just control visibility here


    // Generate month-year options (last 12 months + current month)
    const generateMonthYearOptions = useCallback(() => {
        const options = []
        const today = new Date()
        const currentMonth = today.getMonth() // 0-11
        const currentYear = today.getFullYear()

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

    // Fetch departments on mount or when user info changes
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                // If user is a DIVISION HOD, restrict the departments to their division
                const isAdmin = userRole === "admin" || userRole === "superadmin";
                const isHod = userDesignation.toLowerCase().includes("division hod");

                // For HOD, we only want departments in their division. 
                // For Admin, we want all. 
                const departments = await getUniqueDepartmentsApi(isAdmin ? "all" : (isHod ? userDivision : "all"))
                setAvailableDepartments(departments || [])
            } catch (error) {
                console.error('Error fetching departments:', error)
                setAvailableDepartments([])
            }
        }
        fetchDepartments()
    }, [userRole, userDesignation, userDivision])

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
        setStaffMembers([])
        setFilteredStaffMembers([])
        setTotalStaffCount(0)
    }, [dashboardStaffFilter, departmentFilter, divisionFilter, selectedMonthYear, debouncedSearchQuery, sortBy, sortOrder])

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Load staff data from server using scoring API
    const loadStaffData = useCallback(async (page = 1) => {

        try {
            setIsLoading(true)

            // Fetch staff scoring data
            const data = await fetchStaffTasksDataApi(
                "checklist",
                dashboardStaffFilter,
                page,
                itemsPerPage,
                selectedMonthYear,
                departmentFilter,
                divisionFilter,
                debouncedSearchQuery,
                sortBy,
                sortOrder
            )

            // Get total count from first item or fetch separately
            if (data && data.length > 0 && data[0].total_count) {
                setTotalStaffCount(data[0].total_count)
            } else {
                // Fallback: fetch count separately
                const staffCount = await getStaffTasksCountApi("checklist", dashboardStaffFilter, departmentFilter, divisionFilter, debouncedSearchQuery)
                setTotalStaffCount(staffCount)
            }

            if (!data || data.length === 0) {
                setStaffMembers([])
                setFilteredStaffMembers([])
                return
            }

            setStaffMembers(data)
            setFilteredStaffMembers(data)

        } catch (error) {
            console.error('Error loading staff data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [dashboardStaffFilter, departmentFilter, divisionFilter, selectedMonthYear, debouncedSearchQuery, sortBy, sortOrder])

    // Initial load when component mounts or dependencies change
    useEffect(() => {
        loadStaffData(currentPage)
    }, [dashboardStaffFilter, departmentFilter, divisionFilter, selectedMonthYear, debouncedSearchQuery, currentPage, sortBy, sortOrder])

    // Calculate total pages
    const totalPages = Math.ceil(totalStaffCount / itemsPerPage)

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = []
        const maxPagesToShow = 5

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i)
                pages.push('...')
                pages.push(totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1)
                pages.push('...')
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
            } else {
                pages.push(1)
                pages.push('...')
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
                pages.push('...')
                pages.push(totalPages)
            }
        }

        return pages
    }

    // Optimized available staff fetching
    useEffect(() => {
        const fetchAvailableStaff = async () => {
            try {
                const data = await fetchStaffTasksDataApi("checklist", "all", 1, 100, "", departmentFilter, divisionFilter)
                const uniqueStaff = [...new Set(data.map(staff => staff.name).filter(Boolean))]

                if (userRole !== "admin" && username) {
                    if (!uniqueStaff.some(staff => staff.toLowerCase() === username.toLowerCase())) {
                        uniqueStaff.push(username)
                    }
                }

                setAvailableStaff(uniqueStaff)
            } catch (error) {
                console.error('Error fetching staff:', error)
            }
        }

        fetchAvailableStaff()
    }, [userRole, username, departmentFilter, divisionFilter])

    // CSV Download Function - Downloads ALL data across all pages
    const downloadCSV = async () => {
        try {
            setIsExporting(true)

            // Fetch ALL data using export endpoint
            const response = await exportAllStaffTasksApi(
                "checklist",
                dashboardStaffFilter,
                selectedMonthYear,
                departmentFilter,
                divisionFilter
            )

            const allData = response.data || []

            if (allData.length === 0) {
                alert('No data to export')
                return
            }

            // Prepare CSV data
            const headers = [
                "Seq No.",
                "Name",
                "Employee ID",
                "Division",
                "Department",
                "Total Tasks",
                "Completed",
                "Pending",
                "Completion Score"
            ]

            const csvRows = [
                headers.join(','),
                ...allData.map((staff, index) => [
                    index + 1,
                    `"${staff.name || ''}"`,
                    `"${staff.employee_id || 'N/A'}"`,
                    `"${staff.division || 'N/A'}"`,
                    `"${staff.department || 'N/A'}"`,
                    staff.totalTasks || 0,
                    staff.completedTasks || 0,
                    staff.pendingTasks || 0,
                    Number(staff.completion_score || 0).toFixed(2)
                ].join(','))
            ]

            const csvContent = csvRows.join('\n')

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)

            link.setAttribute('href', url)
            link.setAttribute('download', `staff_mis_report_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // Show success message
            if (response.limited) {
                alert(`Export limited to ${allData.length} records for performance reasons.`)
            }

        } catch (error) {
            console.error('Error exporting CSV:', error)
            alert('Failed to export data. Please try again.')
        } finally {
            setIsExporting(false)
        }
    }

    // Format score with color coding
    const renderScore = (score) => {
        const formattedScore = Number(score || 0).toFixed(2);
        let bgColor = "bg-red-100"
        let textColor = "text-red-800"

        if (score >= 0) {
            bgColor = "bg-yellow-100"
            textColor = "text-yellow-800"
        }
        if (score >= 80) {
            bgColor = "bg-green-100"
            textColor = "text-green-800"
        }

        return (
            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
                {formattedScore}
            </span>
        )
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-white rounded-lg border border-purple-200 shadow-md">
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            {/* Title Section */}
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-xl md:text-2xl font-bold text-purple-700">Staff MIS Report</h1>
                                <p className="text-xs md:text-sm text-gray-600 mt-1">
                                    {userDesignation.toLowerCase() === "manager" ? `Performance for Department: ${userDepartment}` :
                                        userDesignation.toLowerCase() === "division hod" ? `Performance for Division: ${userDivision}` :
                                            "Staff Performance Scoring (Checklist, Maintenance & Housekeeping)"}
                                </p>
                            </div>

                            {/* Download Button */}
                            <div className="w-full md:w-auto">
                                <button
                                    onClick={downloadCSV}
                                    disabled={totalStaffCount === 0 || isExporting}
                                    className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm"
                                >
                                    {isExporting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download All ({totalStaffCount})
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Filters Section */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                            {/* Search Bar */}
                            <div className="w-full">
                                <input
                                    type="text"
                                    placeholder="Search staff..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                                />
                            </div>

                            {/* Department Filter - Only show for Admin or HOD */}
                            <div className="w-full">
                                {userRole === "user" &&
                                    !(userDesignation.toLowerCase().trim().includes("division hod") ||
                                        userDesignation.toLowerCase().trim() === "division hod") ? (
                                    <div className="w-full rounded-md border border-purple-200 p-2 bg-gray-50 text-gray-500 text-sm italic">
                                        Dept: {departmentFilter === "all" ? (userDepartment || "N/A") : departmentFilter}
                                    </div>
                                ) : (
                                    <select
                                        value={departmentFilter}
                                        onChange={(e) => setDepartmentFilter(e.target.value)}
                                        className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                                    >
                                        <option value="all">All Departments</option>
                                        {availableDepartments.map((dept) => (
                                            <option key={dept} value={dept}>
                                                {dept}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Month Filter */}
                            <div className="w-full">
                                <select
                                    value={selectedMonthYear}
                                    onChange={(e) => setSelectedMonthYear(e.target.value)}
                                    className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                                >
                                    <option value="">All Months</option>
                                    {monthYearOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label} {option.isCurrent && "(Current)"}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Staff Filter */}
                            <div className="w-full">
                                {userRole === "user" &&
                                    !userDesignation.toLowerCase().trim().includes("manager") &&
                                    !userDesignation.toLowerCase().trim().includes("hod") ? (
                                    <div className="w-full rounded-md border border-purple-200 p-2 bg-gray-50 text-gray-500 text-sm italic">
                                        Staff: {username}
                                    </div>
                                ) : (
                                    <select
                                        value={dashboardStaffFilter}
                                        onChange={(e) => setDashboardStaffFilter(e.target.value)}
                                        className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                                    >
                                        <option value="all">All Staff</option>
                                        {availableStaff.map((staff) => (
                                            <option key={staff} value={staff}>
                                                {staff}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Division Display (HOD only) */}
                            {userDesignation.toLowerCase() === "division hod" && (
                                <div className="w-full lg:col-start-1 lg:row-start-2">
                                    <div className="w-full rounded-md border border-blue-200 p-2 bg-blue-50 text-blue-700 text-sm italic font-medium">
                                        Division: {userDivision}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Staff Tasks Table */}
                <div className="rounded-lg border border-purple-200 shadow-md bg-white">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-purple-700 font-medium">Staff Performance Scoring</h3>
                                <p className="text-xs text-gray-600">Merged scoring data from checklist, maintenance and housekeeping tasks</p>
                            </div>

                            {/* Active Filters Display */}
                            <div className="flex gap-2 flex-wrap">
                                {departmentFilter !== "all" && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                        Dept: {departmentFilter}
                                    </span>
                                )}
                                {selectedMonthYear && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                        Month: {monthYearOptions.find(opt => opt.value === selectedMonthYear)?.label || selectedMonthYear}
                                    </span>
                                )}
                                {dashboardStaffFilter !== "all" && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                        Staff: {dashboardStaffFilter}
                                    </span>
                                )}
                                {debouncedSearchQuery && (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                                        Search: "{debouncedSearchQuery}"
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="space-y-4">
                            {/* Show total counts */}
                            <div className="text-sm text-gray-600">
                                {debouncedSearchQuery ? (
                                    `Showing ${staffMembers.length} records matching your search out of ${totalStaffCount}`
                                ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <span>Total Records: <strong>{totalStaffCount}</strong></span>
                                        <span className="hidden sm:inline">•</span>
                                        <span>Page: <strong>{currentPage} of {totalPages}</strong></span>
                                    </div>
                                )}
                            </div>

                            {staffMembers.length === 0 && !isLoading ? (
                                <div className="text-center p-8 text-gray-500">
                                    {!isAuthorized ? (
                                        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                                            <div className="flex justify-center mb-4">
                                                <XCircle className="h-16 w-16 text-red-500 opacity-50" />
                                            </div>
                                            <h2 className="text-xl font-bold text-gray-800">Access Restricted</h2>
                                            <p className="max-w-xs mx-auto mt-2 text-sm">
                                                The MIS Report page is only available for Managers, Division HODs, and Administrators.
                                            </p>
                                        </div>
                                    ) : searchQuery ? (
                                        <div>
                                            <p>No staff members found matching "{searchQuery}"</p>
                                            <p className="text-sm mt-2">Try adjusting your search terms</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p>No staff data found.</p>
                                            {(departmentFilter !== "all" || divisionFilter !== "all" || selectedMonthYear || dashboardStaffFilter !== "all") && (
                                                <p className="text-sm mt-2">Try adjusting your filters to see more results.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : !isAuthorized ? (
                                <div className="text-center p-12 bg-white rounded-2xl">
                                    <div className="flex justify-center mb-6">
                                        <div className="p-4 bg-red-50 rounded-full">
                                            <XCircle className="h-16 w-16 text-red-500" />
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Access Denied</h2>
                                    <p className="max-w-md mx-auto mt-4 text-gray-500 font-medium">
                                        This report contains sensitive performance data and is restricted to Managers, Division HODs and Higher Management.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="rounded-md border border-gray-100 overflow-hidden"
                                        style={{ maxHeight: "500px", overflowY: "auto" }}
                                    >
                                        {/* Desktop Table View */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-100">
                                                <thead>
                                                    <tr className="bg-[#c41e3a] sticky top-0 z-10">
                                                        <th 
                                                            className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight cursor-pointer hover:bg-[#a81a32] transition-colors"
                                                            onClick={() => {
                                                                if (sortBy === 'division') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                                else { setSortBy('division'); setSortOrder('asc'); }
                                                            }}
                                                        >
                                                            Division {sortBy === 'division' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th 
                                                            className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight cursor-pointer hover:bg-[#a81a32] transition-colors"
                                                            onClick={() => {
                                                                if (sortBy === 'department') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                                else { setSortBy('department'); setSortOrder('asc'); }
                                                            }}
                                                        >
                                                            Dept {sortBy === 'department' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th 
                                                            className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight cursor-pointer hover:bg-[#a81a32] transition-colors"
                                                            onClick={() => {
                                                                if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                                else { setSortBy('name'); setSortOrder('asc'); }
                                                            }}
                                                        >
                                                            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight">Total</th>
                                                        <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-tight">Done</th>
                                                        <th 
                                                            className="px-3 py-2 text-right text-xs font-bold text-white uppercase tracking-tight cursor-pointer hover:bg-[#a81a32] transition-colors"
                                                            onClick={() => {
                                                                if (sortBy === 'score') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                                else { setSortBy('score'); setSortOrder('asc'); }
                                                            }}
                                                        >
                                                            Score {sortBy === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
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
                                                                    <div className="text-[13px] font-bold text-gray-800">{staff.name}</div>
                                                                    <div className="text-[11px] text-gray-400 font-medium">{staff.employee_id || 'N/A'}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 text-[13px] font-bold text-blue-600">{staff.totalTasks || 0}</td>
                                                            <td className="px-3 py-2 text-[13px] font-bold text-emerald-600">{staff.completedTasks || 0}</td>
                                                            <td className="px-3 py-2 text-right">
                                                                {renderScore(staff.completion_score || 0)}
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
                                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <h4 className="text-[14px] font-bold text-gray-800 leading-tight">{staff.name}</h4>
                                                                {renderScore(staff.completion_score || 0)}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-purple-600 uppercase tracking-tighter mt-0.5">
                                                                {staff.division || "N/A"}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter mt-0.5">
                                                                {staff.department || "N/A"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 pl-7 mt-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Total</span>
                                                            <span className="text-[12px] font-black text-blue-600">{staff.totalTasks || 0}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Done</span>
                                                            <span className="text-[12px] font-black text-emerald-600">{staff.completedTasks || 0}</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 pl-7 mt-2 border-t border-gray-50 pt-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Completion Score</span>
                                                            <div className="mt-1">{renderScore(staff.completion_score || 0)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex flex-wrap justify-center items-center gap-2 mt-4 px-2">
                                            {/* Previous Button */}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1 || isLoading}
                                                className="px-2 py-1 md:px-3 md:py-1 rounded-md border border-gray-300 text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Prev
                                            </button>

                                            {/* Page Numbers */}
                                            <div className="flex items-center gap-1">
                                                {getPageNumbers().map((page, idx) => (
                                                    page === '...' ? (
                                                        <span key={`ellipsis-${idx}`} className="px-1 text-gray-500 text-xs md:text-sm">...</span>
                                                    ) : (
                                                        <button
                                                            key={page}
                                                            onClick={() => setCurrentPage(page)}
                                                            disabled={isLoading}
                                                            className={`min-w-[28px] md:min-w-[36px] h-8 md:h-9 flex items-center justify-center rounded-md text-xs md:text-sm font-medium ${currentPage === page
                                                                ? 'bg-purple-600 text-white'
                                                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                        >
                                                            {page}
                                                        </button>
                                                    )
                                                ))}
                                            </div>

                                            {/* Next Button */}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages || isLoading}
                                                className="px-2 py-1 md:px-3 md:py-1 rounded-md border border-gray-300 text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}

                                    {isLoading && (
                                        <div className="text-center py-4">
                                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                            <p className="text-sm text-gray-500 mt-2">Loading...</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {selectedStaff && <StaffModal />}
        </AdminLayout>
    );
}

export default MisReportPage;
