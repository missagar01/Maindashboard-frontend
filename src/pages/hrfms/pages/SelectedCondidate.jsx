import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoSync } from '../hooks/useAutoSync';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  getByIdResumes,
  getSelectCondidate,
  updateResumes,
} from '../../../api/hrfms/resumeApi';
import { Download, RefreshCcw, Send, X } from 'lucide-react';

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
};

const getInterviewStatusClasses = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'yes') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (normalizedStatus === 'no') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-slate-100 text-slate-700';
};

const getJoinedStatusClasses = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'yes') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (normalizedStatus === 'no') {
    return 'bg-rose-50 text-rose-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const SelectedCondidate = () => {
  const { token } = useAuth();

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState({
    joined_status: '',
  });

  const fetchResumes = useCallback(
    async (isAutoSync = false) => {
      if (!token) {
        return;
      }

      if (!isAutoSync) {
        setLoading(true);
      }

      try {
        const response = await getSelectCondidate(token);
        if (response?.success) {
          const list = Array.isArray(response.data) ? response.data : [];
          setRows(list);
          setCount(response.count ?? list.length);
        } else {
          if (!isAutoSync) {
            toast.error(response?.message || 'Failed to load resumes');
          }
          setRows([]);
          setCount(0);
        }
      } catch (error) {
        console.error(error);
        if (!isAutoSync) {
          toast.error(error?.message || 'Failed to load resumes');
        }
        setRows([]);
        setCount(0);
      } finally {
        if (!isAutoSync) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  useAutoSync(() => fetchResumes(true), 15000);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

  const tableRows = useMemo(() => rows, [rows]);

  const openModal = async (id) => {
    try {
      setSelectedId(id);
      setOpen(true);

      const response = await getByIdResumes(id, token);
      const row = response?.data ?? response?.data?.data ?? response ?? null;

      setEditForm({
        joined_status: String(row?.joined_status ?? '').trim(),
      });
    } catch (error) {
      toast.error('Unable to open candidate');
      setOpen(false);
      setSelectedId(null);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setSelectedId(null);
    setEditForm({ joined_status: '' });
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

    if (!editForm.joined_status?.trim()) {
      toast.error('Joined Status required');
      return;
    }

    try {
      setSubmitting(true);

      const payload = { joined_status: editForm.joined_status.trim() };
      const response = await updateResumes(selectedId, payload, token);

      if (response?.success === false) {
        toast.error(response?.message || 'Update failed');
        return;
      }

      toast.success('Updated successfully');
      closeModal();
      fetchResumes();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadResume = async (url, filename) => {
    if (!url) {
      return;
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to download');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = downloadUrl;
      link.download = filename || 'resume';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Resume downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download resume');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-10">
      <div className="mx-auto w-full max-w-none px-3 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="border-b bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 sm:px-8 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white sm:text-xl">
                  Resume List (Selected Candidates)
                </h3>
                <p className="mt-1 text-sm text-indigo-100">
                  Total: <span className="font-semibold">{count}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchResumes()}
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-70 sm:w-auto"
              >
                <RefreshCcw size={16} className="mr-2" />
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading resumes...</div>
            ) : tableRows.length === 0 ? (
              <div className="py-10 text-center text-gray-500">No resumes found.</div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-gray-800 sm:text-base">
                      Selected Candidates
                    </p>
                    <p className="text-xs text-gray-500 sm:text-sm">
                      Cards are shown on mobile. Full table is available on larger screens.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-4 md:hidden">
                  {tableRows.map((row) => (
                    <article
                      key={row.id}
                      className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
                            Req ID
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-gray-900">
                            {row.req_id || '-'}
                          </h3>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {row.candidate_name || '-'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.previous_company || 'No previous company'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getInterviewStatusClasses(
                              row.interviewer_status
                            )}`}
                          >
                            Interview {row.interviewer_status || '-'}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getJoinedStatusClasses(
                              row.joined_status
                            )}`}
                          >
                            Joined {row.joined_status || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Applied For
                          </p>
                          <p className="mt-1 break-words text-sm text-gray-900">
                            {row.applied_for_designation || '-'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Mobile
                            </p>
                            <p className="mt-1 break-words text-sm text-gray-900">
                              {row.candidate_mobile || '-'}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Experience
                            </p>
                            <p className="mt-1 text-sm text-gray-900">{row.experience ?? '-'}</p>
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Email
                          </p>
                          <p className="mt-1 break-words text-sm text-gray-900">
                            {row.candidate_email || '-'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Previous Salary
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              {row.previous_salary ?? '-'}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Created
                            </p>
                            <p className="mt-1 text-sm text-gray-900">
                              {formatDateTime(row.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3">
                        {row.resume ? (
                          <button
                            type="button"
                            onClick={() =>
                              downloadResume(
                                row.resume,
                                `${row.candidate_name || 'resume'}-${row.req_id || row.id}`
                              )
                            }
                            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                          >
                            <Download size={16} className="mr-2" />
                            Download Resume
                          </button>
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-2.5 text-center text-sm text-gray-400">
                            Resume not available
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => openModal(row.id)}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                          Process
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <div className="max-h-[70vh] overflow-y-auto">
                    <table className="w-full min-w-[1250px] text-left text-sm">
                      <thead className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        <tr>
                          <th className="sticky left-0 z-30 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 whitespace-nowrap">
                            Req ID
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">Candidate</th>
                          <th className="px-4 py-3 whitespace-nowrap">Mobile</th>
                          <th className="px-4 py-3 whitespace-nowrap">Email</th>
                          <th className="px-4 py-3 whitespace-nowrap">Applied For</th>
                          <th className="px-4 py-3 whitespace-nowrap">Exp</th>
                          <th className="px-4 py-3 whitespace-nowrap">Prev Salary</th>
                          <th className="px-4 py-3 whitespace-nowrap">Interview Status</th>
                          <th className="px-4 py-3 whitespace-nowrap">Joined?</th>
                          <th className="px-4 py-3 whitespace-nowrap">Resume</th>
                          <th className="px-4 py-3 whitespace-nowrap">Created</th>
                          <th className="sticky right-0 z-30 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 whitespace-nowrap text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 bg-white">
                        {tableRows.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                              {row.req_id || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[240px] truncate text-sm font-medium text-gray-900">
                                {row.candidate_name || '-'}
                              </div>
                              <div className="max-w-[240px] truncate text-xs text-gray-500">
                                {row.previous_company || ''}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                              {row.candidate_mobile || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[260px] truncate text-gray-900">
                                {row.candidate_email || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[220px] truncate text-gray-900">
                                {row.applied_for_designation || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                              {row.experience ?? '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                              {row.previous_salary ?? '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getInterviewStatusClasses(
                                  row.interviewer_status
                                )}`}
                              >
                                {row.interviewer_status || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getJoinedStatusClasses(
                                  row.joined_status
                                )}`}
                              >
                                {row.joined_status || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {row.resume ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadResume(
                                      row.resume,
                                      `${row.candidate_name || 'resume'}-${row.req_id || row.id}`
                                    )
                                  }
                                  className="inline-flex items-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                                >
                                  <Download size={14} className="mr-1.5" />
                                  Download
                                </button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                              {formatDateTime(row.created_at)}
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
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 p-0 sm:p-4">
          <div className="flex h-full w-full items-end justify-center sm:items-center">
            <div className="w-full overflow-hidden bg-white shadow-xl sm:max-w-xl sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-5">
                <h2 className="text-base font-semibold text-gray-900">Update Joined Status</h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-5">
                <div className="w-full">
                  <label
                    className="block text-sm font-medium text-gray-700"
                    htmlFor="joined_status"
                  >
                    Joined Status
                  </label>

                  <select
                    id="joined_status"
                    name="joined_status"
                    value={editForm.joined_status}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="mt-6 flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
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
  );
};

export default SelectedCondidate;
