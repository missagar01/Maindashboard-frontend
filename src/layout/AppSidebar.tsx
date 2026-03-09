import { useEffect, useMemo, useState, type FC } from "react";
import { Link, useLocation } from "react-router";
import {
  BadgeCheck,
  BookCopy,
  Boxes,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Files,
  FolderKanban,
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
  WalletCards,
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
  hasStoreModuleAccess,
  isAdminUser,
  isPathAllowed,
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

// ─── Responsive design tokens ─────────────────────────────────────────────────
// mobile → md(tablet) → lg(laptop) → xl(desktop) → 2xl(large desktop)

/** Primary nav item text — medium on mobile/tablet, large on desktop */
const TEXT_ITEM = "text-[13px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[15px]";
/** Child item text (indented) */
const TEXT_CHILD = "text-[12px] md:text-[12px] lg:text-[13px] xl:text-[14px] 2xl:text-[14px]";
/** Section label caps */
const TEXT_LABEL = "text-[10px] md:text-[10px] lg:text-[11px] xl:text-[11px] 2xl:text-[11px]";
/** Logo primary line */
const TEXT_LOGO = "text-[13px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[15px]";
/** Logo sub-line */
const TEXT_LOGO_SUB = "text-[10px] md:text-[10px] lg:text-[11px] xl:text-[12px] 2xl:text-[12px]";
/** Module bar title */
const TEXT_MOD = "text-[12px] md:text-[12px] lg:text-[13px] xl:text-[14px] 2xl:text-[14px]";
/** Module bar caption */
const TEXT_MOD_CAP = "text-[10px] md:text-[10px] lg:text-[10px] xl:text-[11px] 2xl:text-[11px]";

/** Icon – root depth */
const ICON_ROOT = "h-[15px] w-[15px] md:h-[15px] md:w-[15px] lg:h-[17px] lg:w-[17px] xl:h-[18px] xl:w-[18px] 2xl:h-5 2xl:w-5";
/** Icon – child depth */
const ICON_CHILD = "h-[13px] w-[13px] md:h-[13px] md:w-[13px] lg:h-[15px] lg:w-[15px] xl:h-[16px] xl:w-[16px] 2xl:h-[17px] 2xl:w-[17px]";

/** Vertical padding – root row */
const PY_ROOT = "py-[7px] md:py-[7px] lg:py-[9px] xl:py-[10px] 2xl:py-[11px]";
/** Vertical padding – child row */
const PY_CHILD = "py-[6px] md:py-[6px] lg:py-[7px] xl:py-[8px] 2xl:py-[9px]";

/** Sidebar expanded width */
const SIDEBAR_W = "xl:w-[250px] 2xl:w-[280px]";
/** Sidebar collapsed width */
const SIDEBAR_W_COLLAPSED = "xl:w-[56px] 2xl:w-[64px]";

/** Logo image size */
const LOGO_IMG = "h-7 w-7 md:h-8 md:w-8 lg:h-8 lg:w-8 2xl:h-9 2xl:w-9";

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
    // ── O2D ──
    { kind: "link", key: "o2d-section-label", name: "O2D SECTION", path: "/__label__/o2d", icon: Truck },
    { kind: "link", key: "o2d-orders", name: "Orders", path: "/o2d/orders", icon: ClipboardList },
    { kind: "link", key: "o2d-enquiry", name: "Enquiry", path: "/o2d/enquiry", icon: Search },
    { kind: "link", key: "o2d-enquiry-list", name: "Enquiry List", path: "/o2d/enquiry-list", icon: Files },
    { kind: "link", key: "o2d-pending-vehicles", name: "Pending Vehicles", path: "/o2d/process", icon: Truck },
    { kind: "link", key: "o2d-customers", name: "Customers", path: "/o2d/customers", icon: Users },
    { kind: "link", key: "o2d-follow-ups", name: "Follow Ups", path: "/o2d/follow-ups", icon: RefreshCw },
    // ── BatchCode ──
    { kind: "link", key: "batchcode-section-label", name: "BATCHCODE SECTION", path: "/__label__/batchcode", icon: Boxes },
    { kind: "link", key: "batchcode-laddel", name: "Laddel", path: "/batchcode/laddel", icon: Boxes },
    { kind: "link", key: "batchcode-tundis", name: "Tundis", path: "/batchcode/tundis", icon: Boxes },
    { kind: "link", key: "batchcode-sms-register", name: "SMS Register", path: "/batchcode/sms-register", icon: FileText },
    { kind: "link", key: "batchcode-hot-coil", name: "Hot Coil", path: "/batchcode/hot-coil", icon: Boxes },
    { kind: "link", key: "batchcode-recoiler", name: "Recoiler", path: "/batchcode/recoiler", icon: Boxes },
    { kind: "link", key: "batchcode-pipe-mill", name: "Pipe Mill", path: "/batchcode/pipe-mill", icon: BriefcaseBusiness },
    { kind: "link", key: "batchcode-qc-lab", name: "QC Lab", path: "/batchcode/qc-lab", icon: ClipboardList },
    // ── Lead To Order ──
    { kind: "link", key: "lead-section-label", name: "LEAD TO ORDER SECTION", path: "/__label__/lead", icon: BriefcaseBusiness },
    { kind: "link", key: "lead-to-order-leads", name: "Leads", path: "/lead-to-order/leads", icon: Users },
    { kind: "link", key: "lead-to-order-follow-up", name: "Follow Up", path: "/lead-to-order/follow-up", icon: RefreshCw },
    { kind: "link", key: "lead-to-order-call-tracker", name: "Call Tracker", path: "/lead-to-order/call-tracker", icon: PhoneCall },
    { kind: "link", key: "lead-to-order-quotation", name: "Quotation", path: "/lead-to-order/quotation", icon: FileText },
    { kind: "link", key: "lead-to-order-settings", name: "Settings", path: "/lead-to-order/settings", icon: Settings2, requiresAdmin: true },
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
        { kind: "link", key: "subscription-all", name: "All Subscriptions", path: "/subscription/all", icon: Files },
        { kind: "link", key: "subscription-approval", name: "Subscription Approval", path: "/subscription/approval", icon: BadgeCheck },
        { kind: "link", key: "subscription-payment", name: "Subscription Payment", path: "/subscription/payment", icon: CreditCard },
        { kind: "link", key: "document-all", name: "All Documents", path: "/document/all", icon: Files },

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
  key: "checklist", title: "Checklist Combined", caption: "Task Navigation", icon: ClipboardList,
  nodes: [
    { kind: "link", key: "checklist-overview", name: "Overview", path: "/checklist", icon: LayoutDashboard },
    { kind: "link", key: "checklist-pending", name: "Pending Tasks", path: "/checklist/pending", icon: ClipboardList },
    { kind: "link", key: "checklist-history", name: "Task History", path: "/checklist/history", icon: FileText },
    { kind: "link", key: "checklist-settings", name: "Settings", path: "/checklist/settings", icon: Settings2 },
  ],
};

