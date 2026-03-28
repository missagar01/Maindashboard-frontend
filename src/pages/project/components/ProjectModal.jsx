import React, { useState } from 'react';
import axios from 'axios';
import { X, Save, Loader2, Building2, MapPin, User, Calendar } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const ProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
    const [formData, setFormData] = useState({
        project_name: '',
        location: '',
        client_name: '',
        start_date: '',
        expected_end_date: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE}/projects`, dataToSubmit, {
                headers: { 'x-auth-token': token }
            });
            onProjectCreated();
            onClose();
            setFormData({
                project_name: '',
                location: '',
                client_name: '',
                start_date: '',
                expected_end_date: ''
            });
        } catch (err) {
            console.error('Error creating project:', err);
            setError('Failed to create project. Please check your data quality.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
        <div className="bg-white border-2 border-slate-100 rounded-[2rem] w-full max-w-md shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-10 border-b border-slate-50 relative overflow-hidden bg-gradient-to-br from-amber-500 to-red-600">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-white pointer-events-none">
                        <Building2 size={120} />
                    </div>
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="bg-white/20 backdrop-blur-xl p-4 rounded-2xl text-white shadow-lg border border-white/20">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight leading-none">Initialize</h2>
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">Infrastructure Project</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-bold flex items-center gap-3 animate-shake">
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-industrial-500 ml-1">Project Name</label>
                        <div className="relative">
                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" />
                            <input
                                type="text"
                                required
                                placeholder="e.g. Rolling Mill Phase 2"
                                className="w-full input-field !pl-10"
                                value={formData.project_name}
                                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-industrial-500 ml-1">Location</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" />
                            <input
                                type="text"
                                placeholder="e.g. Site Area A"
                                className="w-full input-field !pl-10"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-industrial-500 ml-1">Client Name</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" />
                            <input
                                type="text"
                                placeholder="e.g. Steel Corp"
                                className="w-full input-field !pl-10"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-industrial-500 ml-1">Start Date</label>
                            <input
                                type="date"
                                className="w-full input-field"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-industrial-500 ml-1">End Date (Exp.)</label>
                            <input
                                type="date"
                                className="w-full input-field"
                                value={formData.expected_end_date}
                                onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-10 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn-secondary"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] btn-primary"
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
