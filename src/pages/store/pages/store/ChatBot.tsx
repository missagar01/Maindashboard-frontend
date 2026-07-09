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
  Clock,
  User,
  Calendar,
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
import { useAuth } from "@/context/AuthContext";

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
  summaryCard?: ChatbotIndentPayload & { items?: any[] };
  successCard?: {
    vrNo?: string;
    message?: string;
  };
  indentForm?: boolean;
  formItem?: ChatbotItem;
  isAdditionalItemForm?: boolean;
  disabledForm?: boolean;
  usersList?: Array<{
    user_name: string;
    employee_id: string | null;
    role: string | null;
    designation: string | null;
    department: string | null;
    division: string | null;
    status: string | null;
  }>;
  tasksSummary?: Array<{
    module: string;
    total: number;
    completed: number;
    pending: number;
  }>;
  tasksTargetDate?: string;
  taskDiagnostic?: {
    latestTask?: {
      source: string;
      task_name: string;
      task_start_date: string;
      submission_date: string;
      status: string;
    };
    diagnosis: string;
  };
  tasksCountBreakdown?: Array<{
    module: string;
    count: number;
  }>;
  totalNotDoneTasks?: number;
  countType?: "total" | "completed" | "pending_today" | "notdone";
  tasksList?: Array<{
    source: string;
    task_name: string;
    given_by: string | null;
    frequency: string | null;
    status: string;
    completed_at: string | null;
    delay: string | null;
    task_start_date: string;
  }>;
  isScore?: boolean;
  scoreStartDate?: string;
  scoreEndDate?: string;
  scoreData?: {
    division: string;
    department: string;
    doer: string;
    employee_id: string | null;
    total_tasks: number;
    total_completed_tasks: number;
    not_completed_tasks: number;
    completion_score: number;
  };
};

const formatChatTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatToDdMmYyyy = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
    }
    return dateStr;
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

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
    label: "Connected to Sagar Vision Assistant",
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

