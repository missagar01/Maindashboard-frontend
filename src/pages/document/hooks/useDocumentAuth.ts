import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

export interface DocumentUser {
  id: string;
  username: string;
  name: string;
  role: "admin" | "user" | "employee";
  email?: string;
  department?: string;
  permissions: string[];
  systemAccess?: string[];
  pageAccess?: string[];
}

const parseAccess = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : String(entry)))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeRole = (rawRole: unknown): DocumentUser["role"] => {
  const role = (typeof rawRole === "string" ? rawRole : String(rawRole || "user")).toLowerCase();
  if (role.includes("admin")) return "admin";
  if (role.includes("employee")) return "employee";
  return "user";
};

const buildPermissions = (systemAccess: string[]): string[] => {
  return Array.from(
    new Set(
      systemAccess.map((system) =>
        system.charAt(0).toUpperCase() + system.slice(1).toLowerCase()
      )
    )
  );
};

const mapUser = (rawUser: Record<string, unknown> | null | undefined): DocumentUser | null => {
  if (!rawUser) return null;

  const systemAccess = parseAccess(rawUser.system_access ?? rawUser.systemAccess);
  const pageAccess = parseAccess(rawUser.page_access ?? rawUser.pageAccess ?? rawUser.user_access);

  const username =
    (rawUser.user_name as string) ||
    (rawUser.username as string) ||
    (rawUser.employee_id as string) ||
    "";

  const role = normalizeRole(rawUser.userType ?? rawUser.role);

  return {
    id: String(rawUser.id ?? rawUser.employee_id ?? username ?? ""),
    username,
    name: username,
    role,
    email: (rawUser.email_id as string) || (rawUser.email as string) || "",
    department: (rawUser.department as string) || "",
    permissions: buildPermissions(systemAccess),
    systemAccess,
    pageAccess,
  };
};

const useDocumentAuth = () => {
  const { user, token, isAuthenticated, login, logout, getAuthHeaders } = useAuth();

  const currentUser = useMemo(
    () => mapUser(user as Record<string, unknown> | null),
    [user]
  );

  return {
    currentUser,
    token,
    isAuthenticated,
    login,
    logout,
    getAuthHeaders,
  };
};

export default useDocumentAuth;
