"use client"

import { useEffect, useMemo, useState, useCallback } from "react";
import { PencilIcon, TrashBinIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import * as leadToOrderAPI from "../../api/leadToOrderAPI";

// System options
const SYSTEM_OPTIONS = [
  { value: "CHECKLIST", label: "CHECKLIST" },
  { value: "MAINTENANCE", label: "MAINTENANCE" },
  { value: "STORE AND PURCHASE", label: "STORE AND PURCHASE" },
  { value: "HRFMS", label: "HRFMS" },
  { value: "VISITOR GATE PASS", label: "VISITOR GATE PASS" },
  { value: "SALES MODULE", label: "SALES MODULE" },
  { value: "SUBSCRIPTION", label: "SUBSCRIPTION" },
];

const createPageOption = (value, label, route, aliases = []) => ({
  value,
  label,
  route,
  aliases,
});

const CHECKLIST_SHARED_PAGES = [
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
  createPageOption("hrmanager", "HR Manager", "/checklist/hr-manager", [
    "HR Manager",
    "HRManager",
    "/checklist/hr-manager",
  ]),
  createPageOption("machines", "Machines", "/maintenance/machines", [
    "Machines",
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
  createPageOption("setting", "Setting", "/checklist/settings", [
    "Setting",
    "Settings",
    "/checklist/settings",
  ]),
];

// Page routes organized by system
// `value` is the canonical string persisted in `page_access`.
const PAGE_ROUTES = {
  "CHECKLIST": CHECKLIST_SHARED_PAGES,
  "MAINTENANCE": CHECKLIST_SHARED_PAGES,
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
  "HRFMS": [
    createPageOption("/dashboard", "Dashboard", "/hrfms/dashboard", ["HRFMS Dashboard", "/hrfms/dashboard"]),
    createPageOption("/my-profile", "My Profile", "/hrfms/my-profile", ["/hrfms/my-profile"]),
    createPageOption("/resume-request", "MainPower Request", "/hrfms/resume-request", ["MainPower Request", "/hrfms/resume-request"]),
    createPageOption("/requests", "Travel Form", "/hrfms/requests", ["Travel Form", "Travel Request", "/hrfms/requests"]),
    createPageOption("/resumes", "Resume", "/hrfms/resumes", ["/hrfms/resumes", "/hrfms/resume"]),
    createPageOption("/travel-status", "Travel Status", "/hrfms/travel-status", ["/hrfms/travel-status"]),
    createPageOption("/leave-request", "Leave Request", "/hrfms/leave-request", ["/hrfms/leave-request"]),
    createPageOption("/plant-visitor", "Plant Visitor", "/hrfms/plant-visitor", ["/hrfms/plant-visitor"]),
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
  "SUBSCRIPTION": [
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

const ALLOWED_SYSTEM_VALUES = new Set(SYSTEM_OPTIONS.map((option) => option.value));
const ALL_PAGE_OPTIONS = Object.entries(PAGE_ROUTES).flatMap(([system, pages]) =>
  pages.map((page) => ({ system, ...page }))
);

const normalizeLookupKey = (value) =>
  (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const SYSTEM_ALIASES = {
  checklist: "CHECKLIST",
  checklistcombined: "CHECKLIST",
  housekeeping: "CHECKLIST",
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

const parseCsv = (value) =>
  (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const toUnique = (values) => Array.from(new Set(values));

const normalizeSystemName = (value) => {
  const normalized = normalizeLookupKey(value);
  return SYSTEM_ALIASES[normalized] || null;
};

const normalizeRoutePath = (value) => {
  const normalized = (value || "").trim().split("?")[0].replace(/\/$/, "");
  return normalized || "/";
};

const normalizeSystemAccessEntries = (value) =>
  toUnique(
    parseCsv(value)
      .map(normalizeSystemName)
      .filter((entry) => Boolean(entry) && ALLOWED_SYSTEM_VALUES.has(entry))
  );

const formatSystemAccessForDisplay = (value) =>
  normalizeSystemAccessEntries(value).join(",");

const AMBIGUOUS_PAGE_MATCH = "__ambiguous_page_match__";

const getPageOptionsForSystems = (systems) => {
  const normalizedSystems = toUnique(
    (Array.isArray(systems) ? systems : parseCsv(systems))
      .map(normalizeSystemName)
      .filter(Boolean)
  );

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

const normalizePageName = (value, systems = []) => {
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
        (alias) => typeof alias === "string" && !alias.startsWith("/") && normalizeLookupKey(alias) === normalizedKey
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

const defaultForm = {
  user_name: "",
  password: "",
  email_id: "",
  number: "",
  department: "",
  role: "user",
  status: "active",
  user_access: "",
  page_access: "",
  system_access: "",
  remark: "",
  employee_id: "",
};

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = useMemo(() => {
    const role = user?.role || user?.userType || "";
    return typeof role === "string" && role.toLowerCase().includes("admin");
  }, [user]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formMode, setFormMode] = useState("create"); // "create" | "edit"
  const [formData, setFormData] = useState(() => ({ ...defaultForm }));
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departments, setDepartments] = useState([]);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await leadToOrderAPI.listUsers();
      if (response.data?.success) {
        setUsers(response.data.data || []);
      } else {
        setMessage({ type: "error", text: response.data?.message || "Unable to load users" });
      }
    } catch (error) {
      console.error("Load users error:", error);
      setMessage({ type: "error", text: "Unable to fetch users from server" });
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await leadToOrderAPI.getDepartments();
      if (response.data?.success) {
        setDepartments(response.data.data || []);
      }
    } catch (error) {
      console.error("Load departments error:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadDepartments();
    }
  }, [isAdmin]);

  const resetForm = () => {
    setFormMode("create");
    setSelectedUserId(null);
    setFormData({ ...defaultForm });
    setShowModal(false);
    setMessage(null);
  };

  const handleEdit = (userRecord) => {
    if (!userRecord) return;
    setFormMode("edit");
    setSelectedUserId(userRecord.id);

    const systemAccess = normalizeSystemAccessEntries(userRecord.system_access).join(",");

    const convertedPageAccess = toUnique(
      parseCsv(userRecord.page_access)
        .map((page) => normalizePageName(page, systemAccess))
        .filter(Boolean)
    ).join(",");

    setFormData({
      user_name: userRecord.user_name || "",
      password: "",
      email_id: userRecord.email_id || "",
      number: userRecord.number || "",
      department: userRecord.department || "",
      role: userRecord.role || "user",
      status: userRecord.status || "active",
      user_access: userRecord.user_access || "",
      page_access: convertedPageAccess,
      system_access: systemAccess,
      remark: userRecord.remark || "",
      employee_id: userRecord.employee_id || "",
    });
    setShowModal(true);
    setMessage(null);
  };

  const handleCreateClick = () => {
    setFormMode("create");
    setSelectedUserId(null);
    setFormData({ ...defaultForm });
    setMessage(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("This will permanently delete the user. Continue?")) {
      return;
    }
    try {
      setProcessing(true);
      await leadToOrderAPI.deleteUserRecord(id);
      setMessage({ type: "success", text: "User deleted successfully" });
      await loadUsers();
      if (selectedUserId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Delete user error:", error);
      setMessage({ type: "error", text: "Unable to delete user" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      return;
    }

    // Handle system_access and page_access - convert arrays to comma-separated strings
    const systemAccess = normalizeSystemAccessEntries(formData.system_access).join(",") || null;

    const pageAccess = Array.isArray(formData.page_access)
      ? formData.page_access.join(",")
      : formData.page_access || null;

    const payload = {
      ...formData,
      user_name: formData.user_name.trim(),
      number: formData.number || null,
      email_id: formData.email_id || null,
      department: formData.department || (formMode === "create" ? "" : null),
      user_access: formData.user_access || null,
      page_access: pageAccess,
      system_access: systemAccess,
      remark: formData.remark || null,
      employee_id: formData.employee_id || null,
    };

    if (formMode === "edit" && !payload.password) {
      delete payload.password;
    }

    if (formMode === "create" && !payload.password) {
      setMessage({ type: "error", text: "Password is required for new users" });
      return;
    }

    if (formMode === "create" && !payload.department) {
      setMessage({ type: "error", text: "Department is required" });
      return;
    }

    try {
      setProcessing(true);
      if (formMode === "create") {
        await leadToOrderAPI.createUserRecord(payload);
        setMessage({ type: "success", text: "User created successfully" });
      } else if (selectedUserId) {
        await leadToOrderAPI.updateUserRecord(selectedUserId, payload);
        setMessage({ type: "success", text: "User updated successfully" });
      }
      await loadUsers();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error("Submit user error:", error);
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Unable to save user",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSystemAccessChange = useCallback((systemValue, checked) => {
    setFormData((prev) => {
      const canonicalSystem = normalizeSystemName(systemValue);
      if (!canonicalSystem) {
        return prev;
      }

      const currentSystems = normalizeSystemAccessEntries(prev.system_access);
      let newSystems;
      if (checked) {
        newSystems = toUnique([...currentSystems, canonicalSystem]);
      } else {
        newSystems = currentSystems.filter((s) => s !== canonicalSystem);
      }

      return {
        ...prev,
        system_access: newSystems.join(","),
      };
    });
  }, []);

  const handlePageAccessChange = useCallback((pageValue, checked) => {
    setFormData((prev) => {
      const currentPages = toUnique(
        parseCsv(prev.page_access)
          .map((page) => normalizePageName(page, prev.system_access))
          .filter(Boolean)
      );
      let newPages;
      if (checked) {
        newPages = toUnique([...currentPages, pageValue]);
      } else {
        newPages = currentPages.filter((p) => p !== pageValue);
      }
      return {
        ...prev,
        page_access: newPages.join(","),
      };
    });
  }, []);


  // Toggle password visibility for a specific user
  const togglePasswordVisibility = useCallback((userId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  }, []);

  // Get available pages based on selected system access grouped by system
  const getAvailablePages = useMemo(() => {
    const systems = normalizeSystemAccessEntries(formData.system_access);
    if (systems.length === 0) {
      return [];
    }

    const grouped = [];
    const dedupedByValue = new Set();

    systems.forEach((system) => {
      if (PAGE_ROUTES[system]) {
        const uniquePages = [];
        PAGE_ROUTES[system].forEach((option) => {
          if (!dedupedByValue.has(option.value)) {
            dedupedByValue.add(option.value);
            uniquePages.push(option);
          }
        });
        if (uniquePages.length > 0) {
          const opt = SYSTEM_OPTIONS.find((o) => normalizeSystemName(o.value) === system);
          grouped.push({
            systemLabel: opt ? opt.label : system,
            pages: uniquePages,
          });
        }
      }
    });

    return grouped;
  }, [formData.system_access]);

  // Get selected page values as array
  const getSelectedPages = useMemo(() => {
    if (!formData.page_access) return [];
    return toUnique(
      parseCsv(formData.page_access)
        .map((page) => normalizePageName(page, formData.system_access))
        .filter(Boolean)
    );
  }, [formData.page_access, formData.system_access]);

  // Get selected system values as array
  const getSelectedSystems = useMemo(() => {
    if (!formData.system_access) return [];
    return normalizeSystemAccessEntries(formData.system_access);
  }, [formData.system_access]);

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto mt-12 rounded-lg border border-red-100 bg-red-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-red-700">Admin Access Required</h1>
        <p className="mt-2 text-sm text-red-600">
          Only users with the admin role can manage users. If you believe this is an issue, ask an administrator to adjust your permissions.
        </p>
      </div>
    );
  }

  // Memoized form values to prevent unnecessary re-renders
  const selectedSystems = getSelectedSystems;
  const selectedPages = getSelectedPages;
  const availablePages = getAvailablePages;

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }
    const query = searchQuery.toLowerCase().trim();
    return users.filter((user) =>
      user.user_name?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  return (
    <div className="w-full space-y-4 sm:space-y-6 py-4 sm:py-6 md:py-8 px-4 sm:px-6 bg-transparent">
      {/* Header Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Settings</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage Lead-to-Order users and their access rights.</p>
          </div>
          <button
            type="button"
            onClick={handleCreateClick}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-emerald-200 transition hover:brightness-110"
          >
            <span>+</span> Create New User
          </button>
        </div>
      </section>

      {/* Users Table Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <p className="text-base sm:text-lg font-semibold text-slate-900">Existing users</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {filteredUsers.length} of {users.length} user{users.length === 1 ? "" : "s"} protected by Role: Admin only.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pl-9 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-2 sm:py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 w-full sm:w-fit text-center">
              {loading ? "Refreshing..." : "Up to date"}
            </span>
          </div>
        </div>

        {/* Mobile Card View (Visible on small screens) */}
        <div className="grid grid-cols-1 gap-4 sm:hidden mt-4">
          {loading ? (
            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">Processing users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              {searchQuery ? `No users found matching "${searchQuery}"` : "No users found."}
            </div>
          ) : (
            filteredUsers.map((userEntry) => (
              <div key={userEntry.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{userEntry.user_name}</h3>
                    <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 uppercase tracking-wide">
                      {userEntry.role || "user"}
                    </span>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${userEntry.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                      }`}
                  >
                    {userEntry.status || "active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm border-t border-slate-100 pt-3">
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Department</p>
                    <p className="font-medium text-slate-700 mt-0.5">{userEntry.department || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Password</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-slate-50 px-2 py-1.5 rounded text-xs font-mono text-slate-700 border border-slate-100">
                        {visiblePasswords[userEntry.id]
                          ? (userEntry.password || "No password set")
                          : "••••••••"}
                      </code>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(userEntry.id)}
                        className="p-1.5 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
                      >
                        {visiblePasswords[userEntry.id] ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Access</p>
                    <p className="font-medium text-slate-700 text-xs mt-0.5 truncate">
                      {formatSystemAccessForDisplay(userEntry.system_access) || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleEdit(userEntry)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition active:scale-95"
                  >
                    <PencilIcon className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(userEntry.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 hover:border-red-300 transition active:scale-95"
                  >
                    <TrashBinIcon className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (Visible on larger screens) */}
        <div className="hidden sm:block mt-5 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
          <div className="overflow-auto max-h-[calc(100vh-320px)] custom-scrollbar">
            <table className="min-w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
                <tr className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-extrabold whitespace-nowrap min-w-[120px]">Username</th>
                  <th className="px-3 py-3 font-extrabold whitespace-nowrap hidden sm:table-cell min-w-[80px]">Role</th>
                  <th className="px-3 py-3 font-extrabold whitespace-nowrap hidden md:table-cell min-w-[120px]">Password</th>
                  <th className="px-3 py-3 font-extrabold whitespace-nowrap min-w-[100px]">Status</th>
                  <th className="px-3 py-3 font-extrabold whitespace-nowrap hidden md:table-cell min-w-[150px]">Access</th>
                  <th className="px-3 py-3 font-extrabold whitespace-nowrap hidden lg:table-cell min-w-[200px]">Page / System</th>
                  <th className="px-3 py-3 font-extrabold whitespace-nowrap hidden xl:table-cell min-w-[120px]">Created</th>
                  <th className="px-3 py-3 font-extrabold whitespace-nowrap text-right min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-3 py-10 text-center text-xs uppercase text-slate-400">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-3 py-10 text-center text-xs text-slate-400">
                      {searchQuery ? `No users found matching "${searchQuery}"` : "No users found."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((userEntry) => (
                    <tr key={userEntry.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="truncate max-w-[120px]">{userEntry.user_name}</span>
                          <span className="text-[10px] text-slate-400 sm:hidden uppercase tracking-wider">{userEntry.role || "user"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 uppercase text-xs tracking-wide text-slate-500 hidden sm:table-cell whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">
                          {userEntry.role || "user"}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 min-w-[80px] text-center">
                            {visiblePasswords[userEntry.id]
                              ? (userEntry.password || "No password")
                              : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePasswordVisibility(userEntry.id);
                            }}
                            className="text-slate-400 hover:text-blue-500 transition flex-shrink-0"
                          >
                            {visiblePasswords[userEntry.id] ? (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${userEntry.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                            }`}
                        >
                          {userEntry.status || "active"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs hidden md:table-cell whitespace-nowrap">
                        <div className="truncate max-w-[150px] font-medium text-slate-700">{userEntry.user_access || "—"}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{userEntry.department || ""}</div>
                      </td>
                      <td className="px-3 py-3 text-xs leading-tight hidden lg:table-cell whitespace-nowrap">
                        <div className="truncate max-w-[200px] font-medium text-slate-600">{userEntry.page_access || "—"}</div>
                        <div className="truncate text-[10px] text-slate-400 max-w-[200px]">
                          {formatSystemAccessForDisplay(userEntry.system_access) || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[10px] sm:text-xs text-slate-400 hidden xl:table-cell whitespace-nowrap font-medium">
                        {userEntry.created_at
                          ? new Date(userEntry.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(userEntry);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition border border-transparent hover:border-blue-100"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(userEntry.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-red-100"
                          >
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal for Create/Edit Form */}
      {showModal && (
        <div
          className="fixed inset-0 z-[1100] overflow-y-auto pointer-events-none"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-center min-h-screen pt-[80px] lg:pt-16 px-4 pb-8 text-center pointer-events-none">
            {/* Modal panel - no background overlay, dashboard visible behind */}
            <div
              className="relative inline-block align-top bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all w-full sm:max-w-5xl mx-4 mt-8 sm:mt-12 pointer-events-auto border-2 border-slate-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-6 pb-6 sm:p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-300">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {formMode === "create" ? "Create New User" : "Edit User"}
                  </h3>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-slate-500 hover:text-slate-700 transition p-2 rounded-full hover:bg-slate-100"
                    aria-label="Close modal"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {message && (
                  <div
                    className={`mb-4 rounded-md px-4 py-2 text-sm ${message.type === "error"
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="max-h-[70vh] overflow-y-auto pr-2 mt-4">
                  <form className="grid gap-x-6 gap-y-4 grid-cols-1 md:grid-cols-2" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Username
                      </label>
                      <input
                        name="user_name"
                        value={formData.user_name}
                        onChange={handleChange}
                        placeholder="e.g. johndoe"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={formMode === "create" ? "Enter password" : "Leave empty to keep existing"}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        autoComplete="new-password"
                        {...(formMode === "create" ? { required: true } : {})}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email_id"
                        value={formData.email_id}
                        onChange={handleChange}
                        placeholder="admin@example.com"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Mobile / Number
                      </label>
                      <input
                        name="number"
                        value={formData.number}
                        onChange={handleChange}
                        placeholder="+91 ..."
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Department
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required={formMode === "create"}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-sm font-bold text-slate-800 bg-slate-100/50 p-2 rounded-t-lg border-x border-t border-slate-200 w-fit">
                        System Access
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-b-lg border border-slate-200 bg-white shadow-inner">
                        {SYSTEM_OPTIONS.map((option) => {
                          const isChecked = selectedSystems.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 ${isChecked
                                ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/10"
                                : "border-slate-100 bg-slate-50/30 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                                }`}
                            >

                              <div className="relative flex items-center justify-center">
                                <input

                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleSystemAccessChange(option.value, e.target.checked)}
                                  className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-offset-2 focus:ring-2 focus:ring-emerald-500 cursor-pointer"

                                />
                              </div>

                              <span className={`text-xs font-bold uppercase tracking-widest ${isChecked ? "text-emerald-700" : "text-slate-600"}`}>
                                {option.label}
                              </span>

                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-sm font-bold text-slate-800 bg-slate-100/50 p-2 rounded-t-lg border-x border-t border-slate-200 w-fit">
                        Page Access
                      </label>
                      <div className={`rounded-b-lg border-x border-b border-t-0 border-slate-200 p-5 max-h-[450px] overflow-y-auto ${!formData.system_access ? 'bg-slate-100 opacity-60' : 'bg-white shadow-inner'}`}>
                        {availablePages.length > 0 ? (
                          <div className="space-y-6">
                            {availablePages.map((group) => (
                              <div key={group.systemLabel} className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                                  {group.systemLabel} Pages
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {group.pages.map((page) => {
                                    const isChecked = selectedPages.includes(page.value);
                                    return (
                                      <label key={page.value} className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 ${isChecked ? "border-sky-500 bg-sky-50/50 shadow-sm" : "border-slate-100 bg-slate-50/30 hover:border-slate-300 hover:bg-white"}`}>
                                        <div className="relative flex items-center justify-center mt-0.5">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => handlePageAccessChange(page.value, e.target.checked)}
                                            disabled={!formData.system_access}
                                            className="w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-offset-1 focus:ring-2 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed"
                                          />
                                        </div>
                                        <span className={`text-xs font-bold uppercase tracking-wide ${isChecked ? "text-sky-700" : "text-slate-600"} ${!formData.system_access ? 'opacity-50' : ''}`}>
                                          {page.label}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-6">
                            <p className="text-sm font-medium text-slate-400">Select System Access to view available pages</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Remark
                      </label>
                      <textarea
                        name="remark"
                        value={formData.remark}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Additional notes"
                        className="h-16 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employee ID
                      </label>
                      <input
                        name="employee_id"
                        value={formData.employee_id}
                        onChange={handleChange}
                        placeholder="EMP1001"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 md:col-span-2">
                      {formMode === "edit" && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                          Cancel edit
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center justify-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-emerald-200 transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {formMode === "create" ? "Create user" : "Update user"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
