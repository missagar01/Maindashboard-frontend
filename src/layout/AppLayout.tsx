import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { shouldShowSidebarForPath } from "../config/portalNavigation";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  const hasSidebar = shouldShowSidebarForPath(location.pathname);
  const isLeadFormPage = location.pathname === "/lead-to-order/leads";

  return (
    <div className="min-h-screen overflow-x-hidden xl:flex">
      {hasSidebar ? (
        <div id="main-nav-container">
          <AppSidebar />
          <Backdrop />
        </div>
      ) : null}
      <div
        className={`min-w-0 flex-1 overflow-x-hidden transition-all duration-300 ease-in-out bg-transparent pt-[58px] ${hasSidebar
          ? `${isExpanded || isHovered ? "xl:ml-[250px] 2xl:ml-[280px]" : "xl:ml-[56px] 2xl:ml-[64px]"} ${isMobileOpen ? "ml-0" : ""}`
          : "xl:ml-0"
          }`}
      >
        <AppHeader />
        <div
          className={`${hasSidebar
            ? isLeadFormPage
              ? "w-full p-0"
              : "mx-auto max-w-(--breakpoint-2xl) p-3 md:p-5"
            : "w-full px-3 py-4 md:px-6 md:py-6"} overflow-x-hidden bg-transparent`}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
