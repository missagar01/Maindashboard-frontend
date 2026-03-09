export type UserAccess = {
  system_access?: string | null;
  page_access?: string | null;
  user_access?: string | null;
  store_access?: string | null;
  employee_id?: string | null;
  role?: string;
  userType?: string;
};

type SystemKey =
  | "o2d"
  | "batchcode"
  | "lead-to-order"
  | "hrfms"
  | "document"
  | "store"
  | "checklist"
  | "gatepass"
  | null;

const SYSTEM_ROOTS = [
  "/",
  "/o2d",
  "/batchcode",
  "/lead-to-order",
  "/hrfms",
  "/document",
  "/store",
  "/subscription",
  "/loan",
  "/payment",
  "/account",
  "/resource-manager",
  "/master",
  "/checklist",
  "/gatepass",
];

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
  "Checklist Combined": "/checklist",
  Checklist: "/checklist",
  "Visitor Gate Pass": "/gatepass/visitor",
  "Close Gate Pass": "/gatepass/close",
  "Sales Module": "/lead-to-order/leads",
  Logistic: "/o2d/dashboard",
  HRMS: "/hrfms/dashboard",
  "Resource Manager": "/resource-manager",
  "Document Dashboard": "/document",
  "Document/All": "/document/all",
  "Document/Renewal": "/document/renewal",
  "Document/Shared": "/document/shared",
  "All Documents": "/document/all",
  "Document Renewal": "/document/renewal",
  "Document Shared": "/document/shared",
  "Subscription/All": "/subscription/all",
  "Subscription/Approval": "/subscription/approval",
  "Subscription/Payment": "/subscription/payment",
  "Subscription/Renewal": "/subscription/renewal",
  "All Subscription": "/subscription/all",
  "All Subscriptions": "/subscription/all",
  "Subscription Approval": "/subscription/approval",
  "Subscription Payment": "/subscription/payment",
  "Subscription Renewal": "/subscription/renewal",
  "Loan/All": "/loan/all",
  "Loan/Foreclosure": "/loan/foreclosure",
  "Loan/NOC": "/loan/noc",
  "All Loan": "/loan/all",
  "Request Forecloser": "/loan/foreclosure",
  "Collect NOC": "/loan/noc",
  "Payment/Request Form": "/payment/request-form",
  "Payment/Approval": "/payment/approval",
  "Payment/Make Payment": "/payment/make-payment",
  "Payment/Tally Entry": "/payment/tally-entry",
  "Account/Tally Data": "/account/tally-data",
  "Account/Audit": "/account/audit",
  "Account/Rectify": "/account/rectify",
  "Account/Bill Filed": "/account/bill-filed",
  Master: "/master",
  Settings: "/lead-to-order/settings",
  "Store Dashboard": "/store/dashboard",
  "Store Issue": "/store/item-issue",
  Indent: "/store/indent",
  "Approve Indent HOD": "/store/approve-indent",
  "Approve Indent GM": "/store/approve-indent-data",
  "Purchase Order": "/store/pending-indents",
  Returnable: "/store/returnable",
  "Create PO": "/store/create-po",
  "Approve Indents": "/store/approve-indent",
  "Approve Indent Data": "/store/approve-indent-data",
  "Pending Indents": "/store/pending-indents",
  "Pending POs": "/store/pending-pos",
  "Store Out Approval": "/store/store-out-approval",
  "Completed Items": "/store/completed-items",
  Inventory: "/store/inventory",
  "Item Issue": "/store/item-issue",
  "Receive Items": "/store/receive-items",
  "Rate Approval": "/store/rate-approval",
  "Vendor Update": "/store/vendor-update",
  "User Indent": "/store/user-indent",
  "User Indent List": "/store/user-indent-list",
  "User Indent Details": "/store/user-indent-list-indent",
  "My Indent": "/store/user-indent-list-indent",
  Requisition: "/store/user-requisition",
  "User Requisitions": "/store/user-requisition",
  "Repair Gate Pass": "/store/repair-gate-pass",
  "Repair Gate Pass History": "/store/repair-gate-pass/history",
  "Repair Follow Up": "/store/repair-followup",
  "Store GRN": "/store/store-grn",
  "Store GRN Admin Approval": "/store/store-grn-admin",
  "Store GRN GM Approval": "/store/store-grn-gm",
  "Store GRN Close": "/store/store-grn-close",
};

