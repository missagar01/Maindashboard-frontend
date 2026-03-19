import { Loader2Icon, LoaderIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import axiosInstance from "@/api/checklist/axiosInstance.js";

function AssignTask() {
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [sheetData, setSheetData] = useState([]);
  const [doerName, setDoerName] = useState([]);
  const [giveByData, setGivenByData] = useState([]);
  const [taskStatusData, setTaskStatusData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  const [selectedMachine, setSelectedMachine] = useState("");
  const [filteredSerials, setFilteredSerials] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTaskDate, setEndTaskDate] = useState("");
  const [availableFrequencies, setAvailableFrequencies] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [filteredMachines, setFilteredMachines] = useState([]);

  const [selectedSerialNo, setSelectedSerialNo] = useState("");
  const [selectedGivenBy, setSelectedGivenBy] = useState("");
  const [selectedDoerName, setSelectedDoerName] = useState("");
  const [selectedTaskType, setSelectedTaskType] = useState("Maintenance");
  const [selectedTaskStatus, setSelectedTaskStatus] = useState("");
  const [needSoundTask, setNeedSoundTask] = useState("");
  const [temperature, setTemperature] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [description, setWorkDescription] = useState("");
  const [machineArea, setMachineArea] = useState("");
  const [partName, setPartName] = useState("");
  const [taskList, setTaskList] = useState([]);

  const [loaderSheetData, setLoaderSheetData] = useState(false);
  const [loaderWorkingDayData, setLoaderWorkingDayData] = useState(false);
  const [loaderSubmit, setLoaderSubmit] = useState(false);
  const [loaderMasterSheetData, setLoaderMasterSheetData] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [showTaskPreview, setShowTaskPreview] = useState(false);
  const [frequency, setFrequency] = useState("");
  const [workingDaysData, setWorkingDaysData] = useState([]);

  const [enableReminder, setEnableReminder] = useState(false);
  const [requireAttachment, setRequireAttachment] = useState(false);
  // Add these new state variables
  const [machineDepartment, setMachineDepartment] = useState("");
  const [doerDepartment, setDoerDepartment] = useState("");
  const [divisionOptions, setDivisionOptions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const startDateInputRef = useRef(null);
  const startTimeInputRef = useRef(null);

  const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();
  const CHECKLIST_API_BASE = `${BACKEND_URL}/api/checklist`;
  const MAINTENANCE_API_BASE = `${BACKEND_URL}/api/mainatce`;
  const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL || "";

  const SHEET_Id = import.meta.env.VITE_SHEET_ID || "";

  const getApiErrorMessage = (error, fallback) =>
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback;

  const openNativePicker = (inputRef) => {
    const input = inputRef?.current;
    if (input && typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch (error) {
        console.debug("Native picker open skipped:", error);
      }
    }
  };

  const getArrayPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  // Fetch departments from FormResponses sheet column J
  const fetchDepartments = async () => {
    try {
      const { data: result } = await axiosInstance.get(`${MAINTENANCE_API_BASE}/departments`);

      if (result.success && result.data) {
        setDepartmentOptions(result.data);
      }
    } catch (err) {
      console.error("Department fetch error:", err);
      toast.error(getApiErrorMessage(err, "Failed to fetch departments"));
    }
  };

  // Fetch unique divisions from backend
  const fetchDivisions = async () => {
    try {
      const { data: result } = await axiosInstance.get(`${CHECKLIST_API_BASE}/assign-task/divisions`);
      setDivisionOptions(getArrayPayload(result));
    } catch (err) {
      console.error("Division fetch error:", err);
      toast.error(getApiErrorMessage(err, "Failed to fetch divisions"));
    }
  };


  // ✅ Fetch machines dynamically from backend (Postgres)
  const fetchMachinesByDepartment = async (department) => {
    try {
      const { data: result } = await axiosInstance.get(`${MAINTENANCE_API_BASE}/form-responses`, {
        params: { department },
      });

      const rows = getArrayPayload(result);

      if (rows.length > 0) {
        const machineNames = [...new Set(rows.map((m) => m.machine_name).filter(Boolean))];
        setFilteredMachines(machineNames);
      } else {
        setFilteredMachines([]);
      }
    } catch (error) {
      console.error("Machine fetch error:", error);
      toast.error(getApiErrorMessage(error, "Failed to fetch machines"));
    }
  };



  // Filter machines based on selected department
  const filterMachinesByDepartment = () => {
    if (selectedDepartment && sheetData.length > 0) {
      const machines = [...new Set(
        sheetData
          .filter((item) => item.department === selectedDepartment)
          .map((item) => item.machine_name)
      )].filter(Boolean).sort();
      setFilteredMachines(machines);
    } else {
      const allMachines = [...new Set(sheetData.map((item) => item.machine_name))].filter(Boolean).sort();
      setFilteredMachines(allMachines);
    }
  };

  // Handle department change
  // Handle department change for Maintenance tasks
  const handleDepartmentChange = async (department) => {
    setSelectedDepartment(department);

    try {
      const { data: result } = await axiosInstance.get(`${MAINTENANCE_API_BASE}/dropdown`, {
        params: { department },
      });

      if (result.success) {
        setGivenByData(result.data.givenBy);
        setTaskStatusData(result.data.taskStatus);
        setPriorityData(result.data.priority);
        // Doer names should come from doer department, not machine department
      }
    } catch (err) {
      console.error("Department fetch error:", err);
      toast.error(getApiErrorMessage(err, "Failed to fetch dropdown data"));
    }

    // Fetch machines for this department
    fetchMachinesByDepartment(department);
  };



  // Handle machine change
  // const handleMachineChange = async (machineName) => {
  //   setSelectedMachine(machineName);
  //   if (!machineName) return;

  //   try {
  //     // const res = await fetch(
  //     //   `http://18.60.212.185:5050/api/form-responses?department=${selectedDepartment}&machine_name=${machineName}`
  //     // );


  //     const res = await fetch(
  //   `${BACKEND_URL}/form-responses?department=${selectedDepartment}&machine_name=${machineName}`
  // );

  //     const result = await res.json();

  //     if (result.success && result.data && result.data[0]?.serial_no) {
  //       setSelectedSerialNo(result.data[0].serial_no);
  //       toast.success(`✅ Serial found: ${result.data[0].serial_no}`);
  //     } else {
  //       toast.error("⚠️ No serial found for this machine");
  //     }
  //   } catch (error) {
  //     console.error("Serial fetch error:", error);
  //     toast.error("❌ Failed to fetch serial number");
  //   }
  // };


  const handleMachineChange = async (machineName) => {
    setSelectedMachine(machineName);
    if (!machineName) return;

    try {
      const { data: result } = await axiosInstance.get(`${MAINTENANCE_API_BASE}/machine-details`);

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        const matches = result.data.filter(
          (m) =>
            m.machine_name === machineName &&
            (!machineDepartment || m.department === machineDepartment)
        );

        const tagNumbers =
          matches
            .map((m) => m.tag_no)
            .filter(Boolean) || [];

        const serialNumbersFallback =
          tagNumbers.length > 0
            ? []
            : matches.map((m) => m.serial_no).filter(Boolean);

        const finalList = tagNumbers.length > 0 ? tagNumbers : serialNumbersFallback;

        if (finalList.length > 0) {
          setFilteredSerials(finalList);
          setSelectedSerialNo(finalList[0]);
          toast.success(`✅ Tag found: ${finalList.join(", ")}`);
        } else {
          setFilteredSerials([]);
          toast.error("⚠️ No tag found for this machine");
        }
      } else {
        setFilteredSerials([]);
        toast.error("⚠️ No machine details found");
      }
    } catch (error) {
      console.error("Tag fetch error:", error);
      toast.error(getApiErrorMessage(error, "Failed to fetch tag number"));
    }
  };



  // 🧠 Fetch dropdown data from backend API (Postgres)
  // Machine department change for Maintenance
  const handleMachineDepartmentChange = async (department) => {
    setMachineDepartment(department);
    setSelectedMachine("");
    setSelectedSerialNo("");
    setFilteredSerials([]);
    setSelectedDepartment(department);

    if (!department) {
      setFilteredMachines([]);
      return;
    }

    fetchMachinesByDepartment(department);
  };

  // Doer department change for Maintenance
  const handleDoerDepartmentChange = async (department) => {
    setDoerDepartment(department);
    setSelectedDoerName("");

    if (!department) {
      setDoerName([]);
      return;
    }

    try {
      const { data: result } = await axiosInstance.get(`${MAINTENANCE_API_BASE}/dropdown`, {
        params: { department },
      });

      if (result.success) {
        setDoerName(result.data?.doerName || []);
      }
    } catch (err) {
      console.error("Doer department fetch error:", err);
      toast.error(getApiErrorMessage(err, "Failed to fetch doer data"));
    }
  };

  // Update fetchDropdownData to not pre-fill doer data
  const fetchDropdownData = async () => {
    setLoaderMasterSheetData(true);
    try {
      const { data: result } = await axiosInstance.get(`${MAINTENANCE_API_BASE}/dropdown`);
      const dropdownData = result?.data || {};

      if (result.success && result.data) {
        setDepartmentOptions(dropdownData.departments || []);
        // These should come from machine department selection
        setGivenByData(dropdownData.givenBy || []);
        setTaskStatusData(dropdownData.taskStatus || []);
        setPriorityData(dropdownData.priority || []);
        // Don't set doerName here - it should come from doer department
      } else {
        toast.error("Failed to load dropdown data");
      }
    } catch (err) {
      console.error("Dropdown fetch error:", err);
      toast.error(getApiErrorMessage(err, "Failed to fetch dropdowns"));
    } finally {
      setLoaderMasterSheetData(false);
    }
  };

  useEffect(() => {
    // fetchDepartments();   // <-- Fetch departments from correct route
    fetchDropdownData();  // <-- Fetch other dropdowns
    fetchDivisions();
  }, []);

  useEffect(() => {
    filterMachinesByDepartment();
  }, [selectedDepartment, sheetData]);

  // const fetchWorkingDaysCalendar = async () => {
  //   try {
  //     const res = await fetch("http://18.60.212.185:5050/api/working-days");
  //     const result = await res.json();

  //     if (result.success && result.data.length > 0) {
  //       setWorkingDaysData(result.data);
  //       const lastDate = result.data[result.data.length - 1].working_date;
  //       setEndDate(lastDate);
  //     }
  //   } catch (err) {
  //     console.error("Error fetching working day calendar:", err);
  //     toast.error("❌ Failed to fetch working day calendar");
  //   }
  // };


  const fetchAllTasks = async () => {
    if (!SCRIPT_URL || !SHEET_Id) {
      return; // missing config; skip remote fetch
    }
    try {
      const SHEET_NAME_TASK = "Maitenance Task Assign";
      const res = await fetch(
        `${SCRIPT_URL}?sheetId=${SHEET_Id}&&sheet=${SHEET_NAME_TASK}`
      );
      const result = await res.json();
      if (result.success && result.table) {
        const headers = result.table.cols.map((col) => col.label);
        const rows = result.table.rows.map((rowObj) => {
          const row = rowObj.c;
          const rowData = {};
          row.forEach((cell, i) => {
            rowData[headers[i]] = cell?.v || "";
          });
          return rowData;
        });
        setTaskList(rows);
      }
    } catch (error) {
      console.error("Failed to fetch tasks for Task No generation", error);
    }
  };

  useEffect(() => {
    fetchWorkingDaysCalendar();
  }, [selectedTaskType]);

  useEffect(() => {
    fetchAllTasks();
  }, [selectedTaskType]);

  // Machine list and department data now come from backend
  const fetchSheetData = async () => {
    setLoaderSheetData(true);
    try {
      const { data: result } = await axiosInstance.get(`${MAINTENANCE_API_BASE}/form-responses`);
      setSheetData(getArrayPayload(result));
    } catch (err) {
      console.error("❌ Fetch error:", err);
    } finally {
      setLoaderSheetData(false);
    }
  };

  const fetchWorkingDaysCalendar = async () => {
    try {
      const { data: result } = await axiosInstance.get(`${MAINTENANCE_API_BASE}/working-days`);
      if (result.success && result.data) {
        setWorkingDaysData(result.data);
        const lastDate = result.data[result.data.length - 1].working_date;
        setEndDate(lastDate);
        return result.data;
      }
      return [];
    } catch (err) {
      console.error("❌ Error fetching working day calendar:", err);
      toast.error(getApiErrorMessage(err, "Failed to fetch working day calendar"));
      return [];
    }
  };


  useEffect(() => {
    fetchSheetData();          // still loads machine list etc.
  }, []);


  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffInDays = (end - start) / (1000 * 60 * 60 * 24);

      let frequencies = [];
      if (diffInDays >= 365) {
        frequencies = [
          "one-time",
          "Daily",
          "Weekly",
          "Monthly",
          "Quarterly",
          "Half Yearly",
          "Yearly",
        ];
      } else if (diffInDays >= 180) {
        frequencies = [
          "one-time",
          "Daily",
          "Weekly",
          "Monthly",
          "Quarterly",
          "Half Yearly",
        ];
      } else if (diffInDays >= 90) {
        frequencies = ["one-time", "Daily", "Weekly", "Monthly", "Quarterly"];
      } else if (diffInDays >= 30) {
        frequencies = ["one-time", "Daily", "Weekly", "Monthly"];
      } else if (diffInDays >= 7) {
        frequencies = ["one-time", "Daily", "Weekly"];
      } else if (diffInDays > 0) {
        frequencies = ["one-time", "Daily"];
      }

      setAvailableFrequencies(frequencies);
    } else {
      setAvailableFrequencies([]);
    }
  }, [startDate, endDate]);

  const formatDateTimeForStorage = (date, time) => {
    if (!date || !time) return "";

    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    const timeWithSeconds = time + ":00";

    return `${day}/${month}/${year} ${timeWithSeconds}`;
  };

  const formatDateToDDMMYYYY = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const findNextWorkingDay = (targetDate, workingDays) => {
    const targetDateStr = formatDateToDDMMYYYY(targetDate);

    if (workingDays.includes(targetDateStr)) {
      return targetDateStr;
    }

    let checkDate = new Date(targetDate);
    for (let i = 1; i <= 30; i++) {
      checkDate = addDays(targetDate, i);
      const checkDateStr = formatDateToDDMMYYYY(checkDate);
      if (workingDays.includes(checkDateStr)) {
        return checkDateStr;
      }
    }

    return targetDateStr;
  };

  const addDays = (date, days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  };

  const addMonths = (date, months) => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  };

  const addYears = (date, years) => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + years);
    return newDate;
  };


  const generateTasks = async () => {
    if (!startDate || !endDate || !startTime || (selectedTaskType === "Maintenance" ? !frequency : !endTaskDate)) {
      toast.error("Please fill in all required fields including date range, time and frequency");
      return;
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (startDateObj > endDateObj) {
      toast.error("End date must be after start date");
      return;
    }

    setLoaderWorkingDayData(true);

    try {
      const latestWorkingDays = await fetchWorkingDaysCalendar();
      const workingDaysSource =
        Array.isArray(latestWorkingDays) && latestWorkingDays.length > 0
          ? latestWorkingDays
          : workingDaysData;

      const workingDays = workingDaysSource.map(
        (d) =>
          new Date(d.working_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
      );

      const tasks = [];

      if (frequency === "one-time") {
        const taskDate = findNextWorkingDay(startDateObj, workingDays);
        if (!taskDate) {
          toast.error("No working days found in the selected date range");
          setLoaderWorkingDayData(false);
          return;
        }

        tasks.push({
          description,
          givenBy: selectedGivenBy,
          doer: selectedDoerName,
          dueDate: formatDateTimeForStorage(
            new Date(taskDate.split("/").reverse().join("-")),
            startTime
          ),
          status: "pending",
          frequency,
        });
      } else {
        let currentDate = new Date(startDateObj);
        let taskCount = 0;
        const maxTasks = 1000;

        while (currentDate <= endDateObj && taskCount < maxTasks) {
          const currentDateStr = formatDateToDDMMYYYY(currentDate);

          if (workingDays.includes(currentDateStr)) {
            tasks.push({
              description,
              givenBy: selectedGivenBy,
              doer: selectedDoerName,
              dueDate: formatDateTimeForStorage(currentDate, startTime),
              status: "pending",
              frequency,
            });
            taskCount++;
          }

          switch (frequency.toLowerCase()) {
            case "daily":
              currentDate = addDays(currentDate, 1);
              break;
            case "weekly":
              currentDate = addDays(currentDate, 7);
              break;
            case "monthly":
              currentDate = addMonths(currentDate, 1);
              break;
            case "quarterly":
              currentDate = addMonths(currentDate, 3);
              break;
            case "half yearly":
            case "half-yearly":
              currentDate = addMonths(currentDate, 6);
              break;
            case "yearly":
              currentDate = addYears(currentDate, 1);
              break;
            default:
              currentDate = addDays(currentDate, 1);
              break;
          }
        }
      }

      if (tasks.length === 0) {
        toast.error("No tasks generated - check your date range and working days");
        setLoaderWorkingDayData(false);
        return;
      }

      setGeneratedTasks(tasks);
      setShowTaskPreview(true);
      toast.success(`Generated ${tasks.length} tasks between ${formatDateToDDMMYYYY(startDateObj)} and ${formatDateToDDMMYYYY(endDateObj)}`);
    } finally {
      setLoaderWorkingDayData(false);
    }
  };

  const uploadImageToDrive = async (file, taskNo) => {
    if (!file || (!SCRIPT_URL && !REPAIR_SCRIPT_URL)) {
      return ""; // no upload target configured
    }
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];

        try {
          const uploadScriptUrl = SCRIPT_URL;

          const response = await fetch(uploadScriptUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              action: "uploadFile",
              base64Data: base64Data,
              fileName: `${taskNo}_${Date.now()}_${file.name}`,
              mimeType: file.type,
              folderId: FOLDER_ID,
            }).toString(),
          });

          const data = await response.json();

          if (data.success && data.fileUrl) {
            resolve(data.fileUrl);
          } else {
            toast.error("❌ Image upload failed");
            resolve("");
          }
        } catch (err) {
          console.error("Upload error:", err);
          toast.error("❌ Image upload failed due to network error");
          resolve("");
        }
      };

      reader.onerror = () => {
        reject("❌ Failed to read file");
      };

      reader.readAsDataURL(file);
    });
  };


  const handleSubmitForm = async (e) => {
    e.preventDefault();

    try {
      setLoaderSubmit(true);

      if (selectedTaskType === "Maintenance") {
        // ✅ OPTIMIZED: Send all tasks in a single bulk request instead of one-by-one
        if (generatedTasks.length === 0) {
          toast.error("❌ No generated tasks to assign. Please preview first.");
          return;
        }

        // Prepare all tasks for bulk submission
        const tasksPayload = generatedTasks.map((task) => ({
          serial_no: selectedSerialNo,
          tag_no: selectedSerialNo,
          machine_name: selectedMachine,
          given_by: selectedGivenBy,
          doer_name: selectedDoerName,
          task_type: selectedTaskType,
          machine_area: machineArea,
          part_name: partName,
          need_sound_test: needSoundTask,
          temperature: temperature,
          enable_reminders: enableReminder ? "Yes" : "No",
          require_attachment: requireAttachment ? "Yes" : "No",
          task_start_date: task.dueDate,
          frequency: frequency,
          description: description,
          priority: selectedPriority,
          task_status: selectedTaskStatus,
          machine_department: machineDepartment,
          doer_department: doerDepartment,
          division: selectedDivision,
        }));

        // ✅ Single bulk API call - much faster than individual calls
        const { data: result } = await axiosInstance.post(
          `${MAINTENANCE_API_BASE}/maintenance-tasks/bulk`,
          { tasks: tasksPayload }
        );
        if (!result.success) {
          throw new Error(result.error || "Bulk insert failed");
        }

        toast.success(
          `✅ ${generatedTasks.length} Maintenance Tasks assigned successfully!`
        );
      }



      // ✅ Clear form after success - but keep task type so user can submit another task
      setSelectedSerialNo("");
      setSelectedMachine("");
      setSelectedGivenBy("");
      setSelectedDoerName("");
      setSelectedTaskStatus("");
      // Don't reset selectedTaskType - let user continue with the same task type
      // setSelectedTaskType("Select Task Type");
      setStartDate("");
      setFrequency("");
      setWorkDescription("");
      setSelectedPriority("");
      setShowTaskPreview(false);
      setStartTime("");
      setEndTime("");
      setEnableReminder(false);
      setRequireAttachment(false);
      setMachineArea("");
      setPartName("");
      setNeedSoundTask("");
      setTemperature("");
      setImageFile(null);
      setGeneratedTasks([]);
      setEndTaskDate("");
      setSelectedDivision("");

      // ✅ Refetch working days to restore endDate for frequency dropdown
      if (selectedTaskType === "Maintenance") {
        fetchWorkingDaysCalendar();
      }
      // Don't reset departments either - keeps context for next task
      // setSelectedDepartment("");
      // setMachineDepartment("");
      // setDoerDepartment("");
    } catch (error) {
      console.error("❌ Submission failed:", error);
      toast.error(`❌ Failed to assign task: ${getApiErrorMessage(error, "Unknown error")}`);
    } finally {
      setLoaderSubmit(false);
    }
  };


  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-6 text-center">Assign Task</h1>
      <div className="flex justify-center">
        <div className="bg-white rounded-lg shadow p-6 w-[90vw]">
          <form className="space-y-4" onSubmit={handleSubmitForm}>
            <div className="space-y-4">
              {/* Division Dropdown */}
              <div>
                <label
                  htmlFor="division"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Division Name
                </label>
                <select
                  id="division"
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Division</option>
                  {divisionOptions.map((divName, index) => (
                    <option key={index} value={divName}>
                      {divName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Machine Department Dropdown */}
              <div>
                <label
                  htmlFor="machineDepartment"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Machine Department
                </label>
                <select
                  id="machineDepartment"
                  value={machineDepartment}
                  onChange={(e) => handleMachineDepartmentChange(e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Machine Department</option>
                  {departmentOptions.map((dept, index) => (
                    <option key={index} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doer Department Dropdown */}
              <div className="mt-4">
                <label
                  htmlFor="doerDepartment"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Doer Department
                </label>
                <select
                  id="doerDepartment"
                  value={doerDepartment}
                  onChange={(e) => handleDoerDepartmentChange(e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Doer Department</option>
                  {departmentOptions.map((dept, index) => (
                    <option key={index} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="block md:flex md:justify-between md:space-x-4">
                {/* Left Section */}
                <div className="w-full md:w-[45%] space-y-4 mb-4 md:mb-0">
                  {/* Machine Name Dropdown - Only enabled when machine department is selected */}
                  <div>
                    <label
                      htmlFor="machineName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Machine Name
                    </label>
                    <select
                      id="machineName"
                      value={selectedMachine}
                      onChange={(e) => handleMachineChange(e.target.value)}
                      className="w-full py-2 rounded-md border border-gray-300 shadow-sm px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!machineDepartment}
                    >
                      <option value="">Select Machine</option>
                      {loaderMasterSheetData ? (
                        <option className="flex gap-5 items-center justify-center">
                          <Loader2Icon className="animate-spin text-red-500" />
                          <h1>Wait Please...</h1>
                        </option>
                      ) : (
                        filteredMachines.map((machineName, index) => (
                          <option key={index} value={machineName}>
                            {machineName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Tag No Dropdown */}
                  {selectedMachine && !loaderSheetData && (
                    <div>
                      <label
                        htmlFor="serialNo"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Tag Number
                      </label>
                      <select
                        id="serialNo"
                        onChange={(e) => setSelectedSerialNo(e.target.value)}
                        className="py-2 w-full rounded-md border border-gray-300 shadow-sm px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Tag No</option>
                        {filteredSerials.map((serial, idx) => (
                          <option key={idx} value={serial}>
                            {serial}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Given By */}
                  <div>
                    <label
                      htmlFor="givenBy"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Given By
                    </label>
                    <select
                      id="givenBy"
                      value={selectedGivenBy}
                      onChange={(e) => setSelectedGivenBy(e.target.value)}
                      className="py-2 w-full rounded-md border border-gray-300 shadow-sm px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Given By</option>
                      {loaderMasterSheetData ? (
                        <>
                          <option className="flex gap-5 items-center justify-center">
                            <Loader2Icon className="animate-spin text-red-500" />
                            <h1>Wait Please...</h1>
                          </option>
                        </>
                      ) : (
                        giveByData.map(
                          (item, index) =>
                            item && (
                              <option key={index} value={item}>
                                {item}
                              </option>
                            )
                        )
                      )}
                    </select>
                  </div>

                  {/* Doer's Name - Only enabled when doer department is selected */}
                  <div>
                    <label
                      htmlFor="doerName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Doer's Name
                    </label>
                    <select
                      id="doerName"
                      value={selectedDoerName}
                      onChange={(e) => setSelectedDoerName(e.target.value)}
                      className="py-2 rounded-md w-full border border-gray-300 shadow-sm px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!doerDepartment}
                    >
                      <option value="">Select Doer Name</option>
                      {loaderMasterSheetData ? (
                        <option className="flex gap-5 items-center justify-center">
                          <Loader2Icon className="animate-spin text-red-500" />
                          <h1>Wait Please...</h1>
                        </option>
                      ) : (
                        doerName.map(
                          (item, index) =>
                            item && (
                              <option key={index} value={item}>
                                {item}
                              </option>
                            )
                        )
                      )}
                    </select>
                  </div>

                  {/* Task Temperature */}
                  <div>
                    <label
                      htmlFor="temperature"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Temperature
                    </label>
                    <select
                      id="temperature"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Temperature</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>

                {/* Right Section - REST OF YOUR CODE REMAINS THE SAME */}
                <div className="w-full md:w-[45%] space-y-4">
                  {/* Task Status */}
                  <div>
                    <label
                      htmlFor="taskStatus"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Task Status
                    </label>
                    <select
                      id="taskStatus"
                      value={selectedTaskStatus}
                      onChange={(e) => setSelectedTaskStatus(e.target.value)}
                      className="py-2 w-full rounded-md border border-gray-300 shadow-sm px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Task Status</option>
                      {loaderMasterSheetData ? (
                        <option className="flex gap-5 items-center justify-center">
                          <Loader2Icon className="animate-spin text-red-500" />
                          <h1>Wait Please...</h1>
                        </option>
                      ) : (
                        taskStatusData.map(
                          (item, index) =>
                            item && (
                              <option key={index} value={item}>
                                {item}
                              </option>
                            )
                        )
                      )}
                    </select>
                  </div>

                  {/* Machine Area */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Machine Area
                    </label>
                    <input
                      id="description"
                      onChange={(e) => setMachineArea(e.target.value)}
                      value={machineArea}
                      rows={4}
                      className="py-2 w-full rounded-md border border-gray-300 shadow-sm px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter task description..."
                    />
                  </div>

                  {/* Part Name */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Part Name
                    </label>
                    <input
                      id="description"
                      onChange={(e) => setPartName(e.target.value)}
                      value={partName}
                      rows={4}
                      className="py-2 w-full rounded-md border border-gray-300 shadow-sm px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter task description..."
                    />
                  </div>

                  {/* Task Type */}
                  <div>
                    <label
                      htmlFor="needSoundTest"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Need Sound Test
                    </label>
                    <select
                      id="needSoundTest"
                      value={needSoundTask}
                      onChange={(e) => setNeedSoundTask(e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Need Sound Test</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label
                      htmlFor="priority"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Priority</option>
                      {loaderMasterSheetData ? (
                        <option className="flex gap-5 items-center justify-center">
                          <Loader2Icon className="animate-spin text-red-500" />
                          <h1>Wait Please...</h1>
                        </option>
                      ) : (
                        priorityData.map(
                          (item, index) =>
                            item && (
                              <option key={index} value={item}>
                                {item}
                              </option>
                            )
                        )
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Work Description - REST OF YOUR CODE REMAINS THE SAME */}
              <div className="mt-4">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Work Description
                </label>
                <textarea
                  id="description"
                  onChange={(e) => setWorkDescription(e.target.value)}
                  value={description}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task description..."
                />
              </div>

              {/* Start Date, Time, and Frequency */}
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mt-4">
                <div className="w-full md:w-1/3">
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Task Start Date
                  </label>
                  <input
                    ref={startDateInputRef}
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={() => openNativePicker(startDateInputRef)}
                    onFocus={() => openNativePicker(startDateInputRef)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  />
                </div>

                {/* Task Time */}
                <div className="w-full md:w-1/3">
                  <label
                    htmlFor="startTime"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Task Time
                  </label>
                  <input
                    ref={startTimeInputRef}
                    type="time"
                    id="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    onClick={() => openNativePicker(startTimeInputRef)}
                    onFocus={() => openNativePicker(startTimeInputRef)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  />
                </div>

                {/* Frequency */}
                <div className="w-full md:w-1/3">
                  <label
                    htmlFor="frequency"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Frequency
                  </label>
                  <select
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={availableFrequencies.length === 0}
                  >
                    <option value="">Select Frequency</option>
                    {availableFrequencies.map((freq, idx) => (
                      <option key={idx} value={freq.toLowerCase()}>
                        {freq}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Generated */}
              <button
                type="button"
                disabled={loaderWorkingDayData}
                onClick={generateTasks}
                className={`w-full flex items-center justify-center gap-2 mb-4 px-4 py-2 text-sm bg-blue-100 border border-blue-400 text-blue-700 rounded hover:bg-blue-200 mt-4 ${loaderWorkingDayData ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {loaderWorkingDayData && (
                  <LoaderIcon className="animate-spin w-4 h-4" />
                )}
                Preview Generated Tasks
              </button>

              {showTaskPreview && (
                <div className="bg-blue-50 border border-blue-300 p-4 rounded-lg">
                  <div className="text-blue-800 font-semibold mb-2">
                    {generatedTasks.length} Tasks Generated (Will be stored in Checklist sheet)
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-3">
                    {generatedTasks.slice(0, 10).map((task, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded p-3 shadow-sm border border-blue-200"
                      >
                        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded inline-block mb-1">
                          Reminders
                        </div>
                        <div className="text-sm">{task.description}</div>
                        <div className="text-xs text-gray-600">
                          Due: {task.dueDate} | Doer: {task.doer || "N/A"}
                        </div>
                      </div>
                    ))}
                    {generatedTasks.length > 10 && (
                      <div className="text-xs text-blue-600 italic">
                        ...and {generatedTasks.length - 10} more tasks
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="w-full mt-6">
                <h1 className="text-[1.4rem] text-blue-700 mb-5">
                  Additional Option
                </h1>
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h1 className="text-[1.2rem] text-blue-600">
                        Enable Reminder
                      </h1>
                      <h1 className="text-[1rem] text-blue-500">
                        Send reminders before task due date
                      </h1>
                    </div>
                    <div
                      onClick={() => setEnableReminder((prev) => !prev)}
                      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${enableReminder ? "bg-blue-600" : "bg-gray-200"
                        }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enableReminder ? "translate-x-5" : "translate-x-0"
                          }`}
                      ></div>
                    </div>
                  </div>

                  {/* <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h1 className="text-[1.2rem] text-blue-600">
                        Require Attachment
                      </h1>
                      <h1 className="text-[1rem] text-blue-500">
                        User must upload a file when completing task
                      </h1>
                    </div>
                    <div
                      onClick={() => setRequireAttachment((prev) => !prev)}
                      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${requireAttachment ? "bg-blue-600" : "bg-gray-200"
                        }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${requireAttachment
                          ? "translate-x-5"
                          : "translate-x-0"
                          }`}
                      ></div>
                    </div>
                  </div> */}
                </div>
              </div>

              {/* submit button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loaderSubmit}
                  className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loaderSubmit ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                  {loaderSubmit && (
                    <LoaderIcon className="animate-spin w-4 h-4" />
                  )}
                  {loaderSubmit ? "Assigning..." : "Assign Task"}
                </button>
              </div>
            </div>



          </form>
        </div>
      </div >
    </div >
  );
}

export default AssignTask;
