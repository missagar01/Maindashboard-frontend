import { storeApiRequest } from "./storeApiRequest";

export interface StoreGRNApproval {
  planned_date?: string;
  grn_no?: string;
  grn_date?: string;
  party_name?: string;
  party_bill_no?: string;
  party_bill_amount?: number;
  sended_bill?: boolean;
  approved_by_admin?: boolean;
  approved_by_gm?: boolean;
  close_bill?: boolean;
}

export interface StoreGRNApprovalResponse {
  success: boolean;
  total?: number;
  data?: StoreGRNApproval | StoreGRNApproval[];
  message?: string;
}

export const storeGRNApprovalApi = {
  getAll: async (): Promise<StoreGRNApprovalResponse> => {
    return storeApiRequest<StoreGRNApprovalResponse>("/api/store/store-grn-approval", {
      method: "GET",
    });
  },

  sendBill: async (
    data: StoreGRNApproval
  ): Promise<StoreGRNApprovalResponse> => {
    return storeApiRequest<StoreGRNApprovalResponse>(
      "/api/store/store-grn-approval/send-bill",
      {
        method: "POST",
        body: data,
      }
    );
  },

  approveByAdmin: async (
    grnNo: string
  ): Promise<StoreGRNApprovalResponse> => {
    return storeApiRequest<StoreGRNApprovalResponse>(
      `/api/store/store-grn-approval/approve-admin/${grnNo}`,
      {
        method: "PATCH",
      }
    );
  },

  approveByGM: async (
    grnNo: string
  ): Promise<StoreGRNApprovalResponse> => {
    return storeApiRequest<StoreGRNApprovalResponse>(
      `/api/store/store-grn-approval/approve-gm/${grnNo}`,
      {
        method: "PATCH",
      }
    );
  },

  closeBill: async (
    grnNo: string
  ): Promise<StoreGRNApprovalResponse> => {
    return storeApiRequest<StoreGRNApprovalResponse>(
      `/api/store/store-grn-approval/close-bill/${grnNo}`,
      {
        method: "PATCH",
      }
    );
  },
};
