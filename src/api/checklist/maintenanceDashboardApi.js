import axiosInstance from "./axiosInstance";

const BASE_URL = "/api/mainatce/dashboard";

// ---------------------------------------------------------------------
// 1️⃣ FETCH MAINTENANCE DASHBOARD DATA
// ---------------------------------------------------------------------
export const fetchMaintenanceDashboardDataApi = async (
  staffFilter = "all",
  page = 1,
  limit = 50,
  taskView = "recent",
  departmentFilter = "all",
  startDate = null,
  endDate = null
) => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    const params = new URLSearchParams({
      staffFilter,
      page: page.toString(),
      limit: limit.toString(),
      taskView,
      departmentFilter,
      role,
      username,
    });

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const res = await axiosInstance.get(`${BASE_URL}/data?${params.toString()}`);

    const response = res.data;
    if (response.success) {
      return {
        data: response.data || [],
        total: response.total || 0,
      };
    }
    return { data: [], total: 0 };
  } catch (error) {
    console.error("Error loading maintenance tasks:", error);
    return { data: [], total: 0 };
  }
};

// ---------------------------------------------------------------------
// 2️⃣ GET MAINTENANCE DASHBOARD DATA COUNT
// ---------------------------------------------------------------------
export const getMaintenanceDashboardDataCount = async (
  taskView = "recent",
  staffFilter = "all",
  departmentFilter = "all"
) => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    const params = new URLSearchParams({
      taskView,
      staffFilter,
      departmentFilter,
      role,
      username,
      page: "1",
      limit: "1",
    });

    const url = `${BASE_URL}/data?${params.toString()}`;
    const res = await axiosInstance.get(url);

    const data = res.data;
    // API returns 'total', not 'totalCount'
    return data.total || data.totalCount || 0;
  } catch (error) {
    console.error("Maintenance Dashboard Count Error:", error);
    return 0;
  }
};

// ---------------------------------------------------------------------
// 3️⃣ GET MAINTENANCE DASHBOARD STATS
// ---------------------------------------------------------------------
export const getMaintenanceDashboardStatsApi = async (
  staffFilter = "all",
  departmentFilter = "all",
  startDate = null,
  endDate = null
) => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    const params = new URLSearchParams({
      staffFilter,
      departmentFilter,
      role,
      username,
    });

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const res = await axiosInstance.get(`${BASE_URL}/stats?${params.toString()}`);

    const data = res.data;
    return data.success ? data.data : {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      notDone: 0,
      completionRate: 0,
    };
  } catch (error) {
    console.error("Error fetching maintenance dashboard stats:", error);
    return {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      notDone: 0,
      completionRate: 0,
    };
  }
};

// ---------------------------------------------------------------------
// 4️⃣ GET TODAY MAINTENANCE TASKS
// ---------------------------------------------------------------------
export const getTodayMaintenanceTasksApi = async (
  staffFilter = "all",
  departmentFilter = "all"
) => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    const params = new URLSearchParams({
      staffFilter,
      departmentFilter,
      role,
      username,
    });

    const res = await axiosInstance.get(`${BASE_URL}/today-tasks?${params.toString()}`);
    const data = res.data;
    return data.success ? data.data : [];
  } catch (error) {
    console.error("Error fetching today maintenance tasks:", error);
    return [];
  }
};

// ---------------------------------------------------------------------
// 5️⃣ GET UPCOMING MAINTENANCE TASKS
// ---------------------------------------------------------------------
export const getUpcomingMaintenanceTasksApi = async (
  staffFilter = "all",
  departmentFilter = "all"
) => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    const params = new URLSearchParams({
      staffFilter,
      departmentFilter,
      role,
      username,
    });

    const res = await axiosInstance.get(`${BASE_URL}/upcoming-tasks?${params.toString()}`);
    const data = res.data;
    return data.success ? data.data : [];
  } catch (error) {
    console.error("Error fetching upcoming maintenance tasks:", error);
    return [];
  }
};

// ---------------------------------------------------------------------
// 6️⃣ GET OVERDUE MAINTENANCE TASKS
// ---------------------------------------------------------------------
export const getOverdueMaintenanceTasksApi = async (
  staffFilter = "all",
  departmentFilter = "all"
) => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    const params = new URLSearchParams({
      staffFilter,
      departmentFilter,
      role,
      username,
    });

    const res = await axiosInstance.get(`${BASE_URL}/overdue-tasks?${params.toString()}`);
    const data = res.data;
    return data.success ? data.data : [];
  } catch (error) {
    console.error("Error fetching overdue maintenance tasks:", error);
    return [];
  }
};

// ---------------------------------------------------------------------
// 7️⃣ GET UNIQUE DEPARTMENTS (for maintenance)
// ---------------------------------------------------------------------
export const getMaintenanceDepartmentsApi = async () => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    const params = new URLSearchParams({
      role,
      username,
    });

    const res = await axiosInstance.get(`${BASE_URL}/departments?${params.toString()}`);
    const data = res.data;
    return data.success ? data.data : [];
  } catch (err) {
    console.error("Error fetching maintenance departments:", err);
    return [];
  }
};

// ---------------------------------------------------------------------
// 8️⃣ GET STAFF NAMES BY DEPARTMENT (for maintenance)
// ---------------------------------------------------------------------
export const getMaintenanceStaffByDepartmentApi = async (departmentFilter = "all") => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    const params = new URLSearchParams({
      departmentFilter,
      role,
      username,
    });

    const res = await axiosInstance.get(`${BASE_URL}/staff?${params.toString()}`);
    const data = res.data;
    return data.success ? data.data : [];
  } catch (err) {
    console.error("Error fetching maintenance staff:", err);
    return [];
  }
};
