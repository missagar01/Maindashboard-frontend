import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import UserDashboard from './UserDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { user, pageAccess } = useAuth();

  const isAdmin = (user?.role || '').toLowerCase() === 'admin' || user?.Admin === 'Yes';

  if (!isAdmin) {
    const getNormalizedAccess = () => {
      if (!pageAccess) return [];
      if (Array.isArray(pageAccess)) return pageAccess;
      if (typeof pageAccess === 'string') {
        try {
          const parsed = JSON.parse(pageAccess);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return pageAccess.split(',').map(r => r.trim());
        }
      }
      return [];
    };

    const accessList = getNormalizedAccess();
    // Check for root path access which corresponds to Dashboard
    const hasAccess = accessList.some(
      (r) =>
        r === '/' ||
        r === 'Dashboard' ||
        r === 'HRFMS Dashboard' ||
        r === '/dashboard' ||
        r === '/hrfms/dashboard'
    );

    if (hasAccess) {
      return <UserDashboard />;
    } else {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Access Restricted</h2>
            <p className="text-gray-600">You do not have permission to view the Dashboard.</p>
          </div>
        </div>
      );
    }
  }

  return <AdminDashboard />;
};

export default Dashboard;