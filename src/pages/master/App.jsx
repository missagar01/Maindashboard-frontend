"use client";

import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/Dashboard";
import { storage } from "./utils/storage";
import { isTokenExpired } from "./utils/jwtUtils";

const ProtectedRoute = ({ children }) => {
  const username = storage.get("user-name");
  const token = storage.get("token");

  // Not logged in or token expired → go login
  if (!username || !token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ✔ ANY LOGGED-IN USER CAN ACCESS THIS */}
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/admin/*" element={<Navigate to="/dashboard/admin" replace />} />

    </Routes>
  );
}

export default App;
