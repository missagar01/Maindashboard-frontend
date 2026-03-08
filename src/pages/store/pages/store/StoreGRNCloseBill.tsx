import { useEffect, useMemo, useState } from "react";
import { Loader, Lock } from "lucide-react";
import Heading from "../../components/element/Heading";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { storeGRNApprovalApi } from "@/api/store/storeGRNApprovalApi";

/* ================= TYPES ================= */

type StoreGRNRow = {
    planned_date?: string;
    grn_no?: string;
    grn_date?: string;
    party_name?: string;
    party_bill_no?: string;
    party_bill_amount?: number;

    sended_bill?: boolean;
    approved_by_admin?: boolean;
    approved_by_gm?: boolean;
    close_bill?: boolean;
};

/* ================= HELPERS ================= */

function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB");
}

/* ================= COMPONENT ================= */

export default function StoreGRNCloseBill() {
    const [rows, setRows] = useState<StoreGRNRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
    const [processingGrn, setProcessingGrn] = useState<string | null>(null);

    /* ================= FETCH PG DATA ================= */

    useEffect(() => {
        let active = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await storeGRNApprovalApi.getAll();
                if (!active) return;

                if (res?.success) {
                    setRows((res.data as StoreGRNRow[]) || []);
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

        fetchData();
        return () => {
            active = false;
        };
    }, []);

    /* ================= CLOSE BILL ================= */

    const handleCloseBill = async (row: StoreGRNRow) => {
        if (!row.grn_no) return;

        const confirmed = window.confirm(
            `Are you sure you want to close bill for GRN ${row.grn_no}?`
        );
        if (!confirmed) return;

        setProcessingGrn(row.grn_no);

        try {
            await storeGRNApprovalApi.closeBill(row.grn_no);
            toast.success("Bill closed successfully");

            setRows((prev) =>
                prev.map((r) =>
                    r.grn_no === row.grn_no
                        ? { ...r, close_bill: true }
                        : r
                )
            );
        } catch (err) {
            console.error(err);
            toast.error("Failed to close bill");
        } finally {
            setProcessingGrn(null);
        }
    };

    /* ================= FILTERING ================= */

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return rows.filter((r) => {
            const matchesTab =
                activeTab === "pending"
                    ? r.sended_bill &&
                    r.approved_by_admin &&
                    r.approved_by_gm &&
                    !r.close_bill
                    : r.close_bill;

            const matchesSearch =
                !q ||
                r.grn_no?.toLowerCase().includes(q) ||
                r.party_name?.toLowerCase().includes(q) ||
                r.party_bill_no?.toLowerCase().includes(q);

            return matchesTab && matchesSearch;
        });
    }, [rows, search, activeTab]);

    /* ================= UI ================= */

    return (
        <div className="w-full p-4 md:p-6 lg:p-8">
            <Heading
                heading="Store GRN – Close Bill"
                subtext="Final closure of GRN bills"
            >
                <Lock size={48} className="text-primary" />
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
                    <table className="w-full min-w-[1400px] text-sm">
                        <thead className="bg-slate-100 border-b">
                            <tr>
                                <th className="px-3 py-2 text-center">Action</th>
                                <th className="px-3 py-2">Planned Date</th>
                                <th className="px-3 py-2">GRN No</th>
                                <th className="px-3 py-2">GRN Date</th>
                                <th className="px-3 py-2">Party Name</th>
                                <th className="px-3 py-2">Bill No</th>
                                <th className="px-3 py-2 text-right">Bill Amount</th>
                                <th className="px-3 py-2 text-center">Sended Bill</th>
                                <th className="px-3 py-2 text-center">Admin Approved</th>
                                <th className="px-3 py-2 text-center">GM Approved</th>
                                {activeTab === "history" && (
                                    <th className="px-3 py-2 text-center">Closed</th>
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRows.map((row) => (
                                <tr key={row.grn_no} className="border-b even:bg-gray-50">
                                    <td className="px-3 py-2 text-center">
                                        {activeTab === "pending" ? (
                                            <Button
                                                size="sm"
                                                disabled={processingGrn === row.grn_no}
                                                onClick={() => handleCloseBill(row)}
                                                className="bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                {processingGrn === row.grn_no
                                                    ? "Closing..."
                                                    : "Close Bill"}
                                            </Button>
                                        ) : (
                                            <span className="text-green-600 font-medium">
                                                Closed
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-3 py-2">{formatDate(row.planned_date)}</td>
                                    <td className="px-3 py-2 font-medium">{row.grn_no}</td>
                                    <td className="px-3 py-2">{formatDate(row.grn_date)}</td>
                                    <td className="px-3 py-2">{row.party_name}</td>
                                    <td className="px-3 py-2">{row.party_bill_no}</td>
                                    <td className="px-3 py-2 text-right">
                                        {row.party_bill_amount?.toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {row.sended_bill ? "Yes" : "No"}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {row.approved_by_admin ? "Yes" : "No"}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {row.approved_by_gm ? "Yes" : "No"}
                                    </td>
                                    {activeTab === "history" && (
                                        <td className="px-3 py-2 text-center">
                                            {row.close_bill ? "Yes" : "No"}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
