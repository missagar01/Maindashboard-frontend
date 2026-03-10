import { useState, useEffect } from "react"
import { storage } from "../utils/storage";
import { fetchUserDetailsApiById } from "../../../api/master/settingApi";
import { fetchAttendanceSummaryApi } from "../../../api/master/attendenceApi";
import { patchEmpImageApi } from "../../../api/master/userApi";
import { Award, Pencil, Target } from "lucide-react";
import {
    getPendingTodayApi,
    getCompletedTodayApi,
    getCompletedTaskApi,
    getPendingTaskApi,
    getOverdueTaskApi,
} from "../../../api/master/dashboardApi";
import { fetchUserScoreApiByName } from "../../../api/master/userScoreApi";
import { decodeToken } from "../utils/jwtUtils";
import { apiCache } from "../utils/apiCache";

const formatDate = (d) => d.toISOString().split("T")[0];

const buildMonthOptions = (count = 6) => {
    const today = new Date();
    return Array.from({ length: count }).map((_, i) => {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const isCurrentMonth =
            monthDate.getMonth() === today.getMonth() &&
            monthDate.getFullYear() === today.getFullYear();

        return {
            key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
            label: monthDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
            }),
            startDate: formatDate(
                new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
            ),
            endDate: isCurrentMonth
                ? formatDate(today)
                : formatDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)),
            isCurrentMonth,
        };
    });
};

