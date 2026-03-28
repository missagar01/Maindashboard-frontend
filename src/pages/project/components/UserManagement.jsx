import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Trash2, Shield, User as UserIcon, Calendar, AlertCircle } from 'lucide-react';
import DataTable from './DataTable';
import AddUserModal from './AddUserModal';
import PasswordResetModal from './PasswordResetModal';
import { formatDate } from '../utils/dateUtils';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE}/auth/users`, {
                headers: { 'x-auth-token': token }
            });
            setUsers(res.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch users. Admin access required.');
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE}/auth/users/${userId}`, {
                headers: { 'x-auth-token': token }
            });
            setUsers(users.filter(u => u.user_id !== userId));
        } catch (err) {
            alert('Failed to delete user.');
        }
    };

    const columns = [
        {
            key: 'user_name',
            label: 'User Identification',
            render: (val, row) => (
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                        <UserIcon size={20} />
                    </div>
                    <div>
                        <div className="font-black text-slate-900 leading-tight">{row.name || val}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">@{val}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            label: 'Access Level',
            render: (val) => (
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] border ${
                    val === 'admin' 
                    ? 'bg-accent/5 text-accent border-accent/20' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                    {val}
                </span>
            )
        },
        {
            key: 'created_at',
            label: 'System Access Since',
            render: (val) => (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Calendar size={14} className="opacity-50" />
                    {formatDate(val)}
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Control',
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setSelectedUser(row);
                            setIsResetModalOpen(true);
                        }}
                        className="p-2.5 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-xl transition-all border border-transparent hover:border-accent/10"
                        title="Reset Credentials"
                    >
                        <Shield size={20} />
                    </button>
                    <button
                        onClick={() => handleDeleteUser(row.user_id)}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        title="Deauthorize User"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            )
        }
    ];

    if (loading) return (
        <div className="p-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-accent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Accessing Secure Directory...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 md:p-10 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group gap-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110"></div>
                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">System Governance</h2>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-1 italic">Configure administrative personnel and secure access protocols</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary"
                >
                    <UserPlus size={20} />
                    <span>Authorize Personnel</span>
                </button>
            </div>

            {error ? (
                <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-[2rem] flex items-center gap-4 animate-shake">
                    <div className="p-3 bg-red-100 rounded-2xl">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="font-bold uppercase text-xs tracking-widest">Critical Alert</p>
                        <p className="text-sm font-medium opacity-80">{error}</p>
                    </div>
                </div>
            ) : (
                <div className="industrial-card">
                    <DataTable
                        columns={columns}
                        data={users}
                        title="Authorized Personnel"
                    />
                </div>
            )}

            <AddUserModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onUserAdded={fetchUsers}
            />

            <PasswordResetModal
                isOpen={isResetModalOpen}
                onClose={() => {
                    setIsResetModalOpen(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
            />
        </div>
    );
};

export default UserManagement;
