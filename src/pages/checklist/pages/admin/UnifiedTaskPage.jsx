"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import AdminLayout from "../../components/layout/AdminLayout"
import UnifiedTaskTable from "../../components/unified/UnifiedTaskTable"
import { useAuth } from "../../context/AuthContext";
import { normalizeAllTasks, sortHousekeepingTasks } from "../../utils/taskNormalizer";


/**
 * UnifiedTaskPage - Main page component for unified task management
 * Fetches and merges data from Checklist, Maintenance, and Housekeeping systems
 */



export default function UnifiedTaskPage() {
    // State
    const [userRole, setUserRole] = useState("")
    const [username, setUsername] = useState("")
    const [systemAccess, setSystemAccess] = useState([]) // New state for system access
    const [activeStatus, setActiveStatus] = useState("Pending") // NEW: Track status in parent

    const {
        checklistState, maintenanceState, housekeepingState,
        fetchChecklistDataAction, fetchChecklistHistoryDataAction, submitChecklistUserStatusAction,
        fetchChecklistDepartmentsAction, fetchChecklistDoersAction,
        fetchPendingMaintenanceTasksAction, fetchCompletedMaintenanceTasksAction, fetchUniqueMachineNamesAction,
        fetchUniqueAssignedPersonnelAction, fetchMaintenanceDepartmentsAction, fetchMaintenanceDoersAction,
        updateMultipleMaintenanceTasksAction,
        fetchHousekeepingPendingTasksAction, fetchHousekeepingHistoryTasksAction, submitHousekeepingTasksAction,
        confirmHousekeepingTaskAction, fetchHousekeepingDepartmentsAction
    } = useAuth();

    // Destructure variables from context state
    const {
        checklist = [],
        history: checklistHistory = [],
        historyTotal: checklistHistoryTotal = 0,
        historyHasMore: checklistHistoryHasMore = false,
        historyCurrentPage: checklistHistoryCurrentPage = 1,
        loading: checklistLoading,
        hasMore: checklistHasMore = false,
        currentPage: checklistCurrentPage = 1,
        pendingTotal: checklistPendingTotal = 0,
        departments: checklistDepartments = [],
        doers: checklistDoers = [],
    } = checklistState || {}

    const {
        tasks: maintenanceTasks = [],
        history: maintenanceHistory = [],
        historyTotal: maintenanceHistoryTotal = 0,
        hasMoreHistory: maintenanceHistoryHasMore = false,
        currentPageHistory: maintenanceHistoryCurrentPage = 1,
        loading: maintenanceLoading,
        assignedPersonnel = [],
        departments: maintenanceDepartments = [],
        doers: maintenanceDoers = [],
        currentPage: maintenanceCurrentPage = 1,
        pendingTotal: maintenancePendingTotal = 0,
        hasMore: maintenanceHasMore = false,
    } = maintenanceState || {}

    const {
        pendingTasks: housekeepingTasks = [],
        historyTasks: housekeepingHistory = [],
        historyTotal: housekeepingHistoryTotal = 0,
        loading: housekeepingLoading,
        error: housekeepingError,
        pendingPage: housekeepingPendingPage = 1,
        pendingTotal: housekeepingPendingTotal = 0,
        pendingHasMore: housekeepingPendingHasMore = false,
        historyPage: housekeepingHistoryPage = 1,
        historyHasMore: housekeepingHistoryHasMore = false,
        dashboardDepartments: housekeepingDepartments = [],
    } = housekeepingState || {}

    // Load user info
    useEffect(() => {
        const role = localStorage.getItem("role")
        const user = localStorage.getItem("user-name")
        const access = (localStorage.getItem("system_access") || "")
            .split(',')
            .map(item => item.trim().toLowerCase())
            .filter(Boolean)

        setUserRole(role || "")
        setUsername(user || "")
        setSystemAccess(access)
    }, [])

    // Function to check if user has access to a system
    const hasSystemAccess = useCallback((system) => {
        if (systemAccess.length === 0) return true; // If no restriction, allow all
        return systemAccess.includes(system.toLowerCase());
    }, [systemAccess])

    // Update loadHousekeepingData function to respect system_access
    // Backend now uses query params for department filtering (no token required)
    const loadHousekeepingData = useCallback(async () => {
        // Check if user has housekeeping access
        if (!hasSystemAccess('housekeeping') && systemAccess.length > 0) {
            return
        }

        // Pass department filter from user_access1 in query params
        const filters = {}
        const role = localStorage.getItem("role")
        const canVerify = localStorage.getItem('page_access')?.includes('housekeeping-verify');

        if (role?.toLowerCase() === "user" && !canVerify) {
            // Use user_access1 for housekeeping, fallback to user_access
            const userAccess1 = localStorage.getItem("user_access1") || localStorage.getItem("userAccess1") || ""
            const userAccess = localStorage.getItem("user_access") || localStorage.getItem("userAccess") || ""
            const accessToUse = userAccess1 || userAccess
            if (accessToUse) {
                // Pass department as query param (comma-separated)
                filters.department = accessToUse
            }
        }
        await fetchHousekeepingPendingTasksAction({ page: 1, filters });
    }, [hasSystemAccess, systemAccess, fetchHousekeepingPendingTasksAction])

    // Load housekeeping history data
    // Backend now uses query params for department filtering (no token required)
    const loadHousekeepingHistoryData = useCallback(async () => {
        // Pass department filter from user_access1 in query params
        const filters = {}
        const role = localStorage.getItem("role")
        const canVerify = localStorage.getItem('page_access')?.includes('housekeeping-verify');

        if (role?.toLowerCase() === "user" && !canVerify) {
            // Use user_access1 for housekeeping, fallback to user_access
            const userAccess1 = localStorage.getItem("user_access1") || localStorage.getItem("userAccess1") || ""
            const userAccess = localStorage.getItem("user_access") || localStorage.getItem("user_access") || ""
            const accessToUse = userAccess1 || userAccess
            if (accessToUse) {
                // Pass department as query param (comma-separated)
                filters.department = accessToUse
            }
        }
        await fetchHousekeepingHistoryTasksAction({ page: 1, filters });
    }, [fetchHousekeepingHistoryTasksAction])

    // Combine loading states
    const isLoading = checklistLoading || maintenanceLoading || housekeepingLoading

    // Load all data sources (pending + history) based on system_access
    useEffect(() => {
        const role = localStorage.getItem("role")
        const user = localStorage.getItem("user-name")

        // Load checklist data only if user has access
        if (hasSystemAccess('checklist') || systemAccess.length === 0) {
            fetchChecklistDataAction(1)
            fetchChecklistHistoryDataAction(1)
            fetchChecklistDepartmentsAction()
            fetchChecklistDoersAction()
        }

        // Load maintenance data only if user has access
        if (hasSystemAccess('maintenance') || systemAccess.length === 0) {
            fetchPendingMaintenanceTasksAction({
                page: 1,
                userId: role === "user" ? user : null
            })
            fetchCompletedMaintenanceTasksAction({ page: 1, filters: {}, userId: role === "user" ? user : null })
            fetchUniqueMachineNamesAction()
            fetchUniqueAssignedPersonnelAction()
            fetchMaintenanceDepartmentsAction()
            fetchMaintenanceDoersAction()
        }

        // Load housekeeping data only if user has access
        if (hasSystemAccess('housekeeping') || systemAccess.length === 0) {
            loadHousekeepingData()
            loadHousekeepingHistoryData()
            fetchHousekeepingDepartmentsAction()
        }
    }, [hasSystemAccess, systemAccess, loadHousekeepingData, loadHousekeepingHistoryData, fetchChecklistDataAction, fetchChecklistHistoryDataAction, fetchChecklistDepartmentsAction, fetchChecklistDoersAction, fetchPendingMaintenanceTasksAction, fetchCompletedMaintenanceTasksAction, fetchUniqueMachineNamesAction, fetchUniqueAssignedPersonnelAction, fetchMaintenanceDepartmentsAction, fetchMaintenanceDoersAction, fetchHousekeepingDepartmentsAction])

    // Callback to load more checklist data (called on scroll)
    const loadMoreChecklistData = useCallback(() => {
        if (activeStatus === 'Completed') {
            if (checklistHistoryHasMore && !checklistLoading) {
                fetchChecklistHistoryDataAction(checklistHistoryCurrentPage + 1)
            }
        }
    }, [checklistHistoryHasMore, checklistLoading, checklistHistoryCurrentPage, activeStatus, fetchChecklistHistoryDataAction])

    // Callback to load more housekeeping data (called on scroll)
    const loadMoreHousekeepingData = useCallback(async () => {
        if (activeStatus === 'Completed') {
            if (housekeepingHistoryHasMore && !housekeepingLoading) {
                fetchHousekeepingHistoryTasksAction({ page: housekeepingHistoryPage + 1 })
            }
        }
    }, [housekeepingHistoryHasMore, housekeepingHistoryPage, housekeepingLoading, activeStatus, fetchHousekeepingHistoryTasksAction])

    // Callback to load more maintenance data (called on scroll)
    const loadMoreMaintenanceData = useCallback(() => {
        const role = localStorage.getItem("role")
        const user = localStorage.getItem("user-name")

        if (activeStatus === 'Completed') {
            if (maintenanceHistoryHasMore && !maintenanceLoading) {
                fetchCompletedMaintenanceTasksAction({
                    page: maintenanceHistoryCurrentPage + 1,
                    filters: {},
                    userId: role === "user" ? user : null
                })
            }
        }
    }, [maintenanceHistoryHasMore, maintenanceHistoryCurrentPage, maintenanceLoading, activeStatus, fetchCompletedMaintenanceTasksAction])

    // Normalize and merge all tasks - filter based on system_access
    const allTasks = useMemo(() => {
        // Filter checklist tasks based on access
        const checklistFiltered = hasSystemAccess('checklist') || systemAccess.length === 0
            ? (Array.isArray(checklist) ? checklist : [])
            : []

        const checklistHistoryFiltered = hasSystemAccess('checklist') || systemAccess.length === 0
            ? (Array.isArray(checklistHistory) ? checklistHistory : [])
            : []

        // Filter maintenance tasks based on access
        // Also filter out tasks that already have an actual_date (as per user request for pending screen)
        const maintenanceFiltered = hasSystemAccess('maintenance') || systemAccess.length === 0
            ? (Array.isArray(maintenanceTasks) ? maintenanceTasks : [])
            : []

        const maintenanceHistoryFiltered = hasSystemAccess('maintenance') || systemAccess.length === 0
            ? (Array.isArray(maintenanceHistory) ? maintenanceHistory : [])
            : []

        let housekeepingFiltered = [];
        let housekeepingHistoryFiltered = [];

        if (hasSystemAccess('housekeeping') || systemAccess.length === 0) {
            housekeepingFiltered = Array.isArray(housekeepingTasks) ? housekeepingTasks : [];
            housekeepingHistoryFiltered = Array.isArray(housekeepingHistory) ? housekeepingHistory : [];
        }

        // Combine pending tasks from all accessible sources
        const pendingTasks = normalizeAllTasks(
            checklistFiltered,
            maintenanceFiltered,
            housekeepingFiltered
        )

        // Combine history tasks from all accessible sources
        const historyTasks = normalizeAllTasks(
            checklistHistoryFiltered,
            maintenanceHistoryFiltered,
            housekeepingHistoryFiltered,
            true // isHistory flag
        )

        // Combine all tasks (pending + history)
        // Deduplicate: if a task appears in both pending and history, prefer history version
        const taskMap = new Map()

        // First add pending tasks
        pendingTasks.forEach(task => {
            const key = `${task.sourceSystem}-${task.id}`
            taskMap.set(key, task)
        })

        // Then add history tasks (will overwrite pending if duplicate)
        historyTasks.forEach(task => {
            const key = `${task.sourceSystem}-${task.id}`
            taskMap.set(key, task)
        })

        const allCombined = Array.from(taskMap.values())

        // --- DEBUG LOG FOR BIKASH ---
        if (activeStatus === "Completed") {
            const bikashHistoryTasks = historyTasks.filter(t => t.assignedTo?.toLowerCase().includes("bikash") || t.originalData?.name?.toLowerCase().includes("bikash"));
            // console.log("HISTORY TASKS FOR BIKASH (RAW FROM NORMALIZER):", bikashHistoryTasks);
        }

        // Sort housekeeping tasks: confirmed first
        return sortHousekeepingTasks(allCombined)
    }, [
        checklist,
        checklistHistory,
        maintenanceTasks,
        maintenanceHistory,
        housekeepingTasks,
        housekeepingHistory,
        hasSystemAccess,
        systemAccess,
        activeStatus
    ])

    // Get unique assignees from all sources
    const allAssignees = useMemo(() => {
        const assigneesSet = new Set()

            // From maintenance
            ; (Array.isArray(assignedPersonnel) ? assignedPersonnel : []).forEach(p => assigneesSet.add(p))
            ; (Array.isArray(maintenanceDoers) ? maintenanceDoers : []).forEach(d => assigneesSet.add(d))

            // From checklist (fetched from API)
            ; (Array.isArray(checklistDoers) ? checklistDoers : []).forEach(d => assigneesSet.add(d))

        // From all tasks
        allTasks.forEach(task => {
            if (task.assignedTo && task.assignedTo !== '—') {
                assigneesSet.add(task.assignedTo)
            }
        })

        return Array.from(assigneesSet).filter(Boolean).sort()
    }, [allTasks, assignedPersonnel, checklistDoers, maintenanceDoers])

    // Get unique departments from all sources
    const allDepartments = useMemo(() => {
        const departmentsSet = new Set()

            // From checklist (fetched from API)
            ; (Array.isArray(checklistDepartments) ? checklistDepartments : []).forEach(d => departmentsSet.add(d))

            // From maintenance (fetched from API)
            ; (Array.isArray(maintenanceDepartments) ? maintenanceDepartments : []).forEach(d => departmentsSet.add(d))

        allTasks.forEach(task => {
            if (task.department && task.department !== '—') {
                departmentsSet.add(task.department)
            }
        })

        return Array.from(departmentsSet).filter(Boolean).sort()
    }, [allTasks, checklistDepartments, maintenanceDepartments])

    // Handle HOD confirm for housekeeping tasks
    const handleHODConfirm = useCallback(async (taskId, { remark = "", doerName2 = "" }) => {
        try {
            const payload = {
                taskId,
                remark,
                doerName2,
            };

            // Only send hod if remark is present
            if (remark) {
                payload.hod = username;
            }

            await confirmHousekeepingTaskAction(payload);

            // Refresh housekeeping data after confirm
            await loadHousekeepingData()
        } catch (error) {
            console.error('HOD confirm failed:', error)
            throw error
        }
    }, [confirmHousekeepingTaskAction, loadHousekeepingData, username])

    // Handle task update
    const handleUpdateTask = useCallback(async (updateData) => {
        const { taskId, sourceSystem, status, remarks, originalData } = updateData

        switch (sourceSystem) {

            case 'checklist': {
                const normalizedRole = userRole?.toLowerCase();
                if (normalizedRole === 'user') {
                    await submitChecklistUserStatusAction([{
                        taskId,
                        remark: remarks || '',   // ✅ only remark
                        status: status,
                    }]);
                    fetchChecklistDataAction(1)
                }
                break
            }

            case 'maintenance':
                await updateMultipleMaintenanceTasksAction([{
                    taskId,
                    status,
                    remarks,
                }]);
                fetchPendingMaintenanceTasksAction({
                    page: 1,
                    userId: userRole === "user" ? username : null
                })
                break

            case 'housekeeping': {
                const payload = {
                    task_id: taskId,
                    status,
                    remark: remarks,
                    doer_name2: updateData.doerName2 || '',
                    attachment: originalData?.attachment,
                };

                // Only send hod if remark is present
                if (remarks) {
                    payload.hod = username;
                }

                await submitHousekeepingTasksAction([payload]);
                await loadHousekeepingData();
                break;
            }

            default:
                throw new Error(`Unknown source system: ${sourceSystem}`)
        }
    }, [userRole, username, loadHousekeepingData])

    // Handle bulk submit - receives data from UnifiedTaskTable inline editing
    const handleBulkSubmit = useCallback(async (submissionData) => {
        // submissionData is array of: { taskId, sourceSystem, status, soundStatus, temperature, remarks, image, originalData }

        // Group tasks by source system
        const tasksBySource = {
            checklist: [],
            maintenance: [],
            housekeeping: [],
        }

        submissionData.forEach(task => {
            tasksBySource[task.sourceSystem]?.push(task)
        })

        const checklistPromise = (() => {
            if (tasksBySource.checklist.length === 0) {
                return Promise.resolve();
            }

            const normalizedRole = userRole?.toLowerCase();
            const isChecklistUser = normalizedRole === "user";

            if (isChecklistUser) {
                const payload = tasksBySource.checklist.map((t) => ({
                    taskId: t.taskId,
                    remark: t.remarks || "",   // ✅ only remark
                    status: t.status,
                }));
                return submitChecklistUserStatusAction(payload);
            }


            return Promise.resolve();
        })();

        const results = await Promise.allSettled([
            checklistPromise,

            // Update maintenance tasks - with all fields
            tasksBySource.maintenance.length > 0
                ? updateMultipleMaintenanceTasksAction(
                    tasksBySource.maintenance.map(t => ({
                        taskId: t.taskId,
                        status: t.status,
                        sound_status: t.soundStatus || '',
                        temperature_status: t.temperature || '',
                        remarks: t.remarks || '',
                        actual_date: t.status === 'Yes'
                            ? new Date().toISOString().split('T')[0]
                            : null
                    }))
                )
                : Promise.resolve(),

            // Update housekeeping tasks
            // User role: use confirmHousekeepingTask for pending tasks
            // Admin role: use submitHousekeepingTasks for confirmed tasks
            tasksBySource.housekeeping.length > 0
                ? Promise.all(
                    tasksBySource.housekeeping.map(async (t) => {
                        // Check if task is pending using originalData from submission
                        const isPending = t.originalData?.attachment !== "confirmed" &&
                            t.originalData?.confirmedByHOD !== "Confirmed" &&
                            t.originalData?.confirmedByHOD !== "confirmed";

                        if (userRole?.toLowerCase() === 'user' && isPending) {
                            const payload = {
                                taskId: t.taskId,
                                remark: t.remarks || '',
                                doerName2: t.doerName2 || '',
                                hod: username, // Always send current user as HOD
                            };

                            return confirmHousekeepingTaskAction(payload);
                        } else {
                            // Admin role: use submitHousekeepingTasks API for confirmed tasks
                            const payload = {
                                task_id: t.taskId,
                                status: t.status || 'Yes',
                                remark: t.remarks || '',
                                doer_name2: t.doerName2 || '',
                                hod: t.originalData?.hod || username, // Preserve existing HOD if available
                                attachment: t.originalData?.attachment,
                            };

                            return submitHousekeepingTasksAction([payload]);
                        }
                    })
                )
                : Promise.resolve(),
        ])

        // Refresh all data
        fetchChecklistDataAction(1)
        fetchPendingMaintenanceTasksAction({
            page: 1,
            userId: userRole === "user" ? username : null
        })
        await loadHousekeepingData()

        // Check for errors
        const errors = results.filter(r => r.status === 'rejected')
        if (errors.length > 0) {
            throw new Error(`${errors.length} update(s) failed`)
        }
    }, [userRole, username, loadHousekeepingData])


    // Handle page change for pagination
    const handlePageChange = useCallback(async (page, sourceSystem) => {
        const role = localStorage.getItem("role")
        const user = localStorage.getItem("user-name")

        switch (sourceSystem) {
            case 'checklist':
                fetchChecklistDataAction({ page, replace: true })
                break;
            case 'maintenance':
                fetchPendingMaintenanceTasksAction({
                    page,
                    userId: role === "user" ? user : null,
                    replace: true
                })
                break;
            case 'housekeeping': {
                const filters = {}
                const canVerify = localStorage.getItem('page_access')?.includes('housekeeping-verify');
                if (role?.toLowerCase() === "user" && !canVerify) {
                    const userAccess1 = localStorage.getItem("user_access1") || localStorage.getItem("userAccess1") || ""
                    const userAccess = localStorage.getItem("user_access") || localStorage.getItem("userAccess") || ""
                    const accessToUse = userAccess1 || userAccess
                    if (accessToUse) filters.department = accessToUse
                }
                fetchHousekeepingPendingTasksAction({ page, filters, replace: true })
                break;
            }
            default:
                break;
        }
    }, [fetchChecklistDataAction, fetchPendingMaintenanceTasksAction, fetchHousekeepingPendingTasksAction])

    // Handle refresh based on system
    const handleRefresh = useCallback((system) => {
        const role = localStorage.getItem("role")
        const user = localStorage.getItem("user-name")

        switch (system) {
            case 'checklist':
                if (hasSystemAccess('checklist') || systemAccess.length === 0) {
                    fetchChecklistDataAction({ page: 1, replace: true })
                    fetchChecklistHistoryDataAction({ page: 1, replace: true })
                    fetchChecklistDepartmentsAction()
                    fetchChecklistDoersAction()
                }
                break;
            case 'maintenance':
                if (hasSystemAccess('maintenance') || systemAccess.length === 0) {
                    fetchPendingMaintenanceTasksAction({
                        page: 1,
                        userId: role === "user" ? user : null,
                        replace: true
                    })
                    fetchCompletedMaintenanceTasksAction({
                        page: 1,
                        filters: {},
                        userId: role === "user" ? user : null,
                        replace: true
                    })
                    fetchMaintenanceDepartmentsAction()
                    fetchMaintenanceDoersAction()
                }
                break;
            case 'housekeeping':
                if (hasSystemAccess('housekeeping') || systemAccess.length === 0) {
                    loadHousekeepingData()
                    loadHousekeepingHistoryData()
                    fetchHousekeepingDepartmentsAction()
                }
                break;
            default:
                break;
        }
    }, [hasSystemAccess, systemAccess, username])

    return (
        <AdminLayout>
            <div className="space-y-3 sm:space-y-4 md:space-y-6 p-2 sm:p-4 md:p-0">
                {/* Header
                <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-blue-700">
                        Unified Task Management
                    </h1>
                </div>
                 */}

                {/* Error Display */}
                {housekeepingError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-2 sm:px-4 py-2 sm:py-3 rounded-md text-xs sm:text-sm">
                        Housekeeping data error: {housekeepingError}
                    </div>
                )}

                {/* Unified Task Table */}
                <UnifiedTaskTable
                    tasks={allTasks}
                    loading={isLoading}
                    onUpdateTask={handleUpdateTask}
                    onBulkSubmit={handleBulkSubmit}
                    onHODConfirm={handleHODConfirm}

                    // Pass specific lists instead of merged ones
                    checklistDepartments={checklistDepartments}
                    checklistDoers={checklistDoers}
                    maintenanceDepartments={maintenanceDepartments}
                    maintenanceDoers={maintenanceDoers}

                    housekeepingDepartments={housekeepingDepartments}
                    userRole={userRole}
                    onLoadMore={() => {
                        loadMoreChecklistData()
                        loadMoreHousekeepingData()
                        loadMoreMaintenanceData()
                    }}
                    hasMore={
                        activeStatus === 'Completed' &&
                        (checklistHistoryHasMore || maintenanceHistoryHasMore || housekeepingHistoryHasMore)
                    }
                    totalCount={(() => {
                        // Return total count based on source system for Pending
                        if (activeStatus === 'Completed') return 0; // Pagination not used for history

                        // We need to know which system is selected in the table's filter
                        // This info is inside UnifiedTaskTable. We'll pass all totals
                        // and UnifiedTaskTable can decide, OR we use the fact that it's often 
                        // filtered by source system.

                        // Since UnifiedTaskPage doesn't know the table's internal filter state easily,
                        // we can pass a combined total or update UnifiedTaskTable to handle multiple totals.
                        // Actually, looking at UnifiedTaskTable, it has a filters.sourceSystem state.

                        // Let's pass the totals as an object and have the table select the right one.
                        // Wait, I already added totalCount as a number prop to UnifiedTaskTable.

                        // Let's pass all totals and current pages and let the table handle it, 
                        // but wait, I can just pass the total based on what I HAVE here.

                        // Actually, I'll pass a single totalCount and currentPage and update them 
                        // when the status/source changes in the table.
                        return activeStatus === 'Pending' ? Math.max(checklistPendingTotal, maintenancePendingTotal, housekeepingPendingTotal) : 0;
                    })()}
                    // Better approach: pass an object of counts
                    pendingTotals={{
                        checklist: checklistPendingTotal,
                        maintenance: maintenancePendingTotal,
                        housekeeping: housekeepingPendingTotal
                    }}
                    pendingPages={{
                        checklist: checklistCurrentPage,
                        maintenance: maintenanceCurrentPage,
                        housekeeping: housekeepingPendingPage
                    }}
                    onPageChange={handlePageChange}
                    checklistHistoryTotal={Number(checklistHistoryTotal)}
                    maintenanceHistoryTotal={Number(maintenanceHistoryTotal)}
                    housekeepingHistoryTotal={Number(housekeepingHistoryTotal)}
                    onRefresh={handleRefresh}
                    onStatusChange={setActiveStatus} // NEW: Sync status
                />
            </div>
        </AdminLayout>
    )
}
