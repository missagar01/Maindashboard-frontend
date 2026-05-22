import { API_BASE_URL, getStoredToken } from '../apiClient';

export interface DashboardMessage {
  id: string;
  topic: string;
  brokerUrl: string | null;
  messageTimestamp: string | null;
  createdAt: string | null;
  deviceUid: string | null;
  meterTimestamp?: string | null;
  slaveId?: string | null;
  vR?: string | null;
  vY?: string | null;
  vB?: string | null;
  vAvg?: string | null;
  iR?: string | null;
  iY?: string | null;
  iB?: string | null;
  kwT?: string | null;
  kvarT?: string | null;
  kvaT?: string | null;
  pfR?: string | null;
  pfY?: string | null;
  pfB?: string | null;
  freq?: string | null;
  kwhImp?: string | null;
  kwhExp?: string | null;
  kwhNet?: string | null;
  kvarhImp?: string | null;
  kvarhExp?: string | null;
  kvarhNet?: string | null;
}

export type SummaryRange = 'day' | 'week' | 'month';
export type SummaryStatus = 'Running' | 'Standby' | 'Down' | 'Excellent' | 'Optimal' | 'Normal';
export type AlertSeverity = 'Critical' | 'Warning';

export interface MetricTriplet {
  avg: number | null;
  min: number | null;
  max: number | null;
}

export interface SummaryAlertItem {
  type: string;
  title: string;
  machine: string;
  time: string;
  value: string;
  severity: AlertSeverity;
}

export interface SummaryTrendPoint {
  label: string;
  startTime: string;
  endTime: string;
  totalEnergy: number | null;
  averagePower: number | null;
  averageVoltage: number | null;
  averageCurrent: number | null;
  averagePf: number | null;
  averageFrequency: number | null;
  runningTimeSeconds: number;
  status: SummaryStatus;
}

export interface SummaryDeviceItem {
  name: string;
  totalEnergy: number | null;
  averagePower: number | null;
  averageVoltage: number | null;
  averageCurrent: number | null;
  powerFactor: number | null;
  runningTimeSeconds: number;
  status: 'Online' | 'Offline';
  lastSeenAt: string | null;
}

export interface SummaryPeriodPayload {
  rangeKey: SummaryRange;
  label: string;
  startTime: string | null;
  endTime: string | null;
  lastSummaryTime: string | null;
  nextSummaryTime: string | null;
  samples: number;
  totalEnergy: number | null;
  power: MetricTriplet;
  powerFactor: MetricTriplet;
  voltage: MetricTriplet;
  current: MetricTriplet;
  frequency: MetricTriplet;
  runningTimeSeconds: number;
  stoppedTimeSeconds: number;
  uptimePct: number;
  totalAlerts: number;
  alertItems: SummaryAlertItem[];
  onlineDevices: number;
  offlineDevices: number;
  deviceCount: number;
  status: SummaryStatus;
  trend: SummaryTrendPoint[];
  devices: SummaryDeviceItem[];
}

export interface DashboardSummaryResponse {
  anchorTime: string | null;
  generatedAt: string;
  periods: {
    day: SummaryPeriodPayload;
    week: SummaryPeriodPayload;
    month: SummaryPeriodPayload;
  };
}

export interface LiveDeviceStatus {
  deviceUid: string;
  topic: string;
  messageTimestamp: string | null;
  meterTimestamp: string | null;
  isOnline: boolean;
}

export interface DashboardLiveResponse {
  connection: {
    status: string;
    brokerUrl: string | null;
    topics?: string[];
    error?: string | null;
    historyCount?: number;
    database?: {
      enabled?: boolean;
      status?: string;
      pendingWrites?: number;
      lastError?: string | null;
      tableName?: string;
      nextRetryAt?: string | null;
    };
  };
  devices: LiveDeviceStatus[];
  liveMessageCount: number;
}

const IOT_API_PREFIX = '/api/iot';
const buildUrl = (path: string) => `${API_BASE_URL}${IOT_API_PREFIX}${path}`;

const buildHeaders = (headers: HeadersInit = {}) => {
  const token = getStoredToken();

  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchMessages(): Promise<DashboardMessage[]> {
  const response = await fetch(buildUrl('/messages'), {
    headers: buildHeaders(),
  });
  return parseJson<DashboardMessage[]>(response);
}

export async function fetchSummary(): Promise<DashboardSummaryResponse> {
  const response = await fetch(buildUrl('/summary'), {
    headers: buildHeaders(),
  });
  return parseJson<DashboardSummaryResponse>(response);
}

export async function fetchLive(): Promise<DashboardLiveResponse> {
  const response = await fetch(buildUrl('/live'), {
    headers: buildHeaders(),
  });
  return parseJson<DashboardLiveResponse>(response);
}
