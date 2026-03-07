import { useCallback, useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import {
  BoxCubeIcon,
  PieChartIcon,
  PlugInIcon,
} from "../icons";
import { ChevronDown, LogOut, Users } from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assert/Logo.jpeg";
import { isAdminUser, isPathAllowed } from "../utils/accessControl";

type NavItem = {
  name: string;
  icon: ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
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

const leadToOrderBaseSubItems = [
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

const parentBaseClass =
  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200";
const parentActiveClass =
  "bg-gradient-to-r from-[#EE1C23] to-[#ff3b42] text-white shadow-sm";
const parentInactiveClass = "text-slate-700 hover:bg-slate-100";
const subBaseClass =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200";
const subActiveClass = "bg-[#EE1C23]/12 text-[#B51219]";
const subInactiveClass = "text-slate-600 hover:bg-slate-100 hover:text-slate-800";

const AppSidebar: FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();
  const { logout, user } = useAuth();
  const isAdmin = useMemo(() => isAdminUser(user), [user]);
  const showText = isExpanded || isHovered || isMobileOpen;

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
  }, [location.pathname]);

  const handleLinkClick = useCallback(() => {
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
  }, [isMobileOpen, toggleMobileSidebar]);

  const leadToOrderNavItem = useMemo(() => {
    const subItems = leadToOrderBaseSubItems.filter((subItem) =>
      isPathAllowed(subItem.path, user)
    );

    return {
      ...leadToOrderBaseItem,
      subItems,
    };
  }, [user]);

  const filteredO2dItem = useMemo(() => {
    if (!isAdmin && !isPathAllowed("/o2d", user) && !o2dItem.subItems?.some((s) => isPathAllowed(s.path, user))) {
      return null;
    }

    const filteredSubItems =
      o2dItem.subItems?.filter((subItem) => isPathAllowed(subItem.path, user)) || [];

    if (filteredSubItems.length === 0 && !isAdmin) return null;

    return {
      ...o2dItem,
      subItems: filteredSubItems,
    };
  }, [user, isAdmin]);

  const filteredBatchCodeItem = useMemo(() => {
    if (
      !isAdmin &&
      !isPathAllowed("/batchcode", user) &&
      !batchCodeItem.subItems?.some((s) => isPathAllowed(s.path, user))
    ) {
      return null;
    }

    const filteredSubItems =
      batchCodeItem.subItems?.filter((subItem) => isPathAllowed(subItem.path, user)) || [];

    if (filteredSubItems.length === 0 && !isAdmin) return null;

    return {
      ...batchCodeItem,
      subItems: filteredSubItems,
    };
  }, [user, isAdmin]);

  const filteredHrfmsItem = useMemo(() => {
    if (
      !isAdmin &&
      !isPathAllowed("/hrfms", user) &&
      !hrfmsItem.subItems?.some((s) => isPathAllowed(s.path, user))
    ) {
      return null;
    }

    const filteredSubItems =
      hrfmsItem.subItems?.filter((subItem) => isPathAllowed(subItem.path, user)) || [];

    if (filteredSubItems.length === 0 && !isAdmin) return null;

    return {
      ...hrfmsItem,
      subItems: filteredSubItems,
    };
  }, [user, isAdmin]);

  const showDashboard = useMemo(() => {
    return isPathAllowed("/", user) || isPathAllowed("/dashboard", user);
  }, [user]);

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

  const isGroupActive = useCallback(
    (nav: NavItem) => {
      if (nav.path) return isActive(nav.path);
      return Boolean(nav.subItems?.some((subItem) => isActive(subItem.path)));
    },
    [isActive]
  );

  const renderSubItems = useCallback(
    (subItems?: NavItem["subItems"]) => {
      if (!showText || !subItems || subItems.length === 0) return null;

      return (
        <ul className="mt-1 space-y-0.5 border-l border-slate-200 pl-2.5 ml-4">
          {subItems.map((subItem) => {
            const isSubActive = isActive(subItem.path);
            return (
              <li key={subItem.name}>
                <Link
                  to={subItem.path}
                  onClick={handleLinkClick}
                  className={`${subBaseClass} ${isSubActive ? subActiveClass : subInactiveClass}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  <span className="truncate">{subItem.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      );
    },
    [handleLinkClick, isActive, showText]
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
        {showDashboard && (
          <div className="mb-1">
            <Link
              to={dashboardItem.path || "/"}
              onClick={handleLinkClick}
              className={`${parentBaseClass} ${showText ? "" : "justify-center px-2"} ${
                isActive(dashboardItem.path || "/") ? parentActiveClass : parentInactiveClass
              }`}
            >
              <span className="flex-shrink-0 text-current">{dashboardItem.icon}</span>
              {showText ? <span className="truncate">{dashboardItem.name}</span> : null}
            </Link>
          </div>
        )}

        {filteredO2dItem ? (
          <div className="mb-1">
            {renderGroupToggle(filteredO2dItem, isO2dOpen, () =>
              setIsO2dOpen((prev) => !prev)
            )}
            {isO2dOpen ? renderSubItems(filteredO2dItem.subItems) : null}
          </div>
        ) : null}

        {filteredBatchCodeItem ? (
          <div className="mb-1">
            {renderGroupToggle(filteredBatchCodeItem, isBatchCodeOpen, () =>
              setIsBatchCodeOpen((prev) => !prev)
            )}
            {isBatchCodeOpen ? renderSubItems(filteredBatchCodeItem.subItems) : null}
          </div>
        ) : null}

        {leadToOrderNavItem.subItems && leadToOrderNavItem.subItems.length > 0 ? (
          <div className="mb-1">
            {renderGroupToggle(leadToOrderNavItem, isLeadToOrderOpen, () =>
              setIsLeadToOrderOpen((prev) => !prev)
            )}
            {isLeadToOrderOpen ? renderSubItems(leadToOrderNavItem.subItems) : null}
          </div>
        ) : null}

        {filteredHrfmsItem ? (
          <div className="mb-1">
            {renderGroupToggle(filteredHrfmsItem, isHrfmsOpen, () =>
              setIsHrfmsOpen((prev) => !prev)
            )}
            {isHrfmsOpen ? renderSubItems(filteredHrfmsItem.subItems) : null}
          </div>
        ) : null}

        {isAdmin ? (
          <div className="mb-1">
            <Link
              to={leadToOrderSettingsItem.path || "/lead-to-order/settings"}
              onClick={handleLinkClick}
              className={`${parentBaseClass} ${showText ? "" : "justify-center px-2"} ${
                isActive(leadToOrderSettingsItem.path || "/lead-to-order/settings")
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
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
            showText
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
