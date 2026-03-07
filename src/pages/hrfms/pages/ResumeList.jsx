import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { getResumes, updateResumes, getByIdResumes } from "../../../api/hrfms/resumeApi";
import { RefreshCcw, X, FileText, Image as ImageIcon, Send, Calendar, Download } from "lucide-react";
import useAutoSync from "../hooks/useAutoSync";

const isImageUrl = (url = "") =>
  /\.(png|jpg|jpeg|webp|gif)$/i.test(url.split("?")[0]);

const isPdfUrl = (url = "") =>
  /\.pdf$/i.test(url.split("?")[0]);

const ResumeList = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // ✅ preview modal
  const [open, setOpen] = useState(false);
  const [activeTitle, setActiveTitle] = useState("");
  const [activeUrl, setActiveUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewKind, setPreviewKind] = useState("other");

  // ✅ edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingResume, setEditingResume] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    interviewer_planned_at: '',
    interviewer_actual_at: '',
    interviewer_status: '',
  });

  const fetchResumes = useCallback(async (isAutoSync = false) => {
    if (!token) return;
    if (!isAutoSync) {
      setLoading(true);
    }
    try {
      const res = await getResumes(token);
      if (res?.success) {
        setRows(Array.isArray(res.data) ? res.data : []);
        setCount(res.count ?? (Array.isArray(res.data) ? res.data.length : 0));
      } else {
        toast.error(res?.message || "Failed to load resumes");
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load resumes");
    } finally {
      if (!isAutoSync) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // Enable auto-sync every 10 seconds
  useAutoSync(() => fetchResumes(true), 10000);

  // ✅ close preview modal on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closePreviewModal();
        closeEditModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const closePreviewModal = () => {
    setOpen(false);
    setActiveTitle("");
    setActiveUrl("");
    if (previewSrc) {
      URL.revokeObjectURL(previewSrc);
    }
    setPreviewSrc("");
    setPreviewKind("other");
    setPreviewLoading(false);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditingResume(null);
    setEditForm({
      interviewer_planned_at: '',
      interviewer_actual_at: '',
      interviewer_status: '',
    });
  };

  // ✅ open preview modal
  const openPreview = async (url, title = "Resume Preview") => {
    if (!url) return;

    if (previewSrc) URL.revokeObjectURL(previewSrc);
    setPreviewSrc("");
    setPreviewKind("other");
    setPreviewLoading(true);

    setActiveUrl(url);
    setActiveTitle(title);
    setOpen(true);

    try {
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) throw new Error('Failed to fetch');
      const blob = await resp.blob();
      const contentType = resp.headers.get("content-type") || "";
      const objectUrl = URL.createObjectURL(blob);

      setPreviewSrc(objectUrl);

      if (contentType.includes("image/")) setPreviewKind("image");
      else if (contentType.includes("pdf")) setPreviewKind("pdf");
      else {
        if (isImageUrl(url)) setPreviewKind("image");
        else if (isPdfUrl(url)) setPreviewKind("pdf");
        else setPreviewKind("other");
      }
    } catch (e) {
      console.error("Preview load failed:", e);
      toast.error("Preview not loading. (uploads auth / file not found)");
    } finally {
      setPreviewLoading(false);
    }
  };

  // ✅ download resume
  const downloadResume = async (url, filename) => {
    if (!url) return;
    try {
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) throw new Error('Failed to download');
      const blob = await resp.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename || "resume";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Resume downloaded successfully");
    } catch (e) {
      console.error("Download failed:", e);
      toast.error("Failed to download resume");
    }
  };

  // ✅ open edit modal
  const openEditModal = async (resume) => {
    setEditingResume(resume);

    // Convert timestamp to datetime-local format
    const formatDateTimeLocal = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      // Format: YYYY-MM-DDTHH:mm
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setEditForm({
      interviewer_planned_at: formatDateTimeLocal(resume.interviewer_planned),
      interviewer_actual_at: formatDateTimeLocal(resume.interviewer_actual),
      interviewer_status: resume.interviewer_status || '',
    });
    setEditOpen(true);
  };

  // ✅ handle edit form change
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // ✅ submit edit form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!token || !editingResume) return;

    setSubmitting(true);
    try {
      const payload = new FormData();

      // Handle timestamp fields - convert datetime-local to ISO string
      if (editForm.interviewer_planned_at && editForm.interviewer_planned_at !== '') {
        const date = new Date(editForm.interviewer_planned_at);
        if (!isNaN(date.getTime())) {
          payload.append('interviewer_planned', date.toISOString());
        }
      }

      if (editForm.interviewer_actual_at && editForm.interviewer_actual_at !== '') {
        const date = new Date(editForm.interviewer_actual_at);
        if (!isNaN(date.getTime())) {
          payload.append('interviewer_actual', date.toISOString());
        }
      }

      if (editForm.interviewer_status) {
        payload.append('interviewer_status', editForm.interviewer_status);
      }

      const response = await updateResumes(editingResume.id, payload, token);

      if (response?.success) {
        toast.success('Resume updated successfully!');
        closeEditModal();
        fetchResumes();
      } else {
        toast.error(response?.message || 'Failed to update resume');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error?.message || 'Failed to update resume');
    } finally {
      setSubmitting(false);
    }
  };

  const iconForResume = (url) => {
    if (isImageUrl(url)) return <ImageIcon size={14} className="mr-1" />;
    return <FileText size={14} className="mr-1" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-none px-3 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="border-b bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 sm:px-8 sm:py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                  MainPower Request List
                </h3>
                <p className="mt-1 text-sm text-indigo-100">
                  Total: <span className="font-semibold">{count}</span>
                </p>
              </div>

              <button
                onClick={fetchResumes}
                disabled={loading}
                className="inline-flex items-center rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-70"
              >
                <RefreshCcw size={16} className="mr-2" />
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="p-5 sm:p-8">
            {loading ? (
              <div className="py-10 text-center text-gray-500">
                Loading resumes...
              </div>
            ) : rows.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No resumes found.
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
                  <table className="min-w-full table-fixed divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                          Req ID
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-52">
                          Candidate
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                          Mobile
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">
                          Email
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                          Applied For
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Exp
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Prev Salary
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                          Status
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                          Resume
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                          Created
                        </th>
                        <th className="sticky top-0 z-30 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {rows.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {r.req_id || "-"}
                          </td>

                          <td className="px-4 py-3">
                            <div className="truncate text-sm font-medium text-gray-900">
                              {r.candidate_name || "-"}
                            </div>
                            <div className="truncate text-xs text-gray-500">
                              {r.previous_company || ""}
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {r.candidate_mobile || "-"}
                          </td>

                          <td className="px-4 py-3">
                            <div className="truncate text-sm text-gray-900">
                              {r.candidate_email || "-"}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="truncate text-sm text-gray-900">
                              {r.applied_for_designation || "-"}
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {r.experience ?? "-"}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {r.previous_salary ?? "-"}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                              {r.interviewer_status || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {r.resume ? (
                              <button
                                type="button"
                                onClick={() => downloadResume(
                                  r.resume,
                                  `${r.candidate_name || "resume"}-${r.req_id || r.id}`
                                )}
                                className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                              >
                                <Download size={14} className="mr-1" />
                                Download
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {r.created_at
                              ? new Date(r.created_at).toLocaleString()
                              : "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <button
                              onClick={() => openEditModal(r)}
                              className="inline-flex items-center rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              <Calendar size={14} className="mr-1" />
                              Schedule Interview
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ PREVIEW MODAL */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
          onClick={closePreviewModal}
        >
          <div
            className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {activeTitle}
                </p>
                <p className="text-xs text-gray-500">Press ESC to close</p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Open
                </a>

                <button
                  onClick={closePreviewModal}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-black"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] overflow-auto p-4">
              {previewLoading ? (
                <div className="py-12 text-center text-gray-500">
                  Loading preview...
                </div>
              ) : !previewSrc ? (
                <div className="py-12 text-center text-gray-500">
                  Preview not available.
                </div>
              ) : previewKind === "image" ? (
                <img
                  src={previewSrc}
                  alt="Resume"
                  className="mx-auto max-w-full rounded-lg"
                />
              ) : previewKind === "pdf" ? (
                <iframe
                  title="Resume PDF"
                  src={previewSrc}
                  className="h-[70vh] w-full rounded-lg border"
                />
              ) : (
                <div className="rounded-lg border p-6 text-center text-sm text-gray-600">
                  Preview not supported for this file type.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ EDIT MODAL */}
      {editOpen && editingResume && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Schedule Interview
                  </h3>
                  <p className="mt-1 text-sm text-indigo-100">
                    {editingResume.candidate_name} - {editingResume.req_id}
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/30"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleEditSubmit}
              className="w-full max-w-3xl mx-auto px-4 py-5 sm:px-6 sm:py-6"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* Interview Status */}
                <div>
                  <label
                    htmlFor="interviewer_status"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Interview Status
                  </label>

                  <select
                    id="interviewer_status"
                    name="interviewer_status"
                    value={editForm.interviewer_status}
                    onChange={handleEditChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5
                   text-sm text-gray-900 shadow-sm
                   focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select Status</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* Interview Planned Date – ONLY when Yes */}
                {editForm.interviewer_status === "Yes" && (
                  <div>
                    <label
                      htmlFor="interviewer_planned_at"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Interview Planned Date & Time
                    </label>

                    <input
                      id="interviewer_planned_at"
                      name="interviewer_planned_at"
                      type="datetime-local"
                      value={editForm.interviewer_planned_at}
                      onChange={handleEditChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5
                     text-sm text-gray-900 shadow-sm
                     focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                )}

                {/* Buttons */}
                <div className="sm:col-span-2 mt-4">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-6 py-2.5
                     text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg
                     bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white
                     shadow-md hover:bg-indigo-700 disabled:opacity-70"
                    >
                      <Send size={16} className="mr-2" />
                      {submitting ? "Updating..." : "Update Interview"}
                    </button>
                  </div>
                </div>

              </div>
            </form>


          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeList;
