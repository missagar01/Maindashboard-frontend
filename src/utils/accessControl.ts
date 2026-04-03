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
  | "sales"
  | "hrfms"
  | "document"
  | "store"
  | "project"
  | "checklist"
  | "gatepass"
  | null;

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
  "/gatepass-apply": "/hrfms/gatepass-apply",
  "/gatepass-list": "/hrfms/gatepass-list",
  "/gatepass-approved-list": "/hrfms/gatepass-approved-list",
  "/condidate-list": "/hrfms/condidate-list",
  "/condidate-select": "/hrfms/condidate-select",
  "/resume": "/hrfms/resume",
};

const CHECKLIST_PAGE_SLUG_ROUTE_MAP: Record<string, string> = {
  dashboard: "/checklist",
  assigntask: "/checklist/assign-task",
  misreport: "/checklist/mis-report",
  hrmanager: "/checklist/hrmanager",
  taskverification: "/checklist/hrmanager",
  machines: "/checklist/machines",
  alltask: "/checklist/all-task",
  quicktask: "/checklist/quick-task",
  delegation: "/checklist/delegation",
  housekeepingverify: "/checklist/housekeeping-verify",
  setting: "/checklist/settings",
  checklistdepartmenttask: "/checklist/department-task",
};

const CHECKLIST_LEGACY_PATH_ROUTE_MAP: Record<string, string> = {
  "/dashboard/admin": "/checklist",
  "/dashboard/assign-task": "/checklist/assign-task",
  "/dashboard/delegation-task": "/checklist/delegation-task",
  "/dashboard/delegation": "/checklist/delegation",
  "/dashboard/all-task": "/checklist/all-task",
  "/dashboard/hrmanager": "/checklist/hrmanager",
  "/dashboard/quick-task": "/checklist/quick-task",
  "/dashboard/machines": "/checklist/machines",
  "/dashboard/machines/new": "/checklist/machines/new",
  "/dashboard/housekeeping-verify": "/checklist/housekeeping-verify",
  "/dashboard/mis-report": "/checklist/mis-report",
  "/dashboard/setting": "/checklist/settings",
  "/assign-task": "/checklist/assign-task",
  "/admin/dashboard": "/checklist",
  "/admin/assign-task": "/checklist/assign-task",
  "/admin/delegation-task": "/checklist/delegation-task",
  "/admin/all-task": "/checklist/all-task",
  "/admin/mis-report": "/checklist/mis-report",
  "/admin/machines": "/checklist/machines",
  "/admin/quick": "/checklist/quick-task",
};

