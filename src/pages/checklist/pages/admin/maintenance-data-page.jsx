"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  CheckCircle2,
  X,
  Search,
  History,
  ArrowLeft,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { useAuth } from "../../context/AuthContext";

const CONFIG = {
  PAGE_CONFIG: {
    title: "Maintenance Tasks",
    historyTitle: "Maintenance Task History",
    description: "Showing pending and in-progress maintenance tasks",
    historyDescription: "Read-only view of completed maintenance tasks with detailed records",
  },
}

function MaintenanceDataPage() {
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [additionalData, setAdditionalData] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState(null)
  const [remarksData, setRemarksData] = useState({})
  const [showHistory, setShowHistory] = useState(false)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false)

  // Filters
  const [selectedMachines, setSelectedMachines] = useState([])
  const [selectedPersonnel, setSelectedPersonnel] = useState([])
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("")
  const [selectedTaskType, setSelectedTaskType] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [isMobile, setIsMobile] = useState(false)

  const { 
    maintenanceState, 
    fetchPendingMaintenanceTasksAction, 
    fetchCompletedMaintenanceTasksAction, 
    updateMultipleMaintenanceTasksAction, 
    fetchUniqueMachineNamesAction, 
    fetchUniqueAssignedPersonnelAction, 
    fetchMaintenanceStatisticsAction 
  } = useAuth();
 
  const {
    tasks = [],
    history = [],
    machineNames = [],
    assignedPersonnel = [],
    statistics = null,
    loading = false,
    hasMore = true,
    currentPage = 1,
    hasMoreHistory = true,
    currentPageHistory = 1
  } = maintenanceState || {}
 
  const tableContainerRef = useRef(null)
  const historyTableContainerRef = useRef(null)
 
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
 
    checkMobile()
    window.addEventListener('resize', checkMobile)
 
    const role = localStorage.getItem("role")
    const user = localStorage.getItem("user-name")
 
    setUserRole(role || "")
    setUsername(user || "")
 
    fetchPendingMaintenanceTasksAction({
      page: 1,
      userId: role === "user" ? user : null
    })
 
    fetchUniqueMachineNamesAction()
    fetchUniqueAssignedPersonnelAction()
    fetchMaintenanceStatisticsAction()
 
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, []);


  // Handle scroll for pending tasks
  const handleScrollPending = useCallback(() => {
    if (!tableContainerRef.current || loading || !hasMore || tasks.length === 0) return

    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

    if (isNearBottom && !loading) {
      const nextPage = currentPage + 1
      fetchPendingMaintenanceTasksAction({
        page: nextPage,
        userId: localStorage.getItem("role") === "user"
          ? localStorage.getItem("user-name")
          : null
      })
    }
  }, [loading, hasMore, currentPage, fetchPendingMaintenanceTasksAction, tasks.length, userRole, username])

  // Handle scroll for history
  const handleScrollHistory = useCallback(() => {
    if (!historyTableContainerRef.current || isLoadingMoreHistory || !hasMoreHistory || history.length === 0) return

    const { scrollTop, scrollHeight, clientHeight } = historyTableContainerRef.current
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

    if (isNearBottom) {
      setIsLoadingMoreHistory(true)
      const nextPage = currentPageHistory + 1
      const filters = getHistoryFilters()
      fetchCompletedMaintenanceTasksAction({ page: nextPage, filters })
        .finally(() => setIsLoadingMoreHistory(false))
    }
  }, [isLoadingMoreHistory, hasMoreHistory, currentPageHistory, fetchCompletedMaintenanceTasksAction, history.length])

  // Add scroll event listeners
  useEffect(() => {
    const tableElement = tableContainerRef.current
    if (tableElement && !showHistory) {
      tableElement.addEventListener('scroll', handleScrollPending)
      return () => tableElement.removeEventListener('scroll', handleScrollPending)
    }
  }, [handleScrollPending, showHistory])

  useEffect(() => {
    const historyTableElement = historyTableContainerRef.current
    if (historyTableElement && showHistory) {
      historyTableElement.addEventListener('scroll', handleScrollHistory)
      return () => historyTableElement.removeEventListener('scroll', handleScrollHistory)
    }
  }, [handleScrollHistory, showHistory])

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "—"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "—"
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return "—"
    }
  }

  // Get status badge color
  const getStatusBadge = (status) => {
    if (!status) return "bg-gray-100 text-gray-800"

    switch (status.toLowerCase()) {
      case 'completed':
        return "bg-green-100 text-green-800"
      case 'in progress':
        return "bg-blue-100 text-blue-800"
      case 'pending':
        return "bg-yellow-100 text-yellow-800"
      case 'high':
        return "bg-red-100 text-red-800"
      case 'medium':
        return "bg-orange-100 text-orange-800"
      case 'low':
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Get priority badge
  const getPriorityBadge = (priority) => {
    if (!priority) return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">N/A</span>

    switch (priority.toLowerCase()) {
      case 'high':
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">High</span>
      case 'medium':
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">Medium</span>
      case 'low':
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">Low</span>
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">N/A</span>
    }
  }

  // Get history filters
  const getHistoryFilters = () => {
    return {
      search: searchTerm,
      machineName: selectedMachines.length === 1 ? selectedMachines[0] : "",
      assignedTo: selectedPersonnel.length === 1 ? selectedPersonnel[0] : "",
      startDate,
      endDate
    }
  }

  // Filtered data for pending tasks
  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return []

    return tasks.filter(task => {
      if (!task) return false

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch =
          task.task_description?.toLowerCase().includes(searchLower) ||
          task.machine_name?.toLowerCase().includes(searchLower) ||
          task.serial_no?.toLowerCase().includes(searchLower) ||
          task.assigned_to?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Machine filter
      if (selectedMachines.length > 0 && !selectedMachines.includes(task.machine_name)) {
        return false
      }

      // Personnel filter
      if (selectedPersonnel.length > 0 && !selectedPersonnel.includes(task.assigned_to)) {
        return false
      }

      // Status filter
      if (selectedStatus && task.status !== selectedStatus) {
        return false
      }

      // Priority filter
      if (selectedPriority && task.priority !== selectedPriority) {
        return false
      }

      // Task type filter
      if (selectedTaskType && task.task_type !== selectedTaskType) {
        return false
      }

      return true
    })
  }, [tasks, searchTerm, selectedMachines, selectedPersonnel, selectedStatus, selectedPriority, selectedTaskType])

  // Filtered history data
  const filteredHistoryData = useMemo(() => {
    if (!Array.isArray(history)) return []
    return history.filter(task => {
      if (!task) return false
      return true
    })
  }, [history])

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("")
    setSelectedMachines([])
    setSelectedPersonnel([])
    setSelectedStatus("")
    setSelectedPriority("")
    setSelectedTaskType("")
    setStartDate("")
    setEndDate("")
  }

  // Toggle history view
  const toggleHistory = () => {
    setShowHistory(prev => !prev)
    resetFilters()

    if (!showHistory) {
      // Load history when switching to history view
      fetchCompletedMaintenanceTasksAction({ page: 1, filters: getHistoryFilters() })
    } else {
      // Load pending tasks when switching back
      fetchPendingMaintenanceTasksAction({
        page: 1,
        userId: localStorage.getItem("role") === "user"
          ? localStorage.getItem("user-name")
          : null
      })
    }
  }

  // Checkbox handlers
  const handleSelectItem = useCallback((id, isChecked) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev)
      if (isChecked) {
        newSelected.add(id)
      } else {
        newSelected.delete(id)
        // Clean up related data
        setAdditionalData(prevData => {
          const newData = { ...prevData }
          delete newData[id]
          return newData
        })
        setRemarksData(prevRemarks => {
          const newRemarks = { ...prevRemarks }
          delete newRemarks[id]
          return newRemarks
        })
      }
      return newSelected
    })
  }, [])

  const handleCheckboxClick = (e, id) => {
    e.stopPropagation()
    const isChecked = e.target.checked
    handleSelectItem(id, isChecked)
  }

  const handleSelectAllItems = (e) => {
    e.stopPropagation()
    const checked = e.target.checked
    if (checked) {
      const allIds = filteredTasks.map(item => item.task_id)
      setSelectedItems(new Set(allIds))
    } else {
      setSelectedItems(new Set())
      setAdditionalData({})
      setRemarksData({})
    }
  }


  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  // Main submit function
  // Main submit function
  // Main submit function
  const handleSubmit = async () => {
    const selectedItemsArray = Array.from(selectedItems)
    if (selectedItemsArray.length === 0) {
      alert("Please select at least one task to submit")
      return
    }

    // Validate required fields
    const missingStatus = selectedItemsArray.filter(id => {
      const status = additionalData[id]?.status
      return !status || status === ""
    })

    if (missingStatus.length > 0) {
      alert("Please select status for all selected tasks")
      return
    }

    // Prepare submission data
    const submissionData = await Promise.all(
      selectedItemsArray.map(async (id) => {
        const taskData = additionalData[id] || {}

        return {
          taskId: id,
          status: taskData.status,
          sound_status: taskData.soundStatus || "",
          temperature_status: taskData.temperature || "",
          remarks: remarksData[id] || "",
          actual_date: taskData.status === "Yes"
            ? new Date().toISOString().split('T')[0]
            : null
        }

      })
    )

    setIsSubmitting(true)

    try {
      await updateMultipleMaintenanceTasksAction(submissionData);

      setSuccessMessage(`Successfully updated ${selectedItemsArray.length} maintenance tasks!`)

      // Reset selections
      setSelectedItems(new Set())
      setAdditionalData({})
      setRemarksData({})

      // Refresh data
      fetchPendingMaintenanceTasksAction({
        page: 1,
        userId: userRole === "user" ? username : null
      })
    } catch (error) {
      setError(`Failed to update tasks: ${error.message || error}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Statistics display component
  const StatisticsDisplay = () => {
    if (!statistics) return null

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-xl font-bold">{statistics.total_tasks || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-lg mr-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-xl font-bold">{statistics.completed_tasks || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-2 rounded-lg mr-3">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold">{statistics.pending_tasks || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="bg-red-100 p-2 rounded-lg mr-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">High Priority</p>
              <p className="text-xl font-bold">{statistics.high_priority || 0}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error if maintenance slice is not available
  if (!maintenanceState) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <h2 className="text-lg font-bold mb-2">Maintenance Module Not Available</h2>
            <p>The maintenance module is not properly configured. Please check:</p>
            <ol className="list-decimal list-inside mt-2 text-left">
              <li>Redux store configuration</li>
              <li>Maintenance slice registration</li>
              <li>API endpoints</li>
            </ol>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
        <div className="flex flex-col gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-blue-700">
            {showHistory ? CONFIG.PAGE_CONFIG.historyTitle : CONFIG.PAGE_CONFIG.title}
          </h1>

          {/* Statistics */}
          {!showHistory && <StatisticsDisplay />}

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={showHistory ? "Search maintenance history..." : "Search maintenance tasks..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleHistory}
                className="flex-1 sm:flex-none rounded-md bg-blue-600 py-2 px-3 sm:px-4 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm sm:text-base"
              >
                {showHistory ? (
                  <div className="flex items-center justify-center">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Back to Tasks</span>
                    <span className="sm:hidden">Back</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <History className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">View History</span>
                    <span className="sm:hidden">History</span>
                  </div>
                )}
              </button>

              {!showHistory && (
                <button
                  onClick={handleSubmit}
                  disabled={selectedItems.size === 0 || isSubmitting}
                  className="flex-1 sm:flex-none rounded-md bg-green-600 py-2 px-3 sm:px-4 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isSubmitting ? "Processing..." : (
                    <>
                      <span className="hidden sm:inline">Update Selected ({selectedItems.size})</span>
                      <span className="sm:hidden">Update ({selectedItems.size})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="flex items-center mb-2">
              <Filter className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Machine Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Machine</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={selectedMachines[0] || ""}
                  onChange={(e) => setSelectedMachines(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">All Machines</option>
                  {Array.isArray(machineNames) && machineNames.map((machine, idx) => (
                    <option key={idx} value={machine}>{machine}</option>
                  ))}
                </select>
              </div>

              {/* Personnel Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={selectedPersonnel[0] || ""}
                  onChange={(e) => setSelectedPersonnel(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">All Personnel</option>
                  {Array.isArray(assignedPersonnel) && assignedPersonnel.map((person, idx) => (
                    <option key={idx} value={person}>{person}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                >
                  <option value="">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {(selectedMachines.length > 0 || selectedPersonnel.length > 0 || selectedStatus || selectedPriority) && (
              <button
                onClick={resetFilters}
                className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-xs"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-3 rounded-md flex items-center justify-between text-sm sm:text-base">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-500 flex-shrink-0" />
              <span className="break-words">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700 ml-2 flex-shrink-0">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-md text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Main Table */}
        <div className="rounded-lg border border-blue-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 p-3 sm:p-4">
            <h2 className="text-blue-700 font-medium text-sm sm:text-base">
              {showHistory ? "Maintenance History" : "Maintenance Tasks"}
            </h2>
            <p className="text-blue-600 text-xs sm:text-sm mt-1">
              {showHistory ? CONFIG.PAGE_CONFIG.historyDescription : CONFIG.PAGE_CONFIG.description}
            </p>
          </div>

          {loading && currentPage === 1 ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-blue-600 text-sm sm:text-base">Loading maintenance data...</p>
            </div>
          ) : showHistory ? (
            /* History Table */
            <div ref={historyTableContainerRef} className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doer Name</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sound Status</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistoryData.length > 0 ? (
                    filteredHistoryData.map((task, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{task.task_no || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{task.machine_name || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{task.doer_name || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{task.serial_no || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900 max-w-xs truncate" title={task.task_description}>
                            {task.task_description || "—"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{task.assigned_to || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          {getPriorityBadge(task.priority)}
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {task.sound_status ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.sound_status === 'Good' ? 'bg-green-100 text-green-800' :
                                task.sound_status === 'Bad' ? 'bg-red-100 text-red-800' :
                                  task.sound_status === 'Need Repair' ? 'bg-orange-100 text-orange-800' :
                                    task.sound_status === 'OK' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                }`}>
                                {task.sound_status}
                              </span>
                            ) : "—"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{task.temperature_status || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{formatDate(task.scheduled_date)}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">{formatDate(task.completed_date)}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(task.status)}`}>
                            {task.status || "—"}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900 max-w-xs truncate" title={task.remarks}>
                            {task.remarks || "—"}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                        No maintenance history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Pending Tasks Table */
            <div ref={tableContainerRef} className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={filteredTasks.length > 0 && selectedItems.size === filteredTasks.length}
                        onChange={handleSelectAllItems}
                      />
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doer Name</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sound Status</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Update Status</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task, index) => {
                      const isSelected = selectedItems.has(task.task_id)

                      return (
                        <tr key={index} className={`${isSelected ? "bg-blue-50" : ""} hover:bg-gray-50`}>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 w-12">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={isSelected}
                              onChange={(e) => handleCheckboxClick(e, task.task_id)}
                            />
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">{task.task_no || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900">
                              {task.machine_name || "—"}
                              {task.serial_no && <div className="text-xs text-gray-500">SN: {task.serial_no}</div>}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900">
                              {task.doer_name || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 max-w-xs" title={task.task_description}>
                              {task.task_description || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            {getPriorityBadge(task.priority)}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900">
                              {formatDate(task.scheduled_date)}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(task.status)}`}>
                              {task.doer_department || "—"}
                            </span>
                          </td>

                          {/* Sound Status Dropdown */}
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <select
                              disabled={!isSelected}
                              value={additionalData[task.task_id]?.soundStatus || ""}
                              onChange={(e) => setAdditionalData(prev => ({
                                ...prev,
                                [task.task_id]: {
                                  ...prev[task.task_id],
                                  soundStatus: e.target.value
                                }
                              }))}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Select Sound Status</option>
                              <option value="Good">Good</option>
                              <option value="Bad">Bad</option>
                              <option value="Need Repair">Need Repair</option>
                              <option value="OK">OK</option>
                            </select>
                          </td>

                          {/* Temperature Input */}
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <input
                              type="text"
                              placeholder="Enter temperature"
                              disabled={!isSelected}
                              value={additionalData[task.task_id]?.temperature || ""}
                              onChange={(e) => setAdditionalData(prev => ({
                                ...prev,
                                [task.task_id]: {
                                  ...prev[task.task_id],
                                  temperature: e.target.value
                                }
                              }))}
                              className="border rounded-md px-2 py-1 w-full text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Update Status Dropdown */}
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <select
                              disabled={!isSelected}
                              value={additionalData[task.task_id]?.status || ""}
                              onChange={(e) => setAdditionalData(prev => ({
                                ...prev,
                                [task.task_id]: {
                                  ...prev[task.task_id],
                                  status: e.target.value
                                }
                              }))}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Select Status</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>

                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <input
                              type="text"
                              placeholder="Enter remarks"
                              disabled={!isSelected}
                              value={remarksData[task.task_id] || ""}
                              onChange={(e) => setRemarksData(prev => ({ ...prev, [task.task_id]: e.target.value }))}
                              className="border rounded-md px-2 py-1 w-full text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                        No maintenance tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default MaintenanceDataPage