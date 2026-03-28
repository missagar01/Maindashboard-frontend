import React, { useState } from 'react';
import axios from 'axios';
import { HardHat, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE}/auth/login`, { user_name: username, password });
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            onLogin(user);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative overflow-hidden font-sans">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/10 to-red-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-[500px] h-[500px] bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            <div className="max-w-md w-full relative z-10 animate-in zoom-in-95 duration-700">
                <div className="bg-white/80 backdrop-blur-2xl border-2 border-white rounded-[2.25rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.15)] overflow-hidden">
                    <div className="p-12 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 animate-glow"></div>
                        <div className="mx-auto h-20 w-20 bg-gradient-to-br from-amber-400 to-red-600 flex items-center justify-center rounded-[2rem] shadow-2xl shadow-amber-500/30 mb-8 group transition-transform hover:scale-110 duration-500">
                            <ShieldCheck size={40} className="text-white animate-float" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                            CIVIL<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-red-600">TRACK</span>
                        </h2>
                        <p className="mt-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] bg-slate-100/50 inline-block px-4 py-1.5 rounded-full">
                            Industrial Engine v2.0
                        </p>
                    </div>

                    <div className="p-12 pt-0 space-y-8">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-4 animate-shake">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                                        Operator Identity
                                    </label>
                                    <div className="relative group/field">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within/field:text-amber-500 transition-colors">
                                            <User size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            className="block w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-slate-900 font-bold placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300"
                                            placeholder="System Username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                                        Access Key
                                    </label>
                                    <div className="relative group/password">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within/password:text-red-500 transition-colors">
                                            <Lock size={20} />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="block w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-slate-900 font-bold placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all duration-300"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full flex justify-center items-center gap-4 py-5 px-6 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white text-xs font-black uppercase tracking-[0.3em] rounded-[1.5rem] transition-all duration-300 shadow-2xl shadow-red-500/30 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span>Authenticating...</span>
                                    </div>
                                ) : (
                                    <>
                                        Establish Connection
                                        <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="pt-8 text-center border-t border-slate-50">
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">
                                &copy; {new Date().getFullYear()} CivilTrack Infrastructure / Secure Node
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
