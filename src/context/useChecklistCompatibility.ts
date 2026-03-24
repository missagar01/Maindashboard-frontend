import { useCallback, useState } from "react";
import * as dashboardApi from "../api/checklist/dashboardApi.js";
import * as assignTaskApi from "../api/checklist/assignTaskApi.js";
import * as quickTaskApi from "../api/checklist/quickTaskApi.js";
import * as checkListApi from "../api/checklist/checkListApi.js";
import * as maintenanceApi from "../api/checklist/maintenanceApi.js";
import * as housekeepingApi from "../api/checklist/housekeepingApi.js";
import * as settingApi from "../api/checklist/settingApi.js";
import * as delegationApi from "../api/checklist/delegationApi.js";
import * as userApi from "../api/checklist/userApi.js";
import * as doerApi from "../api/checklist/doerApi.js";
import * as departmentApi from "../api/checklist/departmentforsetting.js";

const getErrorMessage = (error: any, fallback = "Request failed") =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getResponseItems = (response: any) =>
  Array.isArray(response) ? response : response?.data || response?.items || [];

const getResponseTotal = (response: any, fallbackLength = 0) => {
  const total = Number(response?.total ?? response?.totalCount ?? fallbackLength);
  return Number.isFinite(total) ? total : fallbackLength;
};

const getCountValue = (value: any) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    const candidates = [
      value.count,
      value.total,
      value.value,
      value.totalTasks,
      value.completedTasks,
      value.pendingTasks,
      value.overdueTasks,
      value.upcomingTasks,
      value.notDoneTasks,
    ];

    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
};

type DashboardBreakdown = Record<string, number>;

type DashboardStatValue =
  | number
  | {
    count?: number | string;
    breakdown?: DashboardBreakdown;
    [key: string]: any;
  };

type DashboardStatsState = {
  totalTask: DashboardStatValue;
  completeTask: DashboardStatValue;
  upcomingTask: DashboardStatValue;
  notDoneTask: DashboardStatValue;
  pendingTask: DashboardStatValue;
  overdueTask: DashboardStatValue;
};

const normalizeDashboardStat = (value: any): DashboardStatValue => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const normalizedBreakdown =
      value.breakdown && typeof value.breakdown === "object"
        ? Object.entries(value.breakdown).reduce<DashboardBreakdown>((acc, [key, count]) => {
          acc[key] = getCountValue(count);
          return acc;
        }, {})
        : undefined;

    return {
      ...value,
      count: getCountValue(value),
      ...(normalizedBreakdown ? { breakdown: normalizedBreakdown } : {}),
    };
  }

  return getCountValue(value);
};

