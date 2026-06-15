import { API_BASE_URL } from "./storeApiRequest";

const CHATBOT_BASE_PATH = "/api/store/chatbot";

const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    const message =
      payload?.details ||
      payload?.error ||
      payload?.message ||
      `Request failed with status ${response.status}`;

    const error = new Error(String(message));
    (error as Error & { status?: number; payload?: unknown }).status = response.status;
    (error as Error & { status?: number; payload?: unknown }).payload = payload;
    throw error;
  }

  return payload as T;
};

let chatbotApiKeyCache: string | null = null;
let chatbotApiKeyPromise: Promise<string> | null = null;

export interface ChatbotConfigResponse {
  apiKey: string;
}

export interface ChatbotItem {
  itemCode: string;
  itemName: string;
  um: string;
}

export interface ChatbotSeries {
  series: string;
  descr: string;
  entityCode: string;
  divCode: string | null;
}

export interface ChatbotDepartment {
  deptCode: string;
  deptName: string;
}

export interface ChatbotCostCode {
  costCode: string;
  costName: string;
}

export interface ChatbotEmployee {
  empCode: string;
  empName: string;
}

export interface ChatbotMake {
  makeCode: string;
  makeName: string;
}

export interface ChatbotStockResponse {
  stock: number;
}

export interface ChatbotIndentPayload {
  itemCode: string;
  itemName?: string;
  qty: number;
  um?: string;
  deptCode: string;
  series: string;
  divCode?: string | null;
  costCode: string;
  userCode: string;
  empName: string;
  make: string;
  makeName?: string;
  specs: string;
  purpose: string;
  dueDate: string;
}

export interface ChatbotIndentResponse {
  success: boolean;
  vrNo?: string;
  message?: string;
  error?: string;
}

export interface ChatbotBootstrapData {
  apiKey: string;
  departments: ChatbotDepartment[];
  seriesList: ChatbotSeries[];
  costCodesList: ChatbotCostCode[];
  employeesList: ChatbotEmployee[];
  makesList: ChatbotMake[];
}

const chatbotFetch = async <T>(
  path: string,
  options: RequestInit = {},
  apiKey?: string
): Promise<T> => {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
    credentials: "include",
  });

  return parseJsonResponse<T>(response);
};

export const getChatbotConfig = async (forceRefresh = false): Promise<ChatbotConfigResponse> => {
  if (forceRefresh) {
    chatbotApiKeyCache = null;
    chatbotApiKeyPromise = null;
  }

  return chatbotFetch<ChatbotConfigResponse>(`${CHATBOT_BASE_PATH}/config`, {
    method: "GET",
  });
};

export const getChatbotApiKey = async (forceRefresh = false): Promise<string> => {
  if (!forceRefresh && chatbotApiKeyCache) {
    return chatbotApiKeyCache;
  }

  if (!forceRefresh && chatbotApiKeyPromise) {
    return chatbotApiKeyPromise;
  }

  chatbotApiKeyPromise = getChatbotConfig(forceRefresh)
    .then((config) => {
      const resolvedApiKey = String(config?.apiKey || "").trim();
      if (!resolvedApiKey) {
        throw new Error("Chatbot API key was not returned by the backend.");
      }

      chatbotApiKeyCache = resolvedApiKey;
      return resolvedApiKey;
    })
    .finally(() => {
      chatbotApiKeyPromise = null;
    });

  return chatbotApiKeyPromise;
};

export const chatbotApi = {
  async getBootstrapData(forceRefresh = false): Promise<ChatbotBootstrapData> {
    const apiKey = await getChatbotApiKey(forceRefresh);

    const [departments, seriesList, costCodesList, employeesList, makesList] =
      await Promise.all([
        chatbotFetch<ChatbotDepartment[]>(
          `${CHATBOT_BASE_PATH}/departments`,
          { method: "GET" },
          apiKey
        ),
        chatbotFetch<ChatbotSeries[]>(
          `${CHATBOT_BASE_PATH}/series`,
          { method: "GET" },
          apiKey
        ),
        chatbotFetch<ChatbotCostCode[]>(
          `${CHATBOT_BASE_PATH}/cost-codes`,
          { method: "GET" },
          apiKey
        ),
        chatbotFetch<ChatbotEmployee[]>(
          `${CHATBOT_BASE_PATH}/employees`,
          { method: "GET" },
          apiKey
        ),
        chatbotFetch<ChatbotMake[]>(
          `${CHATBOT_BASE_PATH}/makes`,
          { method: "GET" },
          apiKey
        ),
      ]);

    return {
      apiKey,
      departments,
      seriesList,
      costCodesList,
      employeesList,
      makesList,
    };
  },

  async searchItems(query: string, apiKey?: string) {
    const resolvedApiKey = apiKey || (await getChatbotApiKey());
    const search = new URLSearchParams({ q: query });
    return chatbotFetch<ChatbotItem[]>(
      `${CHATBOT_BASE_PATH}/items?${search.toString()}`,
      { method: "GET" },
      resolvedApiKey
    );
  },

  async getItemStock(itemCode: string, apiKey?: string) {
    const resolvedApiKey = apiKey || (await getChatbotApiKey());
    return chatbotFetch<ChatbotStockResponse>(
      `${CHATBOT_BASE_PATH}/stock/${encodeURIComponent(itemCode)}`,
      { method: "GET" },
      resolvedApiKey
    );
  },

  async createIndent(payload: ChatbotIndentPayload, apiKey?: string) {
    const resolvedApiKey = apiKey || (await getChatbotApiKey());
    return chatbotFetch<ChatbotIndentResponse>(
      `${CHATBOT_BASE_PATH}/indent`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      resolvedApiKey
    );
  },
};

