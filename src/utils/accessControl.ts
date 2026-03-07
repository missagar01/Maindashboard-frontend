export type UserAccess = {
  system_access?: string | null;
  page_access?: string | null;
  user_access?: string | null;
  role?: string;
  userType?: string;
};

type SystemKey = "o2d" | "batchcode" | "lead-to-order" | "hrfms" | null;

const SYSTEM_ROOTS = ["/", "/o2d", "/batchcode", "/lead-to-order", "/hrfms"];

const HRFMS_LEGACY_ROUTE_MAP: Record<string, string> = {
  "/dashboard": "/hrfms/dashboard",
  "/my-profile": "/hrfms/my-profile",
  "/resume-request": "/hrfms/resume-request",
  "/resume-list": "/hrfms/resume-list",
  "/employee-create": "/hrfms/employee-create",
  "/employee-details": "/hrfms/employee-details",
  "/requests": "/hrfms/requests",
  "/tickets": "/hrfms/tickets",
  "/travel-status": "/hrfms/travel-status",
  "/resumes": "/hrfms/resumes",
  "/resume-form": "/hrfms/resume-form",
  "/leave-request": "/hrfms/leave-request",
  "/leave-approvals": "/hrfms/leave-approvals",
  "/leave-hr-approvals": "/hrfms/leave-hr-approvals",
  "/commercial-head-approval": "/hrfms/commercial-head-approval",
  "/plant-visitor": "/hrfms/plant-visitor",
  "/plant-visitorlist": "/hrfms/plant-visitorlist",
  "/condidate-list": "/hrfms/condidate-list",
  "/condidate-select": "/hrfms/condidate-select",
  "/resume": "/hrfms/resume",
};

export const PAGE_NAME_TO_ROUTE_MAP: Record<string, string> = {
  Dashboard: "/",
  Orders: "/o2d/orders",
  "Pending Vehicles": "/o2d/process",
  "Complaint Details": "/o2d/complaint-details",
  Permissions: "/o2d/permissions",
  Enquiry: "/o2d/enquiry",
  "Enquiry List": "/o2d/enquiry-list",
  "Hot Coil": "/batchcode/hot-coil",
  "QC Lab": "/batchcode/qc-lab",
  "SMS Register": "/batchcode/sms-register",
  Recoiler: "/batchcode/recoiler",
  "Pipe Mill": "/batchcode/pipe-mill",
  Laddel: "/batchcode/laddel",
  Tundis: "/batchcode/tundis",
  Leads: "/lead-to-order/leads",
  "Follow Up": "/lead-to-order/follow-up",
  "Call Tracker": "/lead-to-order/call-tracker",
  Quotation: "/lead-to-order/quotation",
  Customers: "/o2d/customers",
  "Follow Ups": "/o2d/follow-ups",
  "HRFMS Dashboard": "/hrfms/dashboard",
  Employee: "/hrfms/employee-create",
  "My Profile": "/hrfms/my-profile",
  "MainPower Request": "/hrfms/resume-request",
  "MainPower List": "/hrfms/resume-list",
  "Travel Request": "/hrfms/requests",
  "Travel Form": "/hrfms/requests",
  Tickets: "/hrfms/tickets",
  "Travel Status": "/hrfms/travel-status",
  Resume: "/hrfms/resumes",
  "Resume Upload": "/hrfms/resume-form",
  "Leave Request": "/hrfms/leave-request",
  "Leave Approvals": "/hrfms/leave-approvals",
  "Hod Approval": "/hrfms/commercial-head-approval",
  "HR Approvals": "/hrfms/leave-hr-approvals",
  "Plant Visitor": "/hrfms/plant-visitor",
  "Plant Visitor List": "/hrfms/plant-visitorlist",
  "Interviwer List": "/hrfms/condidate-list",
  "Selected Condidate": "/hrfms/condidate-select",
  "Candidate Status": "/hrfms/condidate-list",
  "Selected Candidate": "/hrfms/condidate-select",
};

const normalizePath = (path: string): string => {
  const stripped = path.split("?")[0].replace(/\/$/, "");
  return stripped === "" ? "/" : stripped;
};

const parseSystemAccess = (user: UserAccess | null | undefined): string[] => {
  if (!user?.system_access) {
    return [];
  }

  return user.system_access
    .split(",")
    .map((item) => item.trim().toLowerCase().replace(/\s+/g, ""))
    .filter(Boolean);
};

const hasSystemAccess = (systems: string[], required: SystemKey): boolean => {
  if (!required) {
    return false;
  }

  if (required === "lead-to-order") {
    return systems.some((value) =>
      ["lead-to-order", "leadtoorder", "lead_to_order"].includes(value)
    );
  }

  if (required === "hrfms") {
    return systems.some((value) =>
      ["hrfms", "hr-fms", "hr_fms", "hrms", "hr-fmsystem"].includes(value)
    );
  }

  return systems.includes(required);
};

