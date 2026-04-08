"use client";
import { useEffect, useState } from "react";
import { fetchAllVisitorsApi } from "../../../api/gatepass/allVisitors.js";
import { User, Eye, Search, Filter, Download, ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Phone, UserCheck, Shield } from "lucide-react";
import { formatDateIN, formatTimeIN } from "../utils/dateUtils";
import {
    fetchPersonsApi,
    createPersonApi,
    updatePersonApi,
    deletePersonApi
} from "../../../api/gatepass/personApi";
import { resolveUploadedFileUrl } from "../../../utils/fileUrl";

const AdminAllVisits = () => {
    // ... state and effects ...
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [showPersonModal, setShowPersonModal] = useState(false);
    const [persons, setPersons] = useState([]);
    const [personForm, setPersonForm] = useState({ personToMeet: "", phone: "" });
    const [editingId, setEditingId] = useState(null);

    const itemsPerPage = 20;

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetchAllVisitorsApi();
            const rows = res.data?.data || res.data || [];
            setData(Array.isArray(rows) ? rows : []);
        } catch (err) {
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const loadPersons = async () => {
        const res = await fetchPersonsApi();
        setPersons(res.data || []);
    };

    useEffect(() => {
        if (showPersonModal) {
            loadPersons();
        }
    }, [showPersonModal]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);


    const handleImageClick = (imageUrl) => {
        setSelectedImage(imageUrl);
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setShowImageModal(false);
        setSelectedImage("");
    };

    const filteredData = data.filter(item =>
        Object.values(item).some(value =>
            value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    if (loading) {
        return (
            <>
                <div className="min-h-[400px] flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            </>
        );
    }

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Approved</span>;
            case 'pending':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Pending</span>;
            case 'rejected':
                return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Rejected</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">{status || 'Unknown'}</span>;
        }
    };

    const getImageUrl = (image) => {
        return resolveUploadedFileUrl(image) || "/user.png";
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">All Visitors</h1>
                        <p className="text-gray-600 mt-1">Total {filteredData.length} visitors found</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search visitors..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                        <button
                            onClick={() => setShowPersonModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md transition-all"
                        >
                            + Manage Persons
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm text-gray-500 mb-1">Total Visitors</div>
                        <div className="text-2xl font-bold text-gray-900">{filteredData.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm text-gray-500 mb-1">Pending</div>
                        <div className="text-2xl font-bold text-yellow-600">
                            {filteredData.filter(v => v.approval_status?.toLowerCase() === 'pending').length}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm text-gray-500 mb-1">Approved</div>
                        <div className="text-2xl font-bold text-green-600">
                            {filteredData.filter(v => v.approval_status?.toLowerCase() === 'approved').length}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm text-gray-500 mb-1">Rejected</div>
                        <div className="text-2xl font-bold text-red-600">
                            {filteredData.filter(v => v.approval_status?.toLowerCase()?.includes('rejected')).length}
                        </div>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Visitor Details</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Address</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Visit Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Approval Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Timestamps</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentData.map((v) => (
                                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div
                                                    className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden cursor-pointer mr-4 relative group"
                                                    onClick={() => handleImageClick(getImageUrl(v.visitor_photo))}
                                                >
                                                    <img
                                                        src={getImageUrl(v.visitor_photo)}
                                                        alt={v.visitor_name}
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = "/user.png";
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex items-center justify-center pointer-events-none">
                                                        <Eye className="w-5 h-5 text-white" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{v.visitor_name}</div>
                                                    <div className="text-sm text-gray-600">{v.mobile_number}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{v.visitor_address || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="font-medium text-gray-900">Meeting: {v.person_to_meet}</div>
                                                <div className="text-gray-600">Date: {formatDateIN(v.date_of_visit)}</div>
                                                <div className="text-gray-500 text-xs">Purpose: {v.purpose_of_visit || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(v.approval_status)}
                                            {v.approved_by && (
                                                <div className="mt-1 text-xs text-gray-500">By: {v.approved_by}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div>Entry: {formatTimeIN(v.time_of_entry)}</div>
                                            <div>Exit: {formatTimeIN(v.visitor_out_time)}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                            <div className="text-sm text-gray-700">
                                Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 mr-2 hidden sm:inline">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-white transition-colors"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <div className="flex items-center px-3 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 sm:hidden">
                                        {currentPage} / {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-white transition-colors"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile View */}
                <div className="lg:hidden space-y-4">
                    {currentData.map((v) => (
                        <div key={v.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 hover:border-blue-300 transition-all">
                            <div className="flex items-center gap-4 pb-3 border-b border-gray-50">
                                <div
                                    className="relative group cursor-pointer shadow-sm"
                                    onClick={() => handleImageClick(getImageUrl(v.visitor_photo))}
                                >
                                    <img
                                        src={getImageUrl(v.visitor_photo)}
                                        className="w-16 h-16 rounded-xl object-cover border border-gray-100"
                                        onError={(e) => { e.target.src = "/user.png"; }}
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity hidden lg:flex items-center justify-center pointer-events-none">
                                        <Eye className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-base leading-snug">{v.visitor_name}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> {v.mobile_number}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-1 italic">{v.visitor_address}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        {getStatusBadge(v.approval_status)}
                                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500">#{v.id}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <UserCheck className="w-4 h-4 text-purple-500 mt-0.5" />
                                    <div>
                                        <p className="text-gray-400 text-[10px] uppercase font-bold">Meeting Person</p>
                                        <p className="font-medium text-gray-800">{v.person_to_meet}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-4 h-4 text-orange-500 mt-0.5" />
                                        <div>
                                            <p className="text-gray-400 text-[10px] uppercase font-bold">Date</p>
                                            <p className="font-medium text-gray-800">{formatDateIN(v.date_of_visit)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-emerald-500 mt-0.5" />
                                        <div>
                                            <p className="text-gray-400 text-[10px] uppercase font-bold">Purpose</p>
                                            <p className="font-medium text-gray-800">{v.purpose_of_visit || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 grid grid-cols-2 gap-3 border-t border-gray-50">
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-4 h-4 text-blue-500 mt-0.5" />
                                        <div>
                                            <p className="text-gray-400 text-[10px] uppercase font-bold">Entry Time</p>
                                            <p className="font-medium text-gray-700">{formatTimeIN(v.time_of_entry)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-4 h-4 text-red-500 mt-0.5" />
                                        <div>
                                            <p className="text-gray-400 text-[10px] uppercase font-bold">Exit Time</p>
                                            <p className="font-medium text-gray-700">{formatTimeIN(v.visitor_out_time)}</p>
                                        </div>
                                    </div>
                                </div>

                                {v.approved_by && (
                                    <div className="pt-3 border-t border-gray-50 flex items-center gap-3">
                                        <Shield className="w-4 h-4 text-gray-400" />
                                        <p className="text-xs text-gray-500 italic">Approved by: <span className="font-semibold">{v.approved_by}</span></p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {/* Mobile Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mt-4">
                            <span className="text-xs font-medium text-gray-600">
                                {currentPage} of {totalPages} pages
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 bg-white rounded-lg border border-gray-200 disabled:opacity-50 shadow-sm"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 bg-white rounded-lg border border-gray-200 disabled:opacity-50 shadow-sm"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals... */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-bold">Visitor Photo</h3>
                            <button onClick={closeImageModal} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
                        </div>
                        <div className="p-4 flex justify-center">
                            <img src={selectedImage} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
                        </div>
                    </div>
                </div>
            )}

            {showPersonModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Manage Meeting Persons</h2>
                            <button onClick={() => setShowPersonModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                        </div>

                        <div className="mb-6 p-4 bg-blue-50 rounded-xl flex flex-col md:flex-row gap-3">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] uppercase font-bold text-blue-400 ml-1">FullName</label>
                                <input
                                    placeholder="FullName"
                                    value={personForm.personToMeet}
                                    onChange={(e) => setPersonForm({ ...personForm, personToMeet: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] uppercase font-bold text-blue-400 ml-1">Phone</label>
                                <input
                                    placeholder="Phone"
                                    value={personForm.phone}
                                    onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    if (editingId) await updatePersonApi(editingId, personForm);
                                    else await createPersonApi(personForm);
                                    setPersonForm({ personToMeet: "", phone: "" });
                                    setEditingId(null);
                                    loadPersons();
                                }}
                                className="md:mt-5 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md active:scale-95 transition-transform"
                            >
                                {editingId ? "Update" : "Add"}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {/* Desktop View */}
                            <div className="hidden sm:block">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50 h-10">
                                        <tr>
                                            <th className="text-left px-4 text-gray-600 font-bold text-xs uppercase">Name</th>
                                            <th className="text-left px-4 text-gray-600 font-bold text-xs uppercase">Phone</th>
                                            <th className="text-right px-4 text-gray-600 font-bold text-xs uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {persons.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50 h-12">
                                                <td className="px-4 font-medium">{p.person_to_meet}</td>
                                                <td className="px-4 text-gray-600">{p.phone}</td>
                                                <td className="px-4 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button 
                                                            onClick={() => { setEditingId(p.id); setPersonForm({ personToMeet: p.person_to_meet, phone: p.phone }); }} 
                                                            className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={async () => { if (confirm("Delete?")) { await deletePersonApi(p.id); loadPersons(); } }} 
                                                            className="text-red-600 hover:text-red-800 font-bold text-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="sm:hidden space-y-3">
                                {persons.map((p) => (
                                    <div key={p.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center group">
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{p.person_to_meet}</p>
                                            <p className="text-xs text-gray-500">{p.phone}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { setEditingId(p.id); setPersonForm({ personToMeet: p.person_to_meet, phone: p.phone }); }}
                                                className="p-2 bg-white text-blue-600 rounded-lg border border-blue-100 shadow-sm"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={async () => { if (confirm("Delete?")) { await deletePersonApi(p.id); loadPersons(); } }}
                                                className="p-2 bg-white text-red-600 rounded-lg border border-red-100 shadow-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {persons.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-400 italic">No persons added yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminAllVisits;
