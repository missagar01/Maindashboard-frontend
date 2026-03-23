import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileText, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { useAutoSync } from '../hooks/useAutoSync';
import { getGatePasses, updateGatePass } from '../../../api/hrfms/gatePassApi';

const closureClasses = {
  OPEN: 'bg-sky-100 text-sky-700',
  CLOSED: 'bg-slate-200 text-slate-700',
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
    const rightTime = new Date(right?.created_at || right?.updated_at || 0).getTime();
    const leftTime = new Date(left?.created_at || left?.updated_at || 0).getTime();

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return Number(right?.id || 0) - Number(left?.id || 0);
  });

const GatePassApprovedList = () => {
  const { token } = useAuth();
  const [gatePasses, setGatePasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [closingGatePassId, setClosingGatePassId] = useState('');
  const hasLoadedListRef = useRef(false);

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
      toast.error(error?.message || 'Failed to load approved gate pass list');
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

  const handleCloseGatePass = useCallback(
    async (gatePassId) => {
      if (!token) {
        toast.error('Please login again before closing the pass.');
        return;
      }

      setClosingGatePassId(String(gatePassId));

      try {
        const response = await updateGatePass(
          gatePassId,
          {
            gate_pass_closed: true,
          },
          token
        );

        if (!response?.success) {
          toast.error(response?.message || 'Failed to close gate pass');
          return;
        }

        toast.success('Gate pass closed successfully');
        setGatePasses((currentItems) =>
          currentItems.filter((item) => String(item?.id) !== String(gatePassId))
        );
      } catch (error) {
        toast.error(error?.message || 'Failed to close gate pass');
      } finally {
        setClosingGatePassId('');
      }
    },
    [loadGatePasses, token]
  );

  const approvedGatePasses = useMemo(
    () =>
      sortGatePasses(gatePasses).filter(
        (item) =>
          String(item?.status || '').toUpperCase() === 'APPROVED' &&
          !item?.gate_pass_closed
      ),
    [gatePasses]
  );

  const filteredGatePasses = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return approvedGatePasses.filter((item) => {
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

      if (query && !haystack.includes(query)) {
        return false;
      }

      return true;
    });
  }, [approvedGatePasses, searchValue]);

  const summary = useMemo(() => {
    const total = approvedGatePasses.length;
    const departments = new Set(
      approvedGatePasses.map((item) => String(item?.department || '').trim()).filter(Boolean)
    ).size;

    return { total, departments };
  }, [approvedGatePasses]);

  const summaryCards = [
    {
      title: 'Approved Requests',
      value: summary.total,
      icon: CheckCircle2,
      tone: 'from-emerald-500 to-teal-400',
    },
    {
      title: 'Ready To Close',
      value: summary.total,
      icon: ShieldCheck,
      tone: 'from-sky-500 to-cyan-400',
    },
    {
      title: 'Visible Records',
      value: filteredGatePasses.length,
      icon: FileText,
      tone: 'from-slate-900 to-slate-700',
    },
    {
      title: 'Departments',
      value: summary.departments,
      icon: FileText,
      tone: 'from-violet-500 to-fuchsia-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#ecfdf5_45%,_#ffffff_100%)] py-4 sm:py-6 lg:py-8">
      <div className="w-full space-y-4 px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 px-5 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:px-7 lg:px-8">
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
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Search
              </span>
              <div className="mt-1.5 flex items-center rounded-2xl border border-slate-300 bg-white px-3 py-2.5 shadow-sm focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100">
                <Search size={16} className="text-slate-400" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search by department, name, mobile, purpose or reason"
                  className="ml-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>
          </div>

          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Showing {filteredGatePasses.length} of {approvedGatePasses.length} open approved requests
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-14 text-center text-sm text-slate-500">
              Loading approved gate pass list...
            </div>
          ) : filteredGatePasses.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-14 text-center text-sm text-slate-500">
              No approved gate pass records found.
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-4 xl:hidden">
                {filteredGatePasses.map((item, index) => {
                  const gateClosure = item?.gate_pass_closed ? 'CLOSED' : 'OPEN';
                  const closureClass = closureClasses[gateClosure] || closureClasses.OPEN;
                  const isClosing = closingGatePassId === String(item?.id);
                  const canClose = !item?.gate_pass_closed;

                  return (
                    <article
                      key={item?.id || `${item?.name}-${item?.created_at}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                            S No. {index + 1}
                          </p>
                          <h3 className="mt-1 truncate text-base font-semibold text-slate-900">
                            {item?.name || '-'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">{item?.mobile_number || '-'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            APPROVED
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
                          <p className="mt-1 font-medium text-slate-900">{item?.hod_approval ? 'Approved' : 'Pending'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created</p>
                          <p className="mt-1 font-medium text-slate-900">{formatDateTime(item?.created_at)}</p>
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

                      {canClose ? (
                        <div className="mt-4">
                          <button
                            type="button"
                            disabled={isClosing}
                            onClick={() => handleCloseGatePass(item?.id)}
                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isClosing ? 'Closing...' : 'Close Pass'}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
                <div className="max-h-[72vh] overflow-auto">
                  <table className="min-w-[1120px] w-full divide-y divide-slate-200 text-left text-sm">
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
                        <th className="px-4 py-3 font-semibold">Closure</th>
                        <th className="px-4 py-3 font-semibold">Created</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredGatePasses.map((item, index) => {
                        const gateClosure = item?.gate_pass_closed ? 'CLOSED' : 'OPEN';
                        const closureClass = closureClasses[gateClosure] || closureClasses.OPEN;
                        const isClosing = closingGatePassId === String(item?.id);
                        const canClose = !item?.gate_pass_closed;

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
                            <td className="px-4 py-3 text-slate-700">{item?.hod_approval ? 'Approved' : 'Pending'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${closureClass}`}>
                                {gateClosure}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatDateTime(item?.created_at)}</td>
                            <td className="px-4 py-3">
                              {canClose ? (
                                <button
                                  type="button"
                                  disabled={isClosing}
                                  onClick={() => handleCloseGatePass(item?.id)}
                                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isClosing ? 'Closing...' : 'Close Pass'}
                                </button>
                              ) : (
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Closed
                                </span>
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
    </div>
  );
};

export default GatePassApprovedList;
