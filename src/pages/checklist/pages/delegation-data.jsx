"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit, Trash2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const isCurrentDayDateValue = (dateValue) => {
  if (!dateValue) return false;
  const taskDate = new Date(dateValue);
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

function DelegationPage({ searchTerm, nameFilter, freqFilter, onEditTask }) {
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const {
    quickTaskState,
    fetchUniqueDelegationTaskDataAction,
    deleteDelegationTaskAction,
  } = useAuth();

  const { delegationTasks, loading } = quickTaskState || {};

  const handleCheckboxChange = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter((currentTaskId) => currentTaskId !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === selectableTasks.length && selectableTasks.length > 0) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(selectableTasks.map((task) => task.task_id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return;

    setIsDeleting(true);
    try {
      await deleteDelegationTaskAction(selectedTasks);
      setSelectedTasks([]);
      setSuccessMessage("Tasks deleted successfully");

      fetchUniqueDelegationTaskDataAction({
        page: 0,
        pageSize: 50,
        nameFilter,
        searchTerm,
      });

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (deleteError) {
      console.error("Failed to delete tasks:", deleteError);
      setError(deleteError?.message || "Failed to delete tasks");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!isCurrentDayDateValue(task?.task_start_date)) {
      setError("Only current day tasks can be deleted.");
      return;
    }

    const shouldDelete = window.confirm(
      `Delete this delegation task?\n\n${task?.task_description || `task #${task?.task_id || ""}`}`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingTaskId(task.task_id);
    setError(null);

    try {
      await deleteDelegationTaskAction([task.task_id]);
      setSelectedTasks((previous) =>
        previous.filter((currentTaskId) => currentTaskId !== task.task_id)
      );
      setSuccessMessage("Task deleted successfully");

      fetchUniqueDelegationTaskDataAction({
        page: 0,
        pageSize: 50,
        nameFilter,
        searchTerm,
      });

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (deleteError) {
      console.error("Failed to delete task:", deleteError);
      setError(deleteError?.message || "Failed to delete task");
    } finally {
      setDeletingTaskId(null);
    }
  };

  const formatDateTime = useCallback((dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }, []);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const filteredTasks = useMemo(() => {
    let filtered = delegationTasks || [];
    const query = String(searchTerm || "").toLowerCase();

    filtered = filtered.filter(
      (task) =>
        !searchTerm ||
        task.task_description?.toLowerCase().includes(query) ||
        task.department?.toLowerCase().includes(query) ||
        task.name?.toLowerCase().includes(query) ||
        task.given_by?.toLowerCase().includes(query)
    );

    if (nameFilter) {
      filtered = filtered.filter((task) => task.name === nameFilter);
    }

    if (freqFilter) {
      filtered = filtered.filter((task) => task.frequency === freqFilter);
    }

    return filtered;
  }, [delegationTasks, searchTerm, nameFilter, freqFilter]);

  const selectableTasks = useMemo(
    () => filteredTasks.filter((task) => isCurrentDayDateValue(task.task_start_date)),
    [filteredTasks]
  );

  return (
    <>
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between shadow-lg">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
            {successMessage}
          </div>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-green-500 hover:text-green-700 ml-4"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 p-4 rounded-md text-red-800 text-center">
          {error}{" "}
          <button
            onClick={() =>
              fetchUniqueDelegationTaskDataAction({
                page: 0,
                pageSize: 50,
                nameFilter,
                searchTerm,
              })
            }
            className="underline ml-2 hover:text-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {!error && isInitialized && !loading && (
        <div className="mt-6 rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
          <div className="bg-gray-50/50 border-b border-gray-100 p-4 flex justify-between items-center">
            <div>
              <h2 className="text-gray-700 font-bold text-sm flex items-center gap-2">
                <div className="w-1 h-4 bg-red-600 rounded-full" />
                Delegation Tasks
              </h2>
              <p className="text-gray-500 text-[10px] sm:text-xs">
                ({filteredTasks.length} tasks matching your view)
              </p>
            </div>

            {selectedTasks.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-md text-xs font-bold"
              >
                <Trash2 size={14} />
                {isDeleting ? "Deleting..." : `Delete ${selectedTasks.length} selected`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: "calc(100vh - 280px)" }}>
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80 sticky top-0 z-20 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTasks.length === selectableTasks.length && selectableTasks.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 transition-all"
                    />
                  </th>
                  {[
                    "TIMESTAMP",
                    "TASK ID",
                    "DEPARTMENT",
                    "GIVEN BY",
                    "NAME",
                    "TASK DESCRIPTION",
                    "TASK START DATE",
                    "TASK END DATE",
                    "FREQ",
                    "REMINDERS",
                    "ATTACHMENT",
                  ].map((head) => (
                    <th
                      key={head}
                      className={`px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest ${
                        head === "TASK START DATE" || head === "TASK END DATE"
                          ? "bg-red-50/30"
                          : ""
                      }`}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task, index) => (
                    <tr
                      key={`${task.task_id}-${index}`}
                      className={`group hover:bg-gray-50/80 transition-colors ${
                        selectedTasks.includes(task.task_id) ? "bg-red-50/20" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditTask?.(task, "delegation")}
                            disabled={!isCurrentDayDateValue(task.task_start_date) || deletingTaskId === task.task_id}
                            className={getActionButtonClasses("edit", isCurrentDayDateValue(task.task_start_date) && deletingTaskId !== task.task_id)}
                            title={isCurrentDayDateValue(task.task_start_date) ? "Edit Task" : "Only current day tasks can be edited"}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task)}
                            disabled={!isCurrentDayDateValue(task.task_start_date) || deletingTaskId === task.task_id || isDeleting}
                            className={getActionButtonClasses("delete", isCurrentDayDateValue(task.task_start_date) && deletingTaskId !== task.task_id && !isDeleting)}
                            title={isCurrentDayDateValue(task.task_start_date) ? "Delete Task" : "Only current day tasks can be deleted"}
                          >
                            {deletingTaskId === task.task_id ? (
                              <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.task_id)}
                          onChange={() => handleCheckboxChange(task.task_id)}
                          disabled={!isCurrentDayDateValue(task.task_start_date)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 transition-all"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600">
                        {formatDateTime(task.created_at) || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400">
                        #{task.task_id || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-medium">
                        {task.department || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {task.given_by || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">
                        {task.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 min-w-[300px] max-w-[400px]">
                        <div className="whitespace-normal break-words leading-relaxed">
                          {task.task_description || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600 bg-red-50/10">
                        {formatDateTime(task.task_start_date) || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600 bg-red-50/10">
                        {formatDateTime(task.submission_date) || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            task.frequency === "Daily"
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : task.frequency === "Weekly"
                                ? "bg-green-50 text-green-600 border border-green-100"
                                : task.frequency === "Monthly"
                                  ? "bg-red-50 text-red-600 border border-red-100"
                                  : "bg-gray-50 text-gray-600 border border-gray-100"
                          }`}
                        >
                          {task.frequency || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-500">
                        <span className={task.enable_reminder === "Yes" ? "text-green-600" : "text-gray-400"}>
                          {task.enable_reminder || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-500">
                        <span className={task.require_attachment === "Yes" ? "text-blue-600" : "text-gray-400"}>
                          {task.require_attachment || "-"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm || nameFilter || freqFilter
                        ? "No tasks matching your filters"
                        : "No pending tasks found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default DelegationPage;
