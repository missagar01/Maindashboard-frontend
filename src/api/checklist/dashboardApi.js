import axiosInstance from "./axiosInstance";

const BASE_URL = "/api/checklist/dashboard";
const BASE_URL1 = "/api/checklist/staff-tasks";

// ---------------------------------------------------------------------
// GLOBAL ROLE HELPER — har API me repeat na karna pade isliye function
// ---------------------------------------------------------------------
const getFinalStaffFilter = (inputFilter) => {
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const username = localStorage.getItem("user-name");
  const designation = (localStorage.getItem("designation") || "").trim().toLowerCase();

  // 🔓 Permission Override: Admins, special users, HODs, and Managers can see "all" or any specific staff
  if (
    role === "admin" || 
    role === "superadmin" ||
    (username && (username.toUpperCase() === "AAKASH AGRAWAL" || username.toLowerCase() === "admin")) || 
    designation === "manager" || 
    designation === "division hod" ||
    designation.includes("hod")
  ) {
    if (!inputFilter || inputFilter === "all") return "all";
    return inputFilter;
  }

  // 🔒 Regular users (and others) are locked to their own tasks
  if (role === "user") return username;
  if (!inputFilter || inputFilter === "all") return "all";

  return inputFilter;
};

// ---------------------------------------------------------------------
// 1️⃣ MAIN DASHBOARD DATA FETCH
// ---------------------------------------------------------------------
export const fetchDashboardDataApi = async (
  dashboardType,
  staffFilter = "all",
  page = 1,
  limit = 50,
  taskView = "recent",
  departmentFilter = "all",
  startDate = "",
  endDate = ""
) => {

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");

  // 👇 Force user filter
  staffFilter = getFinalStaffFilter(staffFilter);

  const params = new URLSearchParams({
    dashboardType,
    staffFilter,
    page,
    limit,
    taskView,
    departmentFilter,
    role,
    username,
    startDate,
    endDate
  });

  const res = await axiosInstance.get(`${BASE_URL}?${params.toString()}`);
  return res.data;
};

// ---------------------------------------------------------------------
// 2️⃣ SUPABASE COUNT USING ROLE-BASED FILTERING
// ---------------------------------------------------------------------
export const getDashboardDataCount = async (dashboardType, staffFilter = "all", taskView = 'recent', departmentFilter = "all", startDate = "", endDate = "") => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    staffFilter = getFinalStaffFilter(staffFilter);

    const params = new URLSearchParams({
      dashboardType,
      staffFilter,
      taskView,
      departmentFilter,
      role,
      username,
      startDate,
      endDate
    });

    const url = `${BASE_URL}/count?${params.toString()}`;
    const res = await axiosInstance.get(url);

    return res.data;

  } catch (err) {
    console.error("Dashboard Count Error:", err);
    return 0;
  }
};

// ---------------------------------------------------------------------
// 3️⃣ SUMMARY COUNT APIs (Admin + User both)
// ---------------------------------------------------------------------
export const countTotalTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");

  const url = `${BASE_URL}/total?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&role=${role}&username=${username}`;

  const res = await axiosInstance.get(url);
  return res.data;
};

export const countCompleteTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");

  const url = `${BASE_URL}/completed?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&role=${role}&username=${username}`;

  const res = await axiosInstance.get(url);
  return res.data;
};

export const countPendingOrDelayTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");

  const url = `${BASE_URL}/pending?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&role=${role}&username=${username}`;

  const res = await axiosInstance.get(url);
  return res.data;
};

export const countOverDueORExtendedTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");

  const url = `${BASE_URL}/overdue?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&role=${role}&username=${username}`;

  const res = await axiosInstance.get(url);
  return res.data;
};



// ---------------------------------------------------------------------
// 4️⃣ SUMMARY COMBINED API
// ---------------------------------------------------------------------
export const getDashboardSummaryApi = async (dashboardType, staffFilter = "all") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const [totalTasks, completedTasks, pendingTasks, overdueTasks] = await Promise.all([
    countTotalTaskApi(dashboardType, staffFilter),
    countCompleteTaskApi(dashboardType, staffFilter),
    countPendingOrDelayTaskApi(dashboardType, staffFilter),
    countOverDueORExtendedTaskApi(dashboardType, staffFilter)
  ]);

  const completionRate =
    totalTasks > 0
      ? Number(((completedTasks / totalTasks) * 100).toFixed(1))
      : 0;

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    completionRate
  };
};

// ---------------------------------------------------------------------
// 5️⃣ STAFF TASK TABLE APIs
// ---------------------------------------------------------------------
export const fetchStaffTasksDataApi = async (
  dashboardType,
  staffFilter = "all",
  page = 1,
  limit = 50,
  monthYear = "",
  departmentFilter = "all",
  divisionFilter = "all",
  search = "",
  sortBy = "name",
  sortOrder = "asc"
) => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const params = new URLSearchParams({
    dashboardType,
    staffFilter,
    page,
    limit,
    sortBy,
    sortOrder
  });

  // Add monthYear if provided
  if (monthYear) {
    params.append('monthYear', monthYear);
  }

  // Add departmentFilter if provided
  if (departmentFilter && departmentFilter !== "all") {
    params.append('departmentFilter', departmentFilter);
  }

  // Add divisionFilter if provided
  if (divisionFilter && divisionFilter !== "all") {
    params.append('divisionFilter', divisionFilter);
  }

  // Add search if provided
  if (search) {
    params.append('search', search);
  }

  const res = await axiosInstance.get(
    `${BASE_URL1}/tasks?${params.toString()}`
  );

  return res.data;
};

