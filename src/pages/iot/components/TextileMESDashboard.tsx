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
    return 'border-emerald-500/20 bg-emerald-50 text-emerald-700';
  }

  if (status === 'connecting') {
    return 'border-amber-500/20 bg-amber-50 text-amber-700';
  }

  return 'border-rose-500/20 bg-rose-50 text-rose-700';
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
    return {
      bg: 'from-sky-50 via-sky-50/50 to-white border-sky-200/60',
      label: 'text-sky-600/90',
      value: 'text-sky-900',
      meta: 'text-sky-700/80',
    };
  }

  if (variant === 'power') {
    return {
      bg: 'from-indigo-50 via-indigo-50/50 to-white border-indigo-200/60',
      label: 'text-indigo-600/90',
      value: 'text-indigo-900',
      meta: 'text-indigo-700/80',
    };
  }

  if (variant === 'pf') {
    return {
      bg: 'from-emerald-50 via-emerald-50/50 to-white border-emerald-200/60',
      label: 'text-emerald-600/90',
      value: 'text-emerald-900',
      meta: 'text-emerald-700/80',
    };
  }

  return {
    bg: 'from-amber-50 via-amber-50/50 to-white border-amber-200/60',
    label: 'text-amber-600/90',
    value: 'text-amber-900',
    meta: 'text-amber-700/80',
  };
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
      <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="rounded-lg sm:rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 sm:px-6 sm:py-14 text-center">
          <p className="text-base sm:text-lg font-bold text-slate-700">Summary data is not available yet.</p>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            The dashboard will populate automatically after PostgreSQL receives the first 10-minute summary row.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
    

    </div>
  );
}
