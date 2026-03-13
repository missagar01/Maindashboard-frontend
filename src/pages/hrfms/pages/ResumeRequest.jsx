import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoSync } from '../hooks/useAutoSync';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { createRequest } from '../../../api/hrfms/requestApi';
import { getDepartments } from '../../../api/hrfms/employeeApi';
import { useAuth } from '../../../context/AuthContext';

const initialForm = {
  person_name: '',
  employee_code: '',
  type_of_travel: '',
  reason_for_travel: '',
  no_of_person: 1,
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
  remarks: '',
  request_status: 'Open',
};

const inputClasses =
  'mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:text-base';

const readOnlyInputClasses = `${inputClasses} bg-slate-100`;

const ResumeRequest = () => {
  const { user, token } = useAuth();

  const defaultEmployeeCode = user?.employee_id || user?.employee_code || '';
  const defaultPersonName = user?.user_name || user?.employee_name || '';
  const defaultDesignation = user?.designation || '';
  const defaultDepartment = user?.department || '';

  const [form, setForm] = useState(() => ({
    ...initialForm,
    employee_code: defaultEmployeeCode,
    person_name: defaultPersonName,
    requester_name: defaultPersonName,
    requester_designation: defaultDesignation,
    requester_department: defaultDepartment,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      employee_code: prev.employee_code || defaultEmployeeCode,
      person_name: prev.person_name || defaultPersonName,
      requester_name: prev.requester_name || defaultPersonName,
      requester_designation: prev.requester_designation || defaultDesignation,
      requester_department: prev.requester_department || defaultDepartment,
    }));
  }, [defaultDepartment, defaultDesignation, defaultEmployeeCode, defaultPersonName]);

  const employeeCodeValue = useMemo(
    () => form.employee_code || defaultEmployeeCode,
    [form.employee_code, defaultEmployeeCode]
  );

  const requesterNameValue = useMemo(
    () => form.requester_name || defaultPersonName,
    [form.requester_name, defaultPersonName]
  );

  const designationValue = useMemo(
    () => form.requester_designation || defaultDesignation,
    [form.requester_designation, defaultDesignation]
  );

  const fetchDepartments = useCallback(
    async (isAutoSync = false) => {
      if (defaultDepartment) {
        return;
      }

      if (!isAutoSync) {
        setLoadingDepartments(true);
      }

      try {
        const response = await getDepartments();
        if (response?.success && Array.isArray(response.data)) {
          setDepartments(response.data);
        } else if (!isAutoSync) {
          toast.error('Departments response invalid');
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        if (!isAutoSync) {
          toast.error('Failed to load departments');
        }
      } finally {
        if (!isAutoSync) {
          setLoadingDepartments(false);
        }
      }
    },
    [defaultDepartment]
  );

  useAutoSync(() => fetchDepartments(true), 30000);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    const nextValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
      ...(name === 'requester_name' ? { person_name: nextValue } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error('Please login again to submit request.');
      return;
    }

    const buildPayload = () => {
      const payload = {};

      if (employeeCodeValue) {
        payload.employee_code = employeeCodeValue;
      }
      if (requesterNameValue) {
        payload.requester_name = requesterNameValue;
      }
      if (designationValue) {
        payload.requester_designation = designationValue;
      }

      const submitDepartment = form.requester_department || defaultDepartment;
      if (submitDepartment) {
        payload.requester_department = submitDepartment;
      }

      if (form.request_for) {
        payload.request_for = form.request_for;
      }
      if (form.experience) {
        payload.experience = form.experience;
      }
      if (form.education) {
        payload.education = form.education;
      }
      if (form.remarks) {
        payload.remarks = form.remarks;
      }
      if (
        form.request_quantity !== '' &&
        form.request_quantity !== null &&
        form.request_quantity !== undefined
      ) {
        payload.request_quantity = Number(form.request_quantity);
      }
      if (form.from_date) {
        payload.from_date = form.from_date;
      }
      if (form.to_date) {
        payload.to_date = form.to_date;
      }
      if (form.departure_date) {
        payload.departure_date = form.departure_date;
      }
      if (form.type_of_travel) {
        payload.type_of_travel = form.type_of_travel;
      }
      if (form.reason_for_travel) {
        payload.reason_for_travel = form.reason_for_travel;
      }
      if (
        form.no_of_person !== '' &&
        form.no_of_person !== null &&
        form.no_of_person !== undefined
      ) {
        payload.no_of_person = Number(form.no_of_person);
      }

      payload.person_name = form.person_name || requesterNameValue || employeeCodeValue;
      payload.request_status = form.request_status || 'Open';

      return payload;
    };

    setSubmitting(true);
    try {
      const payload = buildPayload();
      const response = await createRequest(payload, token);

      if (!response?.success) {
        console.error('createRequest failed:', response);
        toast.error(response?.message || 'Failed to create request');
        return;
      }

      toast.success('Request submitted successfully!');
      setForm({
        ...initialForm,
        employee_code: defaultEmployeeCode,
        person_name: defaultPersonName,
        requester_name: defaultPersonName,
        requester_designation: defaultDesignation,
        requester_department: defaultDepartment,
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to create request'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-10">
      <div className="mx-auto w-full max-w-none space-y-5 px-3 sm:space-y-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 p-5 shadow-2xl ring-1 ring-white/30 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80 sm:text-sm">
                Recruitment
              </p>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                MainPower Request
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100 sm:text-base">
                Submit a clean recruitment request from a mobile-first form layout that stays
                full width and readable on every screen size.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/15 px-4 py-3 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">
                  Employee Code
                </p>
                <p className="mt-1 text-sm font-semibold">{employeeCodeValue || '-'}</p>
              </div>
              <div className="rounded-2xl bg-white/15 px-4 py-3 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">
                  Department
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {form.requester_department || defaultDepartment || '-'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-4 shadow-xl sm:p-8">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Requester Details
                </h2>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  Core requester information stays full width on mobile and expands cleanly on
                  larger screens.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="employee_code">
                    Employee Code
                  </label>
                  <input
                    id="employee_code"
                    name="employee_code"
                    value={employeeCodeValue}
                    onChange={handleChange}
                    className={Boolean(defaultEmployeeCode) ? readOnlyInputClasses : inputClasses}
                    placeholder="S00001"
                    readOnly={Boolean(defaultEmployeeCode)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="requester_name">
                    Requester Name
                  </label>
                  <input
                    id="requester_name"
                    name="requester_name"
                    value={requesterNameValue}
                    onChange={handleChange}
                    className={inputClasses}
                    placeholder="Anita Verma"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-gray-700"
                    htmlFor="requester_designation"
                  >
                    Requester Designation
                  </label>
                  <input
                    id="requester_designation"
                    name="requester_designation"
                    value={designationValue}
                    onChange={handleChange}
                    className={inputClasses}
                    placeholder="Manager"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-gray-700"
                    htmlFor="requester_department"
                  >
                    Requester Department
                  </label>
                  <select
                    id="requester_department"
                    name="requester_department"
                    value={form.requester_department || defaultDepartment}
                    onChange={handleChange}
                    disabled={Boolean(defaultDepartment) || loadingDepartments}
                    className={`${inputClasses} disabled:cursor-not-allowed disabled:bg-gray-100`}
                  >
                    {defaultDepartment ? (
                      <option value={defaultDepartment}>{defaultDepartment}</option>
                    ) : (
                      <>
                        <option value="">
                          {loadingDepartments ? 'Loading...' : 'Select Department'}
                        </option>
                        {departments.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Requirement Details
                </h2>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  Keep the main hiring fields simple, readable, and stacked properly on small
                  screens.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                    placeholder="Mechanical Engineer"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="request_quantity">
                    Request Quantity
                  </label>
                  <input
                    id="request_quantity"
                    name="request_quantity"
                    type="number"
                    min="1"
                    value={form.request_quantity}
                    onChange={handleChange}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="experience">
                    Experience
                  </label>
                  <input
                    id="experience"
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    className={inputClasses}
                    placeholder="5 years"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="education">
                    Education
                  </label>
                  <input
                    id="education"
                    name="education"
                    value={form.education}
                    onChange={handleChange}
                    className={inputClasses}
                    placeholder="B.Tech"
                  />
                </div>

                <div className="sm:col-span-2 xl:col-span-3">
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
                    placeholder="Add requirement notes, urgency, or candidate preferences"
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="submit"
                disabled={submitting || loadingDepartments}
                className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                <Send size={16} className="mr-2" />
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResumeRequest;