export const useChecklistCompatibility = () => {
  const [dashboard, setDashboard] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsState>({
    totalTask: 0,
    completeTask: 0,
    upcomingTask: 0,
    notDoneTask: 0,
    pendingTask: 0,
    overdueTask: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [assignTaskState, setAssignTaskState] = useState({
    department: [] as any[],
    division: [] as any[],
    givenBy: [] as any[],
    doerName: [] as any[],
  });

  const [quickTaskState, setQuickTaskState] = useState({
    quickTask: [] as any[],
    delegationTasks: [] as any[],
    users: [] as any[],
    checklistPage: 0,
    checklistTotal: 0,
    checklistHasMore: true,
    delegationPage: 0,
    delegationTotal: 0,
    delegationHasMore: true,
    loading: false,
  });

  const [delegationState, setDelegationState] = useState({
    delegation: [] as any[],
    delegation_done: [] as any[],
    loading: false,
    error: null as string | null,
  });

  const [checklistState, setChecklistState] = useState({
    checklist: [] as any[],
    history: [] as any[],
    hrChecklist: [] as any[],
    departments: [] as any[],
    doers: [] as any[],
    pendingTotal: 0,
    historyTotal: 0,
    currentPage: 1,
    historyCurrentPage: 1,
    hrCurrentPage: 1,
    hasMore: true,
    historyHasMore: true,
    hrHasMore: true,
    loading: false,
    hrLoading: false,
  });

  const [settingState, setSettingState] = useState({
    settingUserData: [] as any[],
    settingDepartment: [] as any[],
    settingDepartmentsOnly: [] as any[],
    settingGivenBy: [] as any[],
    settingLoading: false,
    settingError: null as string | null,
  });

  const [housekeepingAssignState, setHousekeepingAssignState] = useState({
    locations: [] as any[],
    userDepartments: [] as any[],
    doerNames: [] as any[],
    assigningTask: false,
    creatingLocation: false,
    error: null as string | null,
  });

  const [housekeepingState, setHousekeepingState] = useState({
    pendingTasks: [] as any[],
    historyTasks: [] as any[],
    loading: false,
    error: null as string | null,
    pendingPage: 1,
    pendingTotal: 0,
    pendingHasMore: true,
    historyPage: 1,
    historyTotal: 0,
    historyHasMore: true,
    dashboardDepartments: [] as any[],
    dashboardSummary: {
      total: 0,
      completed: 0,
      pending: 0,
      upcoming: 0,
      overdue: 0,
      progress_percent: 0,
    },
    loadingDashboard: false,
    loadingDashboardTasks: false,
    taskCounts: {
      recent: 0,
      upcoming: 0,
      overdue: 0,
      notdone: 0,
    },
  });

  const [maintenanceState, setMaintenanceState] = useState({
    tasks: [] as any[],
    history: [] as any[],
    loading: false,
    error: null as string | null,
    currentPage: 1,
    pendingTotal: 0,
    hasMore: true,
    currentPageHistory: 1,
    historyTotal: 0,
    hasMoreHistory: true,
    assignedPersonnel: [] as any[],
    departments: [] as any[],
    doers: [] as any[],
    machineNames: [] as any[],
    statistics: null as any,
  });

  const fetchDashboardData = async (dashboardType: string, staffFilter = "all") => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await dashboardApi.fetchDashboardDataApi(dashboardType, staffFilter);
      setDashboard(Array.isArray(data) ? data : []);
      return data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load dashboard data");
      setDashboardError(message);
      throw error;
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchDashboardStats = useCallback(async (
    dashboardType: string,
    staffFilter = "all",
    departmentFilter = "all"
  ) => {
    try {
      const [total, upcoming, complete, pending, overdue, notDone] = await Promise.all([
        dashboardApi.countTotalTaskApi(dashboardType, staffFilter, departmentFilter),
        dashboardApi.countUpcomingTaskApi(dashboardType, staffFilter, departmentFilter),
        dashboardApi.countCompleteTaskApi(dashboardType, staffFilter, departmentFilter),
        dashboardApi.countPendingOrDelayTaskApi(dashboardType, staffFilter, departmentFilter),
        dashboardApi.countOverDueORExtendedTaskApi(dashboardType, staffFilter, departmentFilter),
        dashboardApi.countNotDoneTaskApi(dashboardType, staffFilter, departmentFilter),
      ]);

      setDashboardStats({
        totalTask: normalizeDashboardStat(total),
        upcomingTask: normalizeDashboardStat(upcoming),
        completeTask: normalizeDashboardStat(complete),
        pendingTask: normalizeDashboardStat(pending),
        overdueTask: normalizeDashboardStat(overdue),
        notDoneTask: normalizeDashboardStat(notDone),
      });
    } catch (error) {
      console.error("Checklist dashboard stats error:", error);
    }
  }, []);

  const fetchAssignTaskMeta = async (userName: string, department?: string) => {
    try {
      const [departments, divisions, givenBy] = await Promise.all([
        assignTaskApi.fetchUniqueDepartmentDataApi(userName),
        assignTaskApi.fetchUniqueDivisionDataApi(),
        assignTaskApi.fetchUniqueGivenByDataApi(),
      ]);

      let doerName: any[] = [];
      if (department) {
        doerName = await assignTaskApi.fetchUniqueDoerNameDataApi(department);
      }

      setAssignTaskState({
        department: Array.isArray(departments) ? departments : [],
        division: Array.isArray(divisions) ? divisions : [],
        givenBy: Array.isArray(givenBy) ? givenBy : [],
        doerName: Array.isArray(doerName) ? doerName : [],
      });
    } catch (error) {
      console.error("Checklist assign task metadata error:", error);
    }
  };

  const fetchDoerNames = async (department: string) => {
    try {
      const doerName = await assignTaskApi.fetchUniqueDoerNameDataApi(department);
      setAssignTaskState((previous) => ({
        ...previous,
        doerName: Array.isArray(doerName) ? doerName : [],
      }));
      return doerName;
    } catch (error) {
      console.error("Checklist doer list error:", error);
      return [];
    }
  };

  const assignTasks = async (tasks: any[]) => assignTaskApi.pushAssignTaskApi(tasks);

  const fetchUniqueDepartmentDataAction = useCallback(async (userName: string) => {
    try {
      const department = await assignTaskApi.fetchUniqueDepartmentDataApi(userName);
      setAssignTaskState((previous) => ({
        ...previous,
        department: Array.isArray(department) ? department : [],
      }));
      return department;
    } catch (error) {
      console.error("Checklist departments error:", error);
      return [];
    }
  }, []);

  const fetchUniqueGivenByDataAction = useCallback(async () => {
    try {
      const givenBy = await assignTaskApi.fetchUniqueGivenByDataApi();
      setAssignTaskState((previous) => ({
        ...previous,
        givenBy: Array.isArray(givenBy) ? givenBy : [],
      }));
      return givenBy;
    } catch (error) {
      console.error("Checklist given-by error:", error);
      return [];
    }
  }, []);

  const fetchUniqueDivisionDataAction = async () => {
    try {
      const division = await assignTaskApi.fetchUniqueDivisionDataApi();
      setAssignTaskState((previous) => ({
        ...previous,
        division: Array.isArray(division) ? division : [],
      }));
      return division;
    } catch (error) {
      console.error("Checklist divisions error:", error);
      return [];
    }
  };

  const fetchUniqueDoerNameDataAction = async (department: string) => {
    try {
      const doerName = await assignTaskApi.fetchUniqueDoerNameDataApi(department);
      setAssignTaskState((previous) => ({
        ...previous,
        doerName: Array.isArray(doerName) ? doerName : [],
      }));
      return doerName;
    } catch (error) {
      console.error("Checklist doer names error:", error);
      return [];
    }
  };

  const pushAssignTaskAction = async (tasks: any[]) => assignTaskApi.pushAssignTaskApi(tasks);

  const fetchAssignTaskDepartments = fetchUniqueDepartmentDataAction;
  const fetchAssignTaskGivenBy = fetchUniqueGivenByDataAction;
  const fetchAssignTaskDoerNames = fetchUniqueDoerNameDataAction;

  const fetchQuickTaskUsers = useCallback(async () => {
    try {
      const users = await quickTaskApi.fetchUsersData();
      setQuickTaskState((previous) => ({
        ...previous,
        users: Array.isArray(users) ? users : [],
      }));
      return users;
    } catch (error) {
      console.error("Checklist quick-task users error:", error);
      return [];
    }
  }, []);

  const resetQuickTaskChecklistPagination = () => {
    setQuickTaskState((previous) => ({
      ...previous,
      checklistPage: 0,
      quickTask: [],
      checklistHasMore: true,
    }));
  };

  const resetQuickTaskDelegationPagination = () => {
    setQuickTaskState((previous) => ({
      ...previous,
      delegationPage: 0,
      delegationTasks: [],
      delegationHasMore: true,
    }));
  };

  const fetchUniqueChecklistTaskData = useCallback(async ({
    page = 0,
    pageSize = 50,
    nameFilter = "",
    append = false,
  } = {}) => {
    setQuickTaskState((previous) => ({ ...previous, loading: true }));
    try {
      const result = await quickTaskApi.fetchChecklistData(page, pageSize, nameFilter);
      const data = Array.isArray(result?.data) ? result.data : [];
      const total = Number(result?.total) || data.length;

      setQuickTaskState((previous) => {
        const nextQuickTask = append ? [...previous.quickTask, ...data] : data;
        return {
          ...previous,
          quickTask: nextQuickTask,
          checklistPage: page + 1,
          checklistTotal: total,
          checklistHasMore: nextQuickTask.length < total,
          loading: false,
        };
      });

      return result;
    } catch (error) {
      setQuickTaskState((previous) => ({ ...previous, loading: false }));
      console.error("Checklist quick-task data error:", error);
      throw error;
    }
  }, []);

  const fetchUniqueDelegationTaskData = useCallback(async ({
    page = 0,
    pageSize = 50,
    nameFilter = "",
    append = false,
  } = {}) => {
    setQuickTaskState((previous) => ({ ...previous, loading: true }));
    try {
      const result = await quickTaskApi.fetchDelegationData(page, pageSize, nameFilter);
      const data = Array.isArray(result?.data) ? result.data : [];
      const total = Number(result?.total) || data.length;

      setQuickTaskState((previous) => {
        const nextDelegationTasks = append ? [...previous.delegationTasks, ...data] : data;
        return {
          ...previous,
          delegationTasks: nextDelegationTasks,
          delegationPage: page + 1,
          delegationTotal: total,
          delegationHasMore: nextDelegationTasks.length < total,
          loading: false,
        };
      });

      return result;
    } catch (error) {
      setQuickTaskState((previous) => ({ ...previous, loading: false }));
      console.error("Checklist delegation task data error:", error);
      throw error;
    }
  }, []);

  const updateQuickTaskChecklistTask = async (updatedTask: any, originalTask: any) =>
    quickTaskApi.updateChecklistTaskApi(updatedTask, originalTask);

  const deleteQuickTaskChecklistTask = async (tasks: any[]) =>
    quickTaskApi.deleteChecklistTasksApi(tasks);

  const deleteQuickTaskDelegationTask = async (taskIds: any[]) =>
    quickTaskApi.deleteDelegationTasksApi(taskIds);

  const fetchChecklist = useCallback(async (args?: number | { page?: number; replace?: boolean }) => {
    const page = typeof args === "object" ? args.page || 1 : args || 1;
    const replace = typeof args === "object" ? Boolean(args.replace) : page === 1;

    setChecklistState((previous) => ({ ...previous, loading: true }));
    try {
      const response = await checkListApi.fetchChechListDataSortByDate(page);
      const data = Array.isArray(response?.data) ? response.data : [];
      const total = Number(response?.totalCount) || 0;

      setChecklistState((previous) => {
        const nextChecklist = page === 1 || replace ? data : [...previous.checklist, ...data];
        return {
          ...previous,
          checklist: nextChecklist,
          currentPage: page,
          pendingTotal: total,
          hasMore: nextChecklist.length < total,
          loading: false,
        };
      });

      return response;
    } catch (error) {
      setChecklistState((previous) => ({ ...previous, loading: false }));
      throw error;
    }
  }, []);

  const fetchChecklistDataAction = useCallback(async (args?: number | { page?: number; replace?: boolean }) => {
    return fetchChecklist(args);
  }, []);

  const fetchChecklistHistoryDataAction = useCallback(async (args?: number | { page?: number; replace?: boolean }) => {
    const page = typeof args === "object" ? args.page || 1 : args || 1;
    const replace = typeof args === "object" ? Boolean(args.replace) : page === 1;

    setChecklistState((previous) => ({ ...previous, loading: true }));
    try {
      const response = await checkListApi.fetchChechListDataForHistory(page);
      const data = Array.isArray(response?.data) ? response.data : [];
      const total = Number(response?.totalCount) || 0;

      setChecklistState((previous) => {
        const nextHistory = page === 1 || replace ? data : [...previous.history, ...data];
        return {
          ...previous,
          history: nextHistory,
          historyCurrentPage: page,
          historyTotal: total,
          historyHasMore: nextHistory.length < total,
          loading: false,
        };
      });

      return response;
    } catch (error) {
      setChecklistState((previous) => ({ ...previous, loading: false }));
      throw error;
    }
  }, []);

  const submitChecklistUserStatusAction = async (items: any) =>
    checkListApi.postChecklistUserStatusData(items);

  const updateChecklistAction = async (items: any) =>
    checkListApi.updateChecklistData(items);

  const postChecklistAdminDoneAPIAction = async (selectedItems: any) =>
    checkListApi.postChecklistAdminDoneAPI(selectedItems);

  const fetchChecklistDepartmentsAction = useCallback(async () => {
    const departments = await checkListApi.fetchChecklistDepartmentsAPI();
    setChecklistState((previous) => ({
      ...previous,
      departments: Array.isArray(departments) ? departments : [],
    }));
    return departments;
  }, []);

  const fetchChecklistDoersAction = useCallback(async () => {
    const doers = await checkListApi.fetchChecklistDoersAPI();
    setChecklistState((previous) => ({
      ...previous,
      doers: Array.isArray(doers) ? doers : [],
    }));
    return doers;
  }, []);

  const fetchHrChecklistDataAction = useCallback(async (page = 1) => {
    setChecklistState((previous) => ({ ...previous, hrLoading: true }));
    try {
      const response = await checkListApi.fetchChecklistForHrApproval(page);
      const data = Array.isArray(response?.data) ? response.data : [];
      const total = Number(response?.totalCount) || 0;

      setChecklistState((previous) => {
        const nextHrChecklist = page === 1 ? data : [...previous.hrChecklist, ...data];
        return {
          ...previous,
          hrChecklist: nextHrChecklist,
          hrCurrentPage: page,
          hrHasMore: nextHrChecklist.length < total,
          hrLoading: false,
        };
      });

      return response;
    } catch (error) {
      setChecklistState((previous) => ({ ...previous, hrLoading: false }));
      throw error;
    }
  }, []);

  const updateHrChecklistAction = useCallback(async (items: any) => {
    return checkListApi.updateHrManagerChecklistData(items);
  }, []);

  const rejectHrChecklistAction = useCallback(async (items: any) => {
    return checkListApi.rejectHrManagerChecklistData(items);
  }, []);

  const fetchPendingMaintenanceTasksAction = useCallback(async ({
    page = 1,
    userId = null,
    replace = false,
  }: {
    page?: number;
    userId?: string | null;
    replace?: boolean;
  } = {}) => {
    setMaintenanceState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const response = await maintenanceApi.getPendingMaintenanceTasksAPI(page, userId);
      const data = getResponseItems(response?.data);
      const total = getResponseTotal(response?.data, data.length);

      setMaintenanceState((previous) => {
        const nextTasks = page === 1 || replace ? data : [...previous.tasks, ...data];
        return {
          ...previous,
          tasks: nextTasks,
          currentPage: page,
          pendingTotal: total,
          hasMore: nextTasks.length < total,
          loading: false,
        };
      });

      return response;
    } catch (error) {
      setMaintenanceState((previous) => ({
        ...previous,
        loading: false,
        error: getErrorMessage(error, "Failed to load maintenance tasks"),
      }));
      throw error;
    }
  }, []);

  const fetchCompletedMaintenanceTasksAction = useCallback(async ({
    page = 1,
    filters = {},
    userId = null,
    replace = false,
  }: {
    page?: number;
    filters?: Record<string, any>;
    userId?: string | null;
    replace?: boolean;
  } = {}) => {
    setMaintenanceState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const response = await maintenanceApi.getCompletedMaintenanceTasksAPI(page, filters, userId);
      const data = getResponseItems(response?.data);
      const total = getResponseTotal(response?.data, data.length);

      setMaintenanceState((previous) => {
        const nextHistory = page === 1 || replace ? data : [...previous.history, ...data];
        return {
          ...previous,
          history: nextHistory,
          currentPageHistory: page,
          historyTotal: total,
          hasMoreHistory: nextHistory.length < total,
          loading: false,
        };
      });

      return response;
    } catch (error) {
      setMaintenanceState((previous) => ({
        ...previous,
        loading: false,
        error: getErrorMessage(error, "Failed to load maintenance history"),
      }));
      throw error;
    }
  }, []);

  const updateMultipleMaintenanceTasksAction = async (tasks: any[]) =>
    maintenanceApi.updateMultipleMaintenanceTasksAPI(tasks);

  const fetchUniqueMachineNamesAction = useCallback(async () => {
    const response = await maintenanceApi.getUniqueMachineNamesAPI();
    const machineNames = getResponseItems(response?.data);
    setMaintenanceState((previous) => ({
      ...previous,
      machineNames,
    }));
    return response;
  }, []);

  const fetchUniqueAssignedPersonnelAction = useCallback(async () => {
    const response = await maintenanceApi.getUniqueAssignedPersonnelAPI();
    const assignedPersonnel = getResponseItems(response?.data);
    setMaintenanceState((previous) => ({
      ...previous,
      assignedPersonnel,
    }));
    return response;
  }, []);

  const fetchMaintenanceDepartmentsAction = useCallback(async () => {
    const response = await maintenanceApi.getUniqueMaintenanceDepartmentsAPI();
    const departments = getResponseItems(response?.data);
    setMaintenanceState((previous) => ({
      ...previous,
      departments,
    }));
    return response;
  }, []);

  const fetchMaintenanceDoersAction = useCallback(async () => {
    const response = await maintenanceApi.getUniqueMaintenanceDoerNameAPI();
    const doers = getResponseItems(response?.data);
    setMaintenanceState((previous) => ({
      ...previous,
      doers,
    }));
    return response;
  }, []);

  const fetchMaintenanceStatisticsAction = useCallback(async () => {
    try {
      const response = await maintenanceApi.getMaintenanceStatisticsAPI();
      const statistics = response?.data?.data || response?.data || null;
      setMaintenanceState((previous) => ({
        ...previous,
        statistics,
      }));
      return statistics;
    } catch (error) {
      console.error("Checklist maintenance statistics error:", error);
      return null;
    }
  }, []);

  const fetchHousekeepingPendingTasksAction = useCallback(async ({
    page = 1,
    filters = {},
    replace = false,
  }: {
    page?: number;
    filters?: Record<string, any>;
    replace?: boolean;
  } = {}) => {
    setHousekeepingState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const response = await housekeepingApi.getHousekeepingPendingTasksAPI(page, filters);
      const data = getResponseItems(response?.data);
      const total = getResponseTotal(response?.data, data.length);

      setHousekeepingState((previous) => {
        const nextTasks = page === 1 || replace ? data : [...previous.pendingTasks, ...data];
        return {
          ...previous,
          pendingTasks: nextTasks,
          pendingPage: page,
          pendingTotal: total,
          pendingHasMore: nextTasks.length < total,
          loading: false,
        };
      });

      return response;
    } catch (error) {
      setHousekeepingState((previous) => ({
        ...previous,
        loading: false,
        error: getErrorMessage(error, "Failed to load housekeeping tasks"),
      }));
      throw error;
    }
  }, []);

  const fetchHousekeepingHistoryTasksAction = useCallback(async ({
    page = 1,
    filters = {},
    replace = false,
  }: {
    page?: number;
    filters?: Record<string, any>;
    replace?: boolean;
  } = {}) => {
    setHousekeepingState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const response = await housekeepingApi.getHousekeepingHistoryTasksAPI(page, filters);
      const data = getResponseItems(response?.data);
      const total = getResponseTotal(response?.data, data.length);

      setHousekeepingState((previous) => {
        const nextHistory = page === 1 || replace ? data : [...previous.historyTasks, ...data];
        return {
          ...previous,
          historyTasks: nextHistory,
          historyPage: page,
          historyTotal: total,
          historyHasMore: nextHistory.length < total,
          loading: false,
        };
      });

      return response;
    } catch (error) {
      setHousekeepingState((previous) => ({
        ...previous,
        loading: false,
        error: getErrorMessage(error, "Failed to load housekeeping history"),
      }));
      throw error;
    }
  }, []);

  const submitHousekeepingTasksAction = async (tasks: any[]) =>
    housekeepingApi.submitHousekeepingTasksAPI(tasks);

  const confirmHousekeepingTaskAction = async ({
    taskId,
    remark = "",
    doerName2 = "",
    hod = "",
  }: {
    taskId: string | number;
    remark?: string;
    doerName2?: string;
    hod?: string;
  }) => housekeepingApi.confirmHousekeepingTaskAPI(taskId, remark, null, doerName2, hod);

  const fetchHousekeepingDepartmentsAction = useCallback(async () => {
    try {
      const response = await housekeepingApi.getHousekeepingDepartmentsAPI();
      const departments = getResponseItems(response?.data);
      setHousekeepingState((previous) => ({
        ...previous,
        dashboardDepartments: departments,
      }));
      return response;
    } catch (error) {
      console.error("Checklist housekeeping departments error:", error);
      throw error;
    }
  }, []);

  const fetchHousekeepingDashboardSummaryAction = useCallback(async (options: Record<string, any> = {}) => {
    setHousekeepingState((previous) => ({
      ...previous,
      loadingDashboard: true,
      error: null,
    }));

    try {
      const response = await housekeepingApi.getHousekeepingDashboardSummaryAPI(options);
      const summary = response?.data?.data || response?.data || {};
      setHousekeepingState((previous) => ({
        ...previous,
        dashboardSummary: {
          total: Number(summary.total) || 0,
          completed: Number(summary.completed) || 0,
          pending: Number(summary.pending) || 0,
          upcoming: Number(summary.upcoming) || 0,
          overdue: Number(summary.overdue) || 0,
          progress_percent: Number(summary.progress_percent) || 0,
        },
        loadingDashboard: false,
      }));
      return summary;
    } catch (error) {
      setHousekeepingState((previous) => ({
        ...previous,
        loadingDashboard: false,
        error: getErrorMessage(error, "Failed to load housekeeping dashboard summary"),
      }));
      throw error;
    }
  }, []);

  const fetchHousekeepingTaskCountsAction = useCallback(async (filters: Record<string, any> = {}) => {
    setHousekeepingState((previous) => ({
      ...previous,
      loadingDashboardTasks: true,
      error: null,
    }));

    try {
      const taskCounts = await housekeepingApi.getHousekeepingTaskCountsAPI(filters);
      setHousekeepingState((previous) => ({
        ...previous,
        taskCounts: {
          recent: Number(taskCounts?.recent) || 0,
          upcoming: Number(taskCounts?.upcoming) || 0,
          overdue: Number(taskCounts?.overdue) || 0,
          notdone: Number(taskCounts?.notdone) || 0,
        },
        loadingDashboardTasks: false,
      }));
      return taskCounts;
    } catch (error) {
      setHousekeepingState((previous) => ({
        ...previous,
        loadingDashboardTasks: false,
        error: getErrorMessage(error, "Failed to load housekeeping task counts"),
      }));
      throw error;
    }
  }, []);

  const fetchHousekeepingDashboardTasksAction = useCallback(async ({
    taskType = "recent",
    page = 1,
    limit = 50,
    filters = {},
  }: {
    taskType?: string;
    page?: number;
    limit?: number;
    filters?: Record<string, any>;
  } = {}) => {
    setHousekeepingState((previous) => ({
      ...previous,
      loadingDashboardTasks: true,
      error: null,
    }));

    try {
      const response = await housekeepingApi.getHousekeepingTasksWithFiltersAPI(
        taskType,
        page,
        limit,
        filters
      );
      const items = getResponseItems(response?.data);
      const total = getResponseTotal(response?.data, items.length);

      setHousekeepingState((previous) => ({
        ...previous,
        loadingDashboardTasks: false,
      }));

      return { items, total };
    } catch (error) {
      setHousekeepingState((previous) => ({
        ...previous,
        loadingDashboardTasks: false,
        error: getErrorMessage(error, "Failed to load housekeeping dashboard tasks"),
      }));
      throw error;
    }
  }, []);

  const fetchDelegationDataAction = useCallback(async () => {
    setDelegationState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const delegation = await delegationApi.fetchDelegationDataSortByDate();
      setDelegationState((previous) => ({
        ...previous,
        delegation: Array.isArray(delegation) ? delegation : [],
        loading: false,
      }));
      return delegation;
    } catch (error) {
      setDelegationState((previous) => ({
        ...previous,
        loading: false,
        error: getErrorMessage(error, "Failed to load delegation data"),
      }));
      throw error;
    }
  }, []);

  const fetchDelegationDoneDataAction = useCallback(async () => {
    setDelegationState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const delegationDone = await delegationApi.fetchDelegation_DoneDataSortByDate();
      setDelegationState((previous) => ({
        ...previous,
        delegation_done: Array.isArray(delegationDone) ? delegationDone : [],
        loading: false,
      }));
      return delegationDone;
    } catch (error) {
      setDelegationState((previous) => ({
        ...previous,
        loading: false,
        error: getErrorMessage(error, "Failed to load completed delegation data"),
      }));
      throw error;
    }
  }, []);

  const submitDelegationDoneAction = async (selectedDataArray: any[]) =>
    delegationApi.insertDelegationDoneAndUpdate({ selectedDataArray });

  const fetchSettingsData = useCallback(async () => {
    setSettingState((previous) => ({
      ...previous,
      settingLoading: true,
      settingError: null,
    }));

    try {
      const [users, departments, departmentsOnly, givenBy] = await Promise.all([
        settingApi.fetchUserDetailsApi(),
        settingApi.fetchDepartmentDataApi(),
        settingApi.fetchDepartmentsOnlyApi(),
        settingApi.fetchGivenByDataApi(),
      ]);

      setSettingState((previous) => ({
        ...previous,
        settingUserData: Array.isArray(users) ? users : [],
        settingDepartment: Array.isArray(departments) ? departments : [],
        settingDepartmentsOnly: Array.isArray(departmentsOnly) ? departmentsOnly : [],
        settingGivenBy: Array.isArray(givenBy) ? givenBy : [],
        settingLoading: false,
      }));
    } catch (error) {
      setSettingState((previous) => ({
        ...previous,
        settingLoading: false,
        settingError: getErrorMessage(error, "Failed to load settings"),
      }));
      throw error;
    }
  }, []);

  const fetchSettingUserDetails = useCallback(async () => {
    const users = await settingApi.fetchUserDetailsApi();
    setSettingState((previous) => ({
      ...previous,
      settingUserData: Array.isArray(users) ? users : [],
    }));
    return users;
  }, []);

  const fetchSettingDepartmentDetails = useCallback(async () => {
    const [departments, departmentsOnly, givenBy] = await Promise.all([
      settingApi.fetchDepartmentDataApi(),
      settingApi.fetchDepartmentsOnlyApi(),
      settingApi.fetchGivenByDataApi(),
    ]);

    setSettingState((previous) => ({
      ...previous,
      settingDepartment: Array.isArray(departments) ? departments : [],
      settingDepartmentsOnly: Array.isArray(departmentsOnly) ? departmentsOnly : [],
      settingGivenBy: Array.isArray(givenBy) ? givenBy : [],
    }));
  }, []);

  const createSettingUser = async (user: any) => {
    const data = await settingApi.createUserApi(user);
    await fetchSettingUserDetails();
    return data;
  };

  const updateSettingUser = async ({
    id,
    updatedUser,
  }: {
    id: string | number;
    updatedUser: Record<string, any>;
  }) => {
    const data = await settingApi.updateUserDataApi({ id, updatedUser });
    await fetchSettingUserDetails();
    return data;
  };

  const deleteSettingUser = async (id: string | number) => {
    await settingApi.deleteUserByIdApi(id);
    await fetchSettingUserDetails();
  };

  const createSettingDepartment = async (department: any) => {
    const data = await settingApi.createDepartmentApi(department);
    await fetchSettingDepartmentDetails();
    return data;
  };

  const updateSettingDepartment = async ({
    id,
    updatedDept,
  }: {
    id: string | number;
    updatedDept: Record<string, any>;
  }) => {
    const data = await settingApi.updateDepartmentDataApi({ id, updatedDept });
    await fetchSettingDepartmentDetails();
    return data;
  };

  const deleteSettingDepartment = async (id: string | number) => {
    const data = await settingApi.deleteDepartmentDataApi(id);
    await fetchSettingDepartmentDetails();
    return data;
  };

  const patchUserVerifyAccess = async ({
    id,
    verify_access,
  }: {
    id: string | number;
    verify_access: string;
  }) => {
    const data = await settingApi.patchVerifyAccessApi({ id, verify_access });
    await fetchSettingUserDetails();
    return data;
  };

  const patchUserVerifyAccessDept = async ({
    id,
    verify_access_dept,
  }: {
    id: string | number;
    verify_access_dept: string;
  }) => {
    const data = await settingApi.patchVerifyAccessDeptApi({ id, verify_access_dept });
    await fetchSettingUserDetails();
    return data;
  };

  const fetchHousekeepingLocationsTask = useCallback(async () => {
    const response = await housekeepingApi.getHousekeepingLocationsAPI();
    const locations = getResponseItems(response?.data);
    setHousekeepingAssignState((previous) => ({
      ...previous,
      locations,
    }));
    return response;
  }, []);

  const fetchHousekeepingUserDepartmentsTask = useCallback(async () => {
    const response = await housekeepingApi.getHousekeepingUserDepartmentsAPI();
    const userDepartments = getResponseItems(response?.data);
    setHousekeepingAssignState((previous) => ({
      ...previous,
      userDepartments,
    }));
    return response;
  }, []);

  const createHousekeepingLocationTask = async (payload: Record<string, any>) => {
    setHousekeepingAssignState((previous) => ({
      ...previous,
      creatingLocation: true,
      error: null,
    }));
    try {
      const response = await housekeepingApi.createHousekeepingLocationAPI(payload);
      await fetchHousekeepingLocationsTask();
      setHousekeepingAssignState((previous) => ({
        ...previous,
        creatingLocation: false,
      }));
      return response?.data;
    } catch (error) {
      setHousekeepingAssignState((previous) => ({
        ...previous,
        creatingLocation: false,
        error: getErrorMessage(error, "Failed to create housekeeping location"),
      }));
      throw error;
    }
  };

  const assignHousekeepingTaskAction = async (taskData: Record<string, any>) => {
    setHousekeepingAssignState((previous) => ({
      ...previous,
      assigningTask: true,
      error: null,
    }));
    try {
      const response = await housekeepingApi.assignHousekeepingTaskAPI(taskData);
      setHousekeepingAssignState((previous) => ({
        ...previous,
        assigningTask: false,
      }));
      return response?.data;
    } catch (error) {
      setHousekeepingAssignState((previous) => ({
        ...previous,
        assigningTask: false,
        error: getErrorMessage(error, "Failed to assign housekeeping task"),
      }));
      throw error;
    }
  };

  const fetchAllUsers = () => userApi.fetchUsers();
  const fetchAllDoers = () => doerApi.fetchDoers();
  const fetchAllDepartments = () => departmentApi.fetchDepartments();

  const value = {
    dashboard,
    dashboardStats,
    dashboardLoading,
    dashboardError,
    assignTaskState,
    quickTaskState,
    checklistState,
    maintenanceState,
    housekeepingState,
    housekeepingAssignState,
    delegationState,
    settingState,
    fetchDashboardData,
    fetchDashboardStats,
    fetchAssignTaskMeta,
    fetchDoerNames,
    assignTasks,
    fetchUniqueDepartmentDataAction,
    fetchUniqueGivenByDataAction,
    fetchUniqueDivisionDataAction,
    fetchUniqueDoerNameDataAction,
    pushAssignTaskAction,
    fetchAssignTaskDepartments,
    fetchAssignTaskGivenBy,
    fetchAssignTaskDoerNames,
    fetchQuickTaskUsers,
    resetQuickTaskChecklistPagination,
    resetQuickTaskDelegationPagination,
    fetchUniqueChecklistTaskData,
    fetchUniqueDelegationTaskData,
    fetchUniqueDelegationTaskDataAction: fetchUniqueDelegationTaskData,
    updateQuickTaskChecklistTask,
    deleteQuickTaskChecklistTask,
    deleteQuickTaskDelegationTask,
    deleteDelegationTaskAction: deleteQuickTaskDelegationTask,
    fetchChecklist,
    fetchChecklistDataAction,
    fetchChecklistHistoryDataAction,
    submitChecklistUserStatusAction,
    updateChecklistAction,
    postChecklistAdminDoneAPIAction,
    fetchChecklistDepartmentsAction,
    fetchChecklistDoersAction,
    fetchHrChecklistDataAction,
    updateHrChecklistAction,
    rejectHrChecklistAction,
    fetchPendingMaintenanceTasksAction,
    fetchCompletedMaintenanceTasksAction,
    updateMultipleMaintenanceTasksAction,
    fetchUniqueMachineNamesAction,
    fetchUniqueAssignedPersonnelAction,
    fetchMaintenanceDepartmentsAction,
    fetchMaintenanceDoersAction,
    fetchMaintenanceStatisticsAction,
    fetchHousekeepingPendingTasksAction,
    fetchHousekeepingHistoryTasksAction,
    submitHousekeepingTasksAction,
    confirmHousekeepingTaskAction,
    fetchHousekeepingDepartmentsAction,
    fetchHousekeepingDashboardSummaryAction,
    fetchHousekeepingTaskCountsAction,
    fetchHousekeepingDashboardTasksAction,
    fetchDelegationDataAction,
    fetchDelegationDoneDataAction,
    submitDelegationDoneAction,
    fetchSettingsData,
    fetchSettingUserDetails,
    fetchSettingDepartmentDetails,
    createSettingUser,
    updateSettingUser,
    deleteSettingUser,
    createSettingDepartment,
    updateSettingDepartment,
    deleteSettingDepartment,
    patchUserVerifyAccess,
    patchUserVerifyAccessDept,
    fetchHousekeepingLocationsTask,
    fetchHousekeepingUserDepartmentsTask,
    createHousekeepingLocationTask,
    assignHousekeepingTaskAction,
    fetchAllUsers,
    fetchAllDoers,
    fetchAllDepartments,
    setQuickTaskState,
    setChecklistState,
  };

  return value;
};

export default useChecklistCompatibility;
