import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { getEmployeeFullDetails } from '../../../api/hrfms/dashboardApi';
import { getEmployeeById } from '../../../api/hrfms/employeeApi';
import { createGatePass, getGatePasses } from '../../../api/hrfms/gatePassApi';
import { useAutoSync } from '../hooks/useAutoSync';

const initialForm = {
  name: '',
  mobile_number: '',
  department: '',
  employee_address: '',
  purpose_of_visit: '',
  reason: '',
  date_of_leave: '',
  time_of_entry: '',
};

const inputClasses =
  'mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-200 sm:text-base';

const textareaClasses = `${inputClasses} min-h-[140px] resize-y`;

const statusClasses = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  PENDING: 'bg-amber-100 text-amber-700',
};

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (value) => {
  if (!value || typeof value !== 'string') {
    return '-';
  }

  const [hours = '00', minutes = '00'] = value.split(':');
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(parsedHours, parsedMinutes, 0, 0);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusSortOrder = {
  PENDING: 0,
  REJECTED: 1,
  APPROVED: 2,
};

const sortMyGatePasses = (items) =>
  [...items].sort((left, right) => {
    const leftStatus = statusSortOrder[String(left?.status || 'PENDING').toUpperCase()] ?? 1;
    const rightStatus = statusSortOrder[String(right?.status || 'PENDING').toUpperCase()] ?? 1;

    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
    }

    const rightTime = new Date(right?.created_at || right?.updated_at || 0).getTime();
    const leftTime = new Date(left?.created_at || left?.updated_at || 0).getTime();

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return Number(right?.id || 0) - Number(left?.id || 0);
  });

const getMobileValue = (source) =>
  String(
    source?.number ||
      source?.mobile_number ||
      source?.mobilenumber ||
      source?.mobile ||
      source?.phone ||
      ''
  ).trim();

