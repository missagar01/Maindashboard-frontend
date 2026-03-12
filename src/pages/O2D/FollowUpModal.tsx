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
    const fieldLabelCls = "mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400 sm:text-[11px]";

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative flex w-full max-w-[34rem] flex-col overflow-hidden rounded-[1.4rem] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.2)] max-h-[calc(100svh-1.5rem)] animate-in slide-in-from-bottom duration-200 sm:max-h-[92vh] sm:rounded-[1.75rem]">

                {/* Header */}
                <div className="shrink-0 border-b border-slate-100 bg-slate-50/95 px-4 py-3.5 backdrop-blur-sm sm:px-6 sm:py-4">
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-black text-slate-800 sm:text-lg">
                            Follow Up: <span className="text-blue-600">{customerName}</span>
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Interaction Record</p>
                        </div>
                        <button onClick={onClose} className="ml-2 shrink-0 rounded-full bg-white p-2.5 text-slate-400 shadow-sm transition-colors hover:text-slate-600">
                            <X className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                    <div className="space-y-4 sm:space-y-5">

                    {/* Booked toggle */}
                    <div className="space-y-2.5">
                        <label className={fieldLabelCls}>Is Order Booked?</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { val: 'true', label: 'Yes, Booked', Icon: CheckCircle, cls: 'bg-emerald-50 border-emerald-500 text-emerald-700' },
                                { val: 'false', label: 'No / Pending', Icon: Clock, cls: 'bg-blue-50 border-blue-500 text-blue-700' },
                            ].map(({ val, label, Icon, cls }) => (
                                <label key={val} className={`flex min-h-[3.25rem] items-center justify-center rounded-xl border-2 px-2 py-3 text-center text-xs font-black transition-all sm:rounded-2xl ${formData.order_booked === val ? cls : 'bg-white border-slate-100 text-slate-400'}`}>
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
                        <div className="animate-in space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 fade-in sm:p-4">
                            <div>
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-emerald-700">Order Quantity</label>
                                <input type="number" required value={formData.order_quantity}
                                    onChange={(e) => setFormData({ ...formData, order_quantity: e.target.value })}
                                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm outline-none focus:border-emerald-500 transition-all"
                                    placeholder="Enter quantity" />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-emerald-700">Order Date</label>
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
                        <div className="animate-in space-y-3 fade-in">
                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <span className="text-xs font-bold text-amber-800">Schedule a follow-up call</span>
                            </div>
                            <div>
                                <label className={fieldLabelCls}>Date of Calling</label>
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
                                <label className={fieldLabelCls}>Next Calling Date</label>
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
                            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 cursor-pointer transition-colors hover:bg-blue-50 hover:border-blue-200">
                                <input type="checkbox" checked={waitingForResponse}
                                    onChange={(e) => setWaitingForResponse(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waiting for Response</span>
                            </label>
                        </div>
                    )}
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-100 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-5">
                    <button onClick={handleSubmit} disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 hover:bg-blue-700 sm:py-4">
                        {loading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>Submitting...</span></> : 'Submit Follow Up'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FollowUpModal;
