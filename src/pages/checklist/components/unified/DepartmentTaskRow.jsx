import { memo } from "react";
import { Eye, CheckCircle } from "lucide-react";
import { formatDateTime } from "../../utils/taskNormalizer";

const DOER2_OPTIONS = [
  "Sarad Behera",
  "Tikeshware Chakradhari(KH)",
  "Makhan Lal",
];

// Get source badge
const getSourceBadge = (source) => {
  switch (source) {
    case "checklist":
      return (
        <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
          ✅ Checklist
        </span>
      );
    case "maintenance":
      return (
        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
          🔧 Maintenance
        </span>
      );
    case "housekeeping":
      return (
        <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
          🏠 Housekeeping
        </span>
      );
    default:
      return (
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
          {source}
        </span>
      );
  }
};

/**
 * DepartmentTaskRow - Specialized row for HOD/Manager view
 * Hides Priority column as requested.
 */
export const DepartmentTaskRow = memo(function DepartmentTaskRow({
  task,
  isSelected,
  onSelect,
  onView,
  rowData = {},
  onRowDataChange,
  isHistoryMode = false,
  seqNo = 0,
  userRole = "admin",
  loggedInUser = "",
  isViewOnly = false,
}) {
  const isCompleted =
    task.status === "Completed" ||
    task.originalStatus === "Yes" ||
    task.originalStatus === "Completed" ||
    isHistoryMode;

  const normalizedRole = userRole?.toLowerCase();
  const isUserRole = normalizedRole === "user";
  const isAdminRole = normalizedRole === "admin";

  const isHousekeepingPendingEditable =
    task.sourceSystem === "housekeeping" &&
    !isCompleted &&
    ((isUserRole &&
      task.originalData?.attachment !== "confirmed" &&
      task.confirmedByHOD !== "Confirmed" &&
      task.confirmedByHOD !== "confirmed") ||
      localStorage.getItem('page_access')?.includes('housekeeping-verify'));

  const shouldShowChecklistRemarkInput =
    isUserRole && task.sourceSystem === "checklist" && !isCompleted;

  const formatTimestampToDDMMYYYYHHMMSS = (timestamp) => {
    return formatDateTime(timestamp, true);
  };

  const formattedStartDate = task.taskStartDate ? formatDateTime(task.taskStartDate) : task.dueDateFormatted;

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect?.(task.id, e.target.checked);
  };

  const handleViewClick = (e) => {
    e.stopPropagation();
    onView?.(task);
  };

  const handleDataChange = (field, value) => {
    onRowDataChange?.(task.id, field, value);
  };

  return (
    <tr
      className={`${isSelected ? "bg-blue-50" : isCompleted ? "bg-green-50/30" : ""
        } hover:bg-gray-50 border-b border-gray-100`}
    >
      {!isViewOnly && (
        <td className="px-2 sm:px-3 py-2 sm:py-4 w-12 text-center">
          {isCompleted ? (
            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
          ) : (
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={isSelected}
              onChange={handleCheckboxClick}
            />
          )}
        </td>
      )}

      <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap">
        {getSourceBadge(task.sourceSystem)}
      </td>

      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <div className="text-xs sm:text-sm font-medium text-gray-900">
          {task.taskNo || task.id || "—"}
        </div>
      </td>

      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <div className="text-xs sm:text-sm text-gray-900">
          {task.machineName !== "—" ? task.machineName : task.department}
        </div>
      </td>

      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <div className="text-xs sm:text-sm text-gray-900">
          {task.assignedTo}
        </div>
      </td>

      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <div className="text-xs sm:text-sm text-gray-900 truncate max-w-[200px]" title={task.title}>
          {task.title}
        </div>
      </td>

      <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap">
        <div className="text-xs sm:text-sm text-gray-900">
          {task.dueDateFormatted || formattedStartDate}
        </div>
      </td>

      {isHistoryMode && (
        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap">
          <div className="text-xs sm:text-sm text-gray-900 font-medium">
            {formatTimestampToDDMMYYYYHHMMSS(task.submissionDate || task.submissionDateFormatted)}
          </div>
        </td>
      )}

      <td className="px-2 sm:px-3 py-2 sm:py-4">
        {isCompleted ? (
          <span className={`text-xs font-medium ${task.originalStatus?.toLowerCase() === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
            {task.originalStatus || "Yes"}
          </span>
        ) : (
          <span className="text-xs text-blue-600 font-medium">
            {rowData.status || "Pending"}
          </span>
        )}
      </td>

      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <span className="text-xs text-gray-700 truncate block max-w-[150px]" title={task.remarks || ""}>
          {task.remarks || "—"}
        </span>
      </td>

      <td className="px-2 sm:px-3 py-2 sm:py-4 text-center">
        <button onClick={handleViewClick} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
});

/**
 * DepartmentTaskTableHeader - Specialized header for department tasks
 */
export const DepartmentTaskTableHeader = memo(function DepartmentTaskTableHeader({
  onSelectAll,
  isAllSelected,
  isIndeterminate,
  isHistoryMode = false,
  isViewOnly = false,
}) {
  return (
    <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
      <tr>
        {!isViewOnly && (
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-center w-12">
            {!isHistoryMode && (
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                onChange={onSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            )}
          </th>
        )}
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine/Dept</th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doer Name</th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
        {isHistoryMode && <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>}
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-center">Action</th>
      </tr>
    </thead>
  );
});

/**
 * DepartmentTaskCard - Mobile Card version of the task row
 */
export const DepartmentTaskCard = memo(function DepartmentTaskCard({
  task,
  onView,
  isHistoryMode = false,
  seqNo = 0,
}) {
  const isCompleted =
    task.status === "Completed" ||
    task.originalStatus === "Yes" ||
    task.originalStatus === "Completed" ||
    isHistoryMode;

  const formattedStartDate = task.taskStartDate ? formatDateTime(task.taskStartDate) : task.dueDateFormatted;

  return (
    <div className={`p-2 bg-white rounded-lg border border-gray-100 shadow-xs space-y-1.5 relative active:scale-[0.98] transition-all ${isCompleted ? 'bg-green-50/5' : ''}`}>
       <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{seqNo}</span>
             {getSourceBadge(task.sourceSystem)}
          </div>
       </div>

       <div>
          <h4 className="text-xs font-bold text-gray-800 leading-tight">{task.title}</h4>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium italic">{task.taskNo || task.id || "—"}</p>
       </div>

       <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1.5 border-t border-gray-50">
          <div>
             <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tight block">Machine/Dept</span>
             <p className="text-[10px] font-bold text-gray-700 truncate">{task.machineName !== "—" ? task.machineName : task.department}</p>
          </div>
          <div>
             <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tight block">Doer</span>
             <p className="text-[10px] font-bold text-gray-700 truncate">{task.assignedTo}</p>
          </div>
          <div>
             <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tight block">Due Date</span>
             <p className="text-[9px] font-mono font-medium text-gray-500">{task.dueDateFormatted || formattedStartDate}</p>
          </div>
          <div>
             <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tight block">Status</span>
             <p className={`text-[9px] font-bold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                {isCompleted ? (task.originalStatus || "Yes") : "Pending"}
             </p>
          </div>
       </div>
    </div>
  );
});
