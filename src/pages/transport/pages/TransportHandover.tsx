import { getHandoverSummary } from "../../../api/transport/analyticsApi";
import { useTransportAnalyticsSection } from "../hooks/useTransportAnalyticsSection";
import { HandoverSummaryDashboard } from "./HandoverSummaryDashboard";

export default function TransportHandover() {
  const handover = useTransportAnalyticsSection(getHandoverSummary);

  return (
    <div>
      <HandoverSummaryDashboard
        data={handover.data}
        loading={handover.loading}
        error={handover.error}
        onRetry={handover.retry}
      />
    </div>
  );
}
