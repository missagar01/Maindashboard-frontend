import { useCallback, useEffect, useRef, useState } from "react";

type Loader<T> = (options?: { signal?: AbortSignal }) => Promise<T>;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Unable to load analytics data.";
};

export const useTransportAnalyticsSection = <T,>(loader: Loader<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const nextData = await loader({ signal: controller.signal });
      if (!controller.signal.aborted) {
        setData(nextData);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [loader]);

  useEffect(() => {
    load();

    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  return {
    data,
    loading,
    error,
    retry: load,
  };
};
