import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Info,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import {
  chatbotApi,
  type ChatbotBootstrapData,
  type ChatbotCostCode,
  type ChatbotDepartment,
  type ChatbotEmployee,
  type ChatbotIndentPayload,
  type ChatbotItem,
  type ChatbotMake,
  type ChatbotSeries,
} from "@/api/store/chatbotApi";

type ConnectionState = "connecting" | "connected" | "failed";

type ChatOption = {
  label: string;
  action: () => void;
};

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  options?: ChatOption[] | null;
  stockCard?: {
    itemCode: string;
    itemName: string;
    stock: number;
    um: string;
  };
  summaryCard?: ChatbotIndentPayload;
  successCard?: {
    vrNo?: string;
    message?: string;
  };
  indentForm?: boolean;
  formItem?: ChatbotItem;
  disabledForm?: boolean;
};

const formatChatTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const connectionMeta: Record<
  ConnectionState,
  { label: string; badgeClass: string; panelClass: string }
> = {
  connecting: {
    label: "Connecting to Store backend...",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    panelClass: "bg-amber-500",
  },
  connected: {
    label: "Connected to Store Oracle chatbot API",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    panelClass: "bg-emerald-500",
  },
  failed: {
    label: "Connection failed",
    badgeClass:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
    panelClass: "bg-rose-500",
  },
};

