import type { LucideIcon } from "lucide-react";

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
} as const;

export const AnalyticsKpiCard = ({
  label,
  value,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
}) => {
  const toneConfig = toneClasses[tone];

  return (
    <article
      className={`relative overflow-hidden rounded-[24px] border p-4 shadow-lg transition-transform hover:scale-[1.02] sm:p-5 ${toneConfig.card}`}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-black/10 blur-xl" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-[12px] font-bold uppercase tracking-wider ${toneConfig.label}`}>
            {label}
          </p>
          <p className={`mt-2 whitespace-nowrap text-3xl font-black tracking-tight ${toneConfig.value}`}>
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner ${toneConfig.icon}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
};

