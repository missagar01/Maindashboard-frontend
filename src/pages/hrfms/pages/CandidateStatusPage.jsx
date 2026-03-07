import React, { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { X, Send, RefreshCcw } from "lucide-react";
import { getResumes, updateResumes, getByIdResumes } from "../../../api/hrfms/resumeApi";
import { useAuth } from "../../../context/AuthContext";
import useAutoSync from "../hooks/useAutoSync";

const CandidateStatus = () => {
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState({
    candidate_status: "",
  });

  const fetchResumes = useCallback(async (isAutoSync = false) => {
    if (!token) return;
    if (!isAutoSync) {
      setLoading(true);
    }

    try {
      const res = await getResumes(token);

      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : [];

        // ✅ ONLY interviewer_status = Yes
        const filtered = list.filter(
          (r) => String(r?.interviewer_status ?? "").trim().toLowerCase() === "yes"
        );

        setRows(filtered);
      } else {
        toast.error(res?.message || "Failed to load resumes");
        setRows([]);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load resumes");
      setRows([]);
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

  const tableRows = useMemo(() => rows, [rows]);

  const openModal = async (id) => {
    try {
      setSelectedId(id);
      setOpen(true);

      const res = await getByIdResumes(id, token);
      const r = res?.data ?? res?.data?.data ?? res ?? null;

      setEditForm({
        candidate_status: r?.candidate_status ?? "",
      });
    } catch (e) {
      toast.error("Unable to open candidate");
      setOpen(false);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setSelectedId(null);
    setEditForm({ candidate_status: "" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;

    if (!editForm.candidate_status?.trim()) {
      toast.error("Candidate Status required");
      return;
    }

    try {
      setSubmitting(true);
      const payload = { candidate_status: editForm.candidate_status.trim() };

      await updateResumes(selectedId, payload, token);

      toast.success("Updated successfully");
      closeModal();
      fetchResumes();
    } catch (e) {
      toast.error("Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full p-3 sm:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        {/* ✅ Header */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h1 className="text-lg font-semibold text-white sm:text-xl">
                Candidate List
              </h1>
              <p className="text-xs text-indigo-100 sm:text-sm">
                Only Interviewer Status = Yes
              </p>
            </div>

            <button
              onClick={fetchResumes}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/95 px-4 py-2.5
                         text-sm font-semibold text-indigo-700 shadow-sm hover:bg-white sm:w-auto"
            >
              <RefreshCcw size={16} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* ✅ Table (ALL screens) */}
          <div className="p-3 sm:p-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
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
                        <th className="px-4 py-3 whitespace-nowrap">
                          Interview Status
                        </th>
                        <th className="px-4 py-3 whitespace-nowrap">
                          Candidate Status
                        </th>
                        <th className="sticky right-0 z-30 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 whitespace-nowrap text-right">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td className="px-4 py-6 text-gray-600" colSpan={7}>
                            Loading...
                          </td>
                        </tr>
                      ) : tableRows.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-gray-600" colSpan={7}>
                            No records found
                          </td>
                        </tr>
                      ) : (
                        tableRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                              {r.req_id}
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 whitespace-nowrap">
                                {r.candidate_name}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-[260px]">
                                {r.candidate_email}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {r.candidate_mobile}
                            </td>

                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {r.applied_for_designation}
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                {r.interviewer_status}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {r.candidate_status ?? "-"}
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Swipe left/right to see all columns.
            </div>
          </div>
        </div>

        {/* ✅ Modal */}
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Update Candidate Status
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
                    htmlFor="candidate_status"
                  >
                    Candidate Status
                  </label>

                  <select
                    id="candidate_status"
                    name="candidate_status"
                    value={editForm.candidate_status}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm
                               focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
    </div>
  );
};

export default CandidateStatus;
