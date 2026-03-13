import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts';
import {
    Users,
    UserCheck,
    UserX,
    Clock,
    TrendingUp,
    UserPlus,
    Calendar,
    Plane,
    Ticket,
    FileText,
    Building2,
    DollarSign,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Briefcase,
    GraduationCap
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardStats } from '../../../api/hrfms/dashboardApi';
import useAutoSync from '../hooks/useAutoSync';

const STATUS_COLORS = ['#10B981', '#EF4444', '#3B82F6', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6'];
const CHART_COLORS = {
    primary: '#6366F1',
    secondary: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899'
};

const AdminDashboard = () => {
    const { token } = useAuth();
    const [summary, setSummary] = useState({
        totalEmployees: 0,
        activeEmployees: 0,
        resignedEmployees: 0,
        leftThisMonth: 0
    });
    const [leaveRequests, setLeaveRequests] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        hrApproved: 0
    });
    const [travelRequests, setTravelRequests] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
    });
    const [tickets, setTickets] = useState({
        total: 0,
        booked: 0,
        pending: 0,
        totalAmount: 0
    });
    const [resumes, setResumes] = useState({
        total: 0,
        selected: 0,
        pending: 0,
        rejected: 0,
        joined: 0,
        interviewed: 0
    });
    const [visitors, setVisitors] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
    });
    const [attendance, setAttendance] = useState({
        present: 0,
        absent: 0,
        totalActive: 0,
        date: '',
        inCount: 0,
        outCount: 0,
        deviceConnected: true,
        deviceStatus: []
    });
    const [statusDistribution, setStatusDistribution] = useState([]);
    const [monthlyHiringData, setMonthlyHiringData] = useState([]);
    const [monthlyRequestTrends, setMonthlyRequestTrends] = useState([]);
    const [monthlyTicketRevenue, setMonthlyTicketRevenue] = useState([]);
    const [designationData, setDesignationData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadDashboard = useCallback(async (isAutoSync = false) => {
        if (!token) {
            setLoading(false);
            return;
        }

        if (!isAutoSync) {
            setLoading(true);
        }
        setError(null);

        try {
            const response = await getDashboardStats(token);
            const payload = response?.data ?? {};

            setSummary({
                totalEmployees: payload.summary?.totalEmployees ?? 0,
                activeEmployees: payload.summary?.activeEmployees ?? 0,
                resignedEmployees: payload.summary?.resignedEmployees ?? 0,
                leftThisMonth: payload.summary?.leftThisMonth ?? 0
            });

            setLeaveRequests({
                total: payload.leaveRequests?.total ?? 0,
                approved: payload.leaveRequests?.approved ?? 0,
                pending: payload.leaveRequests?.pending ?? 0,
                rejected: payload.leaveRequests?.rejected ?? 0,
                hrApproved: payload.leaveRequests?.hrApproved ?? 0
            });

            setTravelRequests({
                total: payload.travelRequests?.total ?? 0,
                approved: payload.travelRequests?.approved ?? 0,
                pending: payload.travelRequests?.pending ?? 0,
                rejected: payload.travelRequests?.rejected ?? 0
            });

            setTickets({
                total: payload.tickets?.total ?? 0,
                booked: payload.tickets?.booked ?? 0,
                pending: payload.tickets?.pending ?? 0,
                totalAmount: payload.tickets?.totalAmount ?? 0
            });

            setResumes({
                total: payload.resumes?.total ?? 0,
                selected: payload.resumes?.selected ?? 0,
                pending: payload.resumes?.pending ?? 0,
                rejected: payload.resumes?.rejected ?? 0,
                joined: payload.resumes?.joined ?? 0,
                interviewed: payload.resumes?.interviewed ?? 0
            });

            setVisitors({
                total: payload.visitors?.total ?? 0,
                approved: payload.visitors?.approved ?? 0,
                pending: payload.visitors?.pending ?? 0,
                rejected: payload.visitors?.rejected ?? 0
            });

            setStatusDistribution(Array.isArray(payload.statusDistribution) ? payload.statusDistribution : []);
            setMonthlyHiringData(Array.isArray(payload.monthlyHiringVsAttrition) ? payload.monthlyHiringVsAttrition : []);
            setMonthlyRequestTrends(Array.isArray(payload.monthlyRequestTrends) ? payload.monthlyRequestTrends : []);
            setMonthlyTicketRevenue(Array.isArray(payload.monthlyTicketRevenue) ? payload.monthlyTicketRevenue : []);
            setDesignationData(Array.isArray(payload.designationCounts) ? payload.designationCounts : []);

            setAttendance({
                present: payload.attendance?.present ?? 0,
                absent: payload.attendance?.absent ?? 0,
                totalActive: payload.attendance?.totalActive ?? 0,
                date: payload.attendance?.date || '',
                inCount: payload.attendance?.inCount ?? 0,
                outCount: payload.attendance?.outCount ?? 0,
                deviceConnected: payload.attendance?.deviceConnected ?? true,
                deviceStatus: Array.isArray(payload.attendance?.deviceStatus) ? payload.attendance.deviceStatus : []
            });
        } catch (loadError) {
            setError(loadError.message || 'Failed to load dashboard data');
        } finally {
            if (!isAutoSync) {
                setLoading(false);
            }
        }
    }, [token]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // Enable auto-sync every 10 seconds
    useAutoSync(() => loadDashboard(true), 10000);

    const summaryCards = useMemo(() => [
        {
            label: 'Total Employees',
            value: summary.totalEmployees,
            icon: Users,
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            iconBg: 'bg-purple-500',
            textColor: 'text-white'
        },
        {
            label: 'Active Employees',
            value: summary.activeEmployees,
            icon: UserCheck,
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            iconBg: 'bg-emerald-500',
            textColor: 'text-white'
        },
        {
            label: 'Leave Requests',
            value: leaveRequests.total,
            icon: Calendar,
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            iconBg: 'bg-blue-500',
            textColor: 'text-white'
        },
        {
            label: 'Travel Requests',
            value: travelRequests.total,
            icon: Plane,
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            iconBg: 'bg-amber-500',
            textColor: 'text-white'
        },
        {
            label: 'Tickets Booked',
            value: tickets.booked,
            icon: Ticket,
            gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
            iconBg: 'bg-pink-500',
            textColor: 'text-white'
        },
        {
            label: 'Total Candidates',
            value: resumes.total,
            icon: FileText,
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            iconBg: 'bg-violet-500',
            textColor: 'text-white'
        },
        {
            label: 'Selected Candidates',
            value: resumes.selected,
            icon: CheckCircle2,
            gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            iconBg: 'bg-teal-500',
            textColor: 'text-white'
        },
        {
            label: 'Plant Visitors',
            value: visitors.total,
            icon: Building2,
            gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            iconBg: 'bg-indigo-500',
            textColor: 'text-white'
        }
    ], [summary.totalEmployees, summary.activeEmployees, leaveRequests.total, travelRequests.total, tickets.booked, resumes.total, resumes.selected, visitors.total]);

    const requestCards = useMemo(() => [
        {
            title: 'Leave Requests',
            data: leaveRequests,
            icon: Calendar,
            color: CHART_COLORS.info
        },
        {
            title: 'Travel Requests',
            data: travelRequests,
            icon: Plane,
            color: CHART_COLORS.warning
        },
        {
            title: 'Plant Visitors',
            data: visitors,
            icon: Building2,
            color: CHART_COLORS.purple
        }
    ], [leaveRequests, travelRequests, visitors]);

    const pieData = useMemo(() => (
        statusDistribution.length
            ? statusDistribution.map((entry, index) => ({
                name: entry.label,
                value: entry.value,
                color: STATUS_COLORS[index % STATUS_COLORS.length]
            }))
            : [
                { name: 'Active', value: summary.activeEmployees, color: '#10B981' },
                { name: 'Resigned', value: summary.resignedEmployees, color: '#EF4444' }
            ]
    ), [statusDistribution, summary.activeEmployees, summary.resignedEmployees]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
            <div className="w-full space-y-6">


                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                        <div className="flex items-center">
                            <AlertCircle className="text-red-500 mr-3" size={20} />
                            <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Summary Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-6">
                    {summaryCards.map((card, index) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={index}
                                className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                                style={{ backgroundImage: card.gradient }}
                            >
                                <div className="p-3 sm:p-6">
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <div className={`${card.iconBg} rounded-lg p-2 sm:p-3 shadow-md`}>
                                            <Icon size={18} className="text-white sm:w-6 sm:h-6" />
                                        </div>
                                    </div>
                                    <p className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${card.textColor} opacity-90`}>{card.label}</p>
                                    <h3 className={`text-xl sm:text-3xl font-bold ${card.textColor}`}>{(card.value ?? 0).toLocaleString()}</h3>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Attendance Card */}
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <div className="w-full">
                            <h2 className="text-lg sm:text-xl font-bold mb-3 flex items-center">
                                <Clock size={18} className="mr-2" />
                                Today's Attendance <span className="text-xs sm:text-sm font-normal ml-2 opacity-90">{attendance.date ? `(${attendance.date})` : ''}</span>
                            </h2>
                            <div className="grid grid-cols-3 gap-2 sm:gap-8 mt-2">
                                <div className="bg-white/10 rounded-lg p-2 sm:p-0 sm:bg-transparent text-center sm:text-left">
                                    <p className="text-[10px] sm:text-xs opacity-90 mb-0.5">Total Active</p>
                                    <p className="text-xl sm:text-2xl font-bold">{attendance.totalActive}</p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2 sm:p-0 sm:bg-transparent text-center sm:text-left">
                                    <p className="text-[10px] sm:text-xs opacity-90 mb-0.5">Present</p>
                                    <p className="text-xl sm:text-2xl font-bold">{attendance.present}</p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2 sm:p-0 sm:bg-transparent text-center sm:text-left">
                                    <p className="text-[10px] sm:text-xs opacity-90 mb-0.5">Absent</p>
                                    <p className="text-xl sm:text-2xl font-bold">{attendance.absent}</p>
                                </div>
                            </div>
                            {!attendance.deviceConnected && (
                                <div className="mt-3 rounded-lg bg-red-500/20 border border-red-300/40 px-3 py-2 text-xs sm:text-sm">
                                    Device API connection failed. Live logs unavailable.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Request Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {requestCards.map((card, index) => {
                        const Icon = card.icon;
                        return (
                            <div key={index} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                                <div className="flex items-center mb-4">
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}20` }}>
                                        <Icon size={20} style={{ color: card.color }} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 ml-3">{card.title}</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total</span>
                                        <span className="text-lg font-bold text-gray-800">{card.data.total}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Approved</span>
                                        <span className="text-lg font-semibold text-emerald-600">{card.data.approved}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Pending</span>
                                        <span className="text-lg font-semibold text-amber-600">{card.data.pending}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Rejected</span>
                                        <span className="text-lg font-semibold text-red-600">{card.data.rejected}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Employee Status Distribution */}
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                            <Users size={20} className="mr-2 text-indigo-600" />
                            Employee Status Distribution
                        </h2>
                        <div className="h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Monthly Hiring vs Attrition */}
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                            <TrendingUp size={20} className="mr-2 text-emerald-600" />
                            Monthly Hiring Trend
                        </h2>
                        <div className="h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                                <AreaChart data={monthlyHiringData}>
                                    <defs>
                                        <linearGradient id="colorHired" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                    <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                                    <YAxis stroke="#6B7280" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="hired" stroke="#10B981" fillOpacity={1} fill="url(#colorHired)" name="Hired" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Monthly Request Trends */}
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                            <Clock size={20} className="mr-2 text-blue-600" />
                            Monthly Request Trends
                        </h2>
                        <div className="h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                                <BarChart data={monthlyRequestTrends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                    <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                                    <YAxis stroke="#6B7280" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="leaves" name="Leaves" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="travels" name="Travels" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="visitors" name="Visitors" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Designation-wise Employee Count */}
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                            <Briefcase size={20} className="mr-2 text-purple-600" />
                            Designation-wise Employee Count
                        </h2>
                        <div className="h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                                <BarChart data={designationData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                    <XAxis type="number" stroke="#6B7280" fontSize={12} />
                                    <YAxis dataKey="designation" type="category" stroke="#6B7280" fontSize={12} width={100} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Bar dataKey="employees" name="Employees" radius={[0, 4, 4, 0]}>
                                        {designationData.map((entry, index) => (
                                            <Cell
                                                key={`designation-${index}`}
                                                fill={
                                                    index % 4 === 0
                                                        ? '#6366F1'
                                                        : index % 4 === 1
                                                            ? '#10B981'
                                                            : index % 4 === 2
                                                                ? '#F59E0B'
                                                                : '#EC4899'
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Ticket Revenue */}
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                            <DollarSign size={20} className="mr-2 text-emerald-600" />
                            Ticket Revenue Trend
                        </h2>
                        <div className="h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                                <LineChart data={monthlyTicketRevenue}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                    <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                                    <YAxis stroke="#6B7280" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value) => `₹${(value ?? 0).toLocaleString('en-IN')}`}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} name="Revenue (₹)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Candidate Statistics */}
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                            <GraduationCap size={20} className="mr-2 text-violet-600" />
                            Candidate Statistics
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-4 border border-violet-100">
                                    <p className="text-xs text-gray-600 mb-1">Total Candidates</p>
                                    <p className="text-2xl font-bold text-violet-600">{resumes.total}</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
                                    <p className="text-xs text-gray-600 mb-1">Selected</p>
                                    <p className="text-2xl font-bold text-emerald-600">{resumes.selected}</p>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
                                    <p className="text-xs text-gray-600 mb-1">Pending</p>
                                    <p className="text-2xl font-bold text-amber-600">{resumes.pending}</p>
                                </div>
                                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-100">
                                    <p className="text-xs text-gray-600 mb-1">Rejected</p>
                                    <p className="text-2xl font-bold text-red-600">{resumes.rejected}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                                    <p className="text-xs text-gray-600 mb-1">Interviewed</p>
                                    <p className="text-2xl font-bold text-blue-600">{resumes.interviewed}</p>
                                </div>
                                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-4 border border-teal-100">
                                    <p className="text-xs text-gray-600 mb-1">Joined</p>
                                    <p className="text-2xl font-bold text-teal-600">{resumes.joined}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ticket Stats Card */}
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold mb-2 flex items-center">
                                <Ticket size={20} className="mr-2" />
                                Ticket Booking Statistics
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                                <div>
                                    <p className="text-xs opacity-90 mb-1">Total Tickets</p>
                                    <p className="text-2xl font-bold">{tickets.total}</p>
                                </div>
                                <div>
                                    <p className="text-xs opacity-90 mb-1">Booked</p>
                                    <p className="text-2xl font-bold">{tickets.booked}</p>
                                </div>
                                <div>
                                    <p className="text-xs opacity-90 mb-1">Pending</p>
                                    <p className="text-2xl font-bold">{tickets.pending}</p>
                                </div>
                                <div>
                                    <p className="text-xs opacity-90 mb-1">Total Revenue</p>
                                    <p className="text-2xl font-bold">₹{(tickets.totalAmount ?? 0).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;