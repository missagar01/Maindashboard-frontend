import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteGuard from "./components/RouteGuard";
import PublicRoute from "./components/PublicRoute";
import Login from "./pages/Login";
import Home from "./pages/Dashboard/Home";
import Calendar from "./pages/Calendar";
import Blank from "./pages/Blank";
import UserProfiles from "./pages/UserProfiles";

// BatchCode pages
import HotCoil from "./pages/BatchCode/HotCoil";
import QCLab from "./pages/BatchCode/QC-Lab";
import SMSRegister from "./pages/BatchCode/SMSRegister";
import Recoiler from "./pages/BatchCode/Recoiler";
import PipeMill from "./pages/BatchCode/PipeMill";
import Laddel from "./pages/BatchCode/Laddel";
import Tundis from "./pages/BatchCode/Tundis";

// Lead-to-Order pages
import Leads from "./pages/LeadToOrder/Leads";
import FollowUp from "./pages/LeadToOrder/FollowUp";
import NewFollowUp from "./pages/LeadToOrder/NewFollowUp";
import CallTracker from "./pages/LeadToOrder/CallTracker";
import NewCallTracker from "./pages/LeadToOrder/NewCallTracker";
import Quotation from "./pages/LeadToOrder/Quotation/Quotation";
import Settings from "./pages/LeadToOrder/Settings";

// O2D pages
import { DashboardView as O2DDashboard } from "./pages/O2D/dashboard-view";
import { OrdersView as O2DOrders } from "./pages/O2D/order-view";
import { PendingVehicles as O2DProcess } from "./pages/O2D/pendding-vehicle";
import EnquiryView from "./pages/O2D/enq-view";
import EnqList from "./pages/O2D/enq-list";


import CustomersPage from "./pages/O2D/CustomersPage";
import FollowUpsPage from "./pages/O2D/FollowUpsPage";

// HRFMS pages
import HRFMSDashboard from "./pages/hrfms/pages/Dashboard";
import HRFMSMyProfile from "./pages/hrfms/pages/MyProfile";
import HRFMSLeaveRequest from "./pages/hrfms/pages/LeaveRequest";
import HRFMSLeaveManagerApproval from "./pages/hrfms/pages/LeaveManagerApproval";
import HRFMSLeaveHrApproval from "./pages/hrfms/pages/LeaveHrApproval";
import HRFMSCommercialHeadApproval from "./pages/hrfms/pages/CommercialHeadApproval";
import HRFMSEmployeeDetails from "./pages/hrfms/pages/EmployeeDetailsPage";
import HRFMSRequestCreate from "./pages/hrfms/pages/RequestCreate";
import HRFMSTicketCreate from "./pages/hrfms/pages/TicketCreate";
import HRFMSTravelStatus from "./pages/hrfms/pages/TravelStatus";
import HRFMSResumeCreate from "./pages/hrfms/pages/ResumeCreate";
import HRFMSResumeForm from "./pages/hrfms/pages/ResumeForm";
import HRFMSResumeRequest from "./pages/hrfms/pages/ResumeRequest";
import HRFMSResumeList from "./pages/hrfms/pages/ResumeList";
import HRFMSCandidateStatus from "./pages/hrfms/pages/CandidateStatusPage";
import HRFMSSelectedCandidate from "./pages/hrfms/pages/SelectedCondidate";
import HRFMSPlantVisitor from "./pages/hrfms/pages/PlantVisitor";
import HRFMSPlantVisitorList from "./pages/hrfms/pages/PlantVisitorList";

