import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Calendar,
    Loader2,
    Search,
    ShieldCheck,
    Trash2,
    User as UserIcon,
    UserPlus,
} from 'lucide-react';
import DataTable from './DataTable';
import AddUserModal from './AddUserModal';
import { formatDate } from '../utils/dateUtils';
import { listProjectUsers, revokeProjectUserAccess } from '../../../api/project/userApi';

const mobileCardBackgrounds = [
    'border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,1),rgba(255,255,255,0.98),rgba(255,247,237,0.92))]',
    'border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(255,255,255,0.98),rgba(239,246,255,0.92))]',
    'border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,1),rgba(255,255,255,0.98),rgba(240,253,250,0.92))]',
    'border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,1),rgba(255,255,255,0.98),rgba(255,245,245,0.92))]'
];

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [mobileSearchTerm, setMobileSearchTerm] = useState('');

    useEffect(() => {
        void fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');

        try {
            const nextUsers = await listProjectUsers();
            setUsers(Array.isArray(nextUsers) ? nextUsers : []);
        } catch (err) {
            setError('Failed to fetch users. Admin access required.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userRecord) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            await revokeProjectUserAccess(userRecord);
            await fetchUsers();
        } catch (err) {
            alert('Failed to remove project access for this user.');
        }
    };

    const filteredMobileUsers = useMemo(() => {
        const normalizedSearch = mobileSearchTerm.trim().toLowerCase();
        if (!normalizedSearch) {
            return users;
        }

        return users.filter((userRecord) =>
            [userRecord.user_name, userRecord.name, userRecord.role]
                .some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
        );
    }, [mobileSearchTerm, users]);

    const columns = [
        {
            key: 'user_name',
            label: 'User Identification',
            render: (val, row) => (
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                        <UserIcon size={20} />
                    </div>
                    <div>
                        <div className="leading-tight font-black text-slate-900">{row.name || val}</div>
                        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            @{val}
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            label: 'Access Level',
            render: (val) => (
                <span className={`rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                    val === 'admin'
                        ? 'border-amber-200 bg-amber-50 text-amber-600'
                        : 'border-slate-200 bg-slate-100 text-slate-500'
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
                        onClick={() => handleDeleteUser(row)}
                        className="rounded-xl border border-transparent p-2.5 text-slate-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500"
                        title="Deauthorize User"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            )
        }
    ];

    if (loading) {
        return (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-12 text-center shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:px-6 sm:py-16">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-100 bg-amber-50">
                    <Loader2 size={22} className="animate-spin text-amber-500" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Accessing secure directory...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <section className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem]">
                <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="rounded-[1.1rem] border border-amber-100 bg-white p-3 text-amber-500 shadow-sm">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600/80">
                                    Civil Track Workspace
                                </p>
                                <h2 className="mt-2 text-[1.85rem] font-black tracking-tight text-slate-900 sm:text-[2rem]">
                                    System Governance
                                </h2>
                                <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
                                    Configure personnel access with a cleaner mobile-friendly governance panel.
                                </p>
                            </div>
                        </div>

                        <div className="flex w-full items-center sm:w-auto">
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_30px_-18px_rgba(249,115,22,0.85)] transition hover:brightness-105 sm:w-auto"
                            >
                                <UserPlus size={18} />
                                <span>Authorize Personnel</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:px-6 sm:py-5">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Authorized
                        </p>
                        <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{users.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Access State
                        </p>
                        <p className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-emerald-600">
                            Active
                        </p>
                    </div>
                </div>
            </section>

            {error ? (
                <div className="flex items-center gap-4 rounded-[1.25rem] border border-red-100 bg-red-50 p-5 text-red-600 sm:rounded-[1.75rem] sm:p-6">
                    <div className="rounded-xl bg-red-100 p-3">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest">Critical Alert</p>
                        <p className="text-sm font-medium opacity-80">{error}</p>
                    </div>
                </div>
            ) : (
                <>
                    <section className="space-y-4 md:hidden">
                        <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                            <div className="border-b border-slate-100 px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-amber-500 to-red-500 shadow-lg shadow-amber-500/20" />
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-slate-900">
                                            Authorized Personnel
                                        </h3>
                                        <p className="mt-1 text-xs font-medium text-slate-400">
                                            Mobile access directory
                                        </p>
                                    </div>
                                </div>

                                <div className="relative mt-4">
                                    <Search
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                                        size={16}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search personnel..."
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                                        value={mobileSearchTerm}
                                        onChange={(event) => setMobileSearchTerm(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 p-4">
                                {filteredMobileUsers.length > 0 ? (
                                    filteredMobileUsers.map((userRecord, index) => {
                                        const mobileCardBackground =
                                            mobileCardBackgrounds[index % mobileCardBackgrounds.length];

                                        return (
                                        <article
                                            key={`${userRecord.user_name}-${userRecord.created_at}`}
                                            className={`rounded-[1.1rem] border p-4 shadow-sm ${mobileCardBackground}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-slate-500 shadow-sm backdrop-blur-sm">
                                                        <UserIcon size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-black text-slate-900">
                                                            {userRecord.name || userRecord.user_name}
                                                        </p>
                                                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                            @{userRecord.user_name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteUser(userRecord)}
                                                    className="rounded-xl p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                                                    title="Deauthorize User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="mt-4 grid grid-cols-1 gap-3">
                                                <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                        Access Level
                                                    </p>
                                                    <span className={`mt-1 inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                                                        userRecord.role === 'admin'
                                                            ? 'border-amber-200 bg-amber-50 text-amber-600'
                                                            : 'border-slate-200 bg-white text-slate-500'
                                                    }`}>
                                                        {userRecord.role}
                                                    </span>
                                                </div>

                                                <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                        System Access Since
                                                    </p>
                                                    <div className="mt-1 flex items-center gap-2 text-sm font-black text-slate-700">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {formatDate(userRecord.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    )})
                                ) : (
                                    <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                                        <p className="text-sm font-semibold text-slate-400">
                                            No users found matching your search.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="hidden rounded-[1.5rem] border border-slate-200 bg-white p-1 shadow-[0_14px_36px_rgba(15,23,42,0.06)] md:block">
                        <DataTable
                            columns={columns}
                            data={users}
                            title="Authorized Personnel"
                        />
                    </div>
                </>
            )}

            <AddUserModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onUserAdded={fetchUsers}
            />
        </div>
    );
};

export default UserManagement;
