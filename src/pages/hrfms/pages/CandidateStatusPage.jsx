import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { X, Send, RefreshCcw } from 'lucide-react';
import { getResumes, updateResumes, getByIdResumes } from '../../../api/hrfms/resumeApi';
import { useAuth } from '../../../context/AuthContext';
import useAutoSync from '../hooks/useAutoSync';

const getBadgeClass = (value, variant = 'default') => {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (variant === 'interviewer') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (normalizedValue === 'selected' || normalizedValue === 'shortlisted') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (normalizedValue === 'rejected') {
    return 'bg-rose-50 text-rose-700';
  }

  return 'bg-amber-50 text-amber-700';
};

const CandidateStatus = () => {
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState({
    candidate_status: '',
  });

  const fetchResumes = useCallback(
    async (isAutoSync = false) => {
      if (!token) {
        setRows([]);
        return;
      }

      if (!isAutoSync) {
        setLoading(true);
      }

      try {
        const res = await getResumes(token);

        if (res?.success) {
          const list = Array.isArray(res.data) ? res.data : [];
          const filtered = list.filter(
            (row) => String(row?.interviewer_status ?? '').trim().toLowerCase() === 'yes'
          );

          setRows(filtered);
        } else {
          toast.error(res?.message || 'Failed to load resumes');
          setRows([]);
        }
      } catch (err) {
        console.error(err);
        toast.error(err?.message || 'Failed to load resumes');
        setRows([]);
      } finally {
        if (!isAutoSync) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useAutoSync(() => fetchResumes(true), 10000);

  const openModal = async (id) => {
    try {
      setSelectedId(id);
      setOpen(true);

      const res = await getByIdResumes(id, token);
      const row = res?.data ?? res?.data?.data ?? res ?? null;

      setEditForm({
        candidate_status: row?.candidate_status ?? '',
      });
    } catch (error) {
      toast.error('Unable to open candidate');
      setOpen(false);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setSelectedId(null);
    setEditForm({ candidate_status: '' });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedId) {
      return;
    }

    if (!editForm.candidate_status?.trim()) {
      toast.error('Candidate Status required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = { candidate_status: editForm.candidate_status.trim() };

      await updateResumes(selectedId, payload, token);

      toast.success('Updated successfully');
      closeModal();
      fetchResumes();
    } catch (error) {
      toast.error('Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h1 className="text-lg font-semibold text-white sm:text-xl">Candidate List</h1>
              <p className="text-xs text-indigo-100 sm:text-sm">Only Interviewer Status = Yes</p>
            </div>

            <button
              type="button"
              onClick={() => fetchResumes()}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              <RefreshCcw size={16} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="p-3 sm:p-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-600">Loading...</div>
              ) : rows.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-600">No records found</div>
              ) : (
                <>
                  <div className="space-y-4 p-3 md:hidden">
                    {rows.map((row) => (
                      <article
                        key={row.id}
                        className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                                Req ID: {row.req_id || '-'}
                              </p>
                              <h3 className="mt-1 text-sm font-semibold text-gray-900">
                                {row.candidate_name || '-'}
                              </h3>
                              <p className="mt-1 break-all text-xs text-gray-500">
                                {row.candidate_email || '-'}
                              </p>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getBadgeClass(
                                row.candidate_status
                              )}`}
                            >
                              {row.candidate_status || 'Pending'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getBadgeClass(
                                row.interviewer_status,
                                'interviewer'
                              )}`}
                            >
                              Interview: {row.interviewer_status || '-'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Applied For
                              </p>
                              <p className="mt-1 break-words">{row.applied_for_designation || '-'}</p>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Mobile
                              </p>
                              <p className="mt-1">{row.candidate_mobile || '-'}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openModal(row.id)}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                          >
                            Process
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <div className="max-h-[70vh] overflow-y-auto">
                      <table className="w-full min-w-[1100px] text-left text-sm">
                        <thead className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                          <tr>
                            <th className="sticky left-0 z-30 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 whitespace-nowrap">
                              Req ID
                            </th>
                            <th className="px-4 py-3 whitespace-nowrap">Candidate</th>
                            <th className="px-4 py-3 whitespace-nowrap">Mobile</th>
                            <th className="px-4 py-3 whitespace-nowrap">Applied For</th>
                            <th className="px-4 py-3 whitespace-nowrap">Interview Status</th>
                            <th className="px-4 py-3 whitespace-nowrap">Candidate Status</th>
                            <th className="sticky right-0 z-30 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 whitespace-nowrap text-right">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                          {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                              <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                {row.req_id}
                              </td>

                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 whitespace-nowrap">
                                  {row.candidate_name}
                                </div>
                                <div className="max-w-[260px] truncate text-xs text-gray-500">
                                  {row.candidate_email}
                                </div>
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                {row.candidate_mobile}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                {row.applied_for_designation}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                  {row.interviewer_status}
                                </span>
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                {row.candidate_status ?? '-'}
                              </td>

                              <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openModal(row.id)}
                                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                                >
                                  Process
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Cards are shown on mobile. Full table is available on larger screens.
            </div>
          </div>
        </div>

        {open && (
          <div className="fixed inset-0 z-50 bg-black/40 p-0 sm:p-4">
            <div className="flex h-full w-full items-end justify-center sm:items-center">
              <div className="w-full bg-white shadow-xl sm:max-w-xl sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                  <h2 className="text-base font-semibold text-gray-900">Update Candidate Status</h2>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5">
                  <div className="w-full">
                    <label
                      className="block text-sm font-medium text-gray-700"
                      htmlFor="candidate_status"
                    >
                      Candidate Status
                    </label>

                    <select
                      id="candidate_status"
                      name="candidate_status"
                      value={editForm.candidate_status}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Selected">Selected</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-full rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 sm:w-auto"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    >
                      <Send size={16} className="mr-2" />
                      {submitting ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateStatus;
