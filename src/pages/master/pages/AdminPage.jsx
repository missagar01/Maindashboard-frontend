import { useState, useEffect } from "react"
import { fetchUserDetailsApi, patchSystemAccessApi } from "../../../api/master/settingApi";
import { fetchSystemsApi } from "../../../api/master/systemsApi";
import { fetchAttendanceSummaryApi } from "../../../api/master/attendenceApi";
import { Award, Clock3, Mail, MapPin, Phone, Target } from "lucide-react";
import { apiCache } from "../runtime";

const LANDING_SECTION_PADDING = "py-[clamp(1.5rem,0.85rem+2.2vw,3.25rem)]";
const LANDING_CONTAINER_PADDING = "px-0 sm:px-[clamp(1rem,0.7rem+1vw,2rem)] md:px-[clamp(1.5rem,1rem+1.1vw,2.5rem)]";
const LANDING_STACK_GAP = "gap-[clamp(1.75rem,1rem+1.8vw,3rem)]";
const LANDING_CARD_PADDING = "px-4 py-5 sm:p-[clamp(2.1rem,1.45rem+1.8vw,3.6rem)]";
const LANDING_CARD_PADDING_LG = "px-4 py-5 sm:px-[clamp(2rem,1.1rem+2.4vw,4.25rem)] sm:py-[clamp(1.75rem,1.1rem+1.8vw,3.25rem)]";
const LANDING_TITLE = "text-[clamp(2.2rem,1.45rem+2.2vw,4.75rem)]";
const LANDING_SUBTITLE = "text-[clamp(1rem,0.8rem+0.72vw,1.7rem)]";
const LANDING_SUBTITLE_TEXT = "\u092e\u091c\u092c\u0942\u0924\u0940 \u0914\u0930 \u0935\u093f\u0936\u094d\u0935\u093e\u0938 \u0939\u0948 \u0939\u092e";
const LANDING_SECTION_TITLE = "text-[clamp(1.75rem,1.2rem+1.15vw,2.8rem)]";
const LANDING_CARD_TITLE = "text-[clamp(1.55rem,1.15rem+0.8vw,2.15rem)]";
const LANDING_PRODUCT_TITLE = "text-[clamp(1.45rem,1.05rem+0.9vw,2.3rem)]";
const LANDING_BODY = "text-[clamp(1rem,0.92rem+0.35vw,1.18rem)]";
const LANDING_BODY_LARGE = "text-[clamp(1rem,0.88rem+0.5vw,1.32rem)]";
const LANDING_ICON_WRAP = "h-[clamp(4.25rem,3.55rem+1vw,5.5rem)] w-[clamp(4.25rem,3.55rem+1vw,5.5rem)]";
const LANDING_ICON_SIZE = "h-[clamp(2rem,1.5rem+0.8vw,2.8rem)] w-[clamp(2rem,1.5rem+0.8vw,2.8rem)]";
const LANDING_ACCENT_BAR = "h-[clamp(2.4rem,1.6rem+1vw,3.25rem)] w-[clamp(0.375rem,0.28rem+0.15vw,0.6rem)]";
const LANDING_PRODUCT_OVERLAY = "bottom-[clamp(1.25rem,0.9rem+1vw,2rem)] p-[clamp(1rem,0.8rem+0.7vw,1.5rem)]";
const LANDING_HERO_CARD_WIDTH = "max-w-none sm:max-w-[78rem]";
const LANDING_HERO_CARD_MIN_HEIGHT = "min-h-[clamp(17rem,15vw,21rem)]";
const LANDING_INFO_CARD_MIN_HEIGHT = "min-h-[clamp(20rem,18vw,24rem)]";
const FOOTER_CONTAINER = "max-w-[86rem] px-0 sm:px-[clamp(1rem,0.7rem+1vw,2rem)] md:px-[clamp(1.5rem,1rem+1.1vw,2.5rem)]";
const FOOTER_GRID_GAP = "gap-[clamp(1.25rem,0.7rem+1.6vw,2.25rem)]";
const FOOTER_TITLE = "text-[clamp(1.45rem,1.1rem+0.95vw,2.25rem)]";
const FOOTER_BODY = "text-[clamp(0.98rem,0.9rem+0.28vw,1.12rem)]";
const FOOTER_LABEL = "text-[clamp(0.62rem,0.56rem+0.14vw,0.74rem)]";

