import { ClipboardList, Truck } from "lucide-react";

import StorePageShell from "./StorePageShell";
import { storeApi } from "@/api/store/storeSystemApi";
const receipts = [
  { id: "REC-712", vendor: "Star Metals", items: 12, eta: "Today 17:00" },
  { id: "REC-813", vendor: "Acme Rubber", items: 24, eta: "Tomorrow 10:00" },
  { id: "REC-914", vendor: "Atlas Servo", items: 8, eta: "In 2 hours" },
];

export default function ReceiveItems() {
  return (
    <StorePageShell
      icon={<Truck size={48} className="text-emerald-600" />}
      heading="Receive Items"
      subtext="Inbound shipments arriving to main store"
    >
      <div className="space-y-3">
        {receipts.map((receipt) => (
          <div
            key={receipt.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
          >
            <div>
              <p className="text-xs text-muted-foreground">{receipt.id}</p>
              <p className="text-lg font-semibold text-gray-900">{receipt.vendor}</p>
              <p className="text-sm text-gray-500">{receipt.items} SKUs arriving</p>
            </div>
            <span className="text-sm font-semibold text-emerald-600">
              {receipt.eta}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <ClipboardList size={14} />
        Confirm receipts against PO before closing inbound note.
      </div>
    </StorePageShell>
  );
}
