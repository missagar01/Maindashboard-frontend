import { useState, useEffect } from "react";
import {
    Loader2,
    Plus,
    Trash2,
    User,
    Package,
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Layers,
    Maximize,
    Box,
    CalendarIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { Button } from "./ui/button";
import * as o2dAPI from "../../api/o2dAPI";
import { cn } from "../../lib/utils";

interface SizeMasterData {
    id: number;
    item_type: string;
    size: string;
    thickness: string;
}

interface EnquiryItem {
    id: string;
    itemType: string;
    size: string;
    thickness: string;
    quantity: string;
}

const EnquiryView = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [sizeMasterData, setSizeMasterData] = useState<SizeMasterData[]>([]);
    const [crmUsers, setCrmUsers] = useState<any[]>([]);

    const [date, setDate] = useState<string>("");
    const [customer, setCustomer] = useState<string>("");
    const [salesExecutive, setSalesExecutive] = useState<string>("");
    const [items, setItems] = useState<EnquiryItem[]>([
        { id: Math.random().toString(36).substr(2, 9), itemType: "", size: "", thickness: "", quantity: "" }
    ]);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | null; text: string; }>({ type: null, text: '' });
    const [itemTypes, setItemTypes] = useState<string[]>([]);

    const selectedDate = date ? new Date(date) : undefined;
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        if (user && !isAdmin) {
            setSalesExecutive(user.user_name || user.username || "");
        }
    }, [user, isAdmin]);

    useEffect(() => {
        const fetchCrmUsers = async () => {
            if (isAdmin) {
                try {
                    const response = await o2dAPI.getCrmUsers();
                    if (response.data?.success) setCrmUsers(response.data.data);
                } catch (error) {
                    console.error("Error fetching CRM users:", error);
                }
            }
        };
        fetchCrmUsers();
    }, [isAdmin]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const response = await o2dAPI.getSizeMaster();
                if (response.data.success && response.data.data) {
                    const data = response.data.data;
                    setSizeMasterData(data);
                    const uniqueTypes = Array.from(new Set(data.map((item: any) => item.item_type))) as string[];
                    setItemTypes(uniqueTypes);
                }
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to load master data.' });
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const addItem = () => {
        setItems([...items, { id: Math.random().toString(36).substr(2, 9), itemType: "", size: "", thickness: "", quantity: "" }]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof EnquiryItem, value: string) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'itemType') { updated.size = ""; updated.thickness = ""; }
                else if (field === 'size') { updated.thickness = ""; }
                return updated;
            }
            return item;
        }));
    };

    const getAvailableSizes = (itemType: string) => {
        if (!itemType) return [];
        return Array.from(new Set(sizeMasterData.filter(i => i.item_type === itemType).map(i => i.size)));
    };

    const getAvailableThicknesses = (itemType: string, size: string) => {
        if (!itemType || !size) return [];
        return Array.from(new Set(sizeMasterData.filter(i => i.item_type === itemType && i.size === size).map(i => i.thickness)));
    };

    const handleReset = () => {
        setDate("");
        setCustomer("");
        setSalesExecutive(user && !isAdmin ? (user.user_name || user.username || "") : "");
        setItems([{ id: Math.random().toString(36).substr(2, 9), itemType: "", size: "", thickness: "", quantity: "" }]);
        setMessage({ type: null, text: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: null, text: '' });
        if (!date || !customer) {
            setMessage({ type: 'error', text: 'Date and Customer are required.' });
            return;
        }
        if (items.some(i => !i.itemType || !i.size || !i.thickness)) {
            setMessage({ type: 'error', text: 'Please fill all item requirements.' });
            return;
        }
        const payload = items.map(item => ({
            item_type: item.itemType,
            size: item.size,
            thickness: item.thickness.replace(' mm', '').trim(),
            enquiry_date: date,
            customer: customer,
            sales_executive: salesExecutive,
            quantity: item.quantity && item.quantity.trim() !== "" ? parseFloat(item.quantity) : null
        }));
        setLoading(true);
        try {
            const response = await o2dAPI.createEnquiry(payload);
            if (response.data.success) {
                setMessage({ type: 'success', text: 'Enquiry submitted successfully!' });
                setTimeout(() => handleReset(), 2000);
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Submission failed.' });
        } finally {
            setLoading(false);
        }
    };

    /* ─── Reusable compact select ─── */
    const CompactSelect = ({ value, onChange, disabled, children, required }: any) => (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
                className="w-full appearance-none pl-2.5 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 text-xs sm:text-sm shadow-sm disabled:opacity-40 disabled:bg-slate-100"
            >
                {children}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 p-2 sm:p-4 lg:p-6">
            <div className="w-full mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="bg-[#1e40af] px-3 py-2.5 sm:px-6 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-white/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-white text-sm sm:text-lg font-bold tracking-tight leading-tight">O2D Enquiry System</h1>
                            <p className="text-blue-200 text-[8px] sm:text-[10px] uppercase font-bold tracking-widest hidden sm:block">Syncronization Portal</p>
                        </div>
                    </div>
                    <button
                        onClick={handleReset}
                        className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all border border-white/10 flex-shrink-0"
                    >
                        <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Reset Form</span>
                        <span className="inline sm:hidden">Reset</span>
                    </button>
                </div>

                {/* ── Form ── */}
                <form onSubmit={handleSubmit} className="bg-white sm:border border-slate-200 sm:rounded-b-xl">

                    {/* Notification */}
                    {message.type && (
                        <div className={cn(
                            "mx-3 mt-3 p-3 rounded-lg border-l-4 flex items-center gap-3",
                            message.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-500" : "bg-rose-50 text-rose-800 border-rose-500"
                        )}>
                            {message.type === 'success'
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                : <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                            <p className="font-semibold text-xs sm:text-sm">{message.text}</p>
                        </div>
                    )}

                    {/* ── Top Identification Fields ── */}
                    <div className="p-3 sm:p-5 lg:p-7 border-b border-slate-100">
                        {/* Mobile: 2 cols for Date+Customer, full for Executive */}
                        {/* Desktop: 3 cols */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 lg:gap-6">

                            {/* Enquiry Date */}
                            <div className="space-y-1">
                                <label className="flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    <CalendarIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
                                    Date <span className="text-rose-500">*</span>
                                </label>
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-semibold px-2.5 py-2 sm:px-4 sm:py-2.5 bg-slate-50 border-slate-200 rounded-lg hover:bg-white hover:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-700 shadow-sm h-auto text-xs sm:text-sm",
                                                !date && "text-slate-400"
                                            )}
                                        >
                                            <CalendarIcon className="mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 flex-shrink-0" />
                                            {date ? format(selectedDate!, "dd/MM/yy") : <span className="text-slate-400 text-[10px] sm:text-xs font-semibold">Select Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-[10001] bg-white" align="start">
                                        <CalendarComponent
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(d) => {
                                                if (d) {
                                                    setDate(format(d, "yyyy-MM-dd"));
                                                    setIsCalendarOpen(false);
                                                }
                                            }}
                                            initialFocus
                                            className="bg-white"
                                        />
                                        <div className="flex items-center justify-between p-3 border-t border-slate-50 bg-slate-50/50">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDate("");
                                                    setIsCalendarOpen(false);
                                                }}
                                                className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDate(format(new Date(), "yyyy-MM-dd"));
                                                    setIsCalendarOpen(false);
                                                }}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                            >
                                                Today
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Customer */}
                            <div className="space-y-1">
                                <label className="flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
                                    Customer <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    value={customer}
                                    onChange={(e) => setCustomer(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full px-2.5 py-2 sm:px-4 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-semibold text-slate-700 shadow-sm text-xs sm:text-sm"
                                    placeholder="Customer name"
                                    required
                                />
                            </div>

                            {/* Sales Executive — full width on mobile (col-span-2), normal on sm+ */}
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                                <label className="flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
                                    Sales Executive
                                    {!isAdmin && user?.username && (
                                        <span className="text-[8px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full">Auto</span>
                                    )}
                                </label>
                                {isAdmin ? (
                                    <div className="relative">
                                        <select
                                            value={salesExecutive}
                                            onChange={(e) => setSalesExecutive(e.target.value)}
                                            className="w-full appearance-none pl-2.5 pr-7 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-semibold text-slate-700 shadow-sm text-xs sm:text-sm"
                                            required
                                        >
                                            <option value="">Select Executive</option>
                                            {crmUsers.map((u) => (
                                                <option key={u.id} value={u.user_name}>{u.user_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                ) : (
                                    <input
                                        value={salesExecutive}
                                        readOnly
                                        className="w-full px-2.5 py-2 sm:py-2.5 border border-blue-200 rounded-lg outline-none font-semibold shadow-sm bg-blue-50/50 text-blue-700 cursor-not-allowed text-xs sm:text-sm"
                                        placeholder="Executive Name"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Item Rows ── */}
                    <div className="p-2 sm:p-5 lg:p-7 space-y-2 sm:space-y-4">

                        {/* Section heading */}
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">Enquiry Items ({items.length})</h2>
                        </div>

                        {items.map((item, index) => (
                            <div key={item.id} className="relative bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-4 lg:p-6 hover:border-blue-200 transition-all">

                                {/* Item number badge */}
                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Item #{index + 1}</span>
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="p-1 sm:p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* 2x2 grid on mobile, 4 col on lg */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">

                                    {/* Item Type */}
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-1 text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                                            <Layers className="w-2.5 h-2.5" /> Category
                                        </label>
                                        <CompactSelect
                                            value={item.itemType}
                                            onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}
                                            required
                                        >
                                            <option value="">Choose Type</option>
                                            {itemTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </CompactSelect>
                                    </div>

                                    {/* Size */}
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-1 text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                                            <Maximize className="w-2.5 h-2.5" /> Size
                                        </label>
                                        <CompactSelect
                                            value={item.size}
                                            onChange={(e) => updateItem(item.id, 'size', e.target.value)}
                                            disabled={!item.itemType}
                                            required
                                        >
                                            <option value="">Choose Size</option>
                                            {getAvailableSizes(item.itemType).map(s => <option key={s} value={s}>{s}</option>)}
                                        </CompactSelect>
                                    </div>

                                    {/* Thickness */}
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-1 text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                                            <Box className="w-2.5 h-2.5" /> Thick (mm)
                                        </label>
                                        <CompactSelect
                                            value={item.thickness}
                                            onChange={(e) => updateItem(item.id, 'thickness', e.target.value)}
                                            disabled={!item.size}
                                            required
                                        >
                                            <option value="">Pick Thickness</option>
                                            {getAvailableThicknesses(item.itemType, item.size).map(t => <option key={t} value={t}>{t} mm</option>)}
                                        </CompactSelect>
                                    </div>

                                    {/* Quantity */}
                                    <div className="space-y-1">
                                        <label className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Qty (MT)</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full pl-2.5 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 text-xs sm:text-sm shadow-sm"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Action Footer ── */}
                    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-5 lg:p-7 border-t border-slate-100 bg-slate-50/50">
                        {/* Add Item */}
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex-1 sm:flex-none sm:w-auto h-9 sm:h-10 px-3 sm:px-5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-blue-500/20"
                        >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span>Add Item</span>
                        </button>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 sm:flex-none sm:w-auto h-9 sm:h-10 px-3 sm:px-5 sm:min-w-[150px] bg-[#1e40af] text-white rounded-lg hover:bg-blue-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm shadow-blue-500/20 active:scale-95"
                        >
                            {loading
                                ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin flex-shrink-0" />
                                : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            }
                            <span>{loading ? "Submitting..." : `Submit ${items.length} Item${items.length > 1 ? 's' : ''}`}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EnquiryView;