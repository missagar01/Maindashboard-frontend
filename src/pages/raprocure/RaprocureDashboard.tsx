import { startTransition, useEffect, useState, type ReactElement } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import {
  fetchRaprocureDashboard,
  type RaprocureDashboardMetrics,
  type RaprocureDashboardSnapshot,
} from "../../api/raprocure/raprocureApi";

interface CardMetric {
  key: string;
  label: string;
  value: string;
  dotClass: string;
}

interface DashboardCardData {
  key: string;
  title: string;
  subtitle: string;
  score: number;
  scoreLabel: string;
  totalLabel: string;
  primaryColor: string;
  accentColor: string;
  accentShare: number;
  metrics: CardMetric[];
}

type RaprocureMetricKey = keyof RaprocureDashboardMetrics;

const clampValue = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const formatCompactNumber = (value: number) =>
  value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

const formatOneDecimal = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const formatPercent = (value: number) => `${formatOneDecimal(value)}%`;

const METRIC_DEFINITIONS: Array<{
  key: RaprocureMetricKey;
  label: string;
  dotClass: string;
}> = [
  {
    key: "totalRfqSent",
    label: "Total RFQ Sent",
    dotClass: "bg-[#10b981]",
  },
  {
    key: "totalOfferReceived",
    label: "Total Offer Received",
    dotClass: "bg-[#f59e0b]",
  },
  {
    key: "totalCounterOfferSent",
    label: "Total Counter Offer Sent",
    dotClass: "bg-[#94a3b8]",
  },
  {
    key: "totalProducts",
    label: "Total Products",
    dotClass: "bg-[#ef4444]",
  },
  {
    key: "totalAuctionsDone",
    label: "Total Auctions Done",
    dotClass: "bg-[#06b6d4]",
  },
  {
    key: "totalOrdersConfirmed",
    label: "Total Orders Confirmed",
    dotClass: "bg-[#8b5cf6]",
  },
 
];

const ALL_METRIC_KEYS: RaprocureMetricKey[] = METRIC_DEFINITIONS.map(
  (metricDefinition) => metricDefinition.key
);

const calculateRatio = (value: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return (value / total) * 100;
};

const formatMetricValue = (value: number) =>
  Number.isInteger(value)
    ? formatCompactNumber(value)
    : value.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

const formatUpperDateLabel = (
  value: Date,
  options: Intl.DateTimeFormatOptions
) => value.toLocaleString(undefined, options).toUpperCase();

