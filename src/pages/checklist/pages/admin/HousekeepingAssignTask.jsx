import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { fetchUniqueDivisionDataApi } from "@/api/checklist/assignTaskApi.js";

const frequencies = ["one-time", "daily", "weekly", "monthly"];

export default function AssignTask() {
  const { 
    housekeepingAssignState: housekeepingState, 
    fetchHousekeepingLocationsTask, 
    fetchHousekeepingUserDepartmentsTask, 
    createHousekeepingLocationTask, 
    assignHousekeepingTaskAction 
  } = useAuth();

  const {
    locations,
    userDepartments: userDepartmentsData,
    doerNames,
    assigningTask,
    creatingLocation,
    error: reduxError,
  } = housekeepingState;

  const [formData, setFormData] = useState({
    department: "",
    location: "",
    given_by: "",
    name: "",
    task_description: "",
    frequency: "",
    task_start_date: "",
    hod: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userDepartment, setUserDepartment] = useState("");
  const [userDepartments, setUserDepartments] = useState([]); // Array for multiple departments
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [locationOptions, setLocationOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [departmentUserMap, setDepartmentUserMap] = useState({});
  const [divisionOptions, setDivisionOptions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");

  const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationSuccess, setLocationSuccess] = useState("");

  const normalizeDivisionOptions = (payload) => {
    const divisions = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    return Array.from(
      new Set(
        divisions
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value) => value && value !== "null" && value !== "NULL")
      )
    ).sort();
  };

  // Fetch initial data
  useEffect(() => {
    fetchHousekeepingLocationsTask();
    fetchHousekeepingUserDepartmentsTask();

    // Fetch unique divisions from backend
    const fetchDivisions = async () => {
      try {
        const result = await fetchUniqueDivisionDataApi();
        setDivisionOptions(normalizeDivisionOptions(result));
      } catch (err) {
        console.error("Division fetch error:", err);
      }
    };
    fetchDivisions();
  }, [fetchHousekeepingLocationsTask, fetchHousekeepingUserDepartmentsTask]);

  // Process locations
  useEffect(() => {
    const locationValues = (Array.isArray(locations) ? locations : [])
      .map((item) => {
        const loc = item?.location || item;
        return typeof loc === 'string' ? loc.trim() : null;
      })
      .filter(loc => loc && loc !== "null" && loc !== "NULL"); // Filter out nulls
    setLocationOptions(Array.from(new Set(locationValues)).sort());
  }, [locations]);

  // Load user info from localStorage
  useEffect(() => {
    const role = localStorage.getItem("role") || "";
    const userAccess = localStorage.getItem("user_access") || localStorage.getItem("userAccess") || "";
    const storedDivision = (localStorage.getItem("division") || "").trim();

    const departments = typeof userAccess === 'string'
      ? userAccess.split(',').map(d => d.trim()).filter(Boolean)
      : Array.isArray(userAccess)
        ? userAccess.map(d => String(d).trim()).filter(Boolean)
        : [];

    setUserRole(role);
    setUserDepartment(departments[0] || "");
    setUserDepartments(departments);

    if (storedDivision && storedDivision.toLowerCase() !== "null") {
      setSelectedDivision(storedDivision);
    }

    if (role.toLowerCase() === "user" && departments.length > 0) {
      const firstDept = departments[0];
      setFormData((prev) => ({
        ...prev,
        department: firstDept,
        hod: null,
      }));
    }
  }, []);

  // Process user departments and create department-user map
  useEffect(() => {
    const isUserRole = userRole?.toLowerCase() === 'user';

    const userMap = (Array.isArray(userDepartmentsData) ? userDepartmentsData : []).reduce((acc, entry) => {
      const dept = (entry?.department || "").trim();
      if (!dept || dept.toLowerCase() === 'null') return acc;
      const name = entry?.user_name || "";
      acc[dept] = acc[dept] || [];
      if (name && !acc[dept].includes(name)) {
        acc[dept].push(name);
      }
      return acc;
    }, {});

    if (isUserRole && Object.keys(userMap).length === 0) {
      const userAccess = localStorage.getItem("user_access") || localStorage.getItem("userAccess") || "";
      const userDepts = typeof userAccess === 'string'
        ? userAccess.split(',').map(d => d.trim()).filter(Boolean)
        : Array.isArray(userAccess)
          ? userAccess.map(d => String(d).trim()).filter(Boolean)
          : [];
      setDepartmentOptions(userDepts);
    } else {
      setDepartmentOptions(Object.keys(userMap).sort());
    }

    setDepartmentUserMap(userMap);
  }, [userDepartmentsData, userRole]);



  const isUser = userRole.toLowerCase() === "user";
  const filteredDepartments = useMemo(() => {
    let base = isUser && userDepartments.length > 0
      ? userDepartments
      : departmentOptions;

    // Remove null/empty departments
    base = base.filter(d => d && d !== "null" && d !== "NULL");

    // Filter by selected division if not user role
    if (!isUser && selectedDivision) {
      // Find departments belonging to the selected division from userDepartmentsData
      const deptsInDivision = (Array.isArray(userDepartmentsData) ? userDepartmentsData : [])
        .filter(entry => entry.division === selectedDivision)
        .map(entry => (entry.department || "").trim())
        .filter(Boolean);
      
      base = base.filter(dept => deptsInDivision.includes(dept));
    }

    return Array.from(new Set(base));
  }, [userDepartments, isUser, departmentOptions, selectedDivision, userDepartmentsData]);

  const handleLocationChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      location: value,
    }));
  };

  const handleDepartmentSelect = (value) => {
    setFormData((prev) => ({
      ...prev,
      department: value,
      hod: null, // Reset verifier selection when department changes
    }));
  };



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      hod: name === "department" ? null : prev.hod,
    }));
  };

  const validate = () => {
    if (!formData.location && !formData.department) return "Location or Department is required";
    if (!formData.task_description.trim()) return "Task description is required";
    if (!formData.frequency) return "Frequency is required";
    if (!formData.task_start_date) return "Start date is required";
    return "";
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setLocationError("");
    setLocationSuccess("");

    if (!newLocation.trim()) {
      setLocationError("Location name is required");
      return;
    }

    try {
      await createHousekeepingLocationTask({ location: newLocation.trim() });
      setLocationSuccess("Location created successfully!");
      setNewLocation("");
      fetchHousekeepingLocationsTask();
      setTimeout(() => {
        setIsLocationModalOpen(false);
        setLocationSuccess("");
      }, 1500);
    } catch (err) {
      setLocationError(err?.message || "Failed to create location");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {


      const submitData = {
        ...formData,
        division: selectedDivision,
        department: formData.location || formData.department,
        hod: null,
        task_description: formData.task_description.trim(),
      };

      await assignHousekeepingTaskAction(submitData);
      setSuccess("Task submitted successfully.");
      setSelectedDivision("");
      setFormData({
        department: userRole.toLowerCase() === "user" ? userDepartment : "",
        location: "",
        given_by: "",
        name: "",
        task_description: "",
        frequency: "",
        task_start_date: "",
        hod: null,
      });
    } catch (err) {
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        setError("Task is being processed. Please verify in a moment.");
      } else {
        setError(err?.message || "Failed to submit task");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get given by options - hardcoded values only
  const givenByOptionsList = useMemo(() => {
    return ["AAKASH AGRAWAL", "SHEELESH MARELE", "AJIT KUMAR GUPTA", "ADMIN"];
  }, []);

  // Get doer names from Redux or fallback
  const doerNamesList = useMemo(() => {
    if (Array.isArray(doerNames) && doerNames.length > 0) {
      return doerNames
        .map(item => {
          // Handle different response formats
          if (typeof item === 'string') return String(item).trim();
          if (item?.doer_name) return String(item.doer_name).trim();
          if (item?.name) return String(item.name).trim();
          if (item?.user_name) return String(item.user_name).trim();
          return null;
        })
        .filter(Boolean)
        .filter(item => typeof item === 'string' && item.length > 0 && item.toLowerCase() !== 'null');
    }
    return ["Housekeeping Staff", "Company Reja"];
  }, [doerNames]);

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Housekeeping</p>
              <h1 className="text-xl font-semibold text-gray-800">Assign Task</h1>
            </div>
            <div className="flex items-center gap-3">
              {userRole.toLowerCase() === "admin" && (
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Location
                </button>
              )}
              {(isSubmitting || assigningTask) && (
                <span className="inline-flex items-center gap-2 text-sm text-blue-700">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-blue-700 border-t-transparent animate-spin" />
                  Submitting...
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
            {error || reduxError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error || reduxError}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {success}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Division <span className="text-red-500">*</span></label>
                <select
                  value={selectedDivision}
                  onChange={(e) => {
                    setSelectedDivision(e.target.value);
                    // Reset department and location when division changes
                    setFormData(prev => ({ ...prev, department: "", location: "" }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Select Division</option>
                  {divisionOptions.map((div, i) => (
                    <option key={i} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Location</label>
                <select
                  name="location"
                  value={formData.location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  autoComplete="off"
                >
                  <option value="">Select location</option>
                  {locationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={(e) => handleDepartmentSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-1 bg-white"
                  disabled={userRole.toLowerCase() === "user" && !!userDepartment}
                >
                  <option value="">Select department</option>
                  {filteredDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>



              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Given By</label>
                <select
                  name="given_by"
                  value={formData.given_by}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select</option>
                  {givenByOptionsList.map((person, index) => (
                    <option key={`given-by-${index}-${person}`} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Doer Name</label>
                <select
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select</option>
                  {doerNamesList.map((doer, index) => (
                    <option key={`doer-${index}-${doer}`} value={doer}>
                      {doer}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Task Description</label>
              <textarea
                name="task_description"
                value={formData.task_description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the task clearly"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Frequency</label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select</option>
                  {frequencies.map((freq) => (
                    <option key={freq} value={freq}>
                      {freq}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  name="task_start_date"
                  value={formData.task_start_date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || assigningTask}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {(isSubmitting || assigningTask) ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Task"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Create Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
              <form onSubmit={handleCreateLocation}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                        Create New Location
                      </h3>

                      {locationError && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {locationError}
                        </div>
                      )}

                      {locationSuccess && (
                        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                          {locationSuccess}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label htmlFor="location-name" className="block text-sm font-medium text-gray-700">
                          Location Name
                        </label>
                        <input
                          type="text"
                          id="location-name"
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Enter location name"
                          autoFocus
                          disabled={creatingLocation}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={creatingLocation || !newLocation.trim()}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingLocation ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Location"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationModalOpen(false);
                      setNewLocation("");
                      setLocationError("");
                      setLocationSuccess("");
                    }}
                    disabled={creatingLocation}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
