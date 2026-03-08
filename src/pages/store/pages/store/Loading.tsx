import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import StorePageShell from "./StorePageShell";

interface LoadingProps {
  heading?: string;
  subtext?: string;
  icon?: ReactNode;
  description?: ReactNode | null;
  showSpinner?: boolean;
}

export default function Loading({
  heading = "Loading",
  subtext = "Waiting for the store service to respond",
  icon = <Loader2 size={48} className="animate-spin text-blue-600" />,
  description = null,
  showSpinner = true,
}: LoadingProps) {
  return (
    <StorePageShell icon={icon} heading={heading} subtext={subtext}>
      {showSpinner && (
        <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span>Loading data…</span>
        </div>
      )}
      {description}
    </StorePageShell>
  );
}
