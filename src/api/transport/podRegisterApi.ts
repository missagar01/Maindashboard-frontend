import { transportApiRequest } from "./api";

export type PodRegisterRecord = Record<string, any>;

export type PodRegisterResponse = {
  records: PodRegisterRecord[];
  total: number;
  statusCode: number;
  message: string;
};

export const fetchPodRegisterReport = async (
  params: Record<string, any> = {},
  signal?: AbortSignal
): Promise<PodRegisterResponse> => {
  const response = await transportApiRequest("reports/lr-bilty-register", {
    params: {
      ...params,
      is_pod_prepared: "true",
    },
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

export default fetchPodRegisterReport;
