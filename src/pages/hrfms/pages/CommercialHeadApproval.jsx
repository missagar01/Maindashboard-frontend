import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { getLeaveRequests, updateLeaveRequest } from '../../../api/hrfms/leaveRequestApi';
import { useAuth } from '../../../context/AuthContext';
import useAutoSync from '../hooks/useAutoSync';

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

const CommercialHeadApproval = () => {
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

  const HOD_DEPARTMENT_MAPPING = {
    ajitkumargupta: ['SMS ELECTRICAL', 'SMS MAINTENANCE', 'PROJECT'],
    shaileshchitre: [
      'CCM ELECTRICAL',
      'STRIP MILL ELECTRICAL',
      'STRIP MILL MAINTENANCE',
      'STRIP MILL PRODUCTION',
      'WORKSHOP',
    ],
    birbal: ['PIPE MILL ELECTRICAL', 'PIPE MILL MAINTENANCE', 'PIPE MILL PRODUCTION'],
    amittiwari: [
      'LAB & QUALITY CONTROL',
      'STORE',
      'PURCHASE',
      'PC',
      'AUTOMATION',
      'HR',
      'DISPATCH',
      'INWARD',
      'ADMIN',
      'CRM',
      'MARKETING',
      'CRUSHER',
      'TRANSPORT',
      'SECURITY',
      'WB',
    ],
  };

  const effectiveDepartments = useMemo(() => {
    if (!user) {
      return [];
    }

    const userName = (user.user_name || user.employee_name || user.Name || '')
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '');

    if (HOD_DEPARTMENT_MAPPING[userName]) {
      return HOD_DEPARTMENT_MAPPING[userName];
    }

    return [];
  }, [user]);

  const bypassManagerApprovalIds = useMemo(
    () =>
      new Set([
        's05777',
        's00658',
        's00510',
        's00061',
        's03942',
        's00037',
        's02725',
        's00019',
        's00045',
        's04578',
        's09505',
        's00151',
        's00016',
        's08547',
        's09578',
        's00006',
        's00143',
        's08377',
        's08472',
        's09698',
        's00256',
        'deepakbhalla',
        'tejbahadur',
        'danveersingh',
        'shrirampatle',
        'sparshjha',
        'rohan',
        'dhanjiyadav',
        'anupbopche',
        'hulas',
        'mantuanandghosh',
        'kavisingh',
        'ravisingh',
        'grammohanrao',
        'mukeshpatle',
        'krameshkumar',
        'dcgoutam',
        'dcgautam',
        'anilmishra',
        'dineshbandhe',
        'ambikapandey',
        'jhaneshwarsahu',
        'manishkurrey',
        'amittiwari',
      ]),
    []
  );

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

        const filtered = data.filter((item) => {
          const itemEmpId = normalizeValue(item.employee_id);
          const itemUserName = normalizeValue(item.user_name);
          const isBypassId =
            bypassManagerApprovalIds.has(itemEmpId) || bypassManagerApprovalIds.has(itemUserName);

          if (!isBypassId && normalizeValue(item.approved_by_status) !== 'approved') {
            return false;
          }

          const itemDept = normalizeValue(item.department);
          if (!itemDept || normalizedDepartments.size === 0) {
            return false;
          }

          const commercialStatus = normalizeValue(item.commercial_head_status);
          if (commercialStatus === 'approved' || commercialStatus === 'rejected') {
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
    [token, effectiveDepartments, bypassManagerApprovalIds]
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

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const submitApproval = async ({ requestId, from_date, to_date }) => {
    if (!token) {
      toast.error('Please login again to approve.');
      return false;
    }

    const selectedStatus = actionSelections[requestId] || 'Approved';
    const approvalLabel = selectedStatus === 'Rejected' ? 'Rejected' : 'Approved';
    const targetItem = items.find((item) => item.id === requestId);
    const itemEmpId = normalizeValue(targetItem?.employee_id);
    const itemUserName = normalizeValue(targetItem?.user_name);
    const isBypassId =
      bypassManagerApprovalIds.has(itemEmpId) || bypassManagerApprovalIds.has(itemUserName);

    const payload = {
      commercial_head_status: approvalLabel,
      from_date: from_date || null,
      to_date: to_date || null,
    };

    if (isBypassId && approvalLabel === 'Approved') {
      payload.approved_by_status = 'Approved';
    }

    try {
      const response = await updateLeaveRequest(requestId, payload, token);
      if (!response?.success) {
        toast.error(response?.message || 'Approval failed');
        return false;
      }

      toast.success(`Leave ${approvalLabel.toLowerCase()} successfully by Commercial Head.`);
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
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-none space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
              Hod Approval
            </p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Approve Leave Requests</h1>
            <p className="mt-1 text-sm text-gray-500">
              Reviewing pending leave requests for your department.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-6">
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Loading leave requests...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No pending leave requests found for Commercial Head approval.
              </div>
            ) : (
              <>
                <div className="space-y-4 px-3 py-4 md:hidden">
                  {items.map((item) => {
                    const commercialStatus = item.commercial_head_status || 'Pending';
                    const isFinalized = ['approved', 'rejected'].includes(
                      String(item.commercial_head_status || '').toLowerCase()
                    );

                    return (
                      <article
                        key={item.id}
                        className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {item.employee_name || item.user_name || '-'}
                              </h3>
                              <p className="mt-1 text-xs text-gray-500">{item.designation || '-'}</p>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                                commercialStatus
                              )}`}
                            >
                              {commercialStatus}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                                item.approved_by_status || 'Pending'
                              )}`}
                            >
                              HOD: {item.approved_by_status || 'Pending'}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                                commercialStatus
                              )}`}
                            >
                              CH: {commercialStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                From
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-900">
                                {formatShortDate(item.from_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                To
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-900">
                                {formatShortDate(item.to_date)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Department
                              </p>
                              <p className="mt-1">{item.department || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Reason
                              </p>
                              <p className="mt-1 break-words">{item.reason || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Mobile
                              </p>
                              <p className="mt-1">{item.mobilenumber || '-'}</p>
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
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Edit size={16} />
                            {isFinalized ? 'Finalized' : 'Approve'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden max-h-[65vh] overflow-x-auto overflow-y-auto md:block">
                  <table className="min-w-full w-full text-left text-sm">
                    <thead className="sticky top-0 z-20 bg-gray-50 text-xs uppercase text-gray-500 shadow-sm">
                      <tr>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Employee</th>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Department</th>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">From</th>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">To</th>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Reason</th>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Mobile</th>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">Created</th>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">HOD Status</th>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 sm:px-4">CH Status</th>
                        <th className="sticky top-0 bg-gray-50 px-2 py-3 text-right sm:px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item) => {
                        const commercialStatus = (item.commercial_head_status || '').toLowerCase();
                        const isFinalized = commercialStatus === 'approved' || commercialStatus === 'rejected';

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
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500 sm:px-4">
                              {formatDateTime(item.created_at)}
                            </td>
                            <td className="px-2 py-3 sm:px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                                  item.approved_by_status || 'Pending'
                                )}`}
                              >
                                {item.approved_by_status || 'Pending'}
                              </span>
                            </td>
                            <td className="px-2 py-3 sm:px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                                  item.commercial_head_status || 'Pending'
                                )}`}
                              >
                                {item.commercial_head_status || 'Pending'}
                              </span>
                            </td>
                            <td className="px-2 py-3 sm:px-4">
                              <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
                                <button
                                  type="button"
                                  onClick={() => openApprovalModal(item)}
                                  disabled={isFinalized}
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Edit size={14} />
                                  Approve
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {approvalModal && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900">Commercial Head Approval</p>
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
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700" htmlFor="modal_action">
                  Action
                </label>
                <select
                  id="modal_action"
                  value={actionSelections[approvalModal.requestId] || 'Approved'}
                  onChange={(event) => handleModalActionChange(event.target.value)}
                  disabled={modalLoading}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleModalSubmit}
                  disabled={modalLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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

export default CommercialHeadApproval;
