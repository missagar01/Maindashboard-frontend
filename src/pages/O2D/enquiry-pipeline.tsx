import { useState, useEffect, useMemo } from "react";
import {
    Loader2, GitBranch, Plus, X, AlertCircle, CheckCircle2,
    User, Building2, Phone, Mail, FileText, Search, RefreshCw, Check, ChevronDown, MapPin,
} from "lucide-react";
import * as o2dAPI from "../../api/o2dAPI";
import { useAuth } from "../../context/AuthContext";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "../../lib/utils";

const STAGE_COLUMNS: { key: string; label: string }[] = [
    { key: "fm", label: "First Meeting" },
    { key: "proposal", label: "Proposal" },
    { key: "demo", label: "Demonstration" },
    { key: "negotiation", label: "Negotiation" },
    { key: "close", label: "Closer" },
];

const INDIA_STATES = [
    "Andaman and Nicobar Islands",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu and Kashmir",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Ladakh",
    "Lakshadweep",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
] as const;

type StageStatus = "completed" | "overdue" | "pending" | "not_started";

interface StageInfo {
    key: string;
    label: string;
    planned: string | null;
    actual: string | null;
    status: StageStatus;
}

interface PipelineEnquiry {
    id: number;
    enq_no: string;
    name: string;
    city: string | null;
    state: string | null;
    company_name: string | null;
    mobile: string;
    email: string | null;
    requirement: string | null;
    sales_person: string;
    created_at: string;
    stages: StageInfo[];
    current_stage: string | null;
    overall_status: "completed" | "overdue" | "pending" | "blocked";
}

interface EnquiryForm {
    name: string;
    city: string;
    state: string;
    company_name: string;
    mobile: string;
    email: string;
    requirement: string;
    sales_person: string;
}

const emptyForm: EnquiryForm = {
    name: "",
    city: "",
    state: "",
    company_name: "",
    mobile: "",
    email: "",
    requirement: "",
    sales_person: "",
};

