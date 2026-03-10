import { useState, useEffect } from "react"
import { fetchUserDetailsApi, patchSystemAccessApi } from "../../../api/master/settingApi";
import { fetchSystemsApi } from "../../../api/master/systemsApi";
import { fetchAttendanceSummaryApi } from "../../../api/master/attendenceApi";
import { Award, Target } from "lucide-react";
import { apiCache } from "../utils/apiCache";

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
        const fetchAdminData = async () => {
            try {
                let users = apiCache.get("users_all");
                if (!users) {
                    users = await fetchUserDetailsApi();
                    apiCache.set("users_all", users);
                }
                setAllUsers(Array.isArray(users) ? users : []);
                const systemsData = await fetchSystemsApi();
                setSystemsList(Array.isArray(systemsData) ? systemsData : []);

                const attendanceRes = await fetchAttendanceSummaryApi();
                const attendanceList = Array.isArray(attendanceRes?.data?.data)
                    ? attendanceRes.data.data
                    : [];
                setAttendance(attendanceList);
            } catch (error) {
                console.error("Error fetching admin data:", error);
            }
        };
        fetchAdminData();
    }, []);

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
            <section className="py-6 md:py-12 bg-transparent">
                <div className="container mx-auto px-4 md:px-8 max-w-6xl">
                    <div className="text-center mb-1">
                        <div className="inline-block relative">
                            <h2
                                className="
                                    text-2xl md:text-3xl lg:text-4xl font-black
                                    inline-block px-8 py-4 mb-1 rounded-3xl
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
                                Sourabh Rolling Mill
                            </h2>
                            <div className="">
                                <p className="typing-effect text-lg md:text-xl font-bold leading-relaxed inline-block bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400 drop-shadow-sm">
                                    मजबूती और विश्वास है हम...
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-5xl mx-auto mb-10 bg-white rounded-[3rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] border border-gray-100 px-8 md:px-16 py-12 md:py-20 relative overflow-hidden group hover:shadow-[0_40px_80px_-20px_rgba(220,38,38,0.15)] transition-all duration-700">
                        {/* Decorative element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-red-100 transition-colors" />

                        <div className="relative z-10">
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-8 text-center flex items-center justify-center gap-4">
                                <div className="w-2 h-10 bg-red-600 rounded-full" />
                                About Us
                            </h2>
                            <p className="text-md text-gray-600 leading-relaxed text-justify first-letter:text-5xl first-letter:font-black first-letter:text-red-600 first-letter:mr-3 first-letter:float-left">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mt-12 mb-10">
                        <div className="group p-8 lg:p-12 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 hover:scale-[1.02] transition-all duration-500 hover:shadow-2xl">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-red-600 transition-colors duration-500">
                                <Target className="w-10 h-10 text-red-600 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Our Mission</h3>
                            <p className="text-gray-500 text-lg leading-relaxed">Creating sustainable happiness and excellence through consistent high-value achievements.</p>
                        </div>
                        <div className="group p-8 lg:p-12 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 hover:scale-[1.02] transition-all duration-500 hover:shadow-2xl">
                            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-500">
                                <Award className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Our Vision</h3>
                            <p className="text-gray-500 text-lg leading-relaxed">Becoming a global benchmark in steel manufacturing with a humble heart and a creative mindset.</p>
                        </div>
                    </div>

                    <div className="mb-20">
                        <div className="flex items-center justify-center gap-4 mb-12">
                            <div className="h-px bg-gray-200 flex-1" />
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight px-4">Our Excellence in Products</h3>
                            <div className="h-px bg-gray-200 flex-1" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                            <div
                                className="relative aspect-video lg:aspect-[16/9] overflow-hidden rounded-[3rem] shadow-2xl border-8 border-white group cursor-pointer"
                                onClick={() => setActiveIndex(activeIndex === 0 ? null : 0)}
                            >
                                <img src="/pipe1.jpg" alt="Steel Pipes" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 ${activeIndex === 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                                <div className={`absolute bottom-8 left-0 w-full text-center p-6 transition-all duration-500 transform ${activeIndex === 0 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"}`}>
                                    <span className="text-white text-2xl font-black tracking-wider uppercase">MS Pipes (Circle)</span>
                                    <div className="w-12 h-1 bg-red-600 mx-auto mt-2 rounded-full" />
                                </div>
                            </div>

                            <div
                                className="relative aspect-video lg:aspect-[16/9] overflow-hidden rounded-[3rem] shadow-2xl border-8 border-white group cursor-pointer"
                                onClick={() => setActiveIndex(activeIndex === 1 ? null : 1)}
                            >
                                <img src="/pipe2.png" alt="TMT Bars" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 ${activeIndex === 1 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                                <div className={`absolute bottom-8 left-0 w-full text-center p-6 transition-all duration-500 transform ${activeIndex === 1 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"}`}>
                                    <span className="text-white text-2xl font-black tracking-wider uppercase">MS Pipes (Square)</span>
                                    <div className="w-12 h-1 bg-red-600 mx-auto mt-2 rounded-full" />
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
                                    <span className="text-gray-300">Achholi Road Kanhera, Urla Industrial Area, Raipur C.G.</span>
                                </div>
                            </div>
                        </div>
                        <div className="">
                            <h5 className="text-lg font-medium mb-4 text-red-400">Our Location</h5>
                            <div className="w-full h-48 md:h-64 lg:h-48">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d529.0000000000001!2d81.6093303!3d21.3333512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a28e700143df22d%3A0x89321ea274817173!2sSourabh%20Rolling%20Mill%20Pvt.%20Ltd.!5e0!3m2!1sen!2sin!4v1690000000000!5m2!1sen!2sin"
                                    width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Google Map Location"
                                ></iframe>
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

            <style>
                {`
                .typing-effect {
                    white-space: nowrap;
                    overflow: hidden;
                    width: 0;
                    animation: typing 4s steps(60, end) forwards;
                }
                @keyframes typing {
                    from { width: 0 }
                    to { width: 100% }
                }
                `}
            </style>
        </div>
    );
};

export default AdminPage;
