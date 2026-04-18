const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

const fullDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const toSafeNumber = (value: unknown): number => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toSafeString = (value: unknown, fallback = "Not available"): string => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

export const formatInteger = (value: unknown): string =>
  integerFormatter.format(toSafeNumber(value));

export const formatNumber = (value: unknown): string =>
  numberFormatter.format(toSafeNumber(value));

export const formatCurrency = (value: unknown): string =>
  currencyFormatter.format(toSafeNumber(value));

export const formatPercent = (value: unknown): string =>
  `${percentFormatter.format(toSafeNumber(value))}%`;

export const formatDate = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "Not available";
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return fullDateFormatter.format(parsed);
};

export const formatChartLabel = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "Unknown";
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
};

export const formatMonthLabel = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "Unknown";
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "2-digit",
  }).format(parsed);
};
