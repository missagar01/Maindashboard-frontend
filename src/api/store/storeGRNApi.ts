import { storeApiRequest } from "./storeApiRequest";

export interface StoreGRN {
  PLANNEDDATE?: string;
  VRNO?: string;
  VRDATE?: string;
  PARTYBILLNO?: string;
  PARTYBILLAMT?: number;
  PARTYNAME?: string;
}

export interface StoreGRNResponse {
  success: boolean;
  total?: number;
  data?: StoreGRN[];
  error?: string;
}

export const storeGRNApi = {
  getPending: async (): Promise<StoreGRNResponse> => {
    return storeApiRequest<StoreGRNResponse>("/api/store/store-grn/pending", {
      method: "GET",
    });
  },
};
