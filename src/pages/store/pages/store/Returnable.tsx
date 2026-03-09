import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Repeat2 } from "lucide-react";
import { toast } from "sonner";

import { storeApi } from "@/api/store/storeSystemApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import StorePageShell from "./StorePageShell";

type ReturnableStats = {
  total: number;
  returnable: number;
  nonReturnable: number;
  returnablePending: number;
  returnableCompleted: number;
};

type ReturnableRow = {
  gatePassType: string;
  date: string;
  gatePassNo: string;
  partyName: string;
  itemCode: string;
  itemName: string;
  quantityIssued: number;
  quantityReceived: number;
  status: string;
  unit: string;
  contact: string;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickValue = (source: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return "";
};

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const formatDate = (value: string): string => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function Returnable() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<"ALL" | "RETURNABLE" | "NON RETURANABLE">("ALL");
  const [stats, setStats] = useState<ReturnableStats>({
    total: 0,
    returnable: 0,
    nonReturnable: 0,
    returnablePending: 0,
    returnableCompleted: 0,
  });
  const [rows, setRows] = useState<ReturnableRow[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, detailsRes] = await Promise.all([
          storeApi.getReturnableStats(),
          storeApi.getReturnableDetails(),
        ]);

        if (!active) return;

        const statsPayload = (statsRes?.data ?? statsRes ?? {}) as Record<string, unknown>;
        setStats({
          total: toNumber(pickValue(statsPayload, ["TOTAL_COUNT", "total_count", "totalCount"])),
          returnable: toNumber(
            pickValue(statsPayload, ["RETURNABLE_COUNT", "returnable_count", "returnableCount"])
          ),
          nonReturnable: toNumber(
            pickValue(statsPayload, ["NON_RETURNABLE_COUNT", "non_returnable_count", "nonReturnableCount"])
          ),
          returnablePending: toNumber(
            pickValue(statsPayload, [
              "RETURNABLE_PENDING_COUNT",
              "returnable_pending_count",
              "returnablePendingCount",
            ])
          ),
          returnableCompleted: toNumber(
            pickValue(statsPayload, [
              "RETURNABLE_COMPLETED_COUNT",
              "returnable_completed_count",
              "returnableCompletedCount",
            ])
          ),
        });

        const detailsPayload = Array.isArray(detailsRes?.data)
          ? detailsRes.data
          : Array.isArray(detailsRes)
            ? detailsRes
            : [];

        const mappedRows = detailsPayload.map((entry: Record<string, unknown>) => ({
          gatePassType: toText(pickValue(entry, ["GATEPASS_TYPE", "gatepass_type"])),
          date: toText(pickValue(entry, ["VRDATE", "vrdate"])),
          gatePassNo: toText(pickValue(entry, ["VRNO", "vrno"])),
          partyName: toText(pickValue(entry, ["PARTY_NAME", "party_name"])),
          itemCode: toText(pickValue(entry, ["ITEM_CODE", "item_code"])),
          itemName: toText(pickValue(entry, ["ITEM_NAME", "item_name"])),
          quantityIssued: toNumber(pickValue(entry, ["QTYISSUED", "qtyissued"])),
          quantityReceived: toNumber(pickValue(entry, ["QTYRECEIVED", "qtyreceived"])),
          status: toText(pickValue(entry, ["GATEPASS_STATUS", "gatepass_status"])),
          unit: toText(pickValue(entry, ["UNIT", "unit"])),
          contact: [toText(pickValue(entry, ["MOBILE", "mobile"])), toText(pickValue(entry, ["EMAIL", "email"]))]
            .filter(Boolean)
            .join(" / "),
        }));

        setRows(mappedRows);
      } catch (error) {
        console.error("Failed to load returnable dashboard", error);
        if (active) {
          toast.error("Failed to fetch returnable data");
          setRows([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesType = activeType === "ALL" || row.gatePassType.toUpperCase() === activeType;
      if (!matchesType) return false;
      if (!query) return true;
      return (
        row.gatePassNo.toLowerCase().includes(query) ||
        row.partyName.toLowerCase().includes(query) ||
        row.itemCode.toLowerCase().includes(query) ||
        row.itemName.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query)
      );
    });
  }, [activeType, rows, search]);

  return (
    <StorePageShell
      icon={<Repeat2 size={48} className="text-orange-600" />}
      heading="Returnable"
      subtext="Track returnable and non-returnable gate pass status"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Total</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-green-700">Returnable</p>
          <p className="mt-1 text-2xl font-bold text-green-900">{stats.returnable}</p>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Non Returnable</p>
          <p className="mt-1 text-2xl font-bold text-violet-900">{stats.nonReturnable}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{stats.returnablePending}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{stats.returnableCompleted}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search gate pass, party, item, or status..."
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeType === "ALL" ? "default" : "outline"}
            onClick={() => setActiveType("ALL")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={activeType === "RETURNABLE" ? "default" : "outline"}
            onClick={() => setActiveType("RETURNABLE")}
          >
            Returnable
          </Button>
          <Button
            size="sm"
            variant={activeType === "NON RETURANABLE" ? "default" : "outline"}
            onClick={() => setActiveType("NON RETURANABLE")}
          >
            Non Returnable
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-[980px] w-full border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Date</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Gate Pass</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Type</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Party</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Item</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Issued</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Received</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Contact</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-gray-500">
                  Loading returnable data...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-gray-500">
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr key={`${row.gatePassNo}-${idx}`} className="border-t border-gray-100">
                  <td className="px-3 py-2">{formatDate(row.date)}</td>
                  <td className="px-3 py-2 font-medium text-slate-700">{row.gatePassNo || "--"}</td>
                  <td className="px-3 py-2">{row.gatePassType || "--"}</td>
                  <td className="px-3 py-2">{row.partyName || "--"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">{row.itemCode || "--"}</span>
                      <span className="text-xs text-slate-500">{row.itemName || "--"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.quantityIssued.toLocaleString("en-IN")} {row.unit}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.quantityReceived.toLocaleString("en-IN")} {row.unit}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.status.toUpperCase() === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {row.status || "--"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{row.contact || "--"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ArrowUpDown size={14} />
        Showing {filteredRows.length} records
      </div>
    </StorePageShell>
  );
}
