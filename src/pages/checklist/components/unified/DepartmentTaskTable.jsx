import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle2, X, AlertTriangle } from "lucide-react";
import { DepartmentTaskRow, DepartmentTaskTableHeader, DepartmentTaskCard } from "./DepartmentTaskRow"; // Specialized Components
import { TaskTableEmpty } from "./TaskRow";
import DepartmentTaskFilterBar from "./DepartmentTaskFilterBar"; 
import TaskDrawer from "./TaskDrawer";
import { filterTasks, sortByDate, sortHousekeepingTasks, sortBySubmissionDateDesc } from "../../utils/taskNormalizer";

/**
 * DepartmentTaskTable - Specialized table component for HODs and Managers
 * Optimized for mobile responsiveness (Card view) and read-only mode.
 */
export default function DepartmentTaskTable({
    tasks = [],
    loading = false,
    onUpdateTask,
    onBulkSubmit,
    onHODConfirm,
    userRole = "admin",
    totalCount = 0,
    currentPage = 1,
    onPageChange,
    onRefresh,
    onStatusChange,
    allCounts = { checklist: 0, maintenance: 0, housekeeping: 0 },
    activeSource = "checklist",
    onSourceChange,
    isViewOnly = true, // Default to View Only as requested
    
    // Filter Option Lists
    checklistDepartments = [],
    checklistDoers = [],
    maintenanceDepartments = [],
    maintenanceDoers = [],
    housekeepingDepartments = [],
}) {
    const { userData } = useAuth();
    const [selectedItems, setSelectedItems] = useState(new Set());
    
    const [filters, setFilters] = useState({
        searchTerm: "",
        sourceSystem: activeSource, 
        status: "Pending",
        priority: "",
        assignedTo: "",
        department: "",
    });

    // Keep internal filter source in sync with activeSource prop
    useEffect(() => {
        setFilters(prev => ({ ...prev, sourceSystem: activeSource }));
    }, [activeSource]);

    const handleFilterChange = useCallback((newFilters) => {
        if (newFilters.sourceSystem !== filters.sourceSystem) {
            if (onSourceChange) onSourceChange(newFilters.sourceSystem);
        }
        setFilters(newFilters);
    }, [filters.sourceSystem, onSourceChange]);

    const loggedInUser = localStorage.getItem("user-name") || "";
    const tableContainerRef = useRef(null);

    // 📊 1. Use system-wide counts from parent
    const systemCounts = allCounts;

    // 📋 2. Compute Filter Options
    const { departmentOptions, assignedToOptions } = useMemo(() => {
        if (filters.sourceSystem === 'checklist') return { departmentOptions: checklistDepartments, assignedToOptions: checklistDoers };
        if (filters.sourceSystem === 'maintenance') return { departmentOptions: maintenanceDepartments, assignedToOptions: maintenanceDoers };
        if (filters.sourceSystem === 'housekeeping') return { departmentOptions: housekeepingDepartments, assignedToOptions: [] };
        return { departmentOptions: [], assignedToOptions: [] };
    }, [filters.sourceSystem, checklistDepartments, checklistDoers, maintenanceDepartments, maintenanceDoers, housekeepingDepartments]);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rowData, setRowData] = useState({});

    useEffect(() => {
        if (onStatusChange) onStatusChange(filters.status);
    }, [filters.status, onStatusChange]);

    // 🛠 3. Filter and Sort
    const displayTasks = useMemo(() => {
        if (filters.searchTerm || filters.sourceSystem || filters.department || filters.assignedTo) {
            let filtered = filterTasks(tasks, filters, userRole);
            const seen = new Set();
            const deduplicated = filtered.filter(task => {
                const key = `${task.sourceSystem}-${task.id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            if (filters.status === "Completed") return sortBySubmissionDateDesc(deduplicated);
            if (filters.sourceSystem === "housekeeping") return sortHousekeepingTasks(deduplicated);
            return sortByDate(deduplicated, true);
        }
        return filters.status === "Completed" ? sortBySubmissionDateDesc(tasks) : sortByDate(tasks, true);
    }, [tasks, filters, userRole]);

    const handleClearFilters = useCallback(() => {
        setFilters({ searchTerm: "", sourceSystem: "", status: filters.status, priority: "", assignedTo: "", department: "" });
        setSelectedItems(new Set());
    }, [filters.status]);

    const handleSelectItem = useCallback((id, isChecked) => {
        setSelectedItems(prev => {
            const newSelected = new Set(prev);
            if (isChecked) newSelected.add(id);
            else newSelected.delete(id);
            return newSelected;
        });
    }, []);

    const handleSelectAll = useCallback((e) => {
        if (e.target.checked) setSelectedItems(new Set(displayTasks.map(t => t.id)));
        else setSelectedItems(new Set());
    }, [displayTasks]);

    const handleRowDataChange = useCallback((taskId, field, value) => {
        setRowData(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: value } }));
    }, []);

    const handleBulkSubmit = useCallback(async () => {
        const selectedIds = Array.from(selectedItems);
        if (selectedIds.length === 0) return setErrorMessage("⚠️ Select tasks to update");
        setIsSubmitting(true);
        try {
            const submissionData = selectedIds.map(id => {
                const task = displayTasks.find(t => t.id === id);
                const taskRowData = rowData[id] || {};
                return { taskId: id, sourceSystem: task?.sourceSystem, status: taskRowData.status || "Yes", remarks: taskRowData.remarks || "", originalData: task?.originalData };
            });
            if (onBulkSubmit) await onBulkSubmit(submissionData);
            setSuccessMessage("✅ Bulk update successful!");
            setSelectedItems(new Set());
            setRowData({});
        } catch (error) { setErrorMessage(`❌ Error: ${error.message}`); }
        finally { setIsSubmitting(false); setTimeout(() => { setSuccessMessage(""); setErrorMessage(""); }, 3000); }
    }, [selectedItems, displayTasks, rowData, onBulkSubmit]);

    const isAllSelected = displayTasks.length > 0 && selectedItems.size === displayTasks.length;
    const isIndeterminate = selectedItems.size > 0 && selectedItems.size < displayTasks.length;

    return (
        <div className="space-y-4">
            <DepartmentTaskFilterBar
                filters={filters}
                onFiltersChange={handleFilterChange}
                departmentOptions={departmentOptions}
                assignedToOptions={assignedToOptions}
                userRole={userRole}
                systemCounts={systemCounts}
                onTaskAdded={() => onRefresh && onRefresh(currentPage)}
            />

            {(successMessage || errorMessage) && (
                <div className={`px-4 py-3 rounded-md flex justify-between items-center z-50 ${successMessage ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    <div className="flex items-center">
                        {successMessage ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <AlertTriangle className="h-5 w-5 mr-2" />}
                        <span>{successMessage || errorMessage}</span>
                    </div>
                </div>
            )}

            <div className="w-full rounded-lg border border-gray-200 shadow-lg bg-white overflow-hidden">
                <div className="hidden md:flex bg-gray-50 border-b border-gray-200 px-3 py-2 flex-col md:flex-row justify-between items-center gap-2">
                    <p className="text-xs font-bold text-blue-800">
                        Page {currentPage} - {displayTasks.length} {filters.status} tasks
                    </p>
                    {!isViewOnly && filters.status === "Pending" && (
                        <button
                            onClick={handleBulkSubmit}
                            disabled={selectedItems.size === 0 || isSubmitting}
                            className={`px-6 py-2 rounded-full text-sm font-black transition-all ${selectedItems.size > 0 ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                        >
                            {isSubmitting ? "⏳ Processing..." : `Complete Selected (${selectedItems.size})`}
                        </button>
                    )}
                </div>

                {/* 💻 Desktop Table View */}
                <div className="hidden md:block overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                    <table className="w-full divide-y divide-gray-200">
                        <DepartmentTaskTableHeader
                            onSelectAll={handleSelectAll}
                            isAllSelected={isAllSelected}
                            isIndeterminate={isIndeterminate}
                            isHistoryMode={filters.status === "Completed"}
                            isViewOnly={isViewOnly}
                        />
                        <tbody className="bg-white divide-y divide-gray-100">
                            {!loading && displayTasks.length > 0 ? (
                                displayTasks.map((task, idx) => (
                                    <DepartmentTaskRow
                                        key={`${task.sourceSystem}-${task.id}`}
                                        task={task}
                                        isSelected={selectedItems.has(task.id)}
                                        onSelect={handleSelectItem}
                                        onView={(t) => { setSelectedTask(t); setDrawerOpen(true); }}
                                        rowData={rowData[task.id] || {}}
                                        onRowDataChange={handleRowDataChange}
                                        isHistoryMode={filters.status === "Completed"}
                                        userRole={userRole}
                                        isViewOnly={isViewOnly}
                                        seqNo={(currentPage - 1) * 50 + idx + 1}
                                    />
                                ))
                            ) : loading ? (
                                <tr><td colSpan={12} className="py-20 text-center text-blue-500 font-bold animate-pulse">Fetching department records...</td></tr>
                            ) : (
                                <TaskTableEmpty colSpan={12} />
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 📱 Mobile Card View */}
                <div className="md:hidden p-2 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                   {!loading && displayTasks.length > 0 ? (
                      displayTasks.map((task, idx) => (
                         <DepartmentTaskCard
                            key={`card-${task.sourceSystem}-${task.id}`}
                            task={task}
                            onView={(t) => { setSelectedTask(t); setDrawerOpen(true); }}
                            isHistoryMode={filters.status === "Completed"}
                            seqNo={(currentPage - 1) * 50 + idx + 1}
                         />
                      ))
                   ) : loading ? (
                      <div className="py-10 text-center text-blue-500 font-bold">Loading mobile view...</div>
                   ) : (
                      <div className="py-10 text-center text-gray-400">No records found</div>
                   )}
                </div>

                {/* Pagination Controls */}
                {(totalCount > 50 || currentPage > 1) && (
                    <div className="bg-gray-50 border-t border-gray-200 p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
                                Total <span className="text-blue-600">{totalCount}</span> tasks
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onPageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs font-bold hover:bg-gray-100 disabled:opacity-50 shadow-sm"
                                >
                                    Previous
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, Math.ceil(totalCount / 50)) }, (_, i) => {
                                        const p = i + 1;
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => onPageChange(p)}
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${currentPage === p ? 'bg-blue-600 text-white shadow-lg lg:scale-110' : 'text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                    {Math.ceil(totalCount / 50) > 5 && <span className="px-2 text-gray-400 font-bold">...</span>}
                                </div>

                                <button
                                    onClick={() => onPageChange(currentPage + 1)}
                                    disabled={currentPage >= Math.ceil(totalCount / 50) || loading}
                                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs font-bold hover:bg-gray-100 disabled:opacity-50 shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <TaskDrawer
                task={selectedTask}
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onUpdate={onUpdateTask}
                userRole={userRole}
            />
        </div>
    );
}