export const PAGE_NAME_TO_ROUTE_MAP: Record<string, string> = {
  Dashboard: "/",
  "O2D Dashboard": "/o2d/dashboard",
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
  "Assign Task": "/lead-to-order/leads",
  Delegation: "/lead-to-order/follow-up",
  "All Task": "/lead-to-order/call-tracker",
  Customers: "/o2d/customers",
  "Follow Ups": "/o2d/follow-ups",
  "Project Dashboard": "/project/dashboard",
  Projects: "/project/projects",
  "Daily Logs": "/project/dpr",
  "Material Stock": "/project/materials",
  "Project Setup": "/project/setup",
  "Project Users": "/project/users",
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
  "Gate Pass Apply": "/hrfms/gatepass-apply",
  "Gate Pass List": "/hrfms/gatepass-list",
  "Approved Gate Pass": "/hrfms/gatepass-approved-list",
  "Interviwer List": "/hrfms/condidate-list",
  "Selected Condidate": "/hrfms/condidate-select",
  "Candidate Status": "/hrfms/condidate-list",
  "Selected Candidate": "/hrfms/condidate-select",
  "Department Tasks": "/checklist/department-task",
  "Checklist Combined": "/checklist",
  Checklist: "/checklist",
  "Task Verification": "/checklist/hrmanager",
  "Housekeeping Verify": "/checklist/housekeeping-verify",
  "MIS Report": "/checklist/mis-report",
  "Visitor Gate Pass": "/gatepass/approvals",
  Approvals: "/gatepass/approvals",
  "Gate Pass Approvals": "/gatepass/approvals",
  "All Data": "/gatepass/all-data",
  "Gate Pass All Data": "/gatepass/all-data",
  "Request List": "/gatepass/request-visit",
  "Gate Pass Request Visit": "/gatepass/request-visit",
  "Gate Pass Request List": "/gatepass/request-visit",
  "Close Gate Pass": "/gatepass/close-pass",
  "Close Pass": "/gatepass/close-pass",
  "Gate Pass Close Pass": "/gatepass/close-pass",
  "Sales Module": "/lead-to-order/leads",
  "System Access": "/lead-to-order/settings",
  "Page Access": "/lead-to-order/settings",
  Logistic: "/lead-to-order/leads",
  HRMS: "/hrfms/dashboard",
  "Resource Manager": "/resource-manager",
  "Document Dashboard": "/document/dashboard",
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
  "Lead Settings": "/lead-to-order/settings",
  Setting: "/lead-to-order/settings",
  "Store Dashboard": "/store/dashboard",
  "Store Issue": "/store/store-issue",
  Indent: "/store/approve-indent",
  "Approve Indents": "/store/approve-indent",
  "Approve Indent HOD": "/store/approve-indent-data",
  "Approve Indent GM": "/store/approve-indent-gm",
  "Approve Indent Data": "/store/approve-indent-data",
  "Create PO": "/store/create-po",
  "Purchase Order": "/store/pending-indents",
  "Pending Indents": "/store/pending-indents",
  "Pending POs": "/store/pending-pos",
  "Vendor Registration": "/store/vendor-registration",
  "Vender Registration": "/store/vendor-registration",
  "Store Out Approval": "/store/store-out-approval",
  "Completed Items": "/store/completed-items",
  Inventory: "/store/inventory",
  Returnable: "/store/returnable",
  "Item Issue": "/store/item-issue",
  "Receive Items": "/store/receive-items",
  "Rate Approval": "/store/rate-approval",
  "Vendor Update": "/store/vendor-update",
  Administration: "/store/administration",
  Settings: "/store/settings",
  "Store Settings": "/store/settings",
  "User Indent": "/store/user-indent",
  "Create Indent": "/store/user-indent",
  "My Indent": "/store/erp-indent",
  "User Indent List": "/store/user-indent-list",
  "Requested Indent": "/store/user-indent-list-indent",
  "User Indent Details": "/store/user-indent-list-indent",
  Requisition: "/store/user-requisition",
  "User Requisitions": "/store/user-requisition",
  "Repair Gate Pass": "/store/repair-gate-pass",
  "Repair Gate Pass - Pending": "/store/repair-gate-pass",
  "Repair Gate Pass History": "/store/repair-gate-pass/history",
  "Repair Gate Pass - History": "/store/repair-gate-pass/history",
  "Repair Follow Up": "/store/repair-followup",
  "Store GRN": "/store/store-grn",
  "Pending Gate Entry": "/store/pending-gate-entry",
  "Store GRN Admin Approval": "/store/store-grn-admin",
  "Store GRN GM Approval": "/store/store-grn-gm",
  "Store GRN Close": "/store/store-grn-close",
};

const STORE_OUT_ONLY_EMPLOYEE_IDS = new Set(["S07632", "S08088"]);
const APPROVE_INDENT_ONLY_EMPLOYEE_IDS = new Set(["S00116"]);

const STORE_USER_BASE_ROUTES = [
  "/store/erp-indent",
  "/store/user-indent-list-indent", // My Indent — always accessible
  "/store/user-requisition",         // Requisition — always accessible
  "/store/user-indent",              // Create Indent — always accessible
];

