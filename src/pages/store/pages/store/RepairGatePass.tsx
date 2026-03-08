import { useEffect, useState } from "react";
import { FileText, Loader } from "lucide-react";
import { Link, useLocation } from "react-router";
import Heading from "../../components/element/Heading";
import { storeApi } from "@/api/store/storeSystemApi";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { repairFollowupApi } from "@/api/store/storeRepairFollowupApi";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

type GatePassRow = {
  vrno?: string;
  vrdate?: string;
  department?: string;
  partyname?: string;
  item_name?: string;
  item_code?: string;
  qtyissued?: number;
  qtyrecd?: number;
  um?: string;
  app_remark?: string;
  remark?: string;
  repair_gate_pass?: string;
  receive_gate_pass?: string;
  received_date?: string;
};

const PAGE_SIZE = 50;

export default function RepairGatePass() {
  const location = useLocation();
  const isHistory = location.pathname.includes("history");
  const [rows, setRows] = useState<GatePassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [selectedRow, setSelectedRow] = useState<GatePassRow | null>(null);
  const [leadTime, setLeadTime] = useState("");
  const [processedKeys, setProcessedKeys] = useState<Set<string>>(new Set());


  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setRows([]);
      try {
        const res = isHistory
          ? await storeApi.getRepairGatePassHistory()
          : await storeApi.getRepairGatePassPending();

        if (!active) return;

        // Handle response structure: { success: true, data: [...] }
        let payload: unknown[] = [];
        if (res && typeof res === 'object') {
          if ('data' in res && Array.isArray((res as { data?: unknown }).data)) {
            payload = (res as { data: unknown[] }).data;
          } else if (Array.isArray(res)) {
            payload = res;
          }
        }

        const normalized: GatePassRow[] = payload.map((row) => {
          const r = row as Record<string, unknown>;
          if (isHistory) {
            // History tab: repair_gate_pass, receive_gate_pass, received_date, etc.
            return {
              repair_gate_pass: String((r.REPAIR_GATE_PASS ?? r.repair_gate_pass ?? "")).trim(),
              receive_gate_pass: String((r.RECEIVE_GATE_PASS ?? r.receive_gate_pass ?? "")).trim(),
              received_date: String((r.RECEIVED_DATE ?? r.received_date ?? "")).trim(),
              department: String((r.DEPARTMENT ?? r.department ?? "")).trim(),
              partyname: String((r.PARTYNAME ?? r.partyname ?? "")).trim(),
              item_name: String((r.ITEM_NAME ?? r.item_name ?? "")).trim(),
              item_code: String((r.ITEM_CODE ?? r.item_code ?? "")).trim(),
              qtyrecd: Number(r.QTYRECD ?? r.qtyrecd ?? 0),
              um: String((r.UM ?? r.um ?? "")).trim(),
              app_remark: String((r.APP_REMARK ?? r.app_remark ?? "")).trim(),
              remark: String((r.REMARK ?? r.remark ?? "")).trim(),
            };
          } else {
            // Pending tab: vrno, vrdate, qtyissued, etc.
            return {
              vrno: String((r.VRNO ?? r.vrno ?? "")).trim(),
              vrdate: String((r.VRDATE ?? r.vrdate ?? "")).trim(),
              department: String((r.DEPARTMENT ?? r.department ?? "")).trim(),
              partyname: String((r.PARTYNAME ?? r.partyname ?? "")).trim(),
              item_name: String((r.ITEM_NAME ?? r.item_name ?? "")).trim(),
              item_code: String((r.ITEM_CODE ?? r.item_code ?? "")).trim(),
              qtyissued: Number(r.QTYISSUED ?? r.qtyissued ?? 0),
              um: String((r.UM ?? r.um ?? "")).trim(),
              app_remark: String((r.APP_REMARK ?? r.app_remark ?? "")).trim(),
              remark: String((r.REMARK ?? r.remark ?? "")).trim(),
            };
          }
        });

        if (active) {
          setRows(normalized);
        }
      } catch (err) {
        console.error("Failed to load repair gate pass data", err);
        if (active) {
          toast.error("Failed to load repair gate pass data");
          setRows([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [isHistory]);

  useEffect(() => {
    let mounted = true;

    const fetchProcessedFromPG = async () => {
      try {
        const res = await repairFollowupApi.getAll();

        if (!mounted || !Array.isArray(res?.data)) return;

        const keySet = new Set<string>();

        for (const row of res.data) {
          if (row.gate_pass_no && row.item_code) {
            keySet.add(`${row.gate_pass_no}|${row.item_code}`);
          }
        }

        setProcessedKeys(keySet);
      } catch (err) {
        console.error("Failed to fetch processed follow-ups", err);
      }
    };

    fetchProcessedFromPG();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter data based on search
  const query = search.trim().toLowerCase();
  const filteredRows = query
    ? rows.filter((row) => {
      if (isHistory) {
        return (
          (row.repair_gate_pass || "").toLowerCase().includes(query) ||
          (row.receive_gate_pass || "").toLowerCase().includes(query) ||
          (row.department || "").toLowerCase().includes(query) ||
          (row.partyname || "").toLowerCase().includes(query) ||
          (row.item_name || "").toLowerCase().includes(query) ||
          (row.item_code || "").toLowerCase().includes(query)
        );
      } else {
        return (
          (row.vrno || "").toLowerCase().includes(query) ||
          (row.department || "").toLowerCase().includes(query) ||
          (row.partyname || "").toLowerCase().includes(query) ||
          (row.item_name || "").toLowerCase().includes(query) ||
          (row.item_code || "").toLowerCase().includes(query)
        );
      }
    })
    : rows;

  // Pagination
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const currentPageNum = Math.min(currentPage, totalPages);
  const startIndex = (currentPageNum - 1) * PAGE_SIZE;
  const pageRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

  const isAlreadyFollowedUp = (row: GatePassRow) => {
    if (!row.vrno || !row.item_code) return false;
    return processedKeys.has(`${row.vrno}|${row.item_code}`);
  };

  // Today date in IST (YYYY-MM-DD)
  const todayDateIST = () => {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  };

  const formatDateIST = (dateStr?: string) => {
    if (!dateStr) return "";

    return new Date(dateStr).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  // Planned1 = Gate Pass Date + 1 day (IST safe)
  const plannedFromGatePassIST = (gatePassDate?: string) => {
    if (!gatePassDate) return "";

    const date = new Date(gatePassDate);
    date.setDate(date.getDate() + 1);

    return date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  };

  // Planned2 = (actual1 + lead_time) - 2 days (IST safe)
  const calculatePlanned2IST = (actual1: string, leadTime?: number) => {
    if (!actual1 || !leadTime || leadTime <= 0) return null;

    const date = new Date(actual1);
    date.setDate(date.getDate() + leadTime - 2);

    return date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  };

  const toISTDateOnly = (dateStr?: string) => {
    if (!dateStr) return null;

    const d = new Date(dateStr);

    return d.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata", // 🔥 IMPORTANT
    });
  };



  const handleFollowupSubmit = async () => {
    if (!selectedRow) return;

    const actual1Date = todayDateIST();
    const leadTimeNum = Number(leadTime);

    try {
      const payload = {
        // Gate pass source
        gate_pass_no: selectedRow.vrno,
        gate_pass_date: toISTDateOnly(selectedRow.vrdate),
        department: selectedRow.department,
        party_name: selectedRow.partyname,
        item_name: selectedRow.item_name,
        item_code: selectedRow.item_code,
        uom: selectedRow.um,
        qty_issued: selectedRow.qtyissued,
        remarks: selectedRow.remark,

        // Stage 1
        planned1: plannedFromGatePassIST(selectedRow.vrdate),
        actual1: actual1Date,
        lead_time: leadTimeNum,

        planned2: calculatePlanned2IST(actual1Date, leadTimeNum),

        stage1_status: "completed",
        gate_pass_status: null,
      };

      const res = await repairFollowupApi.create(payload);

      if (res?.success) {
        toast.success("Follow-up created successfully");
        setShowFollowupForm(false);
        setSelectedRow(null);
        setLeadTime("");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create follow-up");
    }
  };


  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <Heading
        heading={isHistory ? "Repair Gate Pass History" : "Repair Gate Pass Pending"}
        subtext={isHistory ? "Received repair gate pass records" : "Pending repair gate pass records"}
      >
        <FileText size={50} className="text-primary" />
      </Heading>

      <div className="mb-4 flex flex-wrap gap-2 sm:gap-3">
        <Link to="/store/repair-gate-pass" className="flex-shrink-0">
          <Button
            variant={!isHistory ? "default" : "outline"}
            className={!isHistory ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
            size="sm"
          >
            Pending
          </Button>
        </Link>
        <Link to="/store/repair-gate-pass/history" className="flex-shrink-0">
          <Button
            variant={isHistory ? "default" : "outline"}
            className={isHistory ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
            size="sm"
          >
            History
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className="mb-4 flex justify-end">
        <div className="w-full sm:w-[400px] md:w-[500px]">
          <Input
            placeholder={isHistory ? "Search: Repair Gate Pass / Receive Gate Pass / Department / Party / Item" : "Search: Gate Pass No / Department / Party / Item"}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Custom Table */}
      <div className="relative w-full">
        <div className="overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto border rounded-xl bg-white dark:bg-gray-900 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader className="animate-spin text-blue-600" size={24} />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading data...</span>
            </div>
          ) : pageRows.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <span className="text-gray-500 dark:text-gray-400">No data found</span>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse min-w-[1200px]">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-gray-800 shadow-sm">
                <tr>
                  {isHistory ? (
                    <>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Repair Gate Pass</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Receive Gate Pass</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Received Date</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Department</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Party Name</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Item Name</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Item Code</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Qty Received</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">UOM</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">App Remark</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Remark</th>
                    </>
                  ) : (
                    <>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Action</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Gate Pass No.</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Date</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Department</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Party Name</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Item Name</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Item Code</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Qty Issued</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">UOM</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">App Remark</th>
                      <th className="border-b px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Remark</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900">
                {pageRows.map((row, idx) => {
                  const isDisabled = isAlreadyFollowedUp(row);
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b transition-colors"
                    >
                      {isHistory ? (
                        <>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.repair_gate_pass || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.receive_gate_pass || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{formatDate(row.received_date)}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.department || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.partyname || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.item_name || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.item_code || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.qtyrecd ?? "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.um || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.app_remark || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{row.remark || "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className="border-b px-4 py-2 bg-green">
                            <Button
                              size="sm"
                              disabled={isDisabled}
                              onClick={() => {
                                if (isDisabled) return;
                                setSelectedRow(row);
                                setShowFollowupForm(true);
                              }}
                              className={
                                isDisabled
                                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              }
                            >
                              {isDisabled ? "Processed" : "Follow-up"}
                            </Button>
                          </td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.vrno || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{formatDate(row.vrdate)}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.department || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.partyname || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.item_name || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.item_code || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.qtyissued ?? "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.um || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100">{row.app_remark || "—"}</td>
                          <td className="border-b px-4 py-2 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{row.remark || "—"}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(startIndex + PAGE_SIZE, total)}</span> of{" "}
            <span className="font-semibold">{total.toLocaleString("en-IN")}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPageNum === 1}
            >
              Previous
            </Button>
            <span className="text-gray-600 dark:text-gray-400">
              Page <span className="font-semibold">{currentPageNum}</span> of{" "}
              <span className="font-semibold">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPageNum === totalPages}
            >
              Next
            </Button>
          </div>

          {showFollowupForm && selectedRow && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
                <h2 className="text-lg font-semibold mb-4">Repair Follow-up</h2>

                <div className="grid grid-cols-2 gap-4 text-sm">

                  <div>
                    <label>Gate Pass No</label>
                    <Input value={selectedRow.vrno || ""} disabled />
                  </div>

                  <div>
                    <label>Gate Pass Date</label>
                    <Input
                      value={formatDateIST(selectedRow.vrdate)}
                      disabled
                    />
                  </div>

                  <div>
                    <label>Department</label>
                    <Input value={selectedRow.department || ""} disabled />
                  </div>

                  <div>
                    <label>Party Name</label>
                    <Input value={selectedRow.partyname || ""} disabled />
                  </div>

                  <div>
                    <label>Item Name</label>
                    <Input value={selectedRow.item_name || ""} disabled />
                  </div>

                  <div>
                    <label>Item Code</label>
                    <Input value={selectedRow.item_code || ""} disabled />
                  </div>

                  <div>
                    <label>Qty Issued</label>
                    <Input value={selectedRow.qtyissued?.toString() || ""} disabled />
                  </div>

                  <div>
                    <label>UOM</label>
                    <Input value={selectedRow.um || ""} disabled />
                  </div>

                  <div>
                    <label>Remarks</label>
                    <Input value={selectedRow.remark || ""} disabled />
                  </div>

                  <div>
                    <label>Planned Date (Stage 1)</label>
                    <Input
                      value={plannedFromGatePassIST(selectedRow.vrdate)}
                      disabled
                    />
                  </div>

                  <div>
                    <label>Lead Time (Days)</label>
                    <Input
                      type="number"
                      value={leadTime}
                      onChange={(e) => setLeadTime(e.target.value)}
                    />
                  </div>

                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFollowupForm(false);
                      setSelectedRow(null);
                      setLeadTime("");
                    }}
                  >
                    Cancel
                  </Button>

                  <Button onClick={handleFollowupSubmit}>
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
