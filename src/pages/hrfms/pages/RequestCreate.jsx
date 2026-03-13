import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAutoSync } from '../hooks/useAutoSync';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { createRequest } from '../../../api/hrfms/requestApi';
import { getDepartments } from '../../../api/hrfms/employeeApi';
import { useAuth } from '../../../context/AuthContext';

const initialForm = {
  person_name: '',
  employee_code: '',
  type_of_travel: 'Official',
  reason_for_travel: '',
  no_of_person: '',
  from_date: '',
  to_date: '',
  departure_date: '',
  requester_name: '',
  requester_designation: '',
  requester_department: '',
  request_for: '',
  request_quantity: '',
  experience: '',
  education: '',
  from_city: '',
  to_city: '',
  remarks: '',
  request_status: 'Open',
};

const RequestCreate = () => {
  const { user, token } = useAuth();
  const defaultEmployeeCode = user?.employee_id || user?.employee_code || '';
  const defaultPersonName = user?.user_name || user?.employee_name || '';

  const [form, setForm] = useState(() => ({
    ...initialForm,
    employee_code: defaultEmployeeCode,
    person_name: defaultPersonName,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const employeeCodeValue = useMemo(
    () => form.employee_code || defaultEmployeeCode,
    [form.employee_code, defaultEmployeeCode]
  );

  const personNameValue = useMemo(
    () => form.person_name || defaultPersonName,
    [form.person_name, defaultPersonName]
  );

  const fetchDepartments = useCallback(async (isAutoSync = false) => {
    if (!isAutoSync) setLoadingDepartments(true);
    try {
      const response = await getDepartments();
      if (response?.success && Array.isArray(response.data)) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      if (!isAutoSync) toast.error('Failed to load departments');
    } finally {
      if (!isAutoSync) setLoadingDepartments(false);
    }
  }, []);

  useAutoSync(fetchDepartments, 30000);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      toast.error('Please login again to submit request.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        employee_code: employeeCodeValue,
        person_name: personNameValue,
      };
      const response = await createRequest(payload, token);
      if (!response?.success) {
        toast.error(response?.message || 'Failed to create request');
        return;
      }
      toast.success('Request submitted successfully!');

      setForm({
        ...initialForm,
        employee_code: defaultEmployeeCode,
        person_name: defaultPersonName,
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-6 sm:py-10">
      <div className="mx-auto w-full max-w-none space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Request</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Travel Request</h1>
              <p className="mt-1 text-sm text-gray-500">Submit a new request with employee details.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="person_name">Person Name</label>
              <input
                id="person_name"
                name="person_name"
                value={personNameValue}
                onChange={handleChange}
                readOnly
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Rupesh Sahu"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="employee_code">Employee Code</label>
              <input
                id="employee_code"
                name="employee_code"
                value={employeeCodeValue}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="S00001"
                required
                readOnly
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="type_of_travel">Type of Travel</label>
              <select
                id="type_of_travel"
                name="type_of_travel"
                value={form.type_of_travel}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="Official">Official</option>
                <option value="Personal">Personal</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="reason_for_travel">Reason for Travel</label>
              <input
                id="reason_for_travel"
                name="reason_for_travel"
                value={form.reason_for_travel}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Client visit"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="no_of_person">No. of Persons</label>
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
              <label className="text-sm font-medium text-gray-700" htmlFor="from_date">From Date</label>
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
              <label className="text-sm font-medium text-gray-700" htmlFor="to_date">To Date</label>
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

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="from_city">From City</label>
              <input
                id="from_city"
                name="from_city"
                value={form.from_city}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Raipur"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="to_city">To City</label>
              <input
                id="to_city"
                name="to_city"
                value={form.to_city}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Delhi"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="departure_date">Departure Date</label>
              <input
                id="departure_date"
                name="departure_date"
                type="date"
                value={form.departure_date}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="requester_department">Requester Department</label>
              <select
                id="requester_department"
                name="requester_department"
                value={form.requester_department}
                onChange={handleChange}
                disabled={loadingDepartments}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium text-gray-700" htmlFor="remarks">Remarks</label>
              <textarea
                id="remarks"
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Urgent"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
  );
};

export default RequestCreate;