const STORE_ACCESS_ROUTE_MAP: Record<string, string[]> = {
  DASHBOARD: ["/store/dashboard"],
  "STORE DASHBOARD": ["/store/dashboard"],
  "STORE ISSUE": ["/store/store-issue", "/store/item-issue"],
  INDENT: ["/store/approve-indent", "/store/indent"],
  "APPROVE INDENT": ["/store/approve-indent"],
  "APPROVE INDENT HOD": ["/store/approve-indent-data"],
  "APPROVE INDENT GM": ["/store/approve-indent-gm"],
  "APPROVE INDENT DATA": ["/store/approve-indent-data"],
  "CREATE PO": ["/store/create-po"],
  "PURCHASE ORDER": ["/store/pending-indents"],
  "PENDING INDENTS": ["/store/pending-indents"],
  "PENDING POS": ["/store/pending-pos"],
  "VENDOR REGISTRATION": ["/store/vendor-registration"],
  "VENDER REGISTRATION": ["/store/vendor-registration"],
  INVENTORY: ["/store/inventory"],
  RETURNABLE: ["/store/returnable"],
  "ITEM ISSUE": ["/store/item-issue"],
  "RECEIVE ITEMS": ["/store/receive-items"],
  "RATE APPROVAL": ["/store/rate-approval"],
  "VENDOR UPDATE": ["/store/vendor-update"],
  ADMINISTRATION: ["/store/administration"],
  SETTINGS: ["/store/settings"],
  "REPAIR GATE PASS": ["/store/repair-gate-pass"],
  "REPAIR GATE PASS HISTORY": ["/store/repair-gate-pass/history"],
  "REPAIR FOLLOW UP": ["/store/repair-followup"],
  "STORE GRN": ["/store/store-grn"],
  "PENDING GATE ENTRY": ["/store/pending-gate-entry"],
  "STORE GRN ADMIN APPROVAL": ["/store/store-grn-admin"],
  "STORE GRN GM APPROVAL": ["/store/store-grn-gm"],
  "STORE GRN CLOSE": ["/store/store-grn-close"],
  "STORE OUT APPROVAL": ["/store/store-out-approval"],
  "COMPLETED ITEMS": ["/store/completed-items"],
  "MY INDENT": ["/store/erp-indent"],
  "USER INDENT LIST": ["/store/user-indent-list"],
  "REQUESTED INDENT": ["/store/user-indent-list-indent"],
  "USER INDENT DETAILS": ["/store/user-indent-list-indent"],
  REQUISITION: ["/store/user-requisition"],
  "USER REQUISITIONS": ["/store/user-requisition"],
  "CREATE INDENT": ["/store/user-indent"],
};

const STORE_ADMIN_ROUTE_ALLOWLIST = [
  "/store/dashboard",
  "/store/store-issue",
  "/store/indent",
  "/store/store-out-approval",
  "/store/pending-pos",
  "/store/vendor-registration",
  "/store/create-po",
  "/store/approve-indent",
  "/store/approve-indent-data",
  "/store/approve-indent-gm",
  "/store/completed-items",
  "/store/inventory",
  "/store/item-issue",
  "/store/receive-items",
  "/store/erp-indent",
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

const parseDelimitedAccess = (value?: string | null): string[] => {
  if (!value || typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (typeof entry === "string" ? entry.trim() : String(entry).trim()))
          .filter((entry) => entry && entry.toUpperCase() !== "NULL");
      }
    } catch {
      // fall back to comma-separated parsing
    }
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item.toUpperCase() !== "NULL");
};

const parseSystemAccess = (user: UserAccess | null | undefined): string[] => {
  return parseDelimitedAccess(user?.system_access)
    .map((item) => item.trim().toLowerCase().replace(/\s+/g, ""))
    .filter(Boolean);
};

const parseStoreAccess = (user: UserAccess | null | undefined): string[] => {
  return parseDelimitedAccess(user?.store_access)
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
  if (mappedRoutes.length === 0) {
    return [];
  }

  return Array.from(new Set([...STORE_USER_BASE_ROUTES, ...mappedRoutes]));
};

