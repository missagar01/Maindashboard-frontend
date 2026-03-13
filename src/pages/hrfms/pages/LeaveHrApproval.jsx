import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getLeaveRequestsByStatus, updateLeaveRequest } from '../../../api/hrfms/leaveRequestApi';
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

const LeaveHrApproval = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

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
        const response = await getLeaveRequestsByStatus('Approved', token);
        const data = Array.isArray(response?.data) ? response.data : [];
        const filtered = data.filter((item) => {
          const commercialStatus = (item.commercial_head_status || '')
            .toString()
            .trim()
            .toLowerCase();
          return commercialStatus === 'approved';
        });
        setItems(filtered);
      } catch (error) {
        toast.error(error?.message || 'Failed to load leave approvals.');
      } finally {
        if (!isAutoSync) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAutoSync(() => fetchData(true), 10000);

  const handleApprove = async (requestId) => {
    if (!token) {
      toast.error('Please login again to approve.');
      return;
    }

    try {
      const payload = {
        hr_approval: 'Approved',
        request_status: 'Approved',
        approve_dates: new Date().toISOString().split('T')[0],
        approval_hr: user?.employee_id || user?.employee_code || user?.employeeCode || null,
      };

      const response = await updateLeaveRequest(requestId, payload, token);
      if (!response?.success) {
        toast.error(response?.message || 'HR approval failed');
        return;
      }

      toast.success('HR approval saved.');
      fetchData();
    } catch (error) {
      toast.error(error?.message || 'HR approval failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-3 sm:py-6 md:py-8">
      <div className="w-full space-y-4 px-0 sm:px-4 lg:px-8">
        <section className="w-full bg-white px-3 py-4 ring-1 ring-slate-200/70 sm:rounded-2xl sm:px-6 sm:py-6 sm:shadow-xl sm:shadow-slate-900/5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 sm:text-sm">
              HR Approval
            </p>
            <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
              HR Leave Approvals
            </h1>
            <p className="mt-2 text-xs text-gray-500 sm:text-sm md:text-base">
              Review approved requests and confirm HR approval from a horizontally scrollable table.
            </p>
          </div>
        </section>

        <section className="w-full bg-white ring-1 ring-slate-200/70 sm:rounded-2xl sm:shadow-xl sm:shadow-slate-900/5">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-4 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-gray-700 sm:text-base">Approved leave requests</p>
              <p className="text-xs text-gray-500 sm:text-sm">
                Swipe horizontally on smaller screens to view all columns.
              </p>
            </div>
          </div>

          {loading && (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              Loading approvals...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              No approved leave requests found.
            </div>
          )}

          {!loading && items.length > 0 && (
            <>
              <div className="space-y-4 px-3 py-4 md:hidden">
                {items.map((item) => {
                  const requestStatus = item.approved_by_status || item.request_status || '-';
                  const hrApproval = item.hr_approval || '-';
                  const isApproved = hrApproval.toLowerCase() === 'approved';

                  return (
                    <article
                      key={item.id}
                      className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                              {item.employee_name || item.user_name || '-'}
                            </h3>
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
                                hrApproval
                              )}`}
                            >
                              HR: {hrApproval}
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

                          <div className="grid grid-cols-1 gap-3">
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
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Approved By
                            </p>
                            <p className="mt-1">{item.approved_by || '-'}</p>
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
                          onClick={() => handleApprove(item.id)}
                          disabled={isApproved}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden w-full overflow-x-auto md:block">
                <div className="max-h-[70vh] min-w-[1120px] overflow-y-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="sticky top-0 z-20 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 shadow-sm sm:text-xs">
                      <tr>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">Employee</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">Department</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">From</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">To</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">Reason</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">Mobile Number</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">Urgent Mobile Number</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">Approved By</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">Request Status</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">HR Approval</th>
                        <th className="bg-gray-50 px-3 py-3 sm:px-4">Created</th>
                        <th className="bg-gray-50 px-3 py-3 text-right sm:px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 sm:px-4">
                            <div className="font-medium text-gray-900">{item.employee_name || item.user_name || '-'}</div>
                            <div className="mt-1 text-xs text-gray-500">{item.designation || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-gray-700 sm:px-4">{item.department || '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-gray-700 sm:px-4">
                            {formatShortDate(item.from_date)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-gray-700 sm:px-4">
                            {formatShortDate(item.to_date)}
                          </td>
                          <td className="max-w-[220px] px-3 py-3 text-gray-700 sm:px-4">
                            <div className="break-words">{item.reason || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-gray-700 sm:px-4">{item.mobilenumber || '-'}</td>
                          <td className="px-3 py-3 text-gray-700 sm:px-4">{item.urgent_mobilenumber || '-'}</td>
                          <td className="px-3 py-3 text-gray-700 sm:px-4">{item.approved_by || '-'}</td>
                          <td className="px-3 py-3 text-gray-700 sm:px-4">
                            {item.approved_by_status || item.request_status || '-'}
                          </td>
                          <td className="px-3 py-3 text-gray-700 sm:px-4">{item.hr_approval || '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-gray-500 sm:px-4">
                            {formatDateTime(item.created_at)}
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleApprove(item.id)}
                                disabled={(item.hr_approval || '').toLowerCase() === 'approved'}
                                className="inline-flex w-full min-w-[110px] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-1.5 sm:text-sm"
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default LeaveHrApproval;
