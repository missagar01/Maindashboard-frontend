import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { storeApi } from '@/api/store/storeSystemApi';

type LazyDatasetKey =
  | 'pendingIndents'
  | 'historyIndents'
  | 'poPending'
  | 'poHistory'
  | 'repairPending'
  | 'repairHistory'
  | 'returnableDetails';

type RepairGatePassCounts = {
  pending?: number;
  history?: number;
} | null;

type ReturnableStats = {
  TOTAL_COUNT?: number;
  RETURNABLE_COUNT?: number;
  NON_RETURNABLE_COUNT?: number;
  RETURNABLE_COMPLETED_COUNT?: number;
  RETURNABLE_PENDING_COUNT?: number;
} | null;

interface StoreDashboardData {
  pendingIndents: any[];
  historyIndents: any[];
  poPending: any[];
  poHistory: any[];
  repairPending: any[];
  repairHistory: any[];
  returnableDetails: any[];
  dashboardSummary: any | null;
  repairGatePassCounts: RepairGatePassCounts;
  returnableStats: ReturnableStats;
  allVendors: { vendorName: string }[];
  allProducts: { itemName: string }[];
}

interface StoreDashboardContextType extends StoreDashboardData {
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
  loadDataset: (dataset: LazyDatasetKey) => Promise<any[]>;
  loadedDatasets: Record<LazyDatasetKey, boolean>;
}

const initialState: StoreDashboardData = {
  pendingIndents: [],
  historyIndents: [],
  poPending: [],
  poHistory: [],
  repairPending: [],
  repairHistory: [],
  returnableDetails: [],
  dashboardSummary: null,
  repairGatePassCounts: null,
  returnableStats: null,
  allVendors: [],
  allProducts: [],
};

const initialLoadedDatasets: Record<LazyDatasetKey, boolean> = {
  pendingIndents: false,
  historyIndents: false,
  poPending: false,
  poHistory: false,
  repairPending: false,
  repairHistory: false,
  returnableDetails: false,
};

const StoreDashboardContext = createContext<StoreDashboardContextType | undefined>(undefined);

const DATASET_CONFIG: Record<LazyDatasetKey, () => Promise<any>> = {
  pendingIndents: () => storeApi.getPendingIndents(),
  historyIndents: () => storeApi.getHistoryIndents(),
  poPending: () => storeApi.getPoPending(),
  poHistory: () => storeApi.getPoHistory(),
  repairPending: () => storeApi.getRepairGatePassPending(),
  repairHistory: () => storeApi.getRepairGatePassReceived(),
  returnableDetails: () => storeApi.getReturnableDetails(),
};

const extractArray = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data && Array.isArray(res.data)) return res.data;
  return [];
};

const normalizeVendorList = (rows: any[]): { vendorName: string }[] => {
  const seen = new Set<string>();
  const list: { vendorName: string }[] = [];

  rows.forEach((row) => {
    const raw = row?.vendorName || row?.VENDOR_NAME || row?.vendor_name || row?.ACC_NAME || row?.acc_name || '';
    const name = String(raw).trim();
    if (!name) return;

    const key = name.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ vendorName: name });
  });

  return list.sort((a, b) => a.vendorName.localeCompare(b.vendorName));
};

const normalizeProductList = (rows: any[]): { itemName: string }[] => {
  const seen = new Set<string>();
  const list: { itemName: string }[] = [];

  rows.forEach((row) => {
    const raw = row?.itemName || row?.PRODUCT_NAME || row?.product_name || row?.ITEM_NAME || row?.item_name || '';
    const name = String(raw).trim();
    if (!name) return;

    const key = name.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ itemName: name });
  });

  return list.sort((a, b) => a.itemName.localeCompare(b.itemName));
};

export const useStoreDashboard = () => {
  const context = useContext(StoreDashboardContext);
  if (!context) {
    throw new Error('useStoreDashboard must be used within a StoreDashboardProvider');
  }
  return context;
};

export const StoreDashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<StoreDashboardData>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedDatasets, setLoadedDatasets] = useState<Record<LazyDatasetKey, boolean>>(initialLoadedDatasets);
  const dataRef = useRef<StoreDashboardData>(initialState);
  const loadedDatasetsRef = useRef<Set<LazyDatasetKey>>(new Set());
  const pendingDatasetLoadsRef = useRef<Map<LazyDatasetKey, Promise<any[]>>>(new Map());

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const loadDataset = useCallback(async (dataset: LazyDatasetKey) => {
    if (loadedDatasetsRef.current.has(dataset)) {
      return dataRef.current[dataset];
    }

    const pendingLoad = pendingDatasetLoadsRef.current.get(dataset);
    if (pendingLoad) {
      return pendingLoad;
    }

    const loadPromise = (async () => {
      const response = await DATASET_CONFIG[dataset]();
      const rows = extractArray(response);

      loadedDatasetsRef.current.add(dataset);
      setLoadedDatasets((prev) => ({
        ...prev,
        [dataset]: true,
      }));
      setData((prev) => ({
        ...prev,
        [dataset]: rows,
      }));

      return rows;
    })();

    pendingDatasetLoadsRef.current.set(dataset, loadPromise);

    try {
      return await loadPromise;
    } finally {
      pendingDatasetLoadsRef.current.delete(dataset);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    loadedDatasetsRef.current.clear();
    pendingDatasetLoadsRef.current.clear();
    setLoadedDatasets(initialLoadedDatasets);

    try {
      const results = await Promise.allSettled([
        storeApi.getStoreIndentDashboard(),    // 0
        storeApi.getRepairGatePassCounts(),    // 1
        storeApi.getReturnableStats(),         // 2
      ]);

      const get = (result: PromiseSettledResult<any>) =>
        result.status === 'fulfilled' ? result.value : null;

      setData({
        ...initialState,
        dashboardSummary: get(results[0])?.data ?? get(results[0]) ?? null,
        repairGatePassCounts: get(results[1])?.data ?? get(results[1]) ?? null,
        returnableStats: get(results[2])?.data ?? get(results[2]) ?? null,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard data');
      setData(initialState);
    } finally {
      setIsLoading(false);
    }

    void (async () => {
      for (const dataset of [
        'historyIndents',
        'pendingIndents',
        'poHistory',
        'poPending',
        'repairPending',
        'repairHistory',
        'returnableDetails',
      ] as const) {
        try {
          await loadDataset(dataset);
        } catch {
          // Non-blocking background hydration.
        }
      }
    })();

    void (async () => {
      try {
        const vendors = normalizeVendorList(extractArray(await storeApi.getAllVendors()));
        setData((prev) => ({
          ...prev,
          allVendors: vendors,
        }));
      } catch {
        // Ignore background vendor load failure.
      }
    })();

    void (async () => {
      try {
        const products = normalizeProductList(extractArray(await storeApi.getAllProducts()));
        setData((prev) => ({
          ...prev,
          allProducts: products.length ? products : prev.allProducts,
        }));
      } catch {
        // Ignore background product load failure.
      }
    })();
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const value = useMemo(() => ({
    ...data,
    isLoading,
    error,
    refreshData,
    loadDataset,
    loadedDatasets,
  }), [data, isLoading, error, refreshData, loadDataset, loadedDatasets]);

  return (
    <StoreDashboardContext.Provider value={value}>
      {children}
    </StoreDashboardContext.Provider>
  );
};