export const hasStoreModuleAccess = (user: UserAccess | null | undefined): boolean => {
  if (!user) {
    return false;
  }

  const employeeId = (user.employee_id || "").trim().toUpperCase();
  // "Store and Purchase" in DB normalizes to "storeandpurchase"
  return (
    isAdminUser(user) ||
    parseStoreAccess(user).length > 0 ||
    STORE_OUT_ONLY_EMPLOYEE_IDS.has(employeeId) ||
    APPROVE_INDENT_ONLY_EMPLOYEE_IDS.has(employeeId) ||
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
  if (isAdminUser(user)) {
    return true;
  }

  const storePageRoutes = pageRoutes.filter(
    (route) => getSystemForPath(route, normalizePath(route)) === "store"
  );

  if (storePageRoutes.length > 0) {
    return storePageRoutes.some((route) => isRouteMatch(effectivePath, route));
  }

  return getStoreAllowedRoutes(user).some((route) => isRouteMatch(effectivePath, route));
};

const hasSystemAccess = (systems: string[], required: SystemKey): boolean => {
  if (!required) {
    return false;
  }

  if (required === "sales") {
    return systems.some((value) =>
      [
        "lead-to-order",
        "leadtoorder",
        "lead_to_order",
        "sales",
        "salesmodule",
        "sale",
        "crm",
        "o2d",
        "logistic",
        "logistics",
        "dispatch",
        "batchcode",
        "batch",
      ].includes(value)
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
        "subscriptions",
        "loan",
        "loans",
        "payment",
        "payments",
        "resource",
        "resourcemanager",
      ].includes(value)
    );
  }

  if (required === "store") {
    return systems.some((value) =>
      ["store", "stores", "storefms", "store-fms", "inventory", "storeandpurchase", "storepurchase", "purchase"].includes(value)
    );
  }

  if (required === "project") {
    return systems.some((value) =>
      ["project", "projects", "civiltrack", "civil", "siteproject"].includes(value)
    );
  }

  if (required === "checklist") {
    return systems.some((value) =>
      [
        "checklist",
        "checklistcombined",
        "checklist-combined",
        "checklist_combined",
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

  return systems.includes(required);
};

const getSystemForPath = (fullPath: string, normalizedPath: string): SystemKey => {
  const lowerPath = fullPath.toLowerCase();

  if (
    normalizedPath === "/" ||
    normalizedPath === "/dashboard"
  ) {
    return null;
  }

  if (
    normalizedPath.startsWith("/o2d") ||
    normalizedPath.startsWith("/batchcode") ||
    normalizedPath.startsWith("/lead-to-order") ||
    lowerPath.includes("tab=o2d") ||
    lowerPath.includes("tab=batchcode") ||
    lowerPath.includes("tab=lead-to-order")
  ) {
    return "sales";
  }

  if (normalizedPath.startsWith("/project") || lowerPath.includes("tab=project")) {
    return "project";
  }

  if (
    normalizedPath.startsWith("/checklist") ||
    normalizedPath.startsWith("/maintenance") ||
    normalizedPath.startsWith("/mainatce") ||
    normalizedPath.startsWith("/housekeeping") ||
    normalizedPath.startsWith("/houskeeping")
  ) {
    return "checklist";
  }

  if (normalizedPath.startsWith("/gatepass")) {
    return "gatepass";
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
  const resolveDashboardRoute = (): string => {
    const hasSales = hasSystemAccess(availableSystems, "sales");
    const hasHrfms = hasSystemAccess(availableSystems, "hrfms");
    const hasStore = hasSystemAccess(availableSystems, "store");
    const hasProject = hasSystemAccess(availableSystems, "project");
    const hasDocument = hasSystemAccess(availableSystems, "document");
    const hasChecklist = hasSystemAccess(availableSystems, "checklist");
    const hasGatePass = hasSystemAccess(availableSystems, "gatepass");

    if (hasSales) return "/o2d/dashboard";
    if (hasHrfms) return "/hrfms/dashboard";
    if (hasStore) return "/store/dashboard";
    if (hasProject) return "/project/dashboard";
    if (hasDocument) return "/document/dashboard";
    if (hasChecklist) return "/checklist";
    if (hasGatePass) return "/gatepass/approvals";
    return "/";
  };

  const normalizeLookupKey = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const page = rawPage.trim();
  if (!page) {
    return null;
  }

  const hasChecklist = hasSystemAccess(availableSystems, "checklist");

  if (page.startsWith("/")) {
    const normalized = normalizePath(page);

    if (normalized === "/dashboard") {
      return resolveDashboardRoute();
    }

    // Normalize module root aliases to concrete page routes so sidebar filtering
    // can safely use exact page matches without over-granting sibling pages.
    if (normalized === "/document") return "/document/dashboard";
    if (normalized === "/subscription") return "/subscription/all";
    if (normalized === "/store") return "/store/dashboard";
    if (normalized === "/project") return "/project/dashboard";
    if (normalized === "/hrfms") return "/hrfms/dashboard";
    if (normalized === "/gatepass") return "/gatepass/approvals";
    if (normalized === "/gatepass/visitor") return "/gatepass/approvals";
    if (normalized === "/gatepass/close") return "/gatepass/close-pass";
    if (hasChecklist && CHECKLIST_LEGACY_PATH_ROUTE_MAP[normalized]) {
      return CHECKLIST_LEGACY_PATH_ROUTE_MAP[normalized];
    }

    if (HRFMS_LEGACY_ROUTE_MAP[normalized] && hasSystemAccess(availableSystems, "hrfms")) {
      return HRFMS_LEGACY_ROUTE_MAP[normalized];
    }

    return normalized;
  }

  const normalizedPageLookup = normalizeLookupKey(page);
  if (hasChecklist && CHECKLIST_PAGE_SLUG_ROUTE_MAP[normalizedPageLookup]) {
    return CHECKLIST_PAGE_SLUG_ROUTE_MAP[normalizedPageLookup];
  }

  const matchedKey = Object.keys(PAGE_NAME_TO_ROUTE_MAP).find(
    (key) => normalizeLookupKey(key) === normalizedPageLookup
  );

  if (!matchedKey) {
    return null;
  }

  const mappedRoute = PAGE_NAME_TO_ROUTE_MAP[matchedKey];
  if (mappedRoute === "/" && normalizedPageLookup === "dashboard") {
    return resolveDashboardRoute();
  }

  return mappedRoute;
};

const parsePageRoutes = (user: UserAccess | null | undefined): string[] => {
  const availableSystems = parseSystemAccess(user);
  const source = parseDelimitedAccess(user?.page_access);

  const mapped = source
    .map((page) => normalizePageEntryToRoute(page, availableSystems))
    .filter((value): value is string => Boolean(value));

  const routes = new Set(mapped);

  if (hasStoreModuleAccess(user)) {
    getStoreAllowedRoutes(user).forEach((route) => routes.add(route));
  }

  const hasExplicitPageAccessConfig = source.length > 0;

  // Inject system default routes so the sidebar at least opens the root page when the user has system_access.
  // Gatepass is intentionally excluded here because its sidebar should follow explicit page_access entries.
  if (hasSystemAccess(availableSystems, "hrfms")) routes.add("/hrfms/dashboard");
  if (hasSystemAccess(availableSystems, "project")) routes.add("/project/dashboard");
  if (!hasExplicitPageAccessConfig && hasSystemAccess(availableSystems, "document")) {
    routes.add("/document/dashboard");
  }
  // Store dashboard is mapped by getStoreAllowedRoutes above automatically
  if (hasSystemAccess(availableSystems, "checklist")) routes.add("/checklist");

  return Array.from(routes);
};

export const getAllowedPageRoutes = (user: UserAccess | null | undefined): string[] => {
  return parsePageRoutes(user);
};

const hasAnyConfiguredAccess = (user: UserAccess | null | undefined): boolean => {
  if (!user) {
    return false;
  }

  return (
    parseSystemAccess(user).length > 0 ||
    parsePageRoutes(user).length > 0 ||
    parseStoreAccess(user).length > 0
  );
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

  if (!user) {
    return false;
  }

  const effectivePath = normalizePath(path);
  // Always allow home/dashboard for authenticated users
  if (effectivePath === "/" || effectivePath === "/dashboard") {
    return true;
  }

  const pageRoutes = parsePageRoutes(user);
  return pageRoutes.some((allowedPath) => isRouteMatch(effectivePath, allowedPath));
};

export const getDefaultAllowedPath = (user: UserAccess | null | undefined): string => {
  if (!user) return "/login";
  return "/";
};

export const getFirstAllowedPathForModule = (
  modulePath: string,
  user: UserAccess | null | undefined
): string | null => {
  if (!user) {
    return null;
  }

  const normalizedModulePath = normalizePath(modulePath);
  if (isPathAllowed(normalizedModulePath, user)) {
    return normalizedModulePath;
  }

  const currentSystem = getSystemForPath(modulePath, normalizedModulePath);
  if (!currentSystem) {
    return null;
  }

  const pageRoutes = parsePageRoutes(user);

  const sameSystemMatch = currentSystem
    ? pageRoutes.find((route) => {
      const routeSystem = getSystemForPath(route, normalizePath(route));
      return routeSystem === currentSystem && isPathAllowed(route, user);
    })
    : null;

  if (sameSystemMatch) {
    return sameSystemMatch;
  }

  return null;
};
