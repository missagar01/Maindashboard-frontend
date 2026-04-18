import { transportApiRequest } from "./api";

export const transportReportEndpoints = {
  lrBilty: "reports/lr-bilty-register",
  pumpWiseDieselAdvance: "reports/pump-wise-diesel-advance",
  vehicleWiseDieselAdvance: "reports/vehicle-wise-diesel-advance",
  maintenanceRequests: "fleets/get-maintenance-requests",
  optimizedAdvanceList: "process/get-optimized-advance-list",
  vehicleStatuary: "reports/vehicle-statuary",
};

const isEmptyValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

const normalizeFiltersForEndpoint = (
  serviceKey: keyof typeof transportReportEndpoints,
  filters: Record<string, any>
) => {
  const nextFilters = { ...filters };

  // Sync common date keys
  const dateFrom = nextFilters.fromDate || nextFilters.startDate;
  const dateTo = nextFilters.toDate || nextFilters.endDate || dateFrom;

  if (dateFrom) {
    nextFilters.fromDate = dateFrom;
    nextFilters.startDate = dateFrom;
    nextFilters.toDate = dateTo;
    nextFilters.endDate = dateTo;
  }

  // Handle LR Bilty field-specific date requirement
  if (serviceKey === "lrBilty" && dateFrom) {
    nextFilters.lr_bilty_date = {
      value: [dateFrom, dateTo],
      filter_type: "date-range",
    };
  }

  return nextFilters;
};

export const serializeFilters = (filters: Record<string, any> = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, rawValue]) => {
    if (isEmptyValue(rawValue)) return;

    // 1. Handle Standard Top-Level Params
    if (["page", "limit", "global_search_text", "fromDate", "toDate", "startDate", "endDate"].includes(key)) {
      params.append(key, String(rawValue));
      return;
    }

    // 2. Handle Sorting (Using JSON stringify if valid)
    if (key === "sort" && Array.isArray(rawValue) && rawValue.length > 0) {
      params.append(key, JSON.stringify(rawValue));
      return;
    }

    // 3. Handle Rich/Field-Specific Filters
    if (
      rawValue &&
      typeof rawValue === "object" &&
      !Array.isArray(rawValue) &&
      ("value" in rawValue || "filter_type" in rawValue || "operation" in rawValue)
    ) {
      const { value, filter_type, operation } = rawValue;

      if (!isEmptyValue(value)) {
        if (Array.isArray(value)) {
          // Arrays ALWAYS need the rich format for multi-select
          value.forEach((item, index) => {
            if (!isEmptyValue(item)) {
              params.append(`${key}[value][${index}]`, String(item));
            }
          });
          if (filter_type) params.append(`${key}[filter_type]`, String(filter_type));
          if (operation) params.append(`${key}[operation]`, String(operation));
        } else {
          // For simple values, try sending them as TOP LEVEL if no operation/filter_type is critical
          // This is much safer for many backends
          if (!operation && !filter_type) {
            params.append(key, String(value));
          } else {
            params.append(`${key}[value]`, String(value));
            if (filter_type) params.append(`${key}[filter_type]`, String(filter_type));
            if (operation) params.append(`${key}[operation]`, String(operation));
          }
        }
      }
      return;
    }

    // 4. Default Fallback
    params.append(key, String(rawValue));
  });

  return params;
};

const normalizeTransportResponse = (response: any) => {
  const body = response?.data || {};

  // The backend sometimes wraps data in 'data' field, or it might be 'data.data' depending on the endpoint version
  let records = [];
  if (Array.isArray(body.data)) {
    records = body.data;
  } else if (body.data && Array.isArray(body.data.data)) {
    records = body.data.data;
  }

  return {
    records,
    count: Number(body.count || records.length || 0),
    paginationMetadata: body.paginationMetadata || null,
    message: body.message || "",
    statusCode: Number(body.statusCode || response?.status || 0),
  };
};

const buildRequestConfig = (
  serviceKey: keyof typeof transportReportEndpoints,
  filters: Record<string, any> = {}
) => {
  const normalized = normalizeFiltersForEndpoint(serviceKey, filters);
  const params = serializeFilters(normalized);

  // Convert URLSearchParams back to a plain object for axios params
  const paramsObj: Record<string, string> = {};
  params.forEach((value, key) => {
    paramsObj[key] = value;
  });

  return {
    path: transportReportEndpoints[serviceKey] as string,
    params: paramsObj,
  };
};

const requestTransportReport = async (
  serviceKey: keyof typeof transportReportEndpoints,
  filters: Record<string, any> = {},
  signal?: AbortSignal
) => {
  const { path, params } = buildRequestConfig(serviceKey, filters);

  // Debug log to console (commented out per user request)
  // console.log(`[TransportReport] Requesting ${path}`, params);

  const response = await transportApiRequest(path, {
    params,
    signal,
  });

  return normalizeTransportResponse(response);
};

export const getLrBiltyRegister = (filters: Record<string, any> = {}, signal?: AbortSignal) =>
  requestTransportReport("lrBilty", filters, signal);

export const getPumpWiseDieselAdvance = (
  filters: Record<string, any> = {},
  signal?: AbortSignal
) => requestTransportReport("pumpWiseDieselAdvance", filters, signal);

export const getVehicleWiseDieselAdvance = (
  filters: Record<string, any> = {},
  signal?: AbortSignal
) => requestTransportReport("vehicleWiseDieselAdvance", filters, signal);

export const getMaintenanceRequests = (
  filters: Record<string, any> = {},
  signal?: AbortSignal
) => requestTransportReport("maintenanceRequests", filters, signal);

export const getOptimizedAdvanceList = (
  filters: Record<string, any> = {},
  signal?: AbortSignal
) => requestTransportReport("optimizedAdvanceList", filters, signal);

export const getVehicleStatuary = (
  filters: Record<string, any> = {},
  signal?: AbortSignal
) => requestTransportReport("vehicleStatuary", filters, signal);

export const getTransportReportData = (
  serviceKey: keyof typeof transportReportEndpoints,
  filters: Record<string, any> = {},
  signal?: AbortSignal
) => {
  switch (serviceKey) {
    case "lrBilty":
      return getLrBiltyRegister(filters, signal);
    case "pumpWiseDieselAdvance":
      return getPumpWiseDieselAdvance(filters, signal);
    case "vehicleWiseDieselAdvance":
      return getVehicleWiseDieselAdvance(filters, signal);
    case "maintenanceRequests":
      return getMaintenanceRequests(filters, signal);
    case "optimizedAdvanceList":
      return getOptimizedAdvanceList(filters, signal);
    case "vehicleStatuary":
      return getVehicleStatuary(filters, signal);
    default:
      return Promise.reject(new Error(`Unsupported transport report: ${serviceKey}`));
  }
};


