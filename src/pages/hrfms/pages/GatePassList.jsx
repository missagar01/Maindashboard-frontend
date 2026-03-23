import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, FileText, Filter, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { useAutoSync } from '../hooks/useAutoSync';
import { getGatePasses, updateGatePass } from '../../../api/hrfms/gatePassApi';
import { isAdminUser } from '../../../utils/accessControl';
import {
  doesGatePassBelongToUser,
  getGatePassReviewAccess,
  normalizeDepartment,
} from '../utils/gatePassAccess';

const statusClasses = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  PENDING: 'bg-amber-100 text-amber-700',
};

const closureClasses = {
  OPEN: 'bg-sky-100 text-sky-700',
  CLOSED: 'bg-slate-200 text-slate-700',
};

const statusSortOrder = {
  PENDING: 0,
  REJECTED: 1,
  APPROVED: 2,
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

const sortGatePasses = (items) =>
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

const getHodApprovalLabel = (item) => {
  if (item?.hod_approval) {
    return 'Approved';
  }

  if (String(item?.status || '').toUpperCase() === 'REJECTED') {
    return 'Rejected';
  }

  return 'Pending';
};

const GatePassList = () => {
  const { token, user } = useAuth();
  const [gatePasses, setGatePasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [closureFilter, setClosureFilter] = useState('ALL');
  const [updatingActionKey, setUpdatingActionKey] = useState('');
  const hasLoadedListRef = useRef(false);

  const storedRole = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return localStorage.getItem('role') || '';
  }, []);

  const isAdmin = useMemo(
    () => isAdminUser(user) || storedRole.toLowerCase().includes('admin'),
    [storedRole, user]
  );

  const reviewAccess = useMemo(() => getGatePassReviewAccess(user || {}), [user]);
  const effectiveDepartments = reviewAccess.departments;
  const shouldHideOwnGatePasses = reviewAccess.role === 'hod';

  const loadGatePasses = useCallback(async () => {
    if (!token) {
      setGatePasses([]);
      hasLoadedListRef.current = false;
      return;
    }

    const showLoader = !hasLoadedListRef.current;
    if (showLoader) {
      setLoading(true);
    }

    try {
      const response = await getGatePasses(token);
      const data = Array.isArray(response?.data) ? response.data : [];
      setGatePasses(data);
      hasLoadedListRef.current = true;
    } catch (error) {
      toast.error(error?.message || 'Failed to load gate pass list');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [token]);

  useAutoSync(loadGatePasses, 15000);

  useEffect(() => {
    loadGatePasses();
  }, [loadGatePasses]);

  const handleHodDecision = useCallback(
    async (gatePassId, nextStatus) => {
      if (!token) {
        toast.error('Please login again before updating approval.');
        return;
      }

      const actionKey = `${gatePassId}:${nextStatus}`;
      setUpdatingActionKey(actionKey);

      try {
        const response = await updateGatePass(
          gatePassId,
          {
            hod_approval: nextStatus === 'APPROVED',
            status: nextStatus,
          },
          token
        );

        if (!response?.success) {
          toast.error(response?.message || 'Failed to update gate pass');
          return;
        }

        toast.success(
          nextStatus === 'APPROVED'
            ? 'Gate pass approved successfully'
            : 'Gate pass rejected successfully'
        );
        await loadGatePasses();
      } catch (error) {
        toast.error(error?.message || 'Failed to update gate pass');
      } finally {
        setUpdatingActionKey('');
      }
    },
    [loadGatePasses, token]
  );

  const scopedGatePasses = useMemo(() => {
    if (isAdmin) {
      return sortGatePasses(gatePasses);
    }

    if (effectiveDepartments.length === 0) {
      return [];
    }

    const allowedDepartments = new Set(
      effectiveDepartments.map((department) => normalizeDepartment(department)).filter(Boolean)
    );

    return sortGatePasses(
      gatePasses.filter(
        (item) =>
          allowedDepartments.has(normalizeDepartment(item?.department)) &&
          (!shouldHideOwnGatePasses || !doesGatePassBelongToUser(item, user))
      )
    );
  }, [effectiveDepartments, gatePasses, isAdmin, shouldHideOwnGatePasses, user]);

  const filteredGatePasses = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return scopedGatePasses.filter((item) => {
      const normalizedStatus = String(item?.status || 'PENDING').toUpperCase();
      const normalizedClosure = item?.gate_pass_closed ? 'CLOSED' : 'OPEN';
      const haystack = [
        item?.id,
        item?.name,
        item?.mobile_number,
        item?.department,
        item?.purpose_of_visit,
        item?.reason,
        item?.employee_address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (statusFilter !== 'ALL' && normalizedStatus !== statusFilter) {
        return false;
      }

      if (closureFilter !== 'ALL' && normalizedClosure !== closureFilter) {
        return false;
      }

      if (query && !haystack.includes(query)) {
        return false;
      }

      return true;
    });
  }, [closureFilter, scopedGatePasses, searchValue, statusFilter]);

  const summary = useMemo(() => {
    const total = scopedGatePasses.length;
    const pending = scopedGatePasses.filter(
      (item) => String(item?.status || 'PENDING').toUpperCase() === 'PENDING'
    ).length;
    const approved = scopedGatePasses.filter(
      (item) => String(item?.status || '').toUpperCase() === 'APPROVED'
    ).length;
    const closed = scopedGatePasses.filter((item) => item?.gate_pass_closed).length;

    return { total, pending, approved, closed };
  }, [scopedGatePasses]);

  const summaryCards = [
    {
      title: 'Total Requests',
      value: summary.total,
      icon: FileText,
      tone: 'from-slate-900 to-slate-700',
    },
    {
      title: 'Pending Review',
      value: summary.pending,
      icon: Clock3,
      tone: 'from-amber-500 to-orange-400',
    },
    {
      title: 'Approved',
      value: summary.approved,
      icon: CheckCircle2,
      tone: 'from-emerald-500 to-teal-400',
    },
    {
      title: 'Closed Passes',
      value: summary.closed,
      icon: ShieldCheck,
      tone: 'from-sky-500 to-indigo-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_45%,_#ffffff_100%)] py-4 sm:py-6 lg:py-8">
      <div className="w-full space-y-4 px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 px-5 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:px-7 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 sm:text-sm">
                Gatepass List
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                {isAdmin ? 'Review all gatepass requests.' : 'Review department-wise gatepass requests.'}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                {isAdmin
                  ? 'Admin login par sabhi departments ke gatepass records dikhte hain. Pending requests top me aur approved requests last me rehte hain.'
                  : 'Is page par sirf mapped department ke gatepass records dikhte hain. Pending requests top me aur approved requests last me rehte hain.'}
              </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Departments: {isAdmin ? 'All Departments' : effectiveDepartments.length > 0 ? effectiveDepartments.join(', ') : 'No access mapped'}
                </p>
              </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => loadGatePasses()}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </button>
              <Link
                to="/hrfms/gatepass-apply"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Apply New Gatepass
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className={`inline-flex rounded-2xl bg-gradient-to-br ${card.tone} p-3 text-white shadow-lg`}>
                    <Icon size={18} />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{card.value}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-6 lg:p-8">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_200px_200px]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Search
              </span>
              <div className="mt-1.5 flex items-center rounded-2xl border border-slate-300 bg-white px-3 py-2.5 shadow-sm focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100">
                <Search size={16} className="text-slate-400" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search by department, name, mobile, purpose or reason"
                  className="ml-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Closure
              </span>
              <select
                value={closureFilter}
                onChange={(event) => setClosureFilter(event.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              >
                <option value="ALL">All Requests</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Filter size={14} />
            Showing {filteredGatePasses.length} of {scopedGatePasses.length} requests
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-14 text-center text-sm text-slate-500">
              Loading gate pass list...
            </div>
          ) : !isAdmin && effectiveDepartments.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-14 text-center text-sm text-slate-500">
              Department access not found for this login.
            </div>
          ) : filteredGatePasses.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-14 text-center text-sm text-slate-500">
              No gate pass records match the current filters.
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-4 xl:hidden">
                {filteredGatePasses.map((item, index) => {
                  const normalizedStatus = String(item?.status || 'PENDING').toUpperCase();
                  const gateClosure = item?.gate_pass_closed ? 'CLOSED' : 'OPEN';
                  const statusClass = statusClasses[normalizedStatus] || statusClasses.PENDING;
                  const closureClass = closureClasses[gateClosure] || closureClasses.OPEN;
                  const isPending = normalizedStatus === 'PENDING';
                  const isApproving = updatingActionKey === `${item?.id}:APPROVED`;
                  const isRejecting = updatingActionKey === `${item?.id}:REJECTED`;
                  const isUpdating = isApproving || isRejecting;

                  return (
                    <article
                      key={item?.id || `${item?.name}-${item?.created_at}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                            S No. {index + 1}
                          </p>
                          <h3 className="mt-1 truncate text-base font-semibold text-slate-900">
                            {item?.name || '-'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">{item?.mobile_number || '-'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}>
                            {normalizedStatus}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${closureClass}`}>
                            {gateClosure}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Department</p>
                        <p className="mt-1 break-words text-sm text-slate-700">{item?.department || '-'}</p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Leave Date</p>
                          <p className="mt-1 font-medium text-slate-900">{formatDate(item?.date_of_leave)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entry Time</p>
                          <p className="mt-1 font-medium text-slate-900">{formatTime(item?.time_of_entry)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">HOD Approval</p>
                          <p className="mt-1 font-medium text-slate-900">{getHodApprovalLabel(item)}</p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Purpose</p>
                        <p className="mt-1 break-words text-sm text-slate-700">{item?.purpose_of_visit || '-'}</p>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason</p>
                        <p className="mt-1 break-words text-sm text-slate-700">{item?.reason || '-'}</p>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Address</p>
                        <p className="mt-1 break-words text-sm text-slate-700">{item?.employee_address || '-'}</p>
                      </div>

                      {isPending ? (
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleHodDecision(item?.id, 'APPROVED')}
                            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isApproving ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleHodDecision(item?.id, 'REJECTED')}
                            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isRejecting ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
                <div className="max-h-[72vh] overflow-auto">
                  <table className="min-w-[1080px] w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-semibold">S No</th>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Mobile</th>
                        <th className="px-4 py-3 font-semibold">Department</th>
                        <th className="px-4 py-3 font-semibold">Leave Date</th>
                        <th className="px-4 py-3 font-semibold">Entry Time</th>
                        <th className="px-4 py-3 font-semibold">Purpose</th>
                        <th className="px-4 py-3 font-semibold">Reason</th>
                        <th className="px-4 py-3 font-semibold">HOD</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Closure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredGatePasses.map((item, index) => {
                        const normalizedStatus = String(item?.status || 'PENDING').toUpperCase();
                        const gateClosure = item?.gate_pass_closed ? 'CLOSED' : 'OPEN';
                        const statusClass = statusClasses[normalizedStatus] || statusClasses.PENDING;
                        const closureClass = closureClasses[gateClosure] || closureClasses.OPEN;
                        const isPending = normalizedStatus === 'PENDING';
                        const isApproving = updatingActionKey === `${item?.id}:APPROVED`;
                        const isRejecting = updatingActionKey === `${item?.id}:REJECTED`;
                        const isUpdating = isApproving || isRejecting;

                        return (
                          <tr key={item?.id || `${item?.name}-${item?.created_at}`} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-semibold text-slate-700">{index + 1}</td>
                            <td className="px-4 py-3 text-slate-700">{item?.name || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{item?.mobile_number || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{item?.department || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatDate(item?.date_of_leave)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatTime(item?.time_of_entry)}</td>
                            <td className="max-w-[220px] px-4 py-3 text-slate-700">
                              <div className="break-words">{item?.purpose_of_visit || '-'}</div>
                            </td>
                            <td className="max-w-[240px] px-4 py-3 text-slate-700">
                              <div className="break-words">{item?.reason || '-'}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{getHodApprovalLabel(item)}</td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex min-w-[150px] flex-col items-start gap-2">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}>
                                  {normalizedStatus}
                                </span>
                                {isPending ? (
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleHodDecision(item?.id, 'APPROVED')}
                                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isApproving ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleHodDecision(item?.id, 'REJECTED')}
                                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isRejecting ? 'Rejecting...' : 'Reject'}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${closureClass}`}>
                                {gateClosure}
                              </span>
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
    </div>
  );
};

export default GatePassList;
