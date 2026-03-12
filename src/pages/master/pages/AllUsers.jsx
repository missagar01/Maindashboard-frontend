import { useEffect, useState } from "react";
import {
    AlertTriangle,
    Award,
    BadgeCheck,
    Clock3,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Target,
} from "lucide-react";
import { fetchAttendanceSummaryApi } from "../../../api/master/attendenceApi";
import {
    getCompletedTaskApi,
    getCompletedTodayApi,
    getOverdueTaskApi,
    getPendingTaskApi,
    getPendingTodayApi,
} from "../../../api/master/dashboardApi";
import { fetchUserDetailsApiById } from "../../../api/master/settingApi";
import { patchEmpImageApi } from "../../../api/master/userApi";
import { fetchUserScoreApiByName } from "../../../api/master/userScoreApi";
import { apiCache, decodeToken, storage } from "../runtime";

const SECTION_PAD = "py-[clamp(1.5rem,0.9rem+2vw,3rem)]";
const CONTAINER = "max-w-[86rem] px-0 sm:px-[clamp(1rem,0.7rem+1vw,2rem)] md:px-[clamp(1.5rem,1rem+1.1vw,2.5rem)]";
const HERO = "rounded-none border-y border-slate-100 bg-white/95 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.24)] sm:rounded-[3rem] sm:border";
const CARD = "rounded-none border-y border-slate-100 bg-white/95 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.18)] sm:rounded-[2.5rem] sm:border";
const PAD = "px-4 py-5 sm:px-[clamp(1.5rem,0.9rem+1.8vw,2.6rem)] sm:py-[clamp(1.35rem,0.85rem+1.4vw,2.3rem)]";
const PAD_LG = "px-4 py-5 sm:px-[clamp(1.75rem,1rem+2vw,3.25rem)] sm:py-[clamp(1.75rem,1.1rem+1.9vw,3rem)]";
const GRID_GAP = "gap-[clamp(1.25rem,0.7rem+1.6vw,2.25rem)]";
const NAME = "text-[clamp(1.9rem,1.3rem+1.85vw,3.75rem)]";
const TITLE = "text-[clamp(1.45rem,1.1rem+0.95vw,2.25rem)]";
const ROLE = "text-[clamp(1rem,0.92rem+0.45vw,1.35rem)]";
const BODY = "text-[clamp(0.98rem,0.9rem+0.28vw,1.12rem)]";
const LABEL = "text-[clamp(0.62rem,0.56rem+0.14vw,0.74rem)]";
const VALUE = "text-[clamp(1.35rem,1.05rem+0.95vw,2.15rem)]";
const STATUS = "text-[clamp(0.7rem,0.64rem+0.16vw,0.82rem)]";
const ICON_BOX = "h-[clamp(3rem,2.5rem+0.8vw,3.9rem)] w-[clamp(3rem,2.5rem+0.8vw,3.9rem)]";
const ICON = "h-[clamp(1.35rem,1.15rem+0.45vw,1.8rem)] w-[clamp(1.35rem,1.15rem+0.45vw,1.8rem)]";
const AVATAR = "h-[clamp(8.5rem,7rem+5vw,13rem)] w-[clamp(8.5rem,7rem+5vw,13rem)]";

const formatDate = (date) => date.toISOString().split("T")[0];

const buildMonthOptions = (count = 6) => {
    const today = new Date();
    return Array.from({ length: count }).map((_, index) => {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - index, 1);
        const isCurrentMonth =
            monthDate.getMonth() === today.getMonth() &&
            monthDate.getFullYear() === today.getFullYear();

        return {
            key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
            label: monthDate.toLocaleString("default", { month: "long", year: "numeric" }),
            startDate: formatDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)),
            endDate: isCurrentMonth
                ? formatDate(today)
                : formatDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)),
            isCurrentMonth,
        };
    });
};

