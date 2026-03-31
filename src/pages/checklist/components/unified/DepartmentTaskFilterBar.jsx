import { useMemo } from "react";
import { Search, History, Clock, ListFilter } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function DepartmentTaskFilterBar({
    filters = {},
    onFiltersChange,
    departmentOptions = [],
    assignedToOptions = [],
    userRole = "admin",
    systemCounts = { checklist: 0, maintenance: 0, housekeeping: 0 },
}) {
    const { searchTerm = "", sourceSystem = "", status = "Pending", department = "", assignedTo = "" } = filters;

    const handleChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        if (key === "sourceSystem") {
            newFilters.department = "";
            newFilters.assignedTo = "";
        }
        onFiltersChange(newFilters);
    };

    return (
        <div className="bg-white border border-gray-100 rounded-lg p-1.5 shadow-xs space-y-2">
            {/* Status Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-md">
                <button
                    onClick={() => handleChange("status", "Pending")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all text-sm ${status === "Pending" ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                    <Clock className="h-4 w-4" />
                    <span>Pending</span>
                </button>
                <button
                    onClick={() => handleChange("status", "Completed")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all text-sm ${status === "Completed" ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                    <History className="h-4 w-4" />
                    <span>Completed</span>
                </button>
            </div>

            {/* Source System Filter */}
            <div className="grid grid-cols-3 flex-wrap items-center gap-1">
                <button
                    onClick={() => handleChange("sourceSystem", "checklist")}
                    className={`px-1.5 py-1.5 rounded-md font-bold text-[10px] sm:text-xs transition-all ${sourceSystem === "checklist" ? "bg-purple-600 text-white shadow-sm" : "bg-purple-50 text-purple-700 hover:bg-purple-100"}`}
                >
                    Checklist ({systemCounts.checklist})
                </button>
                <button
                    onClick={() => handleChange("sourceSystem", "maintenance")}
                    className={`px-1.5 py-1.5 rounded-md font-bold text-[10px] sm:text-xs transition-all ${sourceSystem === "maintenance" ? "bg-blue-600 text-white shadow-sm" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                >
                    Maintenance ({systemCounts.maintenance})
                </button>
                <button
                    onClick={() => handleChange("sourceSystem", "housekeeping")}
                    className={`px-1.5 py-1.5 rounded-md font-bold text-[10px] sm:text-xs transition-all ${sourceSystem === "housekeeping" ? "bg-green-600 text-white shadow-sm" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                >
                    Housekeeping ({systemCounts.housekeeping})
                </button>
            </div>

            {/* Search & Select Filters */}
            <div className="flex flex-wrap items-end gap-4">
                <div className="hidden md:flex flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search by task name..."
                        value={searchTerm}
                        onChange={(e) => handleChange("searchTerm", e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                </div>

                {/* {departmentOptions.length > 0 && (
                    <div className="w-full sm:w-64">
                        <label className="text-xs font-medium text-gray-500 mb-1 block uppercase">Department</label>
                        <select
                            value={department}
                            onChange={(e) => handleChange("department", e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">All Departments</option>
                            {departmentOptions.map((dept, idx) => <option key={idx} value={dept}>{dept}</option>)}
                        </select>
                    </div>
                )}

                {assignedToOptions.length > 0 && (
                    <div className="w-full sm:w-64">
                        <label className="text-xs font-medium text-gray-500 mb-1 block uppercase">Assignee</label>
                        <select
                            value={assignedTo}
                            onChange={(e) => handleChange("assignedTo", e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">All Assignees</option>
                            {assignedToOptions.map((name, idx) => <option key={idx} value={name}>{name}</option>)}
                        </select>
                    </div>
                )} */}
            </div>
        </div>
    );
}
