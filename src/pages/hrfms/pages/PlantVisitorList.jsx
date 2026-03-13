import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoSync } from '../hooks/useAutoSync';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createPlaneVisitor,
  updatePlaneVisitor,
  getPlaneVisitors,
} from '../../../api/hrfms/planeVisitorApi';
import { useAuth } from '../../../context/AuthContext';

const initialForm = {
  employee_code: '',
  person_name: '',
  requester_name: '',
  reason_for_visit: '',
  request_for: '',
  no_of_person: '',
  from_date: '',
  to_date: '',
  remarks: '',
  request_status: 'PENDING',
};

const statusOptions = ['PENDING', 'APPROVED', 'REJECTED'];

const inputClasses =
  'mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:text-base';

const badgeClasses = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
};

const PlantVisitorList = () => {
  const { user, token } = useAuth();
  const defaultEmployeeCode = user?.employee_id || user?.employee_code || '';
  const defaultPersonName = user?.user_name || user?.employee_name || '';
  const [form, setForm] = useState(() => ({
    ...initialForm,
    employee_code: defaultEmployeeCode,
    person_name: defaultPersonName,
    requester_name: defaultPersonName,
  }));
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [planeVisitors, setPlaneVisitors] = useState([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const employeeCodeValue = useMemo(
    () => form.employee_code || defaultEmployeeCode,
    [form.employee_code, defaultEmployeeCode]
  );
  const personNameValue = useMemo(
    () => form.person_name || defaultPersonName,
    [form.person_name, defaultPersonName]
  );
  const requesterNameValue = useMemo(
    () => form.requester_name || defaultPersonName,
    [form.requester_name, defaultPersonName]
  );

  const resetForm = useCallback(() => {
    setForm({
      ...initialForm,
      employee_code: defaultEmployeeCode,
      person_name: defaultPersonName,
      requester_name: defaultPersonName,
    });
  }, [defaultEmployeeCode, defaultPersonName]);

  const loadVisitors = useCallback(async () => {
    if (!token) {
      setPlaneVisitors([]);
      return;
    }

    setLoadingVisitors(true);
    try {
      const response = await getPlaneVisitors(token);
      const data = response?.data ?? [];
      setPlaneVisitors(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.message || 'Failed to load plane visitors');
    } finally {
      setLoadingVisitors(false);
    }
  }, [token]);

  useAutoSync(loadVisitors, 10000);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = async (visitor, selectedStatus) => {
    if (!token) {
      toast.error('Please login again to update the status.');
      return;
    }

    if (!visitor?.id || visitor.request_status === selectedStatus) {
      return;
    }

    setStatusUpdatingId(visitor.id);
    try {
      const payload = {
        request_status: selectedStatus,
        approv_employee_code: user?.employee_id || user?.employee_code || '',
        approve_by_name: user?.user_name || user?.employee_name || '',
      };
      await updatePlaneVisitor(visitor.id, payload, token);
      toast.success('Status updated.');
      await loadVisitors();
    } catch (error) {
      toast.error(error?.message || 'Failed to update status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      toast.error('Please login again to submit a visitor request.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        person_name: personNameValue,
        employee_code: employeeCodeValue,
        requester_name: requesterNameValue,
        no_of_person: form.no_of_person ? parseInt(form.no_of_person, 10) : null,
        request_status: form.request_status || 'PENDING',
      };

      const response = await createPlaneVisitor(payload, token);
      if (!response?.success) {
        toast.error(response?.message || 'Failed to submit plane visitor request');
        return;
      }

      toast.success('Plane visitor request recorded.');
      resetForm();
      setShowForm(false);
      await loadVisitors();
    } catch (error) {
      toast.error(error?.message || 'Failed to submit plane visitor request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const formatDate = (value) => {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-3 sm:py-6 md:py-8">
      <div className="w-full space-y-4 px-0 sm:px-4 lg:px-8">
        <section className="w-full bg-white px-3 py-4 ring-1 ring-slate-200/70 sm:rounded-2xl sm:px-6 sm:py-6 sm:shadow-xl sm:shadow-slate-900/5">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 sm:text-sm">
              Plant Visitors
            </p>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
              Plant Visitor Requests
            </h1>
            <p className="text-xs text-gray-500 sm:text-sm md:text-base">
              Review and update visitor requests with mobile cards and a desktop table.
            </p>
          </div>
        </section>

        <section className="w-full bg-white ring-1 ring-slate-200/70 sm:rounded-2xl sm:shadow-xl sm:shadow-slate-900/5">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-sm font-semibold text-gray-700 sm:text-base">Latest visitors</p>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Cards are shown on mobile. Full table is available on larger screens.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadVisitors()}
              className="inline-flex w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800 sm:w-auto sm:text-sm"
            >
              Refresh
            </button>
          </div>

          {loadingVisitors ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">Loading visitors...</div>
          ) : planeVisitors.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              No plane visitor records yet.
            </div>
          ) : (
            <>
              <div className="space-y-4 px-3 py-4 md:hidden">
                {planeVisitors.map((visitor) => {
                  const normalizedStatus = (visitor.request_status || 'PENDING').toUpperCase();

                  return (
                    <article
                      key={visitor?.id || visitor?.person_name}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                              ID: {visitor.id || '-'}
                            </p>
                            <h3 className="mt-1 text-sm font-semibold text-gray-900">
                              {visitor.person_name || '-'}
                            </h3>
                            <p className="mt-1 text-xs text-gray-500">
                              Employee Code: {visitor.employee_code || '-'}
                            </p>
                          </div>

                          {normalizedStatus === 'APPROVED' || normalizedStatus === 'REJECTED' ? (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                badgeClasses[normalizedStatus]
                              }`}
                            >
                              {normalizedStatus}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              {normalizedStatus}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              From
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-900">
                              {formatDate(visitor.from_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              To
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-900">
                              {formatDate(visitor.to_date)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Reason
                            </p>
                            <p className="mt-1 break-words">{visitor.reason_for_visit || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Request For
                            </p>
                            <p className="mt-1 break-words">{visitor.request_for || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              No. of Persons
                            </p>
                            <p className="mt-1">{visitor.no_of_person ?? '-'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Requester
                            </p>
                            <p className="mt-1 break-words">{visitor.requester_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Approver
                            </p>
                            <p className="mt-1 break-words">{visitor.approve_by_name || '-'}</p>
                          </div>
                        </div>

                        {normalizedStatus === 'APPROVED' || normalizedStatus === 'REJECTED' ? (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Status
                            </p>
                            <div className="mt-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                  badgeClasses[normalizedStatus]
                                }`}
                              >
                                {normalizedStatus}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label
                              className="text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                              htmlFor={`visitor-status-${visitor.id}`}
                            >
                              Status
                            </label>
                            <select
                              id={`visitor-status-${visitor.id}`}
                              value={normalizedStatus}
                              onChange={(event) => handleStatusChange(visitor, event.target.value)}
                              disabled={!token || statusUpdatingId === visitor.id}
                              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden w-full overflow-x-auto md:block">
                <div className="max-h-[65vh] min-w-[1080px] overflow-y-auto">
                  <table className="w-full divide-y divide-gray-200 text-left text-xs sm:text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                      <tr>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">ID</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">Person</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">Employee Code</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">Reason</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">Request For</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">No. of Persons</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">From Date</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">To Date</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">Requester</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">Approver</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 sm:px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {planeVisitors.map((visitor) => {
                        const normalizedStatus = (visitor.request_status || 'PENDING').toUpperCase();

                        return (
                          <tr key={visitor?.id || visitor?.person_name} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-gray-700 sm:px-4">{visitor.id || '-'}</td>
                            <td className="px-3 py-3 text-gray-700 sm:px-4">{visitor.person_name || '-'}</td>
                            <td className="px-3 py-3 text-gray-700 sm:px-4">{visitor.employee_code || '-'}</td>
                            <td className="max-w-[220px] px-3 py-3 text-gray-700 sm:px-4">
                              <div className="break-words">{visitor.reason_for_visit || '-'}</div>
                            </td>
                            <td className="px-3 py-3 text-gray-700 sm:px-4">{visitor.request_for || '-'}</td>
                            <td className="px-3 py-3 text-gray-700 sm:px-4">{visitor.no_of_person ?? '-'}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-700 sm:px-4">
                              {formatDate(visitor.from_date)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-700 sm:px-4">
                              {formatDate(visitor.to_date)}
                            </td>
                            <td className="px-3 py-3 text-gray-700 sm:px-4">{visitor.requester_name || '-'}</td>
                            <td className="px-3 py-3 text-gray-700 sm:px-4">{visitor.approve_by_name || '-'}</td>
                            <td className="px-3 py-3 sm:px-4">
                              {normalizedStatus === 'APPROVED' || normalizedStatus === 'REJECTED' ? (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide sm:text-xs ${
                                    badgeClasses[normalizedStatus]
                                  }`}
                                >
                                  {normalizedStatus}
                                </span>
                              ) : (
                                <select
                                  value={normalizedStatus}
                                  onChange={(event) => handleStatusChange(visitor, event.target.value)}
                                  disabled={!token || statusUpdatingId === visitor.id}
                                  className="w-full min-w-[130px] rounded-lg border border-gray-300 px-2.5 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                                >
                                  {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              )}
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
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-4">
          <div className="flex h-full w-full items-end justify-center sm:items-center">
            <div className="w-full overflow-hidden bg-white sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl sm:shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Plant Visitor Requests</h2>
                  <p className="mt-1 text-xs text-gray-500 sm:text-sm">Record a new visitor request.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[calc(100vh-64px)] overflow-y-auto px-4 py-4 sm:max-h-[80vh] sm:px-6 sm:py-5">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700" htmlFor="person_name">
                        Person Name
                      </label>
                      <input
                        id="person_name"
                        name="person_name"
                        value={personNameValue}
                        onChange={handleChange}
                        readOnly={Boolean(defaultPersonName)}
                        className={inputClasses}
                        placeholder="Rupesh Sahu"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700" htmlFor="employee_code">
                        Employee Code
                      </label>
                      <input
                        id="employee_code"
                        name="employee_code"
                        value={employeeCodeValue}
                        onChange={handleChange}
                        readOnly={Boolean(defaultEmployeeCode)}
                        className={inputClasses}
                        placeholder="EMP123"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700" htmlFor="requester_name">
                        Requester Name
                      </label>
                      <input
                        id="requester_name"
                        name="requester_name"
                        value={form.requester_name}
                        onChange={handleChange}
                        className={inputClasses}
                        placeholder="Anita Verma"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700" htmlFor="reason_for_visit">
                        Reason for Visit
                      </label>
                      <input
                        id="reason_for_visit"
                        name="reason_for_visit"
                        value={form.reason_for_visit}
                        onChange={handleChange}
                        className={inputClasses}
                        placeholder="Stakeholder update"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700" htmlFor="request_for">
                        Request For
                      </label>
                      <input
                        id="request_for"
                        name="request_for"
                        value={form.request_for}
                        onChange={handleChange}
                        className={inputClasses}
                        placeholder="Laptop"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700" htmlFor="no_of_person">
                        No. of Persons
                      </label>
                      <input
                        id="no_of_person"
                        name="no_of_person"
                        type="number"
                        min="1"
                        value={form.no_of_person}
                        onChange={handleChange}
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700" htmlFor="from_date">
                        From Date
                      </label>
                      <input
                        id="from_date"
                        name="from_date"
                        type="date"
                        value={form.from_date}
                        onChange={handleChange}
                        className={inputClasses}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700" htmlFor="to_date">
                        To Date
                      </label>
                      <input
                        id="to_date"
                        name="to_date"
                        type="date"
                        value={form.to_date}
                        onChange={handleChange}
                        className={inputClasses}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700" htmlFor="remarks">
                      Remarks
                    </label>
                    <textarea
                      id="remarks"
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      rows={4}
                      className={inputClasses}
                      placeholder="Add some context about the visit"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="w-full rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    >
                      <Send size={16} className="mr-2" />
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantVisitorList;
