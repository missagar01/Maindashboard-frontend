import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { isPathAllowed, getDefaultAllowedPath, hasStoreModuleAccess } from "../utils/accessControl";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredSystem?: string;
  requiredPage?: string;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const currentPath = location.pathname + location.search;
  const normalizedPath = location.pathname.split("?")[0].replace(/\/$/, "") || "/";

  // ── Store landing pages: allow /store and /store/dashboard for any store user ──
  // user-role with system_access="Store and Purchase" needs to reach /store/dashboard
  // as an entry point, even without explicit page_access for "Store Dashboard".
  // The sidebar intentionally hides "Dashboard" for these users — only shows
  // My Indent, Requisition, Create Indent + whatever page_access grants.
  const STORE_LANDING_PATHS = ["/store", "/store/dashboard"];
  if (user && STORE_LANDING_PATHS.includes(normalizedPath) && hasStoreModuleAccess(user)) {
    return <>{children}</>;
  }

  // Check if user has access to this route via isPathAllowed
  const hasAccess = isPathAllowed(currentPath, user);

  if (!hasAccess) {
    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const safePath = getDefaultAllowedPath(user);

    // Safety check: avoid redirect loop
    if (safePath === currentPath || safePath === location.pathname) {
      return <Navigate to="/login" replace />;
    }

    return <Navigate to={safePath} replace />;
  }

  return <>{children}</>;
};

export default RouteGuard;