export default function ChatBot() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [apiKey, setApiKey] = useState("");
  const [departments, setDepartments] = useState<ChatbotDepartment[]>([]);
  const [seriesList, setSeriesList] = useState<ChatbotSeries[]>([]);
  const [costCodesList, setCostCodesList] = useState<ChatbotCostCode[]>([]);
  const [employeesList, setEmployeesList] = useState<ChatbotEmployee[]>([]);
  const [makesList, setMakesList] = useState<ChatbotMake[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<ChatbotItem[]>([]);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedRef = useRef(false);
  const activeConnectionMeta = connectionMeta[connectionState];

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    void loadBackendConfig();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, suggestions]);

  const addBotMessage = (
    text: string,
    options: ChatOption[] | null = null,
    extraProps: Partial<ChatMessage> = {}
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId(),
        sender: "bot",
        text,
        time: formatChatTime(),
        options,
        ...extraProps,
      },
    ]);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId(),
        sender: "user",
        text,
        time: formatChatTime(),
      },
    ]);
  };

  const consumeMessageOptions = (messageId: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, options: null } : message
      )
    );
  };

  const loadBackendConfig = async () => {
    setConnectionState("connecting");
    setSuggestions([]);
    setMessages([]);

    try {
      const data: ChatbotBootstrapData = await chatbotApi.getBootstrapData(true);

      setApiKey(data.apiKey);
      setDepartments(data.departments);
      setSeriesList(data.seriesList);
      setCostCodesList(data.costCodesList);
      setEmployeesList(data.employeesList);
      setMakesList(data.makesList);
      setConnectionState("connected");

      addBotMessage(
        "नमस्ते! मैं आपका <strong>Procurement &amp; Inventory Assistant</strong> हूँ।<br />मैं स्टोर में स्टॉक चेक कर सकता हूँ और ज़रूरत पड़ने पर Oracle database में नया indent raise कर सकता हूँ।",
        [{ label: "Check Stock / Search Item", action: promptSearchItem }]
      );
    } catch (error) {
      console.error("Chatbot bootstrap failed:", error);
      setConnectionState("failed");
      addBotMessage(
        "⚠️ Store chatbot backend se connection initialize nahi ho paya. Backend, route, ya Oracle connectivity check karein."
      );
    }
  };

  const promptSearchItem = () => {
    addBotMessage(
      "स्टॉक चेक करने या indent डालने के लिए item ka naam ya code type karein. उदाहरण: <strong>BOLT</strong>."
    );
  };

  const handleInputChange = async (value: string) => {
    setInputValue(value);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const data = await chatbotApi.searchItems(value.trim(), apiKey);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Item suggestion lookup failed:", error);
      setSuggestions([]);
    }
  };

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const searchValue = inputValue.trim();
    if (!searchValue || connectionState !== "connected") {
      return;
    }

    setInputValue("");
    setSuggestions([]);
    addUserMessage(searchValue);
    setIsSubmittingSearch(true);

    try {
      const items = await chatbotApi.searchItems(searchValue, apiKey);

      if (items.length > 0) {
        addBotMessage(
          "Mujhe ye items mile hain. Kripya ek item select karein:",
          items.slice(0, 10).map((item) => ({
            label: `${item.itemName} (${item.itemCode})`,
            action: () => handleSelectSearchItem(item),
          }))
        );
      } else {
        addBotMessage(
          `⚠️ मुझे "<strong>${searchValue}</strong>" naam ya code se koi item nahi mila. Kripya dobara try karein.`
        );
      }
    } catch (error) {
      console.error("Item search failed:", error);
      addBotMessage("⚠️ Item search karte waqt koi error aa gaya.");
    } finally {
      setIsSubmittingSearch(false);
    }
  };

  const handleSelectSearchItem = (item: ChatbotItem) => {
    setSuggestions([]);
    addUserMessage(`Selected: ${item.itemName} (${item.itemCode})`);
    void checkItemStock(item);
  };

  const checkItemStock = async (item: ChatbotItem) => {
    addBotMessage("Wait, stock search ho raha hai...");

    try {
      const data = await chatbotApi.getItemStock(item.itemCode, apiKey);
      const stock = Number(data?.stock || 0);

      const stockCard = {
        itemCode: item.itemCode,
        itemName: item.itemName,
        stock,
        um: item.um,
      };

      if (stock > 0) {
        addBotMessage(
          `स्टोर में <strong>${item.itemName}</strong> उपलब्ध है. Current stock <strong>${stock} ${item.um}</strong> hai. Aap isse issue kara sakte hain.`,
          [{ label: "Search Another Item", action: promptSearchItem }],
          { stockCard }
        );
        return;
      }

      addBotMessage(
        "स्टोर में stock उपलब्ध नहीं है (0). Kya aap indent डालना चाहते हैं?",
        [
          { label: "हाँ, indent डालें", action: () => showIndentForm(item) },
          { label: "नहीं, धन्यवाद", action: sayThanks },
        ],
        { stockCard }
      );
    } catch (error) {
      console.error("Stock lookup failed:", error);
      addBotMessage("⚠️ Stock check karte waqt koi error aa gaya.");
    }
  };

  const sayThanks = () => {
    addUserMessage("नहीं, धन्यवाद");
    addBotMessage("धन्यवाद! Agar aapko kuch aur chahiye ho to batayein.", [
      { label: "Search Another Item", action: promptSearchItem },
    ]);
  };

  const showIndentForm = (item: ChatbotItem) => {
    addUserMessage("हाँ, indent डालें");
    addBotMessage(
      "कृपया नीचे दिए गए form में indent details भरें:",
      null,
      {
        indentForm: true,
        formItem: item,
      }
    );
  };

  const handleFormCancel = (messageId: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, indentForm: false, disabledForm: true }
          : message
      )
    );
    addUserMessage("Cancel");
    addBotMessage("Indent process cancel kar di gayi hai.", [
      { label: "Search Item Again", action: promptSearchItem },
    ]);
  };

  const handleFormSubmit = (messageId: string, formData: ChatbotIndentPayload) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, indentForm: false, disabledForm: true }
          : message
      )
    );

    addUserMessage("Submit Indent Form");
    addBotMessage(
      "कृपया details verify karein aur database me bhejne ke liye <strong>Confirm</strong> karein:",
      [
        {
          label: "Confirm & Send to DB",
          action: () => void submitIndentToDb(formData),
        },
        {
          label: "Edit / Cancel",
          action: promptSearchItem,
        },
      ],
      {
        summaryCard: formData,
      }
    );
  };

  const submitIndentToDb = async (formData: ChatbotIndentPayload) => {
    addUserMessage("Confirm & Send to DB");

    try {
      const result = await chatbotApi.createIndent(formData, apiKey);

      if (result.success) {
        addBotMessage(
          "बधाई हो! Indent safalta se raise ho gaya hai aur database me submit kar diya gaya hai.",
          [{ label: "Raise Another Indent", action: promptSearchItem }],
          {
            successCard: {
              vrNo: result.vrNo,
              message: result.message,
            },
          }
        );
        return;
      }

      addBotMessage(`❌ Indent create nahi ho paya: ${result.error || "Unknown error"}`);
    } catch (error) {
      console.error("Indent submission failed:", error);
      const message =
        error instanceof Error ? error.message : "डेटाबेस में indent डालते समय त्रुटि हुई।";
      addBotMessage(`⚠️ ${message}`);
    }
  };

  const retryConnection = () => {
    hasInitializedRef.current = false;
    void loadBackendConfig();
  };

  return (
    <div className="w-full px-0 py-0 sm:px-4 sm:py-4 md:px-6">
      <div className="mx-auto flex h-[calc(100dvh-56px)] w-full max-w-4xl flex-col overflow-hidden bg-[#efeae2] shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] dark:bg-slate-950 sm:h-[calc(100dvh-112px)] sm:min-h-[620px] sm:rounded-[28px] sm:border sm:border-slate-200 dark:sm:border-slate-800">
        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.74)),radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_38%)] px-2 py-2.5 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.96)),radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_34%)] sm:px-4 sm:py-5">
          <div className="sticky top-0 z-10 mb-2 flex flex-col items-center gap-1.5 pb-0 sm:mb-4 sm:gap-2 sm:pb-1">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur sm:px-3 sm:text-[11px] ${activeConnectionMeta.badgeClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${activeConnectionMeta.panelClass}`} />
              {activeConnectionMeta.label}
            </span>

            {connectionState !== "connected" ? (
              <button
                type="button"
                onClick={retryConnection}
                className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-3 text-[11px] font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <RefreshCcw className="size-3.5" />
                Retry connection
              </button>
            ) : null}
          </div>

          {messages.length === 0 && connectionState === "connecting" ? (
            <div className="flex h-full min-h-[320px] items-center justify-center">
              <div className="rounded-[20px] border border-slate-200 bg-white/95 px-4 py-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:rounded-[24px] sm:px-6 sm:py-5">
                <div className="mx-auto mb-3 flex h-10 w-10 animate-pulse items-center justify-center rounded-2xl bg-emerald-500 text-white sm:mb-4 sm:h-12 sm:w-12">
                  <Sparkles className="size-5" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Store chatbot connect ho raha hai
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Departments, series, employees aur makes load ho rahe hain.
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`space-y-1.5 ${
                    message.indentForm
                      ? "w-full max-w-full md:max-w-[96%] lg:max-w-[92%]"
                      : message.summaryCard
                        ? "max-w-[96%] sm:max-w-[90%] lg:max-w-[84%]"
                        : "max-w-[92%] sm:max-w-[84%] lg:max-w-[76%]"
                  }`}
                >
                  <div
                    className={`rounded-[20px] px-3 py-2.5 shadow-sm sm:rounded-[22px] sm:px-4 sm:py-3 ${
                      message.sender === "user"
                        ? "rounded-br-md bg-emerald-600 text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    }`}
                  >
                    <div
                      className="text-sm leading-6"
                      dangerouslySetInnerHTML={{ __html: message.text }}
                    />

                    {message.stockCard ? (
                      <StockCard
                        itemCode={message.stockCard.itemCode}
                        itemName={message.stockCard.itemName}
                        stock={message.stockCard.stock}
                        um={message.stockCard.um}
                      />
                    ) : null}

                    {message.summaryCard ? (
                      <SummaryCard summary={message.summaryCard} />
                    ) : null}

                    {message.successCard ? (
                      <SuccessCard success={message.successCard} />
                    ) : null}

                    {message.indentForm && message.formItem ? (
                      <IndentForm
                        item={message.formItem}
                        departments={departments}
                        seriesList={seriesList}
                        costCodesList={costCodesList}
                        employeesList={employeesList}
                        makesList={makesList}
                        onSubmit={(payload) => handleFormSubmit(message.id, payload)}
                        onCancel={() => handleFormCancel(message.id)}
                      />
                    ) : null}

                    {message.options?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                        {message.options.map((option, index) => (
                          <button
                            key={`${message.id}-${index}`}
                            type="button"
                            onClick={() => {
                              consumeMessageOptions(message.id);
                              option.action();
                            }}
                            className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <p
                    className={`px-1 text-[11px] text-slate-400 ${
                      message.sender === "user" ? "text-right" : ""
                    }`}
                  >
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-200 bg-white/92 px-2 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/92 sm:px-4 sm:py-3">
          {suggestions.length > 0 ? (
            <div className="mb-2 max-h-52 overflow-y-auto rounded-[20px] border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:mb-3 sm:rounded-[22px]">
              {suggestions.map((item) => (
                <button
                  key={item.itemCode}
                  type="button"
                  onClick={() => handleSelectSearchItem(item)}
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-b-0 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-100">
                    {item.itemName}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {item.itemCode}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSearchSubmit} className="flex items-end gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inputValue}
                onChange={(event) => void handleInputChange(event.target.value)}
                disabled={connectionState !== "connected"}
                placeholder="Search item code ya item name..."
                className="h-12 w-full rounded-full border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={connectionState !== "connected" || isSubmittingSearch}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function StockCard({
  itemCode,
  itemName,
  stock,
  um,
}: {
  itemCode: string;
  itemName: string;
  stock: number;
  um: string;
}) {
  const hasStock = stock > 0;

  return (
    <div
      className={`mt-4 rounded-2xl border p-4 ${
        hasStock
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {hasStock ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <AlertTriangle className="size-4" />
        )}
        {hasStock ? "Store me available hai" : "Store me available nahi hai"}
      </div>
      <div className="space-y-1 text-xs leading-5">
        <p>
          Item: <strong>{itemName}</strong> ({itemCode})
        </p>
        <p>
          Current Stock: <strong>{stock} {um}</strong>
        </p>
        <p>
          Status: <strong>{hasStock ? "Available" : "Out of Stock"}</strong>
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ summary }: { summary: ChatbotIndentPayload }) {
  const rows = [
    ["Item Name", summary.itemName || summary.itemCode],
    ["Quantity", String(summary.qty)],
    ["Requested By", `${summary.empName} (${summary.userCode})`],
    ["Department", summary.deptCode],
    ["Series", summary.series],
    ["Division", summary.divCode || "N/A"],
    ["Cost Center", summary.costCode],
    [
      "Make",
      summary.makeName ? `${summary.makeName} (${summary.make})` : summary.make,
    ],
    ["Specs", summary.specs],
    ["Purpose", summary.purpose],
    ["Required By", summary.dueDate],
  ];

  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
        <Info className="size-4" />
        Verify Details
      </div>
      <div className="grid gap-2 text-xs leading-5 text-slate-700 dark:text-slate-200">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1.5 rounded-xl bg-white/70 px-3 py-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3 dark:bg-slate-900/40"
          >
            <span className="font-medium text-slate-500 dark:text-slate-400">{label}</span>
            <span className="min-w-0 break-words font-semibold text-slate-900 dark:text-slate-100">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuccessCard({
  success,
}: {
  success: {
    vrNo?: string;
    message?: string;
  };
}) {
  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-100">
        <CheckCircle2 className="size-4" />
        Indent Raised Successfully
      </div>
      <div className="space-y-1 text-xs leading-5 text-slate-700 dark:text-slate-200">
        <p>
          Voucher Number (VRNO): <strong>{success.vrNo || "N/A"}</strong>
        </p>
        <p>Status: <strong>Inserted in Oracle DB</strong></p>
        {success.message ? <p>{success.message}</p> : null}
      </div>
    </div>
  );
}

function IndentForm({
  item,
  departments,
  seriesList,
  costCodesList,
  employeesList,
  makesList,
  onSubmit,
  onCancel,
}: {
  item: ChatbotItem;
  departments: ChatbotDepartment[];
  seriesList: ChatbotSeries[];
  costCodesList: ChatbotCostCode[];
  employeesList: ChatbotEmployee[];
  makesList: ChatbotMake[];
  onSubmit: (payload: ChatbotIndentPayload) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [series, setSeries] = useState("");
  const [costCode, setCostCode] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [makeCode, setMakeCode] = useState("");
  const [selectedDivCode, setSelectedDivCode] = useState("");
  const [specs, setSpecs] = useState(item.itemName || "");
  const [purpose, setPurpose] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [makeSearch, setMakeSearch] = useState("");
  const [isEmpFocused, setIsEmpFocused] = useState(false);
  const [isMakeFocused, setIsMakeFocused] = useState(false);

  const defaultDueDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  }, []);
  const [dueDate, setDueDate] = useState(defaultDueDate);

  useEffect(() => {
    if (series === "I1") {
      setSelectedDivCode("SM");
      return;
    }

    if (series === "I3") {
      setSelectedDivCode("RP");
      return;
    }

    if (series === "I4") {
      setSelectedDivCode("PM");
      return;
    }

    if (series !== "I5") {
      setSelectedDivCode("");
    }
  }, [series]);

  const filteredEmployees = useMemo(() => {
    const term = empSearch.toLowerCase().trim();
    if (!term) {
      return employeesList;
    }

    return employeesList.filter((employee) => {
      const full = `${employee.empName} (${employee.empCode})`.toLowerCase();
      return (
        full === term ||
        employee.empName.toLowerCase().includes(term) ||
        employee.empCode.toLowerCase().includes(term)
      );
    });
  }, [empSearch, employeesList]);

  const filteredMakes = useMemo(() => {
    const term = makeSearch.toLowerCase().trim();
    if (!term) {
      return makesList;
    }

    return makesList.filter((make) => {
      const full = `${make.makeName} (${make.makeCode})`.toLowerCase();
      return (
        full === term ||
        make.makeName.toLowerCase().includes(term) ||
        make.makeCode.toLowerCase().includes(term)
      );
    });
  }, [makeSearch, makesList]);

  useEffect(() => {
    if (filteredEmployees.length === 1 && !empCode) {
      const employee = filteredEmployees[0];
      setEmpCode(employee.empCode);
      setEmpSearch(`${employee.empName} (${employee.empCode})`);
    }
  }, [filteredEmployees, empCode]);

  useEffect(() => {
    if (filteredMakes.length === 1 && !makeCode) {
      const make = filteredMakes[0];
      setMakeCode(make.makeCode);
      setMakeSearch(`${make.makeName} (${make.makeCode})`);
    }
  }, [filteredMakes, makeCode]);

  const inputClassName =
    "h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:h-11 sm:rounded-2xl sm:px-3.5 sm:focus:ring-4";
  const selectClassName = `${inputClassName} appearance-none pr-11`;
  const textareaClassName =
    "min-h-16 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:min-h-20 sm:rounded-2xl sm:px-3.5 sm:py-2.5 sm:focus:ring-4";
  const readOnlyFieldClassName =
    "min-h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:min-h-11 sm:rounded-2xl sm:px-3.5 sm:py-2.5";
  const labelClassName =
    "mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:mb-1.5 sm:tracking-[0.14em]";

  const handleEmpSearchChange = (value: string) => {
    setEmpSearch(value);
    const selectedEmployee = employeesList.find((employee) => employee.empCode === empCode);
    const selectedLabel = selectedEmployee
      ? `${selectedEmployee.empName} (${selectedEmployee.empCode})`
      : "";

    if (value !== selectedLabel) {
      setEmpCode("");
    }
  };

  const handleMakeSearchChange = (value: string) => {
    setMakeSearch(value);
    const selectedMake = makesList.find((make) => make.makeCode === makeCode);
    const selectedLabel = selectedMake
      ? `${selectedMake.makeName} (${selectedMake.makeCode})`
      : "";

    if (value !== selectedLabel) {
      setMakeCode("");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!empCode) {
      alert("Please select an Employee.");
      return;
    }
    if (!qty || Number.isNaN(Number(qty)) || Number(qty) <= 0) {
      alert("Please enter a valid positive quantity.");
      return;
    }
    if (!deptCode) {
      alert("Please select a Department.");
      return;
    }
    if (!series) {
      alert("Please select an Indent Series.");
      return;
    }
    if (series === "I5" && !selectedDivCode) {
      alert("Please select a Division.");
      return;
    }
    if (!costCode) {
      alert("Please select a Cost Center.");
      return;
    }
    if (!makeCode) {
      alert("Please select Preferred Make/Brand.");
      return;
    }
    if (!specs.trim()) {
      alert("Please enter specifications.");
      return;
    }
    if (!purpose.trim()) {
      alert("Please enter purpose of procurement.");
      return;
    }

    const selectedEmployee = employeesList.find((employee) => employee.empCode === empCode);
    const selectedMake = makesList.find((make) => make.makeCode === makeCode);

    onSubmit({
      itemCode: item.itemCode,
      itemName: item.itemName,
      qty: Number(qty),
      um: item.um,
      deptCode,
      series,
      divCode: selectedDivCode || null,
      costCode,
      userCode: empCode,
      empName: selectedEmployee?.empName || "",
      make: makeCode,
      makeName: selectedMake?.makeName || "",
      specs: specs.trim(),
      purpose: purpose.trim(),
      dueDate,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 space-y-2.5 sm:mt-3 sm:space-y-3"
    >
      <div className="space-y-0.5">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 sm:text-sm">
          Raise Indent Form
        </p>
        <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
          Item unavailable hone par direct Oracle indent raise flow.
        </p>
      </div>

      <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClassName}>Employee (Requested By) *</label>
          <div className="relative">
            <input
              type="text"
              value={empSearch}
              onChange={(event) => handleEmpSearchChange(event.target.value)}
              onFocus={() => setIsEmpFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setIsEmpFocused(false), 150);
              }}
              placeholder="Search employee by name or code..."
              className={inputClassName}
              required
            />
            {isEmpFocused && filteredEmployees.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950 sm:mt-1.5 sm:max-h-52 sm:rounded-2xl">
                {filteredEmployees.slice(0, 50).map((employee) => (
                  <button
                    key={employee.empCode}
                    type="button"
                    onMouseDown={() => {
                      setEmpCode(employee.empCode);
                      setEmpSearch(`${employee.empName} (${employee.empCode})`);
                      setIsEmpFocused(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm transition hover:bg-slate-50 last:border-b-0 dark:border-slate-800 dark:hover:bg-slate-900"
                  >
                    <span className="truncate">{employee.empName}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {employee.empCode}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={labelClassName}>Item Name</label>
          <div className={readOnlyFieldClassName}>
            {item.itemName} ({item.itemCode})
          </div>
        </div>

        <div>
          <label className={labelClassName}>Quantity Required ({item.um}) *</label>
          <input
            type="number"
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            className={inputClassName}
            min="1"
            step="any"
            placeholder="Enter quantity"
            required
          />
        </div>

        <div>
          <label className={labelClassName}>Department *</label>
          <div className="relative">
            <select
              value={deptCode}
              onChange={(event) => setDeptCode(event.target.value)}
              className={selectClassName}
              required
            >
              <option value="">Select Department...</option>
              {departments.map((department) => (
                <option key={department.deptCode} value={department.deptCode}>
                  {department.deptName} ({department.deptCode})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div>
          <label className={labelClassName}>Indent Series *</label>
          <div className="relative">
            <select
              value={series}
              onChange={(event) => setSeries(event.target.value)}
              className={selectClassName}
              required
            >
              <option value="">Select Indent Series...</option>
              {seriesList.map((entry) => (
                <option key={entry.series} value={entry.series}>
                  {entry.series} - {entry.descr} ({entry.entityCode})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {series === "I5" ? (
          <div>
            <label className={labelClassName}>Division *</label>
            <div className="relative">
              <select
                value={selectedDivCode}
                onChange={(event) => setSelectedDivCode(event.target.value)}
                className={selectClassName}
                required
              >
                <option value="">Select Division...</option>
                <option value="CO">CORPORATE/COMMON (CO)</option>
                <option value="SM">STEEL MELTING SHOP (SMS) (SM)</option>
                <option value="RM">TMT ROLLING MILL (RM)</option>
                <option value="RP">PATRA ROLLING MILL (RP)</option>
                <option value="PM">PIPE MILL (PM)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        ) : null}

        <div>
          <label className={labelClassName}>Cost Center (Cost Code) *</label>
          <div className="relative">
            <select
              value={costCode}
              onChange={(event) => setCostCode(event.target.value)}
              className={selectClassName}
              required
            >
              <option value="">Select Cost Center...</option>
              {costCodesList.map((entry) => (
                <option key={entry.costCode} value={entry.costCode}>
                  {entry.costName} ({entry.costCode})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={labelClassName}>Preferred Make/Brand *</label>
          <div className="relative">
            <input
              type="text"
              value={makeSearch}
              onChange={(event) => handleMakeSearchChange(event.target.value)}
              onFocus={() => setIsMakeFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setIsMakeFocused(false), 150);
              }}
              placeholder="Search make by name or code..."
              className={inputClassName}
              required
            />
            {isMakeFocused && filteredMakes.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950 sm:mt-1.5 sm:max-h-52 sm:rounded-2xl">
                {filteredMakes.slice(0, 50).map((make) => (
                  <button
                    key={make.makeCode}
                    type="button"
                    onMouseDown={() => {
                      setMakeCode(make.makeCode);
                      setMakeSearch(`${make.makeName} (${make.makeCode})`);
                      setIsMakeFocused(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm transition hover:bg-slate-50 last:border-b-0 dark:border-slate-800 dark:hover:bg-slate-900"
                  >
                    <span className="truncate">{make.makeName}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {make.makeCode}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={labelClassName}>Specifications / Details *</label>
          <textarea
            value={specs}
            onChange={(event) => setSpecs(event.target.value)}
            placeholder="Enter procurement specifications..."
            className={textareaClassName}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClassName}>Purpose of Procurement *</label>
          <textarea
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="What is this item being procured for?"
            className={textareaClassName}
            required
          />
        </div>

        <div>
          <label className={labelClassName}>Required By (Due Date) *</label>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className={inputClassName}
            required
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-0.5 sm:flex-row sm:justify-end sm:gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900 sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white sm:w-auto"
        >
          Submit Indent
        </button>
      </div>
    </form>
  );
}
