import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck, X } from "lucide-react";
import { resetProjectUserPassword } from "../../../api/project/userApi";

const emptyState = {
  password: "",
  confirmPassword: "",
};

const PasswordResetModal = ({ isOpen, onClose, user }) => {
  const [formData, setFormData] = useState(emptyState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const primaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_30px_-18px_rgba(249,115,22,0.85)] transition hover:brightness-105 disabled:opacity-50 sm:w-auto sm:min-w-[220px]";
  const secondaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:min-w-[180px]";
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100";
  const fieldLabelClass =
    "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500";

  useEffect(() => {
    if (!isOpen) {
      setFormData(emptyState);
      setError("");
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !user) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.password.trim()) {
      setError("New password is required.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetProjectUserPassword(user.id || user.user_id, formData.password);
      setSuccess(true);

      window.setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="mx-auto my-4 w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.18)] sm:my-8 sm:max-h-[90vh] sm:rounded-[2rem]">
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.92))] px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="rounded-[1.2rem] border border-amber-100 bg-amber-50 p-3 text-amber-500 shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600/80">
                  System Governance
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">
                  Reset Credentials
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Update access credentials for the selected project user.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-6">
          {success ? (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Password Updated</h4>
              <p className="text-sm text-slate-500">
                Credentials were reset for {user.name || user.user_name}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? (
                <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className={fieldLabelClass}>
                  User
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
                  <p className="font-bold">{user.name || user.user_name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {user.role || "user"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className={fieldLabelClass}>
                  New Password
                </label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="password"
                    required
                    className={inputClass}
                    placeholder="Enter new password"
                    value={formData.password}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={fieldLabelClass}>
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="password"
                    required
                    className={inputClass}
                    placeholder="Re-enter new password"
                    value={formData.confirmPassword}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className={secondaryButtonClass}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className={primaryButtonClass}>
                  {loading ? "Updating..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordResetModal;