const getSystemForPath = (fullPath: string, normalizedPath: string): SystemKey => {
  const lowerPath = fullPath.toLowerCase();

  if (
    normalizedPath === "/" ||
    normalizedPath === "/dashboard" ||
    normalizedPath.startsWith("/o2d") ||
    lowerPath.includes("tab=o2d")
  ) {
    return "o2d";
  }

  if (normalizedPath.startsWith("/batchcode") || lowerPath.includes("tab=batchcode")) {
    return "batchcode";
  }

  if (normalizedPath.startsWith("/lead-to-order") || lowerPath.includes("tab=lead-to-order")) {
    return "lead-to-order";
  }

  if (normalizedPath.startsWith("/hrfms") || lowerPath.includes("tab=hrfms")) {
    return "hrfms";
  }

  return null;
};

const normalizePageEntryToRoute = (
  rawPage: string,
  availableSystems: string[]
): string | null => {
  const page = rawPage.trim();
  if (!page) {
    return null;
  }

  if (page.startsWith("/")) {
    const normalized = normalizePath(page);

    if (normalized === "/dashboard") {
      const hasHrfms = hasSystemAccess(availableSystems, "hrfms");
      const hasO2d = hasSystemAccess(availableSystems, "o2d");
      if (hasHrfms && !hasO2d) {
        return "/hrfms/dashboard";
      }
      return "/";
    }

    if (HRFMS_LEGACY_ROUTE_MAP[normalized] && hasSystemAccess(availableSystems, "hrfms")) {
      return HRFMS_LEGACY_ROUTE_MAP[normalized];
    }

    return normalized;
  }

  const matchedKey = Object.keys(PAGE_NAME_TO_ROUTE_MAP).find(
    (key) => key.toLowerCase() === page.toLowerCase()
  );

  if (!matchedKey) {
    return null;
  }

  return PAGE_NAME_TO_ROUTE_MAP[matchedKey];
};

const parsePageRoutes = (user: UserAccess | null | undefined): string[] => {
  const availableSystems = parseSystemAccess(user);
  const source = (user?.page_access || user?.user_access || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const mapped = source
    .map((page) => normalizePageEntryToRoute(page, availableSystems))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(mapped));
};

const isRouteMatch = (effectivePath: string, allowedPath: string): boolean => {
  let normalizedAllowed = normalizePath(allowedPath);
  if (!normalizedAllowed.startsWith("/")) {
    normalizedAllowed = `/${normalizedAllowed}`;
  }

  return (
    effectivePath === normalizedAllowed || effectivePath.startsWith(`${normalizedAllowed}/`)
  );
};

export const isAdminUser = (user: UserAccess | null | undefined): boolean => {
  const role = (user?.userType || user?.role || "").toString().toLowerCase();
  return role.includes("admin");
};

export const isPathAllowed = (
  path: string,
  user: UserAccess | null | undefined
): boolean => {
  if (isAdminUser(user)) {
    return true;
  }

  if (!user || (!user.system_access && !user.page_access && !user.user_access)) {
    return false;
  }

  const systemAccess = parseSystemAccess(user);
  const pageRoutes = parsePageRoutes(user);
  const effectivePath = normalizePath(path);
  const currentSystem = getSystemForPath(path, effectivePath);

  if (pageRoutes.length > 0) {
    const matched = pageRoutes.some((allowedPath) => isRouteMatch(effectivePath, allowedPath));
    if (matched) {
      return true;
    }

    const hasScopedRoutesForCurrentSystem = currentSystem
      ? pageRoutes.some((route) =>
        getSystemForPath(route, normalizePath(route)) === currentSystem
      )
      : false;

    const isSystemRoot = SYSTEM_ROOTS.includes(effectivePath);
    if (!isSystemRoot && !path.includes("?tab=") && hasScopedRoutesForCurrentSystem) {
      return false;
    }
  }

  const systemMatch = hasSystemAccess(systemAccess, currentSystem);

  if (effectivePath === "/" && (systemMatch || pageRoutes.length > 0)) {
    return true;
  }

  return systemMatch;
};

export const getDefaultAllowedPath = (user: UserAccess | null | undefined): string => {
  if (!user) return "/login";
  if (isAdminUser(user)) return "/";

  const pageRoutes = parsePageRoutes(user);
  if (pageRoutes.length > 0) {
    const preferredRoute = pageRoutes.find((route) => route !== "/");
    if (preferredRoute) {
      return preferredRoute;
    }
  }

  const systemAccess = parseSystemAccess(user);

  if (hasSystemAccess(systemAccess, "o2d")) return "/?tab=o2d";
  if (hasSystemAccess(systemAccess, "lead-to-order")) return "/?tab=lead-to-order";
  if (hasSystemAccess(systemAccess, "batchcode")) return "/?tab=batchcode";
  if (hasSystemAccess(systemAccess, "hrfms")) return "/hrfms/dashboard";

  if (pageRoutes.includes("/")) return "/";

  return "/";
};
