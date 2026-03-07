import React, { useState, useEffect } from 'react';
import { X, Save, User, Building, Phone, Briefcase, Tag } from 'lucide-react';
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

    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:py-3 text-slate-800 font-semibold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all focus:bg-white";
    const iconInputCls = (left = true) => `${inputCls} ${left ? 'pl-9 sm:pl-10' : ''}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200">

                {/* Header */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-sm sm:text-base font-black text-slate-800">{customerToEdit ? 'Edit Customer' : 'Add Customer'}</h2>
                        <p className="text-[9px] font-black uppercase text-blue-600/60 tracking-widest">O2D Management</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm ml-3">
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} id="customer-form" className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">

                    {/* Client Name */}
                    <div>
                        <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase tracking-widest">Client Name *</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <input type="text" required value={formData["Client Name"]}
                                onChange={(e) => handleChange("Client Name", e.target.value)}
                                className={iconInputCls()} placeholder="Company name" />
                        </div>
                    </div>

                    {/* City + Contact Person */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase tracking-widest">City</label>
                            <input type="text" value={formData["City"]}
                                onChange={(e) => handleChange("City", e.target.value)}
                                className={inputCls} placeholder="City" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase tracking-widest">Contact Person</label>
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
                        <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase tracking-widest">Contact Details *</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <input type="text" required value={formData["Contact Details"]}
                                onChange={(e) => handleChange("Contact Details", e.target.value)}
                                className={iconInputCls()} placeholder="Phone or Email" />
                        </div>
                    </div>

                    {/* Sales Person */}
                    <div>
                        <label className="text-[9px] font-black text-slate-400 mb-1 block uppercase tracking-widest">Sales Person *</label>
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
                        <label className="text-[9px] font-black text-slate-400 mb-1.5 block uppercase tracking-widest">Client Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['NBD', 'CRR'].map(type => (
                                <button key={type} type="button" onClick={() => handleChange("Client Type", type)}
                                    className={`py-2.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${formData["Client Type"] === type ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status (edit mode only) */}
                    {customerToEdit && (
                        <div>
                            <label className="text-[9px] font-black text-slate-400 mb-1.5 block uppercase tracking-widest">Status</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Active', 'Inactive', 'Lead'].map(status => (
                                    <button key={status} type="button" onClick={() => handleChange("Status", status)}
                                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${formData["Status"] === status ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-4 sm:p-5 bg-white border-t border-slate-100 shrink-0">
                    <button type="submit" form="customer-form" disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 sm:py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 text-sm active:scale-[0.98] disabled:opacity-50">
                        {loading ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Saving...</span></>
                        ) : (
                            <><Save className="w-4 h-4" /><span>{customerToEdit ? 'Update Customer' : 'Save Customer'}</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerModal;
