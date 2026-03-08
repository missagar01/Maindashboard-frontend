import { useEffect, useState } from "react";
import { Building2, RefreshCw } from "lucide-react";

import { storeApi } from "@/api/store/storeSystemApi";
import StorePageShell from "./StorePageShell";

type VendorHistoryRow = {
  vendor_name?: string;
  vendorName?: string;
  status?: string;
  updated_at?: string;
  updatedAt?: string;
};

interface VendorRecord {
  vendor_name?: string;
  status?: string;
  last_update?: string;
}

export default function VendorUpdate() {
  const [items, setItems] = useState<VendorRecord[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await storeApi.getVendorRateHistory();
        if (!active) return;
        const payload = (Array.isArray(res?.data) ? res.data : []) as VendorHistoryRow[];
        setItems(
          payload.slice(0, 6).map((record) => ({
            vendor_name: record.vendor_name ?? record.vendorName,
            status: record.status ?? "Updated",
            last_update: record.updated_at ?? record.updatedAt ?? "Today",
          }))
        );
      } catch (err) {
        console.error("Unable to load vendor updates", err);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <StorePageShell
      icon={<Building2 size={48} className="text-rose-600" />}
      heading="Vendor Update"
      subtext="Track vendor rate and master updates"
    >
      <div className="grid gap-3">
        {items.map((item, idx) => (
          <div
            key={`${item.vendor_name}-${idx}`}
            className="rounded-lg border border-gray-200 p-4 shadow-sm"
          >
            <p className="text-sm font-semibold">{item.vendor_name}</p>
            <p className="text-xs text-muted-foreground">
              {item.last_update}
            </p>
            <p className="text-xs uppercase tracking-wide text-rose-600">
              {item.status}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <RefreshCw size={14} />
        Sourced from vendor master every hour.
      </div>
    </StorePageShell>
  );
}
