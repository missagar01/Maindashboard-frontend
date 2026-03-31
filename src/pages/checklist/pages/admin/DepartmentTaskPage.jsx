"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import AdminLayout from "../../components/layout/AdminLayout"
import DepartmentTaskTable from "../../components/unified/DepartmentTaskTable"
import { useAuth } from "../../context/AuthContext";
import { fetchDepartmentTasks } from "../../../../api/checklist/departmentTaskApi";
import { normalizeAllTasks, sortHousekeepingTasks } from "../../utils/taskNormalizer";

export default function DepartmentTaskPage() {
    const {
        user,
        checklistState, maintenanceState, housekeepingState,
        fetchChecklistDepartmentsAction, fetchChecklistDoersAction,
        fetchMaintenanceDepartmentsAction, fetchMaintenanceDoersAction,
        submitChecklistUserStatusAction, updateMultipleMaintenanceTasksAction,
        submitHousekeepingTasksAction, confirmHousekeepingTaskAction,
        fetchHousekeepingDepartmentsAction
    } = useAuth();

    // Local Task State
    const [tasks, setTasks] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [counts, setCounts] = useState({ checklist: 0, maintenance: 0, housekeeping: 0 })
    const [currentPage, setCurrentPage] = useState(1)
    const [activeStatus, setActiveStatus] = useState("Pending")
    const [activeSource, setActiveSource] = useState("checklist")

    const userRole = useMemo(() => (user?.verify_access || user?.role || "").toLowerCase(), [user]);
    const username = useMemo(() => user?.user_name || "", [user]);

    const { departments: checklistDepartments = [], doers: checklistDoers = [] } = checklistState || {}
    const { departments: maintenanceDepartments = [], doers: maintenanceDoers = [] } = maintenanceState || {}
    const { dashboardDepartments: housekeepingDepartments = [] } = housekeepingState || {}

    // 📋 1. Core Loader - No state updating of source/status here to prevent loops
    const loadTasks = useCallback(async (pageNum, sourceVal) => {
        if (!username || !sourceVal) return;

        setIsLoading(true);
        try {
            const response = await fetchDepartmentTasks({
                username: username,
                type: activeStatus === "Completed" ? "completed" : "pending",
                page: pageNum,
                source: sourceVal
            });

            const rawData = response.data || [];
            const checklistRaw = sourceVal === 'checklist' ? rawData : [];
            const maintenanceRaw = sourceVal === 'maintenance' ? rawData : [];
            const housekeepingRaw = sourceVal === 'housekeeping' ? rawData : [];

            const normalized = normalizeAllTasks(checklistRaw, maintenanceRaw, housekeepingRaw, activeStatus === "Completed");
            const finalTasks = sourceVal === 'housekeeping' ? sortHousekeepingTasks(normalized) : normalized;

            setTasks(finalTasks);
            setTotalCount(response.totalCount || 0);
            setCounts(response.counts || { checklist: 0, maintenance: 0, housekeeping: 0 });
            setCurrentPage(pageNum);
        } catch (error) {
            console.error("❌ [DepartmentTaskPage] API Error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [username, activeStatus]);

    // 🔄 2. Data Fetcher - Reacts to State Changes
    useEffect(() => {
        if (username) {
            loadTasks(1, activeSource);
        }
    }, [username, activeStatus, activeSource, loadTasks]);

    // 🏗️ 3. Initialization - Run once to load filter options
    useEffect(() => {
        if (username) {
            fetchChecklistDepartmentsAction();
            fetchChecklistDoersAction();
            fetchMaintenanceDepartmentsAction();
            fetchMaintenanceDoersAction();
            fetchHousekeepingDepartmentsAction();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username]);

    const handlePageChange = useCallback((page) => {
        loadTasks(page, activeSource);
    }, [loadTasks, activeSource]);

    const handleRefresh = useCallback(() => {
        loadTasks(currentPage, activeSource);
    }, [loadTasks, currentPage, activeSource]);

    const handleSourceChange = useCallback((newSource) => {
        setActiveSource(newSource);
        // loadTasks(1, newSource);  // The useEffect will handle this! No double-trigger.
    }, []);

    const handleHODConfirm = useCallback(async (taskId, { remark = "", doerName2 = "" }) => {
        try {
            await confirmHousekeepingTaskAction({ taskId, remark, doerName2, hod: username });
            handleRefresh();
        } catch (err) { console.error(err); }
    }, [confirmHousekeepingTaskAction, username, handleRefresh]);

    const handleUpdateTask = useCallback(async (updateData) => {
        const { taskId, sourceSystem, status, remarks, originalData } = updateData
        try {
            if (sourceSystem === 'checklist') {
                await submitChecklistUserStatusAction([{ taskId, remark: remarks || '', status }]);
            } else if (sourceSystem === 'maintenance') {
                await updateMultipleMaintenanceTasksAction([{ taskId, status, remarks }]);
            } else if (sourceSystem === 'housekeeping') {
                await submitHousekeepingTasksAction([{ task_id: taskId, status, remark: remarks, doer_name2: updateData.doerName2 || '', attachment: originalData?.attachment, hod: username }]);
            }
            handleRefresh();
        } catch (err) { console.error(err); }
    }, [username, handleRefresh, submitChecklistUserStatusAction, updateMultipleMaintenanceTasksAction, submitHousekeepingTasksAction]);

    const handleBulkSubmit = useCallback(async (submissionData) => {
        try {
            await Promise.allSettled(submissionData.map(async t => {
                if (t.sourceSystem === 'checklist') {
                    return submitChecklistUserStatusAction([{ taskId: t.taskId, remark: t.remarks || '', status: t.status }]);
                } else if (t.sourceSystem === 'maintenance') {
                    return updateMultipleMaintenanceTasksAction([{ taskId: t.taskId, status: t.status, remarks: t.remarks || '' }]);
                } else if (t.sourceSystem === 'housekeeping') {
                    return confirmHousekeepingTaskAction({ taskId: t.taskId, remark: t.remarks || '', doerName2: t.doerName2 || '', hod: username });
                }
            }));
            handleRefresh();
        } catch (err) { console.error(err); }
    }, [username, handleRefresh, submitChecklistUserStatusAction, updateMultipleMaintenanceTasksAction, confirmHousekeepingTaskAction]);

    return (
        <AdminLayout>
            <div className="space-y-2 px-1">
                <div className="flex flex-col gap-1 ml-1">
                    <h1 className="text-xl font-bold tracking-tight text-blue-700">Department Tasks</h1>
                </div>

                <DepartmentTaskTable
                    tasks={tasks}
                    loading={isLoading}
                    onUpdateTask={handleUpdateTask}
                    onBulkSubmit={handleBulkSubmit}
                    onHODConfirm={handleHODConfirm}
                    checklistDepartments={checklistDepartments}
                    checklistDoers={checklistDoers}
                    maintenanceDepartments={maintenanceDepartments}
                    maintenanceDoers={maintenanceDoers}
                    housekeepingDepartments={housekeepingDepartments}
                    userRole={userRole}
                    totalCount={totalCount}
                    currentPage={currentPage}
                    activeSource={activeSource}
                    allCounts={counts}
                    onPageChange={handlePageChange}
                    onSourceChange={handleSourceChange}
                    onRefresh={handleRefresh}
                    onStatusChange={setActiveStatus}
                    isViewOnly={true}
                />
            </div>
        </AdminLayout>
    )
}
