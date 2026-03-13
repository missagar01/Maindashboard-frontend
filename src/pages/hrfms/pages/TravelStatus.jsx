import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTickets } from '../../../api/hrfms/ticketApi';
import { useAuth } from '../../../context/AuthContext';
import useAutoSync from '../hooks/useAutoSync';

const getStatusClasses = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'booked') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (normalizedStatus === 'cancel') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-slate-100 text-slate-700';
};

const TravelStatus = () => {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewIsPdf, setPreviewIsPdf] = useState(false);

  const employeeCode = user?.employee_id || user?.employee_code || '';
  const filteredTickets = useMemo(
    () => tickets.filter((item) => item?.booked_employee_code === employeeCode),
    [tickets, employeeCode]
  );

  const ticketStats = useMemo(() => {
    const total = filteredTickets.length;
    const booked = filteredTickets.filter(
      (ticket) => String(ticket.status || '').toLowerCase() === 'booked'
    ).length;
    const cancelled = filteredTickets.filter(
      (ticket) => String(ticket.status || '').toLowerCase() === 'cancel'
    ).length;

    return { total, booked, cancelled };
  }, [filteredTickets]);

  const closePreview = useCallback(() => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    setPreviewImage('');
    setPreviewError(false);
    setPreviewLoading(false);
    setPreviewIsPdf(false);
  }, [previewImage]);

  const loadTickets = useCallback(
    async (isAutoSync = false) => {
      if (!token) {
        return;
      }

      if (!isAutoSync) {
        setLoading(true);
      }

      try {
        const response = await getTickets(token);
        const data = response?.data ?? [];
        setTickets(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(error?.message || 'Failed to load tickets');
      } finally {
        if (!isAutoSync) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useAutoSync(() => loadTickets(true), 20000);

  useEffect(() => {
    if (!(previewImage || previewLoading || previewError)) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [previewError, previewImage, previewLoading]);

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  const handlePreviewOpen = async (url) => {
    if (!url) {
      return;
    }

    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    setPreviewError(false);
    setPreviewLoading(true);
    setPreviewIsPdf(false);

    try {
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error('Image failed to load.');
      }

      const contentType = response.headers.get('content-type') || '';
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      setPreviewIsPdf(contentType.includes('pdf'));
      setPreviewImage(objectUrl);
    } catch (error) {
      setPreviewError(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8">
      <div className="space-y-4 px-3 pb-10 sm:space-y-6 sm:px-6 lg:px-10">
        <section className="rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 p-5 shadow-2xl ring-1 ring-white/30 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80 sm:text-sm">
                Tickets
              </p>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Travel Status
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100 sm:text-base">
                Track booked tickets, review bill uploads, and check the latest status from a
                mobile-friendly view.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-white">
                <Ticket size={18} />
                <span className="text-sm font-semibold">HR FMS</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-indigo-100 sm:text-xs">
                <span className="font-semibold text-white">Employee Code</span>
                <span>{employeeCode || '-'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-xl sm:p-8">
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Total tickets', value: ticketStats.total, accent: 'bg-indigo-50 text-indigo-700' },
              { label: 'Booked', value: ticketStats.booked, accent: 'bg-emerald-50 text-emerald-700' },
              { label: 'Cancelled', value: ticketStats.cancelled, accent: 'bg-rose-50 text-rose-700' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl border border-gray-100 p-4 shadow-sm ${stat.accent}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em]">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold sm:text-3xl">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">My Travel Tickets</h2>
              <p className="text-xs text-gray-500 sm:text-sm">
                Cards are shown on mobile. Full table is available on larger screens.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No tickets found.</div>
          ) : (
            <>
              <div className="space-y-4 md:hidden">
                {filteredTickets.map((ticket) => {
                  const statusLabel = ticket.status || '-';

                  return (
                    <article
                      key={ticket.id}
                      className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
                            Person Name
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-gray-900">
                            {ticket.person_name || '-'}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Booked By: {ticket.booked_name || '-'}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusClasses(
                            statusLabel
                          )}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Request Code
                          </p>
                          <p className="mt-1 break-words text-sm text-gray-900">
                            {ticket.request_employee_code || '-'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Bill Number
                          </p>
                          <p className="mt-1 break-words text-sm text-gray-900">
                            {ticket.bill_number || '-'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Type
                          </p>
                          <p className="mt-1 text-sm text-gray-900">{ticket.type_of_bill || '-'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Charges
                          </p>
                          <p className="mt-1 text-sm text-gray-900">{ticket.charges || '-'}</p>
                        </div>
                        <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Total Amount
                          </p>
                          <p className="mt-1 text-sm text-gray-900">{ticket.total_amount || '-'}</p>
                        </div>
                      </div>

                      {ticket.upload_bill_image ? (
                        <button
                          type="button"
                          onClick={() => handlePreviewOpen(ticket.upload_bill_image)}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                          <ExternalLink size={16} />
                          View Bill
                        </button>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-2.5 text-center text-sm text-gray-400">
                          Bill image not available
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="hidden w-full overflow-x-auto md:block">
                <table className="w-full min-w-[1000px] divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Person Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Request Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Booked Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Bill Number</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Charges</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Total</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Bill Image</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredTickets.map((ticket) => {
                      const statusLabel = ticket.status || '-';

                      return (
                        <tr key={ticket.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(
                                statusLabel
                              )}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3">{ticket.person_name || '-'}</td>
                          <td className="px-4 py-3">{ticket.request_employee_code || '-'}</td>
                          <td className="px-4 py-3">{ticket.booked_name || '-'}</td>
                          <td className="px-4 py-3">{ticket.bill_number || '-'}</td>
                          <td className="px-4 py-3">{ticket.type_of_bill || '-'}</td>
                          <td className="px-4 py-3">{ticket.charges || '-'}</td>
                          <td className="px-4 py-3">{ticket.total_amount || '-'}</td>
                          <td className="px-4 py-3">
                            {ticket.upload_bill_image ? (
                              <button
                                type="button"
                                onClick={() => handlePreviewOpen(ticket.upload_bill_image)}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                              >
                                <ExternalLink size={14} />
                                View
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {(previewImage || previewLoading || previewError) && (
          <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-4">
            <div className="flex h-full w-full items-end justify-center sm:items-center">
              <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-5">
                  <p className="text-sm font-semibold text-gray-700 sm:text-base">Bill Image</p>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4 sm:p-5">
                  {previewLoading && (
                    <div className="py-12 text-center text-sm text-gray-600">Loading image...</div>
                  )}
                  {!previewLoading && previewError && (
                    <div className="py-12 text-center text-sm text-gray-600">
                      Image failed to load.
                    </div>
                  )}
                  {!previewLoading && !previewError && previewImage && (
                    previewIsPdf ? (
                      <iframe
                        title="Bill PDF"
                        src={previewImage}
                        className="h-[70vh] w-full rounded-lg border border-gray-200"
                      />
                    ) : (
                      <img
                        src={previewImage}
                        alt="Bill"
                        className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelStatus;
