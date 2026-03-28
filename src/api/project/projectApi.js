import { apiRequest } from "../apiClient";

const unwrapResponse = (response) => response?.data ?? response;

export const listProjects = async () => unwrapResponse(await apiRequest("/api/projects"));

export const createProject = async (payload) =>
  unwrapResponse(
    await apiRequest("/api/projects", {
      method: "POST",
      body: payload,
    })
  );

export const listWorkAreas = async (projectId) =>
  unwrapResponse(await apiRequest(`/api/work-areas/${projectId}`));

export const createWorkArea = async (payload) =>
  unwrapResponse(
    await apiRequest("/api/work-areas", {
      method: "POST",
      body: payload,
    })
  );

export const listTasks = async () => unwrapResponse(await apiRequest("/api/tasks"));

export const listTasksForStructure = async (structureId) =>
  unwrapResponse(await apiRequest(`/api/tasks/${structureId}`));

export const createTask = async (payload) =>
  unwrapResponse(
    await apiRequest("/api/tasks", {
      method: "POST",
      body: payload,
    })
  );

export const listLogsForActivity = async (activityId) =>
  unwrapResponse(await apiRequest(`/api/logs/${activityId}`));

export const createLog = async (payload) =>
  unwrapResponse(
    await apiRequest("/api/logs", {
      method: "POST",
      body: payload,
    })
  );

export const listMaterials = async () => unwrapResponse(await apiRequest("/api/materials"));

export const createMaterial = async (payload) =>
  unwrapResponse(
    await apiRequest("/api/materials", {
      method: "POST",
      body: payload,
    })
  );

export const createMaterialInward = async (payload) =>
  unwrapResponse(
    await apiRequest("/api/materials/inward", {
      method: "POST",
      body: payload,
    })
  );

export const createMaterialConsumption = async (payload) =>
  unwrapResponse(
    await apiRequest("/api/materials/consumption", {
      method: "POST",
      body: payload,
    })
  );

export const listMaterialLogs = async () =>
  unwrapResponse(await apiRequest("/api/materials/logs"));

export const getOperationalSummary = async () =>
  unwrapResponse(await apiRequest("/api/analytics/operational-summary"));