const STORE_OUT_ONLY_EMPLOYEE_IDS = new Set(["S07632", "S08088"]);
const APPROVE_INDENT_ONLY_EMPLOYEE_IDS = new Set(["S00116"]);

const STORE_USER_BASE_ROUTES = [
  "/store/user-indent-list-indent", // My Indent — always accessible
  "/store/user-requisition",         // Requisition — always accessible
  "/store/user-indent",              // Create Indent — always accessible
];

const STORE_ACCESS_ROUTE_MAP: Record<string, string[]> = {
  DASHBOARD: ["/store/dashboard"],
  "STORE DASHBOARD": ["/store/dashboard"],
  "STORE ISSUE": ["/store/item-issue"],
  INDENT: ["/store/indent", "/store/approve-indent"],
  "APPROVE INDENT": ["/store/approve-indent"],
  "APPROVE INDENT HOD": ["/store/approve-indent"],
  "APPROVE INDENT GM": ["/store/approve-indent-data"],
  "APPROVE INDENT DATA": ["/store/approve-indent-data"],
  "PURCHASE ORDER": ["/store/pending-indents"],
  INVENTORY: ["/store/inventory"],
  RETURNABLE: ["/store/returnable"],
  "REPAIR GATE PASS": ["/store/repair-gate-pass"],
  "REPAIR FOLLOW UP": ["/store/repair-followup"],
  "STORE GRN": ["/store/store-grn"],
  "STORE GRN ADMIN APPROVAL": ["/store/store-grn-admin"],
  "STORE GRN GM APPROVAL": ["/store/store-grn-gm"],
  "STORE GRN CLOSE": ["/store/store-grn-close"],
  "STORE OUT APPROVAL": ["/store/store-out-approval"],
  "COMPLETED ITEMS": ["/store/completed-items"],
  "MY INDENT": ["/store/user-indent-list-indent"],
  REQUISITION: ["/store/user-requisition"],
  "CREATE INDENT": ["/store/user-indent"],
};

const STORE_ADMIN_ROUTE_ALLOWLIST = [
  "/store/dashboard",
  "/store/indent",
  "/store/administration",
  "/store/store-out-approval",
  "/store/pending-pos",
  "/store/create-po",
  "/store/approve-indent",
  "/store/approve-indent-data",
  "/store/completed-items",
  "/store/inventory",
  "/store/item-issue",
  "/store/receive-items",
  "/store/user-indent",
  "/store/user-indent-list",
  "/store/user-indent-list-indent",
  "/store/user-requisition",
  "/store/pending-indents",
  "/store/vendor-update",
  "/store/repair-gate-pass",
  "/store/repair-gate-pass/history",
  "/store/repair-followup",
  "/store/returnable",
  "/store/store-grn",
  "/store/store-grn-admin",
  "/store/store-grn-gm",
  "/store/store-grn-close",
  "/store/rate-approval",
];

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

const parseStoreAccess = (user: UserAccess | null | undefined): string[] => {
  if (!user?.store_access) {
    return [];
  }

  return user.store_access
    .split(",")
    .map((item) =>
      item
        .trim()
        .toUpperCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
    )
    .filter(Boolean);
};

const getStoreAllowedRoutes = (user: UserAccess | null | undefined): string[] => {
  if (!user) {
    return [];
  }

  if (isAdminUser(user)) {
    return STORE_ADMIN_ROUTE_ALLOWLIST;
  }

  const employeeId = (user.employee_id || "").trim().toUpperCase();
  if (STORE_OUT_ONLY_EMPLOYEE_IDS.has(employeeId)) {
    return ["/store/store-out-approval", "/store/completed-items"];
  }

  if (APPROVE_INDENT_ONLY_EMPLOYEE_IDS.has(employeeId)) {
    return ["/store/approve-indent-data"];
  }

  const mappedRoutes = parseStoreAccess(user).flatMap((entry) => STORE_ACCESS_ROUTE_MAP[entry] || []);

  return Array.from(new Set([...STORE_USER_BASE_ROUTES, ...mappedRoutes]));
};

export const hasStoreModuleAccess = (user: UserAccess | null | undefined): boolean => {
  if (!user) {
    return false;
  }

  // "Store and Purchase" in DB normalizes to "storeandpurchase"
  // This function is used ONLY for sidebar section detection — NOT for route-level permission
  return (
    isAdminUser(user) ||
    parseStoreAccess(user).length > 0 ||
    getStoreAllowedRoutes(user).length > 0 ||
    parseSystemAccess(user).some((value) =>
      ["store", "stores", "storefms", "store-fms", "inventory", "storeandpurchase", "storepurchase", "purchase"].includes(value)
    )
  );
};

