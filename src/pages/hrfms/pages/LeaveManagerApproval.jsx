import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { getLeaveRequests, updateLeaveRequest } from '../../../api/hrfms/leaveRequestApi';
import { useAuth } from '../../../context/AuthContext';
import useAutoSync from '../hooks/useAutoSync';

const MANAGER_DEPARTMENT_MAPPING = {
  'deepakbhalla': ['SMS ELECTRICAL'],
  's05777': ['SMS ELECTRICAL'],
  'tejbahadur': ['SMS MAINTENANCE'],
  's00658': ['SMS MAINTENANCE'],
  'danveersingh': ['CCM ELECTRICAL', 'STRIP MILL ELECTRICAL'],
  's00510': ['CCM ELECTRICAL', 'STRIP MILL ELECTRICAL'],
  'shrirampatle': ['STRIP MILL MAINTENANCE'],
  's00061': ['STRIP MILL MAINTENANCE'],
  'sparshjha': ['STRIP MILL PRODUCTION'],
  's03942': ['STRIP MILL PRODUCTION'],
  'rohan': ['PIPE MILL ELECTRICAL'],
  's00037': ['PIPE MILL ELECTRICAL'],
  'dhanjiyadav': ['WORKSHOP'],
  's02725': ['WORKSHOP'],
  'anupbopche': ['PIPE MILL MAINTENANCE'],
  's00019': ['PIPE MILL MAINTENANCE'],
  'hulas': ['PIPE MILL PRODUCTION'],
  's00045': ['PIPE MILL PRODUCTION'],
  'mantuanandghosh': ['PIPE MILL PRODUCTION'],
  's04578': ['PIPE MILL PRODUCTION'],
  'kavisingh': ['PIPE MILL PRODUCTION'],
  's09505': ['PIPE MILL PRODUCTION'],
  'ravisingh': ['PIPE MILL PRODUCTION'],
  's00151': ['PIPE MILL PRODUCTION'],
  'grammohanrao': ['PIPE MILL PRODUCTION'],
  's00016': ['PIPE MILL PRODUCTION'],
  'mukeshpatle': ['LAB & QUALITY CONTROL'],
  's08547': ['LAB & QUALITY CONTROL'],
  'krameshkumar': ['PC'],
  's09578': ['PC'],
  'dcgoutam': ['DISPATCH', 'INWARD'],
  'dcgautam': ['DISPATCH', 'INWARD'],
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
  'amittiwari': ['STORE', 'PURCHASE', 'AUTOMATION', 'HR', 'ADMIN', 'CRUSHER', 'WB'],
};

const getStatusBadgeClass = (status) => {
  const normalizedStatus = (status || '').toString().trim().toLowerCase();

  if (normalizedStatus === 'approved') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (normalizedStatus === 'rejected') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-amber-100 text-amber-700';
};

const formatShortDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const inputClasses =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 min-h-[44px]';

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

  const effectiveDepartments = useMemo(() => {
    if (!user) {
      return [];
    }

    const userName = (user.user_name || user.employee_name || user.Name || '')
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '');
    const employeeId = (user.employee_id || '').toString().toLowerCase();

    if (MANAGER_DEPARTMENT_MAPPING[userName]) {
      return MANAGER_DEPARTMENT_MAPPING[userName];
    }

    if (employeeId && MANAGER_DEPARTMENT_MAPPING[employeeId]) {
      return MANAGER_DEPARTMENT_MAPPING[employeeId];
    }

    return [];
  }, [user]);

  const fetchData = useCallback(
    async (isAutoSync = false) => {
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
        const loggedInEmployeeId = normalizeValue(user?.employee_id);

        const filtered = data.filter((item) => {
          const itemDept = normalizeValue(item.department);
          if (!itemDept || normalizedDepartments.size === 0) {
            return false;
          }

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
    },
    [token, effectiveDepartments, user?.employee_id]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setApprovalModal((prev) => (prev ? { ...prev, [name]: value } : prev));
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
    <div className="min-h-screen overflow-x-hidden py-6 sm:py-10">
      <div className="mx-auto w-full max-w-none space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Leave Approval</p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Approve Leave Requests</h1>
            <p className="mt-1 text-sm text-gray-500">
              Approve pending leave requests for your department.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-6">
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
            {loading && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Loading leave requests...
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No leave requests found.
              </div>
            )}

            {!loading && items.length > 0 && (
              <>
                <div className="space-y-4 px-3 py-4 md:hidden">
                  {items.map((item) => {
                    const requestStatus = item.approved_by_status || item.request_status || 'Pending';
                    const hrApprovalStatus = item.hr_approval || 'Pending';
                    const normalizedApprovalStatus = (item.approved_by_status || '').toLowerCase();
                    const isFinalized =
                      normalizedApprovalStatus === 'approved' || normalizedApprovalStatus === 'rejected';

                    return (
                      <article
                        key={item.id}
                        className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {item.employee_name || item.user_name || '-'}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">{item.designation || '-'}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                                  requestStatus
                                )}`}
                              >
                                {requestStatus}
                              </span>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                                  hrApprovalStatus
                                )}`}
                              >
                                HR: {hrApprovalStatus}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Department
                              </p>
                              <p className="mt-1">{item.department || '-'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                  From
                                </p>
                                <p className="mt-1">{formatShortDate(item.from_date)}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                  To
                                </p>
                                <p className="mt-1">{formatShortDate(item.to_date)}</p>
                              </div>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Reason
                              </p>
                              <p className="mt-1 break-words">{item.reason || '-'}</p>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Mobile Number
                              </p>
                              <p className="mt-1 break-words">{item.mobilenumber || '-'}</p>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Urgent Mobile Number
                              </p>
                              <p className="mt-1 break-words">{item.urgent_mobilenumber || '-'}</p>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Created
                              </p>
                              <p className="mt-1">{formatDateTime(item.created_at)}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openApprovalModal(item)}
                            disabled={isFinalized}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
                          >
                            <Edit size={16} />
                            {isFinalized ? 'Finalized' : 'Edit / Approve'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden w-full overflow-x-auto overflow-y-auto md:block">
                  <div className="max-h-[65vh]">
                    <table className="min-w-full w-max text-left text-sm">
                      <thead className="sticky top-0 z-20 bg-gray-50 text-xs uppercase text-gray-500 shadow-sm">
                        <tr>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Employee</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Department</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">From</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">To</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Reason</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Mobile Number</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Urgent Mobile Number</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Status</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">HR Approval</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Created</th>
                          <th className="sticky top-0 bg-gray-50 px-2 py-3 text-right sm:px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item) => {
                          const approvalStatus = (item.approved_by_status || '').toLowerCase();
                          const isFinalized = approvalStatus === 'approved' || approvalStatus === 'rejected';

                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-2 py-3 sm:px-4">
                                <div className="font-medium text-gray-900 break-words">
                                  {item.employee_name || item.user_name || '-'}
                                </div>
                                <div className="text-xs text-gray-500 break-words">{item.designation || '-'}</div>
                              </td>
                              <td className="px-2 py-3 break-words sm:px-4">{item.department || '-'}</td>
                              <td className="px-2 py-3 whitespace-nowrap sm:px-4">
                                {formatShortDate(item.from_date)}
                              </td>
                              <td className="px-2 py-3 whitespace-nowrap sm:px-4">
                                {formatShortDate(item.to_date)}
                              </td>
                              <td className="max-w-xs px-2 py-3 break-words sm:px-4">{item.reason || '-'}</td>
                              <td className="max-w-xs px-2 py-3 break-words sm:px-4">{item.mobilenumber || '-'}</td>
                              <td className="max-w-xs px-2 py-3 break-words sm:px-4">
                                {item.urgent_mobilenumber || '-'}
                              </td>
                              <td className="px-2 py-3 sm:px-4">{item.approved_by_status || item.request_status || '-'}</td>
                              <td className="px-2 py-3 sm:px-4">{item.hr_approval || '-'}</td>
                              <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500 sm:px-4">
                                {formatDateTime(item.created_at)}
                              </td>
                              <td className="px-2 py-3 sm:px-4">
                                <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
                                  <button
                                    type="button"
                                    onClick={() => openApprovalModal(item)}
                                    disabled={isFinalized}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px] sm:w-auto md:min-h-0"
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
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {approvalModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900">Confirm Approval</p>
                  <p className="text-sm text-gray-500">Update the leave duration before submitting.</p>
                </div>
                <button
                  type="button"
                  onClick={closeApprovalModal}
                  className="text-gray-400 transition hover:text-gray-600"
                >
                  Close
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
                  className={inputClasses}
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
                  className={inputClasses}
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
                  className={`${inputClasses} mt-2 text-base text-gray-700 focus:border-emerald-500 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-gray-100`}
                >
                  <option value="Approved">Approve</option>
                  <option value="Rejected">Reject</option>
                </select>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
