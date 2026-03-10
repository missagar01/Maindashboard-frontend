export type PortalNavKey =
  | "home"
  | "checklist"
  | "store"
  | "sales"
  | "subscription"
  | "hrms"
  | "logistic"
  | "batchcode"
  | "visitor-gate-pass"
  | "close-gate-pass";

export interface PortalNavItem {
  key: string;
  label: string;
  path: string;
}

interface PortalSystemDefinition {
  key: PortalNavKey;
  label: string;
  path: string;
  aliases: string[];
}

const normalizePath = (path: string) => {
  const cleaned = path.split("?")[0].replace(/\/$/, "");
  return cleaned === "" ? "/" : cleaned;
};

export const normalizeSystemIdentifier = (value: string) =>
  (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const PORTAL_SYSTEM_DEFINITIONS: PortalSystemDefinition[] = [
  {
    key: "home",
    label: "HOME",
    path: "/",
    aliases: ["home", "dashboard"],
  },
  {
    key: "checklist",
    label: "CHECKLIST COMBINED",
    path: "/checklist",
    aliases: ["checklistcombined", "checklist", "maintenance", "housekeeping"],
  },
  {
    key: "store",
    label: "STORE AND PURCHASE",
    path: "/store/dashboard",
    aliases: ["storeandpurchase", "store", "stores", "purchase", "inventory", "storefms"],
  },
  {
    key: "sales",
    label: "SALES MODULE",
    path: "/lead-to-order/leads",
    aliases: ["salesmodule", "sales", "sale", "leadtoorder", "lead_to_order", "crm", "o2d", "logistic", "logistics", "dispatch", "batchcode", "batch"],
  },
  {
    key: "subscription",
    label: "SUBSCRIPTION",
    path: "/subscription/all",
    aliases: ["subscription", "document", "documents", "loan", "payment", "resource"],
  },
  {
    key: "hrms",
    label: "HRMS",
    path: "/hrfms/dashboard",
    aliases: ["hrms", "hrfms", "hr_fms", "hr-fms"],
  },

  {
    key: "visitor-gate-pass",
    label: "VISITOR GATE PASS",
    path: "/gatepass/visitor",
    aliases: ["visitorgatepass", "visitorpass", "visitorgate", "gatepassvisitor", "gatepass"],
  },
  {
    key: "close-gate-pass",
    label: "CLOSE GATE PASS",
    path: "/gatepass/close",
    aliases: ["closegatepass", "closepass", "closegate", "gatepassclose"],
  },
];

export const DEFAULT_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { key: "home", label: "HOME", path: "/" },
  { key: "checklist", label: "CHECKLIST COMBINED", path: "/checklist" },
  { key: "store", label: "STORE AND PURCHASE", path: "/store/dashboard" },
  { key: "sales", label: "SALES MODULE", path: "/o2d/dashboard" },
  { key: "subscription", label: "SUBSCRIPTION", path: "/subscription/all" },
  { key: "hrms", label: "HRMS", path: "/hrfms/dashboard" },
  // { key: "logistic", label: "LOGISTIC", path: "https://triofleet.trieon.in/" },
  // { key: "batchcode", label: "BATCHCODE", path: "/batchcode/hot-coil" },
  { key: "visitor-gate-pass", label: "VISITOR GATE PASS", path: "/gatepass/visitor" },
  { key: "close-gate-pass", label: "CLOSE GATE PASS", path: "/gatepass/close" },
];

export const resolvePortalSystemDefinition = (systemName?: string | null) => {
  const normalized = normalizeSystemIdentifier(systemName || "");
  if (!normalized) return null;

  return (
    PORTAL_SYSTEM_DEFINITIONS.find(
      (definition) =>
        normalizeSystemIdentifier(definition.label) === normalized ||
        definition.aliases.some((alias) => normalizeSystemIdentifier(alias) === normalized)
    ) || null
  );
};

export const resolvePortalNavItem = (
  systemName?: string | null,
  _link?: string | null
): PortalNavItem | null => {
  const definition = resolvePortalSystemDefinition(systemName);

  if (!definition) {
    return null;
  }

  return {
    key: definition.key,
    label: definition.label,
    path: definition.path,
  };
};

export const isPortalHomePath = (path: string) => {
  const normalized = normalizePath(path);
  return normalized === "/" || normalized === "/dashboard";
};

export const getActivePortalNavKey = (path: string): PortalNavKey => {
  const normalized = normalizePath(path);

  if (normalized.startsWith("/checklist")) return "checklist";
  if (normalized.startsWith("/store")) return "store";
  if (normalized.startsWith("/o2d")) return "sales";
  if (normalized.startsWith("/subscription")) return "subscription";
  if (
    normalized.startsWith("/document") ||
    normalized.startsWith("/loan") ||
    normalized.startsWith("/payment") ||
    normalized.startsWith("/account") ||
    normalized.startsWith("/resource-manager") ||
    normalized.startsWith("/master")
  ) {
    return "subscription";
  }
  if (normalized.startsWith("/hrfms")) return "hrms";
  if (
    normalized.startsWith("/o2d") ||
    normalized.startsWith("/batchcode") ||
    normalized.startsWith("/lead-to-order")
  ) {
    return "sales";
  }
  if (normalized.startsWith("/gatepass/visitor")) return "visitor-gate-pass";
  if (normalized.startsWith("/gatepass/close")) return "close-gate-pass";

  return "home";
};

export const getSidebarModuleForPath = (path: string): PortalNavKey | null => {
  const normalized = normalizePath(path);

  if (
    normalized.startsWith("/lead-to-order") ||
    normalized.startsWith("/o2d") ||
    normalized.startsWith("/batchcode")
  ) {
    return "sales";
  }

  const key = getActivePortalNavKey(path);
  return key === "home" ? null : key;
};

export const shouldShowSidebarForPath = (path: string) =>
  getSidebarModuleForPath(path) !== null;