const hrmsSection: SidebarSection = {
  key: "hrms", title: "HRMS", caption: "Human Resources", icon: Users,
  nodes: [
    { kind: "link", key: "hrms-dashboard", name: "Dashboard", path: "/hrfms/dashboard", icon: LayoutDashboard },
    { kind: "link", key: "hrms-profile", name: "My Profile", path: "/hrfms/my-profile", icon: Users },
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
    { kind: "link", key: "hrms-candidate-status", name: "Candidate Status", path: "/hrfms/condidate-list", icon: Users },
    { kind: "link", key: "hrms-selected-candidate", name: "Selected Candidate", path: "/hrfms/condidate-select", icon: BadgeCheck },
  ],
};

const storeSection: SidebarSection = {
  key: "store", title: "Store and Purchase", caption: "Material Operations", icon: ShoppingCart,
  nodes: [
    { kind: "link", key: "store-dashboard", name: "Dashboard", path: "/store/dashboard", icon: LayoutDashboard },
    { kind: "link", key: "store-issue", name: "Store Issue", path: "/store/item-issue", icon: ClipboardList },
    { kind: "link", key: "store-indent", name: "Indent", path: "/store/indent", icon: FileText },
    { kind: "link", key: "store-approve-indent-hod", name: "Approve Indent HOD", path: "/store/approve-indent", icon: BadgeCheck },
    { kind: "link", key: "store-approve-indent-gm", name: "Approve Indent GM", path: "/store/approve-indent-data", icon: BadgeCheck },
    { kind: "link", key: "store-purchase-order", name: "Purchase Order", path: "/store/pending-indents", icon: ShoppingCart },
    { kind: "link", key: "store-inventory", name: "Inventory", path: "/store/inventory", icon: Boxes },
    { kind: "link", key: "store-returnable", name: "Returnable", path: "/store/returnable", icon: RefreshCw },
    { kind: "link", key: "store-repair-gate-pass", name: "Repair Gate Pass", path: "/store/repair-gate-pass", icon: ShieldCheck },
    { kind: "link", key: "store-repair-follow-up", name: "Repair Follow Up", path: "/store/repair-followup", icon: RefreshCw },
    { kind: "link", key: "store-grn", name: "Store GRN", path: "/store/store-grn", icon: FileText },
    { kind: "link", key: "store-grn-admin", name: "Store GRN Admin", path: "/store/store-grn-admin", icon: BadgeCheck },
    { kind: "link", key: "store-grn-gm", name: "Store GRN GM", path: "/store/store-grn-gm", icon: BadgeCheck },
    { kind: "link", key: "store-grn-close", name: "Store GRN Close", path: "/store/store-grn-close", icon: ShieldCheck },
    { kind: "link", key: "store-out-approval", name: "Store Out Approval", path: "/store/store-out-approval", icon: BadgeCheck },
    { kind: "link", key: "store-completed-items", name: "Completed Items", path: "/store/completed-items", icon: Files },
    { kind: "link", key: "store-my-indent", name: "My Indent", path: "/store/user-indent-list-indent", icon: FileText },
    { kind: "link", key: "store-requisition", name: "Requisition", path: "/store/user-requisition", icon: FileText },
    { kind: "link", key: "store-create-indent", name: "Create Indent", path: "/store/user-indent", icon: FileText },
  ],
};

