import { transportApiRequest } from "./api";

export type EquipmentShiftChangeRecord = Record<string, any>;

export type EquipmentShiftChangeResponse = {
  records: EquipmentShiftChangeRecord[];
  total: number;
  statusCode: number;
  message: string;
};

export const fetchEquipmentShiftChangeList = async (
  params: Record<string, any> = {},
  signal?: AbortSignal
): Promise<EquipmentShiftChangeResponse> => {
  const response = await transportApiRequest(
    "/pay-loader-process/equipment-shift-change/equipment-shift-change-list",
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

export default fetchEquipmentShiftChangeList;
