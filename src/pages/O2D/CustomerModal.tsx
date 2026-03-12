import React, { useState, useEffect } from 'react';
import { X, Save, User, Building, Phone, Briefcase } from 'lucide-react';
import * as o2dAPI from "../../api/o2dAPI";
import { useAuth } from "../../context/AuthContext";

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerToEdit: any;
    onSuccess: () => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customerToEdit, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [marketingUsers, setMarketingUsers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        "Client Name": '',
        "City": '',
        "Contact Person": '',
        "Contact Details": '',
        "Sales Person": '',
        "sales_person_id": '',
        "Client Type": '',
        "Status": 'Active'
    });

    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            try {
                const res = await o2dAPI.getMarketingUsers();
                if (res.data?.success) setMarketingUsers(res.data.data);
            } catch { }
        })();

        const isSales = user?.role === 'Sales';
        if (customerToEdit) {
            setFormData({
                "Client Name": customerToEdit["Client Name"] || '',
                "City": customerToEdit["City"] || '',
                "Contact Person": customerToEdit["Contact Person"] || '',
                "Contact Details": customerToEdit["Contact Details"] || '',
                "Sales Person": customerToEdit["Sales Person"] || customerToEdit.sales_person || '',
                "sales_person_id": customerToEdit.sales_person_id || '',
                "Client Type": customerToEdit["Client Type"] || '',
                "Status": customerToEdit["Status"] || 'Active'
            });
        } else {
            setFormData({
                "Client Name": '', "City": '', "Contact Person": '', "Contact Details": '',
                "Sales Person": isSales ? (user?.user_name || user?.username || '') : '',
                "sales_person_id": isSales ? String(user?.id) : '',
                "Client Type": '', "Status": 'Active'
            });
        }
    }, [isOpen, customerToEdit, user]);

    const handleChange = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));
    const handleSalesPersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const selectedUser = marketingUsers.find(u => String(u.id) === selectedId);
        setFormData(prev => ({ ...prev, "sales_person_id": selectedId, "Sales Person": selectedUser?.user_name || '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const payload = {
            client_name: formData["Client Name"], city: formData["City"],
            contact_person: formData["Contact Person"], contact_details: formData["Contact Details"],
            sales_person_id: formData.sales_person_id ? parseInt(formData.sales_person_id) : null,
            client_type: formData["Client Type"], status: formData["Status"]
        };
        try {
            if (customerToEdit) await o2dAPI.updateClient(customerToEdit.id, payload);
            else await o2dAPI.createClient(payload);
            onSuccess(); onClose();
        } catch { alert('Failed to save customer'); }
        finally { setLoading(false); }
    };

    if (!isOpen) return null;

    const labelCls = "mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400 sm:text-[11px]";
    const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 sm:rounded-2xl sm:px-3.5";
    const iconInputCls = (left = true) => `${inputCls} ${left ? 'pl-10 sm:pl-11' : ''}`;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative flex w-full max-w-[34rem] flex-col overflow-hidden rounded-[1.4rem] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.2)] max-h-[calc(100svh-1.5rem)] animate-in slide-in-from-bottom duration-200 sm:max-h-[92vh] sm:rounded-[1.75rem]">

                {/* Header */}
                <div className="shrink-0 border-b border-slate-100 bg-slate-50/95 px-4 py-3.5 backdrop-blur-sm sm:px-6 sm:py-4">
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-slate-800 sm:text-lg">{customerToEdit ? 'Edit Customer' : 'Add Customer'}</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600/60">O2D Management</p>
                        </div>
                        <button onClick={onClose} className="ml-2 rounded-full bg-white p-2.5 text-slate-400 shadow-sm transition-colors hover:text-slate-600">
                            <X className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} id="customer-form" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:space-y-5 sm:p-6">

                    {/* Client Name */}
                    <div>
                        <label className={labelCls}>Client Name *</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <input type="text" required value={formData["Client Name"]}
                                onChange={(e) => handleChange("Client Name", e.target.value)}
                                className={iconInputCls()} placeholder="Company name" />
                        </div>
                    </div>

                    {/* City + Contact Person */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>City</label>
                            <input type="text" value={formData["City"]}
                                onChange={(e) => handleChange("City", e.target.value)}
                                className={inputCls} placeholder="City" />
                        </div>
                        <div>
                            <label className={labelCls}>Contact Person</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                                <input type="text" value={formData["Contact Person"]}
                                    onChange={(e) => handleChange("Contact Person", e.target.value)}
                                    className={iconInputCls()} placeholder="Name" />
                            </div>
                        </div>
                    </div>

                    {/* Contact Details */}
                    <div>
                        <label className={labelCls}>Contact Details *</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <input type="text" required value={formData["Contact Details"]}
                                onChange={(e) => handleChange("Contact Details", e.target.value)}
                                className={iconInputCls()} placeholder="Phone or Email" />
                        </div>
                    </div>

                    {/* Sales Person */}
                    <div>
                        <label className={labelCls}>Sales Person *</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <select
                                value={formData.sales_person_id} onChange={handleSalesPersonChange} required
                                disabled={user?.role === 'Sales'}
                                className={`${iconInputCls()} appearance-none cursor-pointer ${user?.role === 'Sales' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                <option value="">Select Sales Person...</option>
                                {marketingUsers.map(u => <option key={u.id} value={u.id}>{u.user_name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Client Type */}
                    <div>
                        <label className={labelCls}>Client Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['NBD', 'CRR'].map(type => (
                                <button key={type} type="button" onClick={() => handleChange("Client Type", type)}
                                    className={`rounded-xl border-2 py-3 text-xs font-black uppercase tracking-wider transition-all sm:rounded-2xl ${formData["Client Type"] === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status (edit mode only) */}
                    {customerToEdit && (
                        <div>
                            <label className={labelCls}>Status</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Active', 'Inactive', 'Lead'].map(status => (
                                    <button key={status} type="button" onClick={() => handleChange("Status", status)}
                                        className={`rounded-xl border-2 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all sm:rounded-2xl ${formData["Status"] === status ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}>
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-100 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-5">
                    <button type="submit" form="customer-form" disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 hover:bg-blue-700 sm:py-4">
                        {loading ? (
                            <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>Saving...</span></>
                        ) : (
                            <><Save className="h-4 w-4" /><span>{customerToEdit ? 'Update Customer' : 'Save Customer'}</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerModal;
