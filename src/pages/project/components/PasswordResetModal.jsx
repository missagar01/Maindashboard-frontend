import React, { useState } from 'react';
import axios from 'axios';
import { X, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const PasswordResetModal = ({ isOpen, onClose, user }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE}/auth/reset-password`,
                { userId: user.id || user.user_id, newPassword },
                { headers: { 'x-auth-token': token } }
            );
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setNewPassword('');
                setConfirmPassword('');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/80 backdrop-blur-sm">
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
                <div className="p-6 border-b border-industrial-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Lock size={20} className="text-accent" />
                            Reset Password
                        </h3>
                        {user && (
                            <p className="text-xs text-industrial-400 mt-1 font-medium italic">
                                Resetting password for: <span className="text-accent underline">@{user.user_name}</span>
                            </p>
                        )}
                    </div>
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
                            <h4 className="text-lg font-bold text-white">Password Updated!</h4>
                            <p className="text-industrial-400 text-sm">Closing modal...</p>
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
                                <label className="text-xs font-bold text-industrial-500 uppercase tracking-wider">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-industrial-800 border border-industrial-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-1 focus:ring-accent outline-none"
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-industrial-500 uppercase tracking-wider">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-500" size={16} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-industrial-800 border border-industrial-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-1 focus:ring-accent outline-none"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary mt-4 py-3"
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PasswordResetModal;
