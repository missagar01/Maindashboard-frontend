import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router";
import { Toaster } from "react-hot-toast";
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
import GatePassApprovals from "./pages/gatepass/pages/ApprovelPage";
import GatePassAllData from "./pages/gatepass/pages/AllData";
import GatePassClosePass from "./pages/gatepass/pages/ClosePass";
import GatePassRequestVisit from "./pages/gatepass/pages/RequestVisit";

// Store pages
import StoreDashboard from "./pages/store/pages/store/StoreDashboard";
import { StoreDashboardProvider } from "./pages/store/context/StoreDashboardContext";
import StoreIssue from "./pages/store/pages/store/StoreIssue";
import StoreIndentAll from "./pages/store/pages/store/IndentAll";
import StoreAdministration from "./pages/store/pages/store/Administration";
import StoreOutApproval from "./pages/store/pages/store/StoreOutApproval";
import StorePendingPOs from "./pages/store/pages/store/PendingPOs";
import StoreCreatePO from "./pages/store/pages/store/CreatePO";
import StoreApproveIndent from "./pages/store/pages/store/ApproveIndent";
import StoreApproveIndentData from "./pages/store/pages/store/ApprowIndentData";
import StoreApproveIndentGM from "./pages/store/pages/store/ApproveIndentGM";
import StoreCompletedItems from "./pages/store/pages/store/CompletedItems";
import StoreInventory from "./pages/store/pages/store/Inventory";
import StoreItemIssue from "./pages/store/pages/store/Itemissue";
import StoreReceiveItems from "./pages/store/pages/store/ReceiveItems";
import StoreUserIndent from "./pages/store/pages/store/UserIndent";
import StoreUserIndentList from "./pages/store/pages/store/UserIndentList";
import StoreUserIndentListIndent from "./pages/store/pages/store/UserIndentListIndent";
import StoreUserIndentListRequisition from "./pages/store/pages/store/UserIndentListRequisition";
import StorePendingIndents from "./pages/store/pages/store/PendingIndents";
import StoreVendorUpdate from "./pages/store/pages/store/VendorUpdate";
import StoreRateApproval from "./pages/store/pages/store/RateApproval";
import StoreRepairGatePass from "./pages/store/pages/store/RepairGatePass";
import StoreRepairGatePassHistory from "./pages/store/pages/store/RepairGatePassHistory";
import StoreRepairFollowup from "./pages/store/pages/store/RepairFollowup";
import StoreReturnable from "./pages/store/pages/store/ReturnablePage";
import StoreGRN from "./pages/store/pages/store/StoreGRN";
import StoreGRNAdminApproval from "./pages/store/pages/store/StoreGRNAdminApproval";
import StoreGRNGMApproval from "./pages/store/pages/store/StoreGRNGMApproval";
import StoreGRNCloseBill from "./pages/store/pages/store/StoreGRNCloseBill";
import StoreErpIndent from "./pages/store/pages/store/ErpIndent";

// Document module pages
import DocumentDashboard from "./pages/document/pages/Dashboard";
import DocumentResourceManager from "./pages/document/pages/ResourceManager";
import DocumentAllDocuments from "./pages/document/pages/document/AllDocuments";
import DocumentRenewal from "./pages/document/pages/document/Renewal";
import DocumentShared from "./pages/document/pages/document/Shared";
import DocumentAllSubscriptions from "./pages/document/pages/subscription/AllSubscriptions";
import DocumentSubscriptionApproval from "./pages/document/pages/subscription/Approval";
import DocumentSubscriptionPayment from "./pages/document/pages/subscription/Payment";
import DocumentSubscriptionRenewal from "./pages/document/pages/subscription/Renewal";
import DocumentAllLoans from "./pages/document/pages/loan/AllLoans";
import DocumentLoanForeclosure from "./pages/document/pages/loan/Foreclosure";
import DocumentLoanNOC from "./pages/document/pages/loan/NOC";
import DocumentMaster from "./pages/document/pages/master/MasterPage";
import DocumentPaymentRequestForm from "./pages/document/pages/payment/RequestForm";
import DocumentPaymentApproval from "./pages/document/pages/payment/PaymentApproval";
import DocumentMakePayment from "./pages/document/pages/payment/MakePayment";
import DocumentTallyEntry from "./pages/document/pages/payment/TallyEntry";
import DocumentAccountTallyData from "./pages/document/pages/account/TallyData";
import DocumentAccountAudit from "./pages/document/pages/account/Audit";
import DocumentAccountRectify from "./pages/document/pages/account/Rectify";
import DocumentAccountBillFiled from "./pages/document/pages/account/BillFiled";

