import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { storeApi } from "@/api/store/storeSystemApi";
import Heading from "../../components/element/Heading";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

type StoreIssueRow = {
  vrno: string;
  vrdate: string;
  requester: string;
  division: string;
  department: string;
  itemCode: string;
  itemName: string;
  qtyIssued: number;
  purpose: string;
};

const PAGE_SIZE = 50;

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (value: string): Date | null => {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const rebuilt = new Date(year, month, day);
  return Number.isNaN(rebuilt.getTime()) ? null : rebuilt;
};

const formatDate = (value: string): string => {
  const parsed = parseDate(value);
  if (!parsed) return value || "--";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function Itemissue() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StoreIssueRow[]>([]);
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("all");
  const [department, setDepartment] = useState("all");
  const [requester, setRequester] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    const fetchStoreIssue = async () => {
      setLoading(true);
      try {
        const response = await storeApi.getStoreIssue();
        if (!active) return;

        const source = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        const mapped = source.map((entry: Record<string, unknown>) => ({
          vrno: asText(entry.vrno ?? entry.VRNO),
          vrdate: asText(entry.vrdate ?? entry.VRDATE),
          requester: asText(entry.requester ?? entry.REQUESTER),
          division: asText(entry.division ?? entry.DIVISION),
          department: asText(entry.department ?? entry.DEPARTMENT),
          itemCode: asText(entry.item_code ?? entry.ITEM_CODE),
          itemName: asText(entry.item_name ?? entry.ITEM_NAME),
          qtyIssued: asNumber(entry.qtyissued ?? entry.QTYISSUED),
          purpose: asText(entry.purpose ?? entry.PURPOSE),
        }));

        setRows(mapped);
      } catch (error) {
        console.error("Failed to load store issue data", error);
        if (active) {
          toast.error("Failed to fetch Store Issue records");
          setRows([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchStoreIssue();
    return () => {
      active = false;
    };
  }, []);

  const divisionOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.division).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.department).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const requesterOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.requester).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const searchNeedle = search.trim().toLowerCase();
    const fromDateObj = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const toDateObj = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return rows.filter((row) => {
      if (division !== "all" && row.division !== division) return false;
      if (department !== "all" && row.department !== department) return false;
      if (requester !== "all" && row.requester !== requester) return false;

      const rowDate = parseDate(row.vrdate);
      if (fromDateObj && rowDate && rowDate < fromDateObj) return false;
      if (toDateObj && rowDate && rowDate > toDateObj) return false;

      if (!searchNeedle) return true;
      const searchText = [
        row.vrno,
        row.requester,
        row.division,
        row.department,
        row.itemCode,
        row.itemName,
        row.purpose,
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(searchNeedle);
    });
  }, [rows, search, division, department, requester, fromDate, toDate]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const visibleFrom = totalRows === 0 ? 0 : startIndex + 1;
  const visibleTo = totalRows === 0 ? 0 : Math.min(startIndex + PAGE_SIZE, totalRows);

  const resetFilters = () => {
    setSearch("");
    setDivision("all");
    setDepartment("all");
    setRequester("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const selectClassName =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="w-full space-y-5 p-4 md:p-6 lg:p-8">
      <Heading heading="Store Issue" subtext="View material issue transactions (MS)">
        <AlertTriangle size={46} className="text-primary" />
      </Heading>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-2">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Universal Search
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search all fields..."
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Division
            </p>
            <select
              value={division}
              onChange={(event) => {
                setDivision(event.target.value);
                setPage(1);
              }}
              className={selectClassName}
            >
              <option value="all">All Divisions</option>
              {divisionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Department
            </p>
            <select
              value={department}
              onChange={(event) => {
                setDepartment(event.target.value);
                setPage(1);
              }}
              className={selectClassName}
            >
              <option value="all">All Departments</option>
              {departmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Requester
            </p>
            <select
              value={requester}
              onChange={(event) => {
                setRequester(event.target.value);
                setPage(1);
              }}
              className={selectClassName}
            >
              <option value="all">All Requesters</option>
              {requesterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              From Date
            </p>
            <div className="relative">
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl pr-10"
              />
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              To Date
            </p>
            <div className="relative">
              <Input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl pr-10"
              />
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Button variant="outline" className="rounded-xl" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-semibold text-slate-600">
          Showing{" "}
          <span className="text-blue-700">{visibleFrom.toLocaleString("en-IN")}</span> -{" "}
          <span className="text-blue-700">{visibleTo.toLocaleString("en-IN")}</span> of{" "}
          <span className="text-slate-800">{totalRows.toLocaleString("en-IN")}</span> results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            className="h-9 w-9 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="h-9 w-9 rounded-xl"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[64vh] overflow-auto">
          <table className="min-w-[1280px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100/95">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3">VRNO</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Division</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-sm text-slate-500">
                    Loading store issue records...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-sm text-slate-500">
                    No Store Issue records found for selected filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={`${row.vrno}-${row.itemCode}-${index}`} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.vrno || "--"}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.vrdate)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {row.division || "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.department || "--"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.requester || "--"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        {row.itemCode || "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.itemName || "--"}</td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-xl font-bold leading-none text-slate-900">
                        {row.qtyIssued.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Units
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.purpose ? row.purpose : <span className="italic text-slate-400">No purpose specified</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