export default function ChatBot({ isFloating = false }: { isFloating?: boolean }) {
  const { user } = useAuth();
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
  const [chatState, setChatState] = useState<"idle" | "awaiting_search_term">("idle");

  // Multi-item indent states
  const [cartItems, setCartItems] = useState<Array<{
    itemCode: string;
    itemName: string;
    um: string;
    qty: number;
    make: string;
    makeName: string;
    specs: string;
    purpose: string;
  }>>([]);
  const [headerData, setHeaderData] = useState<{
    userCode: string;
    empName: string;
    deptCode: string;
    series: string;
    divCode: string | null;
    costCode: string;
    dueDate: string;
  } | null>(null);

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
    setChatState("idle");

    try {
      const data: ChatbotBootstrapData = await chatbotApi.getBootstrapData(true);

      setApiKey(data.apiKey);
      setDepartments(data.departments);
      setSeriesList(data.seriesList);
      setCostCodesList(data.costCodesList);
      setEmployeesList(data.employeesList);
      setMakesList(data.makesList);
      setConnectionState("connected");

      const displayName = user?.user_name || "User";
      addBotMessage(
        `नमस्ते <strong>${displayName}</strong>! मैं <strong>Sagar Vision</strong> हूँ। मैं आपकी क्या मदद कर सकता हूँ?`,
        [
          { label: "📦 Create Procurement Indent / नया इंडेंट", action: () => handleInitiateIndent() },
          { label: "🔍 Check Stock / स्टॉक चेक करें", action: () => promptSearchItem() }
        ]
      );
    } catch (error) {
      console.error("Chatbot bootstrap failed:", error);
      setConnectionState("failed");
      addBotMessage(
        "⚠️ कुछ टेक्निकल खराबी के वजह से मैं response देने में असमर्थ हूँ।"
      );
    }
  };

  const handleInitiateIndent = () => {
    addUserMessage("Create Procurement Indent / नया इंडेंट");
    promptSearchItem();
  };

  const promptSearchItem = () => {
    setChatState("awaiting_search_term");
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

    // Only display suggestions if user types one of the trigger keywords
    const triggerRegex = /(indent|item|stock|purchase|procurement|इन्डेंट|स्टॉक)/i;
    if (!triggerRegex.test(value)) {
      setSuggestions([]);
      return;
    }

    try {
      // Clean query by removing the trigger keyword to get the clean item name
      let cleanQuery = value.trim();
      cleanQuery = cleanQuery
        .replace(/(indent|item|stock|purchase|procurement|इन्डेंट|स्टॉक)/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      // If query is empty or too short after cleaning, don't query suggestions
      if (cleanQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      const data = await chatbotApi.searchItems(cleanQuery, apiKey);
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

    const cleanText = searchValue.toLowerCase();
    const words = cleanText.split(/\s+/);
    const isSentence = words.length > 2;

    // 1. Greetings (Multilingual support: sat sri akal, kem cho, kasakai, veere, paji, bro, etc.)
    const greetingRegex = /^(hi|hello|hey|namaste|नमस्ते|pranam|ram ram|hello bot|hii|hiii|yo|greeting|satsriakal|sat sri akal|kem cho|kemcho|kasakai|vanakkam|namaskara|veere|paji|bro)$/i;
    if (greetingRegex.test(cleanText)) {
      const displayName = user?.user_name || "User";
      addBotMessage(
        `नमस्ते <strong>${displayName}</strong>! मैं <strong>Sagar Store Assistant</strong> हूँ। मैं आपकी क्या मदद कर सकता हूँ?`,
        [
          { label: "📦 Create Procurement Indent / नया इंडेंट", action: () => handleInitiateIndent() },
          { label: "🔍 Check Stock / स्टॉक चेक करें", action: () => promptSearchItem() }
        ]
      );
      return;
    }

    // 1b. User profile / identity check ("main kon hu", "who am i", etc.)
    const profileRegex = /^(who am i|main kon hu|main kaun hoon|mera naam kya hai|mera naam|about me|my profile|meri profile|my details|detail meri|mere details|मैं कौन हूँ|मेरा नाम क्या है|मेरा नाम|मेरी प्रोफाइल|प्रोफाइल)$/i;
    if (profileRegex.test(cleanText)) {
      const displayName = user?.user_name || "User";
      const empId = user?.employee_id || "N/A";
      const role = user?.role || "user";
      const designation = user?.designation || "N/A";
      const department = user?.department || "N/A";
      const division = user?.division || "N/A";

      addBotMessage(
        `आप **${displayName}** हैं। आपका विवरण निम्नलिखित है:<br/>` +
        `• **Employee ID**: ${empId}<br/>` +
        `• **Designation**: <span class="capitalize">${designation}</span><br/>` +
        `• **Department**: <span class="uppercase">${department}</span><br/>` +
        `• **Division**: <span class="uppercase">${division}</span><br/>` +
        `• **Role**: <span class="capitalize">${role}</span>`
      );
      return;
    }

    // 1c. Bot identity check ("who are you", "tum kaun ho", "what is your name", etc.)
    const botIdentityRegex = /^(who are you|what is your name|tum kaun ho|tum kon ho|aap kaun hain|aap kon ho|tera naam kya hai|apka naam|aapka naam|what's your name|tell me about yourself|तुम कौन हो|तुम्हारा नाम क्या है|तुम्हारा नाम|आप कौन हैं|आपका नाम क्या है)$/i;
    if (botIdentityRegex.test(cleanText)) {
      addBotMessage(
        `मैं **Sagar Pipe Agent** हूँ, आपका स्टोर असिस्टेंट। मैं आपकी **स्टोर स्टॉक चेक करने**, **इंडेंट डालने**, और **टास्क व स्कोर परफॉरमेंस** देखने में मदद कर सकता हूँ।`
      );
      return;
    }

    // 1d. Gratitude check ("thanks", "thank you", "dhanyawad", etc.)
    const gratitudeRegex = /^(thanks|thank you|dhanyawad|dhanyavaad|shukriya|shukran|धन्यवाद|शुक्रिया)$/i;
    if (gratitudeRegex.test(cleanText)) {
      addBotMessage(
        `आपका स्वागत है! यदि आपके पास स्टोर स्टॉक, इंडेंट, या अपने कार्यों (tasks) से संबंधित कोई और प्रश्न है, तो बेझिझक पूछें।`
      );
      return;
    }

    // 2. Unsupported / Future domains (HRMS, Gatepass, Transport etc.)
    const unsupportedRegex = /(salary|attendance|leave|payslip|gatepass|visitor|transport|vehicle|lorry|bilty|lr|invoice|bill|audit|project|dpr|machinery)/i;
    if (unsupportedRegex.test(cleanText)) {
      addBotMessage(
        `मुझे क्षमा करें, अभी मैं केवल **स्टोर स्टॉक चेक करने** और **नया इंडेंट (Procurement Indent) डालने** में आपकी मदद कर सकता हूँ। जल्द ही अन्य फीचर्स (जैसे सैलरी, अटेंडेंस, ट्रांसपोर्ट, गेटपास आदि) भी जोड़े जायेंगे।`
      );
      return;
    }

    // 3. Block database write / modify requests
    const modifyKeywords = /(update|delete|insert|alter|drop|set|change|remove|modify|edit|write|बदलो|अपडेट|हटाओ|जोड़ो|एडिट|संशोधन|बदलाव)/i;
    const usersQueryKeywords = /(user|employee|member|staff|designation|role|department|division|status|username|login|profile|information|record|database|table|admin|manager|hod|यूजर|कर्मचारी|स्टाफ़|लोगो|विवरण|प्रोफ़ाइल|जानकारी)/i;
    const tasksQueryKeywords = /(task|tasks|checklist|maintenance|housekeeping|kaam|काम|ड्यूटी|duty|schedule|not done|uncompleted|incomplete|missed|fail|क्यों गया|क्यो गया|score|performance|marks|points|स्कोर|प्रदर्शन|मार्क्स)/i;

    if (modifyKeywords.test(cleanText) && (usersQueryKeywords.test(cleanText) || tasksQueryKeywords.test(cleanText))) {
      addBotMessage(
        "मुझे क्षमा करें, मुझे केवल डेटा दिखाने की अनुमति है। यदि आपका यह कार्य बहुत आवश्यक है, तो कृपया ऑटोमेशन टीम से संपर्क करें।<br/><br/>(I apologize, I only have permission to display data. If it is essential for you to perform this action, please contact the Automation Team.)"
      );
      return;
    }

    // Helper to determine if query is a natural language question or action command
    const isGeneralQuery = (text: string) => {
      const words = text.trim().split(/\s+/);
      if (words.length > 2) return true; // Sentences are general queries

      const queryIndicators = /(show|list|view|get|find|why|who|what|how|where|when|kya|kaise|kab|kon|kaun|kisne|kiske|dikhao|batao|check|detail|status|report|score|performance|task|user|employee|repair|followup)/i;
      return queryIndicators.test(text);
    };

    if (isGeneralQuery(searchValue)) {
      setIsSubmittingSearch(true);
      const token = localStorage.getItem("token");

      try {
        const res = await chatbotApi.queryGeneral(searchValue, token, apiKey);
        if (res.success) {
          if (res.resultType === "items") {
            if (res.items && res.items.length > 0) {
              addBotMessage(
                "Mujhe ye items mile hain. Kripya ek item select karein:",
                res.items.slice(0, 10).map((item) => ({
                  label: `${item.itemName} (${item.itemCode})`,
                  action: () => handleSelectSearchItem(item),
                }))
              );
            } else {
              addBotMessage(
                `⚠️ मुझे "<strong>${searchValue}</strong>" naam ya code se koi item nahi mila. Kripya dobara try karein.`
              );
            }
          } else if (res.resultType === "users") {
            if (!res.users || res.users.length === 0) {
              addBotMessage(res.message || "डेटाबेस में कोई यूजर नहीं मिला।");
            } else {
              addBotMessage(
                res.message || `मुझे निम्नलिखित ${res.users.length} यूजर रिकॉर्ड मिले हैं:`,
                null,
                { usersList: res.users }
              );
            }
          } else if (res.resultType === "tasks") {
            if (!res.tasksList || res.tasksList.length === 0) {
              addBotMessage(res.message || "मुझे आपके कोई tasks नहीं मिले।");
            } else {
              addBotMessage(
                res.message || `यहाँ आपके tasks का विवरण है:`,
                null,
                {
                  tasksSummary: res.summary,
                  tasksTargetDate: res.targetDate,
                  tasksList: res.tasksList
                }
              );
            }
          } else if (res.resultType === "tasksSummary") {
            addBotMessage(
              res.message || `यहाँ tasks का summary है:`,
              null,
              {
                tasksSummary: res.summary,
                tasksTargetDate: res.targetDate
              }
            );
          } else if (res.resultType === "taskDiagnostic") {
            if (res.latestTask) {
              addBotMessage(
                res.message || `आपके **${res.latestTask.source}** task का status **'Not Done'** होने का कारण:`,
                null,
                {
                  taskDiagnostic: {
                    latestTask: res.latestTask,
                    diagnosis: res.diagnosis || ""
                  }
                }
              );
            } else {
              addBotMessage(res.message || "मुझे आपके कोई 'Not Done' tasks नहीं मिले।");
            }
          } else if (res.resultType === "tasksCountBreakdown") {
            addBotMessage(
              res.message || `इस महीने आपके tasks का विवरण है:`,
              null,
              {
                tasksCountBreakdown: res.breakdown,
                totalNotDoneTasks: res.totalNotDone,
                countType: res.countType || "notdone"
              }
            );
          } else if (res.resultType === "scoreData") {
            addBotMessage(
              res.message || `यहाँ आपके कार्यों का स्कोर है:`,
              null,
              {
                isScore: true,
                scoreStartDate: res.startDate,
                scoreEndDate: res.endDate,
                scoreData: res.scoreData
              }
            );
          } else {
            // General conversation / SQL response
            addBotMessage(res.message || "⚠️ कोई परिणाम नहीं मिला।");
          }
        } else {
          addBotMessage("कुछ टेक्निकल खराबी के वजह से मैं response देने में असमर्थ हूँ।");
        }
      } catch (err) {
        console.error("General query failed:", err);
        addBotMessage("कुछ टेक्निकल खराबी के वजह से मैं response देने में असमर्थ हूँ।");
      } finally {
        setIsSubmittingSearch(false);
      }
      return;
    }

    // Default: Run Search in Database directly for short codes / terms
    setIsSubmittingSearch(true);
    setChatState("idle"); // reset state after initiating search

    let cleanSearchValue = searchValue.trim();
    const cleanLower = cleanSearchValue.toLowerCase();

    // Check if it's just a command to start indenting
    const indentTriggerRegex = /^(indent|create indent|new indent|indent karna hai|mujhe indent karna hai|नया इंडेंट|इंडेंट|इंडेंट डालना है|procurement indent)$/i;
    if (indentTriggerRegex.test(cleanLower)) {
      setIsSubmittingSearch(false);
      promptSearchItem();
      return;
    }

    // Clean trigger keywords to search for the actual item name/code
    cleanSearchValue = cleanSearchValue
      .replace(/(indent|item|stock|purchase|procurement|इन्डेंट|स्टॉक)/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanSearchValue) {
      setIsSubmittingSearch(false);
      promptSearchItem();
      return;
    }

    try {
      const items = await chatbotApi.searchItems(cleanSearchValue, apiKey);

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
          `⚠️ मुझे "<strong>${cleanSearchValue}</strong>" naam ya code se koi item nahi mila. Kripya dobara try karein.`
        );
      }
    } catch (error) {
      console.error("Item search failed:", error);
      addBotMessage("कुछ टेक्निकल खराबी के वजह से मैं response देने में असमर्थ हूँ।");
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
      addBotMessage("कुछ टेक्निकल खराबी के वजह से मैं response देने में असमर्थ हूँ।");
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
    const isAdditional = cartItems.length > 0;
    addBotMessage(
      isAdditional
        ? `कृपया <strong>${item.itemName}</strong> ke लिए details भरें:`
        : "कृपया नीचे दिए गए form में indent details भरें:",
      null,
      {
        indentForm: true,
        formItem: item,
        isAdditionalItemForm: isAdditional,
      }
    );
  };

  const resetCart = () => {
    setCartItems([]);
    setHeaderData(null);
    addUserMessage("Discard Indent & Reset");
    addBotMessage("Indent process cancel kar di gayi hai. Cart reset ho gaya hai.", [
      { label: "Search Item Again", action: promptSearchItem },
    ]);
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

    if (cartItems.length > 0 && headerData) {
      addBotMessage(
        `Naye item ki entry cancel kar di gayi. Aapke paas list me pehle se <strong>${cartItems.length} item(s)</strong> hain.`,
        [
          {
            label: `Submit Indent (${cartItems.length} items)`,
            action: () => showFinalSummary(headerData, cartItems),
          },
          {
            label: "➕ Add Another Item",
            action: promptSearchItem,
          },
          {
            label: "❌ Discard Indent & Reset",
            action: resetCart,
          },
        ]
      );
    } else {
      addBotMessage("Indent process cancel kar di gayi hai.", [
        { label: "Search Item Again", action: promptSearchItem },
      ]);
    }
  };

  const handleFormSubmit = (messageId: string, formData: ChatbotIndentPayload) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, indentForm: false, disabledForm: true }
          : message
      )
    );

    // Save header data if it's the first item
    let currentHeader = headerData;
    if (!currentHeader) {
      currentHeader = {
        userCode: formData.userCode,
        empName: formData.empName,
        deptCode: formData.deptCode,
        series: formData.series,
        divCode: formData.divCode || null,
        costCode: formData.costCode,
        dueDate: formData.dueDate,
      };
      setHeaderData(currentHeader);
    }

    // Save item to cart
    const newItem = {
      itemCode: formData.itemCode,
      itemName: formData.itemName || formData.itemCode,
      um: formData.um || "NOS",
      qty: formData.qty,
      make: formData.make,
      makeName: formData.makeName || formData.make,
      specs: formData.specs,
      purpose: formData.purpose,
    };
    const updatedCart = [...cartItems, newItem];
    setCartItems(updatedCart);

    addUserMessage(`Added: ${newItem.itemName} (${newItem.itemCode}) to Indent List`);

    addBotMessage(
      `<strong>${newItem.itemName}</strong> aapki Indent list me add ho gaya hai. Aapke paas list me <strong>${updatedCart.length} item(s)</strong> hain.<br/>Kya aap isme koi aur item add karna chahte hain ya indent finalise karna chahte hain?`,
      [
        {
          label: "➕ Add Another Item",
          action: promptSearchItem,
        },
        {
          label: `Submit Indent (${updatedCart.length} items)`,
          action: () => showFinalSummary(currentHeader!, updatedCart),
        },
      ]
    );
  };

  const showFinalSummary = (
    header: NonNullable<typeof headerData>,
    items: typeof cartItems
  ) => {
    addUserMessage("Finalise & Submit Indent");
    addBotMessage(
      "कृपया details verify karein aur database me bhejne ke liye <strong>Confirm</strong> karein:",
      [
        {
          label: "Confirm & Send to DB",
          action: () => void submitIndentToDb(header, items),
        },
        {
          label: "➕ Add Another Item",
          action: promptSearchItem,
        },
        {
          label: "❌ Discard Indent & Reset",
          action: resetCart,
        },
      ],
      {
        summaryCard: {
          ...header,
          itemCode: items[0].itemCode,
          itemName: items[0].itemName,
          qty: items[0].qty,
          um: items[0].um,
          make: items[0].make,
          makeName: items[0].makeName,
          specs: items[0].specs,
          purpose: items[0].purpose,
          items: items.map(item => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            qty: item.qty,
            um: item.um,
            make: item.make,
            makeName: item.makeName,
            specs: item.specs,
            purpose: item.purpose
          }))
        },
      }
    );
  };

  const submitIndentToDb = async (
    header: NonNullable<typeof headerData>,
    items: typeof cartItems
  ) => {
    addUserMessage("Confirm & Send to DB");

    try {
      const payload = {
        ...header,
        items: items.map(item => ({
          itemCode: item.itemCode,
          qty: item.qty,
          make: item.make,
          specs: item.specs,
          purpose: item.purpose
        }))
      };

      const result = await chatbotApi.createIndent(payload as any, apiKey);

      if (result.success) {
        addBotMessage(
          `बधाई हो! ${items.length} item(s) ka Indent safalta se raise ho gaya hai aur database me submit kar diya gaya hai.`,
          [{ label: "Raise Another Indent", action: promptSearchItem }],
          {
            successCard: {
              vrNo: result.vrNo,
              message: result.message,
            },
          }
        );
        // Reset cart and header
        setCartItems([]);
        setHeaderData(null);
        return;
      }

      addBotMessage("कुछ टेक्निकल खराबी के वजह से मैं response देने में असमर्थ हूँ।");
    } catch (error) {
      console.error("Indent submission failed:", error);
      addBotMessage("कुछ टेक्निकल खराबी के वजह से मैं response देने में असमर्थ हूँ।");
    }
  };

  const retryConnection = () => {
    hasInitializedRef.current = false;
    void loadBackendConfig();
  };

  const renderInnerContent = () => (
    <div className={isFloating ? "flex h-full w-full flex-col overflow-hidden bg-[#efeae2] dark:bg-slate-950" : "mx-auto flex h-[calc(100dvh-56px)] w-full max-w-4xl flex-col overflow-hidden bg-[#efeae2] shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] dark:bg-slate-950 sm:h-[calc(100dvh-112px)] sm:min-h-[620px] sm:rounded-[28px] sm:border sm:border-slate-200 dark:sm:border-slate-800"}>
      <div className={`flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.74)),radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_38%)] px-2 py-2.5 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.96)),radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_34%)] ${isFloating ? "" : "sm:px-4 sm:py-5"}`}>
        {connectionState !== "connected" && (
          <div className="sticky top-0 z-10 mb-2 flex flex-col items-center gap-1.5 pb-0 sm:mb-4 sm:gap-2 sm:pb-1">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur sm:px-3 sm:text-[11px] ${activeConnectionMeta.badgeClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${activeConnectionMeta.panelClass}`} />
              {activeConnectionMeta.label}
            </span>

            <button
              type="button"
              onClick={retryConnection}
              className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-3 text-[11px] font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <RefreshCcw className="size-3.5" />
              Retry connection
            </button>
          </div>
        )}

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

        {messages.length === 0 && connectionState === "failed" ? (
          <div className="flex h-full min-h-[320px] items-center justify-center p-4">
            <div className="rounded-[20px] border border-rose-100 bg-white/95 px-6 py-6 text-center shadow-sm dark:border-rose-900/30 dark:bg-slate-900/90 sm:rounded-[24px] sm:px-8 sm:py-7 max-w-md">
              <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-white sm:mb-4 sm:h-12 sm:w-12">
                <AlertTriangle className="size-5" />
              </div>
              <p className="text-sm font-bold text-slate-950 dark:text-white">
                Technical Error / तकनीकी खराबी
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                कुछ टेक्निकल खराबी के वजह से मैं response देने में असमर्थ हूँ।
              </p>
              <button
                type="button"
                onClick={retryConnection}
                className="mt-4.5 inline-flex h-9 items-center gap-2 rounded-full bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white px-5 text-xs font-semibold shadow-sm transition sm:mt-5"
              >
                <RefreshCcw className="size-3.5" />
                Retry Connection
              </button>
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
                className={`space-y-1.5 ${message.indentForm
                  ? "w-full max-w-full md:max-w-[96%] lg:max-w-[92%]"
                  : message.summaryCard
                    ? "max-w-[96%] sm:max-w-[90%] lg:max-w-[84%]"
                    : "max-w-[92%] sm:max-w-[84%] lg:max-w-[76%]"
                  }`}
              >
                <div
                  className={`rounded-[20px] px-3 py-2.5 shadow-sm sm:rounded-[22px] sm:px-4 sm:py-3 ${message.sender === "user"
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

                  {message.usersList ? (
                    <UsersListCard users={message.usersList} />
                  ) : null}

                  {message.tasksSummary ? (
                    <TasksSummaryCard
                      summary={message.tasksSummary}
                      targetDate={message.tasksTargetDate || ""}
                    />
                  ) : null}

                  {message.tasksList ? (
                    <TasksListCard tasks={message.tasksList} />
                  ) : null}

                  {message.taskDiagnostic ? (
                    <TasksDiagnosticCard
                      diagnostic={message.taskDiagnostic}
                    />
                  ) : null}

                  {message.tasksCountBreakdown ? (
                    <TasksCountBreakdownCard
                      breakdown={message.tasksCountBreakdown}
                      total={message.totalNotDoneTasks || 0}
                      countType={message.countType || "notdone"}
                    />
                  ) : null}

                  {message.isScore && message.scoreData ? (
                    <TasksScoreCard
                      startDate={message.scoreStartDate || ""}
                      endDate={message.scoreEndDate || ""}
                      score={message.scoreData}
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
                      isAdditionalItem={message.isAdditionalItemForm}
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
                  className={`px-1 text-[11px] text-slate-400 ${message.sender === "user" ? "text-right" : ""
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

      <div className={`border-t border-slate-200 bg-white/92 px-2 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/92 ${isFloating ? "" : "sm:px-4 sm:py-3"}`}>
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
  );

  if (isFloating) {
    return renderInnerContent();
  }

  return (
    <div className="w-full px-0 py-0 sm:px-4 sm:py-4 md:px-6">
      {renderInnerContent()}
    </div>
  );
}

function TasksListCard({
  tasks,
}: {
  tasks: Array<{
    source: string;
    task_name: string;
    given_by: string | null;
    frequency: string | null;
    status: string;
    completed_at: string | null;
    delay: string | null;
    task_start_date: string;
  }>;
}) {
  return (
    <div className="mt-4 space-y-3 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar text-left">
      {tasks.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
          कोई task नहीं मिला। (No tasks found.)
        </div>
      ) : (
        tasks.map((task, i) => {
          const isCompleted = task.completed_at !== null || String(task.status).trim().toLowerCase() === "yes";

          // Format start date and completion time to dd/mm/yyyy HH:MM
          const formatDateTime = (dateStr: string | null) => {
            if (!dateStr) return "";
            const d = new Date(dateStr);
            if (Number.isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, "0");
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            return `${day}/${month}/${year} ${hours}:${minutes}`;
          };

          return (
            <div
              key={`${task.task_name}-${i}`}
              className={`rounded-2xl border p-3.5 transition duration-200 ${isCompleted
                ? "border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/55 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10"
                : "border-amber-100 bg-amber-50/30 hover:bg-amber-50/55 dark:border-amber-500/20 dark:bg-amber-500/5 dark:hover:bg-amber-500/10"
                }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="space-y-1 min-w-0">
                  {/* Source badge & Frequency Pill */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-500/10 uppercase tracking-wider">
                      {task.source}
                    </span>
                    {task.frequency && (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/30 dark:border-slate-700/30 capitalize">
                        {task.frequency}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-50 text-sm leading-snug break-words">
                    {task.task_name}
                  </h4>
                </div>

                {/* Status Badge */}
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${isCompleted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="size-3 animate-pulse text-emerald-600 dark:text-emerald-400" /> Done
                    </>
                  ) : (
                    <>
                      <Clock className="size-3 text-amber-600 dark:text-amber-400" /> Pending
                    </>
                  )}
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 dark:border-slate-800/40 pt-2 text-xs text-slate-600 dark:text-slate-300">
                {task.given_by && (
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Assigned by: <strong className="text-slate-800 dark:text-slate-200">{task.given_by}</strong>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-400 shrink-0" />
                  <span>
                    Start: <strong className="text-slate-800 dark:text-slate-200">{formatDateTime(task.task_start_date)}</strong>
                  </span>
                </div>

                {isCompleted && task.completed_at && (
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    <span>
                      Completed at: <strong className="text-slate-800 dark:text-slate-200">{formatDateTime(task.completed_at)}</strong>
                    </span>
                  </div>
                )}

                {task.delay && (
                  <div className="flex items-center gap-1.5 sm:col-span-2 text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>
                      Delay: <strong>{task.delay}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function TasksScoreCard({
  startDate,
  endDate,
  score,
}: {
  startDate: string;
  endDate: string;
  score: {
    division: string;
    department: string;
    doer: string;
    employee_id: string | null;
    total_tasks: number;
    total_completed_tasks: number;
    not_completed_tasks: number;
    completion_score: number;
  };
}) {
  const completionPercentage = score.total_tasks > 0
    ? Math.round((score.total_completed_tasks / score.total_tasks) * 100)
    : 0;
  const displayPercentage = Math.min(completionPercentage, 100);

  const completionScore = Number(score.completion_score);
  const isPerfect = completionScore === 0;

  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5 text-left">
      <div className="mb-3 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
        Performance Score Report ({formatToDdMmYyyy(startDate)} - {formatToDdMmYyyy(endDate)})
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 mb-4">
        {/* Circular Gauge / Large Score display */}
        <div className="relative flex size-24 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-4 border-indigo-500/10 shadow-sm">
          <div className="text-center">
            <span className={`text-2xl font-black ${isPerfect ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {completionScore}
            </span>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Score</div>
          </div>
        </div>

        <div className="flex-1 space-y-1 w-full min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-slate-50 text-sm">
            {score.doer}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            ID: {score.employee_id || "N/A"} | {score.department} ({score.division})
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full"
                style={{ width: `${displayPercentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
              {displayPercentage}% Done
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-white/70 px-3 py-2.5 text-center dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40">
          <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Total</span>
          <strong className="text-base text-slate-800 dark:text-slate-200">{score.total_tasks}</strong>
        </div>

        <div className="rounded-xl bg-white/70 px-3 py-2.5 text-center dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40">
          <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Completed</span>
          <strong className="text-base text-emerald-600 dark:text-emerald-400">{score.total_completed_tasks}</strong>
        </div>

        <div className="rounded-xl bg-white/70 px-3 py-2.5 text-center dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40">
          <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Pending</span>
          <strong className="text-base text-amber-600 dark:text-amber-400">{score.not_completed_tasks}</strong>
        </div>
      </div>
    </div>
  );
}

function UsersListCard({
  users,
}: {
  users: Array<{
    user_name: string;
    employee_id: string | null;
    role: string | null;
    designation: string | null;
    department: string | null;
    division: string | null;
    status: string | null;
  }>;
}) {
  return (
    <div className="mt-4 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
      {users.map((u, i) => {
        const isActive = String(u.status || "").trim().toLowerCase() === "active";
        return (
          <div
            key={`${u.user_name}-${i}`}
            className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-semibold text-slate-950 dark:text-slate-50 text-sm">
                {u.user_name}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  }`}
              >
                {u.status || "Unknown"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-normal">ID: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{u.employee_id || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-normal">Role: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{u.role || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-normal">Designation: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{u.designation || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-normal">Dept/Div: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                  {u.department || "N/A"} / {u.division || "N/A"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TasksSummaryCard({
  summary,
  targetDate,
}: {
  summary: Array<{
    module: string;
    total: number;
    completed: number;
    pending: number;
  }>;
  targetDate: string;
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Tasks for {formatToDdMmYyyy(targetDate)}
      </div>
      {summary.map((m) => {
        const percent = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
        return (
          <div
            key={m.module}
            className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-3.5 dark:border-indigo-500/10 dark:bg-indigo-500/5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-950 dark:text-slate-50 text-sm">
                {m.module}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {m.completed}/{m.total} Done
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-3 text-slate-600 dark:text-slate-300">
                <span>
                  Completed: <strong className="text-emerald-600 dark:text-emerald-400">{m.completed}</strong>
                </span>
                <span>
                  Pending: <strong className="text-amber-600 dark:text-amber-400">{m.pending}</strong>
                </span>
              </div>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{percent}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TasksDiagnosticCard({
  diagnostic,
}: {
  diagnostic: {
    latestTask?: {
      source: string;
      task_name: string;
      task_start_date: string;
      submission_date: string;
      status: string;
    };
    diagnosis: string;
  };
}) {
  const task = diagnostic.latestTask;
  if (!task) return null;

  return (
    <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
      <div className="mb-2 text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
        Diagnostic Report: Not Done task
      </div>
      <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 mb-3">
        <div>
          <span className="text-slate-400 dark:text-slate-500 font-normal">Source:</span>{" "}
          <strong className="text-slate-900 dark:text-slate-100">{task.source}</strong>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500 font-normal">Task Name:</span>{" "}
          <span className="font-semibold text-slate-950 dark:text-slate-50">{task.task_name || "N/A"}</span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500 font-normal">Date:</span>{" "}
          <span className="font-medium text-slate-800 dark:text-slate-200">{formatToDdMmYyyy(task.task_start_date)}</span>
        </div>
      </div>
      <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-500/10 p-3 text-rose-900 dark:text-rose-200 text-xs font-medium leading-5">
        ℹ️ {diagnostic.diagnosis}
      </div>
    </div>
  );
}

function TasksCountBreakdownCard({
  breakdown,
  total,
  countType = "notdone",
}: {
  breakdown: Array<{
    module: string;
    count: number;
  }>;
  total: number;
  countType?: "total" | "completed" | "pending_today" | "notdone";
}) {
  const config = {
    total: {
      label: "Tasks Status Summary",
      sublabel: "Total Tasks (aaj tak)",
      borderClass: "border-blue-100 dark:border-blue-500/20",
      bgClass: "bg-blue-50/50 dark:bg-blue-500/5",
      titleClass: "text-blue-500 dark:text-blue-400",
      badgeClass: "bg-blue-100 text-blue-700 border-blue-200/50 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/10",
    },
    completed: {
      label: "Monthly Completed Tasks",
      sublabel: "Tasks Done",
      borderClass: "border-emerald-100 dark:border-emerald-500/20",
      bgClass: "bg-emerald-50/50 dark:bg-emerald-500/5",
      titleClass: "text-emerald-500 dark:text-emerald-400",
      badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/10",
    },
    pending_today: {
      label: "Today's Pending Tasks",
      sublabel: "Pending Today",
      borderClass: "border-amber-100 dark:border-amber-500/20",
      bgClass: "bg-amber-50/50 dark:bg-amber-500/5",
      titleClass: "text-amber-500 dark:text-amber-400",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200/50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/10",
    },
    notdone: {
      label: "Monthly Uncompleted Tasks",
      sublabel: "Tasks Not Done",
      borderClass: "border-rose-100 dark:border-rose-500/20",
      bgClass: "bg-rose-50/50 dark:bg-rose-500/5",
      titleClass: "text-rose-500 dark:text-rose-400",
      badgeClass: "bg-rose-100 text-rose-700 border-rose-200/50 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500/10",
    },
  };
  const c = config[countType] ?? config.notdone;

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${c.borderClass} ${c.bgClass}`}>
      <div className={`mb-2.5 text-[10px] font-bold uppercase tracking-wider ${c.titleClass}`}>
        {c.label}
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{total}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{c.sublabel}</span>
      </div>
      <div className="space-y-2.5">
        {breakdown.map((item) => (
          <div
            key={item.module}
            className="flex items-center justify-between rounded-xl bg-white/70 px-3.5 py-2.5 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40"
          >
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              {item.module}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${c.badgeClass}`}>
              {item.count}
            </span>
          </div>
        ))}
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
      className={`mt-4 rounded-2xl border p-4 ${hasStock
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

function SummaryCard({ summary }: { summary: ChatbotIndentPayload & { items?: any[] } }) {
  const rows = [
    ["Requested By", `${summary.empName} (${summary.userCode})`],
    ["Department", summary.deptCode],
    ["Series", summary.series],
    ["Division", summary.divCode || "N/A"],
    ["Cost Center", summary.costCode],
    ["Required By", formatToDdMmYyyy(summary.dueDate)],
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

        <div className="mt-2 space-y-2">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Items List</span>
          {summary.items && summary.items.length > 0 ? (
            <div className="space-y-2">
              {summary.items.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/60 space-y-1">
                  <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-100">
                    <span>{idx + 1}. {item.itemName || item.itemCode}</span>
                    <span>{item.qty} {item.um || 'NOS'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                    <p>Make: <strong className="text-slate-700 dark:text-slate-350">{item.makeName || item.make}</strong></p>
                    <p>Specs: {item.specs}</p>
                    <p>Purpose: {item.purpose}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/60 space-y-1">
              <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-100">
                <span>{summary.itemName || summary.itemCode}</span>
                <span>{summary.qty} {summary.um || 'NOS'}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <p>Make: <strong className="text-slate-700 dark:text-slate-350">{summary.makeName || summary.make}</strong></p>
                <p>Specs: {summary.specs}</p>
                <p>Purpose: {summary.purpose}</p>
              </div>
            </div>
          )}
        </div>
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
        <p>Status: <strong>Submitted Successfully / सफलतापूर्वक सबमिट किया गया</strong></p>
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
  isAdditionalItem = false,
}: {
  item: ChatbotItem;
  departments: ChatbotDepartment[];
  seriesList: ChatbotSeries[];
  costCodesList: ChatbotCostCode[];
  employeesList: ChatbotEmployee[];
  makesList: ChatbotMake[];
  onSubmit: (payload: ChatbotIndentPayload) => void;
  onCancel: () => void;
  isAdditionalItem?: boolean;
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
    console.log("[DEBUG] empSearch:", JSON.stringify(empSearch), "term:", JSON.stringify(term));
    if (!term) {
      console.log("[DEBUG] returning full list, count:", employeesList.length);
      return employeesList;
    }

    const matches = employeesList.filter((employee) => {
      const name = employee.empName.toLowerCase();
      const code = employee.empCode.toLowerCase();
      return name.includes(term) || code.includes(term);
    });

    console.log("[DEBUG] matches count:", matches.length, "matches:", matches.slice(0, 10));

    const sorted = matches.sort((a, b) => {
      const aName = a.empName.toLowerCase();
      const bName = b.empName.toLowerCase();
      const aCode = a.empCode.toLowerCase();
      const bCode = b.empCode.toLowerCase();

      const aNameStart = aName.startsWith(term);
      const bNameStart = bName.startsWith(term);
      const aCodeStart = aCode.startsWith(term);
      const bCodeStart = bCode.startsWith(term);

      if ((aNameStart || aCodeStart) && !(bNameStart || bCodeStart)) {
        return -1;
      }
      if (!(aNameStart || aCodeStart) && (bNameStart || bCodeStart)) {
        return 1;
      }
      return aName.localeCompare(bName);
    });

    return sorted;
  }, [empSearch, employeesList]);

  const filteredMakes = useMemo(() => {
    const term = makeSearch.toLowerCase().trim();
    if (!term) {
      return makesList;
    }

    const matches = makesList.filter((make) => {
      const name = make.makeName.toLowerCase();
      const code = make.makeCode.toLowerCase();
      return name.includes(term) || code.includes(term);
    });

    return matches.sort((a, b) => {
      const aName = a.makeName.toLowerCase();
      const bName = b.makeName.toLowerCase();
      const aCode = a.makeCode.toLowerCase();
      const bCode = b.makeCode.toLowerCase();

      const aNameStart = aName.startsWith(term);
      const bNameStart = bName.startsWith(term);
      const aCodeStart = aCode.startsWith(term);
      const bCodeStart = bCode.startsWith(term);

      if ((aNameStart || aCodeStart) && !(bNameStart || bCodeStart)) {
        return -1;
      }
      if (!(aNameStart || aCodeStart) && (bNameStart || bCodeStart)) {
        return 1;
      }
      return aName.localeCompare(bName);
    });
  }, [makeSearch, makesList]);

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

    if (!isAdditionalItem) {
      if (!empCode) {
        alert("Please select an Employee.");
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
    }

    if (!qty || Number.isNaN(Number(qty)) || Number(qty) <= 0) {
      alert("Please enter a valid positive quantity.");
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
      deptCode: isAdditionalItem ? "" : deptCode,
      series: isAdditionalItem ? "" : series,
      divCode: isAdditionalItem ? null : (selectedDivCode || null),
      costCode: isAdditionalItem ? "" : costCode,
      userCode: isAdditionalItem ? "" : empCode,
      empName: isAdditionalItem ? "" : (selectedEmployee?.empName || ""),
      make: makeCode,
      makeName: selectedMake?.makeName || "",
      specs: specs.trim(),
      purpose: purpose.trim(),
      dueDate: isAdditionalItem ? "" : dueDate,
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
        {!isAdditionalItem && (
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
                placeholder="Search employee by name or passport number..."
                className={inputClassName}
                required
              />
              {isEmpFocused && filteredEmployees.length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950 sm:mt-1.5 sm:max-h-52 sm:rounded-2xl">
                  {filteredEmployees.slice(0, 50).map((employee, index) => (
                    <button
                      key={`${employee.empCode}-${index}`}
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
        )}

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

        {!isAdditionalItem && (
          <>
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
          </>
        )}

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
                {filteredMakes.slice(0, 50).map((make, index) => (
                  <button
                    key={`${make.makeCode}-${index}`}
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

        {!isAdditionalItem && (
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
        )}
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