export default function App() {
  return (
    <>
      <Router>
        <Toaster position="top-right" />
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
            <Route path="/gatepass" element={<RouteGuard><Navigate to="/gatepass/visitor" replace /></RouteGuard>} />
            <Route path="/gatepass/visitor" element={<RouteGuard><Navigate to="/gatepass/approvals" replace /></RouteGuard>} />
            <Route path="/gatepass/approvals" element={<RouteGuard><GatePassApprovals /></RouteGuard>} />
            <Route path="/gatepass/approve" element={<RouteGuard><Navigate to="/gatepass/approvals" replace /></RouteGuard>} />
            <Route path="/gatepass/all-data" element={<RouteGuard><GatePassAllData /></RouteGuard>} />
            <Route path="/gatepass/request-visit" element={<RouteGuard><GatePassRequestVisit /></RouteGuard>} />
            <Route path="/gatepass/close" element={<RouteGuard><Navigate to="/gatepass/close-pass" replace /></RouteGuard>} />
            <Route path="/gatepass/close-pass" element={<RouteGuard><GatePassClosePass /></RouteGuard>} />

            {/* Store Routes — provider wraps ALL store pages so data persists across navigation */}
            <Route element={<StoreDashboardProvider><Outlet /></StoreDashboardProvider>}>
              <Route path="/store" element={<RouteGuard><Navigate to="/store/dashboard" replace /></RouteGuard>} />
              <Route path="/store/dashboard" element={<RouteGuard><StoreDashboard /></RouteGuard>} />
              <Route path="/store/store-issue" element={<RouteGuard><StoreIssue /></RouteGuard>} />
              <Route path="/store/indent" element={<RouteGuard><StoreIndentAll /></RouteGuard>} />
              <Route path="/store/administration" element={<RouteGuard><StoreAdministration /></RouteGuard>} />
              <Route path="/store/store-out-approval" element={<RouteGuard><StoreOutApproval /></RouteGuard>} />
              <Route path="/store/pending-pos" element={<RouteGuard><StorePendingPOs /></RouteGuard>} />
              <Route path="/store/create-po" element={<RouteGuard><StoreCreatePO /></RouteGuard>} />
              <Route path="/store/approve-indent" element={<RouteGuard><StoreApproveIndent /></RouteGuard>} />
              <Route path="/store/approve-indent-data" element={<RouteGuard><StoreApproveIndentData /></RouteGuard>} />
              <Route path="/store/approve-indent-gm" element={<RouteGuard><StoreApproveIndentGM /></RouteGuard>} />
              <Route path="/store/completed-items" element={<RouteGuard><StoreCompletedItems /></RouteGuard>} />
              <Route path="/store/inventory" element={<RouteGuard><StoreInventory /></RouteGuard>} />
              <Route path="/store/item-issue" element={<RouteGuard><StoreItemIssue /></RouteGuard>} />
              <Route path="/store/receive-items" element={<RouteGuard><StoreReceiveItems /></RouteGuard>} />
              <Route path="/store/user-indent" element={<RouteGuard><StoreUserIndent /></RouteGuard>} />
              <Route path="/store/user-indent-list" element={<RouteGuard><StoreUserIndentList /></RouteGuard>} />
              <Route path="/store/user-indent-list-indent" element={<RouteGuard><StoreUserIndentListIndent /></RouteGuard>} />
              <Route path="/store/user-requisition" element={<RouteGuard><StoreUserIndentListRequisition /></RouteGuard>} />
              <Route path="/store/pending-indents" element={<RouteGuard><StorePendingIndents /></RouteGuard>} />
              <Route path="/store/vendor-update" element={<RouteGuard><StoreVendorUpdate /></RouteGuard>} />
              <Route path="/store/rate-approval" element={<RouteGuard><StoreRateApproval /></RouteGuard>} />
              <Route path="/store/repair-gate-pass" element={<RouteGuard><StoreRepairGatePass /></RouteGuard>} />
              <Route path="/store/repair-gate-pass/history" element={<RouteGuard><StoreRepairGatePassHistory /></RouteGuard>} />
              <Route path="/store/repair-followup" element={<RouteGuard><StoreRepairFollowup /></RouteGuard>} />
              <Route path="/store/returnable" element={<RouteGuard><StoreReturnable /></RouteGuard>} />
              <Route path="/store/store-grn" element={<RouteGuard><StoreGRN /></RouteGuard>} />
              <Route path="/store/store-grn-admin" element={<RouteGuard><StoreGRNAdminApproval /></RouteGuard>} />
              <Route path="/store/store-grn-gm" element={<RouteGuard><StoreGRNGMApproval /></RouteGuard>} />
              <Route path="/store/store-grn-close" element={<RouteGuard><StoreGRNCloseBill /></RouteGuard>} />
              <Route path="/store/erp-indent" element={<RouteGuard><StoreErpIndent /></RouteGuard>} />
            </Route>

            {/* Document Routes */}
            <Route path="/document" element={<RouteGuard><DocumentDashboard /></RouteGuard>} />
            <Route path="/document/dashboard" element={<RouteGuard><DocumentDashboard /></RouteGuard>} />
            <Route path="/document/all" element={<RouteGuard><DocumentAllDocuments /></RouteGuard>} />
            <Route path="/document/renewal" element={<RouteGuard><DocumentRenewal /></RouteGuard>} />
            <Route path="/document/shared" element={<RouteGuard><DocumentShared /></RouteGuard>} />
            <Route path="/resource-manager" element={<RouteGuard><DocumentResourceManager /></RouteGuard>} />

            <Route path="/subscription" element={<RouteGuard><Navigate to="/subscription/all" replace /></RouteGuard>} />
            <Route path="/subscription/all" element={<RouteGuard><DocumentAllSubscriptions /></RouteGuard>} />
            <Route path="/subscription/approval" element={<RouteGuard><DocumentSubscriptionApproval /></RouteGuard>} />
            <Route path="/subscription/payment" element={<RouteGuard><DocumentSubscriptionPayment /></RouteGuard>} />
            <Route path="/subscription/renewal" element={<RouteGuard><DocumentSubscriptionRenewal /></RouteGuard>} />

            <Route path="/loan" element={<RouteGuard><Navigate to="/loan/all" replace /></RouteGuard>} />
            <Route path="/loan/all" element={<RouteGuard><DocumentAllLoans /></RouteGuard>} />
            <Route path="/loan/foreclosure" element={<RouteGuard><DocumentLoanForeclosure /></RouteGuard>} />
            <Route path="/loan/noc" element={<RouteGuard><DocumentLoanNOC /></RouteGuard>} />

            <Route path="/payment" element={<RouteGuard><Navigate to="/payment/request-form" replace /></RouteGuard>} />
            <Route path="/payment/request-form" element={<RouteGuard><DocumentPaymentRequestForm /></RouteGuard>} />
            <Route path="/payment/approval" element={<RouteGuard><DocumentPaymentApproval /></RouteGuard>} />
            <Route path="/payment/make-payment" element={<RouteGuard><DocumentMakePayment /></RouteGuard>} />
            <Route path="/payment/tally-entry" element={<RouteGuard><DocumentTallyEntry /></RouteGuard>} />

            <Route path="/account" element={<RouteGuard><Navigate to="/account/tally-data" replace /></RouteGuard>} />
            <Route path="/account/tally-data" element={<RouteGuard><DocumentAccountTallyData /></RouteGuard>} />
            <Route path="/account/audit" element={<RouteGuard><DocumentAccountAudit /></RouteGuard>} />
            <Route path="/account/rectify" element={<RouteGuard><DocumentAccountRectify /></RouteGuard>} />
            <Route path="/account/bill-filed" element={<RouteGuard><DocumentAccountBillFiled /></RouteGuard>} />

            <Route path="/master" element={<RouteGuard><DocumentMaster /></RouteGuard>} />
          </Route>

          {/* Catch all - redirect to login if not authenticated, otherwise home */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </>
  );
}

