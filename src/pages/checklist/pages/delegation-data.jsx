"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, Trash2, X } from "lucide-react"
import { useAuth } from "../context/AuthContext";




function DelegationPage({ searchTerm, nameFilter, freqFilter, setNameFilter, setFreqFilter }) {
 const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)

  const { 
    quickTaskState, 
    fetchUniqueDelegationTaskDataAction, 
    deleteDelegationTaskAction 
  } = useAuth();
  
  const { delegationTasks, loading } = quickTaskState || {};

  useEffect(() => {
    fetchUniqueDelegationTaskDataAction();
  }, []);

 // Handle checkbox selection
  const handleCheckboxChange = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(task_id => task_id !== taskId))
    } else {
      setSelectedTasks([...selectedTasks, taskId])
    }
  }

  // Select all checkboxes
  const handleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredTasks.map(task => task.task_id))
    }
  }

  // Delete selected tasks
  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return
    
    setIsDeleting(true)
    try {
      console.log(selectedTasks);
      
      await deleteDelegationTaskAction(selectedTasks);
      setSelectedTasks([])
      setSuccessMessage("Tasks deleted successfully")
      // Refresh the task list
      fetchUniqueDelegationTaskDataAction();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Failed to delete tasks:", error)
      setError("Failed to delete tasks")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDateTime = useCallback((dateStr) => {
    if (!dateStr) return "—"
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      const day = date.getDate().toString().padStart(2, "0")
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateStr
    }
  }, [])

  useEffect(() => {
    const role = localStorage.getItem("role")
    const user = localStorage.getItem("user-name")
    setUserRole(role || "")
    setUsername(user || "")
    setIsInitialized(true)
  }, [])

  // const fetchData = useCallback(async () => {
  //   if (!isInitialized || !username) return
    
  //   try {
  //   //  setLoading(true)
  //     setError(null)

  //     const tasksRes = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SOURCE_SHEET_NAME}&action=fetch`)

  //     if (!tasksRes.ok) throw new Error("Failed to fetch tasks")
      
  //     const tasksData = await tasksRes.json()

  //     const currentUsername = username.toLowerCase()
  //     const processedTasks = tasksData.table.rows.slice(1).map((row, index) => {
  //       const rowData = {
  //         _id: `task_${index}_${Math.random().toString(36).substr(2, 9)}`,
  //         _rowIndex: index + 2,
  //       }

  //       row.c.forEach((cell, colIndex) => {
  //         rowData[`col${colIndex}`] = cell?.v || ""
  //       })

  //       return rowData
  //     }).filter(task => 
  //       userRole === "admin" || 
  //       task.col4?.toLowerCase() === currentUsername
  //     )

  //     setTasks(processedTasks)
  //     setLoading(false)
  //   } catch (err) {
  //     console.error("Error fetching data:", err)
  //     setError("Failed to load data: " + err.message)
  //     setLoading(false)
  //   }
  // }, [userRole, username, isInitialized])

  useEffect(() => {
    if (isInitialized) {
     // fetchData()
     fetchUniqueDelegationTaskDataAction();
    }
  }, [fetchUniqueDelegationTaskDataAction, isInitialized])

  const filteredTasks = useMemo(() => {
    let filtered = delegationTasks;
    
    filtered = filtered.filter(task =>
  task.task_description?.toLowerCase().includes(searchTerm.toLowerCase())
);

    
    if (nameFilter) {
      filtered = filtered.filter(task => task.name === nameFilter)
    }
    
    if (freqFilter) {
      filtered = filtered.filter(task => task.frequency === freqFilter)
    }
    
    return filtered
  }, [delegationTasks, searchTerm, nameFilter, freqFilter])

  

  return (
    <>
      {/* Success Message - Fixed position */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between shadow-lg">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700 ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-50 p-4 rounded-md text-red-800 text-center">
          {error}{" "}
          <button 
            onClick={fetchData} 
            className="underline ml-2 hover:text-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State
      {(!isInitialized || loading) && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
          <p className="text-purple-600">Loading delegation data...</p>
        </div>
      )} */}

      {/* Main Content */}
      {!error && isInitialized && !loading && (
         <div className="mt-6 rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
          <div className="bg-gray-50/50 border-b border-gray-100 p-4 flex justify-between items-center">
            <div>
              <h2 className="text-gray-700 font-bold text-sm flex items-center gap-2">
                <div className="w-1 h-4 bg-red-600 rounded-full" />
                Delegation Tasks
              </h2>
              <p className="text-gray-500 text-[10px] sm:text-xs">
                ({filteredTasks.length} tasks matching your view)
              </p>
            </div>
            
            {selectedTasks.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-md text-xs font-bold"
              >
                <Trash2 size={14} />
                {isDeleting ? 'Deleting...' : `Delete ${selectedTasks.length} selected`}
              </button>
            )}
          </div>


          <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80 sticky top-0 z-20 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 transition-all"
                    />
                  </th>
                  {[
                    "TIMESTAMP", "TASK ID", "DEPARTMENT", "GIVEN BY",
                    "NAME", "TASK DESCRIPTION", "TASK START DATE",
                    "TASK END DATE", "FREQ", "REMINDERS", "ATTACHMENT"
                  ].map((head) => (
                    <th
                      key={head}
                      className={`px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest ${
                        (head === "TASK START DATE" || head === "TASK END DATE") ? "bg-red-50/30" : ""
                      }`}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                 {filteredTasks.length > 0 ? (
                  filteredTasks.map((task,index) => (
                     <tr
                       key={index}
                       className={`group hover:bg-gray-50/80 transition-colors ${
                         selectedTasks.includes(task.task_id) ? "bg-red-50/20" : ""
                       }`}
                     >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.task_id)}
                          onChange={() => handleCheckboxChange(task.task_id)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 transition-all"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600">
                        {formatDateTime(task.created_at) || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400">
                        #{task.task_id || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-medium">
                        {task.department || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {task.given_by || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">
                        {task.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 min-w-[300px] max-w-[400px]">
                        <div className="whitespace-normal break-words leading-relaxed">
                          {task.task_description || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600 bg-red-50/10">
                        {formatDateTime(task.task_start_date) || "—"}
                      </td>
                       <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600 bg-red-50/10">
                        {formatDateTime(task.submission_date) || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          task.frequency === 'Daily' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          task.frequency === 'Weekly' ? 'bg-green-50 text-green-600 border border-green-100' :
                          task.frequency === 'Monthly' ? 'bg-red-50 text-red-600 border border-red-100' :
                          'bg-gray-50 text-gray-600 border border-gray-100'
                        }`}>
                          {task.frequency || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-500">
                        <span className={task.enable_reminder === "Yes" ? "text-green-600" : "text-gray-400"}>
                          {task.enable_reminder || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-500">
                        <span className={task.require_attachment === "Yes" ? "text-blue-600" : "text-gray-400"}>
                          {task.require_attachment|| "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm || nameFilter || freqFilter 
                        ? "No tasks matching your filters" 
                        : "No pending tasks found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

export default DelegationPage