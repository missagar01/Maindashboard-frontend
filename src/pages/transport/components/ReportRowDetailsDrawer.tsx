import React, { useEffect } from "react";
import { X } from "lucide-react";
import { ReportConfig } from "../config/reportConfig";

interface ReportRowDetailsDrawerProps {
  config: ReportConfig | null;
  record: Record<string, any> | null;
  onClose: () => void;
  onDrilldown: (key: string, value: any) => void;
}

const prettifyLabel = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const ReportRowDetailsDrawer: React.FC<ReportRowDetailsDrawerProps> = ({
  config,
  record,
  onClose,
  onDrilldown,
}) => {
  useEffect(() => {
    if (record) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [record]);

  if (!config || !record) {
    return null;
  }

  const quickDrilldowns = config.drilldownRules
    .map((rule) => ({
      rule,
      value: record?.[rule.key],
    }))
    .filter(({ value }) => value !== undefined && value !== null && value !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-12 backdrop-blur-sm overscroll-contain sm:items-center sm:pt-4">
      <div className="fixed inset-0" onClick={onClose} />
      <aside className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl overscroll-contain sm:max-h-[85vh]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
              Report Detail
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">{config.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-100 p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {quickDrilldowns.length > 0 ? (
          <div className="border-b border-slate-50 bg-slate-50/30 px-6 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
              Select To Filter By:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickDrilldowns.map(({ rule, value }) => (
                <button
                  key={`${rule.key}-${String(value)}`}
                  type="button"
                  onClick={() => onDrilldown(rule.key, value)}
                  className="rounded-lg bg-indigo-50/50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-indigo-600 transition hover:bg-indigo-100/50"
                >
                  <span className="opacity-60">{rule.label}:</span> {String(value)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-slate-50">
            {Object.entries(record).map(([key, value]) => (
              <div
                key={key}
                className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 px-6 py-3 transition hover:bg-slate-50/50"
              >
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {prettifyLabel(key)}
                </div>
                <div className="break-words text-[11px] font-semibold text-slate-700">
                  {typeof value === "object" && value !== null
                    ? JSON.stringify(value)
                    : String(value ?? "--")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};
