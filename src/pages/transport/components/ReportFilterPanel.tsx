import { useEffect, useMemo, useState } from "react";
import { Calendar, Filter, Search } from "lucide-react";
import {
  ReportConfig,
  ReportFilterField,
  supportedNumberOperations,
} from "../config/reportConfig";

interface FilterPanelProps {
  config: ReportConfig;
  onApply: (filters: Record<string, any>) => void;
  onClear: () => void;
  loading?: boolean;
}

const resolveDefaultValue = (
  defaultFilters: Record<string, any> | undefined,
  field: ReportFilterField
) => {
  if (!defaultFilters) {
    return null;
  }

  if (field.type === "date-range") {
    const fromKey = field.dateKeys?.from || "fromDate";
    const toKey = field.dateKeys?.to || "toDate";

    return {
      from: String(defaultFilters[fromKey] || ""),
      to: String(defaultFilters[toKey] || ""),
    };
  }

  const direct = defaultFilters[field.key];

  if (field.type === "multi-select") {
    if (Array.isArray(direct?.value)) {
      return direct.value.map(String);
    }
    if (Array.isArray(direct)) {
      return direct.map(String);
    }
    return [];
  }

  if (field.type === "number" || field.type === "decimal") {
    if (direct && typeof direct === "object" && "value" in direct) {
      return {
        value: String(direct.value ?? ""),
        operation: String(direct.operation || field.defaultOperation || "gte"),
      };
    }

    return {
      value: direct !== undefined && direct !== null ? String(direct) : "",
      operation: field.defaultOperation || "gte",
    };
  }

  if (field.type === "boolean") {
    if (direct && typeof direct === "object" && "value" in direct) {
      return String(direct.value);
    }

    if (typeof direct === "boolean") {
      return String(direct);
    }

    return "";
  }

  if (direct && typeof direct === "object" && "value" in direct) {
    return String(direct.value ?? "");
  }

  return direct !== undefined && direct !== null ? String(direct) : "";
};

const buildDefaultDrafts = (config: ReportConfig) =>
  config.filters.reduce<Record<string, any>>((accumulator, field) => {
    const resolved = resolveDefaultValue(config.defaultFilters as Record<string, any> | undefined, field);

    if (field.type === "date-range") {
      accumulator[field.key] = resolved || { from: "", to: "" };
      return accumulator;
    }

    if (field.type === "multi-select") {
      accumulator[field.key] = resolved || [];
      return accumulator;
    }

    if (field.type === "number" || field.type === "decimal") {
      accumulator[field.key] = resolved || {
        value: "",
        operation: field.defaultOperation || "gte",
      };
      return accumulator;
    }

    accumulator[field.key] = resolved || "";
    return accumulator;
  }, {});

const applyFieldToPayload = (
  payload: Record<string, any>,
  field: ReportFilterField,
  draftValue: any
) => {
  if (field.type === "date-range") {
    const fromValue = draftValue?.from || "";
    const toValue = draftValue?.to || "";

    if (fromValue && field.dateKeys?.from) {
      payload[field.dateKeys.from] = fromValue;
    }

    if (toValue && field.dateKeys?.to) {
      payload[field.dateKeys.to] = toValue;
    }

    return;
  }

  if (field.type === "multi-select") {
    if (Array.isArray(draftValue) && draftValue.length > 0) {
      payload[field.key] = {
        value: draftValue,
        filter_type: "multi-select",
      };
    }
    return;
  }

  if (field.type === "number" || field.type === "decimal") {
    if (draftValue?.value !== "" && draftValue?.value !== undefined) {
      payload[field.key] = {
        value: draftValue.value,
        filter_type: field.type,
        operation: draftValue.operation || field.defaultOperation || "gte",
      };
    }
    return;
  }

  if (field.type === "boolean") {
    if (draftValue === "true" || draftValue === "false") {
      payload[field.key] = {
        value: draftValue === "true",
        filter_type: "boolean",
      };
    }
    return;
  }

  if (typeof draftValue === "string" && draftValue.trim()) {
    payload[field.key] = {
      value: draftValue.trim(),
      filter_type: field.type,
    };
  }
};

