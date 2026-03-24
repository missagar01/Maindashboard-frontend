import { useState, useEffect } from "react";
import { BellRing, FileCheck, Calendar, Clock, Loader2 } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { fetchWorkingDaysApi } from "@/api/checklist/assignTaskApi.js";
// import supabase from "../../SupabaseClient";

// Reusable dropdown with loading state
const DropdownField = ({ label, id, name, value, onChange, required, disabled, loading, placeholder, children, hint }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled || loading}
        className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 transition-all ${
          loading || disabled
            ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            : "border-gray-300 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500"
        }`}
      >
        <option value="">{loading ? "Loading..." : placeholder}</option>
        {!loading && children}
      </select>
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        </div>
      )}
    </div>
    {hint && !loading && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

// Calendar Component (defined outside)
const CalendarComponent = ({ date, onChange, onClose }) => {


  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };
  // console.log(fetchUniqueDepartmentDataApi())
  // console.log(fetchUniqueGivenByDataApi())
  // console.log(fetchUniqueDoerNameDataApi())


  const handleDateClick = (day) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onChange(selectedDate);
    onClose();
  };

  const renderDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
    const firstDayOfMonth = getFirstDayOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        date &&
        date.getDate() === day &&
        date.getMonth() === currentMonth.getMonth() &&
        date.getFullYear() === currentMonth.getFullYear();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${isSelected
            ? "bg-purple-600 text-white"
            : "hover:bg-purple-100 text-gray-700"
            }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  return (
    <div className="p-2 bg-white border border-gray-200 rounded-md shadow-md">
      <div className="flex justify-between items-center mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &lt;
        </button>
        <div className="text-sm font-medium">
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="h-8 w-8 flex items-center justify-center text-xs text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
};

// Helper functions for date manipulation
const formatDate = (date) => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

const formatDateToDDMMYYYY = (date) => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function AssignTask() {
  const { 
    assignTaskState, 
    fetchUniqueDepartmentDataAction, 
    fetchUniqueGivenByDataAction, 
    fetchUniqueDivisionDataAction, 
    fetchUniqueDoerNameDataAction, 
    pushAssignTaskAction 
  } = useAuth();

  const { department, doerName, givenBy, division } = assignTaskState || {};

  const userRole = localStorage.getItem('role');
  const username = localStorage.getItem('user-name');

  // Filter doer names based on role
  const filteredDoerNames = userRole === 'admin'
    ? (doerName || [])
    : (doerName || []).filter(doer => doer?.toLowerCase() === username?.toLowerCase());

  // Loading states for each dropdown group
  const [loadingMeta, setLoadingMeta] = useState(true); // division, department, givenBy
  const [loadingDoers, setLoadingDoers] = useState(false); // doer names

  useEffect(() => {
    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        await Promise.all([
          fetchUniqueDepartmentDataAction(username),
          fetchUniqueGivenByDataAction(),
          fetchUniqueDivisionDataAction(),
        ]);
      } finally {
        setLoadingMeta(false);
      }
    };
    loadMeta();
  }, []);


  const [date, setSelectedDate] = useState(null);
  const [time, setTime] = useState("09:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState([]);

  const frequencies = [
    { value: "one-time", label: "One Time (No Recurrence)" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "fortnightly", label: "Fortnightly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
    { value: "end-of-1st-week", label: "End of 1st Week" },
    { value: "end-of-2nd-week", label: "End of 2nd Week" },
    { value: "end-of-3rd-week", label: "End of 3rd Week" },
    { value: "end-of-4th-week", label: "End of 4th Week" },
    { value: "end-of-last-week", label: "End of Last Week" },
  ];


  const [formData, setFormData] = useState({
    division: "",
    department: "",
    givenBy: "",
    doer: "",
    description: "",
    frequency: "daily",
    enableReminders: true,
  });


  // Fetch working days from Supabase on component mount
  useEffect(() => {
    const fetchWorkingDays = async () => {
      try {
        const payload = await fetchWorkingDaysApi();

        const data = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        const formattedDays = data.map((day) => {
          const date = new Date(day.working_date);
          return formatDateToDDMMYYYY(date);
        });

        setWorkingDays(formattedDays);
      } catch (error) {
        console.error(
          "Error fetching working days:",
          error?.response?.data?.error || error?.response?.data?.message || error?.message || error
        );
      }
    };

    fetchWorkingDays();
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "division") {
      setFormData((prev) => ({ ...prev, [name]: value, department: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (name, e) => {
    setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
  };

  const getFormattedDate = (date) => {
    if (!date) return "Select a date";
    return formatDate(date);
  };

  const formatDateTimeForStorage = (date, time) => {
    if (!date || !time) return "";
    const dateString = date.toISOString().split("T")[0];
    return `${dateString}T${time}:00`;
  };

  const findNextWorkingDay = (targetDate) => {
    const targetDateStr = formatDateToDDMMYYYY(targetDate);

    // If target date is a working day, return it
    if (workingDays.includes(targetDateStr)) {
      return targetDateStr;
    }

    // Find the next working day after target date
    const targetDateObj = new Date(
      targetDateStr.split("/").reverse().join("-")
    );
    const nextWorkingDay = workingDays.find((day) => {
      const dayObj = new Date(day.split("/").reverse().join("-"));
      return dayObj > targetDateObj;
    });

    return nextWorkingDay || targetDateStr;
  };

  const findEndOfWeekDate = (date, weekNumber) => {
    const [targetDay, targetMonth, targetYear] = formatDateToDDMMYYYY(date)
      .split("/")
      .map(Number);

    // Filter working days for the target month
    const monthDays = workingDays.filter((day) => {
      const [dayDay, dayMonth, dayYear] = day.split("/").map(Number);
      return dayYear === targetYear && dayMonth === targetMonth;
    });

    if (weekNumber === -1) {
      // Last week of month
      return monthDays[monthDays.length - 1];
    }

    // Group by weeks (assuming week_num from Supabase is correct)
    const weeks = {};
    monthDays.forEach((day) => {
      const [dayDay, dayMonth, dayYear] = day.split("/").map(Number);
      const dayObj = new Date(dayYear, dayMonth - 1, dayDay);
      const weekNum = Math.ceil(dayDay / 7);
      if (!weeks[weekNum]) weeks[weekNum] = [];
      weeks[weekNum].push(day);
    });

    // Get the last day of the requested week
    const weekDays = weeks[weekNumber];
    return weekDays ? weekDays[weekDays.length - 1] : monthDays[monthDays.length - 1];
  };

  const generateTasks = async () => {
    if (
      !date ||
      !time ||
      !formData.doer ||
      !formData.description ||
      !formData.frequency ||
      !formData.division // Ensure division is selected
    ) {
      alert("Please fill in all required fields including division, date and time.");
      return;
    }

    if (workingDays.length === 0) {
      alert("Working days data not loaded yet. Please try again.");
      return;
    }

    const selectedDate = new Date(date);
    const tasks = [];

    // For one-time tasks
    if (formData.frequency === "one-time") {
      const taskDateStr = findNextWorkingDay(selectedDate);
      const taskDateTimeStr = formatDateTimeForStorage(
        new Date(taskDateStr.split("/").reverse().join("-")),
        time
      );

      tasks.push({
        description: formData.description,
        department: formData.department,
        givenBy: formData.givenBy,
        doer: formData.doer,
        dueDate: taskDateTimeStr,
        status: "pending",
        frequency: formData.frequency,
        enableReminders: formData.enableReminders,
        requireAttachment: formData.requireAttachment,
        division: formData.division, // NEW
      });
    } else {
      // For recurring tasks
      let currentDate = new Date(selectedDate);
      const endDate = addYears(currentDate, 2); // Generate up to 2 years ahead
      let taskCount = 0;
      const maxTasks = 365; // Safety limit

      while (currentDate <= endDate && taskCount < maxTasks) {
        let taskDate;

        switch (formData.frequency) {
          case "daily":
            taskDate = findNextWorkingDay(currentDate);
            currentDate = addDays(new Date(taskDate.split("/").reverse().join("-")), 1);
            break;

          case "weekly":
            taskDate = findNextWorkingDay(currentDate);
            currentDate = addDays(new Date(taskDate.split("/").reverse().join("-")), 7);
            break;

          case "fortnightly":
            taskDate = findNextWorkingDay(currentDate);
            currentDate = addDays(new Date(taskDate.split("/").reverse().join("-")), 14);
            break;

          case "monthly":
            taskDate = findNextWorkingDay(currentDate);
            currentDate = addMonths(new Date(taskDate.split("/").reverse().join("-")), 1);
            break;

          case "quarterly":
            taskDate = findNextWorkingDay(currentDate);
            currentDate = addMonths(new Date(taskDate.split("/").reverse().join("-")), 3);
            break;

          case "yearly":
            taskDate = findNextWorkingDay(currentDate);
            currentDate = addYears(new Date(taskDate.split("/").reverse().join("-")), 1);
            break;

          case "end-of-1st-week":
          case "end-of-2nd-week":
          case "end-of-3rd-week":
          case "end-of-4th-week":
            const weekNum = parseInt(formData.frequency.split("-")[2]);
            taskDate = findEndOfWeekDate(currentDate, weekNum);
            currentDate = addMonths(new Date(taskDate.split("/").reverse().join("-")), 1);
            break;

          case "end-of-last-week":
            taskDate = findEndOfWeekDate(currentDate, -1);
            currentDate = addMonths(new Date(taskDate.split("/").reverse().join("-")), 1);
            break;

          default:
            currentDate = endDate; // Exit loop for unknown frequencies
            break;
        }

        if (taskDate) {
          const taskDateTimeStr = formatDateTimeForStorage(
            new Date(taskDate.split("/").reverse().join("-")),
            time
          );

          tasks.push({
            description: formData.description,
            department: formData.department,
            givenBy: formData.givenBy,
            doer: formData.doer,
            dueDate: taskDateTimeStr,
            status: "pending",
            frequency: formData.frequency,
            enableReminders: formData.enableReminders,
            requireAttachment: false,
            division: formData.division, // NEW
          });

          taskCount++;
        }
      }
    }

    setGeneratedTasks(tasks);
    setAccordionOpen(true);
  };

  useEffect(() => {
    if (formData.department) {
      const loadDoers = async () => {
        setLoadingDoers(true);
        try {
          await fetchUniqueDoerNameDataAction(formData.department);
        } finally {
          setLoadingDoers(false);
        }
      };
      loadDoers();
    }
  }, [formData.department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (generatedTasks.length === 0) {
        alert("Please generate tasks first by clicking Preview Generated Tasks");
        setIsSubmitting(false);
        return;
      }

      await pushAssignTaskAction(generatedTasks);
      alert(`Successfully submitted ${generatedTasks.length} tasks!`);

      // Reset form
      setFormData({
        division: "",
        department: "",
        givenBy: "",
        doer: "",
        description: "",
        frequency: "daily",
        enableReminders: true,
      });
      setSelectedDate(null);
      setTime("09:00");
      setGeneratedTasks([]);
      setAccordionOpen(false);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to assign tasks. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateForDisplay = (dateTimeStr) => {
    return dateTimeStr;
  };

  const getFormattedDateTime = () => {
    if (!date) return "Select date and time";
    const dateStr = formatDate(date);
    const timeStr = time || "09:00";
    return `${dateStr} at ${timeStr}`;
  };

  // UPDATED: Date formatting function to return DD/MM/YYYY format (for working days comparison)
  const formatDateToDDMMYYYY = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  return (
    // <AdminLayout>
    <div className="w-full">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Task Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">Fill in the details to assign a new checklist task to a staff member.</p>
          </div>
          <div className="p-5 space-y-5">

            {/* Row 1 – Division + Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DropdownField
                id="division" name="division" label="Division"
                value={formData.division} onChange={handleChange}
                required loading={loadingMeta}
                placeholder="Select Division"
              >
                {(division || []).filter(d => d && d !== "null" && d !== "NULL").map((divName, i) => (
                  <option key={i} value={divName}>{divName}</option>
                ))}
              </DropdownField>

              <DropdownField
                id="department" name="department" label="Department"
                value={formData.department} onChange={handleChange}
                required
                loading={loadingMeta}
                disabled={!formData.division}
                placeholder="Select Department"
                hint={!formData.division ? "Select a division first" : undefined}
              >
                {(department || []).filter(d => d && d.division === formData.division).map((deptObj, i) => (
                  <option key={i} value={deptObj.department}>{deptObj.department}</option>
                ))}
              </DropdownField>
            </div>

            {/* Row 2 – Given By + Doer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DropdownField
                id="givenBy" name="givenBy" label="Given By"
                value={formData.givenBy} onChange={handleChange}
                required loading={loadingMeta}
                placeholder="Select Given By"
              >
                {(givenBy || []).map((person, i) => (
                  <option key={i} value={person}>{person}</option>
                ))}
              </DropdownField>

              <DropdownField
                id="doer" name="doer" label="Doer's Name"
                value={formData.doer} onChange={handleChange}
                required
                loading={loadingDoers}
                disabled={!formData.department}
                placeholder="Select Doer"
                hint={!formData.department ? "Select a department first" : undefined}
              >
                {filteredDoerNames.map((doer, i) => (
                  <option key={i} value={doer}>{doer}</option>
                ))}
              </DropdownField>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-purple-700"
              >
                Task Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter task description"
                rows={4}
                required
                className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Date, Time and Frequency */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Date Picker */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-purple-700">
                  Task Start Date
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full flex justify-start items-center rounded-md border border-purple-200 p-2 text-left focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <Calendar className="mr-2 h-4 w-4 text-purple-500" />
                    {date ? getFormattedDate(date) : "Select a date"}
                  </button>
                  {showCalendar && (
                    <div className="absolute z-10 mt-1">
                      <CalendarComponent
                        date={date}
                        onChange={setSelectedDate}
                        onClose={() => setShowCalendar(false)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* NEW: Time Picker */}
              <div className="space-y-2">
                <label
                  htmlFor="time"
                  className="block text-sm font-medium text-purple-700"
                >
                  Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    id="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 pl-8"
                  />
                  <Clock className="absolute left-2 top-2.5 h-4 w-4 text-purple-500" />
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <label
                  htmlFor="frequency"
                  className="block text-sm font-medium text-purple-700"
                >
                  Frequency
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {frequencies.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* NEW: DateTime Display */}
            {date && time && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                <p className="text-sm text-purple-700">
                  <strong>Selected Date & Time:</strong> {getFormattedDateTime()}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Will be stored as: {formatDateTimeForStorage(date, time)}
                </p>
              </div>
            )}

            {/* Additional Options */}
            <div className="space-y-4 pt-2 border-t border-purple-100">
              <h3 className="text-lg font-medium text-purple-700 pt-2">
                Additional Options
              </h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    htmlFor="enable-reminders"
                    className="text-purple-700 font-medium"
                  >
                    Enable Reminders
                  </label>
                  <p className="text-sm text-purple-600">
                    Send reminders before task due date
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <BellRing className="h-4 w-4 text-purple-500" />
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="enable-reminders"
                      checked={formData.enableReminders}
                      onChange={(e) =>
                        handleSwitchChange("enableReminders", e)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

            </div>

            {/* Preview and Submit Buttons */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={generateTasks}
                className="w-full rounded-md border border-purple-200 bg-purple-50 py-2 px-4 text-purple-700 hover:bg-purple-100 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Preview Generated Tasks
              </button>

              {generatedTasks.length > 0 && (
                <div className="w-full">
                  <div className="border border-purple-200 rounded-md">
                    <button
                      type="button"
                      onClick={() => setAccordionOpen(!accordionOpen)}
                      className="w-full flex justify-between items-center p-4 text-purple-700 hover:bg-purple-50 focus:outline-none"
                    >
                      <span className="font-medium">
                        {generatedTasks.length} Tasks Generated
                        {formData.frequency === "one-time"
                          ? " (Will be stored in DELEGATION sheet)"
                          : " (Will be stored in Checklist sheet)"
                        }
                      </span>
                      <svg
                        className={`w-5 h-5 transition-transform ${accordionOpen ? "rotate-180" : ""
                          }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {accordionOpen && (
                      <div className="p-4 border-t border-purple-200">
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {generatedTasks.slice(0, 20).map((task, index) => (
                            <div
                              key={index}
                              className="text-sm p-2 border rounded-md border-purple-200 bg-purple-50"
                            >
                              <div className="font-medium text-purple-700">
                                {task.description}
                              </div>
                              <div className="text-xs text-purple-600">
                                Due: {formatDateForDisplay(task.dueDate)} | Department: {task.department}
                              </div>
                              <div className="flex space-x-2 mt-1">
                                {task.enableReminders && (
                                  <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                    <BellRing className="h-3 w-3 mr-1" />{" "}
                                    Reminders
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {generatedTasks.length > 20 && (
                            <div className="text-sm text-center text-purple-600 py-2">
                              ...and {generatedTasks.length - 20} more tasks
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-t border-purple-100">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  department: "",
                  givenBy: "",
                  doer: "",
                  description: "",
                  frequency: "daily",
                  enableReminders: true,
                  requireAttachment: false,
                });
                setSelectedDate(null);
                setTime("09:00");
                setGeneratedTasks([]);
                setAccordionOpen(false);
              }}
              className="rounded-md border border-purple-200 py-2 px-4 text-purple-700 hover:border-purple-300 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-w-[140px] items-center justify-center rounded-md border border-blue-700 !bg-blue-600 py-2 px-4 font-medium !text-white shadow-sm hover:!bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
              style={{ backgroundColor: isSubmitting ? "#60a5fa" : "#2563eb", color: "#ffffff" }}
            >
              {isSubmitting ? "Assigning..." : "Assign Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
    // </AdminLayout>
  );
}
