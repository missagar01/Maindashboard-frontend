"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Download,
  Hash,
  Loader2,
  RefreshCw,
  Search,
  Truck,
  Users,
} from "lucide-react";
import * as o2dAPI from "../../api/o2dAPI";
import * as XLSX from "xlsx";

type VehicleApiRow = Record<string, unknown>;

type VehicleRow = {
  orderVrno: string;
  staffName: string;
  partyName: string;
  truckNo: string;
  qtyOrder: number;
  itemGroup: string;
};

const getField = (row: VehicleApiRow, key: string) =>
  row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()] ?? "";

const normalizeRow = (row: VehicleApiRow): VehicleRow => ({
  orderVrno: String(getField(row, "order_vrno") || "").trim(),
  staffName: String(getField(row, "our_staff_name") || "").trim(),
  partyName: String(getField(row, "party_name") || "").trim(),
  truckNo: String(getField(row, "truckno") || "").trim(),
  qtyOrder: Number(getField(row, "qtyorder") || 0),
  itemGroup: String(getField(row, "item_group") || "").trim(),
});

const formatQuantity = (value: number) =>
  value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to load today's vehicles";
};

export function TodaysVehiclePage() {
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchVehicles = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await o2dAPI.getTodaysVehicles();
      const payload = response.data;

      if (!payload?.success || !Array.isArray(payload.data)) {
        throw new Error(payload?.message || "Unable to fetch today's vehicles");
      }

      setRows(payload.data.map((row: VehicleApiRow) => normalizeRow(row)));
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      [row.orderVrno, row.staffName, row.partyName, row.truckNo, row.itemGroup]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const totalQty = filteredRows.reduce((sum, row) => sum + row.qtyOrder, 0);
    const uniqueStaff = new Set(filteredRows.map((row) => row.staffName).filter(Boolean)).size;
    const uniqueParties = new Set(filteredRows.map((row) => row.partyName).filter(Boolean)).size;

    return {
      totalVehicles: filteredRows.length,
      totalQty,
      uniqueStaff,
      uniqueParties,
    };
  }, [filteredRows]);

  const handleDownload = useCallback(() => {
    if (!filteredRows.length) return;

    const exportRows = filteredRows.map((row, index) => ({
      "S.No": index + 1,
      "Order No": row.orderVrno || "-",
      "Our Staff Name": row.staffName || "-",
      "Party Name": row.partyName || "-",
      "Truck No": row.truckNo || "-",
      "Qty Order": Number(row.qtyOrder || 0),
      "Item Group": row.itemGroup || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 24 },
      { wch: 36 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Todays Vehicles");
    XLSX.writeFile(
      workbook,
      `o2d_todays_vehicles_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }, [filteredRows]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Loading today&apos;s vehicles...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_34%),linear-gradient(180deg,_#f8fbff_0%,_#eef6ff_100%)] p-4 sm:p-6 xl:p-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="min-w-0 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">
                Total Vehicles
              </span>
              <Truck className="h-4 w-4 text-sky-600 sm:h-5 sm:w-5" />
            </div>
            <div className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">{stats.totalVehicles}</div>
          </div>
          <div className="min-w-0 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">
                Total Qty
              </span>
              <Hash className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" />
            </div>
            <div className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">
              {formatQuantity(stats.totalQty)}
            </div>
          </div>
          <div className="min-w-0 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">
                Staff Count
              </span>
              <Users className="h-4 w-4 text-violet-600 sm:h-5 sm:w-5" />
            </div>
            <div className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">{stats.uniqueStaff}</div>
          </div>
          <div className="min-w-0 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">
                Party Count
              </span>
              <Boxes className="h-4 w-4 text-amber-600 sm:h-5 sm:w-5" />
            </div>
            <div className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">{stats.uniqueParties}</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white/90 shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 sm:text-xl">Vehicle Queue</h2>
                <p className="text-sm text-slate-500">
                  {filteredRows.length} records visible out of {rows.length}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl lg:justify-end">
                <div className="relative w-full sm:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search order, staff, party, truck, item..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!filteredRows.length}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="px-4 py-10 sm:px-6">
              <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
                <h3 className="text-sm font-bold uppercase tracking-[0.16em]">Data Load Failed</h3>
                <p className="mt-2 text-sm">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchVehicles(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="px-4 py-12 text-center sm:px-6">
              <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                <Truck className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-4 text-lg font-black text-slate-900">No vehicles found</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {search
                    ? "Current search filter ke hisaab se koi record match nahi hua."
                    : "Aaj ke liye weighbridge se koi vehicle record available nahi mila."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
                {filteredRows.map((row, index) => (
                  <article
                    key={`${row.orderVrno}-${index}`}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Order No
                        </div>
                        <div className="truncate text-lg font-black text-slate-900">
                          {row.orderVrno || "-"}
                        </div>
                      </div>
                      <div className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold text-sky-700">
                        #{index + 1}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Our Staff
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {row.staffName || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Qty Order
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {formatQuantity(row.qtyOrder)}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Party Name
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {row.partyName || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Truck No
                        </div>
                        <div className="mt-1 text-sm font-semibold text-sky-700">
                          {row.truckNo || "-"}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Item Group
                        </div>
                        <div className="mt-1 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          {row.itemGroup || "-"}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full table-fixed border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        S.No
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Order No
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Our Staff Name
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Party Name
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Truck No
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Qty Order
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Item Group
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, index) => (
                      <tr
                        key={`${row.orderVrno}-${index}`}
                        className="border-t border-slate-100 transition hover:bg-sky-50/60"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-slate-900">
                          {row.orderVrno || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                          {row.staffName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                          {row.partyName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-sky-700">
                          {row.truckNo || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                          {formatQuantity(row.qtyOrder)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            {row.itemGroup || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
