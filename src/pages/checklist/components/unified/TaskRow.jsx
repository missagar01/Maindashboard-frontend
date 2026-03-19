import { memo } from "react";
import { Eye, CheckCircle, X } from "lucide-react";
import { formatDateTime } from "../../utils/taskNormalizer";

const DOER2_OPTIONS = [
  "Sarad Behera",
  "Tikeshware Chakradhari(KH)",
  "Makhan Lal",
];

/**
 * TaskRow - Memoized row component for the unified task table
 * Matches the exact table structure from maintenance-data-page.jsx
 * IMPORTANT: Hides checkbox and action columns for completed/history tasks
 *
 * @param {object} task - Normalized task object
 * @param {boolean} isSelected - Whether row checkbox is selected
 * @param {function} onSelect - Checkbox change handler
 * @param {function} onView - View button click handler
 * @param {object} rowData - Additional row data (status, soundStatus, temperature, remarks)
 * @param {function} onRowDataChange - Handler for inline edits
 * @param {object} uploadedImage - Uploaded image for this row
 * @param {function} onImageUpload - Image upload handler
 * @param {boolean} isHistoryMode - True if viewing history/completed tasks (hides action columns)
 */
const TaskRow = memo(function TaskRow({
  task,
  isSelected,
  onSelect,
  onView,
  rowData = {},
  onRowDataChange,
  isHistoryMode = false, // New prop to detect history/completed mode
  isHousekeepingOnly = false, // New prop to detect if showing only housekeeping tasks
  isMaintenanceOnly = false,
  seqNo = 0, // Sequence number for housekeeping table
  userRole = "admin", // User role to show DOER2 select box for user role
  loggedInUser = "",
}) {
  // Determine if this is a completed task (from history)
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

  const rawStartDate =
    task.task_start_date ??
    task.taskStartDate ??
    task.dueDate ??
    task.originalData?.task_start_date ??
    task.originalData?.Task_Start_Date ??
    "";
  const formattedStartDate =
    rawStartDate && rawStartDate !== "—" ? formatDateTime(rawStartDate) : null;
  const startDateDisplay =
    formattedStartDate && formattedStartDate !== "—"
      ? formattedStartDate
      : task.dueDateFormatted || "—";

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

  // Get priority badge
  const getPriorityBadge = (priority) => {
    if (!priority)
      return (
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
          N/A
        </span>
      );

    switch (priority?.toLowerCase()) {
      case "high":
        return (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
            High
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
            Medium
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
            Low
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
            N/A
          </span>
        );
    }
  };

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

  // If housekeeping-only mode, render housekeeping-specific columns
  if (isHousekeepingOnly && task.sourceSystem === "housekeeping") {
    return (
      <tr
        className={`${isSelected ? "bg-blue-50" : isCompleted ? "bg-green-50/30" : ""
          } hover:bg-gray-50 border-b border-gray-100`}
      >
        {/* Checkbox - Admin: select confirmed tasks, User: select pending tasks */}
        <td className="px-2 sm:px-3 py-2 sm:py-4 w-12">
          {isCompleted ? (
            <CheckCircle className="h-4 w-4 text-green-500" title="Completed" />
          ) : (
            <input
              type="checkbox"
              className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${(task.sourceSystem === "housekeeping" &&
                (userRole?.toLowerCase() === "user"
                  ? (task.originalData?.attachment === "confirmed" ||
                    task.confirmedByHOD === "Confirmed" ||
                    task.confirmedByHOD === "confirmed") && !localStorage.getItem('page_access')?.includes('housekeeping-verify')
                  : task.originalData?.attachment !== "confirmed" &&
                  task.confirmedByHOD !== "Confirmed" &&
                  task.confirmedByHOD !== "confirmed"))
                ? "opacity-50 cursor-not-allowed"
                : ""
                }`}
              checked={isSelected}
              onChange={handleCheckboxClick}
              disabled={
                task.sourceSystem === "housekeeping" &&
                (userRole?.toLowerCase() === "user"
                  ? (task.originalData?.attachment === "confirmed" ||
                    task.confirmedByHOD === "Confirmed" ||
                    task.confirmedByHOD === "confirmed") && !localStorage.getItem('page_access')?.includes('housekeeping-verify')
                  : task.originalData?.attachment !== "confirmed" &&
                  task.confirmedByHOD !== "Confirmed" &&
                  task.confirmedByHOD !== "confirmed")
              }
            />
          )}
        </td>

        {/* Seq. No. */}
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          <div className="text-xs sm:text-sm font-medium text-gray-900">
            {seqNo}
          </div>
        </td>

        {/* Task ID */}
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          <div className="text-xs sm:text-sm font-medium text-gray-900">
            {task.id || "—"}
          </div>
        </td>

        {/* Department */}
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          <div className="text-xs sm:text-sm text-gray-900">
            {task.department || "—"}
          </div>
        </td>

        {/* Doer Name 2 */}
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          {userRole?.toLowerCase() === "user" && !isCompleted ? (
            <select
              value={rowData.doerName2 || task.assignedToSecondary || ""}
              onChange={(e) => handleDataChange("doerName2", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="">Select...</option>
              {DOER2_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs sm:text-sm text-gray-900">
              {task.assignedToSecondary || rowData.doerName2 || "—"}
            </div>
          )}
        </td>

        {/* Task Description */}
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          <div
            className="text-xs sm:text-sm text-gray-900"
            title={task.title}
          >
            {task.title || "—"}
          </div>
        </td>

        {/* Task Start Date */}
        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap">
          <div className="text-xs sm:text-sm text-gray-900">{startDateDisplay}</div>
        </td>

        {/* Freq */}
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          <div className="text-xs sm:text-sm text-gray-900">
            {task.frequency || "—"}
          </div>
        </td>

        {/* Submission Date - Only visible in History/Completed Mode */}
        {isHistoryMode && (
          <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap">
            <div className="text-xs sm:text-sm text-gray-900 font-medium">
              {formatTimestampToDDMMYYYYHHMMSS(task.submissionDate || task.submissionDateFormatted)}
            </div>
          </td>
        )}

        {/* Confirmed By HOD - Show data from backend only (no select box) */}
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          <div className="text-xs sm:text-sm text-gray-900">
            {task.originalData?.attachment === "confirmed" ||
              task.confirmedByHOD === "Confirmed" ||
              task.confirmedByHOD === "confirmed" ? (
              <span className="text-green-600 font-medium">Confirmed</span>
            ) : (
              task.confirmedByHOD || task.originalData?.attachment || "—"
            )}
          </div>
        </td>

        {/* Status cell */}
        {!isHousekeepingPendingEditable && (
          <td className="px-2 sm:px-3 py-2 sm:py-4">
            {isCompleted ? (
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                ✅ {task.originalStatus || "Yes"}
              </span>
            ) : (isAdminRole || localStorage.getItem('page_access')?.includes('housekeeping-verify')) ? (
              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                ✅ {rowData.status || "Yes"}
              </span>
            ) : (
              <span className="text-gray-500 text-xs">Waiting Confirm</span>
            )}
          </td>
        )}

        {/* Remarks - User role: input field for pending tasks, Admin: show data only */}
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          {userRole?.toLowerCase() === "user" &&
            task.sourceSystem === "housekeeping" &&
            !isCompleted &&
            task.originalData?.attachment !== "confirmed" &&
            task.confirmedByHOD !== "Confirmed" &&
            task.confirmedByHOD !== "confirmed" ? (
            <input
              type="text"
              placeholder="Enter remark"
              value={rowData.remarks || ""}
              onChange={(e) => handleDataChange("remarks", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          ) : (
            <span
              className="text-xs text-gray-700 max-w-[100px] truncate block"
              title={task.remarks || task.originalData?.remark || ""}
            >
              {task.remarks || task.originalData?.remark || "—"}
            </span>
          )}
        </td>
      </tr >
    );
  }

  // Default unified row for mixed tasks
  return (
    <tr
      className={`${isSelected ? "bg-blue-50" : isCompleted ? "bg-green-50/30" : ""
        } hover:bg-gray-50 border-b border-gray-100`}
    >
      {/* Checkbox - Admin: select confirmed tasks, User: select pending tasks */}
      <td className="px-2 sm:px-3 py-2 sm:py-4 w-12">
        {isCompleted ? (
          <CheckCircle className="h-4 w-4 text-green-500" title="Completed" />
        ) : (
          <input
            type="checkbox"
            className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${(task.sourceSystem === "housekeeping" &&
              (userRole?.toLowerCase() === "user"
                ? (task.originalData?.attachment === "confirmed" ||
                  task.confirmedByHOD === "Confirmed" ||
                  task.confirmedByHOD === "confirmed") && !localStorage.getItem('page_access')?.includes('housekeeping-verify')
                : task.originalData?.attachment !== "confirmed" &&
                task.confirmedByHOD !== "Confirmed" &&
                task.confirmedByHOD !== "confirmed")) ||
              (task.sourceSystem === "checklist" && userRole?.toLowerCase() !== "user") ||
              (isAdminRole && task.sourceSystem === "maintenance")
              ? "opacity-50 cursor-not-allowed"
              : ""
              }`}
            checked={isSelected}
            onChange={handleCheckboxClick}
            disabled={
              (task.sourceSystem === "housekeeping" &&
                (userRole?.toLowerCase() === "user"
                  ? (task.originalData?.attachment === "confirmed" ||
                    task.confirmedByHOD === "Confirmed" ||
                    task.confirmedByHOD === "confirmed") && !localStorage.getItem('page_access')?.includes('housekeeping-verify')
                  : task.originalData?.attachment !== "confirmed" &&
                  task.confirmedByHOD !== "Confirmed" &&
                  task.confirmedByHOD !== "confirmed")) ||
              (task.sourceSystem === "checklist" && userRole?.toLowerCase() !== "user") ||
              (isAdminRole && task.sourceSystem === "maintenance")
            }
          />
        )}
      </td>

      {/* Source System Badge */}
      <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap">
        {getSourceBadge(task.sourceSystem)}
      </td>

      {/* Task No / ID */}
      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <div className="text-xs sm:text-sm font-medium text-gray-900">
          {task.taskNo || task.id || "—"}
        </div>
      </td>

      {/* Machine / Context */}
      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <div className="text-xs sm:text-sm text-gray-900">
          {task.machineName !== "—" ? task.machineName : task.department}
          {task.serialNo && task.serialNo !== "—" && (
            <div className="text-xs text-gray-500">SN: {task.serialNo}</div>
          )}
        </div>
      </td>

      {/* Doer Name / Assigned To */}
      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <div className="text-xs sm:text-sm text-gray-900">
          {task.assignedTo}
        </div>
      </td>

      {/* Task Description */}
      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <div
          className="text-xs sm:text-sm text-gray-900"
          title={task.title}
        >
          {task.title}
        </div>
      </td>

      {/* Priority */}
      <td className="px-2 sm:px-3 py-2 sm:py-4">
        {getPriorityBadge(task.priority)}
      </td>

      {/* Due Date */}
      <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap">
        <div className="text-xs sm:text-sm text-gray-900">
          {task.dueDateFormatted}
        </div>
      </td>

      {/* Submission Date - Only visible in History/Completed Mode */}
      {isHistoryMode && (
        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap">
          <div className="text-xs sm:text-sm text-gray-900 font-medium">
            {formatTimestampToDDMMYYYYHHMMSS(task.submissionDate || task.submissionDateFormatted)}
          </div>
        </td>
      )}

      {/* Sound Status - Only for maintenance tab */}
      {isMaintenanceOnly && (
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          {isCompleted ? (
            <span className="text-xs text-gray-700">
              {task.soundStatus || "—"}
            </span>
          ) : (
            <select
              disabled={!isSelected}
              value={rowData.soundStatus || ""}
              onChange={(e) => handleDataChange("soundStatus", e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 w-full text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select</option>
              <option value="Good">Good</option>
              <option value="Bad">Bad</option>
              <option value="Need Repair">Need Repair</option>
              <option value="OK">OK</option>
            </select>
          )}
        </td>
      )}

      {/* Temperature - Only for maintenance tab */}
      {isMaintenanceOnly && (
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          {isCompleted ? (
            <span className="text-xs text-gray-700">
              {task.temperature || "—"}
            </span>
          ) : (
            <input
              type="text"
              placeholder="Temp"
              disabled={!isSelected}
              value={rowData.temperature || ""}
              onChange={(e) => handleDataChange("temperature", e.target.value)}
              className="border rounded-md px-2 py-1 w-20 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          )}
        </td>
      )}

      {/* Maintenance Status Column - Only for maintenance system */}
      {isMaintenanceOnly && task.sourceSystem === 'maintenance' && (
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          {isCompleted ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${(task.originalStatus?.toLowerCase() === 'yes' || task.status?.toLowerCase() === 'yes')
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}>
              {task.originalStatus || task.status || "Pending"}
            </span>
          ) : (
            <select
              disabled={!isSelected}
              value={rowData.status || ""}
              onChange={(e) => handleDataChange("status", e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 w-full text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Status</option>
              <option value="yes"> Yes / हाँ</option>
              <option value="no">NO / नहीं</option>
            </select>
          )}
        </td>
      )}

      {/* Status Column - For Checklist and Housekeeping systems */}
      {!isMaintenanceOnly && (
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          {isCompleted ? (
            <span className={`text-xs font-medium ${(task.originalData?.status?.toLowerCase() === 'yes' || task.originalStatus?.toLowerCase() === 'yes')
              ? 'text-green-600'
              : 'text-red-600'
              }`}>
              {task.originalData?.status || task.originalStatus || "Pending"}
            </span>
          ) : isUserRole ? (
            task.sourceSystem === 'housekeeping' ? (
              (isAdminRole || localStorage.getItem('page_access')?.includes('housekeeping-verify')) ? (
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                  ✅ {rowData.status || "Yes"}
                </span>
              ) : (
                <span className="text-gray-500 text-xs text-center block">Waiting Confirm</span>
              )
            ) : (
              <select
                disabled={!isSelected || task.userStatusChecklist === 'Yes' || task.userStatusChecklist === 'No'}
                value={rowData.status || ""}
                onChange={(e) => handleDataChange("status", e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 w-full text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Status / स्थिति चुनें</option>
                <option value="Yes">Yes / हाँ</option>
                <option value="No">No / नहीं</option>
              </select>
            )
          ) : (isAdminRole || localStorage.getItem('page_access')?.includes('housekeeping-verify')) && task.sourceSystem === 'housekeeping' ? (
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
              ✅ {rowData.status || "Yes"}
            </span>
          ) : (
            <span className={`text-xs font-medium ${(task.originalData?.status?.toLowerCase() === 'yes' || task.originalStatus?.toLowerCase() === 'yes')
              ? 'text-green-600'
              : 'text-red-600'
              }`}>
              {task.originalData?.status || task.originalStatus || "Pending"}
            </span>
          )}
        </td>
      )}

      {/* Admin Done column - Hidden for maintenance, visible for others */}
      {!isMaintenanceOnly && (
        <td className="px-2 sm:px-3 py-2 sm:py-4">
          <span className={`text-xs font-medium ${(() => {
            const val = (task.adminDone && task.adminDone !== "—" ? task.adminDone : task.originalData?.admin_done)?.toLowerCase();
            if (!val || val === "pending" || val === "—") return 'text-gray-500';
            if (['yes', 'confirmed', 'confirm'].includes(val)) return 'text-green-600';
            return 'text-red-600';
          })()
            }`}>
            {task.adminDone && task.adminDone !== "—"
              ? task.adminDone
              : task.originalData?.admin_done && task.originalData?.admin_done !== "—"
                ? task.originalData.admin_done
                : "Pending"}
          </span>
        </td>
      )}

      {/* Remarks - User role: input field for pending housekeeping/checklist tasks, Admin: show data only */}
      <td className="px-2 sm:px-3 py-2 sm:py-4">
        {(isHousekeepingPendingEditable || shouldShowChecklistRemarkInput) &&
          !isCompleted ? (
          <input
            type="text"
            placeholder="Enter remark"
            value={rowData.remarks || ""}
            onChange={(e) => handleDataChange("remarks", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        ) : (
          <span
            className="text-xs text-gray-700 max-w-[100px] truncate block"
            title={task.remarks || task.originalData?.remark || ""}
          >
            {task.remarks || task.originalData?.remark || "—"}
          </span>
        )}
      </td>

      {/* View Details Button */}
      <td className="px-2 sm:px-3 py-2 sm:py-4">
        <button
          onClick={handleViewClick}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
});

export const TaskCard = memo(function TaskCard({
  task,
  isSelected,
  onSelect,
  onView,
  rowData = {},
  onRowDataChange,
  isHistoryMode = false,
  isHousekeepingOnly = false,
  isMaintenanceOnly = false,
  seqNo = 0,
  userRole = "admin",
  loggedInUser = "",
  onImageClick,
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
    isUserRole &&
    task.sourceSystem === "housekeeping" &&
    !isCompleted &&
    (task.originalData?.attachment !== "confirmed" &&
      task.confirmedByHOD !== "Confirmed" &&
      task.confirmedByHOD !== "confirmed") ||
    localStorage.getItem('page_access')?.includes('housekeeping-verify');

  const shouldShowChecklistRemarkInput =
    isUserRole && task.sourceSystem === "checklist" && !isCompleted;

  const formatTimestampToDDMMYYYYHHMMSS = (timestamp) => {
    return formatDateTime(timestamp, true);
  };

  const rawStartDate =
    task.task_start_date ??
    task.taskStartDate ??
    task.dueDate ??
    task.originalData?.task_start_date ??
    task.originalData?.Task_Start_Date ??
    "";
  const formattedStartDate =
    rawStartDate && rawStartDate !== "—" ? formatDateTime(rawStartDate) : null;
  const startDateDisplay =
    formattedStartDate && formattedStartDate !== "—"
      ? formattedStartDate
      : task.dueDateFormatted || "—";

  const handleDataChange = (field, value) => {
    onRowDataChange?.(task.id, field, value);
  };

  const isSelectDisabled =
    (task.sourceSystem === "housekeeping" &&
      (isUserRole
        ? (task.originalData?.attachment === "confirmed" ||
          task.confirmedByHOD === "Confirmed" ||
          task.confirmedByHOD === "confirmed") && !localStorage.getItem('page_access')?.includes('housekeeping-verify')
        : task.originalData?.attachment !== "confirmed" &&
        task.confirmedByHOD !== "Confirmed" &&
        task.confirmedByHOD !== "confirmed")) ||
    (task.sourceSystem === "checklist" && !isUserRole) ||
    (isAdminRole && task.sourceSystem === "maintenance");

  return (
    <div
      className={`relative p-3 bg-white rounded-lg border shadow-sm transition-all active:scale-[0.99] ${isSelected ? "border-blue-400 ring-1 ring-blue-100" : "border-gray-100"
        } ${isCompleted ? "bg-green-50/10" : ""}`}
    >
      {/* Absolute Checkbox top-right */}
      {!isCompleted && (
        <div className="absolute top-3 right-3 z-10">
          <input
            type="checkbox"
            className={`h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isSelectDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
            checked={isSelected}
            onChange={(e) => onSelect?.(task.id, e.target.checked)}
            disabled={isSelectDisabled}
          />
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        {/* Checkbox / SNo */}
        <div className="flex flex-col items-center gap-1.5">
          {isCompleted ? (
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mb-0.5">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          ) : (
            <div className="w-5 h-5" /> /* Spacer for when checkbox moves to right */
          )}
          <span className="text-[10px] font-black text-gray-400">#{seqNo}</span>
        </div>

        {/* Header Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${task.sourceSystem === "checklist"
                ? "bg-purple-50 text-purple-700 border-purple-100"
                : task.sourceSystem === "maintenance"
                  ? "bg-blue-50 text-blue-700 border-blue-100"
                  : "bg-green-50 text-green-700 border-green-100"
                }`}
            >
              {task.sourceSystem}
            </span>
            {/* View icon hidden as requested */}
          </div>
          <h4 className="text-[14px] font-bold text-gray-800 leading-tight">
            {task.title}
          </h4>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Grid Meta Info */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {/* Machine / Dept */}
          <div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">
              {task.sourceSystem === "housekeeping" ? "Department" : "Machine/Dept"}
            </span>
            <div className="text-[11px] font-bold text-gray-700">
              {task.machineName !== "—" ? task.machineName : task.department}
              {task.serialNo && task.serialNo !== "—" && (
                <div className="text-xs text-gray-500">SN: {task.serialNo}</div>
              )}
            </div>
          </div>

          {/* Doer / Assigned */}
          <div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">
              {task.sourceSystem === "housekeeping" ? "Doer 2" : "Doer Name"}
            </span>
            {task.sourceSystem === "housekeeping" && isUserRole && !isCompleted ? (
              <select
                value={rowData.doerName2 || task.assignedToSecondary || ""}
                onChange={(e) => handleDataChange("doerName2", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 mt-0.5"
              >
                <option value="">Select...</option>
                {DOER2_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[11px] font-bold text-gray-700">
                {task.sourceSystem === "housekeeping"
                  ? task.assignedToSecondary || rowData.doerName2 || "—"
                  : task.assignedTo}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">
              {task.sourceSystem === "housekeeping" ? "Start Date" : "Due Date"}
            </span>
            <p className="text-[10px] font-mono font-medium text-gray-600">
              {task.sourceSystem === "housekeeping" ? startDateDisplay : task.dueDateFormatted}
            </p>
          </div>

          {/* Score / Frequency / HOD */}
          <div>
            {task.sourceSystem === "housekeeping" ? (
              <>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">
                  {isHistoryMode ? "Submission Date" : "Confirmed HOD"}
                </span>
                <p className={`text-[10px] font-bold ${!isHistoryMode && task.confirmedByHOD?.toLowerCase().includes("confirm") ? "text-green-600" : "text-gray-600"}`}>
                  {isHistoryMode
                    ? formatTimestampToDDMMYYYYHHMMSS(task.submissionDate || task.submissionDateFormatted)
                    : (task.confirmedByHOD || "—")}
                </p>
              </>
            ) : isHistoryMode ? (
              <>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Submission Date</span>
                <p className="text-[10px] font-bold text-gray-600 uppercase">
                  {formatTimestampToDDMMYYYYHHMMSS(task.submissionDate || task.submissionDateFormatted)}
                </p>
              </>
            ) : (
              <>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Frequency</span>
                <p className="text-[10px] font-bold text-gray-600 uppercase">{task.frequency || "—"}</p>
              </>
            )}
          </div>
        </div>

        {/* Maintenance Specific Fields */}
        {task.sourceSystem === "maintenance" && isMaintenanceOnly && (
          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-gray-50">
            <div>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Sound Status</span>
              {isCompleted ? (
                <p className="text-[11px] font-bold">{task.soundStatus || "—"}</p>
              ) : (
                <select
                  disabled={!isSelected}
                  value={rowData.soundStatus || ""}
                  onChange={(e) => handleDataChange("soundStatus", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs disabled:bg-gray-50 mt-0.5"
                >
                  <option value="">Select</option>
                  <option value="Good">Good</option>
                  <option value="Bad">Bad</option>
                  <option value="Need Repair">Need Repair</option>
                  <option value="OK">OK</option>
                </select>
              )}
            </div>
            <div>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Temp</span>
              {isCompleted ? (
                <p className="text-[11px] font-bold">{task.temperature || "—"}</p>
              ) : (
                <input
                  type="text"
                  placeholder="Temp"
                  disabled={!isSelected}
                  value={rowData.temperature || ""}
                  onChange={(e) => handleDataChange("temperature", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs disabled:bg-gray-50 mt-0.5"
                />
              )}
            </div>
          </div>
        )}

        {/* Status & Remarks Selection */}
        <div className="space-y-2 pt-1 border-t border-gray-50">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* Status Field */}
            <div className={`${isAdminRole && task.sourceSystem === "housekeeping" ? "w-full" : "flex-1 min-w-[120px]"}`}>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Status</span>
              {isCompleted ? (
                <p className={`text-[11px] font-bold uppercase ${(() => {
                  const val = (task.sourceSystem === 'maintenance'
                    ? (task.originalStatus || task.status)
                    : (task.originalData?.status || task.originalStatus || task.status))?.toLowerCase();
                  return (val === 'yes' || val === 'completed' || val === 'confirmed') ? "text-green-600" : "text-red-600";
                })()}`}>
                  {task.sourceSystem === 'maintenance'
                    ? (task.originalStatus || task.status || "Pending")
                    : (task.originalData?.status || task.originalStatus || (task.status === "Completed" ? "Yes" : task.status) || "Pending")
                  }
                </p>
              ) : isUserRole || (isAdminRole && task.sourceSystem === "maintenance") ? (
                task.sourceSystem === "housekeeping" ? (
                  (isAdminRole || localStorage.getItem('page_access')?.includes('housekeeping-verify')) ? (
                    <div className="mt-0.5">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-md border border-blue-100 uppercase inline-flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> {rowData.status || "Yes"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Waiting Confirm</p>
                  )
                ) : (
                  <select
                    disabled={!isSelected}
                    value={rowData.status || ""}
                    onChange={(e) => handleDataChange("status", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm font-bold disabled:bg-gray-50 focus:border-blue-400 mt-0.5 shadow-sm"
                  >
                    <option value="">Select Status</option>
                    <option value="Yes">Yes / हाँ</option>
                    <option value="No">No / नहीं</option>
                  </select>
                )
              ) : (isAdminRole || localStorage.getItem('page_access')?.includes('housekeeping-verify')) && task.sourceSystem === "housekeeping" ? (
                <div className="mt-0.5">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-md border border-blue-100 uppercase inline-flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {rowData.status || "Yes"}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">
                  {task.originalStatus || "Pending"}
                </p>
              )}
            </div>

            {/* Image Upload / Preview removed */}
            <div className="flex items-center gap-2">

              {/* Existing Image Preview */}
              {isCompleted && task.imageUrl && (
                <div className="flex-shrink-0">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight block">Photo</span>
                  <img
                    src={task.imageUrl}
                    alt="Task"
                    className="h-8 w-8 object-cover rounded-md mt-0.5 border border-gray-100 cursor-pointer shadow-xs"
                    onClick={() => onImageClick?.(task.imageUrl)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Remarks Input */}
          <div className="pt-0.5">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Remarks</span>
            {(isHousekeepingPendingEditable || shouldShowChecklistRemarkInput) && !isCompleted ? (
              <input
                type="text"
                placeholder="Enter remark here..."
                value={rowData.remarks || ""}
                onChange={(e) => handleDataChange("remarks", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 mt-0.5 shadow-sm"
                disabled={!isSelected}
              />
            ) : (
              <p className="text-[11px] text-gray-700 mt-0.5 break-words">
                {task.remarks || task.originalData?.remark || "—"}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
});

export default TaskRow;

/**
 * TaskTableHeader - Table header component matching maintenance page
 * Now conditionally hides checkbox column header for history mode
 */
export function TaskTableHeader({
  onSelectAll,
  isAllSelected,
  isIndeterminate,
  isHistoryMode = false,
  isHousekeepingOnly = false,
  isMaintenanceOnly = false,
  userRole = "admin", // User role to conditionally hide columns
}) {
  const normalizedRole = userRole?.toLowerCase();
  const isUserRole = normalizedRole === "user";
  const isAdminRole = normalizedRole === "admin";

  // If showing only housekeeping tasks, use housekeeping-specific headers
  if (isHousekeepingOnly) {
    return (
      <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
        <tr>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
            {isHistoryMode ? (
              <span>Status</span>
            ) : (
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={onSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            )}
          </th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Seq. No.
          </th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Task ID
          </th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Department
          </th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Doer Name 2
          </th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Task Description
          </th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Task Start Date
          </th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Freq
          </th>
          {isHistoryMode && (
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Submission Date
            </th>
          )}
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Confirmed By HOD
          </th>
          {/* Status - Show status header if not in history mode */}
          {!isHistoryMode && (
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          )}
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Remarks
          </th>
        </tr>
      </thead>
    );
  }

  // Default unified header for mixed tasks
  return (
    <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
      <tr>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
          {isHistoryMode ? (
            <span>Status</span>
          ) : (
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={onSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )}
        </th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Source
        </th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Task
        </th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Machine/Dept
        </th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Doer Name
        </th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Description
        </th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Priority
        </th>
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Due Date
        </th>
        {isHistoryMode && (
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Submission Date
          </th>
        )}
        {isMaintenanceOnly && (
          <>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sound Status
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Temperature
            </th>
          </>
        )}
        {(isMaintenanceOnly) && (
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            task_status
          </th>
        )}
        {!isMaintenanceOnly && (
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
        )}
        {!isMaintenanceOnly && (
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Admin Done
          </th>
        )}
        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Remarks
        </th>
      </tr>
    </thead>
  );
}

/**
 * TaskTableEmpty - Empty state component
 */
export function TaskTableEmpty({ hasFilters = false, colSpan = 14, isMobile = false }) {
  const content = (
    <div className="flex flex-col items-center">
      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <span className="text-2xl">📋</span>
      </div>
      <p className="text-gray-500 text-sm">
        {hasFilters ? "No tasks matching your filters" : "No tasks found"}
      </p>
      {hasFilters && (
        <p className="text-gray-400 text-xs mt-1">
          Try clicking "Clear All Filters" above
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="px-4 py-12 text-center">
        {content}
      </div>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        {content}
      </td>
    </tr>
  );
}
