import { useCallback, useEffect, useRef, useState } from "react";
import { getTransportReportData } from "../../../api/transport/reportApi";
import { ReportConfig } from "../config/reportConfig";

const DEFAULT_PAGE_SIZE = 10;

const getRecordKey = (record: any) =>
  record?.id ||
  record?.key ||
  record?.value ||
  record?.lr_bilty_id ||
  record?.lr_bilty_code ||
  null;

const mergeUniqueRecords = (existing: any[], incoming: any[]) => {
  const merged = [...existing];
  const seen = new Set(existing.map(getRecordKey).filter(Boolean));

  incoming.forEach((record) => {
    const recordKey = getRecordKey(record);

    if (recordKey && seen.has(recordKey)) {
      return;
    }

    if (recordKey) {
      seen.add(recordKey);
    }

    merged.push(record);
  });

  return merged;
};

const shouldUseClientPagination = ({
  page,
  requestedLimit,
  incomingLength,
  total,
  metadata,
}: {
  page: number;
  requestedLimit: number;
  incomingLength: number;
  total: number;
  metadata?: Record<string, any> | null;
}) => {
  if (page !== 1) {
    return false;
  }

  if (incomingLength <= requestedLimit || total <= requestedLimit) {
    return false;
  }

  const totalPages = Number(metadata?.totalPages || 0);
  const hasNextPage = Boolean(metadata?.hasNextPage);
  const reportedLimit = Number(metadata?.limit || 0);

  return (
    incomingLength > requestedLimit ||
    reportedLimit > requestedLimit ||
    (totalPages <= 1 && !hasNextPage)
  );
};

export const useTransportReport = (config: ReportConfig | null) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paginationModeRef = useRef<"server" | "client">("server");
  const allFetchedRecordsRef = useRef<any[]>([]);
  const isFetchingMoreRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (filters: Record<string, any>, page = 1, append = false) => {
      if (!config) return;
      const requestedLimit = Number(filters.limit || DEFAULT_PAGE_SIZE);

      if (append && paginationModeRef.current === "client") {
        if (isFetchingMoreRef.current) return;
        isFetchingMoreRef.current = true;
        setIsFetchingMore(true);

        const nextBatchSize = page * requestedLimit;
        const sliced = allFetchedRecordsRef.current.slice(0, nextBatchSize);

        setRecords(sliced);
        setTotalCount(allFetchedRecordsRef.current.length);
        setHasMore(sliced.length < allFetchedRecordsRef.current.length);
        setIsFetchingMore(false);
        isFetchingMoreRef.current = false;
        return;
      }

      if (!append) {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        setLoading(true);
        paginationModeRef.current = "server";
        allFetchedRecordsRef.current = [];
        setRecords([]);
      } else {
        if (isFetchingMoreRef.current) return;
        isFetchingMoreRef.current = true;
        setIsFetchingMore(true);
      }

      setError(null);
      try {
        const mergedFilters = {
          ...(config.defaultFilters || {}),
          ...filters,
        };

        const result = await getTransportReportData(
          config.serviceKey,
          {
            ...mergedFilters,
            page,
            limit: requestedLimit,
          },
          append ? undefined : abortControllerRef.current?.signal
        );

        const incoming = Array.isArray(result.records) ? result.records : [];
        const metadata = result.paginationMetadata || null;
        const total = Number(metadata?.total || result.count || incoming.length);

        if (
          shouldUseClientPagination({
            page,
            requestedLimit,
            incomingLength: incoming.length,
            total,
            metadata,
          })
        ) {
          paginationModeRef.current = "client";
          const uniqueRecords = mergeUniqueRecords([], incoming);
          allFetchedRecordsRef.current = uniqueRecords;
          const initialSlice = uniqueRecords.slice(0, requestedLimit);
          setRecords(initialSlice);
          setTotalCount(total || uniqueRecords.length);
          setHasMore(initialSlice.length < uniqueRecords.length);
        } else {
          const previousLength = allFetchedRecordsRef.current.length;
          const merged = append
            ? mergeUniqueRecords(allFetchedRecordsRef.current, incoming)
            : mergeUniqueRecords([], incoming);

          allFetchedRecordsRef.current = merged;
          setRecords(merged);
          setTotalCount(total);

          const derivedHasMore = merged.length < total;
          const apiHasMore =
            typeof metadata?.hasNextPage === "boolean"
              ? metadata.hasNextPage || derivedHasMore
              : derivedHasMore;

          setHasMore(append && merged.length === previousLength ? false : apiHasMore);
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") {
          return;
        }

        setError(err?.message || "Failed to fetch report data");
        setHasMore(false);
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
        isFetchingMoreRef.current = false;
      }
    },
    [config]
  );

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  return {
    records,
    loading,
    isFetchingMore,
    totalCount,
    hasMore,
    error,
    fetchData,
    resetRecords: () => {
      abortControllerRef.current?.abort();
      setRecords([]);
      setTotalCount(0);
      setHasMore(false);
      setError(null);
      paginationModeRef.current = "server";
      isFetchingMoreRef.current = false;
      allFetchedRecordsRef.current = [];
    },
  };
};
