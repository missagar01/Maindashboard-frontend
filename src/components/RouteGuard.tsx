import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { getDefaultAllowedPath, isPathAllowed } from "../utils/accessControl";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredSystem?: string;
  requiredPage?: string;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null; // Avoid flashing a spinner during the single tick of sync auth initialization
  }

  const currentPath = location.pathname + location.search;
  const hasAccess = isPathAllowed(currentPath, user);

  if (!hasAccess) {
    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const safePath = getDefaultAllowedPath(user);

    // Avoid redirect loops when the fallback path cannot be resolved.
    if (safePath === currentPath || safePath === location.pathname) {
      return <Navigate to="/login" replace />;
    }

    return <Navigate to={safePath} replace />;
  }

  return <>{children}</>;
};

export default RouteGuard;
