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
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md pb-4 pt-2 border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-red-600">
              Quick Task
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5">
              {activeTab === "checklist"
                ? `Managing ${quickTask.length} checklist items`
                : `Managing delegation tasks`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center">
          {/* View Toggle Tabs */}
          <div className="flex p-1 bg-gray-100/50 rounded-xl border border-gray-200/50 w-full sm:w-auto">
            <button
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "checklist"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
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
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "delegation"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600 transition-all bg-white"
                disabled={loading || delegationLoading}
              />
            </div>

            {/* Filters Group */}
            <div className="flex flex-col-2 sm:flex-row gap-2">
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
                      placeholder="Name filter..."
                      value={nameFilter}
                      onChange={(e) => {
                        const typedName = e.target.value;
                        setNameFilter(typedName);

                        if (typedName === "") {
                          clearNameFilter();
                        } else if (allNames.includes(typedName)) {
                          handleNameFilterSelect(typedName);
                        }
                      }}
                      onFocus={() => setDropdownOpen(prev => ({ ...prev, name: true }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (nameFilter === "") {
                            clearNameFilter();
                          } else {
                            handleNameFilterSelect(nameFilter);
                          }
                        }
                      }}
                      className={`w-full sm:w-44 pl-9 pr-8 py-2 border rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-red-100 ${nameFilter ? 'border-red-200 bg-red-50/30 text-red-600' : 'border-gray-200 bg-white text-gray-600'}`}
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
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold mb-1 transition-all ${!nameFilter ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        All Staff Members
                      </button>
                      {allNames
                        .filter(name =>
                          !nameFilter ||
                          name.toLowerCase().includes(nameFilter.toLowerCase())
                        )
                        .map((name) => (
                          <button
                            key={name}
                            onClick={() => {
                              handleNameFilterSelect(name);
                              setDropdownOpen({ ...dropdownOpen, name: false });
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${nameFilter === name ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"}`}
                          >
                            {name}
                            {nameFilter === name && <div className="w-1.5 h-1.5 rounded-full bg-red-600" />}
                          </button>
                        ))}
                      {allNames.filter(name =>
                        name.toLowerCase().includes(nameFilter.toLowerCase())
                      ).length === 0 && (
                          <div className="px-3 py-4 text-center text-gray-400 text-[10px] italic">
                            No members found
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            filteredChecklistTasks.length > 0 &&
                            filteredChecklistTasks.every(task =>
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
                        { key: "actions", label: "Actions" },
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
                          <td className="px-4 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedTasks.some(t => t.task_id === task.task_id)}
                              onChange={() => handleCheckboxChange(task)}
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
                              <input
                                type="text"
                                value={editFormData.name}
                                onChange={(e) =>
                                  handleInputChange("name", e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-100 focus:border-red-600 outline-none"
                              />
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

                          {/* Actions */}
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
                              <button
                                onClick={() => handleEditClick(task)}
                                className="flex items-center justify-center w-8 h-8 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                                title="Edit Task"
                              >
                                <Edit size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-6 py-12 text-center text-gray-400 text-xs font-bold italic"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Filter size={24} className="opacity-20" />
                            <span>
                              {!nameFilter
                                ? "Please select a doer from the filter above"
                                : searchTerm || freqFilter
                                  ? "No tasks matching your search filters"
                                  : "No tasks found for this doer"
                              }
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                    Edit Task
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
                    <input
                      type="text"
                      value={editFormData.name || ""}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-red-600 focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none"
                    />
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Remainders</label>
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

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Remark</label>
                  <textarea
                    value={editFormData.remark || ""}
                    onChange={(e) => handleInputChange("remark", e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-100 focus:border-red-600 focus:bg-white transition-all outline-none min-h-[80px]"
                    placeholder="Add any additional notes..."
                  />
                </div>
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
