import { useEffect, useState } from "react";
import { Percent, TrendingUp } from "lucide-react";

import { storeApi } from "@/api/store/storeSystemApi";
import StorePageShell from "./StorePageShell";

type VendorRateRow = {
  vendor_name?: string;
  vendorName?: string;
  item_name?: string;
  itemName?: string;
  new_rate?: number;
  status?: string;
};

interface RateRow {
  vendor_name?: string;
  item?: string;
  suggested_rate?: number;
  status?: string;
}

export default function RateApproval() {
  const [rows, setRows] = useState<RateRow[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await storeApi.getVendorRatePending();
        if (!active) return;
        const payload = (Array.isArray(res?.data) ? res.data : []) as VendorRateRow[];
        setRows(
          payload.slice(0, 6).map((item) => ({
            vendor_name: item.vendor_name ?? item.vendorName,
            item: item.item_name ?? item.itemName,
            suggested_rate: item.new_rate,
            status: item.status ?? "Pending",
          }))
        );
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <StorePageShell
      icon={<Percent size={48} className="text-pink-600" />}
      heading="Rate Approval"
      subtext="Review vendor rate change requests"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 text-left">Vendor</th>
              <th className="py-2 text-left">Item</th>
              <th className="py-2 text-right">Proposed Rate</th>
              <th className="py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-2">{row.vendor_name}</td>
                <td className="py-2">{row.item}</td>
                <td className="py-2 text-right">
                  ₹{row.suggested_rate?.toLocaleString() ?? "-"}
                </td>
                <td className="py-2">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <TrendingUp size={14} />
        Approvals feed into the procurement pipeline instantly.
      </div>
    </StorePageShell>
  );
}