const MultiSelectField = ({
  field,
  value,
  onChange,
}: {
  field: ReportFilterField;
  value: string[];
  onChange: (next: string[]) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {(field.options || []).map((option) => {
      const currentValue = String(option.value);
      const active = value.includes(currentValue);

      return (
        <button
          key={`${field.key}-${currentValue}`}
          type="button"
          onClick={() =>
            onChange(
              active
                ? value.filter((item) => item !== currentValue)
                : [...value, currentValue]
            )
          }
          className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition ${
            active
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export function ReportFilterPanel({
  config,
  onApply,
  onClear,
  loading,
}: FilterPanelProps) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, any>>(() =>
    buildDefaultDrafts(config)
  );

  useEffect(() => {
    setGlobalSearch("");
    setDrafts(buildDefaultDrafts(config));
  }, [config]);

  const missingRequiredFilters = useMemo(
    () =>
      config.filters.some((field) => {
        if (!field.required || field.type !== "date-range") {
          return false;
        }

        const draft = drafts[field.key];
        return !draft?.from || !draft?.to;
      }),
    [config.filters, drafts]
  );

  const handleApply = () => {
    if (missingRequiredFilters) {
      return;
    }

    const nextFilters: Record<string, any> = {};

    if (globalSearch.trim()) {
      nextFilters.global_search_text = globalSearch.trim();
    }

    config.filters.forEach((field) => {
      applyFieldToPayload(nextFilters, field, drafts[field.key]);
    });

    onApply(nextFilters);
  };

  const handleClear = () => {
    setGlobalSearch("");
    setDrafts(buildDefaultDrafts(config));
    onClear();
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            placeholder={config.searchPlaceholder || "Global search"}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:px-5 md:grid-cols-2 xl:grid-cols-4">
        {config.filters.map((field) => {
          const draftValue = drafts[field.key];

          return (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {field.label}
                </label>
                {field.required ? (
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-rose-500">
                    Required
                  </span>
                ) : null}
              </div>

              {field.type === "date-range" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <input
                      type="date"
                      value={draftValue?.from || ""}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [field.key]: {
                            ...previous[field.key],
                            from: event.target.value,
                          },
                        }))
                      }
                      className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <input
                      type="date"
                      value={draftValue?.to || ""}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [field.key]: {
                            ...previous[field.key],
                            to: event.target.value,
                          },
                        }))
                      }
                      className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                    />
                  </div>
                </div>
              ) : null}

              {field.type === "multi-select" ? (
                <MultiSelectField
                  field={field}
                  value={Array.isArray(draftValue) ? draftValue : []}
                  onChange={(nextValue) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [field.key]: nextValue,
                    }))
                  }
                />
              ) : null}

              {field.type === "boolean" ? (
                <select
                  value={draftValue}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                >
                  <option value="">All</option>
                  {(field.options || []).map((option) => (
                    <option key={`${field.key}-${option.value}`} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}

              {(field.type === "select" || field.type === "enum") && (
                <select
                  value={draftValue}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                >
                  <option value="">Select {field.label}</option>
                  {(field.options || []).map((option) => (
                    <option key={`${field.key}-${option.value}`} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {(field.type === "number" || field.type === "decimal") && (
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                  <select
                    value={draftValue?.operation || field.defaultOperation || "gte"}
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [field.key]: {
                          ...previous[field.key],
                          operation: event.target.value,
                        },
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                  >
                    {supportedNumberOperations.map((operation) => (
                      <option key={`${field.key}-${operation}`} value={operation}>
                        {operation.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={draftValue?.value || ""}
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [field.key]: {
                          ...previous[field.key],
                          value: event.target.value,
                        },
                      }))
                    }
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                  />
                </div>
              )}

              {field.type === "string" ? (
                <input
                  type="text"
                  value={draftValue}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs font-medium text-slate-500">
          {missingRequiredFilters
            ? "Required date filters fill karo."
            : "Filters transport API contract ke hisaab se bheje jayenge."}
        </p>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-slate-500 transition hover:bg-slate-50 sm:flex-none"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || missingRequiredFilters}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <Filter className="h-4 w-4" />
            {loading ? "Loading" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