const getSafeSnapshotDate = (value: string | null | undefined) => {
  const parsedDate = new Date(value || "");
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

const buildCardMetrics = (
  metrics: RaprocureDashboardMetrics,
  metricKeys: RaprocureMetricKey[]
): CardMetric[] =>
  metricKeys.map((metricKey) => {
    const metricDefinition = METRIC_DEFINITIONS.find(
      (definition) => definition.key === metricKey
    );

    if (!metricDefinition) {
      return {
        key: metricKey,
        label: metricKey,
        value: formatMetricValue(metrics[metricKey]),
        dotClass: "bg-slate-300",
      };
    }

    return {
      key: metricDefinition.key,
      label: metricDefinition.label,
      value: formatMetricValue(metrics[metricDefinition.key]),
      dotClass: metricDefinition.dotClass,
    };
  });

const buildActivityTotal = (metrics: RaprocureDashboardMetrics) => {
  const activityKeys: RaprocureMetricKey[] = [
    "totalRfqSent",
    "totalOfferReceived",
    "totalCounterOfferSent",
    "totalAuctionsDone",
    "totalOrdersConfirmed",
  ];

  const rawTotal = activityKeys.reduce(
    (runningTotal, activityKey) => runningTotal + metrics[activityKey],
    0
  );

  return rawTotal;
};

const buildDashboardCards = (
  snapshot: RaprocureDashboardSnapshot
): DashboardCardData[] => {
  const metrics = snapshot.metrics;
  const attentionLoad =
    metrics.pendingFeedbackRequestToVendors + metrics.unreadVendorMessages;
  const offerCoverage = calculateRatio(
    metrics.totalOfferReceived,
    Math.max(metrics.totalRfqSent, 1)
  );
  const orderShare = calculateRatio(
    metrics.totalOrdersConfirmed,
    Math.max(metrics.totalRfqSent, 1)
  );
  const auctionShare = calculateRatio(
    metrics.totalAuctionsDone,
    Math.max(metrics.totalRfqSent, 1)
  );
  const feedbackRatio = calculateRatio(
    attentionLoad,
    Math.max(metrics.totalOfferReceived, metrics.totalRfqSent, 1)
  );
  const snapshotScore = clampValue(
    offerCoverage * 0.35 + orderShare * 0.35 + (100 - feedbackRatio) * 0.3
  );
  const snapshotDate = getSafeSnapshotDate(snapshot.fetchedAt);
  const snapshotSubtitle = `${String(snapshot.filter || "Snapshot").toUpperCase()} | ${formatUpperDateLabel(
    snapshotDate,
    {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }
  )}`;

  return [
    {
      key: "snapshot",
      title: "Buyer Dashboard",
      subtitle: snapshotSubtitle,
      score: snapshotScore,
      scoreLabel: formatPercent(snapshotScore),
      totalLabel: formatMetricValue(buildActivityTotal(metrics)),
      primaryColor: "#10b981",
      accentColor: "#f59e0b",
      accentShare: clampValue(auctionShare, 0, 18),
      metrics: buildCardMetrics(metrics, ALL_METRIC_KEYS),
    },
  ];
};

const formatLastSync = (value: string | null | undefined) => {
  if (!value) {
    return "Awaiting sync";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Awaiting sync";
  }

  return `Last sync ${parsedDate.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const ProgressRing = ({
  score,
  scoreLabel,
  primaryColor,
  accentColor,
  accentShare,
}: {
  score: number;
  scoreLabel: string;
  primaryColor: string;
  accentColor: string;
  accentShare: number;
}) => {
  const circles: ReactElement[] = [];
  const radius = 36;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const boundedScore = clampValue(score);
  const boundedAccent = clampValue(accentShare, 0, 24);
  const primaryLength = (boundedScore / 100) * circumference;
  const accentLength = (boundedAccent / 100) * circumference;

  circles.push(
      <circle
        key="background"
        cx="60"
        cy="60"
        r={radius}
        fill="transparent"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
  );

  if (primaryLength > 0) {
    circles.push(
      <circle
        key="primary"
        cx="60"
        cy="60"
        r={radius}
        fill="transparent"
        stroke={primaryColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${primaryLength} ${circumference}`}
        className="transition-all duration-700 ease-out"
      />
    );
  }

  if (accentLength > 0) {
    circles.push(
      <circle
        key="accent"
        cx="60"
        cy="60"
        r={radius}
        fill="transparent"
        stroke={accentColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${accentLength} ${circumference}`}
        strokeDashoffset={-primaryLength}
        className="transition-all duration-700 ease-out"
      />
    );
  }

  return (
    <div className="relative flex h-[94px] w-[94px] shrink-0 items-center justify-center overflow-visible sm:h-[126px] sm:w-[126px] xl:h-[126px] xl:w-[126px]">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90 overflow-visible">
        {circles}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[9px] sm:tracking-[0.22em]">
          Score
        </span>
        <span className="mt-0.5 w-full whitespace-nowrap px-1 text-center text-[13px] font-black leading-none text-slate-900 sm:mt-1 sm:text-[19px]">
          {scoreLabel}
        </span>
      </div>
    </div>
  );
};

const SummaryCard = ({
  card,
  lastSync,
  footerLabel,
}: {
  card: DashboardCardData;
  lastSync: string;
  footerLabel: string;
}) => {
  const primaryMetrics = card.metrics.slice(0, 4);
  const secondaryMetrics = card.metrics.slice(4);

  return (
    <article className="relative overflow-hidden rounded-[26px] border border-slate-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur sm:rounded-[30px] sm:p-6 sm:shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0))]"
      />

      <div className="relative z-10">
        <div className="mb-3.5 flex items-start justify-between gap-2 sm:mb-5 sm:gap-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-black uppercase tracking-[0.12em] text-slate-900 sm:text-[19px] sm:tracking-[0.14em]">
              {card.title}
            </h2>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.24em]">
              {card.subtitle}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-1 rounded-full bg-[#f59e0b] px-2 py-1 shadow-sm sm:gap-1.5 sm:px-3 sm:py-1.5">
              <TrendingUp className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" />
              <span className="text-[8px] font-black uppercase tracking-wide text-white sm:text-[10px]">
                Score: {card.scoreLabel}
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-[#111827] px-2 py-1 shadow-sm sm:gap-1.5 sm:px-3 sm:py-1.5">
              <BarChart3 className="h-3 w-3 text-slate-300 sm:h-3.5 sm:w-3.5" />
              <span className="text-[8px] font-black uppercase tracking-wide text-white sm:text-[10px]">
                Total: {card.totalLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 sm:space-y-4">
          <div className="grid grid-cols-[94px_minmax(0,1fr)] items-center gap-2.5 sm:grid-cols-[126px_minmax(0,1fr)] sm:gap-5">
            <div className="flex justify-start">
              <ProgressRing
                score={card.score}
                scoreLabel={card.scoreLabel}
                primaryColor={card.primaryColor}
                accentColor={card.accentColor}
                accentShare={card.accentShare}
              />
            </div>

            <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
              {primaryMetrics.map((metric) => (
                <div
                  key={metric.key}
                  className="flex items-start justify-between gap-2 rounded-[16px] border border-slate-100 bg-white px-2.5 py-1.5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] sm:rounded-full sm:px-4 sm:py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-1.5 pr-1.5 sm:gap-2 sm:pr-2">
                    <span
                      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${metric.dotClass}`}
                    />
                    <span className="whitespace-normal text-[9px] font-black uppercase leading-[1.2] tracking-[0.04em] text-slate-700 sm:text-[11px] sm:leading-[1.25] sm:tracking-[0.06em]">
                      {metric.label}
                    </span>
                  </div>
                  <span className="shrink-0 pt-0.5 text-[10px] font-black text-slate-900 sm:text-[13px]">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {secondaryMetrics.length > 0 ? (
            <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
              {secondaryMetrics.map((metric) => (
                <div
                  key={metric.key}
                  className="flex items-start justify-between gap-2 rounded-[16px] border border-slate-100 bg-white px-2.5 py-1.5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] sm:rounded-full sm:px-4 sm:py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-1.5 pr-1.5 sm:gap-2 sm:pr-2">
                    <span
                      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${metric.dotClass}`}
                    />
                    <span className="whitespace-normal text-[9px] font-black uppercase leading-[1.2] tracking-[0.04em] text-slate-700 sm:text-[11px] sm:leading-[1.25] sm:tracking-[0.06em]">
                      {metric.label}
                    </span>
                  </div>
                  <span className="shrink-0 pt-0.5 text-[10px] font-black text-slate-900 sm:text-[13px]">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-2.5 border-t border-slate-100 pt-2.5 sm:mt-5 sm:gap-3 sm:pt-4">
          <span className="min-w-0 truncate text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
            {lastSync}
          </span>
          <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-rose-700 sm:px-3 sm:text-[9px] sm:tracking-[0.18em]">
            {footerLabel}
          </span>
        </div>
      </div>
    </article>
  );
};

export default function RaprocureDashboard() {
  const [snapshot, setSnapshot] = useState<RaprocureDashboardSnapshot | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let activeController: AbortController | null = null;

    const hydrate = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const nextSnapshot = await fetchRaprocureDashboard(controller.signal);
        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setSnapshot(nextSnapshot);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load Raprocure dashboard."
        );
      }
    };

    hydrate();
    const intervalId = window.setInterval(hydrate, 60000);

    return () => {
      isMounted = false;
      activeController?.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  const cards = snapshot ? buildDashboardCards(snapshot) : [];

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-8 text-slate-800">
      <div className="mx-auto max-w-[1540px] px-2 pt-2 sm:px-6 sm:pt-6 lg:px-8">
       
          {errorMessage && snapshot ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-800">
              Latest refresh failed: {errorMessage}
            </div>
          ) : null}

          {!snapshot && errorMessage ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-[28px] border border-rose-100 bg-white/85 px-6 text-center shadow-sm">
              <ClipboardList className="h-10 w-10 text-rose-500" />
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.28em] text-rose-500">
                  Dashboard Unavailable
                </p>
                <p className="mt-2 max-w-xl text-sm text-slate-500">
                  {errorMessage}
                </p>
              </div>
            </div>
          ) : !snapshot ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-[28px] border border-slate-100 bg-white/85 shadow-sm">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-100 border-t-[#ee1c23]" />
                <Boxes className="h-7 w-7 animate-pulse text-[#ee1c23]" />
              </div>
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">
                Fetching Buyer Metrics...
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-[560px]">
              {cards.map((card) => (
                <SummaryCard
                  key={card.key}
                  card={card}
                  lastSync={formatLastSync(snapshot.fetchedAt)}
                  footerLabel={snapshot.filter}
                />
              ))}
            </div>
          )}
      </div>
    </main>
  );
}