const isStorePathAllowed = (
  effectivePath: string,
  user: UserAccess | null | undefined,
  pageRoutes: string[]
): boolean => {
  if (!user) {
    return false;
  }

  if (isAdminUser(user)) {
    return STORE_ADMIN_ROUTE_ALLOWLIST.some((route) => isRouteMatch(effectivePath, route));
  }

  const storePageRoutes = pageRoutes.filter(
    (route) => getSystemForPath(route, normalizePath(route)) === "store"
  );

  if (storePageRoutes.some((route) => isRouteMatch(effectivePath, route))) {
    return true;
  }

  return getStoreAllowedRoutes(user).some((route) => isRouteMatch(effectivePath, route));
};

const hasSystemAccess = (systems: string[], required: SystemKey): boolean => {
  if (!required) {
    return false;
  }

  if (required === "lead-to-order") {
    return systems.some((value) =>
      ["lead-to-order", "leadtoorder", "lead_to_order", "sales", "salesmodule", "crm"].includes(value)
    );
  }

  if (required === "hrfms") {
    return systems.some((value) =>
      ["hrfms", "hr-fms", "hr_fms", "hrms", "hr-fmsystem"].includes(value)
    );
  }

  if (required === "document") {
    return systems.some((value) =>
      [
        "document",
        "documents",
        "doc",
        "subscription",
        "loan",
        "payment",
        "resource",
        "resourcemanager",
      ].includes(value)
    );
  }

  if (required === "store") {
    // NOTE: "storeandpurchase" is intentionally NOT here.
    // hasStoreModuleAccess handles detection; hasSystemAccess controls full route-level access.
    // Users with system_access="Store and Purchase" only get the 4 base routes, not everything.
    return systems.some((value) =>
      ["store", "stores", "storefms", "store-fms", "inventory"].includes(value)
    );
  }

  if (required === "checklist") {
    return systems.some((value) =>
      [
        "checklist",
        "checklistcombined",
        "checklist-combined",
        "maintenance",
        "housekeeping",
      ].includes(value)
    );
  }

  if (required === "gatepass") {
    return systems.some((value) =>
      [
        "gatepass",
        "visitorgatepass",
        "closegatepass",
        "visitorpass",
      ].includes(value)
    );
  }

  if (required === "o2d") {
    return systems.some((value) =>
      ["o2d", "logistic", "logistics", "dispatch"].includes(value)
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

  if (normalizedPath.startsWith("/checklist")) {
    return "checklist";
  }

  if (normalizedPath.startsWith("/gatepass")) {
    return "gatepass";
  }

  if (normalizedPath.startsWith("/lead-to-order") || lowerPath.includes("tab=lead-to-order")) {
    return "lead-to-order";
  }

  if (normalizedPath.startsWith("/hrfms") || lowerPath.includes("tab=hrfms")) {
    return "hrfms";
  }

  if (normalizedPath.startsWith("/store") || lowerPath.includes("tab=store")) {
    return "store";
  }

  if (
    normalizedPath.startsWith("/document") ||
    normalizedPath.startsWith("/subscription") ||
    normalizedPath.startsWith("/loan") ||
    normalizedPath.startsWith("/payment") ||
    normalizedPath.startsWith("/account") ||
    normalizedPath.startsWith("/resource-manager") ||
    normalizedPath.startsWith("/master") ||
    lowerPath.includes("tab=document")
  ) {
    return "document";
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
      const hasDocument = hasSystemAccess(availableSystems, "document");
      if (hasHrfms && !hasO2d) {
        return "/hrfms/dashboard";
      }
      if (hasDocument && !hasO2d && !hasHrfms) {
        return "/document";
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

  if (!user || (!user.system_access && !user.page_access && !user.user_access && !user.store_access)) {
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

  if (currentSystem === "store") {
    return isStorePathAllowed(effectivePath, user, pageRoutes) || systemMatch;
  }

  if (
    effectivePath === "/" &&
    (systemMatch || pageRoutes.length > 0 || systemAccess.length > 0 || hasStoreModuleAccess(user))
  ) {
    return true;
  }

  return systemMatch;
};

export const getDefaultAllowedPath = (user: UserAccess | null | undefined): string => {
  if (!user) return "/login";
  return "/";
};
