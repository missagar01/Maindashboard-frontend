import { useState, useMemo } from "react";
import { Search, X, History, Clock, ListFilter, Plus, Upload, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { addNewChecklistTaskApi } from "@/api/checklist/AddNewTaskApi.js";

export default function TaskFilterBar({
    filters = {},
    onFiltersChange,
    housekeepingDepartments = [],
    departmentOptions = [],
    assignedToOptions = [],
    userRole = "admin",
    systemCounts = { checklist: 0, maintenance: 0, housekeeping: 0 },
    onTaskAdded, // Callback when a task is successfully added
}) {
    const { userData } = useAuth();
    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newTaskDescription, setNewTaskDescription] = useState("");

    const {
        searchTerm = "",
        sourceSystem = "",
        status = "",  // Default to empty to show all
        department = "",
        assignedTo = "",
    } = filters;

    const handleChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        // Clear department and assignedTo filter when switching sourceSystem
        if (key === "sourceSystem") {
            newFilters.department = "";
            newFilters.assignedTo = "";
        }
        onFiltersChange(newFilters);
    };

    const clearFilters = () => {
        onFiltersChange({
            searchTerm: "",
            sourceSystem: "",
            status: "",  // Reset to empty (show all)
            priority: "",
            assignedTo: "",
            department: "",
            startDate: "",
            endDate: "",
        });
    };

    const hasActiveFilters = useMemo(() => {
        return searchTerm || sourceSystem || status;
    }, [searchTerm, sourceSystem, status]);

    // Get user role from props or localStorage (fallback)
    const currentUserRole = useMemo(() => {
        return userRole || localStorage.getItem("role") || "admin";
    }, [userRole]);

    // Filter departments based on user role and user_access1
    const filteredDepartments = useMemo(() => {
        if (currentUserRole?.toLowerCase() !== 'user') {
            // Admin role: show all departments
            return housekeepingDepartments;
        }

        // User role: filter by user_access1
        const userAccess1 = localStorage.getItem("user_access1") || localStorage.getItem("userAccess1") || "";
        if (!userAccess1) {
            return [];
        }

        // Parse comma-separated departments
        const userDepartments = userAccess1.split(',').map(dept => dept.trim()).filter(dept => dept);

        // Filter housekeepingDepartments to only include user's accessible departments
        return housekeepingDepartments.filter(dept =>
            userDepartments.some(userDept =>
                dept.toLowerCase().includes(userDept.toLowerCase()) ||
                userDept.toLowerCase().includes(dept.toLowerCase())
            )
        );
    }, [housekeepingDepartments, currentUserRole]);

    return (
        <>
            <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3 md:p-4 shadow-sm space-y-3 sm:space-y-4">

                {/* MAIN TOGGLE: All vs Pending vs History */}
                <div className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-gray-100 rounded-lg">
                    {/* <button
                        onClick={() => handleChange("status", "")}
                        className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm ${!status
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        <ListFilter className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">📊 All Tasks</span>
                        <span className="xs:hidden">All</span>
                    </button> */}
                    <button
                        onClick={() => handleChange("status", "Pending")}
                        className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm ${status === "Pending"
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">Pending</span>
                        <span className="xs:hidden">Pending</span>
                    </button>
                    <button
                        onClick={() => handleChange("status", "Completed")}
                        className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm ${status === "Completed"
                            ? "bg-green-600 text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        <History className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">Completed</span>
                        <span className="xs:hidden">Completed</span>
                    </button>
                </div>

                {/* Simple Search Box */}
                {/* <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                <input
                    type="text"
                    placeholder="🔍 Search by task name or ID..."
                    value={searchTerm}
                    onChange={(e) => handleChange("searchTerm", e.target.value)}
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                />
            </div> */}

                {/* Task Type Filter - Big colorful buttons */}
                <div>
                    {/* <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">📋 Show Tasks From:</p> */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {/* <button
                        onClick={() => handleChange("sourceSystem", "")}
                        className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${sourceSystem === ""
                            ? "bg-blue-600 text-white ring-2 ring-blue-300"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        {/* <span className="hidden sm:inline">📊 All Tasks</span>
                        <span className="sm:hidden">All</span>
                    </button> */}
                        <button
                            onClick={() => handleChange("sourceSystem", sourceSystem === "checklist" ? "" : "checklist")}
                            className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${sourceSystem === "checklist"
                                ? "bg-purple-600 text-white ring-2 ring-purple-300"
                                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                }`}
                        >
                            <span className="hidden sm:inline">
                                Checklist {currentUserRole?.toLowerCase() === 'user' ? `(${systemCounts.checklist})` : ''}
                            </span>
                            <span className="sm:hidden">
                                CL {currentUserRole?.toLowerCase() === 'user' ? `(${systemCounts.checklist})` : ''}
                            </span>
                        </button>
                        <button
                            onClick={() => handleChange("sourceSystem", sourceSystem === "maintenance" ? "" : "maintenance")}
                            className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${sourceSystem === "maintenance"
                                ? "bg-blue-600 text-white ring-2 ring-blue-300"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                        >
                            <span className="hidden sm:inline">
                                Maintenance {currentUserRole?.toLowerCase() === 'user' ? `(${systemCounts.maintenance})` : ''}
                            </span>
                            <span className="sm:hidden">
                                Maint {currentUserRole?.toLowerCase() === 'user' ? `(${systemCounts.maintenance})` : ''}
                            </span>
                        </button>
                        <button
                            onClick={() => handleChange("sourceSystem", sourceSystem === "housekeeping" ? "" : "housekeeping")}
                            className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${sourceSystem === "housekeeping"
                                ? "bg-green-600 text-white ring-2 ring-green-300"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                        >
                            <span className="hidden sm:inline">
                                Housekeeping {currentUserRole?.toLowerCase() === 'user' ? `(${systemCounts.housekeeping})` : ''}
                            </span>
                            <span className="sm:hidden">
                                HK {currentUserRole?.toLowerCase() === 'user' ? `(${systemCounts.housekeeping})` : ''}
                            </span>
                        </button>

                        {/* ADD TASK BUTTON - Only with popup form */}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
                        >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Add Task</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                    </div>
                </div>

                {/* Filters Row: Department & Doer Name - FOR CHECKLIST & MAINTENANCE */}
                {(sourceSystem === "checklist" || sourceSystem === "maintenance" || sourceSystem === "housekeeping") && (departmentOptions.length > 0 || assignedToOptions.length > 0) && (
                    <div className="flex flex-wrap items-end gap-3 sm:gap-4">
                        {/* Department Filter - Unified
                        Hide for User role in Checklist, Maintenance, and Housekeeping
                    */}
                        {departmentOptions.length > 0 && (currentUserRole?.toLowerCase() !== 'user' || (sourceSystem !== 'checklist' && sourceSystem !== 'maintenance' && sourceSystem !== 'housekeeping')) && (
                            <div className="w-full sm:w-64">
                                <label htmlFor="department-filter" className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">
                                    📁 Department:
                                </label>
                                <select
                                    id="department-filter"
                                    value={department}
                                    onChange={(e) => handleChange("department", e.target.value)}
                                    className="w-full text-xs sm:text-sm border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                    <option value="">All Departments</option>
                                    {departmentOptions.map((dept, idx) => (
                                        <option key={idx} value={dept}>
                                            {dept}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Doer Name (Assigned To) Filter
                        Hide for User role in Checklist and Maintenance
                    */}
                        {assignedToOptions.length > 0 && (currentUserRole?.toLowerCase() !== 'user' || (sourceSystem !== 'checklist' && sourceSystem !== 'maintenance')) && (
                            <div className="w-full sm:w-64">
                                <label htmlFor="assigned-filter" className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">
                                    👤 Doer Name:
                                </label>
                                <select
                                    id="assigned-filter"
                                    value={assignedTo}
                                    onChange={(e) => handleChange("assignedTo", e.target.value)}
                                    className="w-full text-xs sm:text-sm border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                    <option value="">All Doers</option>
                                    {assignedToOptions.map((name, idx) => (
                                        <option key={idx} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Clear Button - Only show when filters are active */}
                {/* {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-xs sm:text-sm"
                >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Clear All Filters</span>
                    <span className="sm:hidden">Clear Filters</span>
                </button>
            )} */}
            </div>

            {/* Add Task Modal */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-lg font-semibold text-gray-900">Add New Task</h3>
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Task Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Task Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={newTaskDescription}
                                        onChange={(e) => setNewTaskDescription(e.target.value)}
                                        placeholder="Enter task details..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-y"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!newTaskDescription.trim()) {
                                            alert("Please enter a task description");
                                            return;
                                        }

                                        setIsSubmitting(true);
                                        try {
                                            // Get user info: prefer userData from context, fallback to localStorage
                                            const department = userData?.user_access || localStorage.getItem("user_access") || localStorage.getItem("userAccess") || "";
                                            const division = userData?.division || localStorage.getItem("division") || "";
                                            const userName = userData?.user_name || userData?.username || localStorage.getItem("user-name") || "";

                                            const payload = {
                                                task_description: newTaskDescription,
                                                department,
                                                division,
                                                given_by: userName,
                                                name: userName,
                                                // Background metadata columns
                                                user_id: userData?.id || userData?.user_id || localStorage.getItem("user_id") || "",
                                                role: userData?.role || localStorage.getItem("role") || "",
                                                email_id: userData?.email_id || userData?.email || localStorage.getItem("email_id") || "",
                                                designation: userData?.designation || userData?.user_designation || localStorage.getItem("designation") || "",
                                                department_id: userData?.department_id || userData?.dept_id || localStorage.getItem("department_id") || "",
                                                verify_access: userData?.verify_access || localStorage.getItem("verify_access") || "",
                                                verify_access_dept: userData?.verify_access_dept || localStorage.getItem("verify_access_dept") || "",
                                                // Default Nulls/Empty
                                                remark: "",
                                                image: null,
                                                admin_done: null,
                                                delay: null,
                                                user_status_checklist: null
                                            };

                                            const response = await addNewChecklistTaskApi(payload);

                                            if (response.error) {
                                                alert(response.error);
                                            } else {
                                                // Success
                                                setIsAddModalOpen(false);
                                                setNewTaskDescription("");
                                                if (onTaskAdded) {
                                                    onTaskAdded();
                                                }
                                            }
                                        } catch (error) {
                                            console.error("Error adding task:", error);
                                            alert("Failed to add task. Please try again.");
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        "Add Task"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
