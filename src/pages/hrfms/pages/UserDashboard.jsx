/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardStats } from '../../../api/hrfms/dashboardApi';
import useAutoSync from '../hooks/useAutoSync';
import {
    Calendar,
    Clock,
    Briefcase,
    Plane,
    Ticket,
    MapPin,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';

const UserDashboard = () => {
    const { token, user } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboardData = useCallback(async (isAutoSync = false) => {
        try {
            if (!isAutoSync) {
                setLoading(true);
            }
            const res = await getDashboardStats(token, { month: selectedMonth });
            if (res.success) {
                setData(res.data);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            if (!isAutoSync) {
                setLoading(false);
            }
        }
    }, [selectedMonth, token]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Enable auto-sync every 10 seconds
    useAutoSync(() => fetchDashboardData(true), 10000);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center text-red-500 bg-red-50 p-4 rounded">
            <AlertCircle className="mr-2" /> {error}
        </div>
    );

    if (!data) return null;

    const { attendance, leaves, travels, tickets, visits } = data;

    const summaryCards = [
        {
            label: 'Total Leaves',
            value: leaves?.length || 0,
            icon: Calendar,
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            iconBg: 'bg-purple-500',
            textColor: 'text-white'
        },
        {
            label: 'Travel Requests',
            value: travels?.length || 0,
            icon: Plane,
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            iconBg: 'bg-emerald-500',
            textColor: 'text-white'
        },
        {
            label: 'Tickets Booked',
            value: tickets?.length || 0,
            icon: Ticket,
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            iconBg: 'bg-blue-500',
            textColor: 'text-white'
        },
        {
            label: 'Site Visits',
            value: visits?.length || 0,
            icon: MapPin,
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            iconBg: 'bg-amber-500',
            textColor: 'text-white'
        }
    ];

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.user_name}</h1>
                    <p className="text-sm text-gray-500">Employee Dashboard</p>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <Calendar size={18} className="text-gray-500" />
                    <label className="text-sm font-medium text-gray-700 hidden sm:block">Select Month:</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent text-sm font-medium focus:ring-0 outline-none text-gray-800 cursor-pointer"
                    />
                </div>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
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
                                <h3 className={`text-xl sm:text-3xl font-bold ${card.textColor}`}>{card.value.toLocaleString()}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Attendance Section */}
            <AttendanceCard attendance={attendance} month={selectedMonth} />

            {/* Requests Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <RequestSection
                        title="Leave Requests"
                        icon={Calendar}
                        data={leaves}
                        type="leave"
                        customGradient="linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)"
                        borderColor="border-pink-100"
                        iconColor="text-pink-500"
                    />
                    <RequestSection
                        title="Travel Requests"
                        icon={Plane}
                        data={travels}
                        type="travel"
                        customGradient="linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)"
                        borderColor="border-cyan-100"
                        iconColor="text-cyan-600"
                    />
                </div>
                <div className="space-y-6">
                    <RequestSection
                        title="Ticket Bookings"
                        icon={Ticket}
                        data={tickets}
                        type="ticket"
                        customGradient="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
                        borderColor="border-violet-100"
                        iconColor="text-violet-600"
                    />
                    <RequestSection
                        title="Site Visits"
                        icon={MapPin}
                        data={visits}
                        type="visit"
                        customGradient="linear-gradient(135deg, #f6d365 0%, #fda085 100%)"
                        borderColor="border-orange-100"
                        iconColor="text-orange-600"
                    />
                </div>
            </div>
        </div>
    );
};

const AttendanceCard = ({ attendance, month }) => {
    if (!month) return null;
    const year = parseInt(month.split('-')[0]);
    const monthIndex = parseInt(month.split('-')[1]) - 1;
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const startDay = getDay(startDate); // 0-6 Sun-Sat

    const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div className="bg-emerald-500 rounded-xl shadow-lg overflow-hidden text-white transition-all duration-300">
            {/* Calendar Header */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center border-b border-emerald-400/30 gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-white" size={24} />
                        <h2 className="text-xl font-bold">Attendance Calendar</h2>
                    </div>
                </div>

                {/* Stats Chips */}
                <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm font-medium bg-emerald-600/40 p-1.5 sm:px-4 sm:py-2 rounded-lg backdrop-blur-sm w-full sm:w-auto justify-around sm:justify-start">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="text-white" />
                        <span><span className="opacity-80">Present:</span> <strong>{attendance.present}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:border-l sm:border-emerald-400/50 sm:pl-4">
                        <XCircle size={16} className="text-white" />
                        <span><span className="opacity-80">Absent:</span> <strong>{attendance.absent}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:border-l sm:border-emerald-400/50 sm:pl-4 hidden sm:flex">
                        <Briefcase size={16} className="text-white" />
                        <span><span className="opacity-80">Working:</span> <strong>{attendance.totalWorkingDays}</strong></span>
                    </div>
                </div>
            </div>

            <div className="p-3 sm:p-6">
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold flex items-center justify-center gap-2">
                        {format(startDate, 'MMMM yyyy')}
                    </h3>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2 max-w-4xl mx-auto">
                    {dayLabels.map(day => (
                        <div key={day} className="text-center text-xs sm:text-sm font-bold opacity-80 py-2 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}

                    {Array(startDay).fill(null).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const status = attendance.details[dateStr];
                        const isToday = isSameDay(day, new Date());

                        let cellBg = 'hover:bg-emerald-400/20';

                        if (status === 'P') cellBg = 'bg-white/20 font-bold shadow-sm';
                        else if (status === 'A') cellBg = 'bg-rose-500 font-bold shadow-sm';
                        else if (status === 'H') cellBg = 'bg-amber-400 text-amber-900 font-bold shadow-sm';

                        if (isToday) {
                            cellBg += ' ring-2 ring-white z-10';
                        }

                        return (
                            <div
                                key={dateStr}
                                className={`
                                    aspect-square rounded-md sm:rounded-lg flex flex-col items-center justify-center relative transition-all duration-200
                                    ${cellBg}
                                `}
                            >
                                <span className="text-sm sm:text-lg">{format(day, 'd')}</span>
                                {status && (
                                    <div className="mt-0.5">
                                        <span className="text-[10px] font-extrabold sm:hidden">{status}</span>
                                        <span className="text-[10px] font-medium hidden sm:block opacity-90">
                                            {status === 'P' ? 'Present' : status === 'A' ? 'Absent' : status}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const RequestSection = ({ title, icon: Icon, data, type, gradient, borderColor, iconColor, customGradient }) => {
    // Default styles if not provided
    const bgGradient = gradient || 'bg-white';
    const border = borderColor || 'border-gray-100';
    const iconStyle = iconColor || 'text-blue-500';

    return (
        <div
            className={`rounded-xl shadow-sm border overflow-hidden flex flex-col h-[400px] ${!customGradient ? bgGradient : ''} ${border}`}
            style={customGradient ? { backgroundImage: customGradient } : {}}
        >
            <div className={`p-4 border-b ${border} bg-white/80 backdrop-blur-sm flex justify-between items-center sticky top-0 md:static z-10`}>
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Icon size={18} className={iconStyle} />
                    {title}
                </h3>
                <span className={`bg-white px-2 py-0.5 rounded-full text-xs font-medium text-gray-600 border shadow-sm ${border}`}>
                    Total: {data?.length || 0}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {(!data || data.length === 0) ? (
                    <div className={`h-full flex flex-col items-center justify-center ${customGradient ? 'text-white' : 'text-gray-400'}`}>
                        <div className={`${customGradient ? 'bg-white/20 text-white' : 'bg-white/50 text-gray-400'} p-4 rounded-full mb-3 shadow-sm`}>
                            <Icon size={24} className={customGradient ? "" : "opacity-40"} />
                        </div>
                        <p className={`text-sm font-medium ${customGradient ? 'text-white/90' : ''}`}>No records found</p>
                        <p className={`text-xs mt-1 ${customGradient ? 'text-white/70' : 'text-gray-500'}`}>Try selecting a different month</p>
                    </div>
                ) : (
                    data.map((item, idx) => (
                        <RequestItem key={idx} item={item} type={type} />
                    ))
                )}
            </div>
        </div>
    );
};

const RequestItem = ({ item, type }) => {
    const getStatusBadge = (status) => {
        const s = (status || 'Pending').toLowerCase();
        let colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
        let label = 'Pending';

        if (s.includes('approv') || s === 'booked' || s === 'selected' || s === 'completed') {
            colorClass = 'bg-green-100 text-green-700 border-green-200';
            label = 'Approved';
        } else if (s.includes('reject')) {
            colorClass = 'bg-red-100 text-red-700 border-red-200';
            label = 'Rejected';
        } else if (s === 'open') {
            colorClass = 'bg-blue-100 text-blue-700 border-blue-200';
            label = 'Open';
        }

        return (
            <span className={`px-2 py-1 text-[10px] uppercase tracking-wide font-bold rounded-full border ${colorClass}`}>
                {label}
            </span>
        );
    };

    if (type === 'leave') {
        return (
            <div className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors shadow-sm bg-white">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-semibold text-gray-800 line-clamp-1 mr-2">{item.reason || 'Leave Request'}</h4>
                    <div className="flex-shrink-0">
                        {getStatusBadge(item.request_status || item.approved_by_status)}
                    </div>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                    <Calendar size={12} />
                    <span>
                        {format(new Date(item.from_date), 'd MMM')} - {format(new Date(item.to_date), 'd MMM yyyy')}
                    </span>
                </div>
            </div>
        );
    }

    if (type === 'travel') {
        return (
            <div className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors shadow-sm bg-white">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-800">{item.reason_for_travel || 'Travel Request'}</h4>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                            <MapPin size={12} className="mr-1 text-gray-400" />
                            {item.from_city} <span className="mx-1">➔</span> {item.to_city}
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        {getStatusBadge(item.request_status)}
                    </div>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-2 border-t border-gray-50 pt-2">
                    <Calendar size={12} />
                    <span>{format(new Date(item.from_date), 'd MMM yyyy')}</span>
                </div>
            </div>
        );
    }

    if (type === 'ticket') {
        // Determine if it was requested or booked for user
        // Using item keys to guess...
        return (
            <div className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors shadow-sm bg-white">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-800">{item.travels_name || 'Ticket Booking'}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Bill No: {item.bill_number}</p>
                    </div>
                    <div className="flex-shrink-0">
                        {getStatusBadge(item.status)}
                    </div>
                </div>
                <div className="mt-3 flex justify-between items-center pt-2 border-t border-gray-50">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {format(new Date(item.created_at), 'd MMM yyyy')}
                    </div>
                    <span className="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">₹{parseFloat(item.total_amount).toLocaleString()}</span>
                </div>
            </div>
        );
    }

    if (type === 'visit') {
        return (
            <div className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors shadow-sm bg-white">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-800">{item.reason_for_visit || 'Site Visit'}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                            Person: <span className="font-medium text-gray-700">{item.person_name}</span>
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        {getStatusBadge(item.request_status)}
                    </div>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-2 border-t border-gray-50 pt-2">
                    <Calendar size={12} />
                    <span>{format(new Date(item.from_date), 'd MMM yyyy')}</span>
                </div>
            </div>
        );
    }

    return null;
};

export default UserDashboard;
