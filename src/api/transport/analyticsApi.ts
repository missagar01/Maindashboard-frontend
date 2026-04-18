import { transportApiRequest } from "./api";
import {
  formatChartLabel,
  formatMonthLabel,
  toSafeNumber,
  toSafeString,
} from "../../pages/transport/analyticsFormatters";
import type {
  AnalyticsBreakdownItem,
  AnalyticsTrendPoint,
  HandoverEfficiencyPoint,
  HandoverSummary,
  HandoverTopEmployee,
  FrequentSwitcher,
  TakeoverRecentRecord,
  TakeoverSummary,
} from "../../pages/transport/analyticsTypes";

type AnalyticsRequestOptions = {
  signal?: AbortSignal;
};

const readPath = (source: any, path: string) =>
  path.split(".").reduce((current, key) => current?.[key], source);

const isPresent = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  (!(typeof value === "string") || value.trim() !== "");

const pickFirst = <T,>(source: any, paths: string[], fallback: T): T => {
  for (const path of paths) {
    const value = readPath(source, path);
    if (isPresent(value)) {
      return value as T;
    }
  }

  return fallback;
};

const toArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);

const unwrapPayload = (response: any) => {
  const body = response?.data ?? response ?? {};
  const candidates = [
    body?.data?.data,
    body?.data,
    body?.payload,
    body?.result,
    body,
  ];

  return (
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate)
    ) || {}
  );
};

const mapTrendPoints = (items: any[]): AnalyticsTrendPoint[] =>
  items
    .map((item) => ({
      label: formatChartLabel(
        item?.date_label ??
          item?.dateLabel ??
          item?.date ??
          item?.label ??
          item?.day ??
          item?.month
      ),
      count: toSafeNumber(
        item?.count ??
          item?.value ??
          item?.total ??
          item?.takeovers ??
          item?.handovers
      ),
    }))
    .filter((item) => item.label !== "Unknown" || item.count > 0);

const mapDeductionBreakdown = (items: any[]): AnalyticsBreakdownItem[] =>
  items
    .map((item) => ({
      label: toSafeString(
        item?.label ?? item?.reason ?? item?.category ?? item?.name,
        "Unspecified"
      ),
      amount: toSafeNumber(
        item?.amount ?? item?.value ?? item?.total_amount ?? item?.totalAmount
      ),
      count: isPresent(item?.count) ? toSafeNumber(item?.count) : undefined,
    }))
    .filter((item) => item.label !== "Unspecified" || item.amount > 0 || item.count);

const mapRecentTakeovers = (items: any[]): TakeoverRecentRecord[] =>
  items.map((item) => ({
    vehicleNo: toSafeString(item?.vehicleNo ?? item?.vehicle_no ?? item?.vehicle_number),
    driverName: toSafeString(item?.driverName ?? item?.driver_name ?? item?.driver),
    takeoverDate: toSafeString(
      item?.takeoverDate ?? item?.takeover_date ?? item?.date,
      ""
    ),
    processedBy: toSafeString(
      item?.processedBy ?? item?.processed_by ?? item?.approvedBy ?? item?.user_name
    ),
  }));

const mapTopEmployees = (items: any[]): HandoverTopEmployee[] =>
  items
    .map((item) => ({
      employeeName: toSafeString(
        item?.employeeName ?? item?.employee_name ?? item?.name,
        "Unknown employee"
      ),
      handoverCount: toSafeNumber(
        item?.handover_count ?? item?.handoverCount ?? item?.count ?? item?.total
      ),
    }))
    .filter((item) => item.employeeName !== "Unknown employee" || item.handoverCount > 0);

const mapFrequentSwitchers = (items: any[]): FrequentSwitcher[] =>
  items.map((item) => ({
    vehicleNo: toSafeString(item?.vehicleNo ?? item?.vehicle_no ?? item?.vehicle_number),
    handovers: toSafeNumber(item?.handovers ?? item?.handover_count ?? item?.count),
    lastDriver: toSafeString(item?.lastDriver ?? item?.last_driver ?? item?.driverName),
  }));

