import { apiRequest as coreApiRequest } from "../apiClient";
import { API_BASE_URL, storeApiRequest } from "./storeApiRequest";

const downloadBlob = async (path: string) => {
  const response = await coreApiRequest(path, {
    method: "GET",
    responseType: "blob",
  });

  return response.data as Blob;
};

export const storeApi: any = {
  createStoreIndent: (data: unknown) =>
    storeApiRequest("/api/store/store-indent", {
      method: "POST",
      body: data,
    }),

  getPendingIndents: () => storeApiRequest("/api/store/store-indent/pending"),
  getHistoryIndents: () => storeApiRequest("/api/store/store-indent/history"),

  approveStoreIndent: (data: unknown) =>
    storeApiRequest("/api/store/store-indent/approve", {
      method: "PUT",
      body: data,
    }),

  getStoreIndentDashboard: () => storeApiRequest("/api/store/store-indent/dashboard"),
  getAllVendors: () => storeApiRequest("/api/store/store-indent/vendors"),
  getAllProducts: () => storeApiRequest("/api/store/store-indent/products"),

  downloadPendingIndents: () =>
    downloadBlob("/api/store/store-indent/pending/download"),

  getRepairGatePassPending: () => storeApiRequest("/api/store/repair-gate-pass/pending"),
  getRepairGatePassReceived: () => storeApiRequest("/api/store/repair-gate-pass/received"),
  getRepairGatePassHistory: () => storeApiRequest("/api/store/repair-gate-pass/history"),
  getRepairGatePassCounts: () => storeApiRequest("/api/store/repair-gate-pass/counts"),
  getPendingGateEntry: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) {
      params.append("fromDate", fromDate);
    }
    if (toDate) {
      params.append("toDate", toDate);
    }

    const query = params.toString();
    return storeApiRequest(`/api/store/pending-gate-entry${query ? `?${query}` : ""}`);
  },
  downloadRepairGatePassPending: () =>
    downloadBlob("/api/store/repair-gate-pass/pending/download"),

  downloadHistoryIndents: () =>
    downloadBlob("/api/store/store-indent/history/download"),

  getIndents: () => storeApiRequest("/api/store/indent"),
  getAllIndents: () => storeApiRequest("/api/store/indent/all"),
  getIndent: (requestNumber: string) =>
    storeApiRequest(`/api/store/indent/${requestNumber}`),

  submitIndent: (data: unknown) =>
    storeApiRequest("/api/store/indent", {
      method: "POST",
      body: data,
    }),

  updateIndentStatus: (requestNumber: string, data: unknown) =>
    storeApiRequest(`/api/store/indent/${requestNumber}/status`, {
      method: "PUT",
      body: data,
    }),

  updateIndentNumber: (requestNumber: string, indentNumber: string) =>
    storeApiRequest(`/api/store/indent/${requestNumber}/indent-number`, {
      method: "PATCH",
      body: {
        indent_number: indentNumber,
      },
    }),

  filterIndents: (params: Record<string, string>) => {
    const queryString = new URLSearchParams(params).toString();
    return storeApiRequest(`/api/store/indent/filter?${queryString}`);
  },

  getIndentsByStatus: (statusType: string) =>
    storeApiRequest(`/api/store/indent/status/${statusType}`),

  getPoPending: () => storeApiRequest("/api/store/po/pending"),
  getPoHistory: () => storeApiRequest("/api/store/po/history"),
  downloadPoPending: () => downloadBlob("/api/store/po/pending/download"),
  downloadPoHistory: () => downloadBlob("/api/store/po/history/download"),

  getItems: () => storeApiRequest("/api/store/items"),

  getStock: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) {
      params.append("fromDate", fromDate);
    }
    if (toDate) {
      params.append("toDate", toDate);
    }

    const query = params.toString();
    return storeApiRequest(`/api/store/stock${query ? `?${query}` : ""}`);
  },

  getUom: () => storeApiRequest("/api/store/uom"),

  getCostLocations: (divCode?: string) => {
    const query = divCode ? `?divCode=${divCode}` : "";
    return storeApiRequest(`/api/store/cost-location${query}`);
  },

  getCostLocationsRP: () => storeApiRequest("/api/store/cost-location/rp"),
  getCostLocationsPM: () => storeApiRequest("/api/store/cost-location/pm"),
  getCostLocationsCO: () => storeApiRequest("/api/store/cost-location/co"),

  getVendorRatePending: () => storeApiRequest("/api/store/vendor-rate-update/pending"),
  getVendorRateHistory: () => storeApiRequest("/api/store/vendor-rate-update/history"),
  getVendorRegistrations: (refresh = false) =>
    storeApiRequest(`/api/store/vendor-registration${refresh ? "?refresh=true" : ""}`),

  updateVendorRate: (data: unknown) =>
    storeApiRequest("/api/store/vendor-rate-update", {
      method: "POST",
      body: data,
    }),

  getThreePartyPending: () => storeApiRequest("/api/store/three-party-approval/pending"),
  getThreePartyHistory: () => storeApiRequest("/api/store/three-party-approval/history"),

  approveThreeParty: (data: unknown) =>
    storeApiRequest("/api/store/three-party-approval/approve", {
      method: "POST",
      body: data,
    }),

  getDashboard: () => storeApiRequest("/api/store/dashboard"),
  getDepartments: () => storeApiRequest("/api/store/departments"),

  createDepartment: (data: unknown) =>
    storeApiRequest("/api/store/departments", {
      method: "POST",
      body: data,
    }),

  updateDepartment: (id: string | number, data: unknown) =>
    storeApiRequest(`/api/store/departments/${id}`, {
      method: "PUT",
      body: data,
    }),

  deleteDepartment: (id: string | number) =>
    storeApiRequest(`/api/store/departments/${id}`, {
      method: "DELETE",
    }),

  getHodByDepartment: (department: string) =>
    storeApiRequest(`/api/store/auth/hod/${encodeURIComponent(department)}`),

  getErpIndent: () => storeApiRequest("/api/store/erp-indent"),
  getStoreIssue: () => storeApiRequest("/api/store/store-issue"),
  getReturnableDetails: () => storeApiRequest("/api/store/returnable/details"),
  getReturnableStats: () => storeApiRequest("/api/store/returnable/stats"),
  getHealth: () => storeApiRequest("/api/store/health"),
  getUser: (employeeId: string) => storeApiRequest(`/api/store/user/${employeeId}`),
  getMe: () => storeApiRequest("/api/store/user/me"),

  getDivisionWiseIssue: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    const query = params.toString();
    return storeApiRequest(`/api/store/division/issue${query ? `?${query}` : ""}`);
  },
  getDivisionWiseIndent: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    const query = params.toString();
    return storeApiRequest(`/api/store/division/indent${query ? `?${query}` : ""}`);
  },
  getDivisionWisePO: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    const query = params.toString();
    return storeApiRequest(`/api/store/division/po${query ? `?${query}` : ""}`);
  },
  getDivisionWiseGRN: (fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    const query = params.toString();
    return storeApiRequest(`/api/store/division/grn${query ? `?${query}` : ""}`);
  },
};

export { API_BASE_URL };