const HomePage = () => {

    const [userDetails, setUserDetails] = useState(null);
    const [loading, setLoading] = useState(true)
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

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const WARN_FILE_SIZE = 3 * 1024 * 1024;
    const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    const handleEmpImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || uploading || !userDetails?.id) return;

        setUploadWarning("");
        setUploadSuccess("");

        if (!ALLOWED_FORMATS.includes(file.type)) {
            setUploadWarning(`❌ Invalid file format. Allowed formats: JPEG, PNG, GIF, WebP`);
            e.target.value = "";
            return;
        }

        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        if (file.size > MAX_FILE_SIZE) {
            setUploadWarning(`⚠️ File size (${fileSizeInMB}MB) exceeds maximum limit of 5MB. Please choose a smaller image.`);
            e.target.value = "";
            return;
        }

        if (file.size > WARN_FILE_SIZE) {
            setUploadWarning(`⚠️ File size (${fileSizeInMB}MB) is large. Consider using a smaller image for faster uploads.`);
        }

        try {
            setUploading(true);
            setImageError(false);
            await patchEmpImageApi(userDetails.id, file);
            const result = await fetchUserDetailsApiById(userDetails.id);

            if (result?.data && result.data.emp_image) {
                setUserDetails(result.data);
                apiCache.set(`user_${userDetails.id}`, result.data);
                apiCache.invalidate("users_all");
                setUploadSuccess(`✅ Profile image updated successfully!`);
                setUploadWarning("");
                setTimeout(() => setUploadSuccess(""), 15000);
            } else {
                throw new Error("Image update failed");
            }
        } catch (err) {
            console.error("Profile image upload failed:", err);
            setUploadWarning(`❌ Failed to update profile image. ${err.message || "Please try again."}`);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const fetchUserScore = async (userName, startDate, endDate) => {
        try {
            const res = await fetchUserScoreApiByName(userName, {
                startDate,
                endDate,
            });
            if (res?.data?.length) {
                setUserScore(res.data[0]);
            } else {
                setUserScore(null);
            }
        } catch (err) {
            console.error("Failed to fetch user score", err);
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

                if (!userId || ["admin", "aakash agrawal"].includes(username?.toLowerCase())) return;

                let matchedUser = apiCache.get(`user_${userId}`);
                if (!matchedUser) {
                    matchedUser = await fetchUserDetailsApiById(userId);
                    apiCache.set(`user_${userId}`, matchedUser);
                }
                setUserDetails(matchedUser || null);

                if (matchedUser?.user_name && selectedMonth) {
                    fetchUserScore(
                        matchedUser.user_name,
                        selectedMonth.startDate,
                        selectedMonth.endDate
                    );
                }

                const attendanceRes = await fetchAttendanceSummaryApi();
                const attendanceList = Array.isArray(attendanceRes?.data?.data)
                    ? attendanceRes.data.data
                    : [];

                if (matchedUser?.employee_id) {
                    const matchedAttendance = attendanceList.find(
                        (a) => String(a.employee_id).trim() === String(matchedUser.employee_id).trim()
                    );
                    setAttendance(matchedAttendance || null);
                }

                const dashboardType = "checklist";
                const cacheKey = `stats_${username}_${selectedMonth.key}`;
                let stats = apiCache.get(cacheKey);

                if (!stats) {
                    const [pendingCountToday, completedCountToday, completedCount, pendingCount, overdueCount] = await Promise.all([
                        getPendingTodayApi({ dashboardType, role, username }),
                        getCompletedTodayApi({ dashboardType, role, username }),
                        getCompletedTaskApi({ dashboardType, role, username }),
                        getPendingTaskApi({ dashboardType, role, username }),
                        getOverdueTaskApi({ dashboardType, role, username }),
                    ]);
                    stats = { pendingCountToday, completedCountToday, completedCount, pendingCount, overdueCount };
                    apiCache.set(cacheKey, stats, 1 * 60 * 1000); // 1 minute TTL for stats
                }

                const { pendingCountToday, completedCountToday, completedCount, pendingCount, overdueCount } = stats;

                setPendingToday(pendingCountToday || 0);
                setCompletedToday(completedCountToday || 0);
                setCompleted(Number(completedCount) || 0);
                setPending(Number(pendingCount) || 0);
                setOverdue(Number(overdueCount) || 0);

            } catch (error) {
                console.error("Error fetching employee details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployeeDetails();
    }, [selectedMonth]);

    const SCORE_RADIUS = 60;
    const SCORE_CIRCUMFERENCE = 2 * Math.PI * SCORE_RADIUS;
    const rawScore = Number(userScore?.total_score ?? 0);
    const clampedScore = Math.max(-100, Math.min(100, rawScore));
    const graphPercent = Math.min(100, Math.abs(clampedScore));
    const scoreLength = (graphPercent / 100) * SCORE_CIRCUMFERENCE;

    const getScoreColor = (score) => {
        if (score <= -51) return "#ef4444";
        if (score <= -26) return "#f59e0b";
        return "#10b981";
    };
    const scoreColor = getScoreColor(clampedScore);

    return (
        <div className="w-full bg-gray-50/50 min-h-full">
            <section className="py-6 md:py-10">
                <div className="container mx-auto px-4 md:px-8 max-w-6xl">
                    {/* Profile Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden mb-8">
                        <div className="flex flex-col md:flex-row p-6 md:p-10 gap-8 lg:gap-12 items-center md:items-start text-center md:text-left">
                            {/* Profile Image Section */}
                            <div className="relative shrink-0 group">
                                <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-3xl overflow-hidden shadow-2xl border-4 border-white transition-transform duration-300 group-hover:scale-[1.02]">
                                    <img
                                        src={!imageError && userDetails?.emp_image ? userDetails.emp_image : "/user.png"}
                                        alt="Employee"
                                        className="w-full h-full object-cover bg-gray-50"
                                        loading="lazy"
                                        onError={() => setImageError(true)}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                </div>
                                <label
                                    title="Edit profile image"
                                    className={`absolute -bottom-2 -right-2 flex items-center justify-center w-10 h-10 rounded-2xl text-white cursor-pointer shadow-xl transition-all duration-300 ${uploading ? "bg-gray-400 rotate-180" : "bg-red-600 hover:bg-red-700 hover:scale-110"}`}
                                >
                                    {uploading ? <span className="text-xs">⏳</span> : <Pencil size={18} strokeWidth={2.5} />}
                                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleEmpImageChange} />
                                </label>
                            </div>

                            {/* Profile Details Section */}
                            <div className="flex-1 flex flex-col min-w-0 w-full">
                                {(uploadWarning || uploadSuccess) && (
                                    <div className="mb-6 w-full">
                                        {uploadWarning && (
                                            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm animate-pulse flex items-center gap-2">
                                                <span className="shrink-0 text-lg">⚠️</span>
                                                <p className="font-medium">{uploadWarning}</p>
                                            </div>
                                        )}
                                        {uploadSuccess && (
                                            <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm flex items-center gap-2">
                                                <span className="shrink-0 text-lg">✅</span>
                                                <p className="font-medium">{uploadSuccess}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {loading ? (
                                    <div className="space-y-4 max-w-md">
                                        <div className="h-8 bg-gray-100 rounded-lg w-64 mx-auto md:mx-0 animate-pulse"></div>
                                        <div className="h-4 bg-gray-100 rounded-lg w-48 mx-auto md:mx-0 animate-pulse"></div>
                                        <div className="h-4 bg-gray-100 rounded-lg w-56 mx-auto md:mx-0 animate-pulse"></div>
                                        <div className="h-4 bg-gray-100 rounded-lg w-40 mx-auto md:mx-0 animate-pulse"></div>
                                    </div>
                                ) : userDetails ? (
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                                                <h3 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
                                                    {userDetails.user_name || "N/A"}
                                                </h3>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider md:ml-2 w-fit mx-auto md:mx-0 ${userDetails.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                    {userDetails.status || "N/A"}
                                                </span>
                                            </div>
                                            <p className="text-lg text-red-600 font-bold tracking-wide uppercase italic opacity-80">
                                                {userDetails.user_access || "N/A"}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 pt-4 border-t border-gray-100">
                                            <div className="flex flex-col items-center md:items-start group">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Employee ID</span>
                                                <span className="text-gray-800 font-semibold group-hover:text-red-600 transition-colors">{userDetails.employee_id || "N/A"}</span>
                                            </div>
                                            <div className="flex flex-col items-center md:items-start group">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Number</span>
                                                <span className="text-gray-800 font-semibold group-hover:text-red-600 transition-colors">{userDetails.number || "N/A"}</span>
                                            </div>
                                            <div className="flex flex-col items-center md:items-start group sm:col-span-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email Address</span>
                                                <span className="text-gray-800 font-semibold group-hover:text-red-600 transition-colors break-all">{userDetails.email_id || "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center md:text-left">
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">User Not Found</h3>
                                        <p className="text-gray-500">Could not retrieve profile information at this time.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        {/* Task Summary Card */}
                        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 transition-transform duration-300 hover:scale-[1.01]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                                    Today's Activity
                                </h3>
                                <div className="p-2 bg-red-50 rounded-xl">
                                    <Target className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-2xl p-6 text-center group hover:bg-yellow-50 transition-colors">
                                    <div className="text-3xl font-black text-yellow-600 mb-1">{pendingToday}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Tasks</div>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-6 text-center group hover:bg-green-50 transition-colors">
                                    <div className="text-3xl font-black text-green-600 mb-1">{completedToday}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed</div>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Card */}
                        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 transition-transform duration-300 hover:scale-[1.01]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                    Attendance Status
                                </h3>
                                <div className="p-2 bg-blue-50 rounded-xl">
                                    <Award className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>

                            {attendance ? (
                                <div className="flex items-center justify-around">
                                    <div className="text-center">
                                        <div className="text-4xl font-black text-gray-900">
                                            {attendance.monthly_attendance}
                                            <span className="text-blue-600 text-2xl">/{new Date().getDate()}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Monthly Count</div>
                                    </div>
                                    <div className="w-px h-12 bg-gray-100" />
                                    <div className="text-center">
                                        <div className={`text-xl font-bold uppercase tracking-wider mb-1 ${attendance.status === "IN" ? "text-green-600" : "text-red-600"}`}>
                                            {attendance.status === "IN" ? "Present" : "Absent"}
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Status</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-6 text-gray-400 font-medium">
                                    No attendance data found
                                </div>
                            )}
                        </div>

                        {/* Performance Score Card */}
                        <div className="md:col-span-2 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 lg:p-12 mt-4 relative overflow-hidden">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-red-50/30 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                        <div className="w-2 h-8 bg-red-600 rounded-full" />
                                        Performance Analytics
                                    </h3>
                                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                                        <select
                                            value={selectedMonth.key}
                                            onChange={(e) => setSelectedMonth(monthOptions.find((m) => m.key === e.target.value))}
                                            className="px-4 py-2 text-sm font-bold rounded-xl border-none bg-transparent focus:outline-none focus:ring-0 text-gray-700 cursor-pointer hover:text-red-600 transition-colors"
                                        >
                                            {monthOptions.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {userScore ? (
                                    <div className="flex flex-col lg:flex-row items-center justify-around gap-12">
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-gray-100 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity" />
                                            <div className="relative w-48 h-48 lg:w-56 lg:h-56">
                                                <svg className="w-full h-full rotate-[-90deg] drop-shadow-xl">
                                                    <circle cx="50%" cy="50%" r={SCORE_RADIUS + 20} stroke="#f3f4f6" strokeWidth="16" fill="none" />
                                                    <circle
                                                        cx="50%" cy="50%" r={SCORE_RADIUS + 20}
                                                        stroke={scoreColor} strokeWidth="16" fill="none"
                                                        strokeDasharray={`${scoreLength * 1.3} ${SCORE_CIRCUMFERENCE * 1.3}`}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-1000 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-3xl font-black text-gray-900 tracking-tighter">{clampedScore}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Total Score</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-6 w-full lg:w-auto">
                                            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:border-red-100 transition-all hover:shadow-md cursor-default">
                                                <div className="w-3 h-3 rounded-full bg-gray-400 shadow-[0_0_8px_rgba(156,163,175,0.6)]" />
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Tasks</div>
                                                    <div className="text-xl font-black text-gray-800">{userScore?.total_tasks ?? 0}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:border-green-100 transition-all hover:shadow-md cursor-default">
                                                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed</div>
                                                    <div className="text-xl font-black text-green-700">{userScore?.total_completed_tasks ?? 0}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:border-blue-100 transition-all hover:shadow-md cursor-default">
                                                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">On Time</div>
                                                    <div className="text-xl font-black text-blue-700">{userScore?.total_done_on_time ?? 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                        <div className="text-4xl mb-4">📊</div>
                                        <div className="text-lg font-bold text-gray-400">No score data available for this period</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            <section className="py-12 md:py-20 bg-gradient-to-br from-gray-800 to-gray-900 text-white">
                <div className="container mx-auto px-4 md:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                        <div className="text-center md:text-left">
                            <h4 className="text-xl font-semibold mb-4 text-red-400">Contact Us</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-center md:justify-start">
                                    <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-gray-300">+917225061350 , </span>
                                    <span className="text-gray-300">+918839494655</span>
                                </div>
                                <div className="flex items-center justify-center md:justify-start">
                                    <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-gray-300">admin@sagartmt.com</span>
                                </div>
                                <div className="flex items-center justify-center md:justify-start">
                                    <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-gray-300">Achholi Road Kanhera , Urla Industrial Area<br />Raipur C.G.</span>
                                </div>
                            </div>
                        </div>
                        <div className="">
                            <h5 className="text-lg font-medium mb-4 text-red-400">Our Location</h5>
                            <div className="w-full h-48 md:h-64 lg:h-48">
                                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d529.0000000000001!2d81.6093303!3d21.3333512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a28e700143df22d%3A0x89321ea274817173!2sSourabh%20Rolling%20Mill%20Pvt.%20Ltd.!5e0!3m2!1sen!2sin!4v1690000000000!5m2!1sen!2sin" width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Google Map Location"></iframe>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 my-8"></div>
                    <div className="text-center">
                        <p className="text-gray-400">&copy; {new Date().getFullYear()} Sagar Pipe. All rights reserved.</p>
                        <p>Powered By <a href="https://botivate.in/" className="text-red-500 hover:underline">Botivate</a></p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
