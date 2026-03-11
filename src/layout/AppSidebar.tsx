import { useCallback, useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { BoxCubeIcon, PieChartIcon, PlugInIcon } from "../icons";
import { ChevronDown, FileText, LogOut, Users } from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assert/Logo.jpeg";
import { getSidebarModuleForPath } from "../config/portalNavigation";
import {
  hasStoreModuleAccess,
  isAdminUser,
  isPathAllowed,
} from "../utils/accessControl";

type NavSubItem = {
  name: string;
  path?: string;
  pro?: boolean;
  new?: boolean;
  subItems?: NavSubItem[];
};

type NavItem = {
  name: string;
  icon: ReactNode;
  path?: string;
  subItems?: NavSubItem[];
};

const dashboardItem: NavItem = {
  icon: <PieChartIcon />,
  name: "Dashboard",
  path: "/",
};

const o2dItem: NavItem = {
  icon: <BoxCubeIcon />,
  name: "O2D",
  subItems: [
    { name: "Orders", path: "/o2d/orders", pro: false },
    { name: "Enquiry", path: "/o2d/enquiry", pro: false },
    { name: "Enquiry List", path: "/o2d/enquiry-list", pro: false },
    { name: "Pending Vehicles", path: "/o2d/process", pro: false },
    { name: "Customers", path: "/o2d/customers", pro: false },
    { name: "Follow Ups", path: "/o2d/follow-ups", pro: false },
  ],
};

const batchCodeItem: NavItem = {
  icon: <BoxCubeIcon />,
  name: "BatchCode",
  subItems: [
    { name: "Laddel", path: "/batchcode/laddel", pro: false },
    { name: "Tundis", path: "/batchcode/tundis", pro: false },
    { name: "SMS Register", path: "/batchcode/sms-register", pro: false },
    { name: "Hot Coil", path: "/batchcode/hot-coil", pro: false },
    { name: "Recoiler", path: "/batchcode/recoiler", pro: false },
    { name: "Pipe Mill", path: "/batchcode/pipe-mill", pro: false },
    { name: "QC Lab", path: "/batchcode/qc-lab", pro: false },
  ],
};

const leadToOrderBaseItem: NavItem = {
  icon: <PlugInIcon />,
  name: "Lead to Order",
};

const leadToOrderBaseSubItems: NavSubItem[] = [
  { name: "Leads", path: "/lead-to-order/leads", pro: false },
  { name: "Follow Up", path: "/lead-to-order/follow-up", pro: false },
  { name: "Call Tracker", path: "/lead-to-order/call-tracker", pro: false },
  { name: "Quotation", path: "/lead-to-order/quotation", pro: false },
];

const leadToOrderSettingsItem: NavItem = {
  icon: <BoxCubeIcon />,
  name: "Settings",
  path: "/lead-to-order/settings",
};

const hrfmsItem: NavItem = {
  icon: <Users className="h-4 w-4" />,
  name: "HRFMS",
  subItems: [
    { name: "Dashboard", path: "/hrfms/dashboard" },
    { name: "My Profile", path: "/hrfms/my-profile" },
    { name: "MainPower Request", path: "/hrfms/resume-request" },
    { name: "MainPower List", path: "/hrfms/resume-list" },
    { name: "Travel Request", path: "/hrfms/requests" },
    { name: "Tickets", path: "/hrfms/tickets" },
    { name: "Travel Status", path: "/hrfms/travel-status" },
    { name: "Resume", path: "/hrfms/resumes" },
    { name: "Resume Upload", path: "/hrfms/resume-form" },
    { name: "Leave Request", path: "/hrfms/leave-request" },
    { name: "Leave Approvals", path: "/hrfms/leave-approvals" },
    { name: "HOD Approval", path: "/hrfms/commercial-head-approval" },
    { name: "HR Approvals", path: "/hrfms/leave-hr-approvals" },
    { name: "Plant Visitor", path: "/hrfms/plant-visitor" },
    { name: "Plant Visitor List", path: "/hrfms/plant-visitorlist" },
    { name: "Candidate Status", path: "/hrfms/condidate-list" },
    { name: "Selected Candidate", path: "/hrfms/condidate-select" },
  ],
};

const documentItem: NavItem = {
  icon: <FileText className="h-4 w-4" />,
  name: "Document",
  subItems: [
    {
      name: "Resource Manager",
      subItems: [
        { name: "All Resources", path: "/resource-manager" },
        {
          name: "Renewals",
          subItems: [
            { name: "Document Renewal", path: "/document/renewal" },
            { name: "Subscription Renewal", path: "/subscription/renewal" },
          ],
        },
        { name: "Document Shared", path: "/document/shared" },
        { name: "Subscription Approval", path: "/subscription/approval" },
        { name: "Subscription Payment", path: "/subscription/payment" },
      ],
    },
    {
      name: "Loan",
      subItems: [
        { name: "All Loan", path: "/loan/all" },
        { name: "Request Forecloser", path: "/loan/foreclosure" },
        { name: "Collect NOC", path: "/loan/noc" },
      ],
    },
    { name: "Master", path: "/master" },
  ],
};

const storeItem: NavItem = {
  icon: <BoxCubeIcon />,
  name: "Store",
  subItems: [
    { name: "Dashboard", path: "/store/dashboard" },
    { name: "Store Issue", path: "/store/store-issue" },
    { name: "Indent", path: "/store/approve-indent" },
    { name: "Approve Indent HOD", path: "/store/approve-indent-data" },
    { name: "Approve Indent GM", path: "/store/approve-indent-gm" },
    { name: "Purchase Order", path: "/store/pending-indents" },
    { name: "Inventory", path: "/store/inventory" },
    { name: "Returnable", path: "/store/returnable" },
    { name: "Repair Gate Pass", path: "/store/repair-gate-pass" },
    { name: "Repair Follow Up", path: "/store/repair-followup" },
    { name: "Store GRN", path: "/store/store-grn" },
    { name: "Store GRN Admin Approval", path: "/store/store-grn-admin" },
    { name: "Store GRN GM Approval", path: "/store/store-grn-gm" },
    { name: "Store GRN Close", path: "/store/store-grn-close" },
    { name: "Store Out Approval", path: "/store/store-out-approval" },
    { name: "Completed Items", path: "/store/completed-items" },
    { name: "My Indent (Erp)", path: "/store/erp-indent" },
    { name: "Requested Indent", path: "/store/user-indent-list-indent" },
    { name: "Requisition", path: "/store/user-requisition" },
    { name: "Create Indent", path: "/store/user-indent" },
  ],
};

const parentBaseClass =
  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200";
const parentActiveClass = "bg-gradient-to-r from-[#EE1C23] to-[#ff3b42] text-white shadow-sm";
const parentInactiveClass = "text-slate-700 hover:bg-slate-100";
const subBaseClass =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200";
const subActiveClass = "bg-[#EE1C23]/12 text-[#B51219]";
const subInactiveClass = "text-slate-600 hover:bg-slate-100 hover:text-slate-800";

const isDocumentPath = (path: string) => {
  return (
    path.startsWith("/document") ||
    path.startsWith("/subscription") ||
    path.startsWith("/loan") ||
    path.startsWith("/payment") ||
    path.startsWith("/account") ||
    path.startsWith("/resource-manager") ||
    path.startsWith("/master")
  );
};

const AppSidebar: FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();
  const { logout, user } = useAuth();
  const isAdmin = useMemo(() => isAdminUser(user), [user]);
  const showText = isExpanded || isHovered || isMobileOpen;
  const activeSidebarModule = useMemo(
    () => getSidebarModuleForPath(location.pathname),
    [location.pathname]
  );

  const [isO2dOpen, setIsO2dOpen] = useState<boolean>(true);
  const [isBatchCodeOpen, setIsBatchCodeOpen] = useState<boolean>(() =>
    location.pathname.startsWith("/batchcode")
  );
  const [isLeadToOrderOpen, setIsLeadToOrderOpen] = useState<boolean>(() =>
    location.pathname.startsWith("/lead-to-order")
  );
  const [isHrfmsOpen, setIsHrfmsOpen] = useState<boolean>(() =>
    location.pathname.startsWith("/hrfms")
  );
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(() =>
    location.pathname.startsWith("/store")
  );
  const [isDocumentOpen, setIsDocumentOpen] = useState<boolean>(() =>
    isDocumentPath(location.pathname)
  );
  const [nestedOpen, setNestedOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (location.pathname.startsWith("/o2d")) {
      setIsO2dOpen(true);
    }
    if (location.pathname.startsWith("/batchcode")) {
      setIsBatchCodeOpen(true);
    }
    if (location.pathname.startsWith("/lead-to-order")) {
      setIsLeadToOrderOpen(true);
    }
    if (location.pathname.startsWith("/hrfms")) {
      setIsHrfmsOpen(true);
    }
    if (location.pathname.startsWith("/store")) {
      setIsStoreOpen(true);
    }
    if (isDocumentPath(location.pathname)) {
      setIsDocumentOpen(true);
    }
  }, [location.pathname]);

  const handleLinkClick = useCallback(() => {
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
  }, [isMobileOpen, toggleMobileSidebar]);

  const isActive = useCallback(
    (path: string) => {
      if (path.includes("?tab=")) {
        const [basePath, queryParam] = path.split("?");
        const tabValue = queryParam?.split("=")[1];
        const currentTab = new URLSearchParams(location.search).get("tab");

        if (location.pathname === "/" || location.pathname === "/dashboard") {
          if (tabValue && currentTab === tabValue) return true;
          if (!tabValue && !currentTab && basePath === "/") return true;
        }

        return location.pathname === basePath && currentTab === tabValue;
      }
      return location.pathname === path;
    },
    [location.pathname, location.search]
  );

  const filterSubItems = useCallback(
    (subItems?: NavSubItem[]): NavSubItem[] => {
      if (!subItems || subItems.length === 0) return [];

      return subItems.reduce<NavSubItem[]>((acc, subItem) => {
        if (subItem.subItems && subItem.subItems.length > 0) {
          const filteredChildren = filterSubItems(subItem.subItems);
          if (filteredChildren.length > 0 || isAdmin) {
            acc.push({
              ...subItem,
              subItems: isAdmin ? subItem.subItems : filteredChildren,
            });
          }
          return acc;
        }

        if (subItem.path && (isAdmin || isPathAllowed(subItem.path, user))) {
          acc.push(subItem);
        }
        return acc;
      }, []);
    },
    [isAdmin, user]
  );

  const leadToOrderNavItem = useMemo(() => {
    const subItems = leadToOrderBaseSubItems.filter((subItem) =>
      isPathAllowed(subItem.path || "", user)
    );

    return {
      ...leadToOrderBaseItem,
      subItems,
    };
  }, [user]);

  const filteredO2dItem = useMemo(() => {
    if (
      !isAdmin &&
      !isPathAllowed("/o2d", user) &&
      !o2dItem.subItems?.some((s) => isPathAllowed(s.path || "", user))
    ) {
      return null;
    }

    const filteredSubItems = filterSubItems(o2dItem.subItems);
    if (filteredSubItems.length === 0 && !isAdmin) return null;

    return { ...o2dItem, subItems: filteredSubItems };
  }, [filterSubItems, isAdmin, user]);

  const filteredBatchCodeItem = useMemo(() => {
    if (
      !isAdmin &&
      !isPathAllowed("/batchcode", user) &&
      !batchCodeItem.subItems?.some((s) => isPathAllowed(s.path || "", user))
    ) {
      return null;
    }

    const filteredSubItems = filterSubItems(batchCodeItem.subItems);
    if (filteredSubItems.length === 0 && !isAdmin) return null;

    return { ...batchCodeItem, subItems: filteredSubItems };
  }, [filterSubItems, isAdmin, user]);

  const filteredHrfmsItem = useMemo(() => {
    if (
      !isAdmin &&
      !isPathAllowed("/hrfms", user) &&
      !hrfmsItem.subItems?.some((s) => isPathAllowed(s.path || "", user))
    ) {
      return null;
    }

    const filteredSubItems = filterSubItems(hrfmsItem.subItems);
    if (filteredSubItems.length === 0 && !isAdmin) return null;

    return { ...hrfmsItem, subItems: filteredSubItems };
  }, [filterSubItems, isAdmin, user]);

  const filteredStoreItem = useMemo(() => {
    if (
      !isAdmin &&
      !hasStoreModuleAccess(user) &&
      !storeItem.subItems?.some((s) => isPathAllowed(s.path || "", user))
    ) {
      return null;
    }

    const filteredSubItems = filterSubItems(storeItem.subItems);
    if (filteredSubItems.length === 0 && !isAdmin) return null;

    return { ...storeItem, subItems: filteredSubItems };
  }, [filterSubItems, isAdmin, user]);

  const filteredDocumentItem = useMemo(() => {
    if (
      !isAdmin &&
      !isPathAllowed("/document", user) &&
      !documentItem.subItems?.some((s) =>
        s.path ? isPathAllowed(s.path, user) : s.subItems?.some((c) => isPathAllowed(c.path || "", user))
      )
    ) {
      return null;
    }

    const filteredSubItems = filterSubItems(documentItem.subItems);
    if (filteredSubItems.length === 0 && !isAdmin) return null;

    return { ...documentItem, subItems: filteredSubItems };
  }, [filterSubItems, isAdmin, user]);

  const showDashboard = useMemo(() => {
    return isPathAllowed("/", user) || isPathAllowed("/dashboard", user);
  }, [user]);
  const showSalesSections = activeSidebarModule === "sales";
  const showHrfmsSection = activeSidebarModule === "hrms";
  const showStoreSection = activeSidebarModule === "store";
  const showDocumentSection = activeSidebarModule === "subscription";
  const showAdminSettings = isAdmin && showSalesSections;

  const buildSubKey = useCallback((item: NavSubItem, parentKey: string) => {
    return `${parentKey}>${item.path || item.name}`;
  }, []);

  const isSubItemActive = useCallback(
    (item: NavSubItem): boolean => {
      if (item.path && isActive(item.path)) return true;
      if (item.subItems && item.subItems.length > 0) {
        return item.subItems.some((sub) => isSubItemActive(sub));
      }
      return false;
    },
    [isActive]
  );

  useEffect(() => {
    if (!filteredDocumentItem?.subItems) return;

    const activeParentKeys = new Set<string>();

    const collectActiveParentKeys = (items: NavSubItem[], parentKey: string): boolean => {
      let hasActive = false;

      for (const item of items) {
        const key = buildSubKey(item, parentKey);
        const selfActive = Boolean(item.path && isActive(item.path));
        const childActive = item.subItems
          ? collectActiveParentKeys(item.subItems, key)
          : false;

        if (item.subItems && (selfActive || childActive)) {
          activeParentKeys.add(key);
        }

        if (selfActive || childActive) {
          hasActive = true;
        }
      }

      return hasActive;
    };

    collectActiveParentKeys(filteredDocumentItem.subItems, "document-root");

    if (activeParentKeys.size === 0) return;

    setNestedOpen((prev) => {
      const next = { ...prev };
      let changed = false;
      activeParentKeys.forEach((key) => {
        if (!next[key]) {
          next[key] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [buildSubKey, filteredDocumentItem, isActive]);

  const isGroupActive = useCallback(
    (nav: NavItem) => {
      if (nav.path && isActive(nav.path)) return true;
      return Boolean(nav.subItems?.some((subItem) => isSubItemActive(subItem)));
    },
    [isActive, isSubItemActive]
  );

  const renderSubItems = useCallback(
    (subItems: NavSubItem[] | undefined, parentKey: string, depth = 0) => {
      if (!showText || !subItems || subItems.length === 0) return null;

      return (
        <ul className="mt-1 space-y-0.5 border-l border-slate-200 pl-2.5 ml-4">
          {subItems.map((subItem) => {
            const key = buildSubKey(subItem, parentKey);
            const hasChildren = Boolean(subItem.subItems && subItem.subItems.length > 0);
            const subItemActive = isSubItemActive(subItem);
            const rowClass = `${subBaseClass} ${subItemActive ? subActiveClass : subInactiveClass} ${depth > 0 ? "text-[13px]" : ""
              }`;

            if (hasChildren) {
              const isOpen = Boolean(nestedOpen[key]);
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() =>
                      setNestedOpen((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    className={`${rowClass} justify-between`}
                    aria-expanded={isOpen}
                    aria-label={`${subItem.name} submenu`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      <span className="truncate">{subItem.name}</span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                  {isOpen ? renderSubItems(subItem.subItems, key, depth + 1) : null}
                </li>
              );
            }

            if (!subItem.path) return null;

            return (
              <li key={key}>
                <Link to={subItem.path} onClick={handleLinkClick} className={rowClass}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  <span className="truncate">{subItem.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      );
    },
    [buildSubKey, handleLinkClick, isSubItemActive, nestedOpen, showText]
  );

  const renderGroupToggle = useCallback(
    (nav: NavItem, isOpen: boolean, onToggle?: () => void) => {
      const isDirectActive = Boolean(nav.path && isActive(nav.path));
      const hasActiveChild = !nav.path && isGroupActive(nav);
      const stateClass = isDirectActive
        ? parentActiveClass
        : hasActiveChild
          ? "text-[#B51219]"
          : parentInactiveClass;
      const commonClass = `${parentBaseClass} ${showText ? "" : "justify-center px-2"} ${stateClass}`;
      const content = (
        <>
          <span className="flex-shrink-0 text-current">{nav.icon}</span>
          {showText && (
            <>
              <span className="flex-1 truncate text-left">{nav.name}</span>
              {onToggle ? (
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              ) : null}
            </>
          )}
        </>
      );

      if (!onToggle) {
        return <div className={commonClass}>{content}</div>;
      }

      return (
        <button
          type="button"
          onClick={onToggle}
          className={commonClass}
          aria-expanded={isOpen}
          aria-label={`${nav.name} menu`}
        >
          {content}
        </button>
      );
    },
    [isActive, isGroupActive, showText]
  );

  return (
    <aside
      className={`fixed left-0 flex flex-col bg-white text-gray-800 transition-all duration-300 ease-in-out z-[1000] border-r border-gray-100 shadow-xl
        ${isMobileOpen
          ? "top-[72px] h-[calc(100dvh-72px)] w-[280px] translate-x-0"
          : "top-0 h-[100dvh] -translate-x-full xl:translate-x-0"}
        ${!isMobileOpen ? (isExpanded || isHovered ? "xl:w-[290px]" : "xl:w-[90px]") : ""}
      `}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`shrink-0 h-[72px] hidden xl:flex items-center shadow-sm relative z-10 transition-all duration-300
          ${!isExpanded && !isHovered && !isMobileOpen ? "justify-center px-0 bg-white" : "justify-center px-0 bg-[#EE1C23]"}`}
      >
        <Link to="/" onClick={handleLinkClick} className="flex items-center w-full h-full overflow-hidden group">
          <div
            className={`flex-shrink-0 transition-all duration-300 ease-in-out w-full
              ${!isExpanded && !isHovered && !isMobileOpen ? "h-10" : "h-full"}`}
          >
            <img
              src={logo}
              alt="SMRPL Logo"
              className={`w-full h-full transition-transform duration-300 group-hover:scale-105
                ${!isExpanded && !isHovered && !isMobileOpen ? "object-contain" : "object-fill"}`}
            />
          </div>
        </Link>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar px-2 py-3">
        {showDashboard ? (
          <div className="mb-1">
            <Link
              to={dashboardItem.path || "/"}
              onClick={handleLinkClick}
              className={`${parentBaseClass} ${showText ? "" : "justify-center px-2"} ${isActive(dashboardItem.path || "/") ? parentActiveClass : parentInactiveClass
                }`}
            >
              <span className="flex-shrink-0 text-current">{dashboardItem.icon}</span>
              {showText ? <span className="truncate">{dashboardItem.name}</span> : null}
            </Link>
          </div>
        ) : null}

        {showSalesSections && filteredO2dItem ? (
          <div className="mb-1">
            {renderGroupToggle(filteredO2dItem, isO2dOpen, () => setIsO2dOpen((prev) => !prev))}
            {isO2dOpen ? renderSubItems(filteredO2dItem.subItems, "o2d-root") : null}
          </div>
        ) : null}

        {showSalesSections && filteredBatchCodeItem ? (
          <div className="mb-1">
            {renderGroupToggle(filteredBatchCodeItem, isBatchCodeOpen, () =>
              setIsBatchCodeOpen((prev) => !prev)
            )}
            {isBatchCodeOpen ? renderSubItems(filteredBatchCodeItem.subItems, "batchcode-root") : null}
          </div>
        ) : null}

        {showSalesSections && leadToOrderNavItem.subItems && leadToOrderNavItem.subItems.length > 0 ? (
          <div className="mb-1">
            {renderGroupToggle(leadToOrderNavItem, isLeadToOrderOpen, () =>
              setIsLeadToOrderOpen((prev) => !prev)
            )}
            {isLeadToOrderOpen ? renderSubItems(leadToOrderNavItem.subItems, "lead-root") : null}
          </div>
        ) : null}

        {showHrfmsSection && filteredHrfmsItem ? (
          <div className="mb-1">
            {renderGroupToggle(filteredHrfmsItem, isHrfmsOpen, () => setIsHrfmsOpen((prev) => !prev))}
            {isHrfmsOpen ? renderSubItems(filteredHrfmsItem.subItems, "hrfms-root") : null}
          </div>
        ) : null}

        {showStoreSection && filteredStoreItem ? (
          <div className="mb-1">
            {renderGroupToggle(filteredStoreItem, isStoreOpen, () => setIsStoreOpen((prev) => !prev))}
            {isStoreOpen ? renderSubItems(filteredStoreItem.subItems, "store-root") : null}
          </div>
        ) : null}

        {showDocumentSection && filteredDocumentItem ? (
          <div className="mb-1">
            {renderGroupToggle(filteredDocumentItem, isDocumentOpen, () =>
              setIsDocumentOpen((prev) => !prev)
            )}
            {isDocumentOpen ? renderSubItems(filteredDocumentItem.subItems, "document-root") : null}
          </div>
        ) : null}

        {showAdminSettings ? (
          <div className="mb-1">
            <Link
              to={leadToOrderSettingsItem.path || "/lead-to-order/settings"}
              onClick={handleLinkClick}
              className={`${parentBaseClass} ${showText ? "" : "justify-center px-2"} ${isActive(leadToOrderSettingsItem.path || "/lead-to-order/settings")
                ? parentActiveClass
                : parentInactiveClass
                }`}
            >
              <span className="flex-shrink-0 text-current">{leadToOrderSettingsItem.icon}</span>
              {showText ? <span className="truncate">{leadToOrderSettingsItem.name}</span> : null}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-auto shrink-0 border-t border-gray-100 px-3 py-3 bg-white">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${showText
            ? "text-red-600 hover:bg-red-50"
            : "justify-center text-gray-400 hover:bg-red-50 hover:text-red-600"
            }`}
          title="Logout"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {showText ? <span className="truncate">Sign Out</span> : null}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
