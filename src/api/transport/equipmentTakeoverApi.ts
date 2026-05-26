import { transportApiRequest } from "./api";

export type EquipmentTakeoverRecord = Record<string, any>;

export type EquipmentTakeoverResponse = {
  records: EquipmentTakeoverRecord[];
  total: number;
  statusCode: number;
  message: string;
};

export const fetchEquipmentTakeoverList = async (
  params: Record<string, any> = {},
  signal?: AbortSignal
): Promise<EquipmentTakeoverResponse> => {
  const response = await transportApiRequest(
    "/pay-loader-process/equipment-takeover-list",
    {
      params,
      signal,
    }
  );

  const payload = response?.data || {};
  const records = Array.isArray(payload?.data) ? payload.data : [];

  return {
    records,
    total: Number(payload?.count ?? records.length ?? 0),
    statusCode: Number(payload?.statusCode ?? response?.status ?? 0),
    message: String(payload?.message || ""),
  };
};

export default fetchEquipmentTakeoverList;
