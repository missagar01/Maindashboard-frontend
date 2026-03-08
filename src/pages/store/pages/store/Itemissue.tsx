import { AlertTriangle, PackageCheck, TrendingDown } from "lucide-react";

import StorePageShell from "./StorePageShell";
import { storeApi } from "@/api/store/storeSystemApi";

const issues = [
  { id: "ISS-1001", item: "Grease Oil", department: "Mechanical", status: "Dispatched" },
  { id: "ISS-1002", item: "Auto Spark Plug", department: "Electrical", status: "Hold" },
  { id: "ISS-1003", item: "Conveyor Belt", department: "Production", status: "Pending QC" },
];

export default function Itemissue() {
  return (
    <StorePageShell
      icon={<AlertTriangle size={48} className="text-orange-600" />}
      heading="Item Issues"
      subtext="Monitor issued items across departments"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="rounded-lg border border-gray-200 p-4 shadow-sm"
          >
            <p className="text-xs text-muted-foreground">#{issue.id}</p>
            <p className="text-lg font-semibold">{issue.item}</p>
            <p className="text-sm text-gray-500">{issue.department}</p>
            <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-wide">
              <PackageCheck size={14} className="text-blue-500" />
              {issue.status}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <TrendingDown size={16} />
        Alert when any item is held for more than 2 hours.
      </div>
    </StorePageShell>
  );
}
