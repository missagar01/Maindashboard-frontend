import { apiRequest } from "../apiClient";

export const PROJECT_SYSTEM_ACCESS_VALUE = "PROJECT";

export const PROJECT_PAGE_ACCESS_BY_ROLE = {
  user: ["Project Dashboard", "Projects", "Daily Logs", "Material Stock"],
  manager: [
    "Project Dashboard",
    "Projects",
    "Daily Logs",
    "Material Stock",
    "Project Setup",
  ],
  admin: [
    "Project Dashboard",
    "Projects",
    "Daily Logs",
    "Material Stock",
    "Project Setup",
    "Project Users",
  ],
};

const normalizeComparableValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, "");

const PROJECT_PAGE_NORMALIZED_VALUES = new Set(
  Object.values(PROJECT_PAGE_ACCESS_BY_ROLE)
    .flat()
    .map((entry) => normalizeComparableValue(entry))
);

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const toCsv = (values) => {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  return uniqueValues.length > 0 ? uniqueValues.join(",") : null;
};

const getNormalizedRole = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "staff") {
    return "user";
  }
  if (normalizedRole === "manager") {
    return "manager";
  }
  if (normalizedRole === "admin") {
    return "admin";
  }
  return "user";
};

const buildProjectPageAccess = (role) =>
  PROJECT_PAGE_ACCESS_BY_ROLE[getNormalizedRole(role)] || PROJECT_PAGE_ACCESS_BY_ROLE.user;

const hasProjectSystemAccess = (systemAccess) =>
  parseCsv(systemAccess).some(
    (entry) => normalizeComparableValue(entry) === normalizeComparableValue(PROJECT_SYSTEM_ACCESS_VALUE)
  );

const hasProjectPageAccess = (pageAccess) =>
  parseCsv(pageAccess).some((entry) => {
    const normalizedEntry = normalizeComparableValue(entry);
    return normalizedEntry.startsWith("/project") || PROJECT_PAGE_NORMALIZED_VALUES.has(normalizedEntry);
  });

export const isProjectUserRecord = (userRecord) =>
  hasProjectSystemAccess(userRecord?.system_access) ||
  hasProjectPageAccess(userRecord?.page_access) ||
  String(userRecord?.department || "").trim().toUpperCase() === "PROJECT";

export const listProjectUsers = async () => {
  const response = await apiRequest("/api/lead-to-order/users");
  const users = response?.data?.data || [];
  return users.filter(isProjectUserRecord);
};

export const createProjectUser = async (payload) => {
  const role = getNormalizedRole(payload?.role);
  return apiRequest("/api/lead-to-order/users", {
    method: "POST",
    body: {
      user_name: String(payload?.username || payload?.user_name || "").trim(),
      password: payload?.password || "",
      role,
      status: "active",
      department: "PROJECT",
      remark: "Created from Project module",
      system_access: PROJECT_SYSTEM_ACCESS_VALUE,
      page_access: buildProjectPageAccess(role).join(","),
    },
  });
};

export const resetProjectUserPassword = async (userId, newPassword) =>
  apiRequest(`/api/lead-to-order/users/${userId}`, {
    method: "PUT",
    body: {
      password: newPassword,
    },
  });

export const revokeProjectUserAccess = async (userRecord) => {
  const currentSystemAccess = parseCsv(userRecord?.system_access).filter(
    (entry) => normalizeComparableValue(entry) !== normalizeComparableValue(PROJECT_SYSTEM_ACCESS_VALUE)
  );

  const currentPageAccess = parseCsv(userRecord?.page_access).filter((entry) => {
    const normalizedEntry = normalizeComparableValue(entry);
    return !normalizedEntry.startsWith("/project") && !PROJECT_PAGE_NORMALIZED_VALUES.has(normalizedEntry);
  });

  const payload = {
    system_access: toCsv(currentSystemAccess),
    page_access: toCsv(currentPageAccess),
  };

  if (!payload.system_access && !payload.page_access) {
    payload.status = "inactive";
  }

  return apiRequest(`/api/lead-to-order/users/${userRecord?.id || userRecord?.user_id}`, {
    method: "PUT",
    body: payload,
  });
};
