import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    FileText,
    GitBranch,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    User,
    X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import * as o2dAPI from "../../api/o2dAPI";
import { useAuth } from "../../context/AuthContext";
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
    const [message, setMessage] = useState<{ type: "success" | "error" | null; text: string }>({
        type: null,
        text: "",
    });

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<EnquiryForm>(emptyForm);
    const [editingEnquiryId, setEditingEnquiryId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; enq_no: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [completingKey, setCompletingKey] = useState<string | null>(null);
    const [stageFilter, setStageFilter] = useState<"all" | string>("all");
    const [modeFilter, setModeFilter] = useState<"pending" | "completed">("pending");

    useEffect(() => {
        if (!isAdmin && currentUserName) {
            setForm((prev) => ({ ...prev, sales_person: currentUserName }));
        }
    }, [currentUserName, isAdmin]);

    useEffect(() => {
        if (user) {
            fetchEnquiries();
        }
    }, [user]);

    useEffect(() => {
        const fetchMarketingUsers = async () => {
            try {
                const response = await o2dAPI.getMarketingUsers();
                if (response.data.success) {
                    setMarketingUsers(response.data.data);
                }
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
            if (response.data.success) {
                setEnquiries(response.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to fetch enquiries");
        } finally {
            setLoading(false);
        }
    };

    const updateFormField = <K extends keyof EnquiryForm>(field: K, value: EnquiryForm[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const resetFormState = () => {
        setEditingEnquiryId(null);
        setForm({
            ...emptyForm,
            sales_person: !isAdmin ? currentUserName : "",
        });
    };

    const handleToggleForm = () => {
        setError(null);
        setMessage({ type: null, text: "" });
        setDeleteTarget(null);

        if (showForm) {
            setShowForm(false);
            resetFormState();
            return;
        }

        resetFormState();
        setShowForm(true);
    };

    const handleEditEnquiry = (enq: PipelineEnquiry) => {
        setError(null);
        setMessage({ type: null, text: "" });
        setDeleteTarget(null);
        setEditingEnquiryId(enq.id);
        setForm({
            name: enq.name || "",
            city: enq.city || "",
            state: enq.state || "",
            company_name: enq.company_name || "",
            mobile: enq.mobile || "",
            email: enq.email || "",
            requirement: enq.requirement || "",
            sales_person: enq.sales_person || (!isAdmin ? currentUserName : ""),
        });
        setShowForm(true);
    };

    const requestDeleteEnquiry = (enq: PipelineEnquiry) => {
        setError(null);
        setMessage({ type: null, text: "" });
        setDeleteTarget({ id: enq.id, enq_no: enq.enq_no });
    };

    const handleDeleteEnquiry = async () => {
        if (!deleteTarget) return;

        setDeletingId(deleteTarget.id);
        setError(null);
        setMessage({ type: null, text: "" });

        try {
            const response = await o2dAPI.deletePipelineEnquiry(deleteTarget.id);
            if (response.data.success) {
                setMessage({ type: "success", text: `${deleteTarget.enq_no} deleted successfully.` });

                if (editingEnquiryId === deleteTarget.id) {
                    setShowForm(false);
                    resetFormState();
                }

                await fetchEnquiries();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to delete enquiry.");
        } finally {
            setDeleteTarget(null);
            setDeletingId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage({ type: null, text: "" });
        setDeleteTarget(null);

        if (!form.name || !form.mobile || !form.sales_person) {
            setMessage({ type: "error", text: "Name, Mobile and Sales Person are required." });
            return;
        }

        setSubmitting(true);
        try {
            const response = editingEnquiryId
                ? await o2dAPI.updatePipelineEnquiry(editingEnquiryId, form)
                : await o2dAPI.createPipelineEnquiry(form);

            if (response.data.success) {
                setMessage({
                    type: "success",
                    text: editingEnquiryId
                        ? "Enquiry updated successfully."
                        : "Enquiry created. First Meeting stage is now pending.",
                });
                setShowForm(false);
                resetFormState();
                await fetchEnquiries();
            }
        } catch (err: any) {
            setMessage({
                type: "error",
                text: err.response?.data?.message || `Failed to ${editingEnquiryId ? "update" : "create"} enquiry.`,
            });
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
                setEnquiries((prev) => prev.map((item) => (item.id === id ? response.data.data : item)));
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
                ? enquiries.filter((enquiry) => enquiry.overall_status === "completed")
                : enquiries.filter((enquiry) => enquiry.overall_status !== "completed");
        }

        if (modeFilter === "pending") {
            return enquiries.filter((enquiry) => enquiry.current_stage === stageFilter);
        }

        return enquiries
            .filter((enquiry) => enquiry.stages.find((stage) => stage.key === stageFilter)?.actual)
            .slice()
            .sort((a, b) => {
                const aTime = new Date(a.stages.find((stage) => stage.key === stageFilter)!.actual!).getTime();
                const bTime = new Date(b.stages.find((stage) => stage.key === stageFilter)!.actual!).getTime();
                return bTime - aTime;
            });
    }, [enquiries, stageFilter, modeFilter]);

    const stageCounts = useMemo(() => {
        const counts: Record<string, { pending: number; completed: number }> = {
            all: {
                pending: enquiries.filter((enquiry) => enquiry.overall_status !== "completed").length,
                completed: enquiries.filter((enquiry) => enquiry.overall_status === "completed").length,
            },
        };

        STAGE_COLUMNS.forEach((stage) => {
            counts[stage.key] = {
                pending: enquiries.filter((enquiry) => enquiry.current_stage === stage.key).length,
                completed: enquiries.filter((enquiry) => enquiry.stages.find((item) => item.key === stage.key)?.actual).length,
            };
        });

        return counts;
    }, [enquiries]);

    const stageFilterLabel =
        stageFilter === "all"
            ? "All"
            : STAGE_COLUMNS.find((stage) => stage.key === stageFilter)?.label || "";

    const fmtDateTime = (value: string | null) => {
        if (!value) return "-";
        try {
            return format(new Date(value), "dd MMM, hh:mm a");
        } catch {
            return value;
        }
    };

    const getLocationText = (city: string | null, state: string | null) =>
        [city, state].filter((value): value is string => Boolean(value && value.trim())).join(", ");

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-2 sm:p-4 lg:p-6">
            <div className="w-full mx-auto space-y-4">
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
                            type="button"
                            onClick={fetchEnquiries}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all border border-white/10"
                            title="Refresh"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", loading && "animate-spin")} />
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleForm}
                            className="bg-white text-[#1e40af] hover:bg-blue-50 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all"
                        >
                            {showForm ? <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            <span>{showForm ? "Close" : "New Enquiry"}</span>
                        </button>
                    </div>
                </div>

                {message.type && (
                    <div
                        className={cn(
                            "bg-white p-3 rounded-lg border-l-4 flex items-center gap-3",
                            message.type === "success"
                                ? "text-emerald-800 border-emerald-500"
                                : "text-rose-800 border-rose-500"
                        )}
                    >
                        {message.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        )}
                        <p className="font-semibold text-xs sm:text-sm">{message.text}</p>
                    </div>
                )}

                {deleteTarget && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                        onClick={() => {
                            if (deletingId !== deleteTarget.id) {
                                setDeleteTarget(null);
                            }
                        }}
                    >
                        <div
                            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-4 sm:p-5 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm font-semibold text-slate-700">
                                    Delete enquiry <span className="text-slate-900">{deleteTarget.enq_no}</span>? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deletingId === deleteTarget.id}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteEnquiry}
                                    disabled={deletingId === deleteTarget.id}
                                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs sm:text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {deletingId === deleteTarget.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
                            <Field label="Firm Name" icon={Building2} required>
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
                                            <option key={stateName} value={stateName}>
                                                {stateName}
                                            </option>
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
                                            {marketingUsers.map((marketingUser) => (
                                                <option key={marketingUser.id} value={marketingUser.user_name}>
                                                    {marketingUser.user_name}
                                                </option>
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
                                <span>
                                    {submitting
                                        ? editingEnquiryId
                                            ? "Updating..."
                                            : "Saving..."
                                        : editingEnquiryId
                                            ? "Update Enquiry"
                                            : "Save Enquiry"}
                                </span>
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {[{ key: "all", label: "All" }, ...STAGE_COLUMNS].map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
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
                                type="button"
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
                        <div className="lg:hidden space-y-2.5">
                            {filteredEnquiries.map((enq) => {
                                const activeStage = enq.stages.find((stage) => stage.key === enq.current_stage);
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

                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditEnquiry(enq)}
                                                    className="rounded-md border border-blue-200 bg-blue-50 p-1 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                                    title="Edit enquiry"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => requestDeleteEnquiry(enq)}
                                                    disabled={deletingId === enq.id}
                                                    className="rounded-md border border-rose-200 bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors disabled:opacity-50"
                                                    title="Delete enquiry"
                                                >
                                                    {deletingId === enq.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="px-3 py-2.5 space-y-2.5">
                                            <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {enq.mobile}
                                                </span>

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

                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {enq.sales_person}
                                                </span>

                                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                    {activeStage ? activeStage.label : "Completed"}
                                                </span>
                                            </div>

                                            <div className="rounded-lg border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                                                {enq.stages.map((stage) => (
                                                    <div key={stage.key} className="flex items-center justify-between px-2.5 py-1.5 text-[10px]">
                                                        <span className="font-bold text-slate-500">{stage.label}</span>
                                                        {stage.actual ? (
                                                            <span className="text-slate-600">Done - {fmtDateTime(stage.actual)}</span>
                                                        ) : stage.planned ? (
                                                            <span className="text-slate-600">Pending - {fmtDateTime(stage.planned)}</span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
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
                                                    type="button"
                                                    onClick={() => handleCompleteStage(enq.id, activeStage.key)}
                                                    disabled={completingKey === key}
                                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1e40af] text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {completingKey === key ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Check className="w-3.5 h-3.5" />
                                                    )}
                                                    Mark {activeStage.label} Complete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="hidden lg:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
                            <table className="w-full border-separate border-spacing-0 text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {[
                                            "#",
                                            "Enq No",
                                            "Firm Name",
                                            "City",
                                            "State",
                                            "Contact Person",
                                            "Contact No",
                                            "Sales Person",
                                            ...STAGE_COLUMNS.map((stage) => stage.label),
                                            "Pending Stage",
                                            "Actions",
                                        ].map((header) => (
                                            <th
                                                key={header}
                                                className="sticky top-0 px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap bg-slate-50 z-10 border-b-2 border-slate-200"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {filteredEnquiries.map((enq, index) => {
                                        const activeStage = enq.stages.find((stage) => stage.key === enq.current_stage);
                                        const isOverdue = activeStage?.status === "overdue";
                                        const isBlocked = activeStage?.status === "not_started";
                                        const key = activeStage ? `${enq.id}-${activeStage.key}` : "";

                                        return (
                                            <tr key={enq.id} className="hover:bg-slate-50/60 transition-colors align-top">
                                                <td className="px-3 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{index + 1}</td>
                                                <td className="px-3 py-2.5 text-xs font-black text-slate-700 whitespace-nowrap">{enq.enq_no}</td>
                                                <td className="px-3 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap">{enq.name}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{enq.city || "-"}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{enq.state || "-"}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{enq.company_name || "-"}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{enq.mobile || "-"}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{enq.sales_person}</td>

                                                {enq.stages.map((stage) => (
                                                    <td key={stage.key} className="px-3 py-2.5 text-[11px] text-slate-600 whitespace-nowrap">
                                                        {stage.actual ? (
                                                            <span>Done - {fmtDateTime(stage.actual)}</span>
                                                        ) : stage.planned ? (
                                                            <span>Pending - {fmtDateTime(stage.planned)}</span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
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
                                                    <div className="flex items-center gap-2">
                                                        {modeFilter === "pending" && activeStage && !isBlocked && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCompleteStage(enq.id, activeStage.key)}
                                                                disabled={completingKey === key}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 hover:border-slate-400 text-[10px] font-bold text-slate-600 transition-all disabled:opacity-50"
                                                            >
                                                                {completingKey === key ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <Check className="w-3 h-3" />
                                                                )}
                                                                Mark Complete
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditEnquiry(enq)}
                                                            className="rounded-md border border-blue-200 bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                                            title="Edit enquiry"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => requestDeleteEnquiry(enq)}
                                                            disabled={deletingId === enq.id}
                                                            className="rounded-md border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors disabled:opacity-50"
                                                            title="Delete enquiry"
                                                        >
                                                            {deletingId === enq.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
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

const inputCls =
    "w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-semibold text-slate-700 shadow-sm text-xs sm:text-sm";

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
