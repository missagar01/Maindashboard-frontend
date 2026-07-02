"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  ChevronDown,
  Filter,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  X,
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import DelegationPage from "./delegation-data";
import { useAuth } from "../context/AuthContext";

const normalizeFrequencyValue = (value) => {
  if (!value) return "";
  const normalized = String(value).trim();
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const normalizeYesNoValue = (value) => {
  if (!value) return "";
  const normalized = String(value).trim();
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const isCurrentDayDateValue = (dateValue) => {
  if (!dateValue) return false;
  let taskDate = new Date(dateValue);
  
  if (Number.isNaN(taskDate.getTime()) && typeof dateValue === 'string') {
    const parts = dateValue.split(' ');
    if (parts.length >= 1) {
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        taskDate = new Date(year, month, day);
      }
    }
  }

  if (Number.isNaN(taskDate.getTime())) return false;
  const today = new Date();
  return (
    taskDate.getFullYear() === today.getFullYear() &&
    taskDate.getMonth() === today.getMonth() &&
    taskDate.getDate() === today.getDate()
  );
};

const getActionButtonClasses = (variant, isEnabled) => {
  if (!isEnabled) {
    return "flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed";
  }

  if (variant === "edit") {
    return "flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-all shadow-sm border border-sky-500";
  }

  return "flex items-center justify-center w-8 h-8 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm border border-red-500";
};

const getCurrentDayRange = () => {
  const currentDay = format(new Date(), "yyyy-MM-dd");
  return {
    startDate: currentDay,
    endDate: currentDay,
  };
};

const getDisplayValue = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return value;
};

const getFrequencyBadgeClasses = (frequency) => {
  if (frequency === "Daily") {
    return "bg-blue-50 text-blue-600 border border-blue-100";
  }

  if (frequency === "Weekly") {
    return "bg-green-50 text-green-600 border border-green-100";
  }

  if (frequency === "Monthly") {
    return "bg-red-50 text-red-600 border border-red-100";
  }

  return "bg-gray-50 text-gray-600 border border-gray-100";
};

const getYesNoTextClasses = (
  value,
  positiveClassName = "text-green-600",
  negativeClassName = "text-gray-400"
) => {
  return String(value || "").toLowerCase() === "yes"
    ? positiveClassName
    : negativeClassName;
};

const MobileTaskField = ({ label, value, valueClassName = "text-gray-700" }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
      {label}
    </p>
    <p className={`mt-1 text-xs font-medium break-words ${valueClassName}`}>
      {getDisplayValue(value)}
    </p>
  </div>
);

