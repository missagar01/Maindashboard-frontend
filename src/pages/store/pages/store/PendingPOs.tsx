import { useEffect, useMemo, useState } from "react";
import { Download, ListTodo } from "lucide-react";

import { storeApi } from "@/api/store/storeSystemApi";
import Heading from "../../components/element/Heading";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { compareDateDesc, parseStoreDateValue } from "./currentMonthSort";

interface POData {
  PLANNED_TIMESTAMP: string;
  VRNO: string;
  VRDATE: string;
  VENDOR_NAME: string;
  ITEM_NAME: string;
  QTYORDER: number;
  QTYEXECUTE: number;
  BALANCE_QTY?: number;
  UM: string;
}

function formatShortDate(dateStr?: string) {
  if (!dateStr) return "--";
  const date = parseStoreDateValue(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function sortPurchaseOrders(rows: POData[]) {
  return [...rows].sort((a, b) => compareDateDesc(a.VRDATE || a.PLANNED_TIMESTAMP, b.VRDATE || b.PLANNED_TIMESTAMP));
}

function MobileField({ label, value, className, hideIfEmpty = false }: { label: string; value: string | number | null | undefined; className?: string; hideIfEmpty?: boolean }) {
  const isEmpty = value === null || value === undefined || value === "";
  if (hideIfEmpty && isEmpty) return null;
  return (
    <div className={className}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-[13px] font-semibold leading-4 text-slate-800">{isEmpty ? "--" : value}</p>
    </div>
  );
}

export default function PendingPOs() {
  const [pending, setPending] = useState<POData[]>([]);
  const [history, setHistory] = useState<POData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pendingRes, historyRes] = await Promise.all([storeApi.getPoPending(), storeApi.getPoHistory()]);
        if (pendingRes.success && Array.isArray(pendingRes.data)) setPending(sortPurchaseOrders(pendingRes.data));
        if (historyRes.success && Array.isArray(historyRes.data)) setHistory(sortPurchaseOrders(historyRes.data));
      } catch (err) {
        console.error("Failed to fetch POs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownload = async (type: "pending" | "history") => {
    try {
      const blob = await (type === "pending" ? storeApi.downloadPoPending() : storeApi.downloadPoHistory());
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `po-${type}-${new Date().toISOString()}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const data = activeTab === "pending" ? pending : history;
  const filteredData = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return data;

    return data.filter((po) =>
      [
        po.VRNO,
        po.VRDATE,
        po.VENDOR_NAME,
        po.ITEM_NAME,
        po.QTYORDER,
        po.QTYEXECUTE,
        po.BALANCE_QTY ?? 0,
        po.UM,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data, searchText]);

  return (
    <div className="w-full space-y-4 px-0 py-2 sm:p-4 md:p-6 lg:p-10">
      <Heading heading="Purchase Orders" subtext="Pending and history"><ListTodo size={46} className="text-primary" /></Heading>
      <Card className="rounded-xl border border-slate-200 shadow-sm">
        <CardContent className="space-y-3 p-3 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <Button variant={activeTab === "pending" ? "default" : "outline"} onClick={() => setActiveTab("pending")} className="w-full">Pending</Button>
              <Button variant={activeTab === "history" ? "default" : "outline"} onClick={() => setActiveTab("history")} className="w-full">History</Button>
            </div>
            <Button onClick={() => handleDownload(activeTab)} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Download {activeTab === "pending" ? "Pending" : "History"}
            </Button>
          </div>

          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search: PO No / Date / Vendor / Item / Qty / UOM"
            className="w-full"
          />

          <div className="space-y-2 md:hidden">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">Loading purchase orders...</div>
            ) : filteredData.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">No purchase orders found.</div>
            ) : (
              filteredData.map((po, idx) => (
                <div key={`${po.VRNO}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{activeTab === "pending" ? "Pending PO" : "History PO"}</p>
                      <h3 className="mt-1 text-lg font-black leading-5 text-slate-900">{po.VRNO || "--"}</h3>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-blue-700">{formatShortDate(po.VRDATE)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <MobileField label="Vendor" value={po.VENDOR_NAME} className="col-span-2" />
                    <MobileField label="Item" value={po.ITEM_NAME} className="col-span-2" />
                    <MobileField label="Order Qty" value={po.QTYORDER} />
                    <MobileField label="Execute Qty" value={po.QTYEXECUTE} />
                    <MobileField label="Balance" value={po.BALANCE_QTY || 0} />
                    <MobileField label="UOM" value={po.UM} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            {loading ? (
              <div className="py-8 text-center">Loading...</div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">VRNO</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Vendor</th>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-right">Order Qty</th>
                    <th className="p-2 text-right">Execute Qty</th>
                    <th className="p-2 text-right">Balance</th>
                    <th className="p-2 text-left">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((po, idx) => (
                    <tr key={`${po.VRNO}-${idx}`} className="border-b">
                      <td className="p-2">{po.VRNO}</td>
                      <td className="p-2">{formatShortDate(po.VRDATE)}</td>
                      <td className="p-2">{po.VENDOR_NAME}</td>
                      <td className="p-2">{po.ITEM_NAME}</td>
                      <td className="p-2 text-right">{po.QTYORDER}</td>
                      <td className="p-2 text-right">{po.QTYEXECUTE}</td>
                      <td className="p-2 text-right">{po.BALANCE_QTY || 0}</td>
                      <td className="p-2">{po.UM}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
