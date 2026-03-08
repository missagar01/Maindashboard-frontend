import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Filter, Calendar, Clock, CheckCircle2, AlertCircle, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiRequest } from '../../../api/hrfms/apiRequest';
import { useAuth } from '../../../context/AuthContext';
import useAutoSync from '../hooks/useAutoSync';

const LeaveRequest = () => {
  const { token, user: authUser } = useAuth();
  const employeeId = localStorage.getItem("employeeId");
  const rawUser = localStorage.getItem("user");
  const storedUser = rawUser ? JSON.parse(rawUser) : {};
  const user = useMemo(() => authUser || storedUser || {}, [authUser, storedUser]);
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
    urgent_mobilenumber: ''
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      employeeId: employeeCodeValue || prev.employeeId || '',
      employeeName: employeeNameValue || prev.employeeName || '',
      designation: designationValue || prev.designation || '',
    }));
  }, [employeeCodeValue, employeeNameValue, designationValue]);
  const parseReason = (rawReason) => (rawReason ? rawReason : '');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
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
    return isNaN(parsed.getTime()) ? null : parsed;
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
    if (isNaN(date.getTime())) {
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
      hour12: true
    });
    return `${dateStr} ${timeStr}`;
  };

  // Check if a date falls within a specific month
  const isDateInMonth = (dateStr, monthIndex) => {
    if (!dateStr || monthIndex === 'all') return true;

    const date = toDate(dateStr);
    if (!date) return false;

    return date.getMonth() === parseInt(monthIndex);
  };

  const fetchLeaveData = useCallback(async (isAutoSync = false) => {
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
  }, [token, employeeCodeValue, employeeDbIdValue, employeeNameValue]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  // Enable auto-sync every 20 seconds for user's own requests
  useAutoSync(() => fetchLeaveData(true), 20000);

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      const reasonText = formData.reason;

      const payload = {
        employee_id: employeeIdValue,
        employee_name: employeeNameValue,
        designation: formData.designation || designationValue,
        department: departmentValue,
        from_date: formData.fromDate,
        to_date: formData.toDate,
        reason: reasonText,
        mobilenumber: formData.mobilenumber ?? null,
        urgent_mobilenumber: formData.urgent_mobilenumber ?? null,
        request_status: 'Pending',
        user_id: employeeDbIdValue
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
          urgent_mobilenumber: ''
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

  // Generate month options for the dropdown
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
    { value: '11', label: 'December' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-4 md:py-8">
      <div className="flex w-full flex-col gap-6 px-3 sm:px-6 lg:px-10">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Leave Request</h1>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center w-full md:w-auto rounded-full bg-indigo-600 px-4 py-2 min-h-[44px] text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <Plus size={16} className="mr-2" />
              New Leave Request
            </button>
          </div>

          {/* Month Filter */}
          <div className="rounded-2xl border border-white/60 bg-white p-4 shadow-xl shadow-slate-900/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Filter size={18} className="text-gray-500" />
              <label
                htmlFor="monthFilter"
                className="text-sm font-medium text-gray-700"
              >
                Filter by Month:
              </label>
              <select
                id="monthFilter"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="rounded-2xl border border-white/60 bg-white shadow-xl shadow-slate-900/5">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                My Leave Requests
              </h2>
              {tableLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          From Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          To Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manager Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Applied Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          HR Approve Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leavesData
                        .filter(
                          (leave) =>
                            selectedMonth === "all" ||
                            isDateInMonth(leave.startDateRaw || leave.startDate, selectedMonth) ||
                            isDateInMonth(leave.endDateRaw || leave.endDate, selectedMonth)
                        )
                        .map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.startDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.endDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.days}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {request.reason}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${(request.approvedByStatus || "").toLowerCase() === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : (request.approvedByStatus || "").toLowerCase() === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                  }`}
                              >
                                {request.approvedByStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.appliedDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.approveDate || '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {leavesData
                      .filter(
                        (leave) =>
                          selectedMonth === "all" ||
                          isDateInMonth(leave.startDateRaw || leave.startDate, selectedMonth) ||
                          isDateInMonth(leave.endDateRaw || leave.endDate, selectedMonth)
                      )
                      .map((request) => (
                        <div key={request.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {request.startDate} - {request.endDate}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {request.days} Days
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${(request.approvedByStatus || "").toLowerCase() === "approved"
                                ? "bg-green-100 text-green-800"
                                : (request.approvedByStatus || "").toLowerCase() === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                                }`}
                            >
                              {request.approvedByStatus}
                            </span>
                          </div>

                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</p>
                            <p className="text-sm text-gray-700 mt-1">{request.reason}</p>
                          </div>

                          <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs text-gray-500">
                            <div>
                              <span className="block text-gray-400">Applied Date</span>
                              <span className="font-medium text-gray-700">{request.appliedDate}</span>
                            </div>
                            {request.approveDate && (
                              <div className="text-right">
                                <span className="block text-gray-400">Approved Date</span>
                                <span className="font-medium text-gray-700">{request.approveDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  {leavesData.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-500">No leave requests found.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for new leave request - Updated to match LeaveManagement */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium">New Leave Request</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    name="employeeName"
                    value={formData.employeeName || ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none min-h-[44px]"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId || ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none min-h-[44px]"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation || ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none min-h-[44px]"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={departmentValue || ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none min-h-[44px]"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    name="mobilenumber"
                    value={formData.mobilenumber || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. 8103490342"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgent Mobile Number
                  </label>
                  <input
                    type="text"
                    name="urgent_mobilenumber"
                    value={formData.urgent_mobilenumber || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. 93293232"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date *
                  </label>
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date *
                  </label>
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                    required
                  />
                </div>

                {formData.fromDate && formData.toDate && (
                  <div className="md:col-span-2 bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Total Days:{" "}
                      <span className="font-semibold">
                        {calculateDays(formData.fromDate, formData.toDate)}
                      </span>
                    </p>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                    placeholder="Please provide reason for leave..."
                    required
                  />
                </div>

                <div className="md:col-span-2 flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 min-h-[44px] border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 w-full md:w-auto min-h-[44px] text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center justify-center ${submitting ? "opacity-75 cursor-not-allowed" : ""
                      }`}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <svg
                          className="animate-spin h-4 w-4 text-white mr-2"
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
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      "Submit Request"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequest;
