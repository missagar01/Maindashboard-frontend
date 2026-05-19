import {
  getHandoverRegister,
  getHandoverSummary,
} from "../../../api/transport/analyticsApi";
import { useTransportAnalyticsSection } from "../hooks/useTransportAnalyticsSection";
import { HandoverSummaryDashboard } from "./HandoverSummaryDashboard";

export default function TransportHandover() {
  const handover = useTransportAnalyticsSection(getHandoverSummary);
  const handoverRegister = useTransportAnalyticsSection(getHandoverRegister);

  return (
    <div>
      <HandoverSummaryDashboard
        data={handover.data}
        loading={handover.loading}
        error={handover.error}
        onRetry={handover.retry}
        handoverRegister={handoverRegister.data}
        handoverRegisterLoading={handoverRegister.loading}
        handoverRegisterError={handoverRegister.error}
        onRetryHandoverRegister={handoverRegister.retry}
      />
    </div>
  );
}