// Export all staff tasks for CSV download
export const exportAllStaffTasksApi = async (
  dashboardType,
  staffFilter = "all",
  monthYear = "",
  departmentFilter = "all",
  divisionFilter = "all"
) => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const params = new URLSearchParams({
    dashboardType,
    staffFilter
  });

  // Add monthYear if provided
  if (monthYear) {
    params.append('monthYear', monthYear);
  }

  // Add departmentFilter if provided
  if (departmentFilter && departmentFilter !== "all") {
    params.append('departmentFilter', departmentFilter);
  }

  // Add divisionFilter if provided
  if (divisionFilter && divisionFilter !== "all") {
    params.append('divisionFilter', divisionFilter);
  }

  const res = await axiosInstance.get(
    `${BASE_URL1}/tasks/export?${params.toString()}`
  );

  return res.data;
};

export const getStaffTasksCountApi = async (dashboardType, staffFilter = "all", departmentFilter = "all", divisionFilter = "all", search = "", sortBy = "name", sortOrder = "asc") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const params = new URLSearchParams({
    dashboardType,
    staffFilter,
    departmentFilter,
    divisionFilter,
    search,
    sortBy,
    sortOrder
  });

  const res = await axiosInstance.get(
    `${BASE_URL1}/count?${params.toString()}`
  );
  return res.data;
};

export const getTotalUsersCountApi = async () => {
  const res = await axiosInstance.get(`${BASE_URL1}/users-count`);
  return res.data;
};

// dashboardApi.js - Add this function
export const getStaffTaskSummaryApi = async (dashboardType, departmentFilter = "all") => {
  try {
    const params = new URLSearchParams({
      dashboardType,
      departmentFilter
    });

    const url = `${BASE_URL}/staff-summary?${params.toString()}`;
    const res = await axiosInstance.get(url);

    return res.data;

  } catch (err) {
    console.error("Staff Summary Error:", err);
    return [];
  }
};

// ---------------------------------------------------------------------
export const getUniqueDepartmentsApi = async (division) => {
  const res = await axiosInstance.get(`${BASE_URL}/departments`, { params: { division } });
  return res.data;
};

export const getStaffNamesByDepartmentApi = async (department) => {
  try {
    const res = await axiosInstance.get(`${BASE_URL}/staff?department=${department}`);
    const data = res.data;

    // Ensure we return an array
    if (Array.isArray(data)) {
      return data;
    }

    // If it's an error object, return empty array
    if (data.error) {
      console.error("Staff API Error:", data.error);
      return [];
    }

    return [];
  } catch (err) {
    console.error("Error fetching staff by department:", err);
    return [];
  }
};



// ---------------------------------------------------------------------
// 6️⃣ DATE RANGE FILTERED APIS
// ---------------------------------------------------------------------
export const fetchChecklistDataByDateRangeApi = async (
  startDate,
  endDate,
  staffFilter = "all",
  departmentFilter = "all"
) => {
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  staffFilter = getFinalStaffFilter(staffFilter);

  const url = `${BASE_URL}/checklist/date-range?startDate=${startDate}&endDate=${endDate}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&role=${role}&username=${username}`;

  const res = await axiosInstance.get(url);
  return res.data;
};

export const getChecklistDateRangeCountApi = async (
  startDate,
  endDate,
  staffFilter = "all",
  departmentFilter = "all",
  statusFilter = "all",
  divisionFilter = "all",
  search = "",
  sortBy = "name",
  sortOrder = "asc"
) => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    staffFilter = getFinalStaffFilter(staffFilter);

    const params = new URLSearchParams({
      startDate,
      endDate,
      staffFilter,
      departmentFilter,
      statusFilter,
      role,
      username,
      divisionFilter,
      search,
      sortBy,
      sortOrder
    });

    const url = `${BASE_URL}/checklist/date-range/count?${params.toString()}`;
    const res = await axiosInstance.get(url);

    return res.data;

  } catch (err) {
    console.error("Date Range Count Error:", err);
    return 0;
  }
};

export const getChecklistDateRangeStatsApi = async (
  startDate,
  endDate,
  staffFilter = "all",
  departmentFilter = "all"
) => {
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  staffFilter = getFinalStaffFilter(staffFilter);

  const url = `${BASE_URL}/checklist/date-range/stats?startDate=${startDate}&endDate=${endDate}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&role=${role}&username=${username}`;

  const res = await axiosInstance.get(url);
  return res.data;
};


export const countUpcomingTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all", startDate = "", endDate = "") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");

  const url = `${BASE_URL}/upcoming?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&role=${role}&username=${username}&startDate=${startDate}&endDate=${endDate}`;

  const res = await axiosInstance.get(url);
  return res.data;
};
export const countNotDoneTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all", startDate = "", endDate = "") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");

  const url = `${BASE_URL}/notdone?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&role=${role}&username=${username}&startDate=${startDate}&endDate=${endDate}`;

  const res = await axiosInstance.get(url);
  return res.data;
};

export const getDivisionWiseTaskCountsApi = async (startDate = "", endDate = "") => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    const params = new URLSearchParams({
      role,
      username,
      startDate,
      endDate
    });

    const url = `${BASE_URL}/division-wise-counts?${params.toString()}`;
    const res = await axiosInstance.get(url);
    return res.data;
  } catch (err) {
    console.error("Division Wise Counts API Error:", err);
    return {};
  }
};
