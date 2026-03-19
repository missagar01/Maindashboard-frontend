import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { ListTodo, CheckCircle2, Clock, AlertTriangle, XCircle, LayoutGrid, Calendar, X, ChevronRight, BarChart3, Info } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { motion, AnimatePresence } from '../../../../../utils/framerMotionCompat';
import { getDivisionWiseTaskCountsApi } from "@/api/checklist/dashboardApi.js";

const renderEmptyTooltip = () => null;

const DivisionWiseCards = memo(({ dateRange, userRole, username, designation, division }) => {
    const [divisionCounts, setDivisionCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [modalData, setModalData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Ref to track the last fetched date range to prevent redundant calls
    const lastFetchedRange = useRef({ startDate: null, endDate: null });

    const isAuthorized = username === 'AAKASH AGRAWAL' || username === 'Sheelesh Marele' || designation?.toLowerCase() === "division hod";

    const fetchCounts = useCallback(async () => {
        // Only fetch if AAKASH AGRAWAL or division hod
        if (!isAuthorized) return;

        const currentStart = dateRange?.startDate || "";
        const currentEnd = dateRange?.endDate || "";

        // Skip if this range was the last one successfully fetched
        if (lastFetchedRange.current.startDate === currentStart &&
            lastFetchedRange.current.endDate === currentEnd) {
            return;
        }

        setLoading(true);
        try {
            const data = await getDivisionWiseTaskCountsApi(currentStart, currentEnd);
            setDivisionCounts(data || {});

            // Record successful fetch parameters
            lastFetchedRange.current = { startDate: currentStart, endDate: currentEnd };
        } catch (error) {
            console.error("Error fetching division counts:", error);
        } finally {
            setLoading(false);
        }
    }, [isAuthorized, dateRange?.startDate, dateRange?.endDate]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    const openBreakdownModal = (division, label, countData, icon, color, textColor, divisionStats) => {
        setModalData({
            division,
            label,
            count: countData?.count || 0,
            departments: countData?.departments || {},
            divisionStats,
            icon,
            color,
            textColor
        });
        setIsModalOpen(true);
    };


    const STAT_COLORS = {
        'Done': '#10b981',
        'Pending': '#f59e0b',
        'Not Done': '#94a3b8',
        'Overdue': '#dc2626',
        'Future': '#6366f1'
    };

    const renderBreakdown = (data) => {
        if (!data || typeof data !== 'object' || !data.breakdown) return null;
        const { checklist = 0, housekeeping = 0, maintenance = 0 } = data.breakdown;
        return (
            <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2 pt-1 border-t border-gray-100/50">
                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">CHK: {checklist}</span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">HK: {housekeeping}</span>
                <span className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter">MNT: {maintenance}</span>
            </div>
        );
    };

    const DivisionPieChart = ({ data, total, completed }) => {
        const [activeLabel, setActiveLabel] = React.useState(null);
        const [activePercent, setActivePercent] = React.useState(null);

        const completionScore = total > 0 ? ((completed / total) * 100).toFixed(2) : "0.00";

        const onPieEnter = (_, index) => {
            const item = data[index];
            if (item) {
                setActiveLabel(item.name);
                setActivePercent(((item.value / total) * 100).toFixed(2));
            }
        };

        const onPieLeave = () => {
            setActiveLabel(null);
            setActivePercent(null);
        };

        return (
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative flex h-[176px] w-[176px] flex-shrink-0 items-center justify-center sm:h-[192px] sm:w-[192px]"
            >
                <div className="flex h-[176px] w-[176px] items-center justify-center">
                    <PieChart width={176} height={176}>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
                            onClick={onPieEnter}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={STAT_COLORS[entry.name]}
                                    className="outline-none cursor-pointer transition-opacity hover:opacity-80"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={renderEmptyTooltip} cursor={false} />
                    </PieChart>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <AnimatePresence mode="wait">
                        {activeLabel ? (
                            <motion.div
                                key="active"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="flex flex-col items-center text-center px-1"
                            >
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-0.5 truncate max-w-full">
                                    {activeLabel}
                                </span>
                                <span className="text-lg font-black text-gray-800 leading-none">
                                    {activePercent}%
                                </span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="score"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="flex flex-col items-center"
                            >
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-0.5 underline underline-offset-4 decoration-emerald-500/50">
                                    Score
                                </span>
                                <span className="text-xl font-black text-gray-800 leading-none">
                                    {completionScore}%
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        );
    };

    const StatItem = ({ label, countData, value, icon: Icon, color, textColor, division, divisionStats, onOpenBreakdown }) => (
        <motion.div
            whileTap={{ scale: 0.96 }}
            onClick={() => onOpenBreakdown(division, label, countData, Icon, color, textColor, divisionStats)}
            className={`flex items-center justify-between rounded-full bg-white border border-gray-100 shadow-sm transition-all hover:shadow cursor-pointer py-1 px-2 mb-1.5 sm:py-1.5 sm:px-3 sm:mb-2`}
        >
            <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden">
                <div className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0`} style={{ backgroundColor: STAT_COLORS[label] || '#94a3b8' }} />
                <span className="text-[9px] sm:text-[11px] font-black text-gray-600 uppercase tracking-tight whitespace-nowrap">{label}</span>
            </div>
            <div className={`text-[10px] sm:text-[13px] font-black text-gray-900 ml-2 sm:ml-3 bg-gray-50 px-2 sm:px-3 py-0.5 rounded-full border border-gray-100 min-w-[35px] sm:min-w-[60px] text-center tabular-nums`}>
                {value}
            </div>
        </motion.div>
    );

    const BreakdownModal = ({ isOpen, onClose, modalData }) => {
        if (!isOpen || !modalData) return null;

        const sortedDepts = Object.entries(modalData.departments).sort((a, b) => (b[1].total || 0) - (a[1].total || 0));

        return (
            <AnimatePresence>
                <div
                    className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-[4px]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white w-full max-w-md rounded-2xl sm:rounded-[28px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Area */}
                        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="p-1.5 sm:p-2 rounded-xl bg-gray-50">
                                    <modalData.icon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-gray-700" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">{modalData.division}</h2>
                                    <h3 className="text-sm sm:text-base font-[1000] text-gray-900 uppercase tracking-tight">{modalData.label}</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="text-sm sm:text-base font-black text-gray-800 bg-gray-100 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl shadow-inner">
                                    {modalData.count}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <XCircle className="h-6 w-6 sm:h-7 sm:w-7" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1 pb-6 sm:pb-8">
                            {sortedDepts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                                    <BarChart3 className="h-10 w-10 mb-3 opacity-20" />
                                    <p className="text-sm font-bold">No data found</p>
                                </div>
                            ) : (
                                <div className="space-y-2 sm:space-y-3">
                                    {sortedDepts.map(([dept, data], idx) => {
                                        let deptTotalTasks = 0;
                                        let deptCompletedTasks = 0;

                                        if (modalData.divisionStats) {
                                            deptTotalTasks = modalData.divisionStats.total?.departments?.[dept]?.total || 0;
                                            deptCompletedTasks = modalData.divisionStats.completed?.departments?.[dept]?.total || 0;
                                        }

                                        const totalScore = deptTotalTasks > 0
                                            ? Math.max(parseFloat(((deptCompletedTasks / deptTotalTasks) * 100 - 100).toFixed(2)), -100)
                                            : 0;

                                        let scoreBgColor = "bg-red-500";
                                        let scoreBorderColor = "border-red-600";

                                        if (totalScore >= -20) {
                                            scoreBgColor = "bg-emerald-500";
                                            scoreBorderColor = "border-emerald-600";
                                        } else if (totalScore >= -50) {
                                            scoreBgColor = "bg-amber-500";
                                            scoreBorderColor = "border-amber-600";
                                        }

                                        return (
                                            <div key={idx} className="bg-gray-50/50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:border-red-100 group flex flex-col gap-2">
                                                <div className="flex justify-between items-start gap-3">
                                                    <span className="text-[13px] sm:text-sm font-black text-gray-800 uppercase tracking-tight group-hover:text-red-600 transition-colors pt-0.5">{dept}</span>
                                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                        <div className={`flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-xl shadow-lg border ${scoreBorderColor} ${scoreBgColor}`}>
                                                            <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                                                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-tighter text-white">
                                                                {totalScore}%
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-xl shadow-inner bg-slate-100 border border-slate-200">
                                                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase leading-none tracking-tight">Total</span>
                                                            <span className="text-[10px] sm:text-xs font-black text-slate-700 leading-none">
                                                                {deptTotalTasks}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] sm:text-xs font-[1000] text-red-600 bg-red-50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-red-100 shadow-sm flex items-center justify-center">
                                                            {data.total || 0}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                                    <div className="bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-emerald-50 flex flex-col items-center shadow-sm">
                                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter mb-0.5">CHK</span>
                                                        <span className="text-[13px] sm:text-sm font-[1000] text-emerald-700">{data.checklist || 0}</span>
                                                    </div>
                                                    <div className="bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-indigo-50 flex flex-col items-center shadow-sm">
                                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter mb-0.5">MNT</span>
                                                        <span className="text-[13px] sm:text-sm font-[1000] text-indigo-700">{data.maintenance || 0}</span>
                                                    </div>
                                                    <div className="bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-amber-50 flex flex-col items-center shadow-sm">
                                                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter mb-0.5">HK</span>
                                                        <span className="text-[13px] sm:text-sm font-[1000] text-amber-700">{data.housekeeping || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    };


    if (!isAuthorized) return null;

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-12">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse h-64">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(j => <div key={j} className="h-20 bg-gray-100 rounded-xl"></div>)}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    let divisions = Object.keys(divisionCounts).sort();

    if (designation?.toLowerCase() === "division hod" && division && username !== 'AAKASH AGRAWAL' && username !== 'Sheelesh Marele') {
        divisions = divisions.filter(d =>
            d.toLowerCase().includes(division.toLowerCase()) ||
            division.toLowerCase().includes(d.toLowerCase())
        );
    }

    if (divisions.length === 0) return null;

    const getPercent = (count, total) => {
        if (!total || total === 0) return "0.00%";
        return `${((count / total) * 100).toFixed(2)}%`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 mt-2">
            {divisions.map((division) => {
                const stats = divisionCounts[division];
                if (!stats) return null;

                const dashboardTotal = (stats.completed?.count || 0) +
                    (stats.pending?.count || 0) +
                    (stats.notDone?.count || 0) +
                    (stats.overdue?.count || 0);

                const pieData = [
                    { name: 'Done', value: stats.completed?.count || 0 },
                    { name: 'Pending', value: stats.pending?.count || 0 },
                    { name: 'Not Done', value: stats.notDone?.count || 0 },
                    { name: 'Overdue', value: stats.overdue?.count || 0 },
                ].filter(item => item.value > 0);

                if (dashboardTotal === 0 && (stats.future?.count || 0) === 0) return null;

                const calculateDivisionAvgScore = (divisionStats) => {
                    const totalTasks = divisionStats?.total?.count || 0;
                    const completedTasks = divisionStats?.completed?.count || 0;
                    if (totalTasks === 0) return 0;
                    return Math.max(
                        parseFloat(((completedTasks / totalTasks) * 100 - 100).toFixed(2)),
                        -100
                    );
                };

                const divisionScore = calculateDivisionAvgScore(stats);

                // Style score
                let scoreBgColor = "bg-red-500";
                let scoreBorderColor = "border-red-600";
                let scoreTextColor = "text-white";

                if (divisionScore >= -20) {
                    scoreBgColor = "bg-emerald-500";
                    scoreBorderColor = "border-emerald-600";
                } else if (divisionScore >= -50) {
                    scoreBgColor = "bg-amber-500";
                    scoreBorderColor = "border-amber-600";
                }

                return (
                    <motion.div
                        key={division}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 sm:p-5 rounded-[28px] sm:rounded-[36px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:shadow-[0_12px_40px_rgb(0,0,0,0.06)] relative overflow-hidden flex flex-col"
                    >
                        {/* Hero Header Area */}
                        <div className="flex items-center justify-between mb-4 sm:mb-5 border-b border-gray-50 pb-3 sm:pb-4">
                            <h3 className="text-base sm:text-lg font-[1000] text-gray-900 uppercase tracking-widest leading-none truncate max-w-[40%]">
                                {division}
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-lg border ${scoreBorderColor} ${scoreBgColor}`}>
                                    <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-tighter ${scoreTextColor}`}>Score: {divisionScore}%</span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-900 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-lg border border-gray-800">
                                    <ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />
                                    <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-tighter">Total: {dashboardTotal}</span>
                                </div>
                            </div>
                        </div>

                        {/* Side-by-Side Content */}
                        <div className="flex items-center justify-between gap-2 sm:gap-6 h-full">
                            {/* Left Side: Dynamic Interactive Graph */}
                            <div className="flex-1 flex justify-center items-center min-w-0">
                                <DivisionPieChart data={pieData} total={dashboardTotal} completed={stats.completed?.count || 0} />
                            </div>

                            {/* Right Side: High-Clarity Status Chips */}
                            <div className="w-[130px] sm:w-[190px] flex flex-col justify-center flex-shrink-0">
                                <StatItem
                                    label="Done"
                                    countData={stats.completed}
                                    value={stats.completed?.count || 0}
                                    icon={CheckCircle2}
                                    color="border-emerald-100"
                                    textColor="text-emerald-700"
                                    division={division}
                                    divisionStats={stats}
                                    onOpenBreakdown={openBreakdownModal}
                                />
                                <StatItem
                                    label="Pending"
                                    countData={stats.pending}
                                    value={stats.pending?.count || 0}
                                    icon={Clock}
                                    color="border-amber-100"
                                    textColor="text-amber-700"
                                    division={division}
                                    divisionStats={stats}
                                    onOpenBreakdown={openBreakdownModal}
                                />
                                <StatItem
                                    label="Not Done"
                                    countData={stats.notDone}
                                    value={stats.notDone?.count || 0}
                                    icon={XCircle}
                                    color="border-slate-100"
                                    textColor="text-slate-700"
                                    division={division}
                                    divisionStats={stats}
                                    onOpenBreakdown={openBreakdownModal}
                                />
                                <StatItem
                                    label="Overdue"
                                    countData={stats.overdue}
                                    value={stats.overdue?.count || 0}
                                    icon={AlertTriangle}
                                    color="border-red-100"
                                    textColor="text-red-700"
                                    division={division}
                                    divisionStats={stats}
                                    onOpenBreakdown={openBreakdownModal}
                                />
                                <div className="mt-1 pt-1.5 border-t border-gray-50">
                                    <StatItem
                                        label="Future"
                                        countData={stats.future}
                                        value={stats.future?.count || 0}
                                        icon={Calendar}
                                        color="border-indigo-100"
                                        textColor="text-indigo-700"
                                        division={division}
                                        divisionStats={stats}
                                        onOpenBreakdown={openBreakdownModal}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
            <BreakdownModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} modalData={modalData} />
        </div>
    );
});

export default DivisionWiseCards;
