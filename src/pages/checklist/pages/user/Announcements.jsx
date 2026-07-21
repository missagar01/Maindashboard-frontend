import React, { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, Loader2, X, CalendarClock } from "lucide-react";
import toast from "react-hot-toast";
import AdminLayout from "@/pages/checklist/components/layout/AdminLayout.jsx";
import { useAuth } from "@/context/AuthContext";
import { isPathAllowed } from "@/utils/accessControl";
import {
  formatAnnouncementDate,
  getAnnouncementStatus,
  parseAnnouncementDate,
  sortAnnouncementsByPriority,
} from "@/utils/announcementUtils";
import {
  fetchAnnouncementsApi,
  createAnnouncementApi,
  updateAnnouncementApi,
  deleteAnnouncementApi,
} from "@/api/master/announcementApi";

const EMPTY_FORM = {
  title: "",
  message: "",
  start_date: "",
  end_date: "",
  priority: 1,
  is_active: true,
};

// start_date/end_date come back from the API as plain wall-clock strings
// ("YYYY-MM-DDTHH:MI:SS", no timezone suffix) — treat them as literal text,
// never re-parse them through `new Date()` for storage/round-trip purposes,
// since that would silently apply the browser's local timezone on top of an
// already-naive value.
const toDatetimeLocal = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.slice(0, 16);
};

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  upcoming: "bg-amber-100 text-amber-700",
  expired: "bg-gray-200 text-gray-600",
  inactive: "bg-gray-200 text-gray-600",
};

const Announcements = () => {
  const { user } = useAuth();
  const canManageAnnouncements = isPathAllowed("/checklist/announcements", user);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await fetchAnnouncementsApi();
      const rows = Array.isArray(result?.data) ? result.data : [];
      setAnnouncements(sortAnnouncementsByPriority(rows));
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load announcements"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormValues(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEditClick = (announcement) => {
    setEditingId(announcement.id);
    setFormValues({
      title: announcement.title || "",
      message: announcement.message || "",
      start_date: toDatetimeLocal(announcement.start_date),
      end_date: toDatetimeLocal(announcement.end_date),
      priority: announcement.priority ?? 1,
      is_active: announcement.is_active ?? true,
    });
    setShowForm(true);
  };

  const validateForm = () => {
    if (!formValues.title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (!formValues.start_date || !formValues.end_date) {
      toast.error("Start date and end date are required");
      return false;
    }
    const startDate = parseAnnouncementDate(formValues.start_date);
    const endDate = parseAnnouncementDate(formValues.end_date);
    if (startDate && endDate && endDate < startDate) {
      toast.error("End date cannot be before start date");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      title: formValues.title.trim(),
      message: formValues.message.trim(),
      // Sent as the literal wall-clock value the user picked ("YYYY-MM-DDTHH:mm") —
      // never converted through Date/UTC, since the DB column is a naive timestamp.
      start_date: formValues.start_date,
      end_date: formValues.end_date,
      priority: Number(formValues.priority) || 1,
      is_active: Boolean(formValues.is_active),
    };

    try {
      setSubmitting(true);
      if (editingId) {
        await updateAnnouncementApi(editingId, payload);
        toast.success("Announcement updated");
      } else {
        await createAnnouncementApi(payload);
        toast.success("Announcement created");
      }
      resetForm();
      loadAnnouncements();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to save announcement"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (announcement) => {
    setConfirmTarget(announcement);
  };

  const cancelDelete = () => {
    setConfirmTarget(null);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    try {
      setDeletingId(id);
      await deleteAnnouncementApi(id);
      toast.success("Announcement deleted");
      setConfirmTarget(null);
      loadAnnouncements();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to delete announcement"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Megaphone className="text-indigo-600 w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Announcements</h1>
          </div>

          {canManageAnnouncements && (
            <button
              type="button"
              onClick={() => (showForm ? resetForm() : setShowForm(true))}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? "Cancel" : "New Announcement"}
            </button>
          )}
        </div>

        {canManageAnnouncements && showForm && (
          <div className="bg-white rounded-lg shadow border">
            <div className="p-4 sm:p-6">
              <h2 className="font-medium text-base sm:text-lg text-gray-900 border-b pb-2 mb-4">
                {editingId ? "Edit Announcement" : "New Announcement"}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="md:col-span-2">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title*
                    </label>
                    <input
                      type="text"
                      id="title"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      placeholder="e.g., Holiday Notice"
                      value={formValues.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      placeholder="Announcement details..."
                      value={formValues.message}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                      Start Date*
                    </label>
                    <input
                      type="datetime-local"
                      id="start_date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.start_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                      End Date*
                    </label>
                    <input
                      type="datetime-local"
                      id="end_date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.end_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                      Priority
                    </label>
                    <input
                      type="number"
                      id="priority"
                      min="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.priority}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-1 sm:mt-6">
                    <input
                      type="checkbox"
                      id="is_active"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={formValues.is_active}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">
                      Active
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
                    {editingId ? "Update Announcement" : "Save Announcement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
                <Loader2 className="animate-spin mr-2 w-4 h-4" />
                Loading announcements...
              </div>
            ) : error ? (
              <div className="text-center py-10 text-red-600 text-sm">{error}</div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                No active announcements right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {announcements.map((announcement) => {
                  const status = getAnnouncementStatus(announcement);
                  return (
                  <div
                    key={announcement.id}
                    className="border rounded-lg p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base break-words">
                        {announcement.title}
                      </h3>
                      <div className="shrink-0 flex items-center gap-1">
                        {canManageAnnouncements && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
                          >
                            {status}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          P{announcement.priority}
                        </span>
                      </div>
                    </div>

                    {announcement.message && (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                        {announcement.message}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <CalendarClock size={14} />
                      <span>
                        {formatAnnouncementDate(announcement.start_date)} - {formatAnnouncementDate(announcement.end_date)}
                      </span>
                    </div>

                    {canManageAnnouncements && (
                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => handleEditClick(announcement)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(announcement)}
                          disabled={deletingId === announcement.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {deletingId === announcement.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {confirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5">
              <h3 className="text-base font-semibold text-gray-900">Delete Announcement</h3>
              <p className="mt-2 text-sm text-gray-600 break-words">
                Are you sure you want to delete <span className="font-medium">"{confirmTarget.title}"</span>? This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={deletingId === confirmTarget.id}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deletingId === confirmTarget.id}
                  className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deletingId === confirmTarget.id && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Announcements;
