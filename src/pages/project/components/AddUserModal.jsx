import React, { useEffect, useState } from 'react';
import { X, UserPlus, Shield, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createProjectUser } from '../../../api/project/userApi';

const emptyFormState = {
    username: '',
    password: '',
    name: '',
    role: 'user'
};

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
    const [formData, setFormData] = useState(emptyFormState);
    const [error, setError] = useState('');
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
            setFormData(emptyFormState);
            setError('');
            setSuccess(false);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await createProjectUser(formData);

            setSuccess(true);
            onUserAdded();

            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData(emptyFormState);
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to create user');
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
                                <UserPlus size={24} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600/80">
                                    System Governance
                                </p>
                                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">
                                    Create New User
                                </h3>
                                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                                    Add personnel credentials and assign the access role for the project module.
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
                            <h4 className="text-lg font-bold text-slate-900">User Created</h4>
                            <p className="text-sm text-slate-500">The user can now log in to the project workspace.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className={fieldLabelClass}>Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        required
                                        className={inputClass}
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={fieldLabelClass}>Username</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        required
                                        className={inputClass}
                                        placeholder="Choose username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={fieldLabelClass}>Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="password"
                                        required
                                        className={inputClass}
                                        placeholder="Set password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={fieldLabelClass}>Role</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        className={`${inputClass} appearance-none`}
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="user">Staff</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button type="button" onClick={onClose} className={secondaryButtonClass}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={primaryButtonClass}
                                >
                                    {loading ? 'Creating User...' : 'Create User Account'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
