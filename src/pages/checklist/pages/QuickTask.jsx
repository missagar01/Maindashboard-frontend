"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
  Search,
  ChevronDown,
  Filter,
  Trash2,
  Edit,
  Save,
  X,
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import DelegationPage from "./delegation-data";
import { useAuth } from "../context/AuthContext";

export default function QuickTask() {
  const [tasks, setTasks] = useState([]);
  const [delegationLoading, setDelegationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
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
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [originalTaskData, setOriginalTaskData] = useState(null);

  const {
    quickTaskState,
    fetchQuickTaskUsers,
    resetQuickTaskChecklistPagination,
    resetQuickTaskDelegationPagination,
    fetchUniqueChecklistTaskData,
    fetchUniqueDelegationTaskData,
    updateQuickTaskChecklistTask,
    deleteQuickTaskChecklistTask,
    userData
  } = useAuth();

  const {
    quickTask,
    loading,
    delegationTasks,
    users,
    checklistPage,
    checklistHasMore,
    delegationPage,
    delegationHasMore,
  } = quickTaskState;

  useEffect(() => {
    fetchQuickTaskUsers();
    resetQuickTaskChecklistPagination();
    fetchUniqueChecklistTaskData({ page: 0, pageSize: 50, nameFilter: "" });
  }, []);

  // Add this new function
  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;

    // Check if scrolled near bottom (within 100px)
    if (scrollHeight - scrollTop - clientHeight < 100) {
      if (activeTab === "checklist" && checklistHasMore) {
        fetchUniqueChecklistTaskData({
          page: checklistPage,
          pageSize: 50,
          nameFilter,
          append: true,
        });
      } else if (activeTab === "delegation" && delegationHasMore) {
        fetchUniqueDelegationTaskData({
          page: delegationPage,
          pageSize: 50,
          nameFilter,
          append: true,
        });
      }
    }
  }, [
    loading,
    activeTab,
    checklistHasMore,
    delegationHasMore,
    checklistPage,
    delegationPage,
    nameFilter,
  ]);

  // Add scroll listener
  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Edit functionality - Open modal with pre-filled data
  const handleEditClick = (task) => {
    setEditingTaskId(task.task_id);
    setOriginalTaskData(task);
    setError(null);
    setSuccessMessage("");

    // Normalize frequency to match select box options (capitalize first letter)
    const normalizeFrequency = (freq) => {
      if (!freq) return "";
      const freqStr = String(freq).trim();
      if (!freqStr) return "";
      // Capitalize first letter, lowercase rest
      return freqStr.charAt(0).toUpperCase() + freqStr.slice(1).toLowerCase();
    };

    // Normalize Yes/No values to match select box options
    const normalizeYesNo = (value) => {
      if (!value) return "";
      const valueStr = String(value).trim();
      if (!valueStr) return "";
      // Capitalize first letter
      return valueStr.charAt(0).toUpperCase() + valueStr.slice(1).toLowerCase();
    };

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
      frequency: normalizeFrequency(task.frequency),
      // Normalize enable_reminder to match select options (Yes, No)
      enable_reminder: normalizeYesNo(task.enable_reminder),
      // Normalize require_attachment to match select options (Yes, No)
      require_attachment: normalizeYesNo(task.require_attachment),
      remark: task.remark || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setOriginalTaskData(null);
    setEditFormData({});
    setError(null);
    setSuccessMessage("");
  };

  const handleSaveEdit = async () => {
    if (!editFormData.task_id) {
      setError("Task ID is missing. Cannot update task.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage("");

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
      const matchCriteria = {
        name: originalTaskData.name,
        task_description: originalTaskData.task_description,
        division: originalTaskData.division || userData?.division || localStorage.getItem("division") || ""
      };

      // Pass matchCriteria to update all tasks with same name & description
      await updateQuickTaskChecklistTask(updatedTaskData, matchCriteria);

      // Update was successful - show success message
      setSuccessMessage("Task updated successfully! ✅");

      // Close modal after 2 seconds
      setTimeout(() => {
        setEditingTaskId(null);
        setEditFormData({});
        setError(null);
        setSuccessMessage("");
      }, 2000);

    } catch (error) {
      console.error("Failed to update task:", error);
      const errorMessage =
        error?.message ||
        error?.error ||
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
    const isAllSelected = filteredChecklistTasks.length > 0 &&
      filteredChecklistTasks.every(task => selectedTasks.some(t => t.task_id === task.task_id));

    if (isAllSelected) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredChecklistTasks); // store full rows
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
      setError("Failed to delete tasks");
    } finally {
      setIsDeleting(false);
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
      fetchUniqueChecklistTaskData({
        page: 0,
        pageSize: 50,
        nameFilter: name,
        append: false,
      });
    } else {
      resetQuickTaskDelegationPagination();
      fetchUniqueDelegationTaskData({
        page: 0,
        pageSize: 50,
        nameFilter: name,
        append: false,
      });
    }

    setDropdownOpen({ ...dropdownOpen, name: false });
  };

  const handleFrequencyFilterSelect = (freq) => {
    setFreqFilter(freq);
    setDropdownOpen({ ...dropdownOpen, frequency: false });
  };

  const clearNameFilter = () => {
    setNameFilter("");

    if (activeTab === "checklist") {
      resetQuickTaskChecklistPagination();
      fetchUniqueChecklistTaskData({
        page: 0,
        pageSize: 50,
        nameFilter: "",
        append: false,
      });
    } else {
      resetQuickTaskDelegationPagination();
      fetchUniqueDelegationTaskData({
        page: 0,
        pageSize: 50,
        nameFilter: "",
        append: false,
      });
    }

    setDropdownOpen({ ...dropdownOpen, name: false });
  };

  const clearFrequencyFilter = () => {
    setFreqFilter("");
    setDropdownOpen({ ...dropdownOpen, frequency: false });
  };

  // FIXED: Added proper null/undefined checks and string validation
  const allNames = [...new Set(users.map((user) => user.user_name))]
    .filter((name) => name && typeof name === "string" && name.trim() !== "")
    .sort();

  // Keep allFrequencies as is (or modify if you want to fetch frequencies from elsewhere)
  const allFrequencies = [
    ...new Set([
      ...quickTask.map((task) => task.frequency),
      ...delegationTasks.map((task) => task.frequency),
    ]),
  ].filter(
    (frequency) =>
      frequency && typeof frequency === "string" && frequency.trim() !== ""
  );

  const filteredChecklistTasks = quickTask
    .filter((task) => {
      if (!task) return false;

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

      return freqFilterPass && searchTermPass;
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

  return (
    <AdminLayout>
      <div className="sticky top-0 z-30 bg-white pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-red-700 ">
            Quick Task
          </h1>
          <p className="text-purple-600 text-sm mb-2">
            {activeTab === "checklist"
              ? `Showing ${quickTask.length} task`
              : `Showing delegation tasks`}
          </p>
        </div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex border border-purple-200 rounded-md overflow-hidden self-start">
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "checklist"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-purple-600 hover:bg-purple-50"
                  }`}
                onClick={() => {
                  setActiveTab("checklist");
                  resetQuickTaskChecklistPagination();
                  fetchUniqueChecklistTaskData({
                    page: 0,
                    pageSize: 50,
                    nameFilter,
                  });
                }}
              >
                Checklist
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "delegation"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-purple-600 hover:bg-purple-50"
                  }`}
                onClick={() => {
                  setActiveTab("delegation");
                  resetQuickTaskDelegationPagination();
                  fetchUniqueDelegationTaskData({
                    page: 0,
                    pageSize: 50,
                    nameFilter,
                  });
                }}
              >
                Delegation
              </button>
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading || delegationLoading}
              />
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <div className="flex items-center gap-2">
                  {/* Input with datalist for autocomplete */}
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      list="nameOptions"
                      placeholder="Type or select name..."
                      value={nameFilter}
                      onChange={(e) => {
                        const typedName = e.target.value;
                        setNameFilter(typedName); // Always update the input value

                        // Only trigger DB fetch if the value is empty or matches a name in the list
                        if (typedName === "") {
                          clearNameFilter();
                        } else if (allNames.includes(typedName)) {
                          handleNameFilterSelect(typedName);
                        }
                      }}
                      onBlur={(e) => {
                        // When input loses focus, if the typed value doesn't match any name, clear it
                        const typedName = e.target.value;
                        if (typedName && !allNames.includes(typedName)) {
                          // Optional: You can either clear it or keep it for manual filtering
                          // setNameFilter('');
                          // clearNameFilter();
                        }
                      }}
                      onKeyDown={(e) => {
                        // Allow pressing Enter to apply the filter even if not exact match
                        if (e.key === "Enter") {
                          if (nameFilter === "") {
                            clearNameFilter();
                          } else {
                            // Apply the filter with whatever is typed
                            handleNameFilterSelect(nameFilter);
                          }
                        }
                      }}
                      className="w-48 pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <datalist id="nameOptions">
                      {allNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>

                    {/* Clear button for input */}
                    {nameFilter && (
                      <button
                        onClick={() => {
                          setNameFilter("");
                          clearNameFilter();
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown button */}
                  <button
                    onClick={() => toggleDropdown("name")}
                    className="flex items-center gap-1 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${dropdownOpen.name ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                </div>

                {/* Dropdown menu */}
                {dropdownOpen.name && (
                  <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto top-full right-0">
                    <div className="py-1">
                      <button
                        onClick={clearNameFilter}
                        className={`block w-full text-left px-4 py-2 text-sm ${!nameFilter
                          ? "bg-purple-100 text-purple-900"
                          : "text-gray-700 hover:bg-gray-100"
                          }`}
                      >
                        All Names
                      </button>
                      {allNames.map((name) => (
                        <button
                          key={name}
                          onClick={() => {
                            handleNameFilterSelect(name);
                            setDropdownOpen({ ...dropdownOpen, name: false });
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm ${nameFilter === name
                            ? "bg-purple-100 text-purple-900"
                            : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => toggleDropdown("frequency")}
                  className="flex items-center gap-2 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4" />
                  {freqFilter || "Filter by Frequency"}
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${dropdownOpen.frequency ? "rotate-180" : ""
                      }`}
                  />
                </button>
                {dropdownOpen.frequency && (
                  <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">
                    <div className="py-1">
                      <button
                        onClick={clearFrequencyFilter}
                        className={`block w-full text-left px-4 py-2 text-sm ${!freqFilter
                          ? "bg-purple-100 text-purple-900"
                          : "text-gray-700 hover:bg-gray-100"
                          }`}
                      >
                        All Frequencies
                      </button>
                      {allFrequencies.map((freq) => (
                        <button
                          key={freq}
                          onClick={() => handleFrequencyFilterSelect(freq)}
                          className={`block w-full text-left px-4 py-2 text-sm ${freqFilter === freq
                            ? "bg-purple-100 text-purple-900"
                            : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {selectedTasks.length > 0 && activeTab === "checklist" && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isDeleting
                  ? "Deleting..."
                  : `Delete (${selectedTasks.length})`}
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
              fetchUniqueChecklistTaskData();
            }}
            className="underline ml-2 hover:text-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {loading && activeTab === "delegation" && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
          <p className="text-purple-600">Loading delegation data...</p>
        </div>
      )}

      {!error && (
        <>
          {activeTab === "checklist" ? (
            <div className="mt-4 rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-purple-700 font-medium">
                    Checklist Tasks
                  </h2>
                  <p className="text-purple-600 text-sm">
                    Showing all unique tasks
                  </p>
                </div>
                {selectedTasks.length > 0 && (
                  <span className="text-sm text-purple-600">
                    {selectedTasks.length} task(s) selected
                  </span>
                )}
              </div>
              {/* <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}> */}
              <div
                ref={tableContainerRef}
                className="overflow-x-auto overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 220px)" }}
              >
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={
                            filteredChecklistTasks.length > 0 &&
                            filteredChecklistTasks.every(task =>
                              selectedTasks.some(t => t.task_id === task.task_id)
                            )
                          }
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                        { key: "actions", label: "Actions" },
                      ].map((column) => (
                        <th
                          key={column.label}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.bg || ""
                            } ${column.minWidth || ""} ${column.key && column.key !== "actions"
                              ? "cursor-pointer hover:bg-gray-100"
                              : ""
                            }`}
                          onClick={() =>
                            column.key &&
                            column.key !== "actions" &&
                            requestSort(column.key)
                          }
                        >
                          <div className="flex items-center">
                            {column.label}
                            {sortConfig.key === column.key && (
                              <span className="ml-1">
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
                          <td className="px-4 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedTasks.some(t => t.task_id === task.task_id)}
                              onChange={() => handleCheckboxChange(task)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.given_by}
                                onChange={(e) =>
                                  handleInputChange("given_by", e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              task.given_by
                            )}
                          </td>

                          {/* Name */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.name}
                                onChange={(e) =>
                                  handleInputChange("name", e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              task.name
                            )}
                          </td>

                          {/* Task Description */}
                          <td className="px-6 py-4 text-sm text-gray-500 min-w-[300px] max-w-[400px]">
                            {editingTaskId === task.task_id ? (
                              <textarea
                                value={editFormData.task_description}
                                onChange={(e) =>
                                  handleInputChange(
                                    "task_description",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                rows="3"
                              />
                            ) : (
                              <div className="whitespace-normal break-words">
                                {task.task_description}
                              </div>
                            )}
                          </td>

                          {/* Task Start Date */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 bg-yellow-50">
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
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              formatTimestampToDDMMYYYY(task.task_start_date)
                            )}
                          </td>

                          {/* Submission Date (End Date) */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 bg-yellow-50">
                            {formatTimestampToDDMMYYYY(task.submission_date)}
                          </td>

                          {/* Frequency */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.frequency}
                                onChange={(e) =>
                                  handleInputChange("frequency", e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">Select Frequency</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Yearly">Yearly</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${task.frequency === "Daily"
                                  ? "bg-blue-100 text-blue-800"
                                  : task.frequency === "Weekly"
                                    ? "bg-green-100 text-green-800"
                                    : task.frequency === "Monthly"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                              >
                                {task.frequency}
                              </span>
                            )}
                          </td>

                          {/* Enable Reminders */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.enable_reminder}
                                onChange={(e) =>
                                  handleInputChange(
                                    "enable_reminder",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">Select</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : (
                              task.enable_reminder || "—"
                            )}
                          </td>

                          {/* Require Attachment */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.require_attachment}
                                onChange={(e) =>
                                  handleInputChange(
                                    "require_attachment",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">Select</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : (
                              task.require_attachment || "—"
                            )}
                          </td>

                          {/* Actions */}
                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={isSaving}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  {isSaving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  <X size={14} />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              // REMOVED THE submission_date CHECK - ALWAYS SHOW EDIT BUTTON
                              <button
                                onClick={() => handleEditClick(task)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                <Edit size={14} />
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-6 py-4 text-center text-gray-500 font-medium"
                        >
                          {!nameFilter
                            ? "Please select a doer"
                            : searchTerm || freqFilter
                              ? "No tasks matching your filters"
                              : "No tasks available"
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {loading && checklistHasMore && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                    <p className="text-purple-600 text-sm mt-2">
                      Loading more tasks...
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <DelegationPage
              searchTerm={searchTerm}
              nameFilter={nameFilter}
              freqFilter={freqFilter}
              setNameFilter={setNameFilter}
              setFreqFilter={setFreqFilter}
            />
          )}
        </>
      )}

      {/* Edit Task Modal */}
      {editingTaskId && (
        <div
          className="fixed z-50 inset-0 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancelEdit();
            }
          }}
        >
          <div className="flex items-center justify-center min-h-screen px-4 py-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  Edit Task
                </h3>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded p-1"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="px-6 py-4">
                {error && (
                  <div className="mb-4 bg-red-50 p-3 rounded-md text-red-800 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {successMessage && (
                  <div className="mb-4 bg-green-50 p-3 rounded-md text-green-800 text-sm flex items-center justify-between">
                    <span>{successMessage}</span>
                    <button
                      onClick={() => setSuccessMessage("")}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveEdit();
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Department */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={editFormData.department || ""}
                        onChange={(e) =>
                          handleInputChange("department", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter department"
                      />
                    </div>

                    {/* Given By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Given By
                      </label>
                      <input
                        type="text"
                        value={editFormData.given_by || ""}
                        onChange={(e) =>
                          handleInputChange("given_by", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter given by"
                      />
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.name || ""}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter name"
                      />
                    </div>

                    {/* Task Start Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Task Start Date
                      </label>
                      <input
                        type="datetime-local"
                        value={editFormData.task_start_date || ""}
                        onChange={(e) =>
                          handleInputChange("task_start_date", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-yellow-50"
                      />
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequency
                      </label>
                      <select
                        value={editFormData.frequency || ""}
                        onChange={(e) =>
                          handleInputChange("frequency", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Select Frequency</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>

                    {/* Enable Reminder */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enable Reminder
                      </label>
                      <select
                        value={editFormData.enable_reminder || ""}
                        onChange={(e) =>
                          handleInputChange("enable_reminder", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    {/* Require Attachment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Require Attachment
                      </label>
                      <select
                        value={editFormData.require_attachment || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "require_attachment",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>

                  {/* Task Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Description
                    </label>
                    <textarea
                      value={editFormData.task_description || ""}
                      onChange={(e) =>
                        handleInputChange("task_description", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      rows="4"
                      placeholder="Enter task description"
                    />
                  </div>

                  {/* Remark */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remark
                    </label>
                    <textarea
                      value={editFormData.remark || ""}
                      onChange={(e) =>
                        handleInputChange("remark", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      rows="3"
                      placeholder="Enter remark"
                    />
                  </div>


                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Save size={18} />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
