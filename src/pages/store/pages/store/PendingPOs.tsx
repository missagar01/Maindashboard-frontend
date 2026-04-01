// Pending Purchase Orders Page
import { useEffect, useState } from "react";
import { storeApi } from "@/api/store/storeSystemApi";
import { ListTodo } from "lucide-react";
import Heading from "../../components/element/Heading";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

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
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function PendingPOs() {
  const [pending, setPending] = useState<POData[]>([]);
  const [history, setHistory] = useState<POData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        storeApi.getPoPending(),
        storeApi.getPoHistory(),
      ]);

      if (pendingRes.success && Array.isArray(pendingRes.data)) {
        setPending(pendingRes.data);
      }
      if (historyRes.success && Array.isArray(historyRes.data)) {
        setHistory(historyRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch POs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: "pending" | "history") => {
    try {
      const blob = await (type === "pending"
        ? storeApi.downloadPoPending()
        : storeApi.downloadPoHistory());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `po-${type}-${new Date().toISOString()}.xlsx`;
      a.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const data = activeTab === "pending" ? pending : history;

  return (
    <div className="w-full p-4 md:p-6 lg:p-10 space-y-6">
      <Heading heading="Purchase Orders" subtext="Pending and History">
        <ListTodo size={46} className="text-primary" />
      </Heading>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={activeTab === "pending" ? "default" : "outline"}
                onClick={() => setActiveTab("pending")}
              >
                Pending
              </Button>
              <Button
                variant={activeTab === "history" ? "default" : "outline"}
                onClick={() => setActiveTab("history")}
              >
                History
              </Button>
            </div>
            <Button onClick={() => handleDownload(activeTab)}>
              Download {activeTab === "pending" ? "Pending" : "History"}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
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
                  {data.map((po, idx) => (
                    <tr key={idx} className="border-b">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

