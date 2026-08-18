import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  Calendar,
  Download,
  FileStack,
  Loader,
  PackageCheck,
  Percent,
} from "lucide-react";
import { toast } from "sonner";

import { storeApi } from "@/api/store/storeSystemApi";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import StorePageShell from "./StorePageShell";
import { formatDate } from "../../utils/storeUtils";

type GrnReportRow = {
  DIVISION?: string;
  DEPARTMENT?: string;
  COST_CENTER?: string;
  GRN_DATE?: string;
  GRN_NO?: string;
  ITEM_NAME?: string;
  UM?: string;
  CHALLAN_QTY?: number;
  ACCEPTED_QTY?: number;
  NET_MATERIAL_VALUE?: number;
  BILL_PASS_AMOUNT?: number;
  TOTAL_TAX_VALUE?: number;
};

type GrnReportRange = {
  fromDate: string;
  toDate: string;
};

type DateDisplayInputProps = {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
};

function getFirstDayOfCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const DEFAULT_FROM_DATE = getFirstDayOfCurrentMonth();
const DEFAULT_TO_DATE = new Date().toISOString().slice(0, 10);

const numberFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatQuantity(value?: number) {
  if (value === undefined || value === null) {
    return "0";
  }

  return numberFormatter.format(Number(value) || 0);
}

function formatPlainCurrency(value?: number) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "₹ 0.00";
  }

  return `₹ ${amount.toFixed(2)}`;
}

function DateDisplayInput({ label, value, min, max, onChange }: DateDisplayInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
        {label}
      </label>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 cursor-pointer border-slate-200 bg-white pl-10 pr-10 text-transparent caret-transparent [color-scheme:light] sm:h-11"
        />
        <span className="pointer-events-none absolute inset-y-0 left-10 right-10 flex items-center text-sm font-semibold text-slate-900">
          {formatDate(value)}
        </span>
      </div>
    </div>
  );
}