export default function App() {
  return (
    <>
      <Router>
        <Routes>
          {/* Public routes - Login page */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Main Dashboard - Shows O2D, Lead to Order, or Batchcode based on tab param */}
            <Route path="/" element={<RouteGuard><Home /></RouteGuard>} />
            <Route path="/dashboard" element={<RouteGuard><Home /></RouteGuard>} />
            <Route path="/profile" element={<RouteGuard><UserProfiles /></RouteGuard>} />
            <Route path="/calendar" element={<RouteGuard><Calendar /></RouteGuard>} />
            <Route path="/blank" element={<RouteGuard><Blank /></RouteGuard>} />

            {/* BatchCode Routes */}
            <Route path="/batchcode/hot-coil" element={<RouteGuard><HotCoil /></RouteGuard>} />
            <Route path="/batchcode/qc-lab" element={<RouteGuard><QCLab /></RouteGuard>} />
            <Route path="/batchcode/sms-register" element={<RouteGuard><SMSRegister /></RouteGuard>} />
            <Route path="/batchcode/recoiler" element={<RouteGuard><Recoiler /></RouteGuard>} />
            <Route path="/batchcode/pipe-mill" element={<RouteGuard><PipeMill /></RouteGuard>} />
            <Route path="/batchcode/laddel" element={<RouteGuard><Laddel /></RouteGuard>} />
            <Route path="/batchcode/tundis" element={<RouteGuard><Tundis /></RouteGuard>} />

            {/* Lead-to-Order Routes */}
            <Route path="/lead-to-order/leads" element={<RouteGuard><Leads /></RouteGuard>} />
            <Route path="/lead-to-order/follow-up" element={<RouteGuard><FollowUp /></RouteGuard>} />
            <Route path="/lead-to-order/follow-up/new" element={<RouteGuard><NewFollowUp /></RouteGuard>} />
            <Route path="/lead-to-order/call-tracker" element={<RouteGuard><CallTracker /></RouteGuard>} />
            <Route path="/lead-to-order/call-tracker/new" element={<RouteGuard><NewCallTracker /></RouteGuard>} />
            <Route path="/lead-to-order/quotation" element={<RouteGuard><Quotation /></RouteGuard>} />
            <Route path="/lead-to-order/settings" element={<RouteGuard><Settings /></RouteGuard>} />

            {/* O2D Routes */}
            <Route path="/o2d/dashboard" element={<RouteGuard><O2DDashboard /></RouteGuard>} />
            <Route path="/o2d/orders" element={<RouteGuard><O2DOrders /></RouteGuard>} />
            <Route path="/o2d/process" element={<RouteGuard><O2DProcess /></RouteGuard>} />
            <Route path="/o2d/enquiry" element={<RouteGuard><EnquiryView /></RouteGuard>} />
            <Route path="/o2d/enquiry-list" element={<RouteGuard><EnqList /></RouteGuard>} />
            <Route path="/o2d/customers" element={<RouteGuard><CustomersPage /></RouteGuard>} />
            <Route path="/o2d/follow-ups" element={<RouteGuard><FollowUpsPage /></RouteGuard>} />

            {/* HRFMS Routes */}
            <Route path="/hrfms" element={<RouteGuard><Navigate to="/hrfms/dashboard" replace /></RouteGuard>} />
            <Route path="/hrfms/dashboard" element={<RouteGuard><HRFMSDashboard /></RouteGuard>} />
            <Route path="/hrfms/my-profile" element={<RouteGuard><HRFMSMyProfile /></RouteGuard>} />
            <Route path="/hrfms/leave-request" element={<RouteGuard><HRFMSLeaveRequest /></RouteGuard>} />
            <Route path="/hrfms/leave-approvals" element={<RouteGuard><HRFMSLeaveManagerApproval /></RouteGuard>} />
            <Route path="/hrfms/leave-hr-approvals" element={<RouteGuard><HRFMSLeaveHrApproval /></RouteGuard>} />
            <Route path="/hrfms/commercial-head-approval" element={<RouteGuard><HRFMSCommercialHeadApproval /></RouteGuard>} />
            <Route path="/hrfms/employee-details/:employeeId" element={<RouteGuard><HRFMSEmployeeDetails /></RouteGuard>} />
            <Route path="/hrfms/requests" element={<RouteGuard><HRFMSRequestCreate /></RouteGuard>} />
            <Route path="/hrfms/tickets" element={<RouteGuard><HRFMSTicketCreate /></RouteGuard>} />
            <Route path="/hrfms/travel-status" element={<RouteGuard><HRFMSTravelStatus /></RouteGuard>} />
            <Route path="/hrfms/resumes" element={<RouteGuard><HRFMSResumeCreate /></RouteGuard>} />
            <Route path="/hrfms/resume" element={<RouteGuard><HRFMSResumeCreate /></RouteGuard>} />
            <Route path="/hrfms/resume-form" element={<RouteGuard><HRFMSResumeForm /></RouteGuard>} />
            <Route path="/hrfms/resume-request" element={<RouteGuard><HRFMSResumeRequest /></RouteGuard>} />
            <Route path="/hrfms/resume-list" element={<RouteGuard><HRFMSResumeList /></RouteGuard>} />
            <Route path="/hrfms/condidate-list" element={<RouteGuard><HRFMSCandidateStatus /></RouteGuard>} />
            <Route path="/hrfms/condidate-select" element={<RouteGuard><HRFMSSelectedCandidate /></RouteGuard>} />
            <Route path="/hrfms/plant-visitor" element={<RouteGuard><HRFMSPlantVisitor /></RouteGuard>} />
            <Route path="/hrfms/plant-visitorlist" element={<RouteGuard><HRFMSPlantVisitorList /></RouteGuard>} />
          </Route>

          {/* Catch all - redirect to login if not authenticated, otherwise home */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </>
  );
}

