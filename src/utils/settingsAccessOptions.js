const createPageOption = (value, label, route, aliases = []) => ({
  value,
  label,
  route,
  aliases,
});

export const SYSTEM_OPTIONS = [
  { value: "CHECKLIST", label: "CHECKLIST" },
  { value: "MAINTENANCE", label: "MAINTENANCE" },
  { value: "HOUSEKEEPING", label: "HOUSEKEEPING" },
  { value: "STORE AND PURCHASE", label: "STORE AND PURCHASE" },
  { value: "HRFMS", label: "HRFMS" },
  { value: "VISITOR GATE PASS", label: "VISITOR GATE PASS" },
  { value: "SALES MODULE", label: "SALES MODULE" },
  { value: "PROJECT", label: "PROJECT" },
  { value: "SUBSCRIPTION", label: "SUBSCRIPTION" },
];

export const CHECKLIST_SHARED_PAGES = [
  createPageOption("dashboard", "Dashboard", "/checklist", [
    "Checklist Dashboard",
    "/checklist",
  ]),
  createPageOption("assign-task", "Assign Task", "/checklist/assign-task", [
    "Assign Task",
    "/checklist/assign-task",
  ]),
  createPageOption("mis-report", "MIS Report", "/checklist/mis-report", [
    "MIS Report",
    "/checklist/mis-report",
  ]),
  createPageOption("hrmanager", "Task Verification", "/checklist/hrmanager", [
    "HR Manager",
    "HRManager",
    "Task Verification",
    "/checklist/hrmanager",
    "/checklist/hr-manager",
  ]),
  createPageOption("machines", "Machines", "/checklist/machines", [
    "Machines",
    "/checklist/machines",
    "/maintenance/machines",
    "/mainatce/machines",
  ]),
  createPageOption("all-task", "All Task", "/checklist/all-task", [
    "All Task",
    "/checklist/all-task",
  ]),
  createPageOption("quick-task", "Quick Task", "/checklist/quick-task", [
    "Quick Task",
    "/checklist/quick-task",
  ]),
  createPageOption("delegation", "Delegation", "/checklist/delegation", [
    "Delegation",
    "/checklist/delegation",
  ]),
  createPageOption("housekeeping-verify", "Housekeeping Verify", "/checklist/housekeeping-verify", [
    "Housekeeping Verify",
    "/checklist/housekeeping-verify",
  ]),
  createPageOption("checklist-department-task", "Department Tasks", "/checklist/department-task", [
    "Department Tasks",
    "/checklist/department-task",
  ]),
  createPageOption("setting", "Setting", "/checklist/settings", [
    "Setting",
    "Settings",
    "/checklist/settings",
  ]),
];

