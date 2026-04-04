import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, PhoneCall, MapPin, User, Building, Tag, Briefcase, X } from 'lucide-react';
import * as o2dAPI from "../../api/o2dAPI";
import { useAuth } from "../../context/AuthContext";
import CustomerModal from './CustomerModal';
import FollowUpModal from './FollowUpModal';

interface Customer {
    id: number;
    "Client Name": string;
    "City": string;
    "Contact Person": string;
    "Contact Details": string;
    "Sales Person": string | number | null;
    "Client Type": string;
    "Status": string;
    sales_person: string;
    sales_person_id: number | null;
}

interface MarketingUser {
    id: number;
    user_name: string;
}

interface PageMessage {
    type: 'success' | 'error';
    text: string;
}

const CustomersPage: React.FC = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [marketingUsers, setMarketingUsers] = useState<MarketingUser[]>([]);
    const [salesPersonFilterId, setSalesPersonFilterId] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [visibleCount, setVisibleCount] = useState(100);
    const [pageMessage, setPageMessage] = useState<PageMessage | null>(null);

    const fetchData = async () => {
        setLoading(true); setError('');
        try {
            const [customersRes, marketingUsersRes] = await Promise.all([o2dAPI.getClients(), o2dAPI.getMarketingUsers()]);
            if (marketingUsersRes.data?.success) setMarketingUsers(marketingUsersRes.data.data || []);
            if (customersRes.data?.success) {
                const data: Customer[] = (customersRes.data.data || []).map((c: any) => ({
                    id: c.client_id, "Client Name": c.client_name, "City": c.city,
                    "Contact Person": c.contact_person, "Contact Details": c.contact_details,
                    "Sales Person": c.sales_person_id, "Client Type": c.client_type,
                    "Status": c.status, sales_person: c.sales_person, sales_person_id: c.sales_person_id
                }));
                data.sort((a, b) => (a["Client Name"]?.toLowerCase() || "").localeCompare(b["Client Name"]?.toLowerCase() || ""));
                setCustomers(data);
            } else { setError('Failed to load data.'); }
        } catch { setError('Error fetching data.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { setVisibleCount(100); }, [search, salesPersonFilterId]);
    useEffect(() => {
        if (!pageMessage) return;
        const timer = window.setTimeout(() => setPageMessage(null), 4000);
        return () => window.clearTimeout(timer);
    }, [pageMessage]);

    const filteredCustomers = useMemo(() => {
        const lower = search.toLowerCase();
        let filtered = [...customers];
        if (lower) filtered = filtered.filter(c =>
            c["Client Name"]?.toLowerCase().includes(lower) ||
            c["Contact Details"]?.toString().toLowerCase().includes(lower) ||
            c["Contact Person"]?.toLowerCase().includes(lower) ||
            c.sales_person?.toLowerCase().includes(lower)
        );
        if (salesPersonFilterId) {
            const selectedUser = marketingUsers.find(u => String(u.id) === salesPersonFilterId);
            const selectedName = selectedUser?.user_name?.trim().toLowerCase();
            filtered = filtered.filter(c =>
                String(c.sales_person_id) === salesPersonFilterId ||
                (selectedName && c.sales_person?.trim().toLowerCase() === selectedName)
            );
        }
        return filtered;
    }, [search, salesPersonFilterId, customers, marketingUsers]);

    const visibleCustomers = useMemo(() => filteredCustomers.slice(0, visibleCount), [filteredCustomers, visibleCount]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 2) {
            setVisibleCount(prev => Math.min(prev + 50, filteredCustomers.length));
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this customer?')) return;
        setPageMessage(null);
        try {
            await o2dAPI.deleteClient(String(id));
            await fetchData();
            setPageMessage({ type: 'success', text: 'Customer deleted successfully.' });
        } catch (error: any) {
            setPageMessage({
                type: 'error',
                text: error?.response?.data?.message || error?.message || 'Failed to delete customer.'
            });
        }
    };

    const handleCustomerSuccess = async (message: string) => {
        await fetchData();
        setPageMessage({ type: 'success', text: message });
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

            {/* ── Fixed Header ── */}
            <div className="shrink-0 z-30 bg-white border-b border-slate-200 shadow-sm">
                {/* Title + Add btn */}
                <div className="px-3 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-sm sm:text-base font-black text-slate-800 leading-tight">Customers</h1>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">{filteredCustomers.length} client{filteredCustomers.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={() => { setCustomerToEdit(null); setIsCustomerModalOpen(true); }}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 flex-shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Add Customer</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="px-3 pb-2.5 sm:px-5 sm:pb-3 flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                        <input
                            type="text" placeholder="Search clients..."
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 sm:py-2.5 pl-9 pr-8 text-slate-800 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <select
                        value={salesPersonFilterId}
                        onChange={(e) => setSalesPersonFilterId(e.target.value)}
                        className="w-32 sm:w-44 bg-slate-50 border border-slate-200 rounded-xl py-2 sm:py-2.5 px-2 sm:px-3 text-slate-700 text-[10px] sm:text-xs font-semibold outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none"
                    >
                        <option value="">All Sales</option>
                        {marketingUsers.map(u => <option key={u.id} value={String(u.id)}>{u.user_name}</option>)}
                    </select>
                </div>

                {pageMessage && (
                    <div className="px-3 pb-3 sm:px-5">
                        <div className={`rounded-xl border px-3 py-2 text-xs font-semibold sm:text-sm ${pageMessage.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}>
                            {pageMessage.text}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 pb-20" onScroll={handleScroll} style={{ WebkitOverflowScrolling: 'touch' }}>
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center text-rose-600 py-8 font-bold text-sm bg-rose-50 rounded-xl border border-rose-100 mx-2">{error}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {visibleCustomers.map((customer, index) => (
                            <div key={customer.id || index} className="group relative transition-all duration-200 hover:-translate-y-0.5">
                                {/* Gradient border */}
                                <div className="absolute -inset-[1.5px] bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-2xl opacity-100" />
                                <div className="relative bg-white rounded-2xl p-3 sm:p-4 h-full flex flex-col hover:shadow-xl transition-shadow duration-200">

                                    {/* Status badge */}
                                    <div className={`absolute top-0 right-0 px-2.5 py-0.5 text-[9px] font-black rounded-bl-xl uppercase tracking-tight ${customer.Status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {customer.Status || 'Active'}
                                    </div>

                                    {/* Name + city */}
                                    <div className="mb-3 pr-10">
                                        <h3 className="text-sm sm:text-base font-black text-slate-800 truncate" title={customer["Client Name"]}>
                                            {customer["Client Name"] || "Unknown"}
                                        </h3>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                            <span className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">{customer.City || "—"}</span>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 bg-slate-50 rounded-xl p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 mb-3 border border-slate-100 text-[10px] sm:text-xs text-slate-600">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <User className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                            <span className="font-semibold truncate">{customer["Contact Person"] || "—"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <PhoneCall className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                                            <span className="font-medium tracking-wide truncate">{customer["Contact Details"] || "—"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                                                <Briefcase className="w-2.5 h-2.5 flex-shrink-0" />
                                                <span className="text-[9px] font-semibold truncate max-w-[80px]">{customer.sales_person || "Unassigned"}</span>
                                            </div>
                                            {customer["Client Type"] && (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200 text-[9px] font-black uppercase tracking-wider">
                                                    <Tag className="w-2.5 h-2.5" />
                                                    {customer["Client Type"]}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setSelectedCustomer(customer); setIsFollowUpModalOpen(true); }}
                                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all active:scale-95">
                                            Follow Up
                                        </button>
                                        <button onClick={() => { setCustomerToEdit(customer); setIsCustomerModalOpen(true); }}
                                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-100 active:scale-90">
                                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(customer.id)}
                                            className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-slate-100 active:scale-90">
                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {visibleCustomers.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
                                <Search className="w-10 h-10 mb-3 opacity-20" />
                                <p className="font-bold text-sm">No customers found</p>
                                <p className="text-xs mt-1">Try adjusting your search or filters</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                customerToEdit={customerToEdit}
                onSuccess={handleCustomerSuccess}
            />
            <FollowUpModal
                isOpen={isFollowUpModalOpen}
                onClose={() => setIsFollowUpModalOpen(false)}
                customer={selectedCustomer}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default CustomersPage;
