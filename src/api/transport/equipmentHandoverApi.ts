import { transportApiRequest } from "./api";

export type EquipmentHandoverRecord = Record<string, any>;

export type EquipmentHandoverResponse = {
  records: EquipmentHandoverRecord[];
  total: number;
  statusCode: number;
  message: string;
};

export const fetchEquipmentHandoverList = async (
  params: Record<string, any> = {},
  signal?: AbortSignal
): Promise<EquipmentHandoverResponse> => {
  const response = await transportApiRequest(
    "/pay-loader-process/equipment-handover-list",
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

export default fetchEquipmentHandoverList;