const HomePage = () => {
    const [userDetails, setUserDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState(null);
    const [pendingToday, setPendingToday] = useState(0);
    const [completedToday, setCompletedToday] = useState(0);
    const [completed, setCompleted] = useState(0);
    const [pending, setPending] = useState(0);
    const [overdue, setOverdue] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [uploadWarning, setUploadWarning] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState("");
    const [userScore, setUserScore] = useState(null);

    const monthOptions = buildMonthOptions(6);
    const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);

    const handleEmpImageChange = async (event) => {
        const file = event.target.files?.[0];
        const maxFileSize = 5 * 1024 * 1024;
        const warnFileSize = 3 * 1024 * 1024;
        const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/webp"];

        if (!file || uploading || !userDetails?.id) return;

        setUploadWarning("");
        setUploadSuccess("");

        if (!allowedFormats.includes(file.type)) {
            setUploadWarning("Invalid file format. Allowed formats: JPEG, PNG, GIF, WebP.");
            event.target.value = "";
            return;
        }

        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        if (file.size > maxFileSize) {
            setUploadWarning(`File size (${fileSizeInMB}MB) exceeds the maximum limit of 5MB.`);
            event.target.value = "";
            return;
        }

        if (file.size > warnFileSize) {
            setUploadWarning(`File size (${fileSizeInMB}MB) is large. Consider using a smaller image.`);
        }

        try {
            setUploading(true);
            setImageError(false);
            await patchEmpImageApi(userDetails.id, file);
            const result = await fetchUserDetailsApiById(userDetails.id);

            if (!result?.data?.emp_image) throw new Error("Image update failed");

            setUserDetails(result.data);
            apiCache.set(`user_${userDetails.id}`, result.data);
            apiCache.invalidate("users_all");
            setUploadSuccess("Profile image updated successfully.");
            setTimeout(() => setUploadSuccess(""), 15000);
        } catch (error) {
            console.error("Profile image upload failed:", error);
            setUploadWarning(`Failed to update profile image. ${error.message || "Please try again."}`);
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    useEffect(() => {
        const fetchEmployeeDetails = async () => {
            try {
                setLoading(true);
                const username = storage.get("user-name");
                const role = storage.get("role");
                const token = storage.get("token");
                const decodedToken = decodeToken(token);
                const userId = decodedToken?.id || storage.get("user_id");

                if (!userId || ["admin", "aakash agrawal"].includes(username?.toLowerCase())) {
                    setLoading(false);
                    return;
                }

                let matchedUser = apiCache.get(`user_${userId}`);
                if (!matchedUser) {
                    matchedUser = await fetchUserDetailsApiById(userId);
                    apiCache.set(`user_${userId}`, matchedUser);
                }
                setUserDetails(matchedUser || null);

                if (matchedUser?.user_name) {
                    const scoreResponse = await fetchUserScoreApiByName(matchedUser.user_name, {
                        startDate: selectedMonth.startDate,
                        endDate: selectedMonth.endDate,
                    });
                    setUserScore(scoreResponse?.data?.[0] || null);
                }

                const attendanceResponse = await fetchAttendanceSummaryApi();
                const attendanceList = Array.isArray(attendanceResponse?.data?.data)
                    ? attendanceResponse.data.data
                    : [];
                const matchedAttendance = attendanceList.find(
                    (entry) => String(entry.employee_id).trim() === String(matchedUser?.employee_id).trim()
                );
                setAttendance(matchedAttendance || null);

                const cacheKey = `stats_${username}_${selectedMonth.key}`;
                let stats = apiCache.get(cacheKey);
                if (!stats) {
                    const dashboardType = "checklist";
                    const [
                        pendingCountToday,
                        completedCountToday,
                        completedCount,
                        pendingCount,
                        overdueCount,
                    ] = await Promise.all([
                        getPendingTodayApi({ dashboardType, role, username }),
                        getCompletedTodayApi({ dashboardType, role, username }),
                        getCompletedTaskApi({ dashboardType, role, username }),
                        getPendingTaskApi({ dashboardType, role, username }),
                        getOverdueTaskApi({ dashboardType, role, username }),
                    ]);
                    stats = {
                        pendingCountToday,
                        completedCountToday,
                        completedCount,
                        pendingCount,
                        overdueCount,
                    };
                    apiCache.set(cacheKey, stats, 60 * 1000);
                }

                setPendingToday(stats.pendingCountToday || 0);
                setCompletedToday(stats.completedCountToday || 0);
                setCompleted(Number(stats.completedCount) || 0);
                setPending(Number(stats.pendingCount) || 0);
                setOverdue(Number(stats.overdueCount) || 0);
            } catch (error) {
                console.error("Error fetching employee details:", error);
            } finally {
                setLoading(false);
            }
        };

        void fetchEmployeeDetails();
    }, [selectedMonth]);

    const scoreRadius = 72;
    const scoreSize = 196;
    const scoreCenter = scoreSize / 2;
    const scoreCircumference = 2 * Math.PI * scoreRadius;
    const rawScore = Number(userScore?.total_score ?? 0);
    const clampedScore = Math.max(-100, Math.min(100, rawScore));
    const scorePercent = Math.min(100, Math.abs(clampedScore));
    const scoreStroke = (scorePercent / 100) * scoreCircumference;
    const scoreColor = clampedScore <= -51 ? "#ef4444" : clampedScore <= -26 ? "#f59e0b" : "#10b981";
    const scoreTone = clampedScore <= -51 ? "Needs recovery" : clampedScore <= -26 ? "Watch list" : "On track";
    const taskCompletionRate = completed + pending > 0 ? Math.round((completed / (completed + pending)) * 100) : 0;
    const attendancePresent = attendance?.status === "IN";
    const isActiveUser = userDetails?.status?.toLowerCase() === "active";

    const profileCards = [
        { key: "employee", label: "Employee ID", value: userDetails?.employee_id || "N/A", icon: BadgeCheck, tone: "bg-red-50 text-red-600 ring-red-100" },
        { key: "phone", label: "Contact Number", value: userDetails?.number || "N/A", icon: Phone, tone: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
        { key: "email", label: "Email Address", value: userDetails?.email_id || "N/A", icon: Mail, tone: "bg-blue-50 text-blue-600 ring-blue-100" },
    ];

    const activityCards = [
        { key: "pending", label: "Pending Today", value: pendingToday, tone: "border-amber-100 bg-amber-50 text-amber-600" },
        { key: "done", label: "Completed Today", value: completedToday, tone: "border-emerald-100 bg-emerald-50 text-emerald-600" },
        { key: "overdue", label: "Overdue", value: overdue, tone: "border-rose-100 bg-rose-50 text-rose-600" },
    ];

    const performanceCards = [
        { key: "tasks", label: "Total Tasks", value: userScore?.total_tasks ?? 0, tone: "bg-slate-50 text-slate-700" },
        { key: "completed", label: "Completed", value: userScore?.total_completed_tasks ?? 0, tone: "bg-emerald-50 text-emerald-700" },
        { key: "ontime", label: "On Time", value: userScore?.total_done_on_time ?? 0, tone: "bg-blue-50 text-blue-700" },
        { key: "open", label: "Open Work", value: pending, tone: "bg-amber-50 text-amber-700" },
    ];

    return (
        <div className="min-h-full w-full bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_48%,#eef2f7_100%)]">
            <section className={SECTION_PAD}>
                <div className={`container mx-auto ${CONTAINER}`}>
                    <div className={`relative mb-[clamp(1.5rem,0.9rem+1.8vw,2.75rem)] overflow-hidden ${HERO} ${PAD_LG}`}>
                        <div className="absolute left-0 top-0 h-40 w-40 -translate-x-1/3 -translate-y-1/3 rounded-full bg-red-50 blur-3xl" />
                        <div className="absolute bottom-0 right-0 h-40 w-40 translate-x-1/3 translate-y-1/3 rounded-full bg-blue-50 blur-3xl" />

                        <div className={`relative z-10 grid items-start ${GRID_GAP} xl:grid-cols-[auto_minmax(0,1fr)]`}>
                            <div className="mx-auto xl:mx-0">
                                <div className="relative group">
                                    <div className={`overflow-hidden rounded-[2rem] border-4 border-white bg-slate-100 shadow-[0_24px_44px_-22px_rgba(15,23,42,0.35)] ${AVATAR}`}>
                                        <img
                                            src={!imageError && userDetails?.emp_image ? userDetails.emp_image : "/user.png"}
                                            alt="Employee"
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                            loading="lazy"
                                            onError={() => setImageError(true)}
                                        />
                                    </div>
                                    <label
                                        title="Edit profile image"
                                        className={`absolute bottom-2 right-2 flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl text-white shadow-[0_18px_28px_-12px_rgba(239,68,68,0.65)] transition-all ${uploading ? "bg-slate-400" : "bg-gradient-to-br from-red-600 to-red-500 hover:scale-105"}`}
                                    >
                                        {uploading ? (
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        ) : (
                                            <Pencil className="h-[18px] w-[18px]" strokeWidth={2.5} />
                                        )}
                                        <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleEmpImageChange} />
                                    </label>
                                </div>
                            </div>

                            <div className="min-w-0">
                                {(uploadWarning || uploadSuccess) && (
                                    <div className="mb-4 space-y-3">
                                        {uploadWarning && (
                                            <div className="flex items-start gap-3 rounded-[1.4rem] border border-red-100 bg-red-50 px-4 py-3 text-red-700">
                                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                                <p className={`font-medium leading-[1.65] ${BODY}`}>{uploadWarning}</p>
                                            </div>
                                        )}
                                        {uploadSuccess && (
                                            <div className="flex items-start gap-3 rounded-[1.4rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-700">
                                                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                                                <p className={`font-medium leading-[1.65] ${BODY}`}>{uploadSuccess}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {loading ? (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <div className="h-10 w-64 animate-pulse rounded-2xl bg-slate-100" />
                                            <div className="h-5 w-40 animate-pulse rounded-xl bg-slate-100" />
                                            <div className="h-4 w-80 animate-pulse rounded-xl bg-slate-100" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                                            {Array.from({ length: 3 }).map((_, index) => (
                                                <div
                                                    key={index}
                                                    className={`rounded-[1.75rem] border border-slate-100 bg-slate-50/90 p-5 ${index === 2 ? "col-span-2 xl:col-span-1" : ""}`}
                                                >
                                                    <div className="mb-3 h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
                                                    <div className="mb-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
                                                    <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : userDetails ? (
                                    <div className="space-y-6 text-center xl:text-left">
                                        <div className="space-y-3">
                                            <div className="flex flex-col items-center gap-3 xl:flex-row">
                                                <h3 className={`font-black tracking-[-0.04em] text-slate-900 ${NAME}`}>{userDetails.user_name || "N/A"}</h3>
                                                <span className={`inline-flex w-fit items-center rounded-full px-4 py-2 font-bold uppercase tracking-[0.22em] ${STATUS} ${isActiveUser ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                                    {userDetails.status || "N/A"}
                                                </span>
                                            </div>
                                            <p className={`font-bold uppercase tracking-[0.2em] text-red-600/90 ${ROLE}`}>{userDetails.user_access || "N/A"}</p>
                                           
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                                            {profileCards.map((card, index) => {
                                                const IconComponent = card.icon;
                                                return (
                                                    <div
                                                        key={card.key}
                                                        className={`rounded-[1.75rem] border border-slate-100 bg-slate-50/90 p-5 text-left shadow-[0_12px_24px_-20px_rgba(15,23,42,0.22)] ${index === profileCards.length - 1 ? "col-span-2 xl:col-span-1" : ""}`}
                                                    >
                                                        <div className={`mb-4 flex items-center justify-center rounded-2xl ring-1 ${card.tone} ${ICON_BOX}`}>
                                                            <IconComponent className={ICON} />
                                                        </div>
                                                        <p className={`mb-2 font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>{card.label}</p>
                                                        <p className={`break-words font-bold text-slate-900 ${BODY}`}>{card.value}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center xl:text-left">
                                        <h3 className={`mb-2 font-black text-slate-900 ${TITLE}`}>User Not Found</h3>
                                        <p className={`text-slate-500 ${BODY}`}>Could not retrieve profile information at this time.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 xl:grid-cols-2 ${GRID_GAP}`}>
                        <div className={`${CARD} ${PAD}`}>
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <h3 className={`flex items-center gap-3 font-black text-slate-900 ${TITLE}`}>
                                        <span className="h-8 w-1.5 rounded-full bg-red-600" />
                                        Today's Activity
                                    </h3>
                                    <p className={`mt-2 max-w-[44ch] text-slate-500 ${BODY}`}>Daily task movement with pending, completed, and overdue load.</p>
                                </div>
                                <div className={`flex items-center justify-center rounded-2xl bg-red-50 text-red-600 ${ICON_BOX}`}>
                                    <Target className={ICON} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {activityCards.map((card, index) => (
                                    <div key={card.key} className={`rounded-[1.7rem] border px-4 py-5 text-center ${card.tone} ${index === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
                                        <div className={`mb-2 font-black tracking-[-0.04em] ${VALUE}`}>{card.value}</div>
                                        <div className={`font-bold uppercase tracking-[0.22em] text-slate-500 ${LABEL}`}>{card.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 rounded-[1.7rem] border border-slate-100 bg-slate-50/90 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <p className={`font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>Completion Rate</p>
                                    <p className={`font-black text-slate-800 ${BODY}`}>{taskCompletionRate}%</p>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-emerald-500" style={{ width: `${taskCompletionRate}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className={`${CARD} ${PAD}`}>
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <h3 className={`flex items-center gap-3 font-black text-slate-900 ${TITLE}`}>
                                        <span className="h-8 w-1.5 rounded-full bg-blue-600" />
                                        Attendance Status
                                    </h3>
                                    <p className={`mt-2 max-w-[42ch] text-slate-500 ${BODY}`}>Present status and current month attendance in one place.</p>
                                </div>
                                <div className={`flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ${ICON_BOX}`}>
                                    <Award className={ICON} />
                                </div>
                            </div>

                            {attendance ? (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-[1.7rem] border border-slate-100 bg-slate-50/90 px-4 py-5 text-center">
                                            <div className={`font-black tracking-[-0.04em] text-slate-900 ${VALUE}`}>
                                                {Number(attendance?.monthly_attendance ?? 0)}
                                                <span className="ml-1 text-blue-600/90">/{new Date().getDate()}</span>
                                            </div>
                                            <div className={`mt-2 font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>Monthly Count</div>
                                        </div>
                                        <div className="rounded-[1.7rem] border border-slate-100 bg-slate-50/90 px-4 py-5 text-center">
                                            <div className={`font-black uppercase tracking-[0.14em] ${ROLE} ${attendancePresent ? "text-emerald-600" : "text-red-600"}`}>
                                                {attendancePresent ? "Present" : "Absent"}
                                            </div>
                                            <div className={`mt-2 font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>Current Status</div>
                                        </div>
                                    </div>

                                    <div className={`flex items-start gap-3 rounded-[1.7rem] border px-4 py-4 ${attendancePresent ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-700"}`}>
                                        <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
                                        <div>
                                            <p className={`font-bold ${BODY}`}>{attendancePresent ? "You are marked present for today." : "No in-time attendance marked for today."}</p>
                                            <p className={`mt-1 font-bold uppercase tracking-[0.22em] ${LABEL} ${attendancePresent ? "text-emerald-600/80" : "text-red-600/80"}`}>Live attendance snapshot</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
                                    <Clock3 className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                                    <p className={`font-semibold text-slate-500 ${BODY}`}>No attendance data found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`relative mt-[clamp(1.25rem,0.75rem+1.5vw,2.25rem)] overflow-hidden ${HERO} ${PAD_LG}`}>
                        <div className="absolute left-0 top-0 h-48 w-48 -translate-x-1/3 -translate-y-1/3 rounded-full bg-red-50 blur-3xl" />
                        <div className="absolute bottom-0 right-0 h-48 w-48 translate-x-1/3 translate-y-1/3 rounded-full bg-amber-50 blur-3xl" />

                        <div className="relative z-10">
                            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h3 className={`flex items-center gap-3 font-black text-slate-900 ${TITLE}`}>
                                        <span className="h-8 w-1.5 rounded-full bg-red-600" />
                                        Performance Analytics
                                    </h3>
                                    <p className={`mt-2 max-w-[48ch] text-slate-500 ${BODY}`}>Monthly score overview with task output, completion, and execution consistency.</p>
                                </div>

                                <div className="w-full max-w-[15rem] rounded-[1.4rem] border border-slate-200 bg-slate-50/90 p-1.5">
                                    <select
                                        value={selectedMonth.key}
                                        onChange={(event) => {
                                            const nextMonth = monthOptions.find((month) => month.key === event.target.value);
                                            if (nextMonth) setSelectedMonth(nextMonth);
                                        }}
                                        className={`w-full rounded-[1rem] border-none bg-transparent px-4 py-2.5 font-bold text-slate-700 outline-none hover:text-red-600 ${BODY}`}
                                    >
                                        {monthOptions.map((month) => (
                                            <option key={month.key} value={month.key}>{month.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {userScore ? (
                                <div className={`grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] ${GRID_GAP}`}>
                                    <div className="flex flex-col items-center gap-6 rounded-[2rem] border border-slate-100 bg-white/70 px-4 py-6 text-center lg:flex-row lg:text-left">
                                        <div className="relative shrink-0">
                                            <div className="absolute inset-0 rounded-full bg-slate-100 blur-2xl opacity-80" />
                                            <div className="relative h-[clamp(13rem,11rem+6vw,16rem)] w-[clamp(13rem,11rem+6vw,16rem)]">
                                                <svg viewBox={`0 0 ${scoreSize} ${scoreSize}`} className="h-full w-full -rotate-90 drop-shadow-xl">
                                                    <circle cx={scoreCenter} cy={scoreCenter} r={scoreRadius} stroke="#e2e8f0" strokeWidth="16" fill="none" />
                                                    <circle
                                                        cx={scoreCenter}
                                                        cy={scoreCenter}
                                                        r={scoreRadius}
                                                        stroke={scoreColor}
                                                        strokeWidth="16"
                                                        fill="none"
                                                        strokeDasharray={`${scoreStroke} ${scoreCircumference}`}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-1000 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className={`font-black tracking-[-0.05em] text-slate-900 ${NAME}`}>{clampedScore}</span>
                                                    <span className={`mt-1 font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>Total Score</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="max-w-[28rem]">
                                            <p className={`font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>Score Summary</p>
                                            <p className={`mt-3 font-black text-slate-900 ${TITLE}`}>{scoreTone}</p>
                                            <p className={`mt-3 text-slate-500 ${BODY}`}>This view combines your selected month score with current checklist load so you can see progress and next action quickly.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {performanceCards.map((card) => (
                                            <div key={card.key} className={`rounded-[1.75rem] border border-slate-100 px-4 py-5 ${card.tone}`}>
                                                <p className={`font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>{card.label}</p>
                                                <p className={`mt-3 font-black tracking-[-0.04em] ${VALUE}`}>{card.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center">
                                    <Target className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                                    <p className={`font-semibold text-slate-500 ${BODY}`}>No score data available for this period</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-[clamp(2.5rem,1.8rem+2.6vw,4.5rem)] text-white">
                <div className={`container mx-auto ${CONTAINER}`}>
                    <div className={`grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ${GRID_GAP}`}>
                        <div className="rounded-none border-y border-white/10 bg-white/5 px-4 py-5 backdrop-blur sm:rounded-[2.5rem] sm:border sm:px-8 sm:py-8">
                            <h4 className={`mb-6 flex items-center gap-3 font-black text-white ${TITLE}`}>
                                <span className="h-8 w-1.5 rounded-full bg-red-500" />
                                Contact Us
                            </h4>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className={`font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>Phone</p>
                                        <p className={`mt-1 text-slate-100 ${BODY}`}>+91 72250 61350, +91 88394 94655</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className={`font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>Email</p>
                                        <p className={`mt-1 break-all text-slate-100 ${BODY}`}>admin@sagartmt.com</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                                        <Clock3 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className={`font-bold uppercase tracking-[0.22em] text-slate-400 ${LABEL}`}>Support Window</p>
                                        <p className={`mt-1 text-slate-100 ${BODY}`}>Production support and portal assistance through business hours.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-none border-y border-white/10 bg-white/5 px-4 py-5 backdrop-blur sm:rounded-[2.5rem] sm:border sm:px-8 sm:py-8">
                            <div className="mb-6 flex items-center gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                                    <MapPin className="h-5 w-5" />
                                </span>
                                <div>
                                    <h5 className={`font-black text-white ${TITLE}`}>Our Location</h5>
                                    <p className={`mt-1 text-slate-400 ${BODY}`}>Achholi Road Kanhera, Urla Industrial Area, Raipur, Chhattisgarh</p>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/30 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.6)]">
                                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-slate-300">
                                    <MapPin className="h-4 w-4 text-red-300" />
                                    <span className={`font-bold uppercase tracking-[0.22em] ${LABEL}`}>Google Map</span>
                                </div>
                                <div className="h-[clamp(16rem,14rem+8vw,22rem)]">
                                    <iframe
                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d529.0000000000001!2d81.6093303!3d21.3333512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a28e700143df22d%3A0x89321ea274817173!2sSourabh%20Rolling%20Mill%20Pvt.%20Ltd.!5e0!3m2!1sen!2sin!4v1690000000000!5m2!1sen!2sin"
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        allowFullScreen=""
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        title="Google Map Location"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-center md:flex-row md:text-left">
                        <p className={`text-slate-400 ${BODY}`}>&copy; {new Date().getFullYear()} Sagar Pipe. All rights reserved.</p>
                        <p className={`text-slate-300 ${BODY}`}>
                            Powered By{" "}
                            <a href="https://botivate.in/" className="font-semibold text-red-400 transition-colors hover:text-red-300 hover:underline">
                                Botivate
                            </a>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
