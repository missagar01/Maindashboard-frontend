import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen overflow-x-hidden xl:flex">
      <div id="main-nav-container">
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`min-w-0 flex-1 overflow-x-hidden transition-all duration-300 ease-in-out bg-transparent ${isExpanded || isHovered ? "xl:ml-[290px]" : "xl:ml-[90px]"
          } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="mx-auto max-w-(--breakpoint-2xl) overflow-x-hidden bg-transparent p-4 md:p-6">
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