export const PAGE_ROUTES = {
  CHECKLIST: CHECKLIST_SHARED_PAGES,
  MAINTENANCE: CHECKLIST_SHARED_PAGES,
  HOUSEKEEPING: CHECKLIST_SHARED_PAGES,
  "SALES MODULE": [
    createPageOption("Dashboard", "Dashboard", "/", ["/", "/o2d/dashboard", "O2D Dashboard"]),
    createPageOption("Orders", "Orders", "/o2d/orders", ["/o2d/orders"]),
    createPageOption("Enquiry", "Enquiry", "/o2d/enquiry", ["/o2d/enquiry"]),
    createPageOption("Enquiry List", "Enquiry List", "/o2d/enquiry-list", ["/o2d/enquiry-list"]),
    createPageOption("Pending Vehicles", "Pending Vehicles", "/o2d/process", ["/o2d/process"]),
    createPageOption("Customers", "Customers", "/o2d/customers", ["/o2d/customers"]),
    createPageOption("Follow Ups", "Follow Ups", "/o2d/follow-ups", ["/o2d/follow-ups"]),
    createPageOption("Hot Coil", "Hot Coil", "/batchcode/hot-coil", ["/batchcode/hot-coil"]),
    createPageOption("QC Lab", "QC Lab", "/batchcode/qc-lab", ["/batchcode/qc-lab"]),
    createPageOption("SMS Register", "SMS Register", "/batchcode/sms-register", ["/batchcode/sms-register"]),
    createPageOption("Recoiler", "Recoiler", "/batchcode/recoiler", ["/batchcode/recoiler"]),
    createPageOption("Pipe Mill", "Pipe Mill", "/batchcode/pipe-mill", ["/batchcode/pipe-mill"]),
    createPageOption("Laddel", "Laddel", "/batchcode/laddel", ["/batchcode/laddel"]),
    createPageOption("Tundis", "Tundis", "/batchcode/tundis", ["/batchcode/tundis"]),
    createPageOption("Leads", "Leads", "/lead-to-order/leads", ["/lead-to-order/leads"]),
    createPageOption("Follow Up", "Follow Up", "/lead-to-order/follow-up", ["/lead-to-order/follow-up"]),
    createPageOption("Call Tracker", "Call Tracker", "/lead-to-order/call-tracker", ["/lead-to-order/call-tracker"]),
    createPageOption("Quotation", "Quotation", "/lead-to-order/quotation", ["/lead-to-order/quotation"]),
  ],
  PROJECT: [
    createPageOption("Project Dashboard", "Dashboard", "/project/dashboard", [
      "/project",
      "/project/dashboard",
      "Project Dashboard",
      "Dashboard",
    ]),
    createPageOption("Projects", "Projects", "/project/projects", [
      "/project/projects",
      "Project Register",
    ]),
    createPageOption("Daily Logs", "Daily Logs", "/project/dpr", [
      "/project/dpr",
      "DPR",
      "Daily Progress",
    ]),
    createPageOption("Material Stock", "Material Stock", "/project/materials", [
      "/project/materials",
      "/project/material-stock",
      "Materials",
      "Material Inventory",
      "Material Registry",
    ]),
    createPageOption("Project Setup", "Project Setup", "/project/setup", [
      "/project/setup",
      "Setup",
      "BOQ Builder",
      "Architecture Architect",
    ]),
    createPageOption("Project Users", "Project Users", "/project/users", [
      "/project/users",
      "Users",
      "User Management",
      "Authorized Personnel",
    ]),
  ],
  HRFMS: [
    createPageOption("/dashboard", "Dashboard", "/hrfms/dashboard", ["HRFMS Dashboard", "/hrfms/dashboard"]),
    createPageOption("/my-profile", "My Profile", "/hrfms/my-profile", ["/hrfms/my-profile"]),
    createPageOption("/resume-request", "MainPower Request", "/hrfms/resume-request", ["MainPower Request", "/hrfms/resume-request"]),
    createPageOption("/requests", "Travel Form", "/hrfms/requests", ["Travel Form", "Travel Request", "/hrfms/requests"]),
    createPageOption("/resumes", "Resume", "/hrfms/resumes", ["/hrfms/resumes", "/hrfms/resume"]),
    createPageOption("/travel-status", "Travel Status", "/hrfms/travel-status", ["/hrfms/travel-status"]),
    createPageOption("/leave-request", "Leave Request", "/hrfms/leave-request", ["/hrfms/leave-request"]),
    createPageOption("/plant-visitor", "Plant Visitor", "/hrfms/plant-visitor", ["/hrfms/plant-visitor"]),
    createPageOption("/gatepass-apply", "Gate Pass Apply", "/hrfms/gatepass-apply", ["Gate Pass Apply", "/hrfms/gatepass-apply"]),
    createPageOption("/gatepass-list", "Gate Pass List", "/hrfms/gatepass-list", ["Gate Pass List", "/hrfms/gatepass-list"]),
    createPageOption("/gatepass-approved-list", "Approved Gate Pass", "/hrfms/gatepass-approved-list", ["Approved Gate Pass", "/hrfms/gatepass-approved-list"]),
    createPageOption("/commercial-head-approval", "Hod Approval", "/hrfms/commercial-head-approval", ["Hod Approval", "/hrfms/commercial-head-approval"]),
    createPageOption("/leave-hr-approvals", "HR Approvals", "/hrfms/leave-hr-approvals", ["HR Approvals", "/hrfms/leave-hr-approvals"]),
    createPageOption("/resume-list", "MainPower List", "/hrfms/resume-list", ["MainPower List", "/hrfms/resume-list"]),
    createPageOption("/plant-visitorlist", "Plant Visitor List", "/hrfms/plant-visitorlist", ["/hrfms/plant-visitorlist"]),
    createPageOption("/leave-approvals", "Leave Approvals", "/hrfms/leave-approvals", ["/hrfms/leave-approvals"]),
    createPageOption("/tickets", "Tickets", "/hrfms/tickets", ["/hrfms/tickets"]),
    createPageOption("/resume-form", "Resume Upload", "/hrfms/resume-form", ["Resume Upload", "/hrfms/resume-form"]),
    createPageOption("/condidate-list", "Interviwer List", "/hrfms/condidate-list", ["Candidate Status", "/hrfms/condidate-list"]),
    createPageOption("/condidate-select", "Selected Condidate", "/hrfms/condidate-select", ["Selected Candidate", "/hrfms/condidate-select"]),
    createPageOption("/employee-create", "Employee", "/hrfms/employee-create", ["/hrfms/employee-create"]),
  ],
  "STORE AND PURCHASE": [
    createPageOption("Store Dashboard", "Dashboard", "/store/dashboard", ["/store/dashboard"]),
    createPageOption("Store Issue", "Store Issue", "/store/store-issue", ["/store/store-issue"]),
    createPageOption("Create PO", "Create PO", "/store/create-po", ["/store/create-po"]),
    createPageOption("Indent", "Indent", "/store/approve-indent", ["Approve Indents", "/store/approve-indent", "/store/indent"]),
    createPageOption("Approve Indent HOD", "Approve Indent HOD", "/store/approve-indent-data", ["Approve Indent Data", "/store/approve-indent-data"]),
    createPageOption("Approve Indent GM", "Approve Indent GM", "/store/approve-indent-gm", ["/store/approve-indent-gm"]),
    createPageOption("Purchase Order", "Purchase Order", "/store/pending-indents", ["Pending Indents", "/store/pending-indents"]),
    createPageOption("Pending POs", "Pending POs", "/store/pending-pos", ["/store/pending-pos"]),
    createPageOption("Item Issue", "Item Issue", "/store/item-issue", ["/store/item-issue"]),
    createPageOption("Inventory", "Inventory", "/store/inventory", ["/store/inventory"]),
    createPageOption("Returnable", "Returnable", "/store/returnable", ["/store/returnable"]),
    createPageOption("Repair Gate Pass", "Repair Gate Pass", "/store/repair-gate-pass", ["Repair Gate Pass - Pending", "/store/repair-gate-pass"]),
    createPageOption("Repair Follow Up", "Repair Follow Up", "/store/repair-followup", ["/store/repair-followup"]),
    createPageOption("Store GRN", "Store GRN", "/store/store-grn", ["/store/store-grn"]),
    createPageOption("Store GRN GM Approval", "Store GRN GM Approval", "/store/store-grn-gm", ["/store/store-grn-gm"]),
    createPageOption("Store GRN Close", "Store GRN Close", "/store/store-grn-close", ["/store/store-grn-close"]),
    createPageOption("Store Out Approval", "Store Out Approval", "/store/store-out-approval", ["/store/store-out-approval"]),
    createPageOption("Completed Items", "Completed Items", "/store/completed-items", ["/store/completed-items"]),
    createPageOption("My Indent", "My Indent", "/store/erp-indent", ["/store/erp-indent"]),
    createPageOption("User Indent List", "User Indent List", "/store/user-indent-list", ["/store/user-indent-list"]),
    createPageOption("Requested Indent", "Requested Indent", "/store/user-indent-list-indent", ["User Indent Details", "/store/user-indent-list-indent"]),
    createPageOption("Requisition", "Requisition", "/store/user-requisition", ["User Requisitions", "/store/user-requisition"]),
    createPageOption("Create Indent", "Create Indent", "/store/user-indent", ["User Indent", "/store/user-indent"]),
  ],
  SUBSCRIPTION: [
    createPageOption("Document Dashboard", "Document Dashboard", "/document/dashboard", ["/document/dashboard"]),
    createPageOption("Resource Manager", "Resource Manager", "/resource-manager", ["/resource-manager"]),
    createPageOption("Document Renewal", "Document Renewal", "/document/renewal", ["/document/renewal"]),
    createPageOption("Subscription Renewal", "Subscription Renewal", "/subscription/renewal", ["/subscription/renewal"]),
    createPageOption("Subscription Approval", "Subscription Approval", "/subscription/approval", ["/subscription/approval"]),
    createPageOption("Document Shared", "Document Shared", "/document/shared", ["/document/shared"]),
    createPageOption("All Loan", "All Loan", "/loan/all", ["/loan/all"]),
    createPageOption("Request Forecloser", "Request Forecloser", "/loan/foreclosure", ["/loan/foreclosure"]),
    createPageOption("Master", "Master", "/master", ["/master"]),
  ],
  "VISITOR GATE PASS": [
    createPageOption("Gate Pass Approvals", "Approvals", "/gatepass/approvals", ["/gatepass/approvals", "/gatepass/visitor"]),
    createPageOption("Gate Pass All Data", "All Data", "/gatepass/all-data", ["/gatepass/all-data"]),
    createPageOption("Close Gate Pass", "Close Gate Pass", "/gatepass/close-pass", ["/gatepass/close-pass", "/gatepass/close"]),
    createPageOption("Gate Pass Request List", "Request List", "/gatepass/request-visit", ["/gatepass/request-visit"]),
  ],
};

