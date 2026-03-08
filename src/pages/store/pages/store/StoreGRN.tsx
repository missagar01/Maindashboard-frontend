import { useEffect, useMemo, useState } from "react";
import { Loader, FileText, CheckCircle } from "lucide-react";
import Heading from "../../components/element/Heading";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { storeGRNApi } from "@/api/store/storeGRNApi";
import { storeGRNApprovalApi } from "@/api/store/storeGRNApprovalApi";

/* ================= TYPES ================= */

type StoreGRNRow = {
    PLANNEDDATE?: string;
    VRNO?: string;
    VRDATE?: string;
    PARTYNAME?: string;
    PARTYBILLNO?: string;
    PARTYBILLAMT?: number;
    sended_bill?: boolean;
};

/* ================= HELPERS ================= */

function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB");
}

/* ================= COMPONENT ================= */

export default function StoreGRN() {
    const [rows, setRows] = useState<StoreGRNRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
    const [processingGrn, setProcessingGrn] = useState<string | null>(null);

    /* ================= FETCH ORACLE DATA ================= */

    useEffect(() => {
        let active = true;

        const fetchGRN = async () => {
            setLoading(true);
            try {
                const res = await storeGRNApi.getPending();
                if (!active) return;

                if (res?.success) {
                    setRows(res.data || []);
                } else {
                    toast.error("Failed to load Store GRN data");
                }
            } catch (err) {
                console.error(err);
                toast.error("Error fetching Store GRN data");
            } finally {
                setLoading(false);
            }
        };

        fetchGRN();
        return () => {
            active = false;
        };
    }, []);

    /* ================= SEND BILL ================= */

    const handleSendBill = async (row: StoreGRNRow) => {
        if (!row.VRNO) return;

        const confirmed = window.confirm(
            `Are you sure you want to send bill for GRN ${row.VRNO}?`
        );
        if (!confirmed) return;

        setProcessingGrn(row.VRNO);

        try {
            await storeGRNApprovalApi.sendBill({
                planned_date: row.PLANNEDDATE,
                grn_no: row.VRNO,
                grn_date: row.VRDATE,
                party_name: row.PARTYNAME,
                party_bill_no: row.PARTYBILLNO,
                party_bill_amount: row.PARTYBILLAMT,
            });


            toast.success("Bill sent successfully");

            // 🔥 Move row to history locally
            setRows((prev) =>
                prev.map((r) =>
                    r.VRNO === row.VRNO ? { ...r, sended_bill: true } : r
                )
            );
        } catch (err) {
            console.error(err);
            toast.error("Failed to send bill");
        } finally {
            setProcessingGrn(null);
        }
    };

    /* ================= FILTERING ================= */

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return rows.filter((r) => {
            const matchesTab =
                activeTab === "pending" ? !r.sended_bill : r.sended_bill;

            const matchesSearch =
                !q ||
                r.VRNO?.toLowerCase().includes(q) ||
                r.PARTYNAME?.toLowerCase().includes(q) ||
                r.PARTYBILLNO?.toLowerCase().includes(q);

            return matchesTab && matchesSearch;
        });
    }, [rows, search, activeTab]);

    /* ================= UI ================= */

    return (
        <div className="w-full p-4 md:p-6 lg:p-8">
            <Heading
                heading="Store GRN"
                subtext="Pending & History GRN processing"
            >
                <FileText size={48} className="text-primary" />
            </Heading>

            {/* TABS */}
            <div className="flex gap-2 mb-4">
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

            {/* SEARCH */}
            <div className="mb-4 flex justify-end">
                <Input
                    className="w-full max-w-md"
                    placeholder="Search GRN / Party / Bill No"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* TABLE */}
            <div className="relative overflow-x-auto border rounded-xl bg-white shadow-sm">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader className="animate-spin" />
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        No records found
                    </div>
                ) : (
                    <table className="w-full min-w-[1200px] text-sm">
                        <thead className="bg-slate-100 border-b">
                            <tr>
                                <th className="px-3 py-2 text-center">Action</th>
                                <th className="px-3 py-2">Planned Date</th>
                                <th className="px-3 py-2">GRN No</th>
                                <th className="px-3 py-2">GRN Date</th>
                                <th className="px-3 py-2">Party Name</th>
                                <th className="px-3 py-2">Bill No</th>
                                <th className="px-3 py-2 text-right">Bill Amount</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRows.map((row) => (
                                <tr key={row.VRNO} className="border-b even:bg-gray-50">
                                    <td className="px-3 py-2 text-center">
                                        {row.sended_bill ? (
                                            <CheckCircle className="text-green-600 mx-auto" />
                                        ) : (
                                            <Button
                                                size="sm"
                                                disabled={processingGrn === row.VRNO}
                                                onClick={() => handleSendBill(row)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                {processingGrn === row.VRNO
                                                    ? "Sending..."
                                                    : "Sended Bill"}
                                            </Button>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">{row.PLANNEDDATE || "—"}</td>
                                    <td className="px-3 py-2 font-medium">{row.VRNO}</td>
                                    <td className="px-3 py-2">{formatDate(row.VRDATE)}</td>
                                    <td className="px-3 py-2">{row.PARTYNAME}</td>
                                    <td className="px-3 py-2">{row.PARTYBILLNO}</td>
                                    <td className="px-3 py-2 text-right">
                                        {row.PARTYBILLAMT?.toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
