
const toneClasses = {
  blue: {
    card: "bg-gradient-to-br from-indigo-600 to-blue-700 border-indigo-400/30",
    label: "text-indigo-100",
    value: "text-white",
    icon: "bg-white/20 border-white/20 text-white",
  },
  emerald: {
    card: "bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-400/30",
    label: "text-emerald-50/90",
    value: "text-white",
    icon: "bg-white/20 border-white/20 text-white",
  },
  amber: {
    card: "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400/30",
    label: "text-amber-50/90",
    value: "text-white",
    icon: "bg-white/20 border-white/20 text-white",
  },
  violet: {
    card: "bg-gradient-to-br from-violet-600 to-purple-700 border-violet-400/30",
    label: "text-violet-50/90",
    value: "text-white",
    icon: "bg-white/20 border-white/20 text-white",
  },
  rose: {
    card: "bg-gradient-to-br from-rose-600 to-pink-700 border-rose-400/30",
    label: "text-rose-50/90",
    value: "text-white",
    icon: "bg-white/20 border-white/20 text-white",
  },
  cyan: {
    card: "bg-gradient-to-br from-cyan-600 to-blue-600 border-cyan-400/30",
    label: "text-cyan-50/90",
    value: "text-white",
    icon: "bg-white/20 border-white/20 text-white",
  },
  slate: {
    card: "bg-gradient-to-br from-slate-600 to-slate-800 border-slate-400/30",
    label: "text-slate-100",
    value: "text-white",
    icon: "bg-white/20 border-white/20 text-white",
  },
} as const;

export const AnalyticsKpiCard = ({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string;
  tone?: keyof typeof toneClasses;
}) => {
  const toneConfig = toneClasses[tone];

  return (
    <article
      className={`relative overflow-hidden rounded-[14px] border p-2 shadow-sm transition-transform hover:scale-[1.02] sm:rounded-[24px] sm:p-5 sm:shadow-lg ${toneConfig.card}`}
    >
      <div className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/10 blur-xl sm:-right-6 sm:-top-6 sm:h-24 sm:w-24" />
      <div className="absolute -bottom-4 -left-4 h-10 w-10 rounded-full bg-black/10 blur-lg sm:-bottom-6 sm:-left-6 sm:h-20 sm:w-20" />

      <div className="relative flex min-h-[60px] items-center justify-between gap-1.5 sm:min-h-[96px] sm:gap-4">
        <div className="flex min-w-0 w-full flex-col justify-center">
          <p className={`text-[8px] font-bold uppercase leading-[1.15] tracking-[0.05em] sm:text-[11px] sm:leading-normal sm:tracking-wider ${toneConfig.label}`}>
            {label}
          </p>
          <p className={`mt-0.5 truncate text-[16px] font-black leading-none tracking-tight sm:mt-1.5 sm:text-[32px] ${toneConfig.value}`} title={value}>
            {value}
          </p>
        </div>
      </div>
    </article>
  );
};
