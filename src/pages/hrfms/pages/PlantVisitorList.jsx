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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

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

  const handleOpenForm = () => {
    resetForm();
    setShowForm(true);
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
    <div className="min-h-screen py-6 sm:py-10">
      <div className="mx-auto w-full max-w-none space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Plant Visitors</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Plant Visitor Requests</h1>

            </div>
            {/* <button
              type="button"
              onClick={handleOpenForm}
              className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              Open Visitor Form
            </button>    */}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500">Latest visitors</p>
            <button
              type="button"
              onClick={() => loadVisitors()}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 w-full overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full min-w-[1024px] divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Person</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Employee Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Request For</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">No. of Persons</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">From Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">To Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Requester</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Approver</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loadingVisitors && (
                    <tr>
                      <td colSpan="11" className="px-4 py-6 text-center text-gray-500">
                        Loading visitors...
                      </td>
                    </tr>
                  )}
                  {!loadingVisitors && planeVisitors.length === 0 && (
                    <tr>
                      <td colSpan="11" className="px-4 py-6 text-center text-gray-500">
                        No plane visitor records yet.
                      </td>
                    </tr>
                  )}
                  {!loadingVisitors &&
                    planeVisitors.map((visitor) => (
                      <tr key={visitor?.id || visitor?.person_name} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{visitor.id || '-'}</td>
                        <td className="px-4 py-3">{visitor.person_name || '-'}</td>
                        <td className="px-4 py-3">{visitor.employee_code || '-'}</td>
                        <td className="px-4 py-3">{visitor.reason_for_visit || '-'}</td>
                        <td className="px-4 py-3">{visitor.request_for || '-'}</td>
                        <td className="px-4 py-3">{visitor.no_of_person ?? '-'}</td>
                        <td className="px-4 py-3">{formatDate(visitor.from_date)}</td>
                        <td className="px-4 py-3">{formatDate(visitor.to_date)}</td>
                        <td className="px-4 py-3">{visitor.requester_name || '-'}</td>
                        <td className="px-4 py-3">{visitor.approve_by_name || '-'}</td>
                        <td className="px-4 py-3">
                          {visitor.request_status === 'APPROVED' ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              APPROVED
                            </span>
                          ) : visitor.request_status === 'REJECTED' ? (
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                              REJECTED
                            </span>
                          ) : (
                            <select
                              value={visitor.request_status || 'PENDING'}
                              onChange={(event) => handleStatusChange(visitor, event.target.value)}
                              disabled={!token || statusUpdatingId === visitor.id}
                              className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 px-4 py-6">
          <div className="mx-auto flex h-full items-start justify-center sm:items-center">
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Plant Visitor Requests</h2>
                  <p className="text-sm text-gray-500">Record a new visitor request.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-5">
                <form onSubmit={handleSubmit} className="space-y-6">
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
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Add some context about the visit"
                    />
                  </div>



                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
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
