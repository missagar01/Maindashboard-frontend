import {
  getTakeoverRegister,
  getTakeoverSummary,
} from "../../../api/transport/analyticsApi";
import { useTransportAnalyticsSection } from "../hooks/useTransportAnalyticsSection";
import { TakeoverSummaryDashboard } from "./TakeoverSummaryDashboard";

export default function TransportTakeover() {
  const takeover = useTransportAnalyticsSection(getTakeoverSummary);
  const takeoverRegister = useTransportAnalyticsSection(getTakeoverRegister);

  return (
    <div className="-mx-2 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_28%),linear-gradient(180deg,#f8fbff,#ffffff_30%)] px-2 py-3 sm:mx-0 sm:rounded-[32px] sm:px-3 sm:py-4">
      <TakeoverSummaryDashboard
        data={takeover.data}
        loading={takeover.loading}
        error={takeover.error}
        onRetry={takeover.retry}
        takeoverRegister={takeoverRegister.data}
        takeoverRegisterLoading={takeoverRegister.loading}
        takeoverRegisterError={takeoverRegister.error}
        onRetryTakeoverRegister={takeoverRegister.retry}
      />
    </div>
  );
}