export default function GrnReport() {
  const [rows, setRows] = useState<GrnReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [fromDate, setFromDate] = useState(DEFAULT_FROM_DATE);
  const [toDate, setToDate] = useState(DEFAULT_TO_DATE);
  const [appliedRange, setAppliedRange] = useState<GrnReportRange>({
    fromDate: DEFAULT_FROM_DATE,
    toDate: DEFAULT_TO_DATE,
  });
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = useCallback(async (range: GrnReportRange) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await storeApi.getGrnReport(range.fromDate, range.toDate);

      if (response?.success && Array.isArray(response.data)) {
        setRows(response.data as GrnReportRow[]);
      } else {
        setRows([]);
      }

      setAppliedRange(range);
    } catch (error) {
      console.error("Failed to fetch GRN report data:", error);
      setRows([]);
      setErrorMessage("Failed to load GRN report data for the selected date range.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData({ fromDate: DEFAULT_FROM_DATE, toDate: DEFAULT_TO_DATE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    if (!fromDate || !toDate) {
      setErrorMessage("Please select both From Date and To Date.");
      return;
    }

    if (fromDate > toDate) {
      setErrorMessage("From Date cannot be greater than To Date.");
      return;
    }

    void fetchData({ fromDate, toDate });
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const blob = await storeApi.downloadGrnReport(appliedRange.fromDate, appliedRange.toDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grn-report-${appliedRange.fromDate}-to-${appliedRange.toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download GRN report Excel:", error);
      toast.error("Unable to download the file right now.");
    } finally {
      setDownloading(false);
    }
  };

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.totalRecords += 1;
        acc.totalNetMaterialValue += Number(row.NET_MATERIAL_VALUE || 0);
        acc.totalBillPassAmount += Number(row.BILL_PASS_AMOUNT || 0);
        acc.totalTaxValue += Number(row.TOTAL_TAX_VALUE || 0);
        return acc;
      },
      {
        totalRecords: 0,
        totalNetMaterialValue: 0,
        totalBillPassAmount: 0,
        totalTaxValue: 0,
      }
    );
  }, [rows]);

  return (
    <StorePageShell
      icon={<FileStack size={42} className="text-primary" />}
      heading="GRN Report"
      subtext={`Item-wise GRN value & tax report from ${formatDate(appliedRange.fromDate)} to ${formatDate(appliedRange.toDate)}`}
      containerClassName="space-y-3 px-0 py-3 sm:p-4 md:p-6 lg:p-10 lg:space-y-6"
      contentCardClassName="rounded-none border-0 bg-transparent py-0 shadow-none lg:rounded-xl lg:border lg:bg-white lg:py-6 lg:shadow-sm"
      contentClassName="space-y-3 px-0 sm:px-4 lg:space-y-4 lg:px-6"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:rounded-2xl sm:p-4">
          <div className="grid gap-2 sm:gap-3 lg:grid-cols-[180px_180px_auto_auto] lg:items-end">
            <DateDisplayInput label="From Date" value={fromDate} max={toDate} onChange={setFromDate} />

            <DateDisplayInput
              label="To Date"
              value={toDate}
              min={fromDate}
              onChange={setToDate}
            />

            <Button
              onClick={handleApplyFilters}
              disabled={loading}
              className="h-10 bg-blue-500 px-5 text-white hover:bg-slate-800 sm:h-11 sm:px-6"
            >
              Filter
            </Button>

            <Button
              onClick={handleDownload}
              disabled={downloading || loading || rows.length === 0}
              className="h-10 bg-green-600 px-5 text-white hover:bg-green-700 sm:h-11 sm:px-6"
            >
              {downloading ? (
                <div className="flex items-center gap-2">
                  <Loader className="animate-spin" size={14} />
                  Downloading...
                </div>
              ) : (
                <>
                  <Download size={16} className="mr-2" />
                  Excel
                </>
              )}
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
          <Card className="border border-blue-100 bg-white py-0 shadow-none">
            <CardContent className="flex items-start justify-between gap-2 p-3 sm:items-center sm:p-4">
              <div className="min-w-0 space-y-2 sm:space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
                  Total Records
                </p>
                <div className="inline-flex max-w-full rounded-lg bg-blue-50 px-2.5 py-2 text-lg font-black leading-none text-blue-700 sm:rounded-xl sm:px-4 sm:text-3xl">
                  {summary.totalRecords}
                </div>
              </div>
              <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600 sm:rounded-2xl sm:p-3">
                <PackageCheck className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-emerald-100 bg-white py-0 shadow-none">
            <CardContent className="flex items-start justify-between gap-2 p-3 sm:items-center sm:p-4">
              <div className="min-w-0 space-y-2 sm:space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
                  Net Material Value
                </p>
                <div className="inline-flex max-w-full rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-black leading-tight text-emerald-700 sm:rounded-xl sm:px-4 sm:text-2xl">
                  {formatPlainCurrency(summary.totalNetMaterialValue)}
                </div>
              </div>
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-600 sm:rounded-2xl sm:p-3">
                <BadgeIndianRupee className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-violet-100 bg-white py-0 shadow-none">
            <CardContent className="flex items-start justify-between gap-2 p-3 sm:items-center sm:p-4">
              <div className="min-w-0 space-y-2 sm:space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
                  Bill Pass Amount
                </p>
                <div className="inline-flex max-w-full rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] font-black leading-tight text-violet-700 sm:rounded-xl sm:px-4 sm:text-2xl">
                  {formatPlainCurrency(summary.totalBillPassAmount)}
                </div>
              </div>
              <div className="rounded-xl bg-violet-100 p-2.5 text-violet-600 sm:rounded-2xl sm:p-3">
                <BadgeIndianRupee className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-orange-100 bg-white py-0 shadow-none">
            <CardContent className="flex items-start justify-between gap-2 p-3 sm:items-center sm:p-4">
              <div className="min-w-0 space-y-2 sm:space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
                  Total Tax Value
                </p>
                <div className="inline-flex max-w-full rounded-lg bg-orange-50 px-2.5 py-2 text-[11px] font-black leading-tight text-orange-700 sm:rounded-xl sm:px-4 sm:text-2xl">
                  {formatPlainCurrency(summary.totalTaxValue)}
                </div>
              </div>
              <div className="rounded-xl bg-orange-100 p-2.5 text-orange-600 sm:rounded-2xl sm:p-3">
                <Percent className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-slate-500 sm:rounded-2xl sm:py-14">
            Loading GRN report data...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center sm:rounded-2xl sm:py-14">
            <p className="text-lg font-bold text-slate-700">No GRN records found</p>
            <p className="mt-2 text-sm text-slate-500">
              Try changing the selected date range, then click Filter.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block">
              <table className="min-w-[1500px] text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Division</th>
                    <th className="px-4 py-3 text-left font-bold">Department</th>
                    <th className="px-4 py-3 text-left font-bold">Cost Center</th>
                    <th className="px-4 py-3 text-left font-bold">GRN Date</th>
                    <th className="px-4 py-3 text-left font-bold">GRN No.</th>
                    <th className="px-4 py-3 text-left font-bold">Item</th>
                    <th className="px-4 py-3 text-left font-bold">UM</th>
                    <th className="px-4 py-3 text-right font-bold">Challan Qty</th>
                    <th className="px-4 py-3 text-right font-bold">Accepted Qty</th>
                    <th className="px-4 py-3 text-right font-bold">Net Material Value</th>
                    <th className="px-4 py-3 text-right font-bold">Bill Pass Amount</th>
                    <th className="px-4 py-3 text-right font-bold">Total Tax Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={`${row.GRN_NO || "grn"}-${row.ITEM_NAME || ""}-${index}`}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">{row.DIVISION || "-"}</td>
                      <td className="px-4 py-3">{row.DEPARTMENT || "-"}</td>
                      <td className="px-4 py-3">{row.COST_CENTER || "-"}</td>
                      <td className="px-4 py-3">{formatDate(row.GRN_DATE)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.GRN_NO || "-"}</td>
                      <td className="px-4 py-3">{row.ITEM_NAME || "-"}</td>
                      <td className="px-4 py-3">{row.UM || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex min-w-[88px] justify-end rounded-lg bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                          {formatQuantity(row.CHALLAN_QTY)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex min-w-[88px] justify-end rounded-lg bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                          {formatQuantity(row.ACCEPTED_QTY)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex min-w-[128px] justify-end rounded-lg bg-teal-50 px-3 py-1 font-semibold text-teal-700">
                          {formatPlainCurrency(row.NET_MATERIAL_VALUE)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex min-w-[128px] justify-end rounded-lg bg-violet-50 px-3 py-1 font-semibold text-violet-700">
                          {formatPlainCurrency(row.BILL_PASS_AMOUNT)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex min-w-[100px] justify-end rounded-lg bg-orange-50 px-3 py-1 font-semibold text-orange-700">
                          {formatPlainCurrency(row.TOTAL_TAX_VALUE)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:hidden">
              {rows.map((row, index) => (
                <Card
                  key={`${row.GRN_NO || "grn"}-${row.ITEM_NAME || ""}-${index}`}
                  className="overflow-hidden border border-slate-200 py-0 shadow-none"
                >
                  <CardContent className="space-y-3 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          GRN No.
                        </p>
                        <p className="mt-1 text-sm font-black text-slate-900 sm:text-base">
                          {row.GRN_NO || "-"}
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        {formatDate(row.GRN_DATE)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          Item
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-800">
                          {row.ITEM_NAME || "-"} {row.UM ? `(${row.UM})` : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          Division / Dept
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-800">
                          {row.DIVISION || "-"} / {row.DEPARTMENT || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          Cost Center
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-800">
                          {row.COST_CENTER || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2">
                      <div className="rounded-lg bg-amber-50 p-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-500">
                          Challan Qty
                        </p>
                        <p className="mt-1 text-xs font-black leading-none text-amber-700 sm:text-sm">
                          {formatQuantity(row.CHALLAN_QTY)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-500">
                          Accepted Qty
                        </p>
                        <p className="mt-1 text-xs font-black leading-none text-emerald-700 sm:text-sm">
                          {formatQuantity(row.ACCEPTED_QTY)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-teal-50 p-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-teal-500">
                          Net Material Value
                        </p>
                        <p className="mt-1 break-all text-xs font-black leading-tight text-teal-700 sm:text-sm">
                          {formatPlainCurrency(row.NET_MATERIAL_VALUE)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-violet-50 p-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-violet-500">
                          Bill Pass
                        </p>
                        <p className="mt-1 break-all text-xs font-black leading-tight text-violet-700 sm:text-sm">
                          {formatPlainCurrency(row.BILL_PASS_AMOUNT)}
                        </p>
                      </div>
                      <div className="col-span-2 rounded-lg bg-orange-50 p-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-orange-500">
                          Total Tax Value
                        </p>
                        <p className="mt-1 break-all text-xs font-black leading-tight text-orange-700 sm:text-sm">
                          {formatPlainCurrency(row.TOTAL_TAX_VALUE)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </StorePageShell>
  );
}
