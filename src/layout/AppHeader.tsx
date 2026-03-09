import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LogOut, Menu, X } from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import UserDropdown from "../components/header/UserDropdown";
import logo from "../assert/Logo.jpeg";
import {
  DEFAULT_PORTAL_NAV_ITEMS,
  getActivePortalNavKey,
  resolvePortalNavItem,
  resolvePortalSystemDefinition,
  shouldShowSidebarForPath,
} from "../config/portalNavigation";
import { isAdminUser } from "../utils/accessControl";
import { fetchSystemsApi } from "../api/master/systemsApi";

interface MasterSystemRecord {
  id: number;
  systems: string;
  link?: string | null;
}

const parseCsv = (value?: string | null) =>
  (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user, logout, token } = useAuth();

  const [isModuleMenuOpen, setModuleMenuOpen] = useState(false);
  const [masterSystems, setMasterSystems] = useState<MasterSystemRecord[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);

  const hasSidebar = shouldShowSidebarForPath(location.pathname);
  const activeNavKey = getActivePortalNavKey(location.pathname);

  useEffect(() => {
    let mounted = true;
    const loadSystems = async () => {
      if (!token || !user) { if (mounted) setMasterSystems([]); return; }
      const systems = await fetchSystemsApi();
      if (!mounted) return;
      setMasterSystems(Array.isArray(systems) ? systems : []);
    };
    void loadSystems();
    return () => { mounted = false; };
  }, [token, user]);

  const visibleNavItems = useMemo(() => {
    const homeItem = DEFAULT_PORTAL_NAV_ITEMS[0];
    const navItems = [homeItem];
    const seenKeys = new Set<string>([homeItem.key]);
    const isAdmin = isAdminUser(user);

    const pushNavItem = (item: ReturnType<typeof resolvePortalNavItem>) => {
      if (!item || seenKeys.has(item.key)) return;
      seenKeys.add(item.key);
      navItems.push(item);
    };

    if (isAdmin) {
      if (masterSystems.length > 0) masterSystems.forEach((s) => pushNavItem(resolvePortalNavItem(s.systems)));
      DEFAULT_PORTAL_NAV_ITEMS.slice(1).forEach((item) => pushNavItem(item));
      return navItems;
    }

    const accessNames = parseCsv(user?.system_access);
    const allowedSystemKeys = new Set<string>(
      accessNames.map((n) => resolvePortalSystemDefinition(n)?.key).filter(Boolean)
    );

    if (masterSystems.length > 0) {
      masterSystems.forEach((s) => {
        const item = resolvePortalNavItem(s.systems);
        if (item && allowedSystemKeys.has(item.key)) pushNavItem(item);
      });
    }
    accessNames.forEach((n) => pushNavItem(resolvePortalNavItem(n)));
    return navItems;
  }, [masterSystems, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node))
        setModuleMenuOpen(false);
    };
    if (isModuleMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isModuleMenuOpen]);

  const handleSidebarToggle = () => {
    if (window.innerWidth >= 1280) { toggleSidebar(); return; }
    toggleMobileSidebar();
  };

  const handleNavClick = (path: string) => {
    if (/^https?:\/\//i.test(path)) { window.location.href = path; setModuleMenuOpen(false); return; }
    navigate(path);
    setModuleMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-[1010] border-b border-slate-200 bg-[rgba(248,248,249,0.97)] shadow-[0_2px_14px_rgba(15,23,42,0.06)] backdrop-blur">
      <div
        ref={headerRef}
        className="relative flex h-[58px] items-center justify-between gap-3 px-3 md:px-4 xl:px-5"
      >
        {/* ── LEFT: sidebar toggle (mobile) + logo (desktop) ── */}
        <div className="flex items-center gap-3">
          {hasSidebar ? (
            <button
              type="button"
              onClick={handleSidebarToggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 xl:hidden"
              aria-label="Toggle Sidebar"
            >
              {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          ) : null}

          {/* Logo — desktop left group */}
          <Link
            to="/"
            className="hidden xl:flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
          >
            <img src={logo} alt="Sagar TMT and Pipes" className="h-8 w-auto object-contain md:h-9" />
          </Link>
        </div>

        {/* ── MOBILE LOGO — absolutely centered ── */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 flex xl:hidden shrink-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
        >
          <img src={logo} alt="Sagar TMT and Pipes" className="h-8 w-auto object-contain" />
        </Link>

        {/* ── CENTER: desktop nav ── */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center overflow-hidden xl:flex">
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {visibleNavItems.map((item) => {
              const isActive = item.key === activeNavKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-[13px] font-bold leading-none transition ${isActive
                    ? "bg-gradient-to-r from-[#ee1c23] to-[#ff6a00] text-white shadow-[0_8px_18px_rgba(238,28,35,0.25)]"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── RIGHT: desktop welcome + settings, mobile menu toggle ── */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 text-right xl:flex">
            <p className="text-sm font-semibold text-slate-600">
              Welcome,{" "}
              <span className="font-bold capitalize text-slate-900">
                {user?.username || user?.user_name || "User"}
              </span>
            </p>
          </div>

          <div className="hidden xl:block">
            <UserDropdown variant="settings" />
          </div>

          {/* Mobile menu toggle — red gradient when open */}
          <button
            type="button"
            onClick={() => setModuleMenuOpen((open) => !open)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition xl:hidden ${isModuleMenuOpen
              ? "border-transparent bg-gradient-to-br from-[#ee1c23] to-[#ff6a00] text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            aria-label="Open Navigation Menu"
          >
            {isModuleMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* ══ Mobile navigation panel — RIGHT side drawer (like sidebar) ══ */}
        {isModuleMenuOpen ? (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 top-[58px] z-[1048] bg-black/30 backdrop-blur-sm lg:hidden"
              onClick={() => setModuleMenuOpen(false)}
            />

            {/* Right-side half panel — same structure as AppSidebar */}
            <div className="fixed right-0 top-[58px] z-[1050] flex h-[calc(100dvh-58px)] w-[240px] md:w-[260px] flex-col bg-white shadow-[-8px_0_32px_rgba(15,23,42,0.18)] xl:hidden">

              {/* ─ Branded gradient user header ─ */}
              <div className="shrink-0 bg-gradient-to-r from-[#ee1c23] to-[#ff6a00] px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                  Welcome back
                </p>
                <p className="mt-1 text-[17px] font-extrabold capitalize text-white leading-tight">
                  {user?.username || user?.user_name || "User"}
                </p>
                <p className="mt-0.5 text-xs text-white/60">
                  {user?.email_id || user?.role || "Authenticated user"}
                </p>
              </div>

              {/* ─ Module label bar ─ */}
              <div className="shrink-0 border-b border-[#e2e8f0] px-4 py-2 bg-[#f8fafc]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ee1c23]">
                  Module Navigation
                </p>
                <p className="text-[13px] font-semibold text-[#334155] leading-tight">Select Module</p>
              </div>

              {/* ─ Scrollable nav items ─ */}
              <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5
                [&::-webkit-scrollbar]:w-1
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-[#e2e8f0]
                [&::-webkit-scrollbar-thumb]:rounded-full">
                {visibleNavItems.map((item) => {
                  const isActive = item.key === activeNavKey;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-all ${isActive
                        ? "bg-[#ee1c23] text-white shadow-[0_4px_14px_rgba(238,28,35,0.30)] font-bold"
                        : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                        }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <span className="h-2 w-2 rounded-full bg-white/80 shrink-0" />}
                    </button>
                  );
                })}
              </nav>

              {/* ─ Sign out pinned to bottom ─ */}
              <div className="shrink-0 border-t border-[#e2e8f0] bg-white px-2 py-2">
                <button
                  type="button"
                  onClick={() => { logout(); setModuleMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#f87171] transition hover:bg-[#450a0a20] hover:text-[#ef4444]"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">Sign Out</span>
                </button>
              </div>
            </div>
          </>
        ) : null}

      </div>
    </header>
  );
};

export default AppHeader;
