const DEFAULT_RAPROCURE_DASHBOARD_PATH =
  "/raprocure-api/public-buyer-dashboard/eyJpdiI6ImpsaHRLOERhaHV2b2U1MjNleXhhQXc9PSIsInZhbHVlIjoiOHVHNUpSREJ2N1ZUZ05BU3B5NjRFZz09IiwibWFjIjoiMjM5N2ZhZTllNTVlYmZjODk4NWIxZmY2YmNhNTA2NzBiZGVhMmJkM2JjZTAwNzkxOGYxNjM2MTZjMjMwOGYwNSIsInRhZyI6IiJ9";

const normalizeRaprocureDashboardPath = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return DEFAULT_RAPROCURE_DASHBOARD_PATH;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `/${trimmedValue.replace(/^\/+/, "")}`;
};

const RAPROCURE_DASHBOARD_PATH = normalizeRaprocureDashboardPath(
  String(import.meta.env.VITE_RAPROCURE_API_BASE_URL || "")
);

export interface RaprocureDashboardMetrics {
  totalRfqSent: number;
  totalOfferReceived: number;
  totalCounterOfferSent: number;
  totalProducts: number;
  totalAuctionsDone: number;
  totalOrdersConfirmed: number;
  pendingFeedbackRequestToVendors: number;
  unreadVendorMessages: number;
}

interface RaprocureDashboardResponse {
  success?: boolean;
  data?: Partial<Record<keyof RaprocureDashboardMetrics, unknown>>;
  filter?: string | null;
}

export interface RaprocureDashboardSnapshot {
  metrics: RaprocureDashboardMetrics;
  filter: string;
  fetchedAt: string;
}

const toSafeNumber = (value: unknown) => {
  const numericValue =
    typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeMetrics = (
  data: RaprocureDashboardResponse["data"]
): RaprocureDashboardMetrics => ({
  totalRfqSent: toSafeNumber(data?.totalRfqSent),
  totalOfferReceived: toSafeNumber(data?.totalOfferReceived),
  totalCounterOfferSent: toSafeNumber(data?.totalCounterOfferSent),
  totalProducts: toSafeNumber(data?.totalProducts),
  totalAuctionsDone: toSafeNumber(data?.totalAuctionsDone),
  totalOrdersConfirmed: toSafeNumber(data?.totalOrdersConfirmed),
  pendingFeedbackRequestToVendors: toSafeNumber(
    data?.pendingFeedbackRequestToVendors
  ),
  unreadVendorMessages: toSafeNumber(data?.unreadVendorMessages),
});

export async function fetchRaprocureDashboard(
  signal?: AbortSignal
): Promise<RaprocureDashboardSnapshot> {
  let response: Response;
  try {
    response = await fetch(RAPROCURE_DASHBOARD_PATH, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Raprocure API request failed. If you are running locally, start the app with the Vite dev server so /raprocure-api proxy is available."
    );
  }

  const rawBody = await response.text();
  if (response.status === 404) {
    throw new Error(
      "Raprocure proxy route not found. Run the frontend with Vite dev server or configure your web server to proxy /raprocure-api to the upstream API."
    );
  }

  if (!response.ok) {
    throw new Error(rawBody || `Request failed with status ${response.status}`);
  }

  let parsedBody: RaprocureDashboardResponse;
  try {
    parsedBody = JSON.parse(rawBody) as RaprocureDashboardResponse;
  } catch {
    throw new Error("Raprocure dashboard returned an invalid response.");
  }

  if (!parsedBody?.success || !parsedBody.data) {
    throw new Error("Raprocure dashboard did not return any usable data.");
  }

  return {
    metrics: normalizeMetrics(parsedBody.data),
    filter: String(parsedBody.filter || "All Time"),
    fetchedAt: new Date().toISOString(),
  };
}
