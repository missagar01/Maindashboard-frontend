import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import UserDropdown from "../components/header/UserDropdown";
import logo from "../assert/Logo.jpeg";
import {
  DEFAULT_PORTAL_NAV_ITEMS,
  getActivePortalNavKey,
  normalizeSystemIdentifier,
  resolvePortalNavItem,
  shouldShowSidebarForPath,
} from "../config/portalNavigation";
import {
  getAllowedPageRoutes,
  getDefaultAllowedPath,
  getFirstAllowedPathForModule,
  isAdminUser,
} from "../utils/accessControl";
import { fetchSystemsApi } from "../api/master/systemsApi";

interface MasterSystemRecord {
  id: number;
  systems: string;
  link?: string | null;
}

interface DesktopNavLayout {
  fontSize: number;
  visibleCount: number;
}

const MIN_DESKTOP_NAV_FONT_SIZE = 10.5;
const MAX_DESKTOP_NAV_FONT_SIZE = 16;
const DESKTOP_NAV_GAP = 4;
const DESKTOP_NAV_FONT_STEP = 0.25;
const OVERFLOW_NAV_LABEL = "More";
const DESKTOP_NAV_MIN_HORIZONTAL_PADDING = 10;
const DESKTOP_NAV_MAX_HORIZONTAL_PADDING = 14.75;
const DESKTOP_NAV_MIN_VERTICAL_PADDING = 6.5;
const DESKTOP_NAV_MAX_VERTICAL_PADDING = 8.75;
const DESKTOP_NAV_MIN_ICON_SIZE = 14;
const DESKTOP_NAV_MAX_ICON_SIZE = 16.75;
const DESKTOP_NAV_MIN_ICON_GAP = 4;
const DESKTOP_NAV_MAX_ICON_GAP = 5.75;

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatPx = (value: number) => `${Number(value.toFixed(2))}px`;

const buildResponsiveClamp = (
  min: number,
  preferred: number,
  max: number,
  viewportWeight: number
) =>
  `clamp(${formatPx(min)}, calc(${formatPx(preferred)} + ${viewportWeight}vw), ${formatPx(max)})`;

const getDesktopNavHorizontalPadding = (fontSize: number) =>
  clampValue(
    fontSize * 0.9,
    DESKTOP_NAV_MIN_HORIZONTAL_PADDING,
    DESKTOP_NAV_MAX_HORIZONTAL_PADDING
  );

const getDesktopNavHorizontalPaddingUpperBound = (fontSize: number) =>
  clampValue(
    getDesktopNavHorizontalPadding(fontSize) + 1.75,
    DESKTOP_NAV_MIN_HORIZONTAL_PADDING,
    16.5
  );

const getDesktopNavVerticalPadding = (fontSize: number) =>
  clampValue(
    fontSize * 0.52,
    DESKTOP_NAV_MIN_VERTICAL_PADDING,
    DESKTOP_NAV_MAX_VERTICAL_PADDING
  );

const getDesktopNavOverflowIconSize = (fontSize: number) =>
  clampValue(fontSize * 0.98, DESKTOP_NAV_MIN_ICON_SIZE, DESKTOP_NAV_MAX_ICON_SIZE);

const getDesktopNavOverflowIconUpperBound = (fontSize: number) =>
  clampValue(getDesktopNavOverflowIconSize(fontSize) + 1.25, DESKTOP_NAV_MIN_ICON_SIZE, 18);

const getDesktopNavOverflowGap = (fontSize: number) =>
  clampValue(fontSize * 0.32, DESKTOP_NAV_MIN_ICON_GAP, DESKTOP_NAV_MAX_ICON_GAP);

const getDesktopNavOverflowGapUpperBound = (fontSize: number) =>
  clampValue(getDesktopNavOverflowGap(fontSize) + 0.75, DESKTOP_NAV_MIN_ICON_GAP, 6.25);

