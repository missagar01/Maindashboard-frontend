import type { ReactNode } from "react";

export const AnalyticsChartContainer = ({
  title,
  subtitle,
  action,
  children,
  flushOnMobile = false,
  contentClassName = "",
  variant = "card",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  flushOnMobile?: boolean;
  contentClassName?: string;
  variant?: "card" | "flat";
}) => (
  <section
    className={`overflow-hidden ${
      variant === "flat"
        ? "bg-transparent shadow-none border-none p-0"
        : flushOnMobile
          ? "-mx-4 bg-transparent px-0 py-0 shadow-none sm:mx-0 sm:rounded-[30px] sm:border sm:border-slate-200 sm:bg-[linear-gradient(180deg,rgba(248,250,252,0.9),#ffffff_22%)] sm:p-6 sm:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          : "rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),#ffffff_22%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-6"
    }`}
  >

    <div
      className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${
        variant === "flat"
          ? "mb-6"
          : flushOnMobile
            ? "mb-4 px-4 pb-0 sm:mb-6 sm:border-b sm:border-slate-200/80 sm:px-0 sm:pb-4"
            : "mb-6 border-b border-slate-200/80 pb-4"
      }`}
    >
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1.5 text-sm font-medium leading-6 text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>

    <div className={`min-w-0 ${flushOnMobile ? "px-0 sm:px-0" : ""} ${contentClassName}`}>
      {children}
    </div>
  </section>
);
