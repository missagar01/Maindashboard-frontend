import { transportApiRequest } from "./api";

export type LrBiltyRegisterRecord = Record<string, any>;

export type LrBiltyRegisterResponse = {
  records: LrBiltyRegisterRecord[];
  total: number;
  statusCode: number;
  message: string;
};

export const fetchLrBiltyRegisterReport = async (
  params: Record<string, any> = {},
  signal?: AbortSignal
): Promise<LrBiltyRegisterResponse> => {
  const response = await transportApiRequest("reports/lr-bilty-register", {
    params,
    signal,
  });

  const payload = response?.data || {};
  const records = Array.isArray(payload?.data) ? payload.data : [];

  return {
    records,
    total: Number(payload?.count ?? records.length ?? 0),
    statusCode: Number(payload?.statusCode ?? response?.status ?? 0),
    message: String(payload?.message || ""),
  };
};

export default fetchLrBiltyRegisterReport;


