import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';
import * as o2dAPI from "../../api/o2dAPI";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";

interface FollowUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any;
    followup?: any;
    onSuccess: () => void;
}

const FollowUpModal: React.FC<FollowUpModalProps> = ({ isOpen, onClose, customer, followup, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        order_booked: 'true',
        order_quantity: '',
        order_date: new Date().toISOString().split('T')[0],
        date_of_calling: new Date().toISOString().split('T')[0],
        next_calling_date: '',
    });
    const [waitingForResponse, setWaitingForResponse] = useState(false);

    const fmtDisplay = (s: string) => { try { return format(new Date(s), 'dd-MM-yyyy'); } catch { return s; } };
    const fmtPayload = (s: string) => { try { return format(new Date(s), 'dd-MM-yyyy'); } catch { return s; } };

    useEffect(() => {
        if (!isOpen) return;
        if (followup) {
            setFormData({
                order_booked: followup.isBooked ? 'true' : 'false',
                order_quantity: followup.quantity || '',
                order_date: followup.orderDate ? new Date(followup.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                date_of_calling: followup.date ? new Date(followup.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                next_calling_date: followup.nextCall ? new Date(followup.nextCall).toISOString().split('T')[0] : '',
            });
            setWaitingForResponse(followup.status === 'Waiting for Response');
        } else {
            setFormData({ order_booked: 'true', order_quantity: '', order_date: new Date().toISOString().split('T')[0], date_of_calling: new Date().toISOString().split('T')[0], next_calling_date: '' });
            setWaitingForResponse(false);
        }
    }, [isOpen, followup]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const clientName = followup?.customerName || customer?.["Client Name"] || customer?.name || "Unknown";
            const payload = {
                client_name: clientName,
                sales_person: user?.user_name || user?.username || '',
                actual_order: formData.order_booked === 'true' ? parseFloat(formData.order_quantity) : 0,
                actual_order_date: formData.order_booked === 'true' ? fmtPayload(formData.order_date) : null,
                date_of_calling: fmtPayload(formData.date_of_calling),
                next_calling_date: (formData.order_booked === 'false' && !waitingForResponse) ? fmtPayload(formData.next_calling_date) : null
            };
            await o2dAPI.createFollowup(payload);
            onSuccess();
            onClose();
        } catch (error) {
            alert('Failed to save follow-up');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const customerName = followup?.customerName || customer?.["Client Name"] || customer?.name;
    const isBooked = formData.order_booked === 'true';

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200">

                {/* Header */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-black text-slate-800 truncate">
                            Follow Up: <span className="text-blue-600">{customerName}</span>
                        </h2>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Interaction Record</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm ml-3 flex-shrink-0">
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">

                    {/* Booked toggle */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Is Order Booked?</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { val: 'true', label: 'Yes, Booked', Icon: CheckCircle, cls: 'bg-emerald-50 border-emerald-500 text-emerald-700' },
                                { val: 'false', label: 'No / Pending', Icon: Clock, cls: 'bg-blue-50 border-blue-500 text-blue-700' },
                            ].map(({ val, label, Icon, cls }) => (
                                <label key={val} className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-xs font-black ${formData.order_booked === val ? cls : 'bg-white border-slate-100 text-slate-400'}`}>
                                    <input type="radio" name="order_booked" value={val} checked={formData.order_booked === val}
                                        onChange={(e) => setFormData({ ...formData, order_booked: e.target.value })} className="hidden" />
                                    <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Booked - YES */}
                    {isBooked && (
                        <div className="space-y-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 animate-in fade-in">
                            <div>
                                <label className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block mb-1">Order Quantity</label>
                                <input type="number" required value={formData.order_quantity}
                                    onChange={(e) => setFormData({ ...formData, order_quantity: e.target.value })}
                                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm outline-none focus:border-emerald-500 transition-all"
                                    placeholder="Enter quantity" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block mb-1">Order Date</label>
                                <div className="relative">
                                    <input type="date" required value={formData.order_date}
                                        onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                                        onClick={(e) => (e.target as any).showPicker?.()}
                                        className="peer absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" />
                                    <div className="flex items-center bg-white border border-emerald-200 rounded-xl px-3 py-2.5 gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        <span className="text-slate-700 font-semibold text-sm">{fmtDisplay(formData.order_date) || 'Select date'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Booked - NO */}
                    {!isBooked && (
                        <div className="space-y-3 animate-in fade-in">
                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <span className="text-xs font-bold text-amber-800">Schedule a follow-up call</span>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date of Calling</label>
                                <div className="relative">
                                    <input type="date" required value={formData.date_of_calling}
                                        onChange={(e) => setFormData({ ...formData, date_of_calling: e.target.value })}
                                        onClick={(e) => (e.target as any).showPicker?.()}
                                        className="peer absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" />
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                        <span className="text-slate-700 font-semibold text-sm">{fmtDisplay(formData.date_of_calling) || 'Select date'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className={waitingForResponse ? 'opacity-40 pointer-events-none' : ''}>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Next Calling Date</label>
                                <div className="relative">
                                    <input type="date" required={!waitingForResponse} disabled={waitingForResponse}
                                        value={formData.next_calling_date}
                                        onChange={(e) => setFormData({ ...formData, next_calling_date: e.target.value })}
                                        onClick={(e) => !waitingForResponse && (e.target as any).showPicker?.()}
                                        className="peer absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full disabled:cursor-not-allowed" />
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                        <span className="text-slate-700 font-semibold text-sm">{fmtDisplay(formData.next_calling_date) || 'Select date'}</span>
                                    </div>
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={waitingForResponse}
                                    onChange={(e) => setWaitingForResponse(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waiting for Response</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 bg-white border-t border-slate-100 shrink-0">
                    <button onClick={handleSubmit} disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 sm:py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 text-sm active:scale-[0.98] disabled:opacity-50">
                        {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Submitting...</span></> : 'Submit Follow Up'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FollowUpModal;
