import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // For public routes (like login), don't show loading spinner
  // Just show the page immediately - we only need to redirect if already authenticated

  // If still loading, show the public page (login form will be visible)
  // Once loaded, if authenticated, redirect to dashboard
  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Show the public route (login page) - no loading spinner for public routes
  return <>{children}</>;
};

export default PublicRoute;