const mapHandoverEfficiencyTrend = (items: any[]): HandoverEfficiencyPoint[] =>
  items
    .map((item) => ({
      month: formatMonthLabel(item?.month ?? item?.label ?? item?.date),
      totalHandovers: toSafeNumber(
        item?.totalHandovers ?? item?.total_handovers ?? item?.handovers ?? item?.count
      ),
      avgIdleTimeHours: toSafeNumber(
        item?.avgIdleTimeHours ?? item?.avg_idle_time_hours ?? item?.idleTimeHours
      ),
    }))
    .filter((item) => item.month !== "Unknown");

const normalizeTakeoverSummary = (response: any): TakeoverSummary => {
  const payload = unwrapPayload(response);
  const metrics = pickFirst<any>(payload, ["kpi", "metrics", "summary"], payload);

  return {
    takeoversThisMonth: toSafeNumber(
      pickFirst(metrics, ["takeovers_this_month", "takeoversThisMonth"], 0)
    ),
    totalDeductionsThisMonth: toSafeNumber(
      pickFirst(
        metrics,
        ["total_deductions_this_month", "totalDeductionsThisMonth"],
        0
      )
    ),
    avgAssignmentDurationDays: toSafeNumber(
      pickFirst(
        metrics,
        ["avg_assignment_duration_days", "avgAssignmentDurationDays"],
        0
      )
    ),
    activityTrend: mapTrendPoints(
      toArray(
        pickFirst(
          payload,
          ["activity_trend", "activityTrend", "trend", "charts.activityTrend"],
          []
        )
      )
    ),
    deductionBreakdown: mapDeductionBreakdown(
      toArray(
        pickFirst(
          payload,
          [
            "deduction_breakdown",
            "deductionBreakdown",
            "breakdown",
            "charts.deductionBreakdown",
          ],
          []
        )
      )
    ),
    recentTakeovers: mapRecentTakeovers(
      toArray(
        pickFirst(
          payload,
          [
            "recent_takeover",
            "recent_takeovers",
            "recentTakeovers",
            "recent_records",
            "recentRecords",
            "charts.recent_takeover",
          ],
          []
        )
      )
    ),
  };
};

const normalizeHandoverSummary = (response: any): HandoverSummary => {
  const payload = unwrapPayload(response);
  const metrics = pickFirst<any>(payload, ["kpi", "metrics", "summary"], payload);

  return {
    handoversThisMonth: toSafeNumber(
      pickFirst(metrics, ["handovers_this_month", "handoversThisMonth"], 0)
    ),
    pendingTakeovers: toSafeNumber(
      pickFirst(metrics, ["pending_takeovers", "pendingTakeovers"], 0)
    ),
    fleetUtilization: toSafeNumber(
      pickFirst(metrics, ["fleet_utilization", "fleetUtilization"], 0)
    ),
    avgTurnaroundTimeHours: toSafeNumber(
      pickFirst(
        metrics,
        ["avg_turnaround_time_hours", "avgTurnaroundTimeHours"],
        0
      )
    ),
    activityTrend: mapTrendPoints(
      toArray(
        pickFirst(
          payload,
          ["activity_trend", "activityTrend", "trend", "charts.activityTrend"],
          []
        )
      )
    ),
    topEmployees: mapTopEmployees(
      toArray(
        pickFirst(
          payload,
          ["top_employees", "topEmployees", "charts.topEmployees"],
          []
        )
      )
    ),
    frequentSwitchers: mapFrequentSwitchers(
      toArray(
        pickFirst(
          payload,
          [
            "frequent_switchers",
            "frequentSwitchers",
            "switchers",
            "charts.frequentSwitchers",
          ],
          []
        )
      )
    ),
    handoverEfficiencyTrend: mapHandoverEfficiencyTrend(
      toArray(
        pickFirst(
          payload,
          [
            "handover_efficiency_trend",
            "handoverEfficiencyTrend",
            "efficiency_trend",
            "charts.handoverEfficiencyTrend",
          ],
          []
        )
      )
    ),
  };
};

export const getTakeoverSummary = async (
  options: AnalyticsRequestOptions = {}
): Promise<TakeoverSummary> => {
  const { signal } = options;

  const response = await transportApiRequest("analytics/takeover/summary", {
    signal,
  });
  return normalizeTakeoverSummary(response);
};

export const getHandoverSummary = async (
  options: AnalyticsRequestOptions = {}
): Promise<HandoverSummary> => {
  const { signal } = options;

  const response = await transportApiRequest("analytics/handover/summary", {
    signal,
  });
  return normalizeHandoverSummary(response);
};
