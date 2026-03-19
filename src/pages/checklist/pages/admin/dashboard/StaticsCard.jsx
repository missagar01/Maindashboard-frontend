import { ListTodo, CheckCircle2, Clock, AlertTriangle, BarChart3, XCircle, Calendar, X } from "lucide-react"
import { motion, AnimatePresence } from "../../../../../utils/framerMotionCompat"
import { PieChart, Pie, Cell, Tooltip } from "recharts"
import { useState, useEffect } from "react"
import { getDivisionWiseTaskCountsApi } from "@/api/checklist/dashboardApi.js"

const STAT_COLORS = {
  "Done": "#10b981",
  "Pending": "#f59e0b",
  "Not Done": "#94a3b8",
  "Overdue": "#dc2626",
  "Future": "#6366f1"
};

const renderEmptyTooltip = () => null;

export default function StatisticsCards({
  dashboardType,
  totalTask = 0,
  completeTask = 0,
  pendingTask = 0,
  overdueTask = 0,
  upcomingTasks = 0,
  notDoneTasks = 0,
  dateRange = null,
  username = "",
  userRole = "",
  designation = ""
}) {
  const [activeLabel, setActiveLabel] = useState(null);
  const [activePercent, setActivePercent] = useState(null);
  const [divisionData, setDivisionData] = useState({});
  const [selectedStat, setSelectedStat] = useState(null);

  // Permission check for detailed breakdown click (only Admin and AAKASH AGRAWAL)
  const canClickBreakdown =
    username === "AAKASH AGRAWAL" ||
    username === "admin" ||
    userRole?.toLowerCase() === "admin";

  useEffect(() => {
    const fetchDivisionData = async () => {
      try {
        const data = await getDivisionWiseTaskCountsApi(dateRange?.startDate || "", dateRange?.endDate || "");
        setDivisionData(data || {});
      } catch (error) {
        console.error("Error fetching division breakdown:", error);
      }
    };
    if (canClickBreakdown) {
      fetchDivisionData();
    }
  }, [dateRange, canClickBreakdown]);

  const getCount = (val) => {
    if (val && typeof val === 'object') return Number(val.count || 0);
    return typeof val === 'number' ? val : 0;
  };

  const tCount = getCount(totalTask);
  const cCount = getCount(completeTask);
  const pCount = getCount(pendingTask);
  const oCount = getCount(overdueTask);
  const uCount = getCount(upcomingTasks);
  const nCount = getCount(notDoneTasks);

  const getPercent = (count) => {
    if (tCount === 0) return "0.00%";
    return `${((count / tCount) * 100).toFixed(2)}%`;
  };

  const completionRate = tCount > 0 ? (cCount / tCount) * 100 : 0;

  const pieData = [
    { name: 'Done', value: cCount },
    { name: 'Pending', value: pCount },
    { name: 'Not Done', value: nCount },
    { name: 'Overdue', value: oCount }
  ].filter(item => item.value > 0);

  const onPieEnter = (_, index) => {
    const item = pieData[index];
    if (item) {
      setActiveLabel(item.name);
      setActivePercent(((item.value / tCount) * 100).toFixed(2));
    }
  };

  const onPieLeave = () => {
    setActiveLabel(null);
    setActivePercent(null);
  };

  const renderBreakdown = (data) => {
    if (!data || typeof data !== 'object' || !data.breakdown) return null;
    const { checklist = 0, housekeeping = 0, maintenance = 0 } = data.breakdown;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">CHK: {checklist}</span>
        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">HK: {housekeeping}</span>
        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tighter">MNT: {maintenance}</span>
      </div>
    );
  };

  const StatCard = ({ title, icon: Icon, color, textColor, count, data }) => (
    <div
      onClick={() => canClickBreakdown && setSelectedStat({ title, icon: Icon, color, textColor, count, data })}
      className={`bg-white p-3 sm:p-5 rounded-xl sm:rounded-3xl border border-gray-100 shadow-sm transition-all border-l-4 ${color} h-full ${canClickBreakdown ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between mb-1 sm:mb-3">
        <h3 className="text-[9px] sm:text-[12px] font-black text-gray-400 uppercase tracking-[0.1em]">{title}</h3>
        <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-gray-300" />
      </div>
      <div className={`text-xl sm:text-3.5xl font-[1000] ${textColor} leading-none mb-0.5 sm:mb-1`}>{count}</div>
      {renderBreakdown(data)}
    </div>
  );


  const BreakdownModal = () => {
    if (!selectedStat) return null;
    const { title, color, textColor, icon: Icon } = selectedStat;

    // Convert title to key used in divisionData
    const statKey = title.toLowerCase() === 'total' ? 'total'
      : title.toLowerCase() === 'done' ? 'completed'
        : title.toLowerCase() === 'pending' ? 'pending'
          : title.toLowerCase() === 'overdue' ? 'overdue'
            : title.toLowerCase() === 'future' ? 'future'
              : title.toLowerCase() === 'not done' ? 'notDone'
                : 'total';

    // Flatten all departments across ALL divisions
    const allDepartments = {};
    Object.entries(divisionData).forEach(([divName, stats]) => {
      const statObj = stats[statKey];
      if (!statObj?.departments) return;

      Object.entries(statObj.departments).forEach(([dept, deptData]) => {
        if (!allDepartments[dept]) {
          allDepartments[dept] = { total: 0, checklist: 0, maintenance: 0, housekeeping: 0, division: divName, deptTotalTasks: 0, deptCompletedTasks: 0 };
        }
        allDepartments[dept].total += (deptData.total || 0);
        allDepartments[dept].checklist += (deptData.checklist || 0);
        allDepartments[dept].maintenance += (deptData.maintenance || 0);
        allDepartments[dept].housekeeping += (deptData.housekeeping || 0);
      });

      // Get total tasks and completed tasks for score calculation (same formula as staffTasksController)
      if (stats.total?.departments) {
        Object.entries(stats.total.departments).forEach(([dept, deptData]) => {
          if (allDepartments[dept]) {
            allDepartments[dept].deptTotalTasks += (deptData.total || 0);
          }
        });
      }
      if (stats.completed?.departments) {
        Object.entries(stats.completed.departments).forEach(([dept, deptData]) => {
          if (allDepartments[dept]) {
            allDepartments[dept].deptCompletedTasks += (deptData.total || 0);
          }
        });
      }
    });

    const sortedDepts = Object.entries(allDepartments)
      .sort((a, b) => (b[1].total || 0) - (a[1].total || 0));

    const totalValue = sortedDepts.reduce((acc, [, d]) => acc + d.total, 0);

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-[4px]"
          onClick={() => setSelectedStat(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-md rounded-2xl sm:rounded-[28px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-xl bg-gray-50">
                  <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-gray-700" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">ALL DEPARTMENTS</h2>
                  <h3 className="text-sm sm:text-base font-[1000] text-gray-900 uppercase tracking-tight">{title}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-sm sm:text-base font-black text-gray-800 bg-gray-100 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl shadow-inner">
                  {totalValue}
                </div>
                <button
                  onClick={() => setSelectedStat(null)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X className="h-6 w-6 sm:h-7 sm:w-7" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1 pb-6 sm:pb-8">
              {sortedDepts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-bold">No data found</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {sortedDepts.map(([dept, data], idx) => {
                    // Score formula: (completed / total * 100) - 100, same as staffTasksController
                    const deptTotal = data.deptTotalTasks || 0;
                    const deptCompleted = data.deptCompletedTasks || 0;
                    const completionScore = deptTotal > 0
                      ? Math.max(Math.round((deptCompleted / deptTotal) * 100 - 100), -100)
                      : 0;

                    // Style score same as division cards
                    let scoreBgColor = "bg-red-500";
                    let scoreBorderColor = "border-red-600";
                    if (completionScore >= -20) {
                      scoreBgColor = "bg-emerald-500";
                      scoreBorderColor = "border-emerald-600";
                    } else if (completionScore >= -50) {
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
                                {completionScore}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-xl shadow-inner bg-slate-100 border border-slate-200">
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase leading-none tracking-tight">Total</span>
                              <span className="text-[10px] sm:text-xs font-black text-slate-700 leading-none">
                                {deptTotal}
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full items-stretch animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="w-full lg:w-1/2">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-3 h-full">
          <StatCard title="Total" count={tCount} icon={ListTodo} color="border-l-blue-500" textColor="text-blue-600" data={totalTask} />
          <StatCard title="Done" count={cCount} icon={CheckCircle2} color="border-l-emerald-500" textColor="text-emerald-600" data={completeTask} />
          <StatCard title="Pending" count={pCount} icon={Clock} color="border-l-amber-500" textColor="text-amber-600" data={pendingTask} />
          <StatCard title="Future" count={uCount} icon={Calendar} color="border-l-indigo-500" textColor="text-indigo-600" data={upcomingTasks} />
          <StatCard title="Not Done" count={nCount} icon={XCircle} color="border-l-slate-400" textColor="text-slate-600" data={notDoneTasks} />
          <StatCard title="Overdue" count={oCount} icon={AlertTriangle} color="border-l-red-600" textColor="text-red-700" data={overdueTask} />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-1/2 bg-white p-4 sm:p-6 lg:p-6 rounded-[32px] sm:rounded-[48px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] lg:shadow-[0_12px_45px_rgb(0,0,0,0.05)] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-4 sm:mb-8 lg:mb-4">
          <h2 className="text-base sm:text-xl font-[1000] text-gray-900 uppercase tracking-[0.2em] leading-none">
            ALL
          </h2>
          <div className="flex items-center gap-2">
            {(() => {
              const allScore = tCount > 0 ? Math.max(parseFloat(((cCount / tCount) * 100 - 100).toFixed(2)), -100) : 0;
              let sBg = "bg-red-500";
              let sBorder = "border-red-600";
              if (allScore >= -20) { sBg = "bg-emerald-500"; sBorder = "border-emerald-600"; }
              else if (allScore >= -50) { sBg = "bg-amber-500"; sBorder = "border-amber-600"; }
              return (
                <div className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-lg border ${sBorder} ${sBg}`}>
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  <span className="text-[9px] sm:text-[13px] font-black text-white uppercase tracking-tighter">
                    Score: {allScore}%
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-lg border border-slate-800 shrink-0">
              <BarChart3 className="h-3 w-3 sm:h-4.5 sm:w-4.5 text-red-400" />
              <span className="text-[9px] sm:text-[13px] font-black text-white uppercase tracking-tighter">
                Total: {tCount}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-3 sm:gap-12 lg:gap-6 flex-1">
          <div className="relative flex h-[176px] w-[176px] flex-shrink-0 items-center justify-center sm:h-[192px] sm:w-[192px]">
            <div className="flex h-[176px] w-[176px] items-center justify-center">
              <PieChart width={176} height={176}>
                <Pie
                  data={pieData}
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
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STAT_COLORS[entry.name]}
                      onClick={() => {
                        if (!canClickBreakdown) return;
                        const iconMap = {
                          "Done": CheckCircle2,
                          "Pending": Clock,
                          "Not Done": XCircle,
                          "Overdue": AlertTriangle
                        };
                        const colorMap = {
                          "Done": "border-l-emerald-500",
                          "Pending": "border-l-amber-500",
                          "Not Done": "border-l-slate-400",
                          "Overdue": "border-l-red-600"
                        };
                        const textMap = {
                          "Done": "text-emerald-600",
                          "Pending": "text-amber-600",
                          "Not Done": "text-slate-600",
                          "Overdue": "text-red-700"
                        };
                        setSelectedStat({
                          title: entry.name,
                          icon: iconMap[entry.name],
                          color: colorMap[entry.name],
                          textColor: textMap[entry.name]
                        });
                      }}
                      className={`outline-none transition-all duration-300 ${canClickBreakdown ? 'cursor-pointer hover:saturate-150' : 'cursor-default'}`}
                    />
                  ))}
                </Pie>
                <Tooltip content={renderEmptyTooltip} cursor={false} />
              </PieChart>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <AnimatePresence mode="wait">
                {activeLabel ? (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center text-center px-4"
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
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-0.5 underline underline-offset-4 decoration-emerald-500/50">
                      DONE
                    </span>
                    <span className="text-xl font-black text-gray-800 leading-none">
                      {completionRate.toFixed(2)}%
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="w-[130px] sm:w-[200px] lg:w-[210px] flex flex-col justify-center space-y-1.5 lg:space-y-1.5">
            <LegendItem
              label="Done"
              value={getPercent(cCount)}
              color={STAT_COLORS["Done"]}
              canClick={canClickBreakdown}
              onClick={() => setSelectedStat({ title: "Done", icon: CheckCircle2, color: "border-l-emerald-500", textColor: "text-emerald-600" })}
            />
            <LegendItem
              label="Pending"
              value={getPercent(pCount)}
              color={STAT_COLORS["Pending"]}
              canClick={canClickBreakdown}
              onClick={() => setSelectedStat({ title: "Pending", icon: Clock, color: "border-l-amber-500", textColor: "text-amber-600" })}
            />
            <LegendItem
              label="Not Done"
              value={getPercent(nCount)}
              color={STAT_COLORS["Not Done"]}
              canClick={canClickBreakdown}
              onClick={() => setSelectedStat({ title: "Not Done", icon: XCircle, color: "border-l-slate-400", textColor: "text-slate-600" })}
            />
            <LegendItem
              label="Overdue"
              value={getPercent(oCount)}
              color={STAT_COLORS["Overdue"]}
              canClick={canClickBreakdown}
              onClick={() => setSelectedStat({ title: "Overdue", icon: AlertTriangle, color: "border-l-red-600", textColor: "text-red-700" })}
            />
          </div>
        </div>
      </motion.div>
      <BreakdownModal />
    </div>
  )
}

const LegendItem = ({ label, value, color, onClick, canClick }) => (
  <div
    onClick={() => canClick && onClick()}
    className={`flex items-center justify-between rounded-full bg-white border border-gray-100 shadow-sm transition-all py-1 px-2 sm:py-1.5 sm:px-3 ${canClick ? 'hover:shadow cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'}`}
  >
    <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden">
      <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[9px] sm:text-[11px] font-black text-gray-600 uppercase tracking-tight whitespace-nowrap">{label}</span>
    </div>
    <div className="text-[10px] sm:text-[13px] font-black text-gray-900 ml-2 sm:ml-3 bg-gray-50 px-2 sm:px-3 py-0.5 rounded-full border border-gray-100 min-w-[35px] sm:min-w-[60px] text-center tabular-nums">
      {value}
    </div>
  </div>
);
