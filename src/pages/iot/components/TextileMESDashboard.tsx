import { useMemo, useState } from 'react';
import type {
  DashboardLiveResponse,
  DashboardSummaryResponse,
  SummaryPeriodPayload,
  SummaryRange,
} from '../../../api/iot/iotApi';

interface TextileMESDashboardProps {
  summary: DashboardSummaryResponse | null;
  live?: DashboardLiveResponse | null;
  isLiveMode?: boolean;
}

const isNumber = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);

const formatValue = (value: number | null | undefined, unit = '', digits = 2) => {
  if (!isNumber(value)) {
    return '--';
  }

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  return unit ? `${formatted} ${unit}` : formatted;
};

const formatDuration = (totalSeconds: number | null | undefined) => {
  if (!isNumber(totalSeconds) || totalSeconds <= 0) {
    return '00h 00m';
  }

  const safeSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRange = (period: SummaryPeriodPayload | null) => {
  if (!period?.startTime || !period.endTime) {
    return '--';
  }

  const start = new Date(period.startTime);
  const end = new Date(period.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '--';
  }

  return `${start.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} - ${end.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const formatPercent = (value: number | null | undefined) => {
  if (!isNumber(value)) {
    return '--';
  }

  return `${value.toFixed(1)}%`;
};

const getConnectionTone = (status: string | undefined) => {
  if (status === 'connected' || status === 'ready') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'connecting') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
};

const getStatusTone = (status: string) => {
  if (status === 'Running' || status === 'Excellent' || status === 'Online') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'Standby' || status === 'Optimal') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  }

  return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
};

const buildMetricCardClass = (variant: 'energy' | 'power' | 'pf' | 'runtime') => {
  if (variant === 'energy') {
    return 'from-[#14305c] via-[#1f5ea8] to-[#0c1a30]';
  }

  if (variant === 'power') {
    return 'from-[#2d1c5b] via-[#5b2bf5] to-[#1f113c]';
  }

  if (variant === 'pf') {
    return 'from-[#0f3d38] via-[#0d7b68] to-[#07201d]';
  }

  return 'from-[#4b260c] via-[#d95b06] to-[#3b1608]';
};

export function TextileMESDashboard({ summary, live, isLiveMode = false }: TextileMESDashboardProps) {
  const [summaryTab, setSummaryTab] = useState<SummaryRange>('day');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const selectedPeriod = summary?.periods[summaryTab] ?? null;
  const comparisonPeriods = summary?.periods ?? null;
  const connectionStatus = live?.connection?.status ?? (isLiveMode ? 'connected' : 'history');
  const chartRows = selectedPeriod?.trend ?? [];

  const handleTabChange = (tab: SummaryRange) => {
    setSummaryTab(tab);
    setSelectedPointIndex(null);
  };

  const activeIndex = hoveredPointIndex !== null 
    ? hoveredPointIndex 
    : (selectedPointIndex !== null ? selectedPointIndex : chartRows.length - 1);
  const activePoint = chartRows[activeIndex] ?? null;

  const chartGeometry = useMemo(() => {
    if (chartRows.length === 0) {
      return null;
    }

    const width = 560;
    const height = 220;
    const paddingLeft = 44;
    const paddingRight = 24;
    const paddingTop = 20;
    const paddingBottom = 32;
    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;
    const maxEnergy = Math.max(...chartRows.map((row) => row.totalEnergy ?? 0), 1);
    const maxPower = Math.max(...chartRows.map((row) => row.averagePower ?? 0), 1);
    const step = chartRows.length > 1 ? innerWidth / (chartRows.length - 1) : innerWidth;
    const barWidth = Math.min(42, innerWidth / Math.max(chartRows.length, 1) - 12);

    const bars = chartRows.map((row, index) => {
      const x = paddingLeft + index * step - barWidth / 2;
      const energy = row.totalEnergy ?? 0;
      const barHeight = (energy / maxEnergy) * innerHeight;
      return {
        x,
        y: paddingTop + innerHeight - barHeight,
        width: barWidth,
        height: barHeight,
        labelX: paddingLeft + index * step,
      };
    });

    const powerPoints = chartRows.map((row, index) => {
      const x = paddingLeft + index * step;
      const power = row.averagePower ?? 0;
      const y = paddingTop + innerHeight - (power / maxPower) * innerHeight;
      return { x, y };
    });

    const powerLine = `M ${powerPoints.map((point) => `${point.x},${point.y}`).join(' L ')}`;
    const powerArea = `M ${paddingLeft},${paddingTop + innerHeight} L ${powerPoints
      .map((point) => `${point.x},${point.y}`)
      .join(' L ')} L ${paddingLeft + innerWidth},${paddingTop + innerHeight} Z`;

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      innerHeight,
      maxEnergy,
      maxPower,
      bars,
      powerPoints,
      powerLine,
      powerArea,
    };
  }, [chartRows]);

  const headlineCards = useMemo(
    () => [
      {
        label: 'Total Energy Consumption',
        value: formatValue(selectedPeriod?.totalEnergy, 'kWh'),
        meta: selectedPeriod?.label ?? 'Selected Interval',
        variant: 'energy' as const,
      },
      {
        label: 'Average Power',
        value: formatValue(selectedPeriod?.power.avg, 'kW'),
        meta: `Min ${formatValue(selectedPeriod?.power.min, 'kW')}  |  Max ${formatValue(selectedPeriod?.power.max, 'kW')}`,
        variant: 'power' as const,
      },
      {
        label: 'Power Factor Average',
        value: formatValue(selectedPeriod?.powerFactor.avg, '', 2),
        meta: `Min ${formatValue(selectedPeriod?.powerFactor.min, '', 2)}  |  Max ${formatValue(selectedPeriod?.powerFactor.max, '', 2)}`,
        variant: 'pf' as const,
      },
      {
        label: 'Total Running Time',
        value: formatDuration(selectedPeriod?.runningTimeSeconds),
        meta: `Stopped ${formatDuration(selectedPeriod?.stoppedTimeSeconds)}`,
        variant: 'runtime' as const,
      },
    ],
    [selectedPeriod]
  );

  const metricPanels = useMemo(
    () => [
      {
        title: 'Voltage Profile',
        accent: 'from-cyan-500/20 to-blue-500/10',
        values: [
          { label: 'Average Voltage', value: formatValue(selectedPeriod?.voltage.avg, 'V', 1) },
          { label: 'Minimum Voltage', value: formatValue(selectedPeriod?.voltage.min, 'V', 1) },
          { label: 'Maximum Voltage', value: formatValue(selectedPeriod?.voltage.max, 'V', 1) },
        ],
      },
      {
        title: 'Current Profile',
        accent: 'from-emerald-500/20 to-teal-500/10',
        values: [
          { label: 'Average Current', value: formatValue(selectedPeriod?.current.avg, 'A', 2) },
          { label: 'Minimum Current', value: formatValue(selectedPeriod?.current.min, 'A', 2) },
          { label: 'Maximum Current', value: formatValue(selectedPeriod?.current.max, 'A', 2) },
        ],
      },
      {
        title: 'Frequency & Stability',
        accent: 'from-violet-500/20 to-fuchsia-500/10',
        values: [
          { label: 'Frequency Average', value: formatValue(selectedPeriod?.frequency.avg, 'Hz', 2) },
          { label: 'Minimum Frequency', value: formatValue(selectedPeriod?.frequency.min, 'Hz', 2) },
          { label: 'Maximum Frequency', value: formatValue(selectedPeriod?.frequency.max, 'Hz', 2) },
        ],
      },
      {
        title: 'Operations Summary',
        accent: 'from-amber-500/20 to-orange-500/10',
        values: [
          { label: 'Total Alerts', value: String(selectedPeriod?.totalAlerts ?? 0) },
          {
            label: 'Device Online / Offline',
            value: `${selectedPeriod?.onlineDevices ?? 0} / ${selectedPeriod?.offlineDevices ?? 0}`,
          },
          { label: 'Uptime', value: formatPercent(selectedPeriod?.uptimePct) },
        ],
      },
    ],
    [selectedPeriod]
  );

  if (!selectedPeriod) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
          <p className="text-lg font-bold text-slate-700">Summary data is not available yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            The dashboard will populate automatically after PostgreSQL receives the first 30-minute summary row.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_52%,#020617_100%)] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/80">Director Summary Dashboard</span>
             
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={summaryTab}
                onChange={(event) => handleTabChange(event.target.value as SummaryRange)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white outline-none transition hover:border-cyan-400"
              >
                <option value="day" className="bg-slate-950 text-white">
                  Current Day
                </option>
                <option value="week" className="bg-slate-950 text-white">
                  Current Week
                </option>
                <option value="month" className="bg-slate-950 text-white">
                  Current Month
                </option>
              </select>

              <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider ${getConnectionTone(connectionStatus)}`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {connectionStatus}
              </span>

              {selectedPeriod?.lastSummaryTime && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Last Summary:</span>
                  <span className="font-mono">{formatDateTime(selectedPeriod.lastSummaryTime)}</span>
                </span>
              )}

              {selectedPeriod?.nextSummaryTime && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Next Expected:</span>
                  <span className="font-mono">{formatDateTime(selectedPeriod.nextSummaryTime)}</span>
                </span>
              )}

            </div>
          </div>

         
        </div>

      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {headlineCards.map((card) => (
          <article
            key={card.label}
            className={`overflow-hidden rounded-[24px] sm:rounded-[28px] border border-white/5 bg-gradient-to-br ${buildMetricCardClass(card.variant)} p-4 sm:p-5 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]`}
          >
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.16em] sm:tracking-[0.24em] text-white/65">{card.label}</p>
            <p className="mt-2 sm:mt-4 text-xl sm:text-2xl md:text-3xl font-black tracking-tight">{card.value}</p>
            <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs font-semibold text-white/75">{card.meta}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f5f7fb_45%,#eef2ff_100%)] p-5 shadow-sm xl:col-span-12">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">Trend Overview</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                {summaryTab === 'day' ? '30-Minute Business Trend' : summaryTab === 'week' ? 'Daily Trend Summary' : 'Weekly Trend Summary'}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Interval Energy
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-violet-700">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Average Power
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left side: Profile panels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:col-span-5">
              {metricPanels.map((panel) => (
                <div key={panel.title} className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${panel.accent} p-4 shadow-sm`}>
                  <h3 className="text-sm font-black text-slate-900">{panel.title}</h3>
                  <div className="mt-3 space-y-2">
                    {panel.values.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</span>
                        <span className="text-xs sm:text-sm font-black text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Right side: SVG Chart on white background */}
            <div className="lg:col-span-7 relative flex flex-col justify-between rounded-[26px] border border-slate-100 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] min-h-[340px]" onMouseLeave={() => setHoveredPointIndex(null)}>
              {chartGeometry ? (
                <div className="flex flex-col h-full justify-between">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                    <span>Energy Consumption (kWh)</span>
                    <span>Average Power (kW)</span>
                  </div>
                  <svg className="h-[280px] w-full" viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}>
                    <defs>
                      <linearGradient id="director-energy-bar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
                      </linearGradient>
                      <linearGradient id="director-power-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {[0, 1, 2, 3, 4].map((step) => {
                      const y =
                        chartGeometry.paddingTop +
                        step * (chartGeometry.innerHeight / 4);

                      return (
                        <line
                          key={step}
                          x1={chartGeometry.paddingLeft}
                          y1={y}
                          x2={chartGeometry.width - chartGeometry.paddingRight}
                          y2={y}
                          stroke="rgba(100,116,139,0.08)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    <path d={chartGeometry.powerArea} fill="url(#director-power-area)" />

                    {chartGeometry.bars.map((bar, index) => (
                      <g key={chartRows[index]?.label ?? index}>
                        <rect
                          x={bar.x}
                          y={bar.y}
                          width={bar.width}
                          height={Math.max(bar.height, 4)}
                          rx="10"
                          fill="url(#director-energy-bar)"
                        />
                      </g>
                    ))}

                    <path d={chartGeometry.powerLine} fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />

                    {chartGeometry.powerPoints.map((point, index) => (
                      <g key={`power-${chartRows[index]?.label ?? index}`}>
                        <circle cx={point.x} cy={point.y} r="4" fill="#a855f7" />
                        <circle cx={point.x} cy={point.y} r="8" fill="#a855f7" opacity="0.2" />
                      </g>
                    ))}

                    {/* Vertical guideline & highlight circles on hover */}
                    {hoveredPointIndex !== null && chartGeometry.bars[hoveredPointIndex] && (
                      <>
                        <line
                          x1={chartGeometry.bars[hoveredPointIndex].labelX}
                          y1={chartGeometry.paddingTop}
                          x2={chartGeometry.bars[hoveredPointIndex].labelX}
                          y2={chartGeometry.paddingTop + chartGeometry.innerHeight}
                          stroke="#6366f1"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                          opacity="0.6"
                          pointerEvents="none"
                        />
                        <circle
                          cx={chartGeometry.bars[hoveredPointIndex].labelX}
                          cy={chartGeometry.powerPoints[hoveredPointIndex]?.y ?? 0}
                          r="6"
                          fill="#a855f7"
                          stroke="#ffffff"
                          strokeWidth="2"
                          pointerEvents="none"
                        />
                      </>
                    )}

                    {chartRows.map((row, index) => {
                      if (summaryTab === 'day') {
                        const parts = row.label.split(':');
                        if (parts.length >= 2) {
                          const hour = parseInt(parts[0], 10);
                          const minutes = parts[1].substring(0, 2);
                          const isEvenHour = hour % 2 === 0;
                          const isExactHour = minutes === '00';
                          if (!isEvenHour || !isExactHour) {
                            return null;
                          }
                        }
                      } else {
                        // Calculate dynamic interval to prevent label overlapping on mobile/desktop
                        const labelInterval = Math.max(1, Math.ceil(chartRows.length / 8));
                        const isLast = index === chartRows.length - 1;
                        const isWithinInterval = index % labelInterval === 0;
                        
                        // Prevent collision with the last label by skipping if it is too close
                        const isTooCloseToLast = (chartRows.length - 1 - index) < (labelInterval * 0.7);

                        if (!isLast && (!isWithinInterval || isTooCloseToLast)) {
                          return null;
                        }
                      }
                      const x = chartGeometry.bars[index]?.labelX ?? 0;

                      return (
                        <text
                          key={row.label}
                          x={x}
                          y={chartGeometry.height - 8}
                          fill="rgba(71,85,105,0.75)"
                          fontSize="9"
                          textAnchor="middle"
                          className="font-mono font-semibold"
                        >
                          {row.label}
                        </text>
                      );
                    })}

                    <text
                      x={chartGeometry.paddingLeft - 10}
                      y={chartGeometry.paddingTop + 8}
                      fill="rgba(71,85,105,0.8)"
                      fontSize="9"
                      textAnchor="end"
                      className="font-mono font-bold"
                    >
                      {formatValue(chartGeometry.maxEnergy, '', 1)}
                    </text>
                    <text
                      x={chartGeometry.width - chartGeometry.paddingRight + 8}
                      y={chartGeometry.paddingTop + 8}
                      fill="rgba(71,85,105,0.8)"
                      fontSize="9"
                      textAnchor="start"
                      className="font-mono"
                    >
                      {formatValue(chartGeometry.maxPower, '', 1)}
                    </text>

                    {/* Transparent overlay column columns to capture mouse/touch events */}
                    {chartGeometry.bars.map((bar, index) => {
                      const step = chartRows.length > 1
                        ? (chartGeometry.width - chartGeometry.paddingLeft - chartGeometry.paddingRight) / (chartRows.length - 1)
                        : (chartGeometry.width - chartGeometry.paddingLeft - chartGeometry.paddingRight);
                      const colWidth = step;
                      const x = bar.labelX - colWidth / 2;

                      return (
                        <rect
                          key={`hover-trigger-${index}`}
                          x={x}
                          y={chartGeometry.paddingTop}
                          width={colWidth}
                          height={chartGeometry.innerHeight}
                          fill="transparent"
                          className="cursor-pointer"
                          style={{ pointerEvents: 'all' }}
                          onMouseEnter={() => setHoveredPointIndex(index)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                          onTouchStart={() => setHoveredPointIndex(index)}
                          onClick={() => setSelectedPointIndex(index)}
                        />
                      );
                    })}
                  </svg>

                  {/* Floating Interactive Tooltip */}
                  {hoveredPointIndex !== null && chartRows[hoveredPointIndex] && (
                    <div
                      className="absolute z-30 pointer-events-none rounded-[16px] border border-slate-200 bg-white/95 p-3 text-xs shadow-xl transition-all duration-150 backdrop-blur-sm"
                      style={{
                        left: `${(chartGeometry.bars[hoveredPointIndex].labelX / chartGeometry.width) * 100}%`,
                        top: '40px',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div className="font-mono font-bold text-[11px] text-slate-800 border-b border-slate-100 pb-1">
                        Interval: {chartRows[hoveredPointIndex].label}
                      </div>
                      <div className="mt-2 space-y-1 font-sans">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500 font-medium">Interval Energy:</span>
                          <span className="font-bold text-cyan-600">
                            {formatValue(chartRows[hoveredPointIndex].totalEnergy, 'kWh')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500 font-medium">Average Power:</span>
                          <span className="font-bold text-violet-600">
                            {formatValue(chartRows[hoveredPointIndex].averagePower, 'kW')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed point panel below chart */}
                  {activePoint && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Selected Interval Details: <span className="text-blue-600 font-mono">{activePoint.label}</span>
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          activePoint.status !== 'Standby' && activePoint.status !== 'Down'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {activePoint.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Energy</p>
                          <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">{formatValue(activePoint.totalEnergy, 'kWh')}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Avg Power</p>
                          <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">{formatValue(activePoint.averagePower, 'kW')}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Voltage</p>
                          <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">{formatValue(activePoint.averageVoltage, 'V', 1)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Current</p>
                          <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">{formatValue(activePoint.averageCurrent, 'A', 2)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100 col-span-2 sm:col-span-1">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Power Factor</p>
                          <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">{formatValue(activePoint.averagePf, '', 2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[280px] items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-400">
                  No trend points available for the selected range.
                </div>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <article className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm xl:col-span-7">
          <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-600">Device Summary</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">Device-Wise Performance</h2>
              <p className="mt-2 text-sm text-slate-500">Each card is computed from PostgreSQL summary rows only.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-600">
              {selectedPeriod.devices.length} devices
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {selectedPeriod.devices.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500 md:col-span-2">
                No device summaries are available in this interval.
              </div>
            ) : (
              selectedPeriod.devices.map((device) => (
                <div key={device.name} className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_40%,#ecfeff_100%)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">{device.name}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">Last seen {formatDateTime(device.lastSeenAt)}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusTone(device.status)}`}>
                      {device.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-950 px-3 py-3 text-white">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Energy</p>
                      <p className="mt-1 text-lg font-black">{formatValue(device.totalEnergy, 'kWh')}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950 px-3 py-3 text-white">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average Power</p>
                      <p className="mt-1 text-lg font-black">{formatValue(device.averagePower, 'kW')}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Average Voltage</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{formatValue(device.averageVoltage, 'V', 1)}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Average Current</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{formatValue(device.averageCurrent, 'A', 2)}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Power Factor</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{formatValue(device.powerFactor, '', 2)}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Running Time</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{formatDuration(device.runningTimeSeconds)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_38%,#fef2f2_100%)] p-5 shadow-sm xl:col-span-5">
          <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-600">Alert Summary</p>
            
            </div>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-rose-700">
              {selectedPeriod.totalAlerts} total
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {selectedPeriod.alertItems.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500">
                No alert thresholds were breached in this range.
              </div>
            ) : (
              selectedPeriod.alertItems.map((alert) => (
                <div
                  key={`${alert.type}-${alert.machine}-${alert.time}`}
                  className={`rounded-[24px] border p-4 ${
                    alert.severity === 'Critical'
                      ? 'border-rose-200 bg-white shadow-[0_14px_30px_rgba(244,63,94,0.08)]'
                      : 'border-amber-200 bg-white shadow-[0_14px_30px_rgba(245,158,11,0.08)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                          alert.severity === 'Critical'
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{alert.type}</span>
                      </div>
                      <p className="mt-3 text-base font-black text-slate-900">{alert.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{alert.machine}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{alert.value}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
