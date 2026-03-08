import { storeApiRequest } from "./storeApiRequest";

export interface StoreAuthUser {
  id?: string | number | null;
  user_name?: string;
  username?: string;
  employee_id?: string | null;
  store_access?: string | null;
}

export interface UserSettings {
  id: number;
  user_name?: string;
  employee_id?: string;
  store_access?: string | null;
}

export interface UserSettingsResponse {
  success?: boolean;
  data?: UserSettings | UserSettings[];
  message?: string;
}

const normalizeStoreUsers = (payload: unknown): UserSettings[] => {
  if (Array.isArray(payload)) {
    return payload as UserSettings[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as UserSettingsResponse).data)
  ) {
    return (payload as UserSettingsResponse).data as UserSettings[];
  }

  return [];
};

export const settingsApi = {
  getUsers: async (token?: string): Promise<UserSettingsResponse | UserSettings[]> => {
    return storeApiRequest<UserSettingsResponse | UserSettings[]>(
      "/api/store/settings/users",
      {
        method: "GET",
        token,
      }
    );
  },

  patchStoreAccess: async (
    id: number,
    store_access: string
  ): Promise<UserSettingsResponse> => {
    return storeApiRequest<UserSettingsResponse>(
      `/api/store/settings/users/${id}/store-access`,
      {
        method: "PATCH",
        body: { store_access },
      }
    );
  },
};

export const lookupStoreAccessForUser = async (
  authUser: StoreAuthUser | null | undefined,
  token?: string
): Promise<string | null> => {
  if (!authUser) {
    return null;
  }

  const payload = await settingsApi.getUsers(token);
  const users = normalizeStoreUsers(payload);
  if (!users.length) {
    return null;
  }

  const authId = authUser.id != null ? String(authUser.id) : null;
  const authEmployeeId = (authUser.employee_id || "").trim().toUpperCase();
  const authUserName = (authUser.user_name || authUser.username || "").trim().toUpperCase();

  const matchedUser = users.find((candidate) => {
    const candidateId = candidate.id != null ? String(candidate.id) : null;
    const candidateEmployeeId = (candidate.employee_id || "").trim().toUpperCase();
    const candidateUserName = (candidate.user_name || "").trim().toUpperCase();

    if (authId && candidateId && authId === candidateId) {
      return true;
    }

    if (authEmployeeId && candidateEmployeeId && authEmployeeId === candidateEmployeeId) {
      return true;
    }

    if (authUserName && candidateUserName && authUserName === candidateUserName) {
      return true;
    }

    return false;
  });

  return matchedUser?.store_access?.trim() || null;
};
