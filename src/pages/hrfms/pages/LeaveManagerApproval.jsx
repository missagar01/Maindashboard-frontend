import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { getLeaveRequests, updateLeaveRequest } from '../../../api/hrfms/leaveRequestApi';
import { useAuth } from '../../../context/AuthContext';
import useAutoSync from '../hooks/useAutoSync';

const LeaveManagerApproval = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [actionSelections, setActionSelections] = useState({});
  const [approvalModal, setApprovalModal] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const normalizeValue = (value) =>
    (value || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const approverName = useMemo(
    () => user?.user_name || user?.employee_name || user?.Name || '',
    [user]
  );
  // Manager to Department Mapping based on the provided table
  // Includes user_name (normalized) and employee_id (lowercase) aliases
  const MANAGER_DEPARTMENT_MAPPING = {
    // SMS
    'deepakbhalla': ['SMS ELECTRICAL'],
    's05777': ['SMS ELECTRICAL'],
    'tejbahadur': ['SMS MAINTENANCE'],
    's00658': ['SMS MAINTENANCE'],

    // CCM & Strip Mill
    'danveersingh': ['CCM ELECTRICAL', 'STRIP MILL ELECTRICAL'],
    's00510': ['CCM ELECTRICAL', 'STRIP MILL ELECTRICAL'],
    'shrirampatle': ['STRIP MILL MAINTENANCE'],
    's00061': ['STRIP MILL MAINTENANCE'],
    'sparshjha': ['STRIP MILL PRODUCTION'],
    's03942': ['STRIP MILL PRODUCTION'],

    // Pipe Mill
    'rohan': ['PIPE MILL ELECTRICAL'],
    's00037': ['PIPE MILL ELECTRICAL'],
    'dhanjiyadav': ['WORKSHOP'],
    's02725': ['WORKSHOP'],
    'anupbopche': ['PIPE MILL MAINTENANCE'],
    's00019': ['PIPE MILL MAINTENANCE'],
    'hulas': ['PIPE MILL PRODUCTION'],
    's00045': ['PIPE MILL PRODUCTION'],
    'mantuanandghosh': ['PIPE MILL PRODUCTION'],
    's04578': ['PIPE MILL PRODUCTION'], // Assuming S04578 from image
    'kavisingh': ['PIPE MILL PRODUCTION'],
    's09505': ['PIPE MILL PRODUCTION'],
    'ravisingh': ['PIPE MILL PRODUCTION'],
    's00151': ['PIPE MILL PRODUCTION'],
    'grammohanrao': ['PIPE MILL PRODUCTION'],
    's00016': ['PIPE MILL PRODUCTION'],

    // Others
    'mukeshpatle': ['LAB & QUALITY CONTROL'],
    's08547': ['LAB & QUALITY CONTROL'],
    'krameshkumar': ['PC'],
    's09578': ['PC'],
    'dcgoutam': ['DISPATCH', 'INWARD'],
    'dcgautam': ['DISPATCH', 'INWARD'], // Spelling variation check
    's00006': ['DISPATCH', 'INWARD'],
    'anilmishra': ['CRM', 'MARKETING'],
    's00143': ['CRM', 'MARKETING'],
    'dineshbandhe': ['PROJECT'],
    's08377': ['PROJECT'],
    'ambikapandey': ['TRANSPORT'],
    's08472': ['TRANSPORT'],
    'jhaneshwarsahu': ['SECURITY'],
    's09698': ['SECURITY'],
    'manishkurrey': ['SECURITY'],
    's00256': ['SECURITY'],

    // Departments with Blank Manager -> HOD (Amit Tiwari) acts as Manager
    'amittiwari': ['STORE', 'PURCHASE', 'AUTOMATION', 'HR', 'ADMIN', 'CRUSHER', 'WB']
  };

  const effectiveDepartments = useMemo(() => {
    if (!user) return [];

    const userName = (user.user_name || user.employee_name || user.Name || '').toString().toLowerCase().replace(/\s+/g, '');
    const employeeId = (user.employee_id || '').toString().toLowerCase();

    // Check user_name match
    if (MANAGER_DEPARTMENT_MAPPING[userName]) {
      return MANAGER_DEPARTMENT_MAPPING[userName];
    }

    // Check employee_id match
    if (employeeId && MANAGER_DEPARTMENT_MAPPING[employeeId]) {
      return MANAGER_DEPARTMENT_MAPPING[employeeId];
    }

    return [];
  }, [user]);

  const canApprove = true;

  const fetchData = useCallback(async (isAutoSync = false) => {
    if (!token) {
      setItems([]);
      return;
    }


    if (!isAutoSync) {
      setLoading(true);
    }
    try {
      const response = await getLeaveRequests(token);
      const data = Array.isArray(response?.data) ? response.data : [];
      const normalizedDepartments = new Set(
        effectiveDepartments.map(normalizeValue).filter(Boolean)
      );

      // Get logged-in manager's employee_id to exclude their own requests
      const loggedInEmployeeId = normalizeValue(user?.employee_id);

      // Use exact match only for department filtering
      const filtered = data.filter((item) => {
        const itemDept = normalizeValue(item.department);
        if (!itemDept || normalizedDepartments.size === 0) {
          return false;
        }

        // Exclude the logged-in manager's own leave requests
        const itemEmployeeId = normalizeValue(item.employee_id);
        if (loggedInEmployeeId && itemEmployeeId && itemEmployeeId === loggedInEmployeeId) {
          return false;
        }

        const approvalStatus = normalizeValue(item.approved_by_status);
        if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
          return false;
        }
        const hrApprovalStatus = normalizeValue(item.hr_approval);
        if (hrApprovalStatus === 'approved' || hrApprovalStatus === 'rejected') {
          return false;
        }
        // Exact match only - no partial matching
        return normalizedDepartments.has(itemDept);
      });

      setItems(filtered);
      setActionSelections((prev) => {
        const next = { ...prev };
        filtered.forEach((item) => {
          if (!next[item.id]) {
            next[item.id] = 'Approved';
          }
        });
        return next;
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to load leave requests.');
    } finally {
      if (!isAutoSync) {
        setLoading(false);
      }
    }
  }, [token, effectiveDepartments, user?.employee_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enable auto-sync every 10 seconds
  useAutoSync(() => fetchData(true), 10000);

  const formatDateForInput = (value) => {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toISOString().split('T')[0];
  };

  const submitApproval = async ({ requestId, from_date, to_date }) => {
    if (!token) {
      toast.error('Please login again to approve.');
      return false;
    }
    const selectedStatus = actionSelections[requestId] || 'Approved';
    const approvalLabel = selectedStatus === 'Rejected' ? 'Rejected' : 'Approved';
    const payload = {
      approved_by: approverName || null,
      approved_by_status: approvalLabel,
      from_date: from_date || null,
      to_date: to_date || null,
    };
    try {
      const response = await updateLeaveRequest(requestId, payload, token);
      if (!response?.success) {
        toast.error(response?.message || 'Approval failed');
        return false;
      }
      toast.success(`Leave ${approvalLabel.toLowerCase()} successfully.`);
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error?.message || 'Approval failed');
      return false;
    }
  };

  const openApprovalModal = (item) => {
    if (!item) {
      return;
    }
    setApprovalModal({
      requestId: item.id,
      from_date: formatDateForInput(item.from_date),
      to_date: formatDateForInput(item.to_date),
    });
  };

  const closeApprovalModal = () => {
    setApprovalModal(null);
  };

  const handleModalFieldChange = (event) => {
    const { name, value } = event.target;
    setApprovalModal((prev) =>
      prev ? { ...prev, [name]: value } : prev
    );
  };

  const handleModalActionChange = (value) => {
    if (!approvalModal?.requestId) {
      return;
    }
    setActionSelections((prev) => ({
      ...prev,
      [approvalModal.requestId]: value,
    }));
  };

  const handleModalSubmit = async () => {
    if (!approvalModal?.requestId) {
      return;
    }
    setModalLoading(true);
    const success = await submitApproval(approvalModal);
    setModalLoading(false);
    if (success) {
      closeApprovalModal();
    }
  };

  return (
    <div className="min-h-screen py-6 sm:py-10">
      <div className="mx-auto w-full max-w-none space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Leave Approval</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Approve Leave Requests</h1>
            <p className="mt-1 text-sm text-gray-500">Approve pending leave requests for your department.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
            <div className="max-h-[65vh] overflow-x-auto overflow-y-auto">
              <table className="min-w-full w-full text-left text-sm hidden md:table">
                <thead className="sticky top-0 z-20 bg-gray-50 text-xs uppercase text-gray-500 shadow-sm">
                  <tr>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">Employee</th>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">Department</th>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">From</th>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">To</th>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">Reason</th>

                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">Mobile Number</th>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">Urgent Mobile Number</th>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">Status</th>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">HR Approval</th>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3">Created</th>
                    <th className="sticky top-0 bg-gray-50 px-2 sm:px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && (
                    <tr>
                      <td colSpan="11" className="px-4 py-8 text-center text-sm text-gray-500">
                        Loading leave requests...
                      </td>
                    </tr>
                  )}

                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan="11" className="px-4 py-8 text-center text-sm text-gray-500">
                        No leave requests found.
                      </td>
                    </tr>
                  )}

                  {!loading && items.map((item) => {
                    const approvalStatus = (item.approved_by_status || '').toLowerCase();
                    const isFinalized = approvalStatus === 'approved' || approvalStatus === 'rejected';
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-3">
                          <div className="font-medium text-gray-900 break-words">{item.employee_name || item.user_name || '-'}</div>
                          <div className="text-xs text-gray-500 break-words">{item.designation || '-'}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 break-words">{item.department || '-'}</td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap">{item.from_date ? new Date(item.from_date).toLocaleDateString() : '-'}</td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap">{item.to_date ? new Date(item.to_date).toLocaleDateString() : '-'}</td>
                        <td className="px-2 sm:px-4 py-3 break-words max-w-xs">{item.reason || '-'}</td>
                        <td className="px-2 sm:px-4 py-3 break-words max-w-xs">{item.mobilenumber || '-'}</td>
                        <td className="px-2 sm:px-4 py-3 break-words max-w-xs">{item.urgent_mobilenumber || '-'}</td>
                        <td className="px-2 sm:px-4 py-3">{item.approved_by_status || item.request_status || '-'}</td>
                        <td className="px-2 sm:px-4 py-3">{item.hr_approval || '-'}</td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {item.created_at ? new Date(item.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : '-'}
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">

                            <button
                              type="button"
                              onClick={() => openApprovalModal(item)}
                              disabled={isFinalized}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px] md:min-h-0"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {loading && <p className="text-center text-gray-500 py-4">Loading...</p>}
                {!loading && items.length === 0 && <p className="text-center text-gray-500 py-4">No requests found.</p>}
                {!loading && items.map((item) => {
                  const approvalStatus = (item.approved_by_status || '').toLowerCase();
                  const isFinalized = approvalStatus === 'approved' || approvalStatus === 'rejected';
                  return (
                    <div key={item.id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-900">{item.employee_name || item.user_name || '-'}</p>
                          <p className="text-xs text-gray-500">{item.designation || '-'}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                          approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {item.approved_by_status || 'Pending'}
                        </span>
                      </div>

                      <div className="text-sm space-y-1 mb-3">
                        <p><span className="text-gray-500 text-xs">Dept:</span> {item.department}</p>
                        <p><span className="text-gray-500 text-xs">Date:</span> {item.from_date ? new Date(item.from_date).toLocaleDateString() : '-'} - {item.to_date ? new Date(item.to_date).toLocaleDateString() : '-'}</p>
                        <p><span className="text-gray-500 text-xs">Reason:</span> {item.reason}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openApprovalModal(item)}
                        disabled={isFinalized}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
                      >
                        <Edit size={16} />
                        {isFinalized ? 'Finalized' : 'Edit / Approve'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {approvalModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">Confirm Approval</p>
                  <p className="text-sm text-gray-500">Update the leave duration before submitting.</p>
                </div>
                <button
                  type="button"
                  onClick={closeApprovalModal}
                  className="text-gray-400 transition hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 grid gap-4">
                <label className="text-sm font-medium text-gray-700" htmlFor="modal_from_date">
                  From Date
                </label>
                <input
                  id="modal_from_date"
                  name="from_date"
                  type="date"
                  value={approvalModal.from_date}
                  onChange={handleModalFieldChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 min-h-[44px]"
                />
                <label className="text-sm font-medium text-gray-700" htmlFor="modal_to_date">
                  To Date
                </label>
                <input
                  id="modal_to_date"
                  name="to_date"
                  type="date"
                  value={approvalModal.to_date}
                  onChange={handleModalFieldChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 min-h-[44px]"
                />
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700" htmlFor="modal_action">
                  Action
                </label>
                <select
                  id="modal_action"
                  value={actionSelections[approvalModal.requestId] || 'Approved'}
                  onChange={(event) => handleModalActionChange(event.target.value)}
                  disabled={modalLoading}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <option value="Approved">Approve</option>
                  <option value="Rejected">Reject</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeApprovalModal}
                  disabled={modalLoading}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleModalSubmit}
                  disabled={modalLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
                >
                  {modalLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagerApproval;
