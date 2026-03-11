import { useAuth } from "../../../context/AuthContext"
import React, { useState, useEffect } from 'react';
import { fetchVisitsForApprovalApi, updateVisitApprovalApi } from '../../../api/gatepass/approvalApi'
import { formatDateIN, formatTimeIN } from "../utils/dateUtils";
import { User, Phone, Calendar, Clock, MapPin, Eye, XCircle, CheckCircle, LogOut, ChevronLeft, ChevronRight, Hash, UserCheck, Shield } from "lucide-react";

const VisitorManagement = () => {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState("Requests")
    const [isLoading, setIsLoading] = useState(false)
    const [toast, setToast] = useState({ show: false, message: "", type: "" })

    const [pendingVisits, setPendingVisits] = useState([])
    const [approvedVisits, setApprovedVisits] = useState([])
    const [loadingStates, setLoadingStates] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const username = user?.user_name || user?.username || "";


    useEffect(() => {
        setCurrentPage(1); // Reset to first page when changing tabs
        if (!username) return;
        if (activeTab === "Requests") {
            fetchPendingVisits()
        } else if (activeTab === "Approved") {
            fetchApprovedVisits()
        }
    }, [activeTab, username])

    const fetchPendingVisits = async () => {
        if (!username) return;

        setIsLoading(true);
        try {
            const res = await fetchVisitsForApprovalApi(username);

            if (res.success) {
                const pending = res.visits.filter(v => v.approval_status === "pending");
                setPendingVisits(
                    pending.map(v => ({
                        id: v.id,
                        visitorName: v.visitor_name,
                        mobileNumber: v.mobile_number,
                        visitorAddress: v.visitor_address,
                        photo: v.visitor_photo,
                        purposeOfVisit: v.purpose_of_visit,
                        personToMeet: v.person_to_meet,
                        dateOfVisit: v.date_of_visit,
                        timeOfVisit: v.time_of_entry,
                        status: v.approval_status
                    }))
                );
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to load pending visits", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchApprovedVisits = async () => {
        if (!username) return;

        setIsLoading(true);
        try {
            const res = await fetchVisitsForApprovalApi(username);

            if (res.success) {
                const approved = res.visits.filter(v =>
                    ["approved", "rejected"].includes(v.approval_status)
                );

                setApprovedVisits(
                    approved.map(v => ({
                        id: v.id,
                        visitorName: v.visitor_name,
                        mobileNumber: v.mobile_number,
                        visitorAddress: v.visitor_address,
                        photo: v.visitor_photo,
                        purposeOfVisit: v.purpose_of_visit,
                        personToMeet: v.person_to_meet,
                        dateOfVisit: v.date_of_visit,
                        timeOfVisit: v.time_of_entry,
                        status: v.approval_status,
                        approvedBy: v.approved_by
                    }))
                );
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to load visit history", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const updateVisitStatus = async (visitId, status) => {
        try {
            setLoadingStates(prev => ({ ...prev, [visitId]: status }));

            await updateVisitApprovalApi({
                id: visitId,
                status,
                approvedBy: username
            });

            showToast(`Visit ${status} successfully`, "success");

            await fetchPendingVisits();
            await fetchApprovedVisits();
        } catch (err) {
            console.error(err);
            showToast(`Failed to ${status} visit`, "error");
        } finally {
            setLoadingStates(prev => {
                const copy = { ...prev };
                delete copy[visitId];
                return copy;
            });
        }
    };


    const handleApproveVisit = (id) => {
        updateVisitStatus(id, "approved");
    };

    const handleRejectVisit = (id) => {
        if (window.confirm("Are you sure you want to reject this visit?")) {
            updateVisitStatus(id, "rejected");
        }
    };

    const showToast = (message, type) => {
        setToast({ show: true, message, type })
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000)
    }

    const VisitCard = ({ visit, showActions = false }) => {
        const [showImageModal, setShowImageModal] = useState(false);

        const getImageUrl = (image) => {
            if (!image) return "/user.png";

            if (typeof image === "string" && image.startsWith("http")) {
                return image;
            }

            return `${import.meta.env.VITE_API_BASE_URL}/uploads/${image}`;
        };



        const handleViewImage = () => {
            setShowImageModal(true);
        };

        const handleCloseModal = () => {
            setShowImageModal(false);
        };

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all hover:shadow-md mb-4">
                {/* Header Row - Clean Design */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-sm font-semibold border border-blue-200">
                            SRM-{visit.id}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${visit.status === 'pending'
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            : visit.status === 'approved'
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-gray-100 text-gray-800 border border-gray-200"
                            }`}>
                            {visit.status?.charAt(0).toUpperCase() + visit.status?.slice(1)}
                        </span>
                    </div>
                </div>

                {/* Main Content - App-like Layout */}
                <div className="flex flex-col-2 md:flex-row gap-4 mb-4">
                    {/* Left Side - Visitor Details */}
                    <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 text-lg">{visit.visitorName}</h3>
                            <div className="flex items-center text-sm text-gray-700">
                                <Phone className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                                <span className="font-medium">{visit.mobileNumber}</span>
                            </div>
                            <div className="text-xs text-gray-500 italic ml-6">{visit.visitorAddress || '-'}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-start text-sm text-gray-600">
                                <UserCheck className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="font-medium text-gray-800">Meeting: </span>
                                    <span>{visit.personToMeet}</span>
                                </div>
                            </div>

                            <div className="flex items-start text-sm text-gray-600">
                                <Calendar className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="font-medium text-gray-800">Date: </span>
                                    <span>{formatDateIN(visit.dateOfVisit)}</span>
                                </div>
                            </div>
                            <div className="flex items-start text-sm text-gray-600">
                                <Clock className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="font-medium text-gray-800">Time: </span>
                                    <span>{formatTimeIN(visit.timeOfVisit)}</span>
                                </div>
                            </div>

                            <div className="flex items-start text-sm text-gray-600 sm:col-span-2">
                                <MapPin className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="font-medium text-gray-800">Purpose: </span>
                                    <span>{visit.purposeOfVisit}</span>
                                </div>
                            </div>

                            {visit.approvedBy && (
                                <div className="flex items-center text-sm text-gray-500 italic sm:col-span-2 pt-1 border-t border-gray-50">
                                    <Shield className="h-4 w-4 text-gray-400 mr-2" />
                                    <span>Approved by: {visit.approvedBy}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side - Visitor Photo with Click to View */}
                    <div className="flex justify-center md:justify-end">
                        <div
                            className="w-28 h-28 bg-gray-50 rounded-2xl border-2 border-gray-200 overflow-hidden flex items-center justify-center shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-blue-300 relative group"
                            onClick={handleViewImage}
                            title="Click to view photo"
                        >
                            {getImageUrl ? (
                                <>
                                    <img
                                        src={getImageUrl(visit.photo)}
                                        alt={`${visit.visitorName}`}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = "/user.png";
                                        }}
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all hidden lg:flex items-center justify-center pointer-events-none">
                                        <Eye className="h-6 w-6 text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User size={40} className="text-gray-400" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons - Two Columns in One Row for Mobile */}
                {showActions && visit.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                        {/* Reject Button - Left Column */}
                        <button
                            onClick={() => handleRejectVisit(visit.id)}
                            disabled={loadingStates[visit.id]}
                            className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${loadingStates[visit.id] === 'rejected'
                                ? "bg-red-100 text-red-700 border-2 border-red-200 cursor-not-allowed"
                                : "bg-white text-red-600 border-2 border-red-200 hover:bg-red-50 hover:border-red-300"
                                }`}
                        >
                            {loadingStates[visit.id] === 'rejected' ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                                    Rejecting
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4" />
                                    Reject
                                </>
                            )}
                        </button>

                        {/* Approve Button - Right Column */}
                        <button
                            onClick={() => handleApproveVisit(visit.id)}
                            disabled={loadingStates[visit.id]}
                            className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${loadingStates[visit.id] === 'approved'
                                ? "bg-green-100 text-green-700 border-2 border-green-200 cursor-not-allowed"
                                : "bg-white text-green-600 border-2 border-green-200 hover:bg-green-50 hover:border-green-300"
                                }`}
                        >
                            {loadingStates[visit.id] === 'approved' ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                                    Approving
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Approve
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Image Modal */}
                {showImageModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                <h3 className="text-xl font-bold text-gray-800">{visit.visitorName}'s Photo</h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-6 flex justify-center">
                                {getImageUrl(visit.photo) ? (
                                    <img
                                        src={getImageUrl(visit.photo)}
                                        alt={visit.visitorName}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = "/user.png";
                                        }}
                                    />
                                ) : null}
                                <div className={`text-center py-12 ${getImageUrl(visit.photo) ? 'hidden' : 'block'}`}>
                                    <User className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 text-lg">No image available</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    };

    // Pagination Logic
    const currentVisits = activeTab === "Requests" ? pendingVisits : approvedVisits;
    const totalPages = Math.ceil(currentVisits.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedVisits = currentVisits.slice(startIndex, endIndex);

    const PaginationControls = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-8 border-t border-gray-100">
                <div className="text-sm text-gray-500 order-2 sm:order-1">
                    Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold text-gray-900">
                        {Math.min(endIndex, currentVisits.length)}
                    </span>{" "}
                    of <span className="font-semibold text-gray-900">{currentVisits.length}</span> results
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

    return (
        <>
            <div className="min-h-screen bg-gray-50 p-4 sm:p-6 overflow-y-auto relative pb-20">
                <div className="max-w-6xl mx-auto">
                    {/* Header with Welcome Message */}
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-sm">
                                    <UserCheck className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                        Welcome Sir
                                    </h1>
                                    <p className="text-gray-600 text-sm">Visitor Management Dashboard</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation - Two Columns in One Row for Mobile */}
                    <div className="mb-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
                            <div className="grid grid-cols-2 gap-2">
                                {/* Requests Tab - Left Column */}
                                <button
                                    onClick={() => setActiveTab("Requests")}
                                    className={`py-3 px-4 text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "Requests"
                                        ? "bg-blue-500 text-white shadow-sm"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <Clock className="w-5 h-5" />
                                    <span className="hidden xs:inline">Requests</span>
                                    <span className="bg-white/20 text-white/90 px-2 py-1 rounded-full text-xs font-bold min-w-[24px]">
                                        {pendingVisits.length}
                                    </span>
                                </button>

                                {/* History Tab - Right Column */}
                                <button
                                    onClick={() => setActiveTab("Approved")}
                                    className={`py-3 px-4 text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "Approved"
                                        ? "bg-green-500 text-white shadow-sm"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="hidden xs:inline">History</span>
                                    <span className="bg-white/20 text-white/90 px-2 py-1 rounded-full text-xs font-bold min-w-[24px]">
                                        {approvedVisits.length}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-4">
                        {activeTab === "Requests" && (
                            <div>
                                {isLoading ? (
                                    <div className="flex justify-center items-center py-8">
                                        <div className="flex items-center gap-2 text-blue-600 text-sm">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                            <span>Loading visitors...</span>
                                        </div>
                                    </div>
                                ) : pendingVisits.length > 0 ? (
                                    <>
                                        <div className="space-y-4">
                                            {paginatedVisits.map(visit => (
                                                <VisitCard
                                                    key={visit.id}
                                                    visit={visit}
                                                    showActions={true}
                                                />
                                            ))}
                                        </div>
                                        <PaginationControls />
                                    </>
                                ) : (
                                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
                                        <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Visit Pending</h3>
                                        <p className="text-gray-500">Approved and rejected visits will appear here.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* History Tab */}
                        {activeTab === "Approved" && (
                            <div>
                                {approvedVisits.length > 0 ? (
                                    <>
                                        <div className="space-y-4">
                                            {paginatedVisits.map(visit => (
                                                <VisitCard
                                                    key={visit.id}
                                                    visit={visit}
                                                    showActions={false}
                                                />
                                            ))}
                                        </div>
                                        <PaginationControls />
                                    </>
                                ) : (
                                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
                                        <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Visit History</h3>
                                        <p className="text-gray-500">Approved and rejected visits will appear here.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Toast Notification */}
                {toast.show && (
                    <div className="fixed top-4 sm:top-6 right-4 sm:right-6 left-4 sm:left-auto mx-auto sm:mx-0 max-w-sm z-50">
                        <div className={`px-4 py-3 rounded-xl shadow-lg ${toast.type === "success" ? "bg-green-500" : "bg-red-500"
                            } text-white`}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{toast.message}</span>
                                <button
                                    onClick={() => setToast({ show: false, message: "", type: "" })}
                                    className="text-white ml-3 p-1 rounded hover:bg-white/20"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default VisitorManagement
