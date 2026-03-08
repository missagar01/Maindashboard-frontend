import { storeApiRequest } from "./storeApiRequest";

export interface RepairFollowup {
  id?: number;
  gate_pass_date?: string;
  gate_pass_no?: string;
  department?: string;
  party_name?: string;
  item_name?: string;
  item_code?: string;
  remarks?: string;
  uom?: string;
  qty_issued?: number;
  lead_time?: number;
  planned1?: string;
  actual1?: string;
  time_delay1?: number;
  stage1_status?: string;
  planned2?: string;
  actual2?: string;
  time_delay2?: number;
  stage2_status?: string;
  gate_pass_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RepairFollowupResponse {
  success: boolean;
  data?: RepairFollowup | RepairFollowup[];
  message?: string;
}

export interface RepairFollowupStage2Payload {
  stage2_status: string;
  gate_pass_status: string;
  extended_date?: string;
}

export const repairFollowupApi = {
  create: async (data: RepairFollowup): Promise<RepairFollowupResponse> => {
    return storeApiRequest<RepairFollowupResponse>("/api/store/repair-followup", {
      method: "POST",
      body: data,
    });
  },

  getAll: async (): Promise<RepairFollowupResponse> => {
    return storeApiRequest<RepairFollowupResponse>("/api/store/repair-followup", {
      method: "GET",
    });
  },

  getById: async (id: number): Promise<RepairFollowupResponse> => {
    return storeApiRequest<RepairFollowupResponse>(`/api/store/repair-followup/${id}`, {
      method: "GET",
    });
  },

  update: async (
    id: number,
    data: RepairFollowup
  ): Promise<RepairFollowupResponse> => {
    return storeApiRequest<RepairFollowupResponse>(`/api/store/repair-followup/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  updateStage2: async (
    id: number,
    data: RepairFollowupStage2Payload
  ): Promise<RepairFollowupResponse> => {
    return storeApiRequest<RepairFollowupResponse>(
      `/api/store/repair-followup/${id}/stage2`,
      {
        method: "PATCH",
        body: data,
      }
    );
  },

  remove: async (id: number): Promise<RepairFollowupResponse> => {
    return storeApiRequest<RepairFollowupResponse>(`/api/store/repair-followup/${id}`, {
      method: "DELETE",
    });
  },

  getDashboardMetrics: async () => {
    const response = await storeApiRequest<RepairFollowupResponse>("/api/store/repair-followup", {
      method: "GET",
    });

    const rows = Array.isArray(response?.data) ? response.data : [];
    const pendingRows = rows.filter((row) => row.gate_pass_status !== "Completed");
    const completedRows = rows.filter((row) => row.gate_pass_status === "Completed");
    const departmentCounts = rows.reduce<Record<string, number>>((acc, row) => {
      const department = row.department || "Unknown";
      acc[department] = (acc[department] || 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      data: {
        tasks: rows,
        pendingCount: pendingRows.length,
        completedCount: completedRows.length,
        totalRepairCost: 0,
        departmentStatus: Object.entries(departmentCounts).map(([department, count]) => ({
          department,
          count,
        })),
        paymentTypeDistribution: [],
      },
    };
  },
};
