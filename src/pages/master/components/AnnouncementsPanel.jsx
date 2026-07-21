import { useEffect, useState } from "react";
import { CalendarClock, Megaphone } from "lucide-react";
import { fetchAnnouncementsApi } from "../../../api/master/announcementApi";
import {
  formatAnnouncementDate,
  isAnnouncementActive,
  parseAnnouncementDate,
  sortAnnouncementsByPriority,
} from "../../../utils/announcementUtils";

const PANEL_POLL_INTERVAL_MS = 30 * 1000;

const getPriorityTone = (priority) => {
  const numericPriority = Number(priority || 0);

  if (numericPriority >= 4) {
    return {
      pill: "bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-[0_16px_30px_-18px_rgba(225,29,72,0.65)]",
      accent: "from-rose-500/18 via-red-400/10 to-transparent",
      border: "border-rose-100",
      icon: "text-rose-600",
    };
  }

  if (numericPriority >= 2) {
    return {
      pill: "bg-gradient-to-r from-amber-500 to-orange-400 text-white shadow-[0_16px_30px_-18px_rgba(245,158,11,0.6)]",
      accent: "from-amber-400/18 via-orange-300/10 to-transparent",
      border: "border-amber-100",
      icon: "text-amber-600",
    };
  }

  return {
    pill: "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_16px_30px_-18px_rgba(239,68,68,0.55)]",
    accent: "from-red-400/16 via-orange-300/10 to-transparent",
    border: "border-red-100",
    icon: "text-red-600",
  };
};

export default function AnnouncementsPanel({ ignoreStartDate = false }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const result = await fetchAnnouncementsApi();
        if (cancelled) {
          return;
        }

        const rows = Array.isArray(result?.data) ? result.data : [];
        const activeAnnouncements = sortAnnouncementsByPriority(
          rows.filter((row) => {
            if (ignoreStartDate) {
              if (!row?.is_active) {
                return false;
              }

              const endDate = parseAnnouncementDate(row?.end_date);
              return !endDate || endDate >= new Date();
            }

            return isAnnouncementActive(row);
          }),
        );

        setAnnouncements(activeAnnouncements);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load announcements panel:", error);
          setAnnouncements([]);
        }
      } finally {
        if (!cancelled && !silent) {
          setLoading(false);
        }
      }
    };

    const handleFocusRefresh = () => {
      if (document.visibilityState === "visible") {
        void load({ silent: true });
      }
    };

    void load();

    const intervalId = window.setInterval(() => {
      void load({ silent: true });
    }, PANEL_POLL_INTERVAL_MS);

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleFocusRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleFocusRefresh);
    };
  }, [ignoreStartDate]);

  if (!loading && announcements.length === 0) {
    return null;
  }

  return (
    <div className="mb-[clamp(2rem,1rem+2.5vw,3.5rem)]">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#fff1f2_0%,#fff7ed_100%)] text-red-600 shadow-[0_12px_24px_-20px_rgba(239,68,68,0.45)]">
          <Megaphone className="h-4 w-4" />
        </span>
        <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          Announcements
        </h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {announcements.map((announcement) => {
            const tone = getPriorityTone(announcement.priority);

            return (
              <div
                key={announcement.id}
                className={`group relative overflow-hidden rounded-[1.7rem] border bg-[linear-gradient(145deg,#ffffff_0%,#fffaf7_52%,#f8fafc_100%)] p-4 shadow-[0_16px_36px_-26px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_42px_-22px_rgba(185,28,28,0.24)] ${tone.border}`}
              >
                <div className="pointer-events-none absolute inset-0 opacity-70">
                  <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${tone.accent}`} />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.78),transparent_85%)]" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${tone.icon.replace("text-", "bg-")}`} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                          Active Notice
                        </span>
                      </div>

                      <h4 className="break-words text-lg font-black tracking-[-0.03em] text-slate-900">
                        {announcement.title}
                      </h4>
                    </div>

                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${tone.pill}`}>
                      P{announcement.priority}
                    </span>
                  </div>

                  {announcement.message && (
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                      {announcement.message}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-3 py-2 text-xs text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <CalendarClock size={13} className={tone.icon} />
                    <span className="font-medium">
                      {formatAnnouncementDate(announcement.start_date)} -{" "}
                      {formatAnnouncementDate(announcement.end_date)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
