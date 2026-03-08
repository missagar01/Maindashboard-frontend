"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useMemo, useState, type ReactNode } from "react";
import { Input } from "../ui/input";
import { Package } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchFields?: string[];
  dataLoading?: boolean;
  children?: ReactNode;
  className?: string;
}

function matchesSearch<TData>(
  row: TData,
  columnIds: string[],
  filterValue: string
) {
  if (!columnIds.length || !filterValue) return true;
  const needle = filterValue.toLowerCase();
  return columnIds.some((columnId) => {
    const value = (row as any)[columnId];
    return String(value ?? "").toLowerCase().includes(needle);
  });
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  searchFields = [],
  dataLoading,
  children,
  className,
}: DataTableProps<TData, TValue>) {
  const [searchTerm, setSearchTerm] = useState("");

  const searchableFields = useMemo(() => {
    if (searchFields.length) return searchFields;
    return columns
      .map((column) => {
        const key = (column as any).accessorKey;
        return typeof key === "string" ? key : undefined;
      })
      .filter(Boolean) as string[];
  }, [columns, searchFields]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredData = useMemo(() => {
    if (!normalizedSearch) return data;
    if (!searchableFields.length) return data;
    return data.filter((row) =>
      matchesSearch(row, searchableFields, normalizedSearch)
    );
  }, [data, searchableFields, normalizedSearch]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const matchedHeight = className?.match(/h-\[([^\]]+)\]/)?.[1];
  const scrollHeight = matchedHeight ?? "calc(100vh - 350px)";

  return (
    <div className="p-5 grid gap-4">
      {/* 🔍 Internal search (agar searchFields diye ho) */}
      <div className="flex gap-3 w-full">
        {searchFields.length !== 0 && (
          <div className="flex items-center w-full">
            <Input
              placeholder={`Search...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        )}
        {children && children}
      </div>

      {/* 🔁 Scroll container + sticky header */}
      <div className="relative w-full overflow-x-auto">
        <div
          className={cn(
            "rounded-sm border w-full overflow-hidden bg-white dark:bg-gray-900",
            className
          )}
        >
          <div 
            className="overflow-y-auto overflow-x-auto w-full"
            style={{ maxHeight: scrollHeight }}
          >
            <Table className="border-collapse min-w-full" style={{ minWidth: "800px" }}>
              <TableHeader className="sticky top-0 z-[100] bg-white dark:bg-gray-900 shadow-lg border-b-2 border-gray-300 dark:border-gray-600">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="bg-white dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-900 border-b-0"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="bg-white dark:bg-gray-900 font-semibold text-gray-900 dark:text-gray-100 text-[0.75rem] sm:text-xs md:text-sm uppercase tracking-wider whitespace-nowrap px-2 sm:px-3 md:px-4 py-2 sm:py-3 sticky top-0 z-[100]"
                        style={{ position: "sticky", top: 0, zIndex: 100 }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {dataLoading ? (
                  Array.from({ length: 15 }).map((_, i) => (
                    <TableRow
                      key={`skeleton-${i}`}
                      className="p-1 hover:bg-transparent"
                    >
                      {columns.map((_, j) => (
                        <TableCell key={`skeleton-cell-${j}`} className="px-2 sm:px-3 md:px-4">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="p-1"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="whitespace-nowrap px-2 sm:px-3 md:px-4 py-2 text-[0.75rem] sm:text-[0.85rem] md:text-sm"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={columns.length}
                      className="h-50 text-center text-xl"
                    >
                      <div className="flex flex-col justify-center items-center w-full gap-1">
                        <Package className="text-gray-400" size={50} />
                        <p className="text-muted-foreground font-semibold">
                          No Indents Found.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
