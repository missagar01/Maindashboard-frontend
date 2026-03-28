import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, Building2, MapPin, User, Calendar } from 'lucide-react';
import { createProject } from '../../../api/project/projectApi';

const emptyFormState = {
    project_name: '',
    location: '',
    client_name: '',
    start_date: '',
    expected_end_date: ''
};

const ProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
    const [formData, setFormData] = useState(emptyFormState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputClass =
        "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100";
    const primaryButtonClass =
        "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_30px_-18px_rgba(249,115,22,0.85)] transition hover:brightness-105 disabled:opacity-50 sm:w-auto sm:min-w-[220px]";
    const secondaryButtonClass =
        "inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:min-w-[180px]";
    const fieldLabelClass =
        "ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500";

    useEffect(() => {
        if (!isOpen) {
            setFormData(emptyFormState);
            setError('');
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const dataToSubmit = {
            ...formData,
            start_date: formData.start_date || null,
            expected_end_date: formData.expected_end_date || null
        };

        try {
            await createProject(dataToSubmit);
            onProjectCreated();
            onClose();
            setFormData(emptyFormState);
        } catch (err) {
            console.error('Error creating project:', err);
            setError('Failed to create project. Please check your data quality.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
            <div className="mx-auto my-4 w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.18)] sm:my-8 sm:max-h-[90vh] sm:rounded-[2rem]">
                <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.92))] px-4 py-4 sm:px-6 sm:py-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="rounded-[1.2rem] border border-amber-100 bg-amber-50 p-3 text-amber-500 shadow-sm sm:rounded-[1.4rem]">
                                <Building2 size={24} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600/80">
                                    Civil Track Workspace
                                </p>
                                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">
                                    Initialize Project
                                </h2>
                                <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
                                    Create a new project record with client, site, and planned timeline details.
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

                <form onSubmit={handleSubmit} className="space-y-5 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
                    {error && (
                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className={fieldLabelClass}>Project Name</label>
                        <div className="relative">
                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                required
                                placeholder="e.g. Rolling Mill Phase 2"
                                className={`${inputClass} pl-10`}
                                value={formData.project_name}
                                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={fieldLabelClass}>Location</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="e.g. Site Area A"
                                className={`${inputClass} pl-10`}
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={fieldLabelClass}>Client Name</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="e.g. Steel Corp"
                                className={`${inputClass} pl-10`}
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className={fieldLabelClass}>Start Date</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    className={`${inputClass} pl-10`}
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className={fieldLabelClass}>End Date (Exp.)</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    className={`${inputClass} pl-10`}
                                    value={formData.expected_end_date}
                                    onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className={secondaryButtonClass}
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={primaryButtonClass}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {loading ? 'Creating...' : 'Deploy Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectModal;
