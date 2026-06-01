import { startTransition, useEffect, useState, type ReactElement } from 'react';
import {
  fetchSummary,
  fetchLive,
  type DashboardSummaryResponse,
  type DashboardLiveResponse,
  type SummaryPeriodPayload,
} from '../../../api/iot/iotApi';
import {
  Activity,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { TextileMESDashboard } from '../components/TextileMESDashboard';
import { getUptimeDisplayMetrics } from '../uptime';

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

const formatPercent = (value: number | null | undefined) => {
  if (!isNumber(value)) {
    return '--';
  }

  return `${value.toFixed(1)}%`;
};

const formatSummaryWindow = (
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  fallbackLabel: string
) => {
  if (!startTime || !endTime) {
    return fallbackLabel;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return fallbackLabel;
  }

  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
    })} | ${start.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })} - ${end.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return `${start.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
  })} - ${end.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
  })}`;
};

const formatCurrentWeekLabel = (value: string | null | undefined) => {
  if (!value) {
    return 'Current Week';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Current Week';
  }

  const weekOfMonth = Math.ceil(parsed.getDate() / 7);
  return `Week ${weekOfMonth} | ${parsed.toLocaleDateString(undefined, {
    month: 'long',
  })}`;
};

const formatCurrentMonthLabel = (value: string | null | undefined, fallbackLabel: string) => {
  if (!value) {
    return fallbackLabel;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackLabel;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
};

const formatPeriodLabel = (period: SummaryPeriodPayload, fallbackLabel: string) => {
  if (period.rangeKey === 'week') {
    return formatCurrentWeekLabel(period.endTime);
  }

  if (period.rangeKey === 'month') {
    return formatCurrentMonthLabel(period.endTime, fallbackLabel);
  }

  return formatSummaryWindow(period.startTime, period.endTime, fallbackLabel);
};

const formatLastUpdated = (value: string | null | undefined) => {
  if (!value) {
    return 'Awaiting fresh summary';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Awaiting fresh summary';
  }

  return `Last sync ${parsed.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const isStaleSummary = (value: string | null | undefined, staleAfterMinutes = 90) => {
  if (!value) {
    return true;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  return Date.now() - parsed.getTime() > staleAfterMinutes * 60 * 1000;
};

const ProgressRing = ({
  scoreLabel,
  runningPct,
  stoppedPct,
}: {
  scoreLabel: string;
  runningPct: number;
  stoppedPct: number;
}) => {
  const circles: ReactElement[] = [];

  const RING_RADIUS = 46;
  const RING_STROKE = 14;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  // Background circle representing "Offline" or total timeline background (grey `#e2e8f0`)
  circles.push(
    <circle
      key="bg"
      cx="60"
      cy="60"
      r={RING_RADIUS}
      fill="transparent"
      stroke="#e2e8f0"
      strokeWidth={RING_STROKE}
    />
  );

  const runningLength = (runningPct / 100) * RING_CIRCUMFERENCE;
  const stoppedLength = (stoppedPct / 100) * RING_CIRCUMFERENCE;

  if (runningPct > 0) {
    circles.push(
      <circle
        key="running"
        cx="60"
        cy="60"
        r={RING_RADIUS}
        fill="transparent"
        stroke="#10b981"
        strokeWidth={RING_STROKE}
        strokeLinecap="butt"
        strokeDasharray={`${runningLength} ${RING_CIRCUMFERENCE}`}
        strokeDashoffset={0}
        className="transition-all duration-1000 ease-in-out"
      />
    );
  }

  if (stoppedPct > 0) {
    circles.push(
      <circle
        key="stopped"
        cx="60"
        cy="60"
        r={RING_RADIUS}
        fill="transparent"
        stroke="#f59e0b"
        strokeWidth={RING_STROKE}
        strokeLinecap="butt"
        strokeDasharray={`${stoppedLength} ${RING_CIRCUMFERENCE}`}
        strokeDashoffset={-runningLength}
        className="transition-all duration-1000 ease-in-out"
      />
    );
  }

  return (
    <div className="relative flex shrink-0 items-center justify-center w-[90px] h-[90px] sm:w-[130px] sm:h-[130px] lg:w-[90px] lg:h-[90px] xl:w-[110px] xl:h-[110px]">
      <svg
        viewBox="0 0 120 120"
        className="relative h-full w-full -rotate-90"
      >
        {circles}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[8px] sm:text-[10px] lg:text-[8px] xl:text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Score
        </span>
        <span className="text-[16px] sm:text-[22px] lg:text-[16px] xl:text-[18px] font-black text-slate-900 tracking-tight leading-none mt-0.5 sm:mt-1 lg:mt-0.5 xl:mt-1">
          {scoreLabel}
        </span>
      </div>
    </div>
  );
};

interface TextileSummaryCardProps {
  title: string;
  subtitle: string;
  period: SummaryPeriodPayload | null | undefined;
}

const TextileSummaryCard = ({ title, subtitle, period }: TextileSummaryCardProps) => {
  if (!period) {
    return (
      <article className="group relative overflow-hidden rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex h-[200px] items-center justify-center text-sm font-medium text-slate-400">
          No data available for this range
        </div>
      </article>
    );
  }

  const uptimeMetrics = getUptimeDisplayMetrics(period);
  const uptimeLabel = formatPercent(uptimeMetrics.scorePct);
  const totalDevices = (period.onlineDevices || 0) + (period.offlineDevices || 0);
  const rangeLabel = formatPeriodLabel(period, subtitle);
  const freshnessLabel = formatLastUpdated(period.lastSummaryTime);
  const isStale = isStaleSummary(period.lastSummaryTime);

  const metrics = [
    {
      key: 'energy',
      label: 'ENERGY',
      value: formatValue(period.totalEnergy, 'kWh'),
      dotClass: 'bg-[#10b981]',
    },
    {
      key: 'power',
      label: 'POWER',
      value: formatValue(period.power?.avg, 'kW'),
      dotClass: 'bg-[#f59e0b]',
    },
    {
      key: 'pf',
      label: 'PF AVG',
      value: formatValue(period.powerFactor?.avg, '', 2),
      dotClass: 'bg-[#94a3b8]',
    },
    {
      key: 'runtime',
      label: 'RUNTIME',
      value: formatDuration(period.runningTimeSeconds),
      dotClass: 'bg-[#ef4444]',
    },
  ];

  return (
    <article className="group relative overflow-hidden rounded-[24px] sm:rounded-[32px] lg:rounded-[24px] xl:rounded-[32px] border border-slate-100 bg-white p-4 sm:p-6 lg:p-4 xl:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-2 mb-4 sm:mb-6 lg:mb-4 xl:mb-5">
        <div className="min-w-0">
          <h2 className="text-[15px] sm:text-[20px] lg:text-[14px] xl:text-[18px] font-black uppercase tracking-[0.1em] text-slate-900 truncate">
            {title}
          </h2>
          <p className="mt-1 text-[9px] sm:text-[11px] lg:text-[8px] xl:text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 truncate">
            {rangeLabel}
          </p>
        </div>

        <div className="flex flex-row items-center gap-1.5 sm:gap-2 lg:gap-1.5 xl:gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-1 xl:gap-1.5 rounded-full bg-[#f59e0b] px-2 py-1 sm:px-3 sm:py-1.5 lg:px-2 lg:py-1 xl:px-3 xl:py-1.5 shadow-sm">
            <TrendingUp className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-2.5 lg:w-2.5 xl:h-3 xl:w-3 text-white" />
            <span className="text-[9px] sm:text-[11px] lg:text-[8px] xl:text-[10px] font-black text-white uppercase tracking-wide">
              SCORE: {uptimeLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-1 xl:gap-1.5 rounded-full bg-[#111827] px-2 py-1 sm:px-3 sm:py-1.5 lg:px-2 lg:py-1 xl:px-3 xl:py-1.5 shadow-sm">
            <BarChart3 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-2.5 lg:w-2.5 xl:h-3 xl:w-3 text-slate-300" />
            <span className="text-[9px] sm:text-[11px] lg:text-[8px] xl:text-[10px] font-black text-white uppercase tracking-wide">
              TOTAL: {totalDevices}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content (Chart + Pills) */}
      <div className="flex flex-row items-center justify-between gap-3 sm:gap-8 lg:gap-3 xl:gap-5 w-full">

        {/* Left: Donut Chart */}
        <div className="flex justify-center shrink-0">
          <ProgressRing
            scoreLabel={uptimeLabel}
            runningPct={uptimeMetrics.runningPct}
            stoppedPct={uptimeMetrics.stoppedPct}
          />
        </div>

        {/* Right: Metrics Pills */}
        <div className="flex flex-1 flex-col gap-2 sm:gap-3 lg:gap-2 xl:gap-2.5 min-w-0">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="flex items-center justify-between rounded-full bg-white border border-slate-100 px-2.5 py-1.5 sm:px-4 sm:py-2.5 lg:px-2 lg:py-1.5 xl:px-3 xl:py-2 shadow-[0_2px_10px_rgb(0,0,0,0.03)] transition-all hover:bg-slate-50 min-w-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-1.5 xl:gap-2 min-w-0">
                <div className={`h-2 w-2 sm:h-3 sm:w-3 lg:h-2 lg:w-2 xl:h-2.5 xl:w-2.5 rounded-full ${metric.dotClass} shrink-0`} />
                <span className="text-[9px] sm:text-[12px] lg:text-[9px] xl:text-[11px] font-black uppercase tracking-wider text-slate-700 truncate">
                  {metric.label}
                </span>
              </div>
              <span className="text-[10px] sm:text-[14px] lg:text-[10px] xl:text-[12px] font-black text-slate-900 shrink-0 ml-2">
                {metric.value}
              </span>
            </div>
          ))}
        </div>

      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-[9px] sm:text-[11px] lg:text-[8px] xl:text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 truncate">
          {freshnessLabel}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[8px] sm:text-[10px] lg:text-[8px] xl:text-[9px] font-black uppercase tracking-[0.16em] ${
            isStale ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {isStale ? 'STALE DATA' : 'LIVE WINDOW'}
        </span>
      </div>
    </article>
  );
};

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [live, setLive] = useState<DashboardLiveResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Textile MES hydrate effect
  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const [summaryResponse, liveResponse] = await Promise.all([
          fetchSummary(),
          fetchLive().catch((e) => {
            console.error('Failed to load live status', e);
            return null;
          }),
        ]);

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setSummary(summaryResponse);
          setLive(liveResponse);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Failed to load dashboard');
        setSummary(null);
        setLive(null);
      }
    };

    hydrate();
    const refreshInterval = window.setInterval(hydrate, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  return (
    <main className="min-h-screen text-slate-800 pb-12 bg-[#f8fafc]">
      <div className="relative z-10 mx-auto max-w-full px-4 sm:px-6 lg:px-8 mt-6">

        {/* Navigation & Header Panel */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-8 rounded-full bg-[#1e4b7a]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Main IoT Portal
              </span>
            </div>

          </div>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-6 sm:space-y-10">
          {!summary && errorMessage ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[32px] border border-rose-100 bg-white px-6 text-center shadow-sm">
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-rose-500">
                Dashboard Unavailable
              </p>
              <p className="max-w-xl text-sm font-medium text-slate-500">
                {errorMessage}
              </p>
            </div>
          ) : !summary ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-[32px] border border-slate-100 bg-white shadow-sm">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-100 border-t-[#1e4b7a]" />
                <Activity className="h-6 w-6 text-[#1e4b7a] animate-pulse" />
              </div>
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">
                Fetching Fleet Analytics...
              </p>
            </div>
          ) : (
            <>
              {/* Fleet-at-a-Glance Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
                <TextileSummaryCard
                  title="Current Day"
                  subtitle={summary.periods?.day?.label || "Today"}
                  period={summary.periods?.day}
                />
                <TextileSummaryCard
                  title="Weekly"
                  subtitle={summary.periods?.week?.label || 'Current Week'}
                  period={summary.periods?.week}
                />
                <TextileSummaryCard
                  title="Monthly"
                  subtitle={summary.periods?.month?.label || 'Current Month'}
                  period={summary.periods?.month}
                />
              </div>

              {/* Detailed Director Dashboard Component */}
              <div className="border-t border-slate-200/60 pt-6 sm:pt-10">
                <TextileMESDashboard
                  summary={summary}
                  live={live}
                  isLiveMode={live?.connection?.status === 'connected' || live?.connection?.status === 'ready'}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
