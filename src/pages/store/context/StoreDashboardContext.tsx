import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storeApi } from '@/api/store/storeSystemApi';

interface StoreDashboardData {
  pendingIndents: any[];
  historyIndents: any[];
  poPending: any[];
  poHistory: any[];
  repairPending: any[];
  repairHistory: any[];
  repairReceived: any[];
  returnableDetails: any[];
  dashboardSummary: any | null;
  allVendors: { vendorName: string }[];
  allProducts: { itemName: string }[];
}

interface StoreDashboardContextType extends StoreDashboardData {
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

const StoreDashboardContext = createContext<StoreDashboardContextType | undefined>(undefined);

export const useStoreDashboard = () => {
  const context = useContext(StoreDashboardContext);
  if (!context) {
    throw new Error('useStoreDashboard must be used within a StoreDashboardProvider');
  }
  return context;
};

const extractArray = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data && Array.isArray(res.data)) return res.data;
  return [];
};

export const StoreDashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<StoreDashboardData>({
    pendingIndents: [],
    historyIndents: [],
    poPending: [],
    poHistory: [],
    repairPending: [],
    repairHistory: [],
    repairReceived: [],
    returnableDetails: [],
    dashboardSummary: null,
    allVendors: [],
    allProducts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // ── PHASE 1: Fast data — clears loading spinner quickly ────────────────
    try {
      const results = await Promise.allSettled([
        storeApi.getPendingIndents(),         // 0
        storeApi.getHistoryIndents(),         // 1
        storeApi.getPoPending(),              // 2
        storeApi.getPoHistory(),              // 3
        storeApi.getRepairGatePassPending(),  // 4
        storeApi.getRepairGatePassHistory(),  // 5
        storeApi.getRepairGatePassReceived(), // 6
        storeApi.getReturnableDetails(),      // 7
        storeApi.getDashboard(),              // 8
      ]);

      const get = (r: PromiseSettledResult<any>) =>
        r.status === 'fulfilled' ? r.value : null;

      const pendingArr = extractArray(get(results[0]));
      const historyArr = extractArray(get(results[1]));
      const poPendingArr = extractArray(get(results[2]));
      const poHistoryArr = extractArray(get(results[3]));
      const repairPendArr = extractArray(get(results[4]));
      const repairHistArr = extractArray(get(results[5]));
      const repairRecArr = extractArray(get(results[6]));
      const returnableArr = extractArray(get(results[7]));
      const dashRes = get(results[8]);

      // Build vendor list from all available data sources
      const seenVendors = new Set<string>();
      const vendorList: { vendorName: string }[] = [];
      const addVendor = (raw: string) => {
        const name = raw.trim();
        if (name && !seenVendors.has(name.toUpperCase())) {
          seenVendors.add(name.toUpperCase());
          vendorList.push({ vendorName: name });
        }
      };
      [...poHistoryArr, ...poPendingArr].forEach((item: any) =>
        addVendor(item.VENDOR_NAME || item.vendor_name || '')
      );
      [...repairPendArr, ...repairHistArr, ...repairRecArr].forEach((item: any) =>
        addVendor(item.PARTYNAME || item.partyname || item.PARTY_NAME || item.party_name || '')
      );
      returnableArr.forEach((item: any) =>
        addVendor(item.PARTY_NAME || item.party_name || item.PARTYNAME || item.partyname || '')
      );
      vendorList.sort((a, b) => a.vendorName.localeCompare(b.vendorName));

      // Build initial product list from indent history (fast, no extra call)
      const seenItems = new Set<string>();
      const productList: { itemName: string }[] = [];
      const addProduct = (raw: string) => {
        const name = raw.trim();
        if (name && !seenItems.has(name.toUpperCase())) {
          seenItems.add(name.toUpperCase());
          productList.push({ itemName: name });
        }
      };
      [...historyArr, ...pendingArr].forEach((item: any) =>
        addProduct(item.ITEM_NAME || item.item_name || '')
      );
      productList.sort((a, b) => a.itemName.localeCompare(b.itemName));

      setData({
        pendingIndents: pendingArr,
        historyIndents: historyArr,
        poPending: poPendingArr,
        poHistory: poHistoryArr,
        repairPending: repairPendArr,
        repairHistory: repairHistArr,
        repairReceived: repairRecArr,
        returnableDetails: returnableArr,
        dashboardSummary: dashRes?.data ?? dashRes ?? null,
        allVendors: vendorList,
        allProducts: productList,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard data');
    } finally {
      setIsLoading(false); // ← Dashboard renders here
    }

    // ── PHASE 2: Master items list (background, non-blocking) ──────────────
    // Runs after isLoading=false. Updates All Products silently.
    try {
      const itemsRes = await storeApi.getItems();
      const masterItems = extractArray(itemsRes);
      if (masterItems.length > 0) {
        setData(prev => {
          const seen = new Set<string>();
          const list: { itemName: string }[] = [];
          const add = (raw: string) => {
            const name = raw.trim();
            if (name && !seen.has(name.toUpperCase())) {
              seen.add(name.toUpperCase());
              list.push({ itemName: name });
            }
          };
          masterItems.forEach((item: any) =>
            add(item.itemname || item.item_name || item.ITEM_NAME || '')
          );
          prev.allProducts.forEach(p => add(p.itemName));
          return {
            ...prev,
            allProducts: list.sort((a, b) => a.itemName.localeCompare(b.itemName)),
          };
        });
      }
    } catch {
      // Non-fatal — indent-derived product list is already shown
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const value = useMemo(() => ({
    ...data,
    isLoading,
    error,
    refreshData,
  }), [data, isLoading, error, refreshData]);

  return (
    <StoreDashboardContext.Provider value={value}>
      {children}
    </StoreDashboardContext.Provider>
  );
};
