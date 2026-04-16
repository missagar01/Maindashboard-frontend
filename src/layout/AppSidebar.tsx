import { useEffect, useMemo, useState, type FC } from "react";
import { Link, useLocation } from "react-router";
import {
  BadgeCheck,
  Building2,
  Boxes,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  FileText,
  Files,
  FolderKanban,
  HardHat,
  Landmark,
  LayoutDashboard,
  LogOut,
  PhoneCall,
  Receipt,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assert/Logo.jpeg";
import {
  getSidebarModuleForPath,
  type PortalNavKey,
} from "../config/portalNavigation";
import {
  getAllowedPageRoutes,
  isAdminUser,
} from "../utils/accessControl";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarLinkItem {
  kind: "link";
  key: string;
  name: string;
  path: string;
  icon: LucideIcon;
  requiresAdmin?: boolean;
}

interface SidebarGroupItem {
  kind: "group";
  key: string;
  name: string;
  icon: LucideIcon;
  items: SidebarNode[];
  sectionLabel?: string;
  defaultOpen?: boolean;
}

type SidebarNode = SidebarLinkItem | SidebarGroupItem;

interface SidebarSection {
  key: Exclude<PortalNavKey, "home">;
  title: string;
  caption?: string;
  icon: LucideIcon;
  homeItem?: SidebarLinkItem;
  nodes: SidebarNode[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizePath = (path: string) => {
  const cleaned = path.split("?")[0].replace(/\/$/, "");
  return cleaned === "" ? "/" : cleaned;
};

const isNode = (value: SidebarNode | null): value is SidebarNode => value !== null;

const hasExactPathMatch = (targetPath: string, allowedPaths: Set<string>) => {
  const normalized = normalizePath(targetPath);
  return allowedPaths.has(normalized);
};

// ─── Responsive design tokens ─────────────────────────────────────────────────

// Typography
const TEXT_ITEM = "text-[clamp(14px,0.9vw,20px)]";
const TEXT_CHILD = "text-[clamp(13px,0.8vw,18px)]";
const TEXT_LABEL = "text-[clamp(11px,0.7vw,14px)]";
const TEXT_LOGO = "text-[clamp(15px,1vw,22px)]";
const TEXT_LOGO_SUB = "text-[clamp(11px,0.8vw,14px)]";
const TEXT_MOD = "text-[clamp(13px,0.9vw,18px)]";
const TEXT_MOD_CAP = "text-[clamp(11px,0.7vw,14px)]";

// Icons
const ICON_ROOT = "h-[clamp(18px,1vw,26px)] w-[clamp(18px,1vw,26px)]";
const ICON_CHILD = "h-[clamp(16px,0.9vw,22px)] w-[clamp(16px,0.9vw,22px)]";
const ICON_CHEVRON = "h-[clamp(16px,0.9vw,20px)] w-[clamp(16px,0.9vw,20px)]";

// Padding
const PY_ROOT = "py-[clamp(8px,0.6vw,12px)]";
const PY_CHILD = "py-[clamp(6px,0.5vw,10px)]";

// Sidebar width
const SIDEBAR_W = "xl:w-[clamp(260px,14vw,340px)]";
const SIDEBAR_W_COLLAPSED = "xl:w-[clamp(56px,3vw,70px)]";

// Logo
const LOGO_IMG = "h-[clamp(32px,2vw,42px)] w-[clamp(32px,2vw,42px)]";

// ─── Section data ─────────────────────────────────────────────────────────────

const salesWorkspaceSection: SidebarSection = {
  key: "sales",
  title: "Sales Workspace",
  caption: "Main Navigation",
  icon: BriefcaseBusiness,
  homeItem: {
    kind: "link",
    key: "sales-dashboard",
    name: "Dashboard",
    path: "/o2d/dashboard",
    icon: LayoutDashboard,
  },
  nodes: [
    { kind: "link", key: "o2d-section-label", name: "O2D SECTION", path: "/__label__/o2d", icon: Truck },
    { kind: "link", key: "o2d-orders", name: "Orders", path: "/o2d/orders", icon: ClipboardList },
    { kind: "link", key: "o2d-enquiry", name: "Enquiry", path: "/o2d/enquiry", icon: Search },
    { kind: "link", key: "o2d-enquiry-list", name: "Enquiry List", path: "/o2d/enquiry-list", icon: Files },
    { kind: "link", key: "o2d-pending-vehicles", name: "Pending Vehicles", path: "/o2d/process", icon: Truck },
    { kind: "link", key: "o2d-customers", name: "Customers", path: "/o2d/customers", icon: Users },
    { kind: "link", key: "o2d-follow-ups", name: "Follow Ups", path: "/o2d/follow-ups", icon: RefreshCw },
    { kind: "link", key: "batchcode-section-label", name: "BATCHCODE SECTION", path: "/__label__/batchcode", icon: Boxes },
    { kind: "link", key: "batchcode-laddel", name: "Laddel", path: "/batchcode/laddel", icon: Boxes },
    { kind: "link", key: "batchcode-tundis", name: "Tundis", path: "/batchcode/tundis", icon: Boxes },
    { kind: "link", key: "batchcode-sms-register", name: "SMS Register", path: "/batchcode/sms-register", icon: FileText },
    { kind: "link", key: "batchcode-hot-coil", name: "Hot Coil", path: "/batchcode/hot-coil", icon: Boxes },
    { kind: "link", key: "batchcode-recoiler", name: "Recoiler", path: "/batchcode/recoiler", icon: Boxes },
    { kind: "link", key: "batchcode-pipe-mill", name: "Pipe Mill", path: "/batchcode/pipe-mill", icon: BriefcaseBusiness },
    { kind: "link", key: "batchcode-qc-lab", name: "QC Lab", path: "/batchcode/qc-lab", icon: ClipboardList },
    { kind: "link", key: "lead-section-label", name: "LEAD TO ORDER SECTION", path: "/__label__/lead", icon: BriefcaseBusiness },
    { kind: "link", key: "lead-to-order-leads", name: "Leads", path: "/lead-to-order/leads", icon: Users },
    { kind: "link", key: "lead-to-order-follow-up", name: "Follow Up", path: "/lead-to-order/follow-up", icon: RefreshCw },
    { kind: "link", key: "lead-to-order-call-tracker", name: "Call Tracker", path: "/lead-to-order/call-tracker", icon: PhoneCall },
    { kind: "link", key: "lead-to-order-quotation", name: "Quotation", path: "/lead-to-order/quotation", icon: FileText },
    { kind: "link", key: "lead-to-order-settings", name: "Settings", path: "/lead-to-order/settings", icon: Settings2 },
    { kind: "link", key: "lead-to-order-sys-access", name: "System Access", path: "/lead-to-order/settings", icon: ShieldCheck },
    { kind: "link", key: "lead-to-order-page-access", name: "Page Access", path: "/lead-to-order/settings", icon: BadgeCheck },
  ],
};

const subscriptionSection: SidebarSection = {
  key: "subscription",
  title: "Document Control",
  caption: "Documents And Finance",
  icon: FileText,
  homeItem: {
    kind: "link", key: "document-dashboard", name: "Dashboard",
    path: "/document/dashboard", icon: LayoutDashboard,
  },
  nodes: [
    {
      kind: "group", key: "document-resource-manager", name: "Resource Manager",
      icon: FolderKanban, defaultOpen: false,
      items: [
        { kind: "link", key: "resource-manager-all", name: "All Resources", path: "/resource-manager", icon: Files },
        {
          kind: "group", key: "subscription-renewals", name: "Renewals",
          icon: RefreshCw, defaultOpen: false,
          items: [
            { kind: "link", key: "document-renewal", name: "Document Renewal", path: "/document/renewal", icon: RefreshCw },
            { kind: "link", key: "subscription-renewal-link", name: "Subscription Renewal", path: "/subscription/renewal", icon: RefreshCw },
          ],
        },
        { kind: "link", key: "subscription-approval", name: "Subscription Approval", path: "/subscription/approval", icon: BadgeCheck },
        { kind: "link", key: "document-shared", name: "Document Shared", path: "/document/shared", icon: FileText },
      ],
    },
    {
      kind: "group", key: "document-loan", name: "Loan", icon: Landmark, defaultOpen: false,
      items: [
        { kind: "link", key: "loan-all", name: "All Loan", path: "/loan/all", icon: Files },
        { kind: "link", key: "loan-foreclosure", name: "Request Forecloser", path: "/loan/foreclosure", icon: Receipt },
      ],
    },
    { kind: "link", key: "document-master", name: "Master", path: "/master", icon: ShieldCheck },
  ],
};

const checklistSection: SidebarSection = {
  key: "checklist",
  title: "Checklist Combined",
  caption: "Task Navigation",
  icon: ClipboardList,
  homeItem: {
    kind: "link",
    key: "checklist-dashboard",
    name: "Dashboard",
    path: "/checklist",
    icon: LayoutDashboard,
  },
  nodes: [
    { kind: "link", key: "checklist-assign-task", name: "Assign Task", path: "/checklist/assign-task", icon: ClipboardList },
    { kind: "link", key: "checklist-delegation", name: "Delegation", path: "/checklist/delegation", icon: RefreshCw },
    { kind: "link", key: "checklist-all-task", name: "All Task", path: "/checklist/all-task", icon: FileText },
    { kind: "link", key: "checklist-housekeeping-verify", name: "Housekeeping Verify", path: "/checklist/housekeeping-verify", icon: BadgeCheck },
    { kind: "link", key: "checklist-task-verification", name: "Task Verification", path: "/checklist/hrmanager", icon: Users },
    { kind: "link", key: "checklist-department-task", name: "Department Tasks", path: "/checklist/department-task", icon: FileText },
    { kind: "link", key: "checklist-mis-report", name: "MIS Report", path: "/checklist/mis-report", icon: FileText },
    { kind: "link", key: "checklist-quick-task", name: "Quick Task", path: "/checklist/quick-task", icon: ClipboardList, requiresAdmin: true },
    { kind: "link", key: "checklist-machines", name: "Machine", path: "/checklist/machines", icon: Settings2, requiresAdmin: true },
    { kind: "link", key: "checklist-settings", name: "Settings", path: "/checklist/settings", icon: Settings2, requiresAdmin: true },
  ],
};

const hrmsSection: SidebarSection = {
  key: "hrms", title: "HRMS", caption: "Human Resources", icon: Users,
  nodes: [
    { kind: "link", key: "hrms-dashboard", name: "Dashboard", path: "/hrfms/dashboard", icon: LayoutDashboard },
    { kind: "link", key: "hrms-profile", name: "My Profile", path: "/hrfms/my-profile", icon: Users },
    { kind: "link", key: "hrms-employee-create", name: "Employee", path: "/hrfms/employee-create", icon: Users },
    { kind: "link", key: "hrms-manpower-request", name: "MainPower Request", path: "/hrfms/resume-request", icon: FileText },
    { kind: "link", key: "hrms-manpower-list", name: "MainPower List", path: "/hrfms/resume-list", icon: Files },
    { kind: "link", key: "hrms-travel-request", name: "Travel Request", path: "/hrfms/requests", icon: FileText },
    { kind: "link", key: "hrms-tickets", name: "Tickets", path: "/hrfms/tickets", icon: ClipboardList },
    { kind: "link", key: "hrms-travel-status", name: "Travel Status", path: "/hrfms/travel-status", icon: RefreshCw },
    { kind: "link", key: "hrms-resume-upload", name: "Resume Upload", path: "/hrfms/resume-form", icon: FileText },
    { kind: "link", key: "hrms-leave-request", name: "Leave Request", path: "/hrfms/leave-request", icon: FileText },
    { kind: "link", key: "hrms-leave-approvals", name: "Leave Approvals", path: "/hrfms/leave-approvals", icon: BadgeCheck },
    { kind: "link", key: "hrms-hr-approvals", name: "HR Approvals", path: "/hrfms/leave-hr-approvals", icon: BadgeCheck },
   
    { kind: "link", key: "hrms-plant-visitor", name: "Plant Visitor", path: "/hrfms/plant-visitor", icon: ShieldCheck },
    { kind: "link", key: "hrms-plant-visitor-list", name: "Plant Visitor List", path: "/hrfms/plant-visitorlist", icon: Files },
    { kind: "link", key: "hrms-gatepass-apply", name: "Gate Pass Apply", path: "/hrfms/gatepass-apply", icon: ShieldCheck },
    { kind: "link", key: "hrms-gatepass-list", name: "Gate Pass List", path: "/hrfms/gatepass-list", icon: Files },
    { kind: "link", key: "hrms-gatepass-approved-list", name: "Approved Gate Pass", path: "/hrfms/gatepass-approved-list", icon: BadgeCheck },
    { kind: "link", key: "hrms-candidate-status", name: "Candidate Status", path: "/hrfms/condidate-list", icon: Users },
    { kind: "link", key: "hrms-selected-candidate", name: "Selected Candidate", path: "/hrfms/condidate-select", icon: BadgeCheck },
  ],
};

const storeSection: SidebarSection = {
  key: "store", title: "Store and Purchase", caption: "Material Operations", icon: ShoppingCart,
  nodes: [
    { kind: "link", key: "store-dashboard", name: "Dashboard", path: "/store/dashboard", icon: LayoutDashboard },
   { kind: "link", key: "store-vendor-registration", name: "Vendor Request", path: "/store/vendor-registration", icon: Building2 },
    { kind: "link", key: "store-pending-gate-entry", name: "Pending Gate Entry", path: "/store/pending-gate-entry", icon: Truck },
  //  { kind: "link", key: "store-create-po", name: "Create PO", path: "/store/create-po", icon: ShoppingCart },
    { kind: "link", key: "store-indent", name: "Indent", path: "/store/approve-indent", icon: FileText },
        { kind: "link", key: "store-requested-indent", name: "Requested Indent", path: "/store/user-indent-list-indent", icon: FileText },
    { kind: "link", key: "store-requisition", name: "Requisition", path: "/store/user-requisition", icon: FileText },
    { kind: "link", key: "store-create-indent", name: "Create Indent", path: "/store/user-indent", icon: FileText },

         { kind: "link", key: "store-issue", name: "Store Issue", path: "/store/store-issue", icon: ClipboardList },
            
    { kind: "link", key: "store-item-issue", name: "Item Issue", path: "/store/item-issue", icon: ClipboardList },
    { kind: "link", key: "store-inventory", name: "Inventory", path: "/store/inventory", icon: Boxes },
    { kind: "link", key: "store-returnable", name: "Returnable", path: "/store/returnable", icon: RefreshCw },
    { kind: "link", key: "store-repair-gate-pass", name: "Repair Gate Pass", path: "/store/repair-gate-pass", icon: ShieldCheck },
    { kind: "link", key: "store-approve-indent-hod", name: "Approve Indent HOD", path: "/store/approve-indent-data", icon: BadgeCheck },
    { kind: "link", key: "store-approve-indent-gm", name: "Approve Indent GM", path: "/store/approve-indent-gm", icon: BadgeCheck },
    { kind: "link", key: "store-purchase-order", name: "Purchase Order", path: "/store/pending-indents", icon: ShoppingCart },
    { kind: "link", key: "store-pending-pos", name: "Pending POs", path: "/store/pending-pos", icon: Receipt },
 

    { kind: "link", key: "store-repair-follow-up", name: "Repair Follow Up", path: "/store/repair-followup", icon: RefreshCw },
    { kind: "link", key: "store-grn", name: "Store GRN", path: "/store/store-grn", icon: FileText },
   
    // { kind: "link", key: "store-grn-admin", name: "Store GRN Admin Approval", path: "/store/store-grn-admin", icon: BadgeCheck },

    { kind: "link", key: "store-grn-gm", name: "Store GRN GM Approval", path: "/store/store-grn-gm", icon: BadgeCheck },
    { kind: "link", key: "store-grn-close", name: "Store GRN Close", path: "/store/store-grn-close", icon: ShieldCheck },
    { kind: "link", key: "store-out-approval", name: "Store Out Approval", path: "/store/store-out-approval", icon: BadgeCheck },
    { kind: "link", key: "store-completed-items", name: "Completed Items", path: "/store/completed-items", icon: Files },
    { kind: "link", key: "store-my-indent", name: "My Indent", path: "/store/erp-indent", icon: FileText },
    { kind: "link", key: "store-user-indent-list", name: "User Indent List", path: "/store/user-indent-list", icon: Files },

  ],
};

const transportSection: SidebarSection = {
  key: "transport",
  title: "Transport",
  caption: "Fleet Operations",
  icon: Truck,
  nodes: [
    { kind: "link", key: "transport-dashboard", name: "Dashboard", path: "/transport/dashboard", icon: LayoutDashboard },
    // { kind: "link", key: "transport-reports", name: "Reports", path: "/transport/reports", icon: ClipboardList },
  ],
};

const projectSection: SidebarSection = {
  key: "project",
  title: "Project Operations",
  caption: "Civil Track Workspace",
  icon: HardHat,
  nodes: [
    { kind: "link", key: "project-dashboard", name: "Dashboard", path: "/project/dashboard", icon: LayoutDashboard },
    { kind: "link", key: "project-projects", name: "Projects", path: "/project/projects", icon: FolderKanban },
    { kind: "link", key: "project-dpr", name: "Daily Logs", path: "/project/dpr", icon: ClipboardList },
    { kind: "link", key: "project-materials", name: "Material Stock", path: "/project/materials", icon: Warehouse },
    { kind: "link", key: "project-setup", name: "Project Setup", path: "/project/setup", icon: ShieldCheck },
    { kind: "link", key: "project-users", name: "Users", path: "/project/users", icon: Users },
  ],
};

const visitorSection: SidebarSection = {
  key: "visitor-gate-pass", title: "Visitor Gate Pass", caption: "Security Access", icon: ShieldCheck,
  nodes: [
    { kind: "link", key: "gatepass-approvals", name: "Approvals", path: "/gatepass/approvals", icon: BadgeCheck },
    { kind: "link", key: "gatepass-close-pass", name: "Close Pass", path: "/gatepass/close-pass", icon: ShieldCheck },
    { kind: "link", key: "gatepass-all-data", name: "All Data", path: "/gatepass/all-data", icon: Files },
    { kind: "link", key: "gatepass-request-visit", name: "Request List", path: "/gatepass/request-visit", icon: FileText },
  ],
};

const moduleSections: Record<Exclude<PortalNavKey, "home">, SidebarSection> = {
  checklist: checklistSection,
  transport: transportSection,
  sales: salesWorkspaceSection,
  logistic: salesWorkspaceSection,
  batchcode: salesWorkspaceSection,
  hrms: hrmsSection,
  store: storeSection,
  project: projectSection,
  subscription: subscriptionSection,
  "visitor-gate-pass": visitorSection,
};

const AppSidebar: FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const { logout, user } = useAuth();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const activeModule = getSidebarModuleForPath(location.pathname);
  const section = activeModule ? moduleSections[activeModule as Exclude<PortalNavKey, "home">] : null;
  const isAdmin = useMemo(() => isAdminUser(user), [user]);
  const showText = isExpanded || isHovered || isMobileOpen;
  const allowedPagePaths = useMemo(() => {
    if (isAdmin) return new Set<string>();
    return new Set(getAllowedPageRoutes(user).map((path) => normalizePath(path)));
  }, [isAdmin, user]);
  const sectionHomePath = section?.homeItem ? normalizePath(section.homeItem.path) : null;

  const isLinkActive = (path: string) => {
    const currentPath = normalizePath(location.pathname);
    const targetPath = normalizePath(path);
    if (currentPath === targetPath) return true;
    if (sectionHomePath && targetPath === sectionHomePath) return false;
    return currentPath.startsWith(`${targetPath}/`);
  };

  const canAccessLink = (item: SidebarLinkItem) => {
    if (!section) return false;
    if (item.requiresAdmin && !isAdmin) return false;
    if (isAdmin) return true;
    return hasExactPathMatch(item.path, allowedPagePaths);
  };

  const filterNode = (node: SidebarNode): SidebarNode | null => {
    if (node.kind === "link") {
      if (node.path.startsWith("/__label__/")) return node;
      return canAccessLink(node) ? node : null;
    }
    const visibleItems = node.items.map(filterNode).filter(isNode);
    if (visibleItems.length === 0) return null;
    return { ...node, items: visibleItems };
  };

  const filteredHomeItem = useMemo(() => {
    if (!section?.homeItem) return null;
    return canAccessLink(section.homeItem) ? section.homeItem : null;
  }, [isAdmin, section, user]);

  const filteredNodes = useMemo(() => {
    if (!section) return [];

    // First pass: filter normal links and groups
    const intermediate = section.nodes.map(node => {
      if (node.kind === "link" && node.path.startsWith("/__label__/")) return node;
      return filterNode(node);
    });

    // Second pass: remove labels that have no following visible links (until next label)
    const final: SidebarNode[] = [];
    for (let i = 0; i < intermediate.length; i++) {
      const node = intermediate[i];
      if (!node) continue;

      if (node.kind === "link" && node.path.startsWith("/__label__/")) {
        let hasVisibleSubItem = false;
        for (let j = i + 1; j < intermediate.length; j++) {
          const subNode = intermediate[j];
          if (!subNode) continue;
          if (subNode.kind === "link" && subNode.path.startsWith("/__label__/")) break;
          hasVisibleSubItem = true;
          break;
        }
        if (hasVisibleSubItem) final.push(node);
      } else {
        final.push(node);
      }
    }
    return final;
  }, [isAdmin, section, user]);

  const nodeContainsActivePath = (node: SidebarNode): boolean => {
    if (node.kind === "link") {
      if (node.path.startsWith("/__label__/")) return false;
      return isLinkActive(node.path);
    }
    return node.items.some(nodeContainsActivePath);
  };

  useEffect(() => {
    if (!section) return;
    setOpenGroups((current) => {
      const next = { ...current };
      const primeGroups = (nodes: SidebarNode[]) => {
        nodes.forEach((node) => {
          if (node.kind !== "group") return;
          if (current[node.key] === undefined && node.defaultOpen) {
            next[node.key] = true;
          }
          primeGroups(node.items);
        });
      };
      primeGroups(filteredNodes);
      return next;
    });
  }, [section, filteredNodes]);

  if (!section || (!filteredHomeItem && filteredNodes.length === 0)) return null;

  const handleLinkClick = () => { if (isMobileOpen) toggleMobileSidebar(); };
  const toggleGroup = (key: string) => setOpenGroups((c) => ({ ...c, [key]: !c[key] }));

  const renderLink = (item: SidebarLinkItem, depth = 0) => {
    const Icon = item.icon;

    if (item.path.startsWith("/__label__/")) {
      return showText ? (
        <p key={item.key} className={`mt-3 mb-0.5 px-4 pt-1 font-bold uppercase tracking-[0.2em] text-[#94a3b8] select-none ${TEXT_LABEL}`}>
          {item.name}
        </p>
      ) : null;
    }

    const isActive = isLinkActive(item.path);
    const pyCls = depth === 0 ? PY_ROOT : PY_CHILD;
    const iconCls = depth === 0 ? ICON_ROOT : ICON_CHILD;
    const textCls = depth === 0 ? TEXT_ITEM : TEXT_CHILD;

    const itemCls = isActive
      ? "bg-[#ee1c23] text-white shadow-[0_4px_16px_rgba(238,28,35,0.30)] font-semibold"
      : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]";

    const shapeAndIndent = showText
      ? depth === 0
        ? `mx-2 px-3 rounded-xl gap-2.5 ${pyCls}`
        : depth === 1
          ? `ml-6 mr-2 px-3 rounded-xl gap-2 ${pyCls}`
          : `ml-10 mr-2 px-2 rounded-lg gap-2 ${pyCls}`
      : `justify-center mx-auto w-10 rounded-xl ${pyCls}`;

    return (
      <Link
        key={item.key}
        to={item.path}
        onClick={handleLinkClick}
        title={!showText ? item.name : undefined}
        style={{ textDecoration: "none" }}
        className={`flex items-center transition-all duration-200 ${shapeAndIndent} ${itemCls}`}
      >
        <Icon className={`shrink-0 ${iconCls} ${isActive ? "text-white" : "text-[#94a3b8]"}`} />
        {showText && <span className={`truncate leading-5 ${textCls}`}>{item.name}</span>}
      </Link>
    );
  };

  const renderGroup = (group: SidebarGroupItem, depth = 0) => {
    const GroupIcon = group.icon;
    const isOpen = Boolean(openGroups[group.key]);
    const hasActive = group.items.some(nodeContainsActivePath);
    const pyCls = depth === 0 ? PY_ROOT : PY_CHILD;
    const iconCls = depth === 0 ? ICON_ROOT : ICON_CHILD;
    const textCls = depth === 0 ? TEXT_ITEM : TEXT_CHILD;

    const itemCls = hasActive
      ? "bg-[#ee1c23] text-white shadow-[0_4px_16px_rgba(238,28,35,0.30)] font-semibold"
      : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]";

    const shapeAndIndent = showText
      ? depth === 0
        ? `mx-2 px-3 rounded-xl gap-2.5 ${pyCls}`
        : `ml-6 mr-2 px-3 rounded-xl gap-2 ${pyCls}`
      : `justify-center mx-auto w-10 rounded-xl ${pyCls}`;

    return (
      <div key={group.key}>
        {depth === 0 && group.sectionLabel && showText && (
          <p className={`mt-3 mb-0.5 px-4 pt-1 font-bold uppercase tracking-[0.2em] text-[#94a3b8] select-none ${TEXT_LABEL}`}>
            {group.sectionLabel}
          </p>
        )}

        <button
          type="button"
          onClick={() => toggleGroup(group.key)}
          title={!showText ? group.name : undefined}
          aria-expanded={isOpen}
          className={`flex w-full items-center transition-all duration-200 ${shapeAndIndent} ${itemCls}`}
        >
          <GroupIcon className={`shrink-0 ${iconCls} ${hasActive ? "text-white" : "text-[#94a3b8]"}`} />
          {showText && (
            <>
              <span className={`flex-1 truncate text-left leading-5 ${textCls}`}>{group.name}</span>
              <ChevronDown
                className={[
                  "shrink-0 transition-transform duration-200",
                  ICON_CHEVRON,
                  hasActive ? "text-white/70" : "text-[#94a3b8]",
                  isOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </>
          )}
        </button>

        {showText && isOpen && (
          <div className="mt-0.5 border-l border-[#e2e8f0] ml-5">
            {group.items.map((node) =>
              node.kind === "link" ? renderLink(node, depth + 1) : renderGroup(node, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={[
        "fixed left-0 z-[1000] flex flex-col overflow-hidden",
        "bg-transparent shadow-[10px_0_28px_rgba(15,23,42,0.08)]",
        "transition-all duration-300 ease-in-out",
        isMobileOpen
          ? "top-[58px] h-[calc(100dvh-58px)] w-[240px] md:w-[260px] translate-x-0"
          : "top-0 h-[100dvh] -translate-x-full xl:translate-x-0",
        !isMobileOpen
          ? isExpanded || isHovered ? SIDEBAR_W : SIDEBAR_W_COLLAPSED
          : "",
      ].join(" ")}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div aria-hidden="true" className="app-sidebar-surface pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="app-sidebar-gradient-border pointer-events-none absolute inset-y-0 right-0 z-20 w-[3px] rounded-l-full"
      />

      <div className="relative z-10 flex h-full flex-col">
        <div
          className={[
            "hidden shrink-0 items-center xl:flex",
            "h-[clamp(3.375rem,3.05rem+0.5vw,4.125rem)]",
            "border-b border-[#e2e8f0]/80 bg-white/88 backdrop-blur",
            showText ? "px-4 gap-3" : "justify-center",
          ].join(" ")}
        >
          <Link to="/" onClick={handleLinkClick} className="flex items-center gap-3 w-full overflow-hidden">
            <img
              src={logo}
              alt="SMRPL Logo"
              className={`shrink-0 rounded-lg object-cover ring-2 ring-[#ee1c2320] border border-[#e2e8f0] ${LOGO_IMG}`}
            />
            {showText && (
              <div className="min-w-0">
                <p className={`truncate font-bold text-[#0f172a] leading-tight ${TEXT_LOGO}`}>Integrated Portal</p>
                <p className={`truncate uppercase tracking-[0.2em] text-[#94a3b8] leading-tight ${TEXT_LOGO_SUB}`}>
                  {section.title}
                </p>
              </div>
            )}
          </Link>
        </div>

        {showText && (
          <div className="shrink-0 border-b border-[#e2e8f0]/80 bg-[#f8fafc]/88 px-4 py-2 backdrop-blur">
            <p className={`font-bold uppercase tracking-[0.2em] text-[#ee1c23] ${TEXT_MOD_CAP}`}>
              {section.caption || "Navigation"}
            </p>
            <p className={`font-semibold text-[#334155] leading-tight ${TEXT_MOD}`}>{section.title}</p>
          </div>
        )}

        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-2 pr-[6px] space-y-0.5
            [&::-webkit-scrollbar]:w-1
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1]
            [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {filteredHomeItem && renderLink(filteredHomeItem, 0)}
          {filteredNodes.map((node) =>
            node.kind === "link" ? renderLink(node, 0) : renderGroup(node, 0)
          )}
        </nav>

        <div className="shrink-0 border-t border-[#e2e8f0]/80 bg-white/88 px-2 py-2 backdrop-blur">
          <button
            onClick={logout}
            title="Sign Out"
            className={[
              "flex w-full items-center gap-2.5 rounded-xl transition-all duration-200",
              "text-[#f87171] hover:bg-[#450a0a20] hover:text-[#ef4444]",
              `${TEXT_ITEM} ${PY_ROOT}`,
              showText ? "px-3" : "justify-center",
            ].join(" ")}
          >
            <LogOut className={`shrink-0 ${ICON_ROOT}`} />
            {showText && <span className="truncate font-medium">Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
