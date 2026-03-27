"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  X,
  Search,
  History,
  ArrowLeft,
  Filter,
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import { useAuth } from "../context/AuthContext";

// Configuration object - Move all configurations here
const CONFIG = {
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzXzqnKmbeXw3i6kySQcBOwxHQA7y8WBFfEe69MPbCR-jux0Zte7-TeSKi8P4CIFkhE/exec",
  DRIVE_FOLDER_ID: "1LPsmRqzqvp6b7aY9FS1NfiiK0LV03v03",
  SOURCE_SHEET_NAME: "DELEGATION",
  TARGET_SHEET_NAME: "DELEGATION DONE",
  PAGE_CONFIG: {
    title: "DELEGATION Tasks",
    historyTitle: "DELEGATION Task History",
    description: "Showing all pending tasks",
    historyDescription:
      "",
  },
};

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function DelegationDataPage() {
  const [accountData, setAccountData] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [additionalData, setAdditionalData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [remarksData, setRemarksData] = useState({});
  const [historyData, setHistoryData] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [statusData, setStatusData] = useState({});
  const [nextTargetDate, setNextTargetDate] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userRole, setUserRole] = useState("");
  const [username, setUsername] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const filterOptions = [
    { value: "all", label: "All Tasks" },
    { value: "overdue", label: "Overdue" },
    { value: "today", label: "Today" },
    { value: "upcoming", label: "Upcoming" },
  ];

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { 
    delegationState, 
    fetchDelegationDataAction, 
    fetchDelegationDoneDataAction,
    submitDelegationDoneAction 
  } = useAuth();

  const { loading, delegation, delegation_done } = delegationState || {};

  useEffect(() => {
    fetchDelegationDataAction();
    fetchDelegationDoneDataAction();
  }, []);

  const formatDateTimeToDDMMYYYY = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }, []);

  const formatDateToDDMMYYYY = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("role");
    const user = localStorage.getItem("user-name");
    setUserRole(role || "");
    setUsername(user || "");
  }, []);

  const parseGoogleSheetsDateTime = useCallback(
    (dateTimeStr) => {
      if (!dateTimeStr) return "";

      if (
        typeof dateTimeStr === "string" &&
        dateTimeStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}:\d{1,2}$/)
      ) {
        const [datePart, timePart] = dateTimeStr.split(" ");
        const [day, month, year] = datePart.split("/");
        const [hours, minutes, seconds] = timePart.split(":");

        const paddedDay = day.padStart(2, "0");
        const paddedMonth = month.padStart(2, "0");
        const paddedHours = hours.padStart(2, "0");
        const paddedMinutes = minutes.padStart(2, "0");
        const paddedSeconds = seconds.padStart(2, "0");

        return `${paddedDay}/${paddedMonth}/${year} ${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
      }

      if (
        typeof dateTimeStr === "string" &&
        dateTimeStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
      ) {
        const parts = dateTimeStr.split("/");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2];
          return `${day}/${month}/${year} 00:00:00`;
        }
        return dateTimeStr + " 00:00:00";
      }

      if (typeof dateTimeStr === "string" && dateTimeStr.startsWith("Date(")) {
        const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateTimeStr);
        if (match) {
          const year = Number.parseInt(match[1], 10);
          const month = Number.parseInt(match[2], 10);
          const day = Number.parseInt(match[3], 10);
          return `${day.toString().padStart(2, "0")}/${(month + 1)
            .toString()
            .padStart(2, "0")}/${year} 00:00:00`;
        }
      }

      try {
        const date = new Date(dateTimeStr);
        if (!isNaN(date.getTime())) {
          if (dateTimeStr.includes(":") || dateTimeStr.includes("T")) {
            return formatDateTimeToDDMMYYYY(date);
          } else {
            return formatDateToDDMMYYYY(date) + " 00:00:00";
          }
        }
      } catch (error) {
        console.error("Error parsing datetime:", error);
      }

      if (
        typeof dateTimeStr === "string" &&
        dateTimeStr.includes("/") &&
        !dateTimeStr.includes(":")
      ) {
        return dateTimeStr + " 00:00:00";
      }

      return dateTimeStr;
    },
    [formatDateTimeToDDMMYYYY, formatDateToDDMMYYYY]
  );

  const formatDateTimeForDisplay = useCallback(
    (dateTimeStr) => {
      if (!dateTimeStr) return "—";

      if (
        typeof dateTimeStr === "string" &&
        dateTimeStr.match(/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}$/)
      ) {
        return dateTimeStr;
      }

      if (
        typeof dateTimeStr === "string" &&
        dateTimeStr.match(/^\d{2}\/\d{2}\/\d{4}$/)
      ) {
        return dateTimeStr;
      }

      return parseGoogleSheetsDateTime(dateTimeStr) || "—";
    },
    [parseGoogleSheetsDateTime]
  );

  const parseDateFromDDMMYYYY = useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;

    const datePart = dateStr.split(" ")[0];
    const parts = datePart.split("/");
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setDateFilter("all");
  }, []);

  const getRowColor = useCallback((colorCode) => {
    if (!colorCode) return "bg-white";

    const code = colorCode.toString().toLowerCase();
    switch (code) {
      case "red":
        return "bg-red-50 border-l-4 border-red-400";
      case "yellow":
        return "bg-yellow-50 border-l-4 border-yellow-400";
      case "green":
        return "bg-green-50 border-l-4 border-green-400";
      case "blue":
        return "bg-blue-50 border-l-4 border-blue-400";
      default:
        return "bg-white";
    }
  }, []);

  const filteredDelegationTasks = useMemo(() => {
    if (!delegation) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return delegation.filter((task) => {
      const matchesSearch = debouncedSearchTerm
        ? Object.values(task).some(
          (value) =>
            value &&
            value
              .toString()
              .toLowerCase()
              .includes(debouncedSearchTerm.toLowerCase())
        )
        : true;

      let matchesDateFilter = true;
      if (dateFilter !== "all" && task.planned_date) {
        const plannedDate = new Date(task.planned_date);
        plannedDate.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case "overdue":
            matchesDateFilter = plannedDate < today;
            break;
          case "today":
            matchesDateFilter = plannedDate.getTime() === today.getTime();
            break;
          case "upcoming":
            matchesDateFilter = plannedDate >= tomorrow;
            break;
          default:
            matchesDateFilter = true;
        }
      }

      return matchesSearch && matchesDateFilter;
    });
  }, [delegation, debouncedSearchTerm, dateFilter]);

  const filteredHistoryData = useMemo(() => {
    if (!delegation_done) return [];

    return delegation_done
      .filter((item) => {
        const userMatch =
          userRole === "admin" ||
          (item.name && item.name.toLowerCase() === username.toLowerCase());
        if (!userMatch) return false;

        const matchesSearch = debouncedSearchTerm
          ? Object.values(item).some(
            (value) =>
              value &&
              value
                .toString()
                .toLowerCase()
                .includes(debouncedSearchTerm.toLowerCase())
          )
          : true;

        let matchesDateRange = true;
        if (startDate || endDate) {
          const itemDate = item.created_at ? new Date(item.created_at) : null;

          if (!itemDate || isNaN(itemDate.getTime())) {
            return false;
          }

          if (startDate) {
            const startDateObj = new Date(startDate);
            startDateObj.setHours(0, 0, 0, 0);
            if (itemDate < startDateObj) matchesDateRange = false;
          }

          if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            if (itemDate > endDateObj) matchesDateRange = false;
          }
        }

        return matchesSearch && matchesDateRange;
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : null;
        const dateB = b.created_at ? new Date(b.created_at) : null;

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        return dateB.getTime() - dateA.getTime();
      });
  }, [
    delegation_done,
    debouncedSearchTerm,
    startDate,
    endDate,
    userRole,
    username,
  ]);

  const handleSelectItem = useCallback((id, isChecked) => {
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);

      if (isChecked) {
        newSelected.add(id);
        setStatusData((prevStatus) => ({ ...prevStatus, [id]: "Done" }));
      } else {
        newSelected.delete(id);
        setAdditionalData((prevData) => {
          const newAdditionalData = { ...prevData };
          delete newAdditionalData[id];
          return newAdditionalData;
        });
        setRemarksData((prevRemarks) => {
          const newRemarksData = { ...prevRemarks };
          delete newRemarksData[id];
          return newRemarksData;
        });
        setStatusData((prevStatus) => {
          const newStatusData = { ...prevStatus };
          delete newStatusData[id];
          return newStatusData;
        });
        setNextTargetDate((prevDate) => {
          const newDateData = { ...prevDate };
          delete newDateData[id];
          return newDateData;
        });
      }

      return newSelected;
    });
  }, []);

  const handleCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      const isChecked = e.target.checked;
      handleSelectItem(id, isChecked);
    },
    [handleSelectItem]
  );

  const handleSelectAllItems = useCallback(
    (e) => {
      e.stopPropagation();
      const checked = e.target.checked;

      if (checked) {
        const allIds = delegation.map((item) => item.task_id);
        setSelectedItems(new Set(allIds));

        const newStatusData = {};
        allIds.forEach((id) => {
          newStatusData[id] = "Done";
        });
        setStatusData((prev) => ({ ...prev, ...newStatusData }));
      } else {
        setSelectedItems(new Set());
        setAdditionalData({});
        setRemarksData({});
        setStatusData({});
        setNextTargetDate({});
      }
    },
    [delegation]
  );


  const handleStatusChange = useCallback((id, value) => {
    setStatusData((prev) => ({ ...prev, [id]: value }));
    if (value === "Done") {
      setNextTargetDate((prev) => {
        const newDates = { ...prev };
        delete newDates[id];
        return newDates;
      });
    }
  }, []);

  const handleNextTargetDateChange = useCallback((id, value) => {
    setNextTargetDate((prev) => ({ ...prev, [id]: value }));
  }, []);

  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }, []);

  const toggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev);
    resetFilters();
  }, [resetFilters]);

  //   const handleSubmit = async () => {
  //     const selectedItemsArray = Array.from(selectedItems);

  //     if (selectedItemsArray.length === 0) {
  //       alert("Please select at least one item to submit");
  //       return;
  //     }

  //     const missingStatus = selectedItemsArray.filter((id) => !statusData[id]);
  //     if (missingStatus.length > 0) {
  //       alert(
  //         `Please select a status for all selected items. ${missingStatus.length} item(s) are missing status.`
  //       );
  //       return;
  //     }

  //     const missingNextDate = selectedItemsArray.filter(
  //       (id) => statusData[id] === "Extend date" && !nextTargetDate[id]
  //     );
  //     if (missingNextDate.length > 0) {
  //       alert(
  //         `Please select a next target date for all items with "Extend date" status. ${missingNextDate.length} item(s) are missing target date.`
  //       );
  //       return;
  //     }

  //     const missingRequiredImages = selectedItemsArray.filter((id) => {
  //       const item = delegation.find((account) => account.task_id === id);
  //       const requiresAttachment =
  //         item.require_attachment &&
  //         item.require_attachment.toUpperCase() === "YES";
  //       return requiresAttachment && !uploadedImages[id] && !item.image;
  //     });

  //     if (missingRequiredImages.length > 0) {
  //       alert(
  //         `Please upload images for all required attachments. ${missingRequiredImages.length} item(s) are missing required images.`
  //       );
  //       return;
  //     }

  //     setIsSubmitting(true);

  //     try {
  //       const selectedData = selectedItemsArray.map((id) => {
  //         const item = delegation.find((account) => account.task_id === id);

  //         const dbStatus = statusData[id] === "Done" ? "done" :
  //           statusData[id] === "Extend date" ? "extend" :
  //             statusData[id];

  //         return {
  //   task_id: item.task_id,
  //   given_by: item.given_by,
  //   name: item.name,
  //   task_description: item.task_description,
  //   task_start_date: item.task_start_date,
  //   planned_date: item.planned_date,
  //   status: dbStatus,
  //   next_extend_date: statusData[id] === "Extend date" ? nextTargetDate[id] : null,
  //   reason: remarksData[id] || "",
  //   image_url: uploadedImages[id] ? null : item.image,
  //   require_attachment: item.require_attachment
  // };

  //       });

  //       console.log("Selected Data for submission:", selectedData);

  //       const submissionPromises = selectedData.map(async (taskData) => {
  //         const taskImage = uploadedImages[taskData.task_id];

  //         return dispatch(
  //           insertDelegationDoneAndUpdate({
  //             selectedDataArray: [taskData],
  //             uploadedImages: taskImage ? { [taskData.task_id]: taskImage } : {},
  //           })
  //         );
  //       });

  //       const results = await Promise.allSettled(submissionPromises);

  //       const failedSubmissions = results.filter(result => result.status === 'rejected');

  //       if (failedSubmissions.length > 0) {
  //         console.error('Some submissions failed:', failedSubmissions);
  //         alert(`${failedSubmissions.length} out of ${selectedItemsArray.length} submissions failed. Please check the console for details.`);
  //       } else {
  //         setSuccessMessage(
  //           `Successfully submitted ${selectedItemsArray.length} task records!`
  //         );
  //       }

  //       setSelectedItems(new Set());
  //       setAdditionalData({});
  //       setRemarksData({});
  //       setStatusData({});
  //       setNextTargetDate({});

  //       setTimeout(() => {
  //         dispatch(delegationData());
  //         // dispatch(delegation_DoneData());
  //         dispatch(delegationDoneData());
  //       }, 1000);

  //     } catch (error) {
  //       console.error('Submission error:', error);
  //       alert('An error occurred during submission. Please try again.');
  //     } finally {
  //       setIsSubmitting(false);
  //     }
  //   };


  // const handleSubmit = async () => {
  //   if (selectedItems.size === 0) {
  //     alert("Please select at least one task");
  //     return;
  //   }

  //   const selectedData = Array.from(selectedItems).map((id) => {
  //     const item = delegation.find((x) => x.task_id === id);

  //     return {
  //       task_id: item.task_id,
  //       given_by: item.given_by,
  //       name: item.name,
  //       task_description: item.task_description,
  //       task_start_date: item.task_start_date,
  //       planned_date: item.planned_date,
  //       status:
  //         statusData[id] === "Done"
  //           ? "done"
  //           : statusData[id] === "Extend date"
  //           ? "extend"
  //           : null,
  //       next_extend_date:
  //         statusData[id] === "Extend date" ? nextTargetDate[id] : null,
  //       reason: remarksData[id] || "",
  //       image_url: null,
  //       require_attachment: item.require_attachment,
  //     };
  //   });

  //   const result = await dispatch(
  //     insertDelegationDoneAndUpdate({
  //       selectedDataArray: selectedData,
  //     })
  //   );

  //   if (result.meta.requestStatus === "fulfilled") {
  //     alert("Successfully submitted!");
  //   } else {
  //     alert("Submission failed!");
  //     console.error(result.payload);
  //   }

  //   setSelectedItems(new Set());
  //   setRemarksData({});
  //   setNextTargetDate({});
  //   setStatusData({});
  // };


  const handleSubmit = async () => {
    const selectedItemsArray = Array.from(selectedItems);

    if (selectedItemsArray.length === 0) {
      alert("Please select at least one task");
      return;
    }

    // Validation checks
    const missingStatus = selectedItemsArray.filter((id) => !statusData[id]);
    if (missingStatus.length > 0) {
      alert(`Please select status for all selected items. ${missingStatus.length} item(s) are missing status.`);
      return;
    }

    const missingNextDate = selectedItemsArray.filter(
      (id) => statusData[id] === "Extend date" && !nextTargetDate[id]
    );
    if (missingNextDate.length > 0) {
      alert(`Please select next target date for "Extend date" items. ${missingNextDate.length} item(s) are missing date.`);
      return;
    }


    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🔄 Starting submission process...');

      // Prepare data for submission
      const selectedData = selectedItemsArray.map((id) => {
        const item = delegation.find((x) => x.task_id === id);

        return {
          task_id: item.task_id,
          given_by: item.given_by,
          name: item.name,
          task_description: item.task_description,
          task_start_date: item.task_start_date,
          planned_date: item.planned_date,
          status: statusData[id] === "Done" ? "done" :
            statusData[id] === "Extend date" ? "extend" : null,
          next_extend_date: statusData[id] === "Extend date" ? nextTargetDate[id] : null,
          reason: remarksData[id] || "",
        };
      });

      console.log('📦 Data prepared for submission:', {
        itemCount: selectedData.length
      });

      const result = await submitDelegationDoneAction(selectedData);

      console.log('📨 Submission result:', result);

      if (result) {
        setSuccessMessage(`✅ Successfully submitted ${selectedItemsArray.length} tasks!`);

        // Reset form
        setSelectedItems(new Set());
        setRemarksData({});
        setNextTargetDate({});
        setStatusData({});

        // Refresh data after a short delay
        setTimeout(() => {
          fetchDelegationDataAction();
          fetchDelegationDoneDataAction();
        }, 2000);

      } else {
        throw new Error(result.payload || "Submission failed on server");
      }

    } catch (error) {
      console.error('❌ Submission error:', error);

      let errorMessage = "Submission failed. ";

      if (error.message.includes('Network error') || error.message.includes('network')) {
        errorMessage += "Please check your internet connection and try again.";
      } else if (error.message.includes('timeout')) {
        errorMessage += "The request timed out. Please try again.";
      } else if (error.message.includes('large')) {
        errorMessage = error.message;
      } else {
        errorMessage += error.message;
      }

      setError(errorMessage);
      setSuccessMessage(`❌ ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  const selectedItemsCount = selectedItems.size;

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
        <div className="flex flex-col gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-red-700">
            {showHistory
              ? CONFIG.PAGE_CONFIG.historyTitle
              : CONFIG.PAGE_CONFIG.title}
          </h1>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={
                  showHistory ? "Search by Task ID..." : "Search tasks..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              />
            </div>

            {!showHistory && (
              <div className="flex items-center gap-2">
                {/* <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" /> */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="flex-1 sm:flex-none border border-gray-300 rounded-md px-2 py-1 text-xs sm:text-sm"
                >
                  {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={toggleHistory}
                className="flex-1 sm:flex-none rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 py-2 px-3 sm:px-4 text-white shadow-sm transition-colors hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm sm:text-base"
              >
                {showHistory ? (
                  <div className="flex items-center justify-center">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Back to Tasks</span>
                    <span className="sm:hidden">Back</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <History className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">View History</span>
                    <span className="sm:hidden">History</span>
                  </div>
                )}
              </button>

              {!showHistory && (
                <button
                  onClick={handleSubmit}
                  disabled={selectedItemsCount === 0 || isSubmitting}
                  className="flex-1 sm:flex-none rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-2 px-3 sm:px-4 text-white shadow-sm transition-colors hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 text-sm sm:text-base"
                >
                  {isSubmitting
                    ? "Processing..."
                    : (
                      <>
                        <span className="hidden sm:inline">Submit Selected ({selectedItemsCount})</span>
                        <span className="sm:hidden">Submit ({selectedItemsCount})</span>
                      </>
                    )}
                </button>
              )}
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-3 rounded-md flex items-center justify-between text-sm sm:text-base">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-500 flex-shrink-0" />
              <span className="break-words">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage("")}
              className="text-green-500 hover:text-green-700 ml-2 flex-shrink-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        )}

        <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-3 sm:p-4">
            <h2 className="text-purple-700 font-medium text-sm sm:text-base">
              {showHistory
                ? `Completed ${CONFIG.SOURCE_SHEET_NAME} Tasks`
                : `Pending ${CONFIG.SOURCE_SHEET_NAME} Tasks`}
            </h2>
            {/* <p className="text-purple-600 text-xs sm:text-sm mt-1">
              {showHistory
                ? `${CONFIG.PAGE_CONFIG.historyDescription} ${userRole === "admin" ? "" : "your"
                } `
                : CONFIG.PAGE_CONFIG.description}
            </p> */}
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-600 text-sm sm:text-base">Loading task data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center text-sm sm:text-base">
              {error}{" "}
              <button
                className="underline ml-2"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : showHistory ? (
            <>
              {/* Simplified History Filters - Only Date Range */}
              <div className="p-3 sm:p-4 border-b border-purple-100 bg-gray-50">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center">
                      <span className="text-xs sm:text-sm font-medium text-purple-700">
                        Filter by Date Range:
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex items-center w-full sm:w-auto">
                        <label
                          htmlFor="start-date"
                          className="text-xs sm:text-sm text-gray-700 mr-1 whitespace-nowrap"
                        >
                          From
                        </label>
                        <input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="flex-1 sm:flex-none text-xs sm:text-sm border border-gray-200 rounded-md p-1"
                        />
                      </div>
                      <div className="flex items-center w-full sm:w-auto">
                        <label
                          htmlFor="end-date"
                          className="text-xs sm:text-sm text-gray-700 mr-1 whitespace-nowrap"
                        >
                          To
                        </label>
                        <input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="flex-1 sm:flex-none text-xs sm:text-sm border border-gray-200 rounded-md p-1"
                        />
                      </div>
                    </div>
                  </div>

                  {(startDate || endDate || searchTerm) && (
                    <button
                      onClick={resetFilters}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-xs sm:text-sm w-full sm:w-auto"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>

              {/* History Table - Mobile Responsive */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Timestamp
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Task ID
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        Task
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Next Target
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Remarks
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Given By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((history, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 whitespace-normal break-words">
                              {formatDateTimeForDisplay(history.created_at) ||
                                "—"}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {history.task_id || "—"}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 min-w-[200px] max-w-[300px]">
                            <div
                              className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words leading-relaxed"
                              title={history.task_description}
                            >
                              {history.task_description || "—"}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-normal ${history.status === "done"
                                ? "bg-green-100 text-green-800"
                                : history.status === "extend"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {history.status || "—"}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {formatDateTimeForDisplay(
                                history.next_extend_date
                              ) || "—"}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 bg-purple-50 min-w-[150px] max-w-[250px]">
                            <div
                              className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words leading-relaxed"
                              title={history.reason}
                            >
                              {history.reason || "—"}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {history.given_by || "—"}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm"
                        >
                          {searchTerm || startDate || endDate
                            ? "No historical records matching your filters"
                            : "No completed records found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Regular Tasks Table - Mobile Responsive */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Seq No.
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={
                          filteredDelegationTasks.length > 0 &&
                          selectedItems.size === filteredDelegationTasks.length
                        }
                        onChange={handleSelectAllItems}
                      />
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Task ID
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Department
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Given By
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Name
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Task Description
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-yellow-50">
                      Start Date
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-green-50">
                      Planned Date
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-blue-50">
                      Status
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-indigo-50">
                      Next Target
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] bg-purple-50">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDelegationTasks.length > 0 ? (
                    filteredDelegationTasks.map((account, index) => {
                      const isSelected = selectedItems.has(account.task_id);
                      const rowColorClass = getRowColor(account.color_code_for);
                      const sequenceNumber = index + 1;
                      return (
                        <tr
                          key={index}
                          className={`${isSelected ? "bg-purple-50" : ""
                            } hover:bg-gray-50 ${rowColorClass}`}
                        >
                          <td className="px-2 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {sequenceNumber}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              checked={isSelected}
                              onChange={(e) =>
                                handleCheckboxClick(e, account.task_id)
                              }
                            />
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {account.task_id || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {account.department || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {account.given_by || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {account.name || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 min-w-[200px] max-w-[300px]">
                            <div
                              className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words leading-relaxed"
                              title={account.task_description}
                            >
                              {account.task_description || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 bg-yellow-50">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {formatDateTimeForDisplay(
                                account.task_start_date
                              )}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 bg-green-50">
                            <div className="text-xs sm:text-sm text-gray-900 whitespace-normal break-words">
                              {formatDateTimeForDisplay(account.planned_date)}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 bg-blue-50">
                            <select
                              disabled={!isSelected}
                              value={statusData[account.task_id] || ""}
                              onChange={(e) =>
                                handleStatusChange(
                                  account.task_id,
                                  e.target.value
                                )
                              }
                              className="border border-gray-300 rounded-md px-2 py-1 w-full disabled:bg-gray-100 disabled:cursor-not-allowed text-xs sm:text-sm"
                            >
                              <option value="">Select</option>
                              <option value="Done">Done</option>
                              <option value="Extend date">Extend</option>
                            </select>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 bg-indigo-50">
                            <input
                              type="date"
                              disabled={
                                !isSelected ||
                                statusData[account.task_id] !== "Extend date"
                              }
                              value={nextTargetDate[account.task_id] || ""}
                              onChange={(e) => {
                                handleNextTargetDateChange(
                                  account.task_id,
                                  e.target.value
                                );
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full disabled:bg-gray-100 disabled:cursor-not-allowed text-xs sm:text-sm"
                            />
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 min-w-[150px] max-w-[250px] bg-purple-50">
                            <textarea
                              placeholder="Enter remarks"
                              disabled={!isSelected}
                              value={remarksData[account.task_id] || ""}
                              onChange={(e) =>
                                setRemarksData((prev) => ({
                                  ...prev,
                                  [account.task_id]: e.target.value,
                                }))
                              }
                              className="border rounded-md px-2 py-1 w-full border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-xs sm:text-sm resize-none whitespace-normal"
                              rows="2"
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm"
                      >
                        {searchTerm
                          ? "No tasks matching your search"
                          : "No pending tasks found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default DelegationDataPage;
