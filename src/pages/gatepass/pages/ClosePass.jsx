import React, { useState, useEffect, useCallback } from 'react';
import { fetchGatePassesApi, closeGatePassApi } from '../../../api/gatepass/closePassApi';
import { formatDateIN, formatTimeIN } from "../utils/dateUtils";
import { useAuth } from "../../../context/AuthContext";
import {
  RefreshCw,
  DoorOpen,
  DoorClosed,
  AlertCircle,
  Phone,
  UserCheck,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  ClipboardList,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { resolveUploadedFileUrl } from "../../../utils/fileUrl";

const GatePassClosure = () => {
  const { user } = useAuth();
  // ... state and effects ...
  const [activeTab, setActiveTab] = useState("pending")
  const [pendingGatePasses, setPendingGatePasses] = useState([])
  const [historyGatePasses, setHistoryGatePasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState({ show: false, message: "", type: "" })
  const [closingPasses, setClosingPasses] = useState(new Set())
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const username = user?.user_name || user?.username || "";
  const isAdmin = String(user?.role || user?.userType || "").toLowerCase().includes("admin");


  const fetchGatePassData = useCallback(async () => {
    if (!user) {
      setPendingGatePasses([]);
      setHistoryGatePasses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetchGatePassesApi(username, true);
      const rows = res.data.data;

      const pending = rows.filter(
        (r) => !r.gate_pass_closed
      );

      const history = rows.filter(
        (r) => r.gate_pass_closed
      );

      setPendingGatePasses(pending);
      setHistoryGatePasses(history);

    } catch (err) {
      setError("Failed to load gate passes");
      setPendingGatePasses([]);
      setHistoryGatePasses([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, username]);

  useEffect(() => {
    setCurrentPage(1); // Reset page when changing tabs
    fetchGatePassData()
  }, [fetchGatePassData, activeTab])

  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" })
    }, 4000)
  }

  const handleCloseGatePass = async (id) => {
    if (!username && !isAdmin) {
      showToast("Please login again", "error");
      return;
    }

    setClosingPasses(prev => new Set([...prev, id]));

    try {
      await closeGatePassApi(id, username, username, isAdmin);

      showToast("Gate pass closed successfully", "success");
      fetchGatePassData();

    } catch (err) {
      showToast("Failed to close gate pass", "error");
    } finally {
      setClosingPasses(prev => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };


  const allDataForTab = activeTab === "pending" ? pendingGatePasses : historyGatePasses;
  const totalPages = Math.ceil(allDataForTab.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = allDataForTab.slice(startIndex, endIndex);

  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-8 border-t border-gray-100">
        <div className="text-sm text-gray-500 order-2 sm:order-1">
          Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{" "}
          <span className="font-semibold text-gray-900">
            {Math.min(endIndex, allDataForTab.length)}
          </span>{" "}
          of <span className="font-semibold text-gray-900">{allDataForTab.length}</span> results
        </div>
        <div className="flex items-center gap-2 order-1 sm:order-2">
          <span className="text-xs text-gray-500 mr-2 hidden xs:inline">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-white transition-colors bg-white shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center px-3 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 xs:hidden">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-white transition-colors bg-white shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleRefresh = () => {
    fetchGatePassData()
  }

  const getImageUrl = (image) => {
    return resolveUploadedFileUrl(image) || "/user.png";
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage("");
  };


  return (
    <>
      <div className="space-y-6">
        {/* Header with Refresh Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Close Gate Pass</h1>
            <p className="text-gray-600 mt-1">Manage and close active visitor passes</p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center justify-center w-10 h-10 bg-white text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-1 flex gap-1">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2 text-sm font-medium ${activeTab === "pending"
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50"
              }`}
          >
            <DoorOpen className="h-4 w-4" />
            Pending ({pendingGatePasses.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2 text-sm font-medium ${activeTab === "history"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50"
              }`}
          >
            <DoorClosed className="h-4 w-4" />
            History ({historyGatePasses.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 text-sm font-medium">Loading gate passes...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center shadow-sm">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium mb-3">{error}</p>
            <button
              onClick={fetchGatePassData}
              className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        ) : currentData.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <DoorClosed className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">
              {activeTab === "pending" ? "No pending gate passes" : "No history records"}
            </h3>
            <p className="text-gray-500 text-sm">
              {activeTab === "pending" ? "All visitors have checked out" : "No completed gate passes found"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentData.map((gatePass) => {
                const isClosing = closingPasses.has(gatePass.id)

                return (
                  <div
                    key={gatePass.id}
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all duration-300 relative group overflow-hidden ${isClosing ? 'opacity-70 ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md hover:border-blue-300'
                      }`}
                  >
                    {/* Status Overlay for closing */}
                    {isClosing && (
                      <div className="absolute inset-0 z-10 bg-white/20 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-bold animate-pulse text-sm">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Closing Pass...
                        </div>
                      </div>
                    )}

                    {/* Top Bar */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1 bg-gray-900 text-gray-100 text-[10px] uppercase tracking-wider font-bold rounded-md">
                          SRM-{gatePass.id}
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${gatePass.approval_status.toLowerCase() === "approved"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-red-100 text-red-700 border border-red-200"
                          }`}>
                          {gatePass.approval_status}
                        </div>
                      </div>

                      {activeTab === "pending" && !gatePass.gate_pass_closed && (
                        <button
                          onClick={() => handleCloseGatePass(gatePass.id)}
                          disabled={isClosing}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50"
                        >
                          <DoorClosed className="h-3.5 w-3.5" />
                          Close Pass
                        </button>
                      )}
                    </div>

                    {/* Visitor Info Section */}
                    <div className="flex gap-4">
                      <div
                        className="w-24 h-24 rounded-xl border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 group-hover:border-blue-200 transition-all cursor-pointer relative group/img"
                        onClick={() => handleImageClick(getImageUrl(gatePass.visitor_photo))}
                      >
                        <img
                          src={getImageUrl(gatePass.visitor_photo)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                          alt={gatePass.visitor_name}
                          onError={(e) => { e.currentTarget.src = "/user.png"; }}
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity hidden lg:flex items-center justify-center pointer-events-none">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <h3 className="font-bold text-gray-900 text-lg leading-snug">
                          {gatePass.visitor_name}
                        </h3>

                        <div className="space-y-1.5">
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-blue-500 mr-2 flex-shrink-0" />
                            <span className="break-all">{gatePass.mobile_number}</span>
                          </div>
                          <div className="text-xs text-gray-400 italic ml-5">{gatePass.visitor_address}</div>

                          <div className="flex items-center text-sm text-gray-600">
                            <UserCheck className="h-3.5 w-3.5 text-indigo-500 mr-2 flex-shrink-0" />
                            <span className="font-medium text-gray-700">{gatePass.person_to_meet}</span>
                          </div>

                          <div className="flex items-start text-sm text-gray-500">
                            <div className="h-3.5 w-3.5 text-emerald-500 mr-2 flex-shrink-0 flex items-center justify-center text-[10px] mt-0.5">📍</div>
                            <span className="italic">Purpose: {gatePass.purpose_of_visit}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Stats Grid */}
                    <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-gray-400 font-bold uppercase tracking-tight text-[10px]">Visit Date</span>
                          <div className="flex items-center gap-1.5 text-gray-700 font-semibold text-xs">
                            <Calendar className="w-3.5 h-3.5 text-orange-500" />
                            {formatDateIN(gatePass.date_of_visit)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end text-right">
                          <span className="text-gray-400 font-bold uppercase tracking-tight text-[10px]">Entry Time</span>
                          <div className="flex items-center gap-1.5 text-gray-700 font-semibold text-xs">
                            {formatTimeIN(gatePass.time_of_entry)}
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                        </div>
                      </div>

                      {gatePass.visitor_out_time && (
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dashed border-gray-100">
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-bold uppercase tracking-tight text-[10px]">Exit Time</span>
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTimeIN(gatePass.visitor_out_time)}
                            </div>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <span className="text-gray-400 font-bold uppercase tracking-tight text-[10px]">Status</span>
                            <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Closed
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <PaginationControls />
          </>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold">Visitor Photo</h3>
              <button
                onClick={closeImageModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <img
                src={selectedImage}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
                alt="Enlarged visitor"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex justify-center animate-in slide-in-from-bottom-5 fade-in">
          <div className={`max-w-sm px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "success"
            ? "bg-emerald-500 border-emerald-400"
            : "bg-red-500 border-red-400"
            } text-white`}>
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default GatePassClosure
