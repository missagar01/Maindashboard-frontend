export interface AnalyticsTrendPoint {
  label: string;
  count: number;
}

export interface AnalyticsBreakdownItem {
  label: string;
  amount: number;
  count?: number;
}

export interface TakeoverRecentRecord {
  vehicleNo: string;
  driverName: string;
  takeoverDate: string;
  processedBy: string;
}

export interface TakeoverListRecord {
  id: string;
  vehicleTakeoverCode: string;
  branchName: string;
  vehicleTakeoverDate: string;
  takeOverToDriverName: string;
  takeOverVehicleNo: string;
  takeOverToEmployeeName: string;
}

export interface TakeoverListResult {
  records: TakeoverListRecord[];
  totalCount: number;
}

export interface HandoverTopEmployee {
  employeeName: string;
  handoverCount: number;
}

export interface FrequentSwitcher {
  vehicleNo: string;
  handovers: number;
  lastDriver: string;
}

export interface HandoverEfficiencyPoint {
  month: string;
  totalHandovers: number;
  avgIdleTimeHours: number;
}

export interface HandoverListRecord {
  id: string;
  vehicleHandoverCode: string;
  branchName: string;
  vehicleHandoverDate: string;
  handoverDriverName: string;
  handoverVehicleNo: string;
  handoverEmployeeName: string;
  takeOverCompleted: boolean;
}

export interface HandoverListResult {
  records: HandoverListRecord[];
  totalCount: number;
}

export interface TakeoverSummary {
  takeoversThisMonth: number;
  totalDeductionsThisMonth: number;
  avgAssignmentDurationDays: number;
  activityTrend: AnalyticsTrendPoint[];
  deductionBreakdown: AnalyticsBreakdownItem[];
  recentTakeovers: TakeoverRecentRecord[];
}

export interface HandoverSummary {
  handoversThisMonth: number;
  pendingTakeovers: number;
  fleetUtilization: number;
  avgTurnaroundTimeHours: number;
  activityTrend: AnalyticsTrendPoint[];
  topEmployees: HandoverTopEmployee[];
  frequentSwitchers: FrequentSwitcher[];
  handoverEfficiencyTrend: HandoverEfficiencyPoint[];
}