const estimateNavButtonWidth = (label: string, fontSize: number) => {
  const normalizedLabel = label.replace(/\s+/g, " ").trim();
  const totalHorizontalPadding = getDesktopNavHorizontalPaddingUpperBound(fontSize) * 2;
  return normalizedLabel.length * fontSize * 0.58 + totalHorizontalPadding;
};

const parseCsv = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (typeof entry === "string" ? entry.trim() : String(entry).trim()))
          .filter(Boolean);
      }
    } catch {
      // Fall back to CSV parsing.
    }
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user, logout, token } = useAuth();

  const [isModuleMenuOpen, setModuleMenuOpen] = useState(false);
  const [isDesktopOverflowOpen, setDesktopOverflowOpen] = useState(false);
  const [masterSystems, setMasterSystems] = useState<MasterSystemRecord[]>([]);
  const [desktopNavLayout, setDesktopNavLayout] = useState<DesktopNavLayout>({
    fontSize: MAX_DESKTOP_NAV_FONT_SIZE,
    visibleCount: DEFAULT_PORTAL_NAV_ITEMS.length,
  });
  const headerRef = useRef<HTMLDivElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);

  const hasSidebar = shouldShowSidebarForPath(location.pathname);
  const activeNavKey = getActivePortalNavKey(location.pathname);

  useEffect(() => {
    let mounted = true;

    const loadSystems = async () => {
      if (!token || !user) {
        if (mounted) {
          setMasterSystems([]);
        }
        return;
      }

      const systems = await fetchSystemsApi();
      if (!mounted) return;
      setMasterSystems(Array.isArray(systems) ? systems : []);
    };

    void loadSystems();

    return () => {
      mounted = false;
    };
  }, [token, user]);

  const visibleNavItems = useMemo(() => {
    const isAdmin = isAdminUser(user);
    const computedHomePath = isAdmin ? "/" : getDefaultAllowedPath(user);
    const homeItem = {
      ...DEFAULT_PORTAL_NAV_ITEMS[0],
      path: computedHomePath === "/login" ? "/" : computedHomePath,
    };
    const navItems = [homeItem];
    const seenKeys = new Set<string>([homeItem.key]);

    const pushNavItem = (item: ReturnType<typeof resolvePortalNavItem>, fallbackPath?: string) => {
      if (!item || seenKeys.has(item.key)) return;
      seenKeys.add(item.key);
      navItems.push({ ...item, path: fallbackPath || item.path });
    };

    if (isAdmin) {
      if (masterSystems.length > 0) {
        masterSystems.forEach((system) => pushNavItem(resolvePortalNavItem(system.systems)));
      }
      DEFAULT_PORTAL_NAV_ITEMS.slice(1).forEach((item) => pushNavItem(item));
      return navItems;
    }

    parseCsv(user?.system_access).forEach((accessName) => {
      const normalizedAccessName = normalizeSystemIdentifier(accessName);
      if (normalizedAccessName.includes("gatepass") || normalizedAccessName.includes("visitorpass")) {
        return;
      }

      const item = resolvePortalNavItem(accessName);
      if (item) {
        pushNavItem(item, item.path);
      }
    });

    const allowedPageRoutes = getAllowedPageRoutes(user);
    if (allowedPageRoutes.some((route) => route.startsWith("/project"))) {
      pushNavItem(resolvePortalNavItem("project"), "/project/dashboard");
    }
    if (
      allowedPageRoutes.some(
        (route) => route.startsWith("/gatepass")
      )
    ) {
      pushNavItem(resolvePortalNavItem("gatepass"), "/gatepass/visitor");
    }

    return navItems;
  }, [masterSystems, user]);

  const getPrimaryNavItemsForCount = (count: number) => {
    const nextPrimaryItems = visibleNavItems.slice(
      0,
      Math.max(1, Math.min(count, visibleNavItems.length))
    );
    const activeItem = visibleNavItems.find((item) => item.key === activeNavKey);

    if (
      activeItem &&
      !nextPrimaryItems.some((item) => item.key === activeItem.key) &&
      nextPrimaryItems.length > 0
    ) {
      nextPrimaryItems[nextPrimaryItems.length - 1] = activeItem;
    }

    return nextPrimaryItems;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setModuleMenuOpen(false);
        setDesktopOverflowOpen(false);
      }
    };

    if (isModuleMenuOpen || isDesktopOverflowOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDesktopOverflowOpen, isModuleMenuOpen]);

  useEffect(() => {
    setModuleMenuOpen(false);
    setDesktopOverflowOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const navElement = desktopNavRef.current;
    if (!navElement) return;

    const updateDesktopNavLayout = () => {
      const availableWidth = navElement.clientWidth;
      const totalItems = visibleNavItems.length;

      if (!availableWidth || totalItems === 0) {
        setDesktopNavLayout((current) => {
          if (
            current.visibleCount === totalItems &&
            current.fontSize === MAX_DESKTOP_NAV_FONT_SIZE
          ) {
            return current;
          }

          return {
            visibleCount: totalItems,
            fontSize: MAX_DESKTOP_NAV_FONT_SIZE,
          };
        });
        return;
      }

      let nextLayout: DesktopNavLayout = {
        visibleCount: 1,
        fontSize: MIN_DESKTOP_NAV_FONT_SIZE,
      };
      let matchedLayout = false;

      for (
        let fontSize = MAX_DESKTOP_NAV_FONT_SIZE;
        fontSize >= MIN_DESKTOP_NAV_FONT_SIZE;
        fontSize -= DESKTOP_NAV_FONT_STEP
      ) {
        const normalizedFontSize = Number(fontSize.toFixed(2));

        for (let count = totalItems; count >= 1; count -= 1) {
          const primaryItems = getPrimaryNavItemsForCount(count);
          const hasOverflowItems = primaryItems.length < totalItems;
          const primaryItemsWidth = primaryItems.reduce(
            (total, item) => total + estimateNavButtonWidth(item.label, normalizedFontSize),
            0
          );
          const gapCount =
            Math.max(0, primaryItems.length - 1) + (hasOverflowItems ? 1 : 0);
          const overflowWidth = hasOverflowItems
            ? estimateNavButtonWidth(OVERFLOW_NAV_LABEL, normalizedFontSize) +
              getDesktopNavOverflowIconUpperBound(normalizedFontSize) +
              getDesktopNavOverflowGapUpperBound(normalizedFontSize)
            : 0;
          const totalRequiredWidth =
            primaryItemsWidth + overflowWidth + gapCount * DESKTOP_NAV_GAP;

          nextLayout = {
            visibleCount: primaryItems.length,
            fontSize: normalizedFontSize,
          };

          if (totalRequiredWidth <= availableWidth) {
            matchedLayout = true;
            break;
          }
        }

        if (matchedLayout) {
          break;
        }
      }

      setDesktopNavLayout((current) => {
        if (
          current.visibleCount === nextLayout.visibleCount &&
          Math.abs(current.fontSize - nextLayout.fontSize) < 0.1
        ) {
          return current;
        }

        return nextLayout;
      });
    };

    const frameId = window.requestAnimationFrame(updateDesktopNavLayout);
    const resizeObserver = new ResizeObserver(updateDesktopNavLayout);
    resizeObserver.observe(navElement);
    window.addEventListener("resize", updateDesktopNavLayout);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDesktopNavLayout);
    };
  }, [activeNavKey, visibleNavItems]);

  const desktopPrimaryNavItems = useMemo(
    () => getPrimaryNavItemsForCount(desktopNavLayout.visibleCount),
    [desktopNavLayout.visibleCount, activeNavKey, visibleNavItems]
  );

  const desktopPrimaryNavKeys = useMemo(
    () => new Set(desktopPrimaryNavItems.map((item) => item.key)),
    [desktopPrimaryNavItems]
  );

  const desktopOverflowNavItems = useMemo(
    () => visibleNavItems.filter((item) => !desktopPrimaryNavKeys.has(item.key)),
    [desktopPrimaryNavKeys, visibleNavItems]
  );

  useEffect(() => {
    if (desktopOverflowNavItems.length === 0) {
      setDesktopOverflowOpen(false);
    }
  }, [desktopOverflowNavItems.length]);

  const desktopNavMetrics = useMemo(() => {
    const horizontalPadding = getDesktopNavHorizontalPadding(desktopNavLayout.fontSize);
    const verticalPadding = getDesktopNavVerticalPadding(desktopNavLayout.fontSize);
    const iconSize = getDesktopNavOverflowIconSize(desktopNavLayout.fontSize);
    const iconGap = getDesktopNavOverflowGap(desktopNavLayout.fontSize);

    return {
      horizontalPadding,
      verticalPadding,
      iconSize,
      iconGap,
    };
  }, [desktopNavLayout.fontSize]);

  const desktopNavButtonStyle = useMemo(() => {
    const horizontalPadding = desktopNavMetrics.horizontalPadding;
    const verticalPadding = desktopNavMetrics.verticalPadding;

    return {
      fontSize: `${desktopNavLayout.fontSize}px`,
      paddingLeft: buildResponsiveClamp(
        clampValue(horizontalPadding - 0.75, DESKTOP_NAV_MIN_HORIZONTAL_PADDING, 15.5),
        horizontalPadding,
        getDesktopNavHorizontalPaddingUpperBound(desktopNavLayout.fontSize),
        0.14
      ),
      paddingRight: buildResponsiveClamp(
        clampValue(horizontalPadding - 0.75, DESKTOP_NAV_MIN_HORIZONTAL_PADDING, 15.5),
        horizontalPadding,
        getDesktopNavHorizontalPaddingUpperBound(desktopNavLayout.fontSize),
        0.14
      ),
      paddingTop: buildResponsiveClamp(
        clampValue(verticalPadding - 0.35, DESKTOP_NAV_MIN_VERTICAL_PADDING, 9.5),
        verticalPadding,
        clampValue(verticalPadding + 0.9, DESKTOP_NAV_MIN_VERTICAL_PADDING, 10.25),
        0.08
      ),
      paddingBottom: buildResponsiveClamp(
        clampValue(verticalPadding - 0.35, DESKTOP_NAV_MIN_VERTICAL_PADDING, 9.5),
        verticalPadding,
        clampValue(verticalPadding + 0.9, DESKTOP_NAV_MIN_VERTICAL_PADDING, 10.25),
        0.08
      ),
    };
  }, [desktopNavLayout.fontSize, desktopNavMetrics.horizontalPadding, desktopNavMetrics.verticalPadding]);

  const desktopOverflowButtonStyle = useMemo(() => {
    return {
      ...desktopNavButtonStyle,
      gap: buildResponsiveClamp(
        clampValue(desktopNavMetrics.iconGap - 0.4, DESKTOP_NAV_MIN_ICON_GAP, 5.5),
        desktopNavMetrics.iconGap,
        getDesktopNavOverflowGapUpperBound(desktopNavLayout.fontSize),
        0.06
      ),
    };
  }, [desktopNavButtonStyle, desktopNavLayout.fontSize, desktopNavMetrics.iconGap]);

  const desktopOverflowIconStyle = useMemo(() => {
    return {
      width: buildResponsiveClamp(
        clampValue(desktopNavMetrics.iconSize - 0.45, DESKTOP_NAV_MIN_ICON_SIZE, 17),
        desktopNavMetrics.iconSize,
        getDesktopNavOverflowIconUpperBound(desktopNavLayout.fontSize),
        0.1
      ),
      height: buildResponsiveClamp(
        clampValue(desktopNavMetrics.iconSize - 0.45, DESKTOP_NAV_MIN_ICON_SIZE, 17),
        desktopNavMetrics.iconSize,
        getDesktopNavOverflowIconUpperBound(desktopNavLayout.fontSize),
        0.1
      ),
    };
  }, [desktopNavLayout.fontSize, desktopNavMetrics.iconSize]);

  const isOverflowNavActive = desktopOverflowNavItems.some(
    (item) => item.key === activeNavKey
  );

  const handleSidebarToggle = () => {
    if (window.innerWidth >= 1280) {
      toggleSidebar();
      return;
    }

    toggleMobileSidebar();
  };

  const handleNavClick = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
      window.location.href = path;
      setModuleMenuOpen(false);
      setDesktopOverflowOpen(false);
      return;
    }

    const modulePath = path;
    let resolvedPath = isAdminUser(user)
      ? path
      : getFirstAllowedPathForModule(path, user) || getDefaultAllowedPath(user);

    if (!resolvedPath || resolvedPath === "/login") {
      resolvedPath = getDefaultAllowedPath(user);
    }

    navigate(resolvedPath);

    if (shouldShowSidebarForPath(modulePath) || shouldShowSidebarForPath(resolvedPath)) {
      if (window.innerWidth >= 1280) {
        if (!isExpanded) {
          toggleSidebar();
        }
      } else if (!isMobileOpen) {
        toggleMobileSidebar();
      }
    }

    setModuleMenuOpen(false);
    setDesktopOverflowOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[1010] w-full bg-[rgba(248,248,249,0.92)] shadow-[0_2px_14px_rgba(15,23,42,0.06)] backdrop-blur">
      <div
        ref={headerRef}
        className="relative mx-[clamp(0.25rem,0.12rem+0.35vw,0.9rem)] overflow-visible rounded-[18px]"
      >
        <div aria-hidden="true" className="app-header-gradient-border pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[1.25px] rounded-[17px] bg-[rgba(248,248,249,0.97)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur"
        />

        <div className="relative z-10 flex h-[58px] w-full items-center justify-between gap-2 px-3 md:px-4 xl:gap-[clamp(0.75rem,0.45rem+0.35vw,1.25rem)] xl:px-[clamp(1rem,0.75rem+0.4vw,1.75rem)]">
          <div className="flex shrink-0 items-center gap-3 xl:gap-[clamp(0.75rem,0.45rem+0.32vw,1.1rem)]">
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

          <Link
            to="/"
            className="hidden shrink-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)] xl:flex xl:px-[clamp(0.55rem,0.35rem+0.22vw,0.9rem)] xl:py-[clamp(0.3rem,0.22rem+0.1vw,0.45rem)]"
          >
            <img
              src={logo}
              alt="Sagar TMT and Pipes"
              className="h-8 w-auto object-contain md:h-9 xl:h-[clamp(2rem,1.8rem+0.35vw,2.5rem)]"
            />
          </Link>
        </div>

        <Link
          to="/"
          className="absolute left-1/2 flex shrink-0 -translate-x-1/2 items-center overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)] xl:hidden"
        >
          <img src={logo} alt="Sagar TMT and Pipes" className="h-8 w-auto object-contain" />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center px-1 xl:flex xl:px-[clamp(0.35rem,0.18rem+0.22vw,0.75rem)]">
          <div
            ref={desktopNavRef}
            className="flex w-full min-w-0 justify-center"
          >
            <div
              className="flex max-w-full items-center rounded-xl border border-slate-200/80 bg-white/80 p-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)] xl:p-[clamp(0.25rem,0.18rem+0.1vw,0.45rem)]"
              style={{ gap: `${DESKTOP_NAV_GAP}px` }}
            >
              {desktopPrimaryNavItems.map((item) => {
                const isActive = item.key === activeNavKey;

                return (
                  <button
                    key={item.key}
                    type="button"
                    title={item.label}
                    onClick={() => handleNavClick(item.path)}
                    style={desktopNavButtonStyle}
                    className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-bold leading-[1.05] tracking-[-0.01em] transition ${isActive
                      ? "bg-gradient-to-r from-[#ee1c23] to-[#ff6a00] text-white shadow-[0_8px_18px_rgba(238,28,35,0.25)]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {desktopOverflowNavItems.length > 0 ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-expanded={isDesktopOverflowOpen}
                  aria-label="Open more modules"
                  onClick={() => setDesktopOverflowOpen((open) => !open)}
                  style={desktopOverflowButtonStyle}
                  className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-bold leading-none tracking-[-0.01em] transition ${isOverflowNavActive || isDesktopOverflowOpen
                    ? "bg-gradient-to-r from-[#ee1c23] to-[#ff6a00] text-white shadow-[0_8px_18px_rgba(238,28,35,0.25)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <span>{OVERFLOW_NAV_LABEL}</span>
                  <ChevronDown
                    style={desktopOverflowIconStyle}
                    className={`shrink-0 transition-transform ${isDesktopOverflowOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isDesktopOverflowOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-[1060] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                    <div className="mb-1 px-2 pb-2 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Additional Modules
                      </p>
                    </div>
                    <div className="space-y-1">
                      {desktopOverflowNavItems.map((item) => {
                        const isActive = item.key === activeNavKey;

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleNavClick(item.path)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${isActive
                              ? "bg-[#ee1c23] text-white shadow-[0_4px_14px_rgba(238,28,35,0.25)]"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {isActive ? (
                              <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-white/85" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2 xl:gap-[clamp(0.5rem,0.3rem+0.2vw,0.875rem)]">
          <div className="hidden items-center gap-2 text-right 2xl:flex">
            <p className="text-[clamp(0.875rem,0.82rem+0.12vw,1rem)] font-semibold text-slate-600">
              Welcome,{" "}
              <span className="font-bold capitalize text-slate-900">
                {user?.username || user?.user_name || "User"}
              </span>
            </p>
          </div>

          <div className="hidden xl:block">
            <UserDropdown variant="settings" />
          </div>

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

        {isModuleMenuOpen ? (
          <>
            <div
              className="fixed inset-0 top-[58px] z-[1048] bg-black/30 backdrop-blur-sm lg:hidden"
              onClick={() => setModuleMenuOpen(false)}
            />

            <div className="fixed right-0 top-[58px] z-[1050] flex h-[calc(100dvh-58px)] w-[240px] flex-col bg-white shadow-[-8px_0_32px_rgba(15,23,42,0.18)] md:w-[260px] xl:hidden">
              <div className="shrink-0 bg-gradient-to-r from-[#ee1c23] to-[#ff6a00] px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                  Welcome back
                </p>
                <p className="mt-1 text-[17px] font-extrabold capitalize leading-tight text-white">
                  {user?.username || user?.user_name || "User"}
                </p>
                <p className="mt-0.5 text-xs text-white/60">
                  {user?.email_id || user?.role || "Authenticated user"}
                </p>
              </div>

              <div className="shrink-0 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ee1c23]">
                  Module Navigation
                </p>
                <p className="text-[13px] font-semibold leading-tight text-[#334155]">
                  Select Module
                </p>
              </div>

              <nav
                className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:bg-[#e2e8f0]
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar]:w-1"
              >
                {visibleNavItems.map((item) => {
                  const isActive = item.key === activeNavKey;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-all ${isActive
                        ? "bg-[#ee1c23] font-bold text-white shadow-[0_4px_14px_rgba(238,28,35,0.30)]"
                        : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                        }`}
                    >
                      <span>{item.label}</span>
                      {isActive ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-white/80" />
                      ) : null}
                    </button>
                  );
                })}
              </nav>

              <div className="shrink-0 border-t border-[#e2e8f0] bg-white px-2 py-2">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setModuleMenuOpen(false);
                  }}
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
      </div>
    </header>
  );
};

export default AppHeader;