export default function QuickTask() {
  const [tasks, setTasks] = useState([]);
  const [delegationLoading, setDelegationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [activeTab, setActiveTab] = useState("checklist");
  const [nameFilter, setNameFilter] = useState("");
  const [freqFilter, setFreqFilter] = useState("");
  const tableContainerRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState({
    name: false,
    frequency: false,
  });
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingTaskKey, setDeletingTaskKey] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskType, setEditingTaskType] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [originalTaskData, setOriginalTaskData] = useState(null);

  const {
    quickTaskState,
    fetchQuickTaskUsers,
    fetchQuickTaskDepartments,
    resetQuickTaskChecklistPagination,
    resetQuickTaskDelegationPagination,
    resetQuickTaskMaintenancePagination,
    resetQuickTaskHousekeepingPagination,
    fetchUniqueChecklistTaskData,
    fetchUniqueDelegationTaskData,
    fetchUniqueMaintenanceTaskData,
    fetchUniqueHousekeepingTaskData,
    updateQuickTaskChecklistTask,
    updateQuickTaskDelegationTask,
    updateQuickTaskMaintenanceTask,
    updateQuickTaskHousekeepingTask,
    deleteQuickTaskChecklistTask,
    deleteQuickTaskMaintenanceTask,
    deleteQuickTaskHousekeepingTask,
    userData
  } = useAuth();

  const {
    quickTask,
    loading,
    delegationTasks,
    maintenanceTasks,
    housekeepingTasks,
    users,
    departments,
    checklistPage,
    checklistHasMore,
    delegationPage,
    delegationHasMore,
    maintenancePage,
    maintenanceHasMore,
    housekeepingPage,
    housekeepingHasMore,
  } = quickTaskState;

  const allNames = useMemo(() => {
    if (!users) return [];
    return [...new Set([
      ...(users.checklistNames || []),
      ...(users.delegationNames || []),
      ...(users.maintenanceDoers || []),
      ...quickTask.map((task) => typeof task?.name === "string" ? task.name.trim() : ""),
      ...delegationTasks.map((task) => typeof task?.name === "string" ? task.name.trim() : ""),
      ...maintenanceTasks.map((task) => typeof task?.name === "string" ? task.name.trim() : ""),
      ...housekeepingTasks.map((task) => typeof task?.name === "string" ? task.name.trim() : "")
    ])]
      .filter((name) => name && typeof name === "string" && name.trim() !== "")
      .sort((a, b) => a.localeCompare(b));
  }, [users, quickTask, delegationTasks, maintenanceTasks, housekeepingTasks]);

  const activeTabFilterOptions = useMemo(() => {
    console.log("QuickTask render - users state:", JSON.stringify(users));
    if (!users) return [];
    if (activeTab === "checklist") {
      return [...new Set([
        ...(users.checklistNames || []),
        ...quickTask.map((t) => typeof t?.name === "string" ? t.name.trim() : "")
      ])]
        .filter((n) => n && n.trim())
        .sort((a, b) => a.localeCompare(b));
    }
    if (activeTab === "delegation") {
      return [...new Set([
        ...(users.delegationNames || []),
        ...delegationTasks.map((t) => typeof t?.name === "string" ? t.name.trim() : "")
      ])]
        .filter((n) => n && n.trim())
        .sort((a, b) => a.localeCompare(b));
    }
    if (activeTab === "maintenance") {
      return [...new Set([
        ...(users.maintenanceDoers || []),
        ...maintenanceTasks.map((t) => typeof t?.name === "string" ? t.name.trim() : "")
      ])]
        .filter((n) => n && n.trim())
        .sort((a, b) => a.localeCompare(b));
    }
    if (activeTab === "housekeeping") {
      return [...new Set([
        ...(users.housekeepingDepartments || []),
        ...housekeepingTasks.map((t) => typeof t?.department === "string" ? t.department.trim() : "")
      ])]
        .filter((n) => n && n.trim())
        .sort((a, b) => a.localeCompare(b));
    }
    return [];
  }, [activeTab, users, quickTask, delegationTasks, maintenanceTasks, housekeepingTasks]);

  const appliedNameFilter = nameFilter ? (activeTabFilterOptions.find(
    (name) => name.toLowerCase() === nameFilter.trim().toLowerCase()
  ) || nameFilter.trim()) : "";

  const uniqueDepartments = useMemo(() => {
    return [...new Set([
      ...departments.map((d) => typeof d?.department === "string" ? d.department.trim() : ""),
      ...quickTask.map((t) => typeof t?.department === "string" ? t.department.trim() : ""),
      ...delegationTasks.map((t) => typeof t?.department === "string" ? t.department.trim() : ""),
      ...maintenanceTasks.map((t) => typeof t?.department === "string" ? t.department.trim() : ""),
      ...housekeepingTasks.map((t) => typeof t?.department === "string" ? t.department.trim() : "")
    ])]
      .filter((dept) => dept && typeof dept === "string" && dept.trim() !== "")
      .sort((a, b) => a.localeCompare(b));
  }, [departments, quickTask, delegationTasks, maintenanceTasks, housekeepingTasks]);

  const matchedDepartments = useMemo(() => {
    if (!searchTerm) return [];
    const query = searchTerm.toLowerCase().trim();
    return uniqueDepartments.filter((d) => d.toLowerCase().includes(query));
  }, [searchTerm, uniqueDepartments]);

  const matchedDoers = useMemo(() => {
    if (!searchTerm) return [];
    const query = searchTerm.toLowerCase().trim();
    return allNames.filter((d) => d.toLowerCase().includes(query));
  }, [searchTerm, allNames]);

  const getFetchParams = useCallback(
    (taskType, overrides = {}) => {
      const params = { ...overrides };
      const activeFilter = overrides.nameFilter !== undefined ? overrides.nameFilter : nameFilter;

      if (
        !activeFilter &&
        (taskType === "checklist" ||
          taskType === "maintenance" ||
          taskType === "housekeeping")
      ) {
        return {
          ...params,
          ...getCurrentDayRange(),
        };
      }

      return params;
    },
    [nameFilter]
  );

  useEffect(() => {
    let isActive = true;

    const initializeQuickTask = async () => {
      setError(null);
      resetQuickTaskChecklistPagination();

      await fetchQuickTaskUsers();
      await fetchQuickTaskDepartments();
    };

    initializeQuickTask();

    return () => {
      isActive = false;
    };
  }, [fetchQuickTaskUsers, fetchQuickTaskDepartments, resetQuickTaskChecklistPagination]);

  // Infinite scroll - load more data when user scrolls to bottom
  const handleScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (!isNearBottom) return;

    if (activeTab === "checklist" && checklistHasMore) {
      fetchUniqueChecklistTaskData(getFetchParams("checklist", {
        page: checklistPage,
        pageSize: 100,
        nameFilter: appliedNameFilter,
        append: true,
      }));
    } else if (activeTab === "delegation" && delegationHasMore) {
      fetchUniqueDelegationTaskData({
        page: delegationPage,
        pageSize: 100,
        nameFilter: appliedNameFilter,
        append: true,
      });
    } else if (activeTab === "maintenance" && maintenanceHasMore) {
      fetchUniqueMaintenanceTaskData(getFetchParams("maintenance", {
        page: maintenancePage,
        pageSize: 100,
        nameFilter: appliedNameFilter,
        append: true,
      }));
    } else if (activeTab === "housekeeping" && housekeepingHasMore) {
      fetchUniqueHousekeepingTaskData(getFetchParams("housekeeping", {
        page: housekeepingPage,
        pageSize: 100,
        nameFilter: appliedNameFilter,
        append: true,
      }));
    }
  }, [
    loading,
    activeTab,
    checklistHasMore,
    checklistPage,
    delegationHasMore,
    delegationPage,
    maintenanceHasMore,
    maintenancePage,
    housekeepingHasMore,
    housekeepingPage,
    appliedNameFilter,
    getFetchParams,
  ]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Edit functionality - Open modal with pre-filled data
  const refreshTabData = async (taskType) => {
    if (taskType === "checklist") {
      resetQuickTaskChecklistPagination();
      await fetchUniqueChecklistTaskData(getFetchParams("checklist", {
        page: 0,
        pageSize: 100,
        nameFilter: appliedNameFilter,
        append: false,
      }));
      return;
    }

    if (taskType === "delegation") {
      resetQuickTaskDelegationPagination();
      await fetchUniqueDelegationTaskData({
        page: 0,
        pageSize: 100,
        nameFilter: appliedNameFilter,
        append: false,
      });
      return;
    }

    if (taskType === "maintenance") {
      resetQuickTaskMaintenancePagination();
      await fetchUniqueMaintenanceTaskData(getFetchParams("maintenance", {
        page: 0,
        pageSize: 100,
        nameFilter: appliedNameFilter,
        append: false,
      }));
      return;
    }

    resetQuickTaskHousekeepingPagination();
    await fetchUniqueHousekeepingTaskData(getFetchParams("housekeeping", {
      page: 0,
      pageSize: 100,
      nameFilter: appliedNameFilter,
      append: false,
    }));
  };

  const handleEditClick = (task, taskType = activeTab) => {

    setEditingTaskId(task.task_id);
    setEditingTaskType(taskType);
    setOriginalTaskData(task);
    setError(null);
    setSuccessMessage("");
    setIsSaving(false);

    // Pre-fill form with existing task data - preserve all original fields first
    setEditFormData({
      ...task,
      task_id: task.task_id,
      department: task.department || "",
      given_by: task.given_by || "",
      name: task.name || "",
      task_description: task.task_description || "",
      task_start_date: task.task_start_date
        ? new Date(task.task_start_date).toISOString().slice(0, 16)
        : "",
      // Normalize frequency to match select options (Daily, Weekly, Monthly, Yearly)
      frequency: normalizeFrequencyValue(task.frequency),
      // Normalize enable_reminder to match select options (Yes, No)
      enable_reminder: normalizeYesNoValue(task.enable_reminder),
      // Normalize require_attachment to match select options (Yes, No)
      require_attachment: normalizeYesNoValue(task.require_attachment),
      remark: task.remark || "",
      machine_name: task.machine_name || "",
      serial_no: task.serial_no || "",
      task_type: task.task_type || "",
      priority: task.priority || "",
      status: normalizeYesNoValue(task.status),
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskType(null);
    setOriginalTaskData(null);
    setEditFormData({});
    setError(null);
    setSuccessMessage("");
    setIsSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.task_id) {
      setError("Task ID is missing. Cannot update task.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage("");
    const currentTaskType = editingTaskType || activeTab;

    try {
      // Prepare the updated task data
      const updatedTaskData = {
        ...editFormData,
        // Include division from user data as it might be required for correct row matching
        division: userData?.division || localStorage.getItem("division") || "",
        // Convert datetime-local format to ISO string if task_start_date exists
        task_start_date: editFormData.task_start_date
          ? new Date(editFormData.task_start_date).toISOString()
          : editFormData.task_start_date,
      };

      // Create a matching object for bulk update by name and description
      if (currentTaskType === "checklist") {
        const matchCriteria = {
          name: originalTaskData?.name,
          task_description: originalTaskData?.task_description,
          division:
            originalTaskData?.division ||
            userData?.division ||
            localStorage.getItem("division") ||
            "",
        };

        await updateQuickTaskChecklistTask(updatedTaskData, matchCriteria);
      } else if (currentTaskType === "delegation") {
        await updateQuickTaskDelegationTask(updatedTaskData);
      } else if (currentTaskType === "maintenance") {
        await updateQuickTaskMaintenanceTask(updatedTaskData);
      } else if (currentTaskType === "housekeeping") {
        await updateQuickTaskHousekeepingTask(updatedTaskData);
      }

      await refreshTabData(currentTaskType);
      setSuccessMessage("Task updated successfully!");
      setIsSaving(false);

      setTimeout(() => {
        handleCancelEdit();
      }, 1200);

    } catch (error) {
      console.error("Failed to update task:", error);
      const errorMessage =
        error?.message ||
        error?.error ||
        (typeof error === "string" ? error : null) ||
        "Failed to update task. Please try again.";
      setError(errorMessage);
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Change your checkbox to store whole row instead of only id
  const handleCheckboxChange = (task) => {
    if (selectedTasks.find((t) => t.task_id === task.task_id)) {
      setSelectedTasks(selectedTasks.filter((t) => t.task_id !== task.task_id));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  // Select all
  const handleSelectAll = () => {
    const selectableTasks = filteredChecklistTasks;
    const isAllSelected = selectableTasks.length > 0 &&
      selectableTasks.every(task => selectedTasks.some(t => t.task_id === task.task_id));

    if (isAllSelected) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(selectableTasks);
    }
  };

  // Delete
  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return;

    setIsDeleting(true);
    try {
      // Map to identifying objects – matching by name and description for bulk delete
      const tasksToDelete = selectedTasks.map(task => ({
        name: task.name,
        task_description: task.task_description,
        division: task.division || userData?.division || localStorage.getItem("division") || ""
      }));

      console.log("Deleting rows by name and description:", tasksToDelete);
      await deleteQuickTaskChecklistTask(tasksToDelete);
      setSelectedTasks([]);
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      setError(
        error?.message ||
        error?.error ||
        (typeof error === "string" ? error : null) ||
        "Failed to delete tasks"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteTask = async (task, taskType = activeTab) => {

    const taskLabel = task?.task_description || `task #${task?.task_id || ""}`;
    const shouldDelete = window.confirm(
      `Delete this ${taskType} task?\n\n${taskLabel}`
    );

    if (!shouldDelete) {
      return;
    }

    const currentDeletingKey = `${taskType}:${task.task_id}`;
    setDeletingTaskKey(currentDeletingKey);
    setError(null);

    try {
      if (taskType === "checklist") {
        await deleteQuickTaskChecklistTask([
          {
            name: task.name,
            task_description: task.task_description,
            division: task.division || userData?.division || localStorage.getItem("division") || "",
          },
        ]);
      } else if (taskType === "maintenance") {
        await deleteQuickTaskMaintenanceTask([task.task_id]);
      } else if (taskType === "housekeeping") {
        await deleteQuickTaskHousekeepingTask([task.task_id]);
      }

      if (editingTaskId === task.task_id && editingTaskType === taskType) {
        handleCancelEdit();
      }

      await refreshTabData(taskType);
    } catch (deleteError) {
      console.error(`Failed to delete ${taskType} task:`, deleteError);
      const errorMessage =
        deleteError?.message ||
        deleteError?.error ||
        (typeof deleteError === "string" ? deleteError : null) ||
        `Failed to delete ${taskType} task.`;
      setError(errorMessage);
    } finally {
      setDeletingTaskKey(null);
    }
  };



  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? dateValue
        : format(date, "dd/MM/yyyy HH:mm");
    } catch {
      return dateValue;
    }
  };

  const requestSort = (key) => {
    if (loading) return;
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const toggleDropdown = (dropdown) => {
    setDropdownOpen((prev) => ({
      ...prev,
      [dropdown]: !prev[dropdown],
    }));
  };

  const handleNameFilterSelect = (name) => {
    setNameFilter(name);

    if (activeTab === "checklist") {
      resetQuickTaskChecklistPagination();
      fetchUniqueChecklistTaskData(getFetchParams("checklist", {
        page: 0,
        pageSize: 100,
        nameFilter: name,
        append: false,
      }));
    } else if (activeTab === "maintenance") {
      resetQuickTaskMaintenancePagination();
      fetchUniqueMaintenanceTaskData(getFetchParams("maintenance", {
        page: 0,
        pageSize: 100,
        nameFilter: name,
        append: false,
      }));
    } else if (activeTab === "housekeeping") {
      resetQuickTaskHousekeepingPagination();
      fetchUniqueHousekeepingTaskData(getFetchParams("housekeeping", {
        page: 0,
        pageSize: 100,
        nameFilter: name,
        append: false,
      }));
    } else {
      resetQuickTaskDelegationPagination();
      fetchUniqueDelegationTaskData({
        page: 0,
        pageSize: 100,
        nameFilter: name,
        append: false,
      });
    }

    setDropdownOpen((previous) => ({ ...previous, name: false }));
  };

  const handleFrequencyFilterSelect = (freq) => {
    setFreqFilter(freq);
    setDropdownOpen({ ...dropdownOpen, frequency: false });
  };

  const clearNameFilter = () => {
    setNameFilter("");

    resetQuickTaskChecklistPagination();
    resetQuickTaskMaintenancePagination();
    resetQuickTaskHousekeepingPagination();
    resetQuickTaskDelegationPagination();

    setDropdownOpen((previous) => ({ ...previous, name: false }));
  };

  const clearFrequencyFilter = () => {
    setFreqFilter("");
    setDropdownOpen({ ...dropdownOpen, frequency: false });
  };

  // FIXED: Moved allNames definition to top to correctly calculate appliedNameFilter

  // Keep allFrequencies as is (or modify if you want to fetch frequencies from elsewhere)
  const allFrequencies = [
    ...new Set([
      ...quickTask.map((task) => task.frequency),
      ...delegationTasks.map((task) => task.frequency),
      ...maintenanceTasks.map((task) => task.frequency),
      ...housekeepingTasks.map((task) => task.frequency),
    ]),
  ].filter(
    (frequency) =>
      frequency && typeof frequency === "string" && frequency.trim() !== ""
  );

  const filteredChecklistTasks = quickTask
    .filter((task) => {
      if (!task) return false;

      const currentDayPass = !appliedNameFilter ? isCurrentDayDateValue(task.task_start_date) : true;
      if (!currentDayPass) return false;

      const nameFilterPass =
        !appliedNameFilter ||
        (task.name &&
          task.name.trim().toLowerCase() ===
          appliedNameFilter.trim().toLowerCase());

      const freqFilterPass =
        !freqFilter ||
        (task.frequency &&
          task.frequency.toLowerCase() === freqFilter.toLowerCase());

      // Enhanced search - search in multiple fields
      const searchTermPass =
        !searchTerm ||
        (task.task_description &&
          task.task_description
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (task.department &&
          task.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.name &&
          task.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.given_by &&
          task.given_by.toLowerCase().includes(searchTerm.toLowerCase()));

      const deptFilterPass =
        !selectedDepartment ||
        (task.department &&
          task.department.trim().toLowerCase() === selectedDepartment.trim().toLowerCase());

      return nameFilterPass && freqFilterPass && searchTermPass && deptFilterPass;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

  const selectableChecklistTasks = filteredChecklistTasks;

  const filteredMaintenanceTasks = maintenanceTasks
    .filter((task) => {
      if (!task) return false;

      const nameFilterPass =
        !appliedNameFilter ||
        (task.name &&
          task.name.trim().toLowerCase() ===
          appliedNameFilter.trim().toLowerCase());

      const freqFilterPass =
        !freqFilter ||
        (task.frequency &&
          task.frequency.toLowerCase() === freqFilter.toLowerCase());

      const query = searchTerm.toLowerCase();
      const searchTermPass =
        !searchTerm ||
        (task.task_description &&
          task.task_description.toLowerCase().includes(query)) ||
        (task.department &&
          task.department.toLowerCase().includes(query)) ||
        (task.name &&
          task.name.toLowerCase().includes(query)) ||
        (task.given_by &&
          task.given_by.toLowerCase().includes(query)) ||
        (task.machine_name &&
          task.machine_name.toLowerCase().includes(query)) ||
        (task.serial_no &&
          String(task.serial_no).toLowerCase().includes(query)) ||
        (task.task_type &&
          task.task_type.toLowerCase().includes(query)) ||
        (task.priority &&
          task.priority.toLowerCase().includes(query));

      const deptFilterPass =
        !selectedDepartment ||
        (task.department &&
          task.department.trim().toLowerCase() === selectedDepartment.trim().toLowerCase());

      return nameFilterPass && freqFilterPass && searchTermPass && deptFilterPass;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

  const filteredHousekeepingTasks = housekeepingTasks
    .filter((task) => {
      if (!task) return false;

      const nameFilterPass =
        !appliedNameFilter ||
        (task.department &&
          task.department.trim().toLowerCase() ===
          appliedNameFilter.trim().toLowerCase());

      const freqFilterPass =
        !freqFilter ||
        (task.frequency &&
          task.frequency.toLowerCase() === freqFilter.toLowerCase());

      const query = searchTerm.toLowerCase();
      const searchTermPass =
        !searchTerm ||
        (task.task_description &&
          task.task_description.toLowerCase().includes(query)) ||
        (task.department &&
          task.department.toLowerCase().includes(query)) ||
        (task.name &&
          task.name.toLowerCase().includes(query)) ||
        (task.given_by &&
          task.given_by.toLowerCase().includes(query)) ||
        (task.remark &&
          task.remark.toLowerCase().includes(query)) ||
        (task.hod &&
          String(task.hod).toLowerCase().includes(query)) ||
        (task.doer_name2 &&
          String(task.doer_name2).toLowerCase().includes(query)) ||
        (task.status &&
          String(task.status).toLowerCase().includes(query));

      const deptFilterPass =
        !selectedDepartment ||
        (task.department &&
          task.department.trim().toLowerCase() === selectedDepartment.trim().toLowerCase());

      return nameFilterPass && freqFilterPass && searchTermPass && deptFilterPass;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

  const isChecklistEdit = editingTaskType === "checklist";
  const isDelegationEdit = editingTaskType === "delegation";
  const isMaintenanceEdit = editingTaskType === "maintenance";
  const isHousekeepingEdit = editingTaskType === "housekeeping";
  const showReminderFields = isChecklistEdit || isDelegationEdit;
  const showRemarkField = isChecklistEdit || isHousekeepingEdit;
  const editModalTitle = isDelegationEdit
    ? "Edit Delegation Task"
    : isMaintenanceEdit
      ? "Edit Maintenance Task"
      : isHousekeepingEdit
        ? "Edit Housekeeping Task"
        : "Edit Task";

  function formatTimestampToDDMMYYYY(timestamp) {
    if (!timestamp || timestamp === "" || timestamp === null) {
      return "—"; // or just return ""
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return "—"; // fallback if it's not a valid date
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  const renderChecklistMobileCard = (task, index) => (
    <div
      key={`${task.task_id}-${index}`}
      className="border-b border-gray-100 p-4 last:border-b-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 break-words">
            {getDisplayValue(task.department)}
          </p>
          <p className="mt-1 text-xs font-bold text-red-600 break-words">
            {getDisplayValue(task.name)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="checkbox"
            checked={selectedTasks.some((selectedTask) => selectedTask.task_id === task.task_id)}
            onChange={() => handleCheckboxChange(task)}
            disabled={deletingTaskKey === `checklist:${task.task_id}`}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 transition-all"
          />
          <button
            onClick={() => handleEditClick(task)}
            disabled={deletingTaskKey === `checklist:${task.task_id}`}
            className={getActionButtonClasses("edit", deletingTaskKey !== `checklist:${task.task_id}`)}
            title="Edit Task"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => handleDeleteTask(task, "checklist")}
            disabled={deletingTaskKey === `checklist:${task.task_id}`}
            className={getActionButtonClasses(
              "delete",
              deletingTaskKey !== `checklist:${task.task_id}`
            )}
            title="Delete Task"
          >
            {deletingTaskKey === `checklist:${task.task_id}` ? (
              <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500 break-words">
        {getDisplayValue(task.task_description)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getFrequencyBadgeClasses(task.frequency)}`}
        >
          {getDisplayValue(task.frequency)}
        </span>
        <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
          Start: {formatTimestampToDDMMYYYY(task.task_start_date)}
        </span>
        <span className="rounded-md bg-yellow-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          End: {formatTimestampToDDMMYYYY(task.submission_date)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MobileTaskField label="Given By" value={task.given_by} />
        <MobileTaskField
          label="Reminders"
          value={task.enable_reminder}
          valueClassName={getYesNoTextClasses(task.enable_reminder)}
        />
        <MobileTaskField
          label="Attachment"
          value={task.require_attachment}
          valueClassName={getYesNoTextClasses(task.require_attachment, "text-blue-600")}
        />
        <MobileTaskField label="Task ID" value={task.task_id ? `#${task.task_id}` : "—"} />
      </div>
    </div>
  );

  const renderHousekeepingMobileCard = (task, index) => (
    <div
      key={`${task.task_id}-${index}`}
      className="border-b border-gray-100 p-4 last:border-b-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 break-words">
            {getDisplayValue(task.department)}
          </p>
          <p className="mt-1 text-xs font-bold text-red-600 break-words">
            {getDisplayValue(task.name)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleEditClick(task, "housekeeping")}
            disabled={deletingTaskKey === `housekeeping:${task.task_id}`}
            className={getActionButtonClasses(
              "edit",
              deletingTaskKey !== `housekeeping:${task.task_id}`
            )}
            title="Edit Task"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => handleDeleteTask(task, "housekeeping")}
            disabled={deletingTaskKey === `housekeeping:${task.task_id}`}
            className={getActionButtonClasses(
              "delete",
              deletingTaskKey !== `housekeeping:${task.task_id}`
            )}
            title="Delete Task"
          >
            {deletingTaskKey === `housekeeping:${task.task_id}` ? (
              <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500 break-words">
        {getDisplayValue(task.task_description)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getFrequencyBadgeClasses(task.frequency)}`}
        >
          {getDisplayValue(task.frequency)}
        </span>
        <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
          {formatTimestampToDDMMYYYY(task.task_start_date)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MobileTaskField label="Given By" value={task.given_by} />
        <MobileTaskField
          label="Status"
          value={task.status}
          valueClassName={
            String(task.status || "").toLowerCase() === "yes"
              ? "text-green-600"
              : String(task.status || "").toLowerCase() === "no"
                ? "text-amber-600"
                : "text-gray-500"
          }
        />
        <MobileTaskField label="Remark" value={task.remark} />
        <MobileTaskField
          label="Verification"
          value={task.attachment}
          valueClassName={
            String(task.attachment || "").toLowerCase() === "confirmed"
              ? "text-green-600"
              : "text-gray-400"
          }
        />
      </div>
    </div>
  );

  const renderMaintenanceMobileCard = (task, index) => (
    <div
      key={`${task.task_id}-${index}`}
      className="border-b border-gray-100 p-4 last:border-b-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 break-words">
            {getDisplayValue(task.department)}
          </p>
          <p className="mt-1 text-xs font-bold text-red-600 break-words">
            {getDisplayValue(task.machine_name)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleEditClick(task, "maintenance")}
            disabled={deletingTaskKey === `maintenance:${task.task_id}`}
            className={getActionButtonClasses(
              "edit",
              deletingTaskKey !== `maintenance:${task.task_id}`
            )}
            title="Edit Task"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => handleDeleteTask(task, "maintenance")}
            disabled={deletingTaskKey === `maintenance:${task.task_id}`}
            className={getActionButtonClasses(
              "delete",
              deletingTaskKey !== `maintenance:${task.task_id}`
            )}
            title="Delete Task"
          >
            {deletingTaskKey === `maintenance:${task.task_id}` ? (
              <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500 break-words">
        {getDisplayValue(task.task_description)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getFrequencyBadgeClasses(task.frequency)}`}
        >
          {getDisplayValue(task.frequency)}
        </span>
        <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
          {formatTimestampToDDMMYYYY(task.task_start_date)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MobileTaskField label="Doer Name" value={task.name} />
        <MobileTaskField label="Given By" value={task.given_by} />
        <MobileTaskField label="Serial No" value={task.serial_no} />
        <MobileTaskField label="Task Type" value={task.task_type} />
        <MobileTaskField label="Priority" value={task.priority} />
        <MobileTaskField label="Machine" value={task.machine_name} />
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md pb-4 pt-2 border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-red-600">
              Quick Task
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5">
              {activeTab === "checklist"
                ? `Managing ${filteredChecklistTasks.length} checklist items`
                : activeTab === "delegation"
                  ? "Managing delegation tasks"
                  : activeTab === "housekeeping"
                    ? `Managing ${filteredHousekeepingTasks.length} housekeeping items`
                    : `Managing ${filteredMaintenanceTasks.length} maintenance items`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center">
          {/* View Toggle Tabs */}
          <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-gray-200/50 bg-gray-100/50 p-1 sm:flex sm:w-auto">
            <button
              className={`min-w-0 px-3 py-2 text-[11px] font-bold rounded-lg transition-all sm:flex-1 sm:px-4 sm:py-1.5 sm:text-xs ${activeTab === "checklist"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
              onClick={() => {
                setSelectedTasks([]);
                handleCancelEdit();
                setActiveTab("checklist");
                resetQuickTaskChecklistPagination();
                if (appliedNameFilter) {
                  fetchUniqueChecklistTaskData(getFetchParams("checklist", {
                    page: 0,
                    pageSize: 50,
                    nameFilter: appliedNameFilter,
                  }));
                }
              }}
            >
              Checklist
            </button>
            <button
              className={`min-w-0 px-3 py-2 text-[11px] font-bold rounded-lg transition-all sm:flex-1 sm:px-4 sm:py-1.5 sm:text-xs ${activeTab === "delegation"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
              onClick={() => {
                setSelectedTasks([]);
                handleCancelEdit();
                setActiveTab("delegation");
                resetQuickTaskDelegationPagination();
                if (appliedNameFilter) {
                  fetchUniqueDelegationTaskData({
                    page: 0,
                    pageSize: 100,
                    nameFilter: appliedNameFilter,
                  });
                }
              }}
            >
              Delegation
            </button>
            <button
              className={`min-w-0 px-3 py-2 text-[11px] font-bold rounded-lg transition-all sm:flex-1 sm:px-4 sm:py-1.5 sm:text-xs ${activeTab === "maintenance"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
              onClick={() => {
                setSelectedTasks([]);
                handleCancelEdit();
                setActiveTab("maintenance");
                resetQuickTaskMaintenancePagination();
                if (appliedNameFilter) {
                  fetchUniqueMaintenanceTaskData(getFetchParams("maintenance", {
                    page: 0,
                    pageSize: 100,
                    nameFilter: appliedNameFilter,
                  }));
                }
              }}
            >
              Maintenance
            </button>
            <button
              className={`min-w-0 px-3 py-2 text-[11px] font-bold rounded-lg transition-all sm:flex-1 sm:px-4 sm:py-1.5 sm:text-xs ${activeTab === "housekeeping"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
              onClick={() => {
                setSelectedTasks([]);
                handleCancelEdit();
                setActiveTab("housekeeping");
                resetQuickTaskHousekeepingPagination();
                if (appliedNameFilter) {
                  fetchUniqueHousekeepingTaskData(getFetchParams("housekeeping", {
                    page: 0,
                    pageSize: 100,
                    nameFilter: appliedNameFilter,
                  }));
                }
              }}
            >
              Housekeeping
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 sm:min-w-[280px]">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search tasks, departments..."
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  if (val === "") {
                    setSelectedDepartment("");
                  }
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600 transition-all bg-white"
                disabled={loading}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedDepartment("");
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              )}

              {showSearchDropdown && searchTerm && (
                <>
                  <div className="fixed inset-0 z-[40]" onClick={() => setShowSearchDropdown(false)} />
                  <div className="absolute z-[50] mt-2 w-full rounded-xl bg-white shadow-2xl border border-gray-100 max-h-60 overflow-auto top-full left-0 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {matchedDepartments.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Departments / विभाग
                        </div>
                        {matchedDepartments.map((dept) => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              setSearchTerm(dept);
                              setSelectedDepartment(dept);
                              setShowSearchDropdown(false);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {dept}
                          </button>
                        ))}
                      </div>
                    )}

                    {matchedDoers.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Doers / कर्ता
                        </div>
                        {matchedDoers.map((doer) => (
                          <button
                            key={doer}
                            type="button"
                            onClick={() => {
                              setNameFilter(doer);
                              handleNameFilterSelect(doer);
                              setSearchTerm("");
                              setShowSearchDropdown(false);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {doer}
                          </button>
                        ))}
                      </div>
                    )}

                    {matchedDepartments.length === 0 && matchedDoers.length === 0 && (
                      <div className="px-3 py-4 text-center text-gray-400 text-[10px] italic">
                        No matching departments or doers found
                      </div>
                    )}

                  </div>
                </>
              )}
            </div>

            {/* Filters Group */}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <div className="relative w-full">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={14}
                    />
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder={activeTab === "housekeeping" ? "Department filter..." : "Name filter..."}
                      value={nameFilter}
                      onChange={(e) => {
                        const typedName = e.target.value;
                        setNameFilter(typedName);

                        if (typedName === "") {
                          clearNameFilter();
                        } else {
                          const exactName = activeTabFilterOptions.find(
                            (name) =>
                              name.toLowerCase() === typedName.trim().toLowerCase()
                          );

                          if (exactName) {
                            handleNameFilterSelect(exactName);
                          }
                        }
                      }}
                      onFocus={() => setDropdownOpen(prev => ({ ...prev, name: true }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const exactName = activeTabFilterOptions.find(
                            (name) =>
                              name.toLowerCase() === nameFilter.trim().toLowerCase()
                          );

                          if (nameFilter === "") {
                            clearNameFilter();
                          } else if (exactName) {
                            handleNameFilterSelect(exactName);
                          } else {
                            handleNameFilterSelect(nameFilter.trim());
                          }
                        }
                      }}
                      className={`w-full sm:w-44 pl-9 pr-8 py-2 border rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-red-100 ${appliedNameFilter ? 'border-red-200 bg-red-50/30 text-red-600' : 'border-gray-200 bg-white text-gray-600'}`}
                    />

                    {nameFilter && (
                      <button
                        onClick={() => {
                          setNameFilter("");
                          clearNameFilter();
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {dropdownOpen.name && (
                  <>
                    <div className="fixed inset-0 z-[40]" onClick={() => toggleDropdown("name")} />
                    <div className="absolute z-[50] mt-2 w-full sm:w-64 rounded-xl bg-white shadow-2xl border border-gray-100 max-h-60 overflow-auto top-full right-0 p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={clearNameFilter}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold mb-1 transition-all ${!appliedNameFilter ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        {activeTab === "housekeeping" ? "All Departments" : "All Staff Members"}
                      </button>
                      {activeTabFilterOptions
                        .filter(name =>
                          !nameFilter ||
                          name.toLowerCase().includes(nameFilter.trim().toLowerCase())
                        )
                        .map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              handleNameFilterSelect(name);
                              setDropdownOpen({ ...dropdownOpen, name: false });
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${appliedNameFilter === name ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"}`}
                          >
                            {name}
                            {appliedNameFilter === name && <div className="w-1.5 h-1.5 rounded-full bg-red-600" />}
                          </button>
                        ))}
                      {activeTabFilterOptions.filter(name =>
                        name.toLowerCase().includes(nameFilter.trim().toLowerCase())
                      ).length === 0 && (
                          <div className="px-3 py-4 text-center text-gray-400 text-[10px] italic">
                            {activeTab === "housekeeping" ? "No departments found" : "No members found"}
                          </div>
                        )}
                    </div>
                  </>
                )}
              </div>

              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => toggleDropdown("frequency")}
                  className={`flex items-center justify-between gap-2 w-full sm:w-auto px-4 py-2 border rounded-xl text-xs font-bold transition-all shadow-sm ${freqFilter ? 'border-red-200 bg-red-50/30 text-red-600' : 'border-gray-200 bg-white text-gray-600 hover:border-red-600/30'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter size={14} className="shrink-0 opacity-60" />
                    <span className="truncate">{freqFilter || "Frequency"}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`transition-transform shrink-0 opacity-40 ${dropdownOpen.frequency ? "rotate-180" : ""}`}
                  />
                </button>
                {dropdownOpen.frequency && (
                  <>
                    <div className="fixed inset-0 z-[40]" onClick={() => toggleDropdown("frequency")} />
                    <div className="absolute z-[50] mt-2 w-full sm:w-64 rounded-xl bg-white shadow-2xl border border-gray-100 max-h-60 overflow-auto top-full right-0 p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={clearFrequencyFilter}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold mb-1 transition-all ${!freqFilter ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        All Frequencies
                      </button>
                      {allFrequencies.map((freq) => (
                        <button
                          key={freq}
                          onClick={() => handleFrequencyFilterSelect(freq)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${freqFilter === freq ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                          {freq}
                          {freqFilter === freq && <div className="w-1.5 h-1.5 rounded-full bg-red-600" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {selectedTasks.length > 0 && activeTab === "checklist" && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-md text-xs font-bold"
              >
                <Trash2 size={14} />
                {isDeleting
                  ? "Deleting..."
                  : `Delete ${selectedTasks.length} selected`}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 p-4 rounded-md text-red-800 text-center">
          {error}{" "}
          <button
            onClick={() => {
              if (activeTab === "checklist") {
                fetchUniqueChecklistTaskData(getFetchParams("checklist", {
                  page: 0,
                  pageSize: 100,
                  nameFilter: appliedNameFilter,
                }));
              } else if (activeTab === "housekeeping") {
                fetchUniqueHousekeepingTaskData(getFetchParams("housekeeping", {
                  page: 0,
                  pageSize: 100,
                  nameFilter: appliedNameFilter,
                }));
              } else if (activeTab === "maintenance") {
                fetchUniqueMaintenanceTaskData(getFetchParams("maintenance", {
                  page: 0,
                  pageSize: 100,
                  nameFilter: appliedNameFilter,
                }));
              } else {
                fetchUniqueDelegationTaskData({
                  page: 0,
                  pageSize: 100,
                  nameFilter: appliedNameFilter,
                });
              }
            }}
            className="underline ml-2 hover:text-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {loading && appliedNameFilter && activeTab === "delegation" && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
          <p className="text-purple-600">Loading delegation data...</p>
        </div>
      )}

      {loading && appliedNameFilter && activeTab === "maintenance" && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
          <p className="text-purple-600">Loading maintenance data...</p>
        </div>
      )}

      {loading && appliedNameFilter && activeTab === "housekeeping" && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
          <p className="text-purple-600">Loading housekeeping data...</p>
        </div>
      )}

      {!error && (
        <>
          {!appliedNameFilter ? (
            <div className="mt-8 text-center py-16 px-4 bg-white rounded-xl border border-gray-100 shadow-sm max-w-md mx-auto">
              <Filter size={32} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-gray-700 font-bold text-sm mb-1">नाम सिलेक्ट करें (Select a Name)</h3>
              <p className="text-gray-400 text-xs">
                कृपया कार्य देखने और लोड करने के लिए ऊपर नाम फ़िल्टर में एक नाम चुनें।
                <br />
                (Please select a name in the filter dropdown to display tasks.)
              </p>
            </div>
          ) : activeTab === "checklist" ? (
            <div className="mt-6 rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
              <div className="bg-gray-50/50 border-b border-gray-100 p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-gray-700 font-bold text-sm flex items-center gap-2">
                    <div className="w-1 h-4 bg-red-600 rounded-full" />
                    Checklist Tasks
                  </h2>
                  <p className="text-gray-500 text-[10px] sm:text-xs">
                    Showing all unique items from your checklist
                  </p>
                </div>
                {selectedTasks.length > 0 && (
                  <span className="text-[10px] sm:text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                    {selectedTasks.length} selected
                  </span>
                )}
              </div>
              {/* <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}> */}
              <div
                ref={tableContainerRef}
                className="overflow-x-auto overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 220px)" }}
              >
                <div className="divide-y divide-gray-100 md:hidden">
                  {filteredChecklistTasks.length > 0 ? (
                    filteredChecklistTasks.map(renderChecklistMobileCard)
                  ) : (
                    <div className="px-6 py-12 text-center text-gray-400 text-xs font-bold italic">
                      <div className="flex flex-col items-center gap-2">
                        <Filter size={24} className="opacity-20" />
                        <span>
                          {searchTerm || freqFilter
                            ? "No tasks matching your search filters"
                            : appliedNameFilter
                              ? "No tasks found for this doer"
                              : "No checklist tasks found"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Actions
                      </th>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            selectableChecklistTasks.length > 0 &&
                            selectableChecklistTasks.every(task =>
                              selectedTasks.some(t => t.task_id === task.task_id)
                            )
                          }
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 transition-all"
                        />
                      </th>
                      {[
                        { key: "department", label: "Department" },
                        { key: "given_by", label: "Given By" },
                        { key: "name", label: "Name" },
                        {
                          key: "task_description",
                          label: "Task Description",
                          minWidth: "min-w-[300px]",
                        },
                        {
                          key: "task_start_date",
                          label: "Start Date",
                          bg: "bg-yellow-50",
                        },
                        {
                          key: "submission_date",
                          label: "End Date",
                          bg: "bg-yellow-50",
                        },
                        { key: "frequency", label: "Frequency" },
                        { key: "enable_reminder", label: "Reminders" },
                        { key: "require_attachment", label: "Attachment" },
                      ].map((column) => (
                        <th
                          key={column.label}
                          className={`px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest transition-colors ${column.bg ? "bg-red-50/30" : ""
                            } ${column.minWidth || ""} ${column.key && column.key !== "actions"
                              ? "cursor-pointer hover:bg-gray-100/50 hover:text-red-600"
                              : ""
                            }`}
                          onClick={() =>
                            column.key &&
                            column.key !== "actions" &&
                            requestSort(column.key)
                          }
                        >
                          <div className="flex items-center gap-1">
                            {column.label}
                            {sortConfig.key === column.key && (
                              <span className="text-red-600 font-bold">
                                {sortConfig.direction === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredChecklistTasks.length > 0 ? (
                      filteredChecklistTasks.map((task, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={isSaving}
                                  className="flex items-center justify-center w-8 h-8 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-100"
                                  title="Save"
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex items-center justify-center w-8 h-8 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-all shadow-sm border border-gray-100"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditClick(task)}
                                  disabled={deletingTaskKey === `checklist:${task.task_id}`}
                                  className={getActionButtonClasses("edit", deletingTaskKey !== `checklist:${task.task_id}`)}
                                  title="Edit Task"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task, "checklist")}
                                  disabled={deletingTaskKey === `checklist:${task.task_id}`}
                                  className={getActionButtonClasses("delete", deletingTaskKey !== `checklist:${task.task_id}`)}
                                  title="Delete Task"
                                >
                                  {deletingTaskKey === `checklist:${task.task_id}` ? (
                                    <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedTasks.some(t => t.task_id === task.task_id)}
                              onChange={() => handleCheckboxChange(task)}
                              disabled={deletingTaskKey === `checklist:${task.task_id}`}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 transition-all"
                            />
                          </td>
                          {/* Department */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.department}
                                onChange={(e) =>
                                  handleInputChange(
                                    "department",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              task.department
                            )}
                          </td>

                          {/* Given By */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.given_by}
                                onChange={(e) =>
                                  handleInputChange("given_by", e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                              />
                            ) : (
                              task.given_by
                            )}
                          </td>

                          {/* Name */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.name || ""}
                                onChange={(e) =>
                                  handleInputChange("name", e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none bg-white"
                              >
                                <option value="">Select Doer Name</option>
                                {allNames.map((nameOption, idx) => (
                                  <option key={idx} value={nameOption}>
                                    {nameOption}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              task.name
                            )}
                          </td>

                          {/* Task Description */}
                          <td className="px-6 py-4 text-xs text-gray-500 min-w-[300px] max-w-[400px]">
                            {editingTaskId === task.task_id ? (
                              <textarea
                                value={editFormData.task_description}
                                onChange={(e) =>
                                  handleInputChange(
                                    "task_description",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                                rows="3"
                              />
                            ) : (
                              <div className="whitespace-normal break-words leading-relaxed">
                                {task.task_description}
                              </div>
                            )}
                          </td>

                          {/* Task Start Date */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600 bg-red-50/10">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="datetime-local"
                                value={
                                  editFormData.task_start_date
                                    ? new Date(editFormData.task_start_date)
                                      .toISOString()
                                      .slice(0, 16)
                                    : ""
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    "task_start_date",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                              />
                            ) : (
                              formatTimestampToDDMMYYYY(task.task_start_date)
                            )}
                          </td>

                          {/* Submission Date (End Date) */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600 bg-red-50/10">
                            {formatTimestampToDDMMYYYY(task.submission_date)}
                          </td>

                          {/* Frequency */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.frequency}
                                onChange={(e) =>
                                  handleInputChange("frequency", e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                              >
                                <option value="">Select Frequency</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Yearly">Yearly</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${task.frequency === "Daily"
                                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                                  : task.frequency === "Weekly"
                                    ? "bg-green-50 text-green-600 border border-green-100"
                                    : task.frequency === "Monthly"
                                      ? "bg-red-50 text-red-600 border border-red-100"
                                      : "bg-gray-50 text-gray-600 border border-gray-100"
                                  }`}
                              >
                                {task.frequency}
                              </span>
                            )}
                          </td>

                          {/* Enable Reminders */}
                          <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.enable_reminder}
                                onChange={(e) =>
                                  handleInputChange(
                                    "enable_reminder",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                              >
                                <option value="">Select</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : (
                              <span className={task.enable_reminder === "Yes" ? "text-green-600" : "text-gray-400"}>
                                {task.enable_reminder || "—"}
                              </span>
                            )}
                          </td>

                          {/* Require Attachment */}
                          <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.require_attachment}
                                onChange={(e) =>
                                  handleInputChange(
                                    "require_attachment",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                              >
                                <option value="">Select</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : (
                              <span className={task.require_attachment === "Yes" ? "text-blue-600" : "text-gray-400"}>
                                {task.require_attachment || "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-6 py-12 text-center text-gray-400 text-xs font-bold italic"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Filter size={24} className="opacity-20" />
                            <span>
                              {searchTerm || freqFilter
                                ? "No tasks matching your search filters"
                                : appliedNameFilter
                                  ? "No tasks found for this doer"
                                  : "No checklist tasks found"
                              }
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
                {loading && checklistHasMore && (
                  <div className="flex flex-col items-center justify-center py-8 bg-gray-50/30">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600/20 border-t-red-600" />
                    <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest mt-3 animate-pulse">
                      Loading more tasks...
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "delegation" ? (
            <DelegationPage
              searchTerm={searchTerm}
              nameFilter={nameFilter}
              freqFilter={freqFilter}
              onEditTask={handleEditClick}
            />
          ) : activeTab === "housekeeping" ? (
            <div className="mt-6 rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
              <div className="bg-gray-50/50 border-b border-gray-100 p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-gray-700 font-bold text-sm flex items-center gap-2">
                    <div className="w-1 h-4 bg-red-600 rounded-full" />
                    Housekeeping Tasks
                  </h2>
                  <p className="text-gray-500 text-[10px] sm:text-xs">
                    Showing all unique items from housekeeping
                  </p>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                  {filteredHousekeepingTasks.length} items
                </span>
              </div>
              <div
                ref={tableContainerRef}
                className="overflow-x-auto overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 220px)" }}
              >
                <div className="divide-y divide-gray-100 md:hidden">
                  {filteredHousekeepingTasks.length > 0 ? (
                    filteredHousekeepingTasks.map(renderHousekeepingMobileCard)
                  ) : (
                    <div className="px-6 py-12 text-center text-gray-400 text-xs font-bold italic">
                      <div className="flex flex-col items-center gap-2">
                        <Filter size={24} className="opacity-20" />
                        <span>
                          {searchTerm || freqFilter
                            ? "No housekeeping tasks matching your search filters"
                            : appliedNameFilter
                              ? "No housekeeping tasks found for this doer"
                              : "No housekeeping tasks found"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      {[
                        { key: "actions", label: "Actions" },
                        { key: "department", label: "Department" },
                        { key: "given_by", label: "Given By" },
                        { key: "name", label: "Doer Name" },
                        {
                          key: "task_description",
                          label: "Task Description",
                          minWidth: "min-w-[320px]",
                        },
                        {
                          key: "task_start_date",
                          label: "Start Date",
                          bg: "bg-yellow-50",
                        },
                        { key: "frequency", label: "Frequency" },
                        { key: "status", label: "Status" },
                        { key: "remark", label: "Remark" },
                        { key: "attachment", label: "Verification" },
                      ].map((column) => (
                        <th
                          key={column.label}
                          className={`px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest transition-colors ${column.bg ? "bg-red-50/30" : ""
                            } ${column.minWidth || ""} ${column.key && column.key !== "actions"
                              ? "cursor-pointer hover:bg-gray-100/50 hover:text-red-600"
                              : ""
                            }`}
                          onClick={() => column.key && column.key !== "actions" && requestSort(column.key)}
                        >
                          <div className="flex items-center gap-1">
                            {column.label}
                            {sortConfig.key === column.key && (
                              <span className="text-red-600 font-bold">
                                {sortConfig.direction === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHousekeepingTasks.length > 0 ? (
                      filteredHousekeepingTasks.map((task, index) => (
                        <tr key={`${task.task_id}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditClick(task, "housekeeping")}
                                disabled={deletingTaskKey === `housekeeping:${task.task_id}`}
                                className={getActionButtonClasses("edit", deletingTaskKey !== `housekeeping:${task.task_id}`)}
                                title="Edit Task"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task, "housekeeping")}
                                disabled={deletingTaskKey === `housekeeping:${task.task_id}`}
                                className={getActionButtonClasses("delete", deletingTaskKey !== `housekeeping:${task.task_id}`)}
                                title="Delete Task"
                              >
                                {deletingTaskKey === `housekeeping:${task.task_id}` ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {task.department || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                            {task.given_by || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">
                            {task.name || "-"}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 min-w-[320px] max-w-[420px]">
                            <div className="whitespace-normal break-words leading-relaxed">
                              {task.task_description || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600 bg-red-50/10">
                            {formatTimestampToDDMMYYYY(task.task_start_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600 border border-gray-100">
                              {task.frequency || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold">
                            <span
                              className={
                                String(task.status || "").toLowerCase() === "yes"
                                  ? "text-green-600"
                                  : String(task.status || "").toLowerCase() === "no"
                                    ? "text-amber-600"
                                    : "text-gray-500"
                              }
                            >
                              {task.status || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[11px] text-gray-500 min-w-[220px] max-w-[320px]">
                            <div className="whitespace-normal break-words leading-relaxed">
                              {task.remark || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold">
                            <span
                              className={
                                String(task.attachment || "").toLowerCase() === "confirmed"
                                  ? "text-green-600"
                                  : "text-gray-400"
                              }
                            >
                              {task.attachment || "-"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-6 py-12 text-center text-gray-400 text-xs font-bold italic"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Filter size={24} className="opacity-20" />
                            <span>
                              {searchTerm || freqFilter
                                ? "No housekeeping tasks matching your search filters"
                                : appliedNameFilter
                                  ? "No housekeeping tasks found for this doer"
                                  : "No housekeeping tasks found"
                              }
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
                {loading && housekeepingHasMore && (
                  <div className="flex flex-col items-center justify-center py-8 bg-gray-50/30">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600/20 border-t-red-600" />
                    <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest mt-3 animate-pulse">
                      Loading more housekeeping tasks...
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
              <div className="bg-gray-50/50 border-b border-gray-100 p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-gray-700 font-bold text-sm flex items-center gap-2">
                    <div className="w-1 h-4 bg-red-600 rounded-full" />
                    Maintenance Tasks
                  </h2>
                  <p className="text-gray-500 text-[10px] sm:text-xs">
                    Showing all unique items from maintenance
                  </p>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                  {filteredMaintenanceTasks.length} items
                </span>
              </div>
              <div
                ref={tableContainerRef}
                className="overflow-x-auto overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 220px)" }}
              >
                <div className="divide-y divide-gray-100 md:hidden">
                  {filteredMaintenanceTasks.length > 0 ? (
                    filteredMaintenanceTasks.map(renderMaintenanceMobileCard)
                  ) : (
                    <div className="px-6 py-12 text-center text-gray-400 text-xs font-bold italic">
                      <div className="flex flex-col items-center gap-2">
                        <Filter size={24} className="opacity-20" />
                        <span>
                          {searchTerm || freqFilter
                            ? "No maintenance tasks matching your search filters"
                            : appliedNameFilter
                              ? "No maintenance tasks found for this doer"
                              : "No maintenance tasks found"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      {[
                        { key: "actions", label: "Actions" },
                        { key: "department", label: "Department" },
                        { key: "given_by", label: "Given By" },
                        { key: "name", label: "Doer Name" },
                        { key: "machine_name", label: "Machine" },
                        { key: "serial_no", label: "Serial No" },
                        {
                          key: "task_description",
                          label: "Task Description",
                          minWidth: "min-w-[300px]",
                        },
                        {
                          key: "task_start_date",
                          label: "Start Date",
                          bg: "bg-yellow-50",
                        },
                        { key: "frequency", label: "Frequency" },
                        { key: "task_type", label: "Task Type" },
                        { key: "priority", label: "Priority" },
                      ].map((column) => (
                        <th
                          key={column.label}
                          className={`px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest transition-colors ${column.bg ? "bg-red-50/30" : ""
                            } ${column.minWidth || ""} ${column.key && column.key !== "actions"
                              ? "cursor-pointer hover:bg-gray-100/50 hover:text-red-600"
                              : ""
                            }`}
                          onClick={() => column.key && column.key !== "actions" && requestSort(column.key)}
                        >
                          <div className="flex items-center gap-1">
                            {column.label}
                            {sortConfig.key === column.key && (
                              <span className="text-red-600 font-bold">
                                {sortConfig.direction === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMaintenanceTasks.length > 0 ? (
                      filteredMaintenanceTasks.map((task, index) => (
                        <tr key={`${task.task_id}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditClick(task, "maintenance")}
                                disabled={deletingTaskKey === `maintenance:${task.task_id}`}
                                className={getActionButtonClasses("edit", deletingTaskKey !== `maintenance:${task.task_id}`)}
                                title="Edit Task"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task, "maintenance")}
                                disabled={deletingTaskKey === `maintenance:${task.task_id}`}
                                className={getActionButtonClasses("delete", deletingTaskKey !== `maintenance:${task.task_id}`)}
                                title="Delete Task"
                              >
                                {deletingTaskKey === `maintenance:${task.task_id}` ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {task.department || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                            {task.given_by || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">
                            {task.name || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                            {task.machine_name || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                            {task.serial_no || "—"}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 min-w-[300px] max-w-[400px]">
                            <div className="whitespace-normal break-words leading-relaxed">
                              {task.task_description || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600 bg-red-50/10">
                            {formatTimestampToDDMMYYYY(task.task_start_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600 border border-gray-100">
                              {task.frequency || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-500">
                            {task.task_type || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-500">
                            {task.priority || "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-6 py-12 text-center text-gray-400 text-xs font-bold italic"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Filter size={24} className="opacity-20" />
                            <span>
                              {searchTerm || freqFilter
                                ? "No maintenance tasks matching your search filters"
                                : appliedNameFilter
                                  ? "No maintenance tasks found for this doer"
                                  : "No maintenance tasks found"
                              }
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
                {loading && maintenanceHasMore && (
                  <div className="flex flex-col items-center justify-center py-8 bg-gray-50/30">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600/20 border-t-red-600" />
                    <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest mt-3 animate-pulse">
                      Loading more maintenance tasks...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Task Modal */}
      {editingTaskId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={handleCancelEdit} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <Edit size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {editModalTitle}
                  </h3>
                  <p className="text-xs text-gray-500">ID: #{editingTaskId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-100 p-3 rounded-xl text-red-700 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <X size={14} />
                    <span>{error}</span>
                  </div>
                  <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100">
                    <X size={14} />
                  </button>
                </div>
              )}
              {successMessage && (
                <div className="mb-4 bg-green-50 border border-green-100 p-3 rounded-xl text-green-700 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    <span>{successMessage}</span>
                  </div>
                  <button onClick={() => setSuccessMessage("")} className="opacity-50 hover:opacity-100">
                    <X size={14} />
                  </button>
                </div>
              )}

              <form id="editTaskForm" onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Department</label>
                    <input
                      type="text"
                      value={editFormData.department || ""}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Given By</label>
                    <input
                      type="text"
                      value={editFormData.given_by || ""}
                      onChange={(e) => handleInputChange("given_by", e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Doer Name</label>
                    <select
                      value={editFormData.name || ""}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-red-600 focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                    >
                      <option value="">Select Doer Name</option>
                      {allNames.map((nameOption, idx) => (
                        <option key={idx} value={nameOption}>
                          {nameOption}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Start Date</label>
                    <input
                      type="datetime-local"
                      value={editFormData.task_start_date || ""}
                      onChange={(e) => handleInputChange("task_start_date", e.target.value)}
                      className="w-full px-4 py-2.5 bg-red-50/30 border border-red-50 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none font-bold text-red-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Frequency</label>
                    <select
                      value={editFormData.frequency || ""}
                      onChange={(e) => handleInputChange("frequency", e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>

                  {isMaintenanceEdit && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Machine Name</label>
                        <input
                          type="text"
                          value={editFormData.machine_name || ""}
                          onChange={(e) => handleInputChange("machine_name", e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Serial No</label>
                        <input
                          type="text"
                          value={editFormData.serial_no || ""}
                          onChange={(e) => handleInputChange("serial_no", e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Task Type</label>
                        <input
                          type="text"
                          value={editFormData.task_type || ""}
                          onChange={(e) => handleInputChange("task_type", e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Priority</label>
                        <select
                          value={editFormData.priority || ""}
                          onChange={(e) => handleInputChange("priority", e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                        >
                          <option value="">Select Priority</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    </>
                  )}

                  {showReminderFields && (
                    <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Reminders</label>
                        <select
                          value={editFormData.enable_reminder || ""}
                          onChange={(e) => handleInputChange("enable_reminder", e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Attachment</label>
                        <select
                          value={editFormData.require_attachment || ""}
                          onChange={(e) => handleInputChange("require_attachment", e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {isHousekeepingEdit && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Status</label>
                      <select
                        value={editFormData.status || ""}
                        onChange={(e) => handleInputChange("status", e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                      >
                        <option value="">Select Status</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Task Description</label>
                  <textarea
                    value={editFormData.task_description || ""}
                    onChange={(e) => handleInputChange("task_description", e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none min-h-[100px]"
                    placeholder="Describe the task details..."
                  />
                </div>

                {showRemarkField && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Remark</label>
                    <textarea
                      value={editFormData.remark || ""}
                      onChange={(e) => handleInputChange("remark", e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none min-h-[80px]"
                      placeholder="Add any additional notes..."
                    />
                  </div>
                )}
              </form>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-white hover:text-gray-700 transition-all border border-transparent hover:border-gray-200"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                form="editTaskForm"
                disabled={isSaving}
                className="px-8 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
