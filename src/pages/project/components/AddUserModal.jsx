import React, { useState } from 'react';
import axios from 'axios';
import { X, UserPlus, Shield, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        role: 'staff'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE}/auth/register`, { ...formData, user_name: formData.username }, {
                headers: { 'x-auth-token': token }
            });

            setSuccess(true);
            onUserAdded();

            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData({ username: '', password: '', name: '', role: 'staff' });
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/80 backdrop-blur-sm">
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
                <div className="p-6 border-b border-industrial-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                        <UserPlus size={20} className="text-accent" />
                        Create New User
                    </h3>
                    <button onClick={onClose} className="text-industrial-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="mx-auto w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-white">User Created!</h4>
                            <p className="text-industrial-400 text-sm">The user can now log in.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-industrial-500 uppercase tracking-wider">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-industrial-800 border border-industrial-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-1 focus:ring-accent outline-none"
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-industrial-500 uppercase tracking-wider">Username</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-industrial-800 border border-industrial-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-1 focus:ring-accent outline-none"
                                        placeholder="Choose username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-industrial-500 uppercase tracking-wider">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-industrial-800 border border-industrial-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-1 focus:ring-accent outline-none"
                                        placeholder="Set password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-industrial-500 uppercase tracking-wider">Role</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
                                    <select
                                        className="w-full bg-industrial-800 border border-industrial-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-1 focus:ring-accent outline-none appearance-none"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="staff">Staff</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary mt-4 py-3"
                            >
                                {loading ? 'Creating User...' : 'Create User Account'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
