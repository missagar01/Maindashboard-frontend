import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAutoSync } from '../hooks/useAutoSync';
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import {
  getSelectCondidate,
  updateResumes,
  getByIdResumes,
} from "../../../api/hrfms/resumeApi";
import { RefreshCcw, X, Send, Download } from "lucide-react";

const SelectedCondidate = () => {
  const { token } = useAuth();

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // ✅ Edit modal
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // ✅ joined_status will be stored to DB
  const [editForm, setEditForm] = useState({
    joined_status: "", // Yes / No
  });

  const fetchResumes = useCallback(async (isAutoSync = false) => {
    if (!token) return;
    if (!isAutoSync) setLoading(true);
    try {
      const res = await getSelectCondidate(token);
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        setRows(list);
        setCount(res.count ?? list.length);
      } else {
        if (!isAutoSync) toast.error(res?.message || "Failed to load resumes");
        setRows([]);
        setCount(0);
      }
    } catch (err) {
      console.error(err);
      if (!isAutoSync) toast.error(err?.message || "Failed to load resumes");
      setRows([]);
      setCount(0);
    } finally {
      if (!isAutoSync) setLoading(false);
    }
  }, [token]);

  useAutoSync(fetchResumes, 15000);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // ✅ close modal on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const tableRows = useMemo(() => rows, [rows]);

  // ✅ Open modal and preload joined_status
  const openModal = async (id) => {
    try {
      setSelectedId(id);
      setOpen(true);

      const res = await getByIdResumes(id, token);
      const r = res?.data ?? res?.data?.data ?? res ?? null;

      setEditForm({
        joined_status: String(r?.joined_status ?? "").trim(), // Yes/No/"" (if empty)
      });
    } catch (e) {
      toast.error("Unable to open candidate");
      setOpen(false);
      setSelectedId(null);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setSelectedId(null);
    setEditForm({ joined_status: "" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Update joined_status in DB
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;

    if (!editForm.joined_status?.trim()) {
      toast.error("Joined Status required");
      return;
    }

    try {
      setSubmitting(true);

      // ✅ IMPORTANT: this field must match DB column
      const payload = { joined_status: editForm.joined_status.trim() }; // "Yes" or "No"

      const res = await updateResumes(selectedId, payload, token);
      if (res?.success === false) {
        toast.error(res?.message || "Update failed");
        return;
      }

      toast.success("Updated successfully");
      closeModal();
      fetchResumes();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Download resume (supports secured URL with token)
  const downloadResume = async (url, filename) => {
    if (!url) return;
    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) throw new Error("Failed to download");

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

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-none px-3 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="border-b bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 sm:px-8 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                  Resume List (Selected Candidates)
                </h3>
                <p className="mt-1 text-sm text-indigo-100">
                  Total: <span className="font-semibold">{count}</span>
                </p>
              </div>

              <button
                onClick={fetchResumes}
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-70 sm:w-auto"
              >
                <RefreshCcw size={16} className="mr-2" />
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="p-4 sm:p-6 lg:p-8">
            {loading ? (
              <div className="py-10 text-center text-gray-500">
                Loading resumes...
              </div>
            ) : tableRows.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No resumes found.
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                {/* ✅ ALL screens show TABLE */}
                <div className="overflow-x-auto">
                  <div className="max-h-[70vh] overflow-y-auto">
                    {/* min width so mobile can scroll horizontally */}
                    <table className="w-full min-w-[1250px] text-left text-sm">
                      <thead className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        <tr>
                          <th className="sticky left-0 z-30 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 whitespace-nowrap">
                            Req ID
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">
                            Candidate
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">Mobile</th>
                          <th className="px-4 py-3 whitespace-nowrap">Email</th>
                          <th className="px-4 py-3 whitespace-nowrap">
                            Applied For
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">Exp</th>
                          <th className="px-4 py-3 whitespace-nowrap">
                            Prev Salary
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">
                            Interview Status
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">
                            Joined?
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">Resume</th>
                          <th className="px-4 py-3 whitespace-nowrap">Created</th>
                          <th className="sticky right-0 z-30 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 whitespace-nowrap text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 bg-white">
                        {tableRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                              {r.req_id || "-"}
                            </td>

                            <td className="px-4 py-3">
                              <div className="truncate max-w-[240px] text-sm font-medium text-gray-900">
                                {r.candidate_name || "-"}
                              </div>
                              <div className="truncate max-w-[240px] text-xs text-gray-500">
                                {r.previous_company || ""}
                              </div>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                              {r.candidate_mobile || "-"}
                            </td>

                            <td className="px-4 py-3">
                              <div className="truncate max-w-[260px] text-gray-900">
                                {r.candidate_email || "-"}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="truncate max-w-[220px] text-gray-900">
                                {r.applied_for_designation || "-"}
                              </div>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                              {r.experience ?? "-"}
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                              {r.previous_salary ?? "-"}
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800">
                                {r.interviewer_status || "-"}
                              </span>
                            </td>

                            {/* ✅ Show joined_status value */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${String(r.joined_status || "")
                                    .toLowerCase()
                                    .trim() === "yes"
                                    ? "bg-green-50 text-green-700"
                                    : String(r.joined_status || "")
                                      .toLowerCase()
                                      .trim() === "no"
                                      ? "bg-red-50 text-red-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                              >
                                {r.joined_status || "-"}
                              </span>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              {r.resume ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadResume(
                                      r.resume,
                                      `${r.candidate_name || "resume"}-${r.req_id || r.id
                                      }`
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
                              {r.created_at
                                ? new Date(r.created_at).toLocaleString()
                                : "-"}
                            </td>

                            <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => openModal(r.id)}
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

                <div className="px-4 py-2 text-xs text-gray-500">
                  Mobile: Swipe left/right to see all columns.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ UPDATE MODAL (Yes/No) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Update Joined Status
              </h2>
              <button
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
                  htmlFor="joined_status"
                >
                  Joined Status
                </label>

                <select
                  id="joined_status"
                  name="joined_status"
                  value={editForm.joined_status}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm
                             focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
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
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white
                             shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                  <Send size={16} className="mr-2" />
                  {submitting ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectedCondidate;