const CHECKLIST_FAMILY_SYSTEMS = ["CHECKLIST", "MAINTENANCE", "HOUSEKEEPING"];
const CHECKLIST_FAMILY_LABEL = "CHECKLIST / MAINTENANCE / HOUSEKEEPING";
const ALLOWED_SYSTEM_VALUES = new Set(SYSTEM_OPTIONS.map((option) => option.value));
const ALL_PAGE_OPTIONS = Object.entries(PAGE_ROUTES).flatMap(([system, pages]) =>
  pages.map((page) => ({ system, ...page }))
);

const normalizeLookupKey = (value) =>
  (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const SYSTEM_ALIASES = {
  checklist: "CHECKLIST",
  checklistcombined: "CHECKLIST",
  housekeeping: "HOUSEKEEPING",
  maintenance: "MAINTENANCE",
  store: "STORE AND PURCHASE",
  stores: "STORE AND PURCHASE",
  storeandpurchase: "STORE AND PURCHASE",
  storefms: "STORE AND PURCHASE",
  inventory: "STORE AND PURCHASE",
  purchase: "STORE AND PURCHASE",
  hrms: "HRFMS",
  hrfms: "HRFMS",
  visitorgatepass: "VISITOR GATE PASS",
  gatepass: "VISITOR GATE PASS",
  closegatepass: "VISITOR GATE PASS",
  visitorpass: "VISITOR GATE PASS",
  salesmodule: "SALES MODULE",
  sale: "SALES MODULE",
  sales: "SALES MODULE",
  leadtoorder: "SALES MODULE",
  o2d: "SALES MODULE",
  batchcode: "SALES MODULE",
  project: "PROJECT",
  projects: "PROJECT",
  civiltrack: "PROJECT",
  civil: "PROJECT",
  siteproject: "PROJECT",
  subscription: "SUBSCRIPTION",
  subscriptions: "SUBSCRIPTION",
  documentcontrol: "SUBSCRIPTION",
  document: "SUBSCRIPTION",
  documents: "SUBSCRIPTION",
  docs: "SUBSCRIPTION",
  loan: "SUBSCRIPTION",
  loans: "SUBSCRIPTION",
  payment: "SUBSCRIPTION",
  payments: "SUBSCRIPTION",
  resourcemanager: "SUBSCRIPTION",
};

export const parseCsv = (value) =>
  (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const toUnique = (values) => Array.from(new Set(values));

export const normalizeSystemName = (value) => {
  const normalized = normalizeLookupKey(value);
  return SYSTEM_ALIASES[normalized] || null;
};

const normalizeRoutePath = (value) => {
  const normalized = (value || "").trim().split("?")[0].replace(/\/$/, "");
  return normalized || "/";
};

export const normalizeSystemAccessEntries = (value) =>
  toUnique(
    (Array.isArray(value) ? value : parseCsv(value))
      .map(normalizeSystemName)
      .filter((entry) => Boolean(entry) && ALLOWED_SYSTEM_VALUES.has(entry))
  );

export const formatSystemAccessForDisplay = (value) =>
  normalizeSystemAccessEntries(value).join(",");

const AMBIGUOUS_PAGE_MATCH = "__ambiguous_page_match__";

export const getPageOptionsForSystems = (systems) => {
  const normalizedSystems = normalizeSystemAccessEntries(systems);
  const options =
    normalizedSystems.length > 0
      ? ALL_PAGE_OPTIONS.filter((option) => normalizedSystems.includes(option.system))
      : ALL_PAGE_OPTIONS;

  const dedupedByValue = new Map();
  options.forEach((option) => {
    if (!dedupedByValue.has(option.value)) {
      dedupedByValue.set(option.value, option);
    }
  });

  return Array.from(dedupedByValue.values());
};

export const getPageOptionGroupsForSystems = (systems) => {
  const normalizedSystems = normalizeSystemAccessEntries(systems);
  if (normalizedSystems.length === 0) {
    return [];
  }

  const groups = [];

  if (normalizedSystems.some((system) => CHECKLIST_FAMILY_SYSTEMS.includes(system))) {
    groups.push({
      systemLabel: CHECKLIST_FAMILY_LABEL,
      pages: CHECKLIST_SHARED_PAGES,
    });
  }

  SYSTEM_OPTIONS.forEach((option) => {
    if (CHECKLIST_FAMILY_SYSTEMS.includes(option.value)) {
      return;
    }

    if (normalizedSystems.includes(option.value) && PAGE_ROUTES[option.value]?.length) {
      groups.push({
        systemLabel: option.label,
        pages: PAGE_ROUTES[option.value],
      });
    }
  });

  return groups;
};

const resolveSinglePageMatch = (candidates, matcher) => {
  const matches = candidates.filter(matcher);
  if (matches.length === 1) {
    return matches[0].value;
  }
  if (matches.length > 1) {
    return AMBIGUOUS_PAGE_MATCH;
  }
  return null;
};

export const normalizePageName = (value, systems = []) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;

  const scopedCandidates = getPageOptionsForSystems(systems);
  const candidateSets = [scopedCandidates];
  if (scopedCandidates.length !== ALL_PAGE_OPTIONS.length) {
    candidateSets.push(ALL_PAGE_OPTIONS);
  }

  if (trimmed.startsWith("/")) {
    const normalizedRoute = normalizeRoutePath(trimmed);

    for (const candidates of candidateSets) {
      const result = resolveSinglePageMatch(
        candidates,
        (page) =>
          [page.value, page.route, ...(page.aliases || [])]
            .filter((entry) => typeof entry === "string" && entry.startsWith("/"))
            .some((entry) => normalizeRoutePath(entry) === normalizedRoute)
      );

      if (result === AMBIGUOUS_PAGE_MATCH) {
        return normalizedRoute;
      }

      if (result) {
        return result;
      }
    }

    return normalizedRoute;
  }

  const normalizedKey = normalizeLookupKey(trimmed);
  const matchers = [
    (page) => normalizeLookupKey(page.value) === normalizedKey,
    (page) => normalizeLookupKey(page.label) === normalizedKey,
    (page) =>
      (page.aliases || []).some(
        (alias) =>
          typeof alias === "string" &&
          !alias.startsWith("/") &&
          normalizeLookupKey(alias) === normalizedKey
      ),
  ];

  for (const candidates of candidateSets) {
    for (const matcher of matchers) {
      const result = resolveSinglePageMatch(candidates, matcher);
      if (result === AMBIGUOUS_PAGE_MATCH) {
        return trimmed;
      }
      if (result) {
        return result;
      }
    }
  }

  return trimmed;
};

export const normalizePageAccessEntries = (value, systems = []) =>
  toUnique(
    (Array.isArray(value) ? value : parseCsv(value))
      .map((page) => normalizePageName(page, systems))
      .filter(Boolean)
  );
