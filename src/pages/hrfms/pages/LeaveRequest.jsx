import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiRequest } from '../../../api/hrfms/apiRequest';
import { useAuth } from '../../../context/AuthContext';
import useAutoSync from '../hooks/useAutoSync';

const monthOptions = [
  { value: 'all', label: 'All Months' },
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

const inputClasses =
  'mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:text-base';

const readOnlyInputClasses = `${inputClasses} bg-gray-100`;

const getStatusClasses = (status) => {
  const normalizedStatus = (status || '').toLowerCase();

  if (normalizedStatus === 'approved') {
    return 'bg-green-100 text-green-800';
  }

  if (normalizedStatus === 'rejected') {
    return 'bg-red-100 text-red-800';
  }

  return 'bg-yellow-100 text-yellow-800';
};

const LeaveRequest = () => {
  const { token, user: authUser } = useAuth();
  const employeeId = localStorage.getItem('employeeId');
  const rawUser = localStorage.getItem('user');
  const storedUser = rawUser ? JSON.parse(rawUser) : {};
  const user = useMemo(() => authUser || storedUser || {}, [authUser, storedUser]);
  const isAdmin = useMemo(
    () => (user?.role || '').toLowerCase() === 'admin' || user?.Admin === 'Yes',
    [user]
  );
  const employeeCodeValue = useMemo(
    () => authUser?.employee_id || storedUser?.employee_id || storedUser?.employeeId || employeeId || '',
    [authUser, storedUser, employeeId]
  );
  const employeeDbIdValue = useMemo(
    () => authUser?.id || storedUser?.id || storedUser?.employee_id || null,
    [authUser, storedUser]
  );
  const employeeNameValue = useMemo(
    () => authUser?.user_name || storedUser?.user_name || storedUser?.Name || '',
    [authUser, storedUser]
  );
  const designationValue = useMemo(
    () => authUser?.designation || storedUser?.designation || storedUser?.Designation || '',
    [authUser, storedUser]
  );
  const departmentValue = useMemo(
    () => authUser?.department || storedUser?.department || storedUser?.Department || '',
    [authUser, storedUser]
  );
  const [tableLoading, setTableLoading] = useState(false);
  const [leavesData, setLeavesData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [formData, setFormData] = useState({
    employeeId: employeeCodeValue || '',
    employeeName: employeeNameValue || '',
    designation: designationValue || '',
    fromDate: '',
    toDate: '',
    reason: '',
    mobilenumber: '',
    urgent_mobilenumber: '',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      employeeId: employeeCodeValue || prev.employeeId || '',
      employeeName: employeeNameValue || prev.employeeName || '',
      designation: designationValue || prev.designation || '',
    }));
  }, [employeeCodeValue, employeeNameValue, designationValue]);

  useEffect(() => {
    if (!showModal) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showModal]);

  const parseReason = (rawReason) => (rawReason ? rawReason : '');

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const dateStr = String(value);
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month || !year) return null;
      return new Date(year, month - 1, day);
    }

    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      if (year && month && day) {
        return new Date(year, month - 1, day);
      }
    }

    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const calculateDays = (startDateStr, endDateStr) => {
    const startDate = toDate(startDateStr);
    const endDate = toDate(endDateStr);
    if (!startDate || !endDate) return 0;

    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const formatDisplayDate = (value, showTime = false) => {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    const dateStr = `${day}/${month}/${year}`;
    if (!showTime) return dateStr;

    const timeStr = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateStr} ${timeStr}`;
  };

  const isDateInMonth = (dateStr, monthIndex) => {
    if (!dateStr || monthIndex === 'all') return true;

    const date = toDate(dateStr);
    if (!date) return false;

    return date.getMonth() === parseInt(monthIndex, 10);
  };

  const fetchLeaveData = useCallback(
    async (isAutoSync = false) => {
      if (!token) {
        setLeavesData([]);
        return;
      }

      if (!isAutoSync) {
        setTableLoading(true);
      }

      try {
        const response = await apiRequest('/api/hrfms/leave-requests', {
          method: 'GET',
          token,
        });

        const data = Array.isArray(response?.data) ? response.data : [];
        const filtered = data.filter((item) => {
          if (isAdmin) {
            return true;
          }
          if (employeeCodeValue) {
            return String(item.employee_id ?? '') === String(employeeCodeValue);
          }
          if (employeeDbIdValue) {
            return String(item.employee_id ?? '') === String(employeeDbIdValue);
          }
          if (employeeNameValue) {
            return (item.employee_name || item.user_name || '') === employeeNameValue;
          }
          return true;
        });

        const processedData = filtered.map((item) => {
          const parsedReason = parseReason(item.reason);
          const startDateRaw = toDate(item.from_date);
          const endDateRaw = toDate(item.to_date);
          const startDate = formatDisplayDate(startDateRaw) || item.from_date || '';
          const endDate = formatDisplayDate(endDateRaw) || item.to_date || '';

          return {
            id: item.id,
            employeeId: item.employee_id || '',
            employeeName: item.employee_name || item.user_name || '',
            startDate,
            endDate,
            startDateRaw,
            endDateRaw,
            reason: parsedReason,
            days: calculateDays(startDateRaw || startDate, endDateRaw || endDate),
            approvedByStatus: item.approved_by_status || 'Pending',
            appliedDate: formatDisplayDate(item.created_at, true),
            approveDate: formatDisplayDate(item.approve_dates),
            approvedBy: item.approved_by || '',
          };
        });

        setLeavesData(processedData);
      } catch (error) {
        toast.error(error?.message || 'Failed to load leave data.');
      } finally {
        if (!isAutoSync) {
          setTableLoading(false);
        }
      }
    },
    [token, employeeCodeValue, employeeDbIdValue, employeeNameValue, isAdmin]
  );

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  useAutoSync(() => fetchLeaveData(true), 20000);

  const filteredLeavesData = leavesData.filter(
    (leave) =>
      selectedMonth === 'all' ||
      isDateInMonth(leave.startDateRaw || leave.startDate, selectedMonth) ||
      isDateInMonth(leave.endDateRaw || leave.endDate, selectedMonth)
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.employeeName || !formData.fromDate || !formData.toDate || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      if (!token) {
        toast.error('Please login again before submitting leave request.');
        return;
      }

      const fallbackEmployeeId = (() => {
        const parsedEmployeeId = Number(formData.employeeId);
        return Number.isNaN(parsedEmployeeId) ? formData.employeeId || null : parsedEmployeeId;
      })();
      const employeeIdValue = employeeCodeValue || fallbackEmployeeId;

      const payload = {
        employee_id: employeeIdValue,
        employee_name: employeeNameValue,
        designation: formData.designation || designationValue,
        department: departmentValue,
        from_date: formData.fromDate,
        to_date: formData.toDate,
        reason: formData.reason,
        mobilenumber: formData.mobilenumber ?? null,
        urgent_mobilenumber: formData.urgent_mobilenumber ?? null,
        request_status: 'Pending',
        user_id: employeeDbIdValue,
      };

      const result = await apiRequest('/api/hrfms/leave-requests', {
        method: 'POST',
        token,
        body: payload,
      });

      if (result?.success) {
        toast.success('Leave Request submitted successfully!');
        setFormData({
          employeeId: employeeCodeValue,
          employeeName: employeeNameValue,
          designation: designationValue,
          fromDate: '',
          toDate: '',
          reason: '',
          mobilenumber: '',
          urgent_mobilenumber: '',
        });
        setShowModal(false);
        fetchLeaveData();
      }
    } catch (error) {
      toast.error(error?.message || 'Something went wrong!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-3 sm:py-6 md:py-8">
      <div className="w-full space-y-4 px-0 sm:px-4 lg:px-8">
        <section className="w-full bg-white px-3 py-4 ring-1 ring-slate-200/70 sm:rounded-2xl sm:px-6 sm:py-6 sm:shadow-xl sm:shadow-slate-900/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">Leave Request</h1>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm md:text-base">
                Submit leave requests and track approvals with mobile cards and a desktop table.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:w-auto sm:rounded-full sm:px-4 sm:text-sm"
            >
              <Plus size={16} />
              New Leave Request
            </button>
          </div>
        </section>

        <section className="w-full bg-white px-3 py-4 ring-1 ring-slate-200/70 sm:rounded-2xl sm:px-5 sm:py-5 sm:shadow-xl sm:shadow-slate-900/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-gray-500">
              <Filter size={18} />
              <label htmlFor="monthFilter" className="text-xs font-medium text-gray-700 sm:text-sm">
                Filter by Month
              </label>
            </div>
            <select
              id="monthFilter"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:max-w-xs sm:text-base"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="w-full bg-white ring-1 ring-slate-200/70 sm:rounded-2xl sm:shadow-xl sm:shadow-slate-900/5">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-4 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold text-gray-800 sm:text-lg">
                {isAdmin ? 'Leave Requests' : 'My Leave Requests'}
              </h2>
              <p className="text-xs text-gray-500 sm:text-sm">
                Cards are shown on mobile. Full table is available on larger screens.
              </p>
            </div>
          </div>

          {tableLoading ? (
            <div className="flex justify-center px-4 py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
            </div>
          ) : (
            <>
              {filteredLeavesData.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  {leavesData.length === 0
                    ? 'No leave requests found.'
                    : 'No leave requests match the selected month.'}
                </div>
              ) : (
                <>
                  <div className="space-y-4 px-3 py-4 md:hidden">
                    {filteredLeavesData.map((request) => (
                      <article
                        key={request.id}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {isAdmin ? (
                                <>
                                  <h3 className="truncate text-sm font-semibold text-gray-900">
                                    {request.employeeName || '-'}
                                  </h3>
                                  <p className="mt-1 text-xs text-gray-500">
                                    Employee ID: {request.employeeId || '-'}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <h3 className="text-sm font-semibold text-gray-900">Leave Request</h3>
                                  <p className="mt-1 text-xs text-gray-500">
                                    Applied on {request.appliedDate || '-'}
                                  </p>
                                </>
                              )}
                            </div>
                            <span
                              className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusClasses(
                                request.approvedByStatus
                              )}`}
                            >
                              {request.approvedByStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                From
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-900">{request.startDate || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                To
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-900">{request.endDate || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Days
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-900">{request.days || 0}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Reason
                            </p>
                            <p className="mt-1 break-words text-sm text-gray-700">{request.reason || '-'}</p>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Applied Date
                              </p>
                              <p className="mt-1">{request.appliedDate || '-'}</p>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                HR Approve Date
                              </p>
                              <p className="mt-1">{request.approveDate || '-'}</p>
                            </div>

                            {isAdmin && (
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Approved By
                                </p>
                                <p className="mt-1">{request.approvedBy || '-'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="hidden w-full overflow-x-auto md:block">
                    <table className="min-w-[760px] w-full divide-y divide-gray-200 text-left text-xs sm:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {isAdmin && (
                            <>
                              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs">
                                Employee ID
                              </th>
                              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs">
                                Employee
                              </th>
                            </>
                          )}
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs">
                            From Date
                          </th>
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs">
                            To Date
                          </th>
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs">
                            Days
                          </th>
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs">
                            Reason
                          </th>
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs">
                            Manager Status
                          </th>
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs">
                            Applied Date
                          </th>
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs">
                            HR Approve Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredLeavesData.map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            {isAdmin && (
                              <>
                                <td className="px-3 py-3 whitespace-nowrap text-gray-900 sm:px-4">
                                  {request.employeeId}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap font-medium text-gray-900 sm:px-4">
                                  {request.employeeName}
                                </td>
                              </>
                            )}
                            <td className="px-3 py-3 whitespace-nowrap text-gray-900 sm:px-4">
                              {request.startDate}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-900 sm:px-4">
                              {request.endDate}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-900 sm:px-4">
                              {request.days}
                            </td>
                            <td className="max-w-[220px] px-3 py-3 text-gray-900 sm:px-4">
                              <div className="break-words">{request.reason}</div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap sm:px-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide sm:text-xs ${getStatusClasses(
                                  request.approvedByStatus
                                )}`}
                              >
                                {request.approvedByStatus}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-900 sm:px-4">
                              {request.appliedDate}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-900 sm:px-4">
                              {request.approveDate || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-4">
          <div className="flex h-full w-full items-end justify-center sm:items-center">
            <div className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 sm:text-lg">New Leave Request</h3>
                  <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                    Fill the form below. All fields are optimized for mobile width.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Employee Name *</label>
                    <input
                      type="text"
                      name="employeeName"
                      value={formData.employeeName || ''}
                      className={readOnlyInputClasses}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId || ''}
                      className={readOnlyInputClasses}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Designation</label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation || ''}
                      className={readOnlyInputClasses}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <input
                      type="text"
                      name="department"
                      value={departmentValue || ''}
                      className={readOnlyInputClasses}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                    <input
                      type="text"
                      name="mobilenumber"
                      value={formData.mobilenumber || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 8103490342"
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Urgent Mobile Number</label>
                    <input
                      type="text"
                      name="urgent_mobilenumber"
                      value={formData.urgent_mobilenumber || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. 93293232"
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">From Date *</label>
                    <input
                      type="date"
                      name="fromDate"
                      value={formData.fromDate}
                      onChange={handleInputChange}
                      className={inputClasses}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">To Date *</label>
                    <input
                      type="date"
                      name="toDate"
                      value={formData.toDate}
                      onChange={handleInputChange}
                      className={inputClasses}
                      required
                    />
                  </div>

                  {formData.fromDate && formData.toDate && (
                    <div className="rounded-lg bg-blue-50 p-3 sm:col-span-2">
                      <p className="text-sm text-blue-800">
                        Total Days:{' '}
                        <span className="font-semibold">
                          {calculateDays(formData.fromDate, formData.toDate)}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Reason *</label>
                    <textarea
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      rows={4}
                      className={inputClasses}
                      placeholder="Please provide reason for leave..."
                      required
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-auto ${
                        submitting ? 'cursor-not-allowed opacity-75' : ''
                      }`}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <div className="flex items-center">
                          <svg
                            className="mr-2 h-4 w-4 animate-spin text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequest;