const EnquiryPipeline = () => {
    const { user } = useAuth();
    const currentUserName = user?.user_name || user?.username || "";
    const isAdmin = ["admin", "all access"].includes((user?.role || "").toLowerCase());

    const [loading, setLoading] = useState(false);
    const [enquiries, setEnquiries] = useState<PipelineEnquiry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [marketingUsers, setMarketingUsers] = useState<{ id: number; user_name: string }[]>([]);
    const [message, setMessage] = useState<{ type: "success" | "error" | null; text: string }>({ type: null, text: "" });

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<EnquiryForm>(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const [completingKey, setCompletingKey] = useState<string | null>(null);
    const [stageFilter, setStageFilter] = useState<"all" | string>("all");
    const [modeFilter, setModeFilter] = useState<"pending" | "completed">("pending");

    useEffect(() => {
        if (!isAdmin && currentUserName) {
            setForm((f) => ({ ...f, sales_person: currentUserName }));
        }
    }, [currentUserName, isAdmin]);

    useEffect(() => { if (user) fetchEnquiries(); }, [user]);

    useEffect(() => {
        const fetchMarketingUsers = async () => {
            try {
                const response = await o2dAPI.getMarketingUsers();
                if (response.data.success) setMarketingUsers(response.data.data);
            } catch (err) {
                console.error("Error fetching marketing users:", err);
            }
        };
        fetchMarketingUsers();
    }, []);

    const fetchEnquiries = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await o2dAPI.getPipelineEnquiries();
            if (response.data.success) setEnquiries(response.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to fetch enquiries");
        } finally {
            setLoading(false);
        }
    };

    const updateFormField = <K extends keyof EnquiryForm>(field: K, value: EnquiryForm[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: null, text: "" });
        if (!form.name || !form.mobile || !form.sales_person) {
            setMessage({ type: "error", text: "Name, Mobile and Sales Person are required." });
            return;
        }
        setSubmitting(true);
        try {
            const response = await o2dAPI.createPipelineEnquiry(form);
            if (response.data.success) {
                setMessage({ type: "success", text: "Enquiry created. First Meeting stage is now pending." });
                setForm({ ...emptyForm, sales_person: !isAdmin ? currentUserName : "" });
                setShowForm(false);
                fetchEnquiries();
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Failed to create enquiry." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCompleteStage = async (id: number, stage: string) => {
        const key = `${id}-${stage}`;
        setCompletingKey(key);
        try {
            const response = await o2dAPI.completePipelineStage(id, stage);
            if (response.data.success) {
                setEnquiries((prev) => prev.map((e) => (e.id === id ? response.data.data : e)));
            }
        } catch (err: any) {
            setError(err.response?.data?.message || `Failed to complete ${stage} stage`);
        } finally {
            setCompletingKey(null);
        }
    };

    const filteredEnquiries = useMemo(() => {
        if (stageFilter === "all") {
            return modeFilter === "completed"
                ? enquiries.filter((e) => e.overall_status === "completed")
                : enquiries.filter((e) => e.overall_status !== "completed");
        }

        if (modeFilter === "pending") {
            return enquiries.filter((e) => e.current_stage === stageFilter);
        }

        // completed: that specific stage's actual is set — filtered & sorted by its actual timestamp
        return enquiries
            .filter((e) => e.stages.find((s) => s.key === stageFilter)?.actual)
            .slice()
            .sort((a, b) => {
                const aTime = new Date(a.stages.find((s) => s.key === stageFilter)!.actual!).getTime();
                const bTime = new Date(b.stages.find((s) => s.key === stageFilter)!.actual!).getTime();
                return bTime - aTime;
            });
    }, [enquiries, stageFilter, modeFilter]);

    const stageCounts = useMemo(() => {
        const counts: Record<string, { pending: number; completed: number }> = {
            all: {
                pending: enquiries.filter((e) => e.overall_status !== "completed").length,
                completed: enquiries.filter((e) => e.overall_status === "completed").length,
            },
        };
        STAGE_COLUMNS.forEach((s) => {
            counts[s.key] = {
                pending: enquiries.filter((e) => e.current_stage === s.key).length,
                completed: enquiries.filter((e) => e.stages.find((st) => st.key === s.key)?.actual).length,
            };
        });
        return counts;
    }, [enquiries]);

    const stageFilterLabel = stageFilter === "all" ? "All" : STAGE_COLUMNS.find((s) => s.key === stageFilter)?.label || "";

    const fmtDateTime = (d: string | null) => {
        if (!d) return "—";
        try { return format(new Date(d), "dd MMM, hh:mm a"); } catch { return d; }
    };

    const getLocationText = (city: string | null, state: string | null) =>
        [city, state].filter((value): value is string => Boolean(value && value.trim())).join(", ");

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-2 sm:p-4 lg:p-6">
            <div className="w-full mx-auto space-y-4">

                {/* Header */}
                <div className="bg-[#1e40af] px-3 py-2.5 sm:px-6 sm:py-4 rounded-t-xl flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-white/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                            <GitBranch className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-white text-sm sm:text-lg font-bold tracking-tight leading-tight">Sales FMS</h1>
                            <p className="text-blue-200 text-[8px] sm:text-[10px] uppercase font-bold tracking-widest hidden sm:block">
                                First Meeting &rarr; Proposal &rarr; Demonstration &rarr; Negotiation &rarr; Closer
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchEnquiries}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all border border-white/10"
                            title="Refresh"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", loading && "animate-spin")} />
                        </button>
                        <button
                            onClick={() => setShowForm((s) => !s)}
                            className="bg-white text-[#1e40af] hover:bg-blue-50 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all"
                        >
                            {showForm ? <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            <span>{showForm ? "Close" : "New Enquiry"}</span>
                        </button>
                    </div>
                </div>

                {/* Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5 space-y-3">
                        {message.type && (
                            <div className={cn(
                                "p-3 rounded-lg border-l-4 flex items-center gap-3",
                                message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-500" : "bg-rose-50 text-rose-800 border-rose-500"
                            )}>
                                {message.type === "success"
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    : <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                                <p className="font-semibold text-xs sm:text-sm">{message.text}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
                            <Field label="Firm Name(New)" icon={Building2} required>
                                <input
                                    value={form.name}
                                    onChange={(e) => updateFormField("name", e.target.value)}
                                    className={inputCls}
                                    placeholder="Enter firm name"
                                    required
                                />
                            </Field>
                            <Field label="City" icon={MapPin}>
                                <input
                                    value={form.city}
                                    onChange={(e) => updateFormField("city", e.target.value)}
                                    className={inputCls}
                                    placeholder="Enter city"
                                />
                            </Field>
                            <Field label="State" icon={MapPin}>
                                <div className="relative">
                                    <select
                                        value={form.state}
                                        onChange={(e) => updateFormField("state", e.target.value)}
                                        className={cn(inputCls, "appearance-none pr-8")}
                                    >
                                        <option value="">Select state</option>
                                        {INDIA_STATES.map((stateName) => (
                                            <option key={stateName} value={stateName}>{stateName}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                            </Field>
                            <Field label="Contact Person" icon={User}>
                                <input
                                    value={form.company_name}
                                    onChange={(e) => updateFormField("company_name", e.target.value)}
                                    className={inputCls}
                                    placeholder="Enter contact person"
                                />
                            </Field>
                            <Field label="Contact No" icon={Phone} required>
                                <input
                                    value={form.mobile}
                                    onChange={(e) => updateFormField("mobile", e.target.value)}
                                    className={inputCls}
                                    inputMode="tel"
                                    placeholder="Enter contact number"
                                    required
                                />
                            </Field>
                            <Field label="E-mail" icon={Mail}>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => updateFormField("email", e.target.value)}
                                    className={inputCls}
                                    placeholder="name@company.com"
                                />
                            </Field>
                            <Field label="Sales Person" icon={User} required>
                                {isAdmin ? (
                                    <div className="relative">
                                        <select
                                            value={form.sales_person}
                                            onChange={(e) => updateFormField("sales_person", e.target.value)}
                                            className={cn(inputCls, "appearance-none pr-8")}
                                            required
                                        >
                                            <option value="">Select Sales Person</option>
                                            {marketingUsers.map((u) => (
                                                <option key={u.id} value={u.user_name}>{u.user_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                ) : (
                                    <input
                                        value={form.sales_person}
                                        readOnly
                                        className={cn(inputCls, "bg-slate-100 text-slate-500 cursor-not-allowed")}
                                        placeholder="Sales person"
                                        required
                                    />
                                )}
                            </Field>
                            <Field label="Description" icon={FileText} className="sm:col-span-2 xl:col-span-4">
                                <textarea
                                    value={form.requirement}
                                    onChange={(e) => updateFormField("requirement", e.target.value)}
                                    className={cn(inputCls, "resize-none")}
                                    rows={3}
                                    placeholder="Enter customer requirement"
                                />
                            </Field>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="h-9 sm:h-10 px-4 sm:px-6 bg-[#1e40af] text-white rounded-lg hover:bg-blue-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 active:scale-95"
                            >
                                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                <span>{submitting ? "Saving..." : "Save Enquiry"}</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* Filters — stage-wise */}
                <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {([{ key: "all", label: "All" }, ...STAGE_COLUMNS] as { key: string; label: string }[]).map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setStageFilter(key)}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                    stageFilter === key
                                        ? "bg-[#1e40af] text-white border-[#1e40af]"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {(["pending", "completed"] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setModeFilter(mode)}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                    modeFilter === mode
                                        ? "bg-slate-800 text-white border-slate-800"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                )}
                            >
                                {stageFilterLabel} {mode === "pending" ? "Pending" : "Completed"}{" "}
                                <span className="opacity-70">({stageCounts[stageFilter]?.[mode] ?? 0})</span>
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <p className="text-rose-800 font-semibold text-xs sm:text-sm">{error}</p>
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-slate-500 font-medium text-sm">Loading pipeline...</p>
                    </div>
                ) : filteredEnquiries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 gap-3 bg-white border border-slate-100 rounded-xl">
                        <Search className="w-10 h-10 text-slate-300" />
                        <p className="text-base font-semibold text-slate-700">No enquiries found</p>
                        <p className="text-xs text-slate-400 text-center">Create a new enquiry to start tracking its pipeline.</p>
                    </div>
                ) : (
                    <>
                        {/* ─── Mobile Card List (< lg) — no horizontal scroll ─── */}
                        <div className="lg:hidden space-y-2.5">
                            {filteredEnquiries.map((enq) => {
                                const activeStage = enq.stages.find((s) => s.key === enq.current_stage);
                                const isOverdue = activeStage?.status === "overdue";
                                const isBlocked = activeStage?.status === "not_started";
                                const key = activeStage ? `${enq.id}-${activeStage.key}` : "";

                                return (
                                    <div key={enq.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100 gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-xs font-black text-blue-700 flex-shrink-0">{enq.enq_no}</span>
                                                <span className="w-px h-3 bg-slate-200 flex-shrink-0" />
                                                <span className="text-xs font-bold text-slate-800 truncate">{enq.name}</span>
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase flex-shrink-0">
                                                {activeStage ? activeStage.label : "Completed"}
                                            </span>
                                        </div>

                                        <div className="px-3 py-2.5 space-y-2.5">
                                            <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 font-medium">
                                                {getLocationText(enq.city, enq.state) && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {getLocationText(enq.city, enq.state)}
                                                    </span>
                                                )}
                                                {enq.company_name && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {enq.company_name}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {enq.sales_person}</span>
                                            </div>

                                            <div className="rounded-lg border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                                                {enq.stages.map((stage) => (
                                                    <div key={stage.key} className="flex items-center justify-between px-2.5 py-1.5 text-[10px]">
                                                        <span className="font-bold text-slate-500">{stage.label}</span>
                                                        {stage.actual ? (
                                                            <span className="text-slate-600">Done — {fmtDateTime(stage.actual)}</span>
                                                        ) : stage.planned ? (
                                                            <span className="text-slate-600">Pending — {fmtDateTime(stage.planned)}</span>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {isOverdue && activeStage?.planned && (
                                                <p className="text-[10px] text-slate-500">
                                                    Overdue by {formatDistanceToNow(new Date(activeStage.planned))}
                                                </p>
                                            )}

                                            {modeFilter === "pending" && activeStage && !isBlocked && (
                                                <button
                                                    onClick={() => handleCompleteStage(enq.id, activeStage.key)}
                                                    disabled={completingKey === key}
                                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1e40af] text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {completingKey === key
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <Check className="w-3.5 h-3.5" />}
                                                    Mark {activeStage.label} Complete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ─── Desktop Table (lg+) ─── */}
                        <div className="hidden lg:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
                            <table className="w-full border-separate border-spacing-0 text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {['#', 'Enq No', 'Firm Name', 'City', 'State', 'Contact Person', 'Sales Person', ...STAGE_COLUMNS.map((s) => s.label), 'Pending Stage', ''].map((h) => (
                                            <th key={h} className="sticky top-0 px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap bg-slate-50 z-10 border-b-2 border-slate-200">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEnquiries.map((enq, i) => {
                                        const activeStage = enq.stages.find((s) => s.key === enq.current_stage);
                                        const isOverdue = activeStage?.status === "overdue";
                                        const isBlocked = activeStage?.status === "not_started";
                                        const key = activeStage ? `${enq.id}-${activeStage.key}` : "";

                                        return (
                                            <tr key={enq.id} className="hover:bg-slate-50/60 transition-colors align-top">
                                                <td className="px-3 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{i + 1}</td>
                                                <td className="px-3 py-2.5 text-xs font-black text-slate-700 whitespace-nowrap">{enq.enq_no}</td>
                                                <td className="px-3 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap">{enq.name}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{enq.city || "—"}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{enq.state || "—"}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{enq.company_name || "—"}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{enq.sales_person}</td>

                                                {enq.stages.map((stage) => (
                                                    <td key={stage.key} className="px-3 py-2.5 text-[11px] text-slate-600 whitespace-nowrap">
                                                        {stage.actual ? (
                                                            <span>Done — {fmtDateTime(stage.actual)}</span>
                                                        ) : stage.planned ? (
                                                            <span>Pending — {fmtDateTime(stage.planned)}</span>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                ))}

                                                <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                                                    {activeStage ? (
                                                        <div>
                                                            <span className="font-bold text-slate-800">{activeStage.label}</span>
                                                            {isOverdue && activeStage.planned && (
                                                                <span className="block text-[10px] text-slate-500">
                                                                    Overdue by {formatDistanceToNow(new Date(activeStage.planned))}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-slate-400">Completed</span>
                                                    )}
                                                </td>

                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    {modeFilter === "pending" && activeStage && !isBlocked && (
                                                        <button
                                                            onClick={() => handleCompleteStage(enq.id, activeStage.key)}
                                                            disabled={completingKey === key}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 hover:border-slate-400 text-[10px] font-bold text-slate-600 transition-all disabled:opacity-50"
                                                        >
                                                            {completingKey === key
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <Check className="w-3 h-3" />}
                                                            Mark Complete
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const inputCls = "w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-semibold text-slate-700 shadow-sm text-xs sm:text-sm";

function Field({
    label,
    icon: Icon,
    required,
    children,
    className,
}: {
    label: string;
    icon: React.ElementType;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("space-y-1", className)}>
            <label className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                <Icon className="w-4 h-4 text-blue-500" />
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
        </div>
    );
}

export default EnquiryPipeline;
