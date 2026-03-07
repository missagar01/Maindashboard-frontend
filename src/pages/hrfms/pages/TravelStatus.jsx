import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Ticket, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTickets } from '../../../api/hrfms/ticketApi';
import { useAuth } from '../../../context/AuthContext';
import useAutoSync from '../hooks/useAutoSync';

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

  const loadTickets = useCallback(async (isAutoSync = false) => {
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
  }, [token]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Enable auto-sync every 20 seconds
  useAutoSync(() => loadTickets(true), 20000);

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
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="space-y-6 px-4 pb-10 sm:px-6 lg:px-10">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 p-6 sm:p-8 shadow-2xl mb-5 ring-1 ring-white/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-white">Tickets</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Travel Status</h1>
              <p className="mt-1 text-sm text-indigo-100">
                Track tickets booked by your employee code and review the latest bills.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-white">
                <Ticket size={18} />
                <span className="text-sm font-semibold">HR FMS</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs text-indigo-100 uppercase tracking-wider">
                <span className="font-semibold text-white">Employee Code:</span>
                <span>{employeeCode || '–'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl">
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {[
              { label: 'Total tickets', value: ticketStats.total, accent: 'bg-indigo-50 text-indigo-700' },
              { label: 'Booked', value: ticketStats.booked, accent: 'bg-emerald-50 text-emerald-700' },
              { label: 'Cancelled', value: ticketStats.cancelled, accent: 'bg-rose-50 text-rose-700' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`flex flex-col rounded-2xl border border-gray-100 p-4 shadow-sm ${stat.accent}`}
              >
                <span className="text-xs font-semibold uppercase tracking-widest">{stat.label}</span>
                <span className="mt-2 text-2xl font-bold">{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="w-full overflow-x-auto">
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
                {loading && (
                  <tr>
                    <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                      Loading tickets...
                    </td>
                  </tr>
                )}
                {!loading && filteredTickets.map((ticket) => {
                  const statusLabel = ticket.status || '-';
                  const statusValue = String(ticket.status || '').toLowerCase();
                  const statusClass = statusValue === 'booked'
                    ? 'bg-emerald-100 text-emerald-700'
                    : statusValue === 'cancel'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-700';

                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass}`}>
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
                {!loading && filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                      No tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(previewImage || previewLoading || previewError) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <p className="text-sm font-semibold text-gray-700">Bill Image</p>
                <button
                  type="button"
                  onClick={() => {
                    if (previewImage) {
                      URL.revokeObjectURL(previewImage);
                    }
                    setPreviewImage('');
                    setPreviewError(false);
                    setPreviewLoading(false);
                    setPreviewIsPdf(false);
                  }}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"

                >
                  Close
                </button>
              </div>
              <div className="mt-4 flex max-h-[75vh] justify-center overflow-auto">
                {previewLoading && (
                  <div className="text-center text-sm text-gray-600">Loading image...</div>
                )}
                {!previewLoading && previewError && (
                  <div className="text-center text-sm text-gray-600">Image failed to load.</div>
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
                      className="max-h-[70vh] w-auto rounded-lg object-contain"
                    />
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelStatus;
