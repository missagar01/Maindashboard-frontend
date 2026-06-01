import type { SummaryPeriodPayload, SummaryRange } from '../../api/iot/iotApi';

const DAY_SECONDS = 24 * 60 * 60;

const RANGE_DURATION_SECONDS: Record<SummaryRange, number> = {
  day: DAY_SECONDS,
  week: DAY_SECONDS * 7,
  month: DAY_SECONDS * 30,
};

const isNumber = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);

const clampPercent = (value: number) => Math.max(0, Math.min(value, 100));

const getNormalizedDeviceCount = (period: SummaryPeriodPayload) => {
  const fallbackDeviceCount = (period.onlineDevices || 0) + (period.offlineDevices || 0);
  return Math.max(period.deviceCount || fallbackDeviceCount || 1, 1);
};

export interface UptimeDisplayMetrics {
  scorePct: number;
  runningPct: number;
  stoppedPct: number;
}

export const getUptimeDisplayMetrics = (
  period: SummaryPeriodPayload | null | undefined
): UptimeDisplayMetrics => {
  if (!period) {
    return {
      scorePct: 0,
      runningPct: 0,
      stoppedPct: 0,
    };
  }

  const durationSeconds = RANGE_DURATION_SECONDS[period.rangeKey] || DAY_SECONDS;
  const deviceCount = getNormalizedDeviceCount(period);
  const averageRunningSeconds = Math.max(period.runningTimeSeconds || 0, 0) / deviceCount;
  const averageStoppedSeconds = Math.max(period.stoppedTimeSeconds || 0, 0) / deviceCount;

  let runningPct = durationSeconds > 0 ? (averageRunningSeconds / durationSeconds) * 100 : 0;
  let stoppedPct = durationSeconds > 0 ? (averageStoppedSeconds / durationSeconds) * 100 : 0;

  if (runningPct + stoppedPct > 100) {
    const factor = 100 / (runningPct + stoppedPct);
    runningPct *= factor;
    stoppedPct *= factor;
  }

  const normalizedRunningPct = clampPercent(runningPct);
  const normalizedStoppedPct = clampPercent(stoppedPct);

  return {
    scorePct: normalizedRunningPct,
    runningPct: normalizedRunningPct,
    stoppedPct: normalizedStoppedPct,
  };
};