const AdminPage = ({ allUsersRef, showAllUsersModal, setShowAllUsersModal }) => {
    const [allUsers, setAllUsers] = useState([]);

    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [systemsList, setSystemsList] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [attendanceFilter, setAttendanceFilter] = useState("");
    const [activeIndex, setActiveIndex] = useState(null);

    const handleSystemAccessPatch = async (id, value) => {
        if (!value.trim()) return;
        try {
            const updatedUser = await patchSystemAccessApi({
                id: id,
                system_access: value,
            });
            if (updatedUser) {
                setAllUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
                apiCache.invalidate("users_all");
                apiCache.invalidate(`user_${id}`);
            }
        } catch (error) {
            console.error("Error patching system access:", error);
        }
    };

    useEffect(() => {
        if (!showAllUsersModal) {
            return;
        }

        let cancelled = false;

        const fetchAdminData = async () => {
            try {
                let users = apiCache.get("users_all");
                if (!users) {
                    users = await fetchUserDetailsApi();
                    apiCache.set("users_all", users);
                }

                const [systemsData, attendanceRes] = await Promise.all([
                    fetchSystemsApi(),
                    fetchAttendanceSummaryApi(),
                ]);

                if (cancelled) {
                    return;
                }

                setAllUsers(Array.isArray(users) ? users : []);
                setSystemsList(Array.isArray(systemsData) ? systemsData : []);

                const attendanceList = Array.isArray(attendanceRes?.data?.data)
                    ? attendanceRes.data.data
                    : [];
                setAttendance(attendanceList);
            } catch (error) {
                if (!cancelled) {
                    console.error("Error fetching admin data:", error);
                }
            }
        };

        fetchAdminData();

        return () => {
            cancelled = true;
        };
    }, [showAllUsersModal]);

    const attendanceMap = attendance.reduce((acc, a) => {
        acc[String(a.employee_id).trim()] = a.status;
        return acc;
    }, {});

    const filteredUsers = allUsers.filter((u) => {
        if (["admin", "aakash agrawal"].includes(u.user_name?.toLowerCase())) return false;

        const matchesSearch =
            u.employee_id?.toString().includes(search) ||
            u.user_name?.toLowerCase().includes(search.toLowerCase());

        const matchesDept =
            departmentFilter === "" || u.user_access === departmentFilter;

        const attendanceStatus =
            attendanceMap[u.employee_id] === "IN" ? "present" : "absent";

        const matchesAttendance =
            attendanceFilter === "" || attendanceFilter === attendanceStatus;

        return matchesSearch && matchesDept && matchesAttendance;
    });

    return (
        <div className="w-full bg-gray-50/50 min-h-full">
            <section className={`${LANDING_SECTION_PADDING} bg-transparent`}>
                <div className={`container mx-auto max-w-[84rem] ${LANDING_CONTAINER_PADDING}`}>
                    <div className="mb-[clamp(0.5rem,0.3rem+0.5vw,1rem)] text-center">
                        <div className="relative w-full sm:inline-block sm:w-auto">
                            <h2
                                className="
                                    inline-block rounded-3xl px-[clamp(1.5rem,1rem+1.5vw,3rem)] py-[clamp(0.85rem,0.55rem+1vw,1.4rem)] mb-[clamp(0.2rem,0.12rem+0.2vw,0.5rem)]
                                    bg-clip-text text-transparent
                                    bg-gradient-to-r from-red-600 to-red-900
                                    drop-shadow-sm transition-all duration-500
                                "
                                style={{
                                    // backgroundImage: "url('/transPipe.png')",
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    WebkitBackgroundClip: "text",
                                }}
                            >
                                <span className={`${LANDING_TITLE} font-black tracking-[-0.03em]`}>
                                    Sourabh Rolling Mill
                                </span>
                            </h2>
                            <div className="landing-marquee-wrap mx-auto w-full max-w-none overflow-hidden sm:max-w-[clamp(16rem,34vw,34rem)]">
                                <div className="landing-marquee" dir="rtl">
                                    <span className={`landing-marquee__item bg-gradient-to-r from-red-600 to-red-400 bg-clip-text font-bold leading-[1.25] text-right text-transparent drop-shadow-sm ${LANDING_SUBTITLE}`}>
                                        {LANDING_SUBTITLE_TEXT}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className={`landing-marquee__item bg-gradient-to-r from-red-600 to-red-400 bg-clip-text font-bold leading-[1.25] text-right text-transparent drop-shadow-sm ${LANDING_SUBTITLE}`}
                                    >
                                        {LANDING_SUBTITLE_TEXT}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`${LANDING_HERO_CARD_WIDTH} ${LANDING_HERO_CARD_MIN_HEIGHT} mx-auto mb-[clamp(2.25rem,1.1rem+3vw,4.5rem)] w-full rounded-none border-y border-gray-100 bg-white ${LANDING_CARD_PADDING_LG} relative overflow-hidden shadow-[0_20px_40px_-18px_rgba(0,0,0,0.1)] transition-all duration-700 sm:rounded-[3rem] sm:border sm:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] group hover:shadow-[0_40px_80px_-20px_rgba(220,38,38,0.15)]`}>
                        {/* Decorative element */}
                        <div className="absolute top-0 right-0 h-[clamp(6rem,4.5rem+3vw,8rem)] w-[clamp(6rem,4.5rem+3vw,8rem)] rounded-full bg-red-50 blur-2xl transition-colors group-hover:bg-red-100 translate-x-[35%] -translate-y-[35%]" />

                        <div className="relative z-10">
                            <h2 className={`mb-[clamp(0.9rem,0.6rem+0.8vw,1.5rem)] flex items-center justify-center gap-[clamp(0.75rem,0.5rem+0.7vw,1.25rem)] text-center font-black text-gray-900 ${LANDING_SECTION_TITLE}`}>
                                <div className={`rounded-full bg-red-600 ${LANDING_ACCENT_BAR}`} />
                                About Us
                            </h2>
                            <p className={`mx-auto max-w-[72ch] text-left leading-[1.85] tracking-[0.01em] text-gray-600 first-letter:float-left first-letter:mr-[clamp(0.35rem,0.22rem+0.24vw,0.55rem)] first-letter:text-[clamp(2.6rem,2.1rem+1.25vw,4rem)] first-letter:leading-[0.82] first-letter:font-black first-letter:text-red-600 ${LANDING_BODY}`}>
                                Sourabh Rolling Mills Pvt. Ltd., a premium manufacturing unit of Pankaj Group,
                                is located in Village Kanhera, Urla Industrial Area, Raipur, Chhattisgarh.
                                As one of the leading companies within Pankaj Group,
                                Sourabh Rolling Mills is synonymous with quality and innovation in the steel industry.
                                Specializing in the production of billets, strips (Patra), and high-quality steel pipes,
                                Sourabh Rolling Mills adheres to stringent BIS norms. Our facility boasts multiple automatic rolling mills,
                                ensuring efficiency and precision in our manufacturing processes.
                            </p>
                        </div>
                    </div>

                    <div className={`mt-[clamp(2.5rem,1.3rem+2.8vw,4.5rem)] mb-[clamp(2.25rem,1.15rem+2.8vw,4.25rem)] grid grid-cols-1 md:grid-cols-2 ${LANDING_STACK_GAP}`}>
                        <div className={`${LANDING_INFO_CARD_MIN_HEIGHT} group rounded-none border-y border-gray-100 bg-white ${LANDING_CARD_PADDING} shadow-[0_18px_36px_-22px_rgba(0,0,0,0.12)] transition-all duration-500 sm:rounded-[2.5rem] sm:border sm:shadow-xl hover:scale-[1.02] hover:shadow-2xl`}>
                            <div className={`mb-[clamp(1.25rem,0.9rem+0.9vw,1.75rem)] flex items-center justify-center rounded-3xl bg-red-50 transition-colors duration-500 group-hover:bg-red-600 ${LANDING_ICON_WRAP}`}>
                                <Target className={`${LANDING_ICON_SIZE} text-red-600 transition-colors group-hover:text-white`} />
                            </div>
                            <h3 className={`mb-[clamp(0.75rem,0.5rem+0.5vw,1.1rem)] font-black tracking-tight text-gray-900 ${LANDING_CARD_TITLE}`}>Our Mission</h3>
                            <p className={`leading-[1.8] text-gray-500 ${LANDING_BODY_LARGE}`}>Creating sustainable happiness and excellence through consistent high-value achievements.</p>
                        </div>
                        <div className={`${LANDING_INFO_CARD_MIN_HEIGHT} group rounded-none border-y border-gray-100 bg-white ${LANDING_CARD_PADDING} shadow-[0_18px_36px_-22px_rgba(0,0,0,0.12)] transition-all duration-500 sm:rounded-[2.5rem] sm:border sm:shadow-xl hover:scale-[1.02] hover:shadow-2xl`}>
                            <div className={`mb-[clamp(1.25rem,0.9rem+0.9vw,1.75rem)] flex items-center justify-center rounded-3xl bg-blue-50 transition-colors duration-500 group-hover:bg-blue-600 ${LANDING_ICON_WRAP}`}>
                                <Award className={`${LANDING_ICON_SIZE} text-blue-600 transition-colors group-hover:text-white`} />
                            </div>
                            <h3 className={`mb-[clamp(0.75rem,0.5rem+0.5vw,1.1rem)] font-black tracking-tight text-gray-900 ${LANDING_CARD_TITLE}`}>Our Vision</h3>
                            <p className={`leading-[1.8] text-gray-500 ${LANDING_BODY_LARGE}`}>Becoming a global benchmark in steel manufacturing with a humble heart and a creative mindset.</p>
                        </div>
                    </div>

                    <div className="mb-[clamp(3rem,1.6rem+3.8vw,5rem)]">
                        <div className="mb-[clamp(1.75rem,1rem+2vw,3rem)] flex items-center justify-center gap-[clamp(0.75rem,0.5rem+0.8vw,1.5rem)]">
                            <div className="h-px bg-gray-200 flex-1" />
                            <h3 className={`px-[clamp(0.75rem,0.5rem+0.7vw,1.25rem)] font-black tracking-tight text-gray-900 ${LANDING_SECTION_TITLE}`}>Our Excellence in Products</h3>
                            <div className="h-px bg-gray-200 flex-1" />
                        </div>
                        <div className={`grid grid-cols-1 md:grid-cols-2 ${LANDING_STACK_GAP}`}>
                            <div
                                className="relative aspect-video lg:aspect-[16/9] overflow-hidden rounded-[3rem] shadow-2xl border-8 border-white group cursor-pointer"
                                onClick={() => setActiveIndex(activeIndex === 0 ? null : 0)}
                            >
                                <img src="/pipe1.jpg" alt="Steel Pipes" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 ${activeIndex === 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                                <div className={`absolute left-0 w-full text-center transition-all duration-500 transform ${LANDING_PRODUCT_OVERLAY} ${activeIndex === 0 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"}`}>
                                    <span className={`font-black uppercase tracking-[0.12em] text-white ${LANDING_PRODUCT_TITLE}`}>MS Pipes (Circle)</span>
                                    <div className="mx-auto mt-[clamp(0.35rem,0.25rem+0.3vw,0.65rem)] h-[clamp(0.22rem,0.16rem+0.06vw,0.3rem)] w-[clamp(2.75rem,2.2rem+0.8vw,3.5rem)] rounded-full bg-red-600" />
                                </div>
                            </div>

                            <div
                                className="relative aspect-video lg:aspect-[16/9] overflow-hidden rounded-[3rem] shadow-2xl border-8 border-white group cursor-pointer"
                                onClick={() => setActiveIndex(activeIndex === 1 ? null : 1)}
                            >
                                <img src="/pipe2.png" alt="TMT Bars" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 ${activeIndex === 1 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                                <div className={`absolute left-0 w-full text-center transition-all duration-500 transform ${LANDING_PRODUCT_OVERLAY} ${activeIndex === 1 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"}`}>
                                    <span className={`font-black uppercase tracking-[0.12em] text-white ${LANDING_PRODUCT_TITLE}`}>MS Pipes (Square)</span>
                                    <div className="mx-auto mt-[clamp(0.35rem,0.25rem+0.3vw,0.65rem)] h-[clamp(0.22rem,0.16rem+0.06vw,0.3rem)] w-[clamp(2.75rem,2.2rem+0.8vw,3.5rem)] rounded-full bg-red-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {showAllUsersModal && (
                <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
                    <div className="bg-white w-[95%] max-w-7xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-xl font-bold text-gray-800">
                                All Users ({filteredUsers.length})
                            </h2>
                            <button onClick={() => setShowAllUsersModal(false)} className="text-2xl font-bold text-gray-500 hover:text-red-600">✕</button>
                        </div>
                        <div ref={allUsersRef} className="flex-1 overflow-y-auto">
                            <div className="w-full h-full p-4 md:p-6 flex flex-col">
                                {allUsers.length === 0 ? (
                                    <p className="text-gray-600">No users found...</p>
                                ) : (
                                    <>
                                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                                            <input
                                                type="text"
                                                placeholder="Search by Employee ID or Username..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="w-full md:w-1/3 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                            />
                                            <select
                                                value={departmentFilter}
                                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                                className="w-full md:w-1/4 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                            >
                                                <option value="">All Departments</option>
                                                {[...new Set(allUsers.map((u) => u.user_access))].filter(Boolean).map((dept) => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={attendanceFilter}
                                                onChange={(e) => setAttendanceFilter(e.target.value)}
                                                className="w-full md:w-1/4 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                            >
                                                <option value="">All Attendance</option>
                                                <option value="present">Present</option>
                                                <option value="absent">Absent</option>
                                            </select>
                                        </div>
                                        <div className="relative flex-1 overflow-y-auto overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                                            <table className="min-w-full text-sm">
                                                <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 backdrop-blur border-b">
                                                    <tr>
                                                        {["Employee ID", "Username", "Department", "Attendance", "Contact", "System Access", "Status"].map((h) => (
                                                            <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700 tracking-wide uppercase text-xs">
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredUsers.map((user, idx) => (
                                                        <tr key={user.id} className={`transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"} hover:bg-red-50`}>
                                                            <td className="px-4 py-3 font-medium text-gray-800">{user.employee_id}</td>
                                                            <td className="px-4 py-3 text-gray-700">{user.user_name}</td>
                                                            <td className="px-4 py-3 text-gray-600">{user.user_access}</td>
                                                            <td className="px-4 py-3">
                                                                {attendanceMap[user.employee_id] === "IN" ? (
                                                                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-green-100 text-green-700">Present</span>
                                                                ) : (
                                                                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-100 text-red-700">Absent</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600">{user.number}</td>
                                                            <td className="px-4 py-3">
                                                                <select
                                                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                                                    defaultValue=""
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (!value) return;
                                                                        handleSystemAccessPatch(user.id, value);
                                                                        e.target.value = "";
                                                                    }}
                                                                >
                                                                    <option value="">Add system access</option>
                                                                    {systemsList.map((sys) => (
                                                                        <option key={sys.id} value={sys.systems}>{sys.systems}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                                    {user.system_access?.split(",").map((access, accessIdx) => (
                                                                        <span key={`${user.id}-${access}-${accessIdx}`} className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                                                            {access}
                                                                            <button onClick={() => handleSystemAccessPatch(user.id, access)} className="text-red-500 hover:text-red-700">✕</button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${user.status?.toLowerCase() === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                                    {user.status || "N/A"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-[clamp(2.5rem,1.8rem+2.6vw,4.5rem)] text-white">
                <div className={`container mx-auto ${FOOTER_CONTAINER}`}>
                    <div className={`grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ${FOOTER_GRID_GAP}`}>
                        <div className="rounded-none border-y border-white/10 bg-white/5 px-4 py-5 backdrop-blur sm:rounded-[2.5rem] sm:border sm:px-8 sm:py-8">
                            <h4 className={`mb-6 flex items-center gap-3 font-black text-white ${FOOTER_TITLE}`}>
                                <span className="h-8 w-1.5 rounded-full bg-red-500" />
                                Contact Us
                            </h4>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className={`font-bold uppercase tracking-[0.22em] text-slate-400 ${FOOTER_LABEL}`}>Phone</p>
                                        <p className={`mt-1 text-slate-100 ${FOOTER_BODY}`}>+91 72250 61350, +91 88394 94655</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className={`font-bold uppercase tracking-[0.22em] text-slate-400 ${FOOTER_LABEL}`}>Email</p>
                                        <p className={`mt-1 break-all text-slate-100 ${FOOTER_BODY}`}>admin@sagartmt.com</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                                        <Clock3 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className={`font-bold uppercase tracking-[0.22em] text-slate-400 ${FOOTER_LABEL}`}>Support Window</p>
                                        <p className={`mt-1 text-slate-100 ${FOOTER_BODY}`}>Production support and portal assistance through business hours.</p>
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
                                    <h5 className={`font-black text-white ${FOOTER_TITLE}`}>Our Location</h5>
                                    <p className={`mt-1 text-slate-400 ${FOOTER_BODY}`}>Achholi Road Kanhera, Urla Industrial Area, Raipur, Chhattisgarh</p>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/30 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.6)]">
                                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-slate-300">
                                    <MapPin className="h-4 w-4 text-red-300" />
                                    <span className={`font-bold uppercase tracking-[0.22em] ${FOOTER_LABEL}`}>Google Map</span>
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
                        <p className={`text-slate-400 ${FOOTER_BODY}`}>&copy; {new Date().getFullYear()} Sagar Pipe. All rights reserved.</p>
                        <p className={`text-slate-300 ${FOOTER_BODY}`}>
                            Powered By{" "}
                            <a href="https://botivate.in/" className="font-semibold text-red-400 transition-colors hover:text-red-300 hover:underline">
                                Botivate
                            </a>
                        </p>
                    </div>
                </div>
            </section>

            <style>
                {`
                .landing-marquee-wrap {
                    width: 100%;
                }

                .landing-marquee {
                    display: flex;
                    width: max-content;
                    min-width: 100%;
                    align-items: center;
                    animation: landing-marquee 10s linear infinite;
                    will-change: transform;
                }

                .landing-marquee__item {
                    flex-shrink: 0;
                    white-space: nowrap;
                    padding-right: clamp(2.5rem, 1.8rem + 2vw, 4.5rem);
                }

                @keyframes landing-marquee {
                    from { transform: translate3d(0, 0, 0); }
                    to { transform: translate3d(-50%, 0, 0); }
                }

                @media (max-width: 640px) {
                    .landing-marquee {
                        width: 200%;
                        min-width: 200%;
                        direction: rtl;
                        animation-duration: 8s;
                    }

                    .landing-marquee__item {
                        width: 50%;
                        padding-right: 0;
                        padding-left: 0.75rem;
                        text-align: right;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .landing-marquee {
                        width: 100%;
                        justify-content: flex-end;
                        animation: none;
                    }

                    .landing-marquee__item:last-child {
                        display: none;
                    }
                }
                `}
            </style>
        </div>
    );
};

export default AdminPage;