const GatePassApply = () => {
  const { user, token } = useAuth();
  const defaultName = useMemo(
    () => user?.user_name || user?.employee_name || '',
    [user?.employee_name, user?.user_name]
  );
  const authMobile = useMemo(
    () => getMobileValue(user),
    [user?.mobile, user?.mobile_number, user?.mobilenumber, user?.number, user?.phone]
  );
  const [databaseMobile, setDatabaseMobile] = useState('');
  const defaultMobile = useMemo(() => authMobile || databaseMobile, [authMobile, databaseMobile]);
  const defaultDepartment = useMemo(() => {
    if (user?.department) {
      return user.department;
    }

    if (typeof window !== 'undefined') {
      return localStorage.getItem('department') || '';
    }

    return '';
  }, [user?.department]);

  useEffect(() => {
    let isActive = true;

    if (!token) {
      setDatabaseMobile('');
      return () => {
        isActive = false;
      };
    }

    if (authMobile) {
      setDatabaseMobile('');
      return () => {
        isActive = false;
      };
    }

    const employeeId = String(user?.employee_id || '').trim();
    const userId = user?.id;

    const fetchMobileFromDatabase = async () => {
      const loaders = [];

      if (userId !== null && userId !== undefined && String(userId).trim()) {
        loaders.push(async () => {
          const response = await getEmployeeById(userId, token);
          return response?.data || response;
        });
      }

      if (employeeId) {
        loaders.push(async () => {
          const response = await getEmployeeFullDetails(token, employeeId);
          return response?.data?.profile || response?.profile || response?.data;
        });
      }

      for (const loadEmployee of loaders) {
        try {
          const employee = await loadEmployee();
          const fetchedMobile = getMobileValue(employee);

          if (fetchedMobile) {
            if (isActive) {
              setDatabaseMobile(fetchedMobile);
            }
            return;
          }
        } catch (_error) {
          // Try the next lookup strategy before giving up.
        }
      }

      if (isActive) {
        setDatabaseMobile('');
      }
    };

    void fetchMobileFromDatabase();

    return () => {
      isActive = false;
    };
  }, [authMobile, token, user?.employee_id, user?.id]);

  const [form, setForm] = useState(() => ({
    ...initialForm,
    name: defaultName,
    mobile_number: defaultMobile,
    department: defaultDepartment,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [myGatePasses, setMyGatePasses] = useState([]);
  const [loadingMyGatePasses, setLoadingMyGatePasses] = useState(false);
  const hasLoadedMyGatePassesRef = useRef(false);

  const resetForm = useCallback(() => {
    setForm({
      ...initialForm,
      name: defaultName,
      mobile_number: defaultMobile,
      department: defaultDepartment,
    });
  }, [defaultDepartment, defaultMobile, defaultName]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: current.name || defaultName,
      mobile_number: current.mobile_number || defaultMobile,
      department: current.department || defaultDepartment,
    }));
  }, [defaultDepartment, defaultMobile, defaultName]);

  const loadMyGatePasses = useCallback(async () => {
    if (!token) {
      setMyGatePasses([]);
      hasLoadedMyGatePassesRef.current = false;
      return;
    }

    const showLoader = !hasLoadedMyGatePassesRef.current;
    if (showLoader) {
      setLoadingMyGatePasses(true);
    }

    try {
      const response = await getGatePasses(token, { scope: 'mine' });
      const data = Array.isArray(response?.data) ? response.data : [];
      setMyGatePasses(sortMyGatePasses(data));
      hasLoadedMyGatePassesRef.current = true;
    } catch (error) {
      toast.error(error?.message || 'Failed to load your gate passes');
    } finally {
      if (showLoader) {
        setLoadingMyGatePasses(false);
      }
    }
  }, [token]);

  useAutoSync(loadMyGatePasses, 15000, Boolean(token));

  useEffect(() => {
    loadMyGatePasses();
  }, [loadMyGatePasses]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error('Please login again before applying for a gate pass.');
      return;
    }

    if (!form.department.trim()) {
      toast.error('Department not found. Please login again.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        mobile_number: form.mobile_number.trim(),
        department: form.department.trim(),
        employee_address: form.employee_address.trim(),
        purpose_of_visit: form.purpose_of_visit.trim(),
        reason: form.reason.trim(),
        date_of_leave: form.date_of_leave,
        time_of_entry: form.time_of_entry,
        hod_approval: false,
        status: 'PENDING',
        gate_pass_closed: false,
      };

      const response = await createGatePass(payload, token);
      if (!response?.success) {
        toast.error(response?.message || 'Failed to submit gate pass');
        return;
      }

      toast.success('Gate pass request submitted successfully');
      resetForm();
      await loadMyGatePasses();
    } catch (error) {
      toast.error(error?.message || 'Failed to submit gate pass');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1500px] space-y-4 sm:space-y-5">
        <section className="overflow-hidden rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-6 xl:p-8">
          <div className="border-b border-slate-100 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Gatepass Apply</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Gate Pass Request Form
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-6 sm:mt-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="mobile_number">
                  Mobile Number
                </label>
                <input
                  id="mobile_number"
                  name="mobile_number"
                  value={form.mobile_number}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="9876543210"
                  inputMode="tel"
                  maxLength={15}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="department">
                  Department
                </label>
                <input
                  id="department"
                  name="department"
                  value={form.department}
                  className={`${inputClasses} bg-slate-100`}
                  readOnly
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="date_of_leave">
                  Date Of Leave
                </label>
                <input
                  id="date_of_leave"
                  name="date_of_leave"
                  type="date"
                  value={form.date_of_leave}
                  onChange={handleChange}
                  className={inputClasses}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="time_of_entry">
                  Time Of Entry
                </label>
                <input
                  id="time_of_entry"
                  name="time_of_entry"
                  type="time"
                  value={form.time_of_entry}
                  onChange={handleChange}
                  className={inputClasses}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="purpose_of_visit">
                  Purpose Of Visit
                </label>
                <input
                  id="purpose_of_visit"
                  name="purpose_of_visit"
                  value={form.purpose_of_visit}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Enter visit purpose"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="employee_address">
                  Employee Address
                </label>
                <textarea
                  id="employee_address"
                  name="employee_address"
                  value={form.employee_address}
                  onChange={handleChange}
                  rows={5}
                  className={textareaClasses}
                  placeholder="Enter address details"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="reason">
                  Reason
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={5}
                  className={textareaClasses}
                  placeholder="Add supporting details"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                <RotateCcw size={16} className="mr-2" />
                Reset
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                <Send size={16} className="mr-2" />
                {submitting ? 'Submitting...' : 'Submit Gate Pass'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-6 xl:p-8">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                My Gatepass Status
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Applied By You</h2>
            </div>
            <button
              type="button"
              onClick={() => loadMyGatePasses()}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              Refresh
            </button>
          </div>

          {loadingMyGatePasses ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
              Loading your gate pass status...
            </div>
          ) : myGatePasses.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
              Aapka abhi koi gate pass apply nahi hai.
            </div>
          ) : (
            <>
              <div className="mt-5 space-y-3 xl:hidden">
                {myGatePasses.map((item) => {
                  const normalizedStatus = String(item?.status || 'PENDING').toUpperCase();
                  const statusClass = statusClasses[normalizedStatus] || statusClasses.PENDING;

                  return (
                    <article
                      key={item?.id || `${item?.name}-${item?.created_at}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Gatepass #{item?.id || '-'}
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-slate-900">
                            {item?.purpose_of_visit || item?.reason || 'Gate Pass Request'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">{item?.department || '-'}</p>
                        </div>
                        <div className="flex justify-start sm:justify-end">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}>
                            {normalizedStatus}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-white px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Leave Date</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(item?.date_of_leave)}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entry Time</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{formatTime(item?.time_of_entry)}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">HOD Approval</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {item?.hod_approval ? 'Approved' : 'Pending'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-white px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason</p>
                        <p className="mt-1 break-words text-sm text-slate-700">{item?.reason || '-'}</p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
                <div className="max-h-[70vh] overflow-auto">
                  <table className="min-w-[980px] w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">Purpose</th>
                        <th className="px-4 py-3 font-semibold">Department</th>
                        <th className="px-4 py-3 font-semibold">Leave Date</th>
                        <th className="px-4 py-3 font-semibold">Entry Time</th>
                        <th className="px-4 py-3 font-semibold">HOD</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Reason</th>
                        <th className="px-4 py-3 font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {myGatePasses.map((item) => {
                        const normalizedStatus = String(item?.status || 'PENDING').toUpperCase();
                        const statusClass = statusClasses[normalizedStatus] || statusClasses.PENDING;

                        return (
                          <tr key={item?.id || `${item?.name}-${item?.created_at}`} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-semibold text-slate-700">{item?.id || '-'}</td>
                            <td className="max-w-[220px] px-4 py-3 text-slate-700">
                              <div className="break-words">
                                {item?.purpose_of_visit || item?.reason || 'Gate Pass Request'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{item?.department || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatDate(item?.date_of_leave)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatTime(item?.time_of_entry)}</td>
                            <td className="px-4 py-3 text-slate-700">{item?.hod_approval ? 'Approved' : 'Pending'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}>
                                {normalizedStatus}
                              </span>
                            </td>
                            <td className="max-w-[280px] px-4 py-3 text-slate-700">
                              <div className="break-words">{item?.reason || '-'}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatDateTime(item?.created_at)}</td>
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
    </div>
  );
};

export default GatePassApply;