const visitorSection: SidebarSection = {
  key: "visitor-gate-pass", title: "Visitor Gate Pass", caption: "Security Access", icon: ShieldCheck,
  nodes: [{ kind: "link", key: "visitor-gate-pass", name: "Visitor Gate Pass", path: "/gatepass/visitor", icon: ShieldCheck }],
};

const closeGateSection: SidebarSection = {
  key: "close-gate-pass", title: "Close Gate Pass", caption: "Security Access", icon: BookCopy,
  nodes: [{ kind: "link", key: "close-gate-pass", name: "Close Gate Pass", path: "/gatepass/close", icon: BookCopy }],
};

const moduleSections: Record<Exclude<PortalNavKey, "home">, SidebarSection> = {
  checklist: checklistSection,
  sales: salesWorkspaceSection,
  logistic: salesWorkspaceSection,
  batchcode: salesWorkspaceSection,
  hrms: hrmsSection,
  store: storeSection,
  subscription: subscriptionSection,
  "visitor-gate-pass": visitorSection,
  "close-gate-pass": closeGateSection,
};

// ─── Component ────────────────────────────────────────────────────────────────

const AppSidebar: FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const { logout, user } = useAuth();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const activeModule = getSidebarModuleForPath(location.pathname);
  const section = activeModule ? moduleSections[activeModule as Exclude<PortalNavKey, "home">] : null;
  const isAdmin = useMemo(() => isAdminUser(user), [user]);
  const showText = isExpanded || isHovered || isMobileOpen;

  const isLinkActive = (path: string) => {
    const currentPath = normalizePath(location.pathname);
    const targetPath = normalizePath(path);
    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
  };

  // ── Only these 3 routes are always visible to user-role store users ──
  const STORE_USER_DEFAULT_PATHS = new Set([
    "/store/user-indent-list-indent", // My Indent
    "/store/user-requisition",         // Requisition
    "/store/user-indent",              // Create Indent
  ]);



  const canAccessLink = (item: SidebarLinkItem) => {
    if (!section) return false;
    if (item.requiresAdmin && !isAdmin) return false;

    if (section.key === "store") {
      const hasStoreAccess = isAdmin || hasStoreModuleAccess(user);
      if (!hasStoreAccess) return false;
      // My Indent, Requisition, Create Indent → always shown to all store users
      if (STORE_USER_DEFAULT_PATHS.has(item.path)) return true;
    }

    return isAdmin || isPathAllowed(item.path, user);
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
    return section.nodes.map(filterNode).filter(isNode);
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
      // Only initialise groups that have defaultOpen: true — never auto-open on active path
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
  }, [section]);

  if (!section || (!filteredHomeItem && filteredNodes.length === 0)) return null;

  const handleLinkClick = () => { if (isMobileOpen) toggleMobileSidebar(); };
  const toggleGroup = (key: string) => setOpenGroups((c) => ({ ...c, [key]: !c[key] }));

  /* ── Leaf link (or section-label divider) ────────────────────── */
  const renderLink = (item: SidebarLinkItem, depth = 0) => {
    const Icon = item.icon;

    // Non-clickable section label
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

    // Active: solid red pill | Inactive: transparent row
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

  /* ── Collapsible group ───────────────────────────────────────── */
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
        {/* Section label */}
        {depth === 0 && group.sectionLabel && showText && (
          <p className={`mt-3 mb-0.5 px-4 pt-1 font-bold uppercase tracking-[0.2em] text-[#94a3b8] select-none ${TEXT_LABEL}`}>
            {group.sectionLabel}
          </p>
        )}

        {/* Group row */}
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
                  "h-3.5 w-3.5 lg:h-4 lg:w-4",
                  hasActive ? "text-white/70" : "text-[#94a3b8]",
                  isOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </>
          )}
        </button>

        {/* Children */}
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

  /* ── Sidebar shell ───────────────────────────────────────────── */
  return (
    <aside
      className={[
        "fixed left-0 z-[1000] flex flex-col",
        "bg-white border-r border-[#e2e8f0]",  // white background
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
      {/* ── Logo bar ── */}
      <div
        className={[
          "hidden shrink-0 items-center xl:flex",
          "h-[54px] lg:h-[60px] 2xl:h-[66px]",
          "border-b border-[#e2e8f0] bg-white",
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

      {/* ── Module label bar ── */}
      {showText && (
        <div className="shrink-0 border-b border-[#e2e8f0] px-4 py-2 bg-[#f8fafc]">
          <p className={`font-bold uppercase tracking-[0.2em] text-[#ee1c23] ${TEXT_MOD_CAP}`}>
            {section.caption || "Navigation"}
          </p>
          <p className={`font-semibold text-[#334155] leading-tight ${TEXT_MOD}`}>{section.title}</p>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5
          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#e2e8f0]
          [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        {filteredHomeItem && renderLink(filteredHomeItem, 0)}
        {filteredNodes.map((node) =>
          node.kind === "link" ? renderLink(node, 0) : renderGroup(node, 0)
        )}
      </nav>

      {/* ── Sign out ── */}
      <div className="shrink-0 border-t border-[#e2e8f0] bg-white px-2 py-2">
        <button
          onClick={logout}
          title="Sign Out"
          className={[
            "flex w-full items-center gap-2.5 rounded-xl transition-all duration-200",
            "text-[#f87171] hover:bg-[#450a0a60] hover:text-[#fca5a5]",
            `${TEXT_ITEM} ${PY_ROOT}`,
            showText ? "px-3" : "justify-center",
          ].join(" ")}
        >
          <LogOut className={`shrink-0 ${ICON_ROOT}`} />
          {showText && <span className="truncate font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
