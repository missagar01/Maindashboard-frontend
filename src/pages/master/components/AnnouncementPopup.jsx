import { useEffect, useState } from "react";
import { CalendarClock, Megaphone, Sparkles, X } from "lucide-react";
import { fetchAnnouncementsApi } from "../../../api/master/announcementApi";
import { storage } from "../runtime";
import {
  formatAnnouncementDate,
  getAnnouncementSignature,
  isAnnouncementActive,
  sortAnnouncementsByPriority,
} from "../../../utils/announcementUtils";

const POPUP_POLL_INTERVAL_MS = 30 * 1000;
const POPUP_DISMISS_STORAGE_PREFIX = "announcement-popup-dismissed";

const PRIORITY_THEMES = {
  urgent: {
    badge: "bg-rose-600 text-white",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    button: "bg-rose-600 text-white hover:bg-rose-700",
    hero: "from-rose-600 via-red-600 to-orange-500",
    soft: "from-rose-50 via-white to-orange-50",
    iconWrap: "border-rose-200 bg-rose-50 text-rose-600",
    panel: "border-rose-100 bg-rose-50/70",
  },
  important: {
    badge: "bg-amber-500 text-white",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    button: "bg-amber-500 text-white hover:bg-amber-600",
    hero: "from-amber-500 via-orange-500 to-red-500",
    soft: "from-amber-50 via-white to-orange-50",
    iconWrap: "border-amber-200 bg-amber-50 text-amber-600",
    panel: "border-amber-100 bg-amber-50/70",
  },
  normal: {
    badge: "bg-blue-600 text-white",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    button: "bg-blue-600 text-white hover:bg-blue-700",
    hero: "from-blue-600 via-indigo-600 to-sky-500",
    soft: "from-blue-50 via-white to-sky-50",
    iconWrap: "border-blue-200 bg-blue-50 text-blue-600",
    panel: "border-blue-100 bg-blue-50/70",
  },
};

const getPopupTheme = (priority) => {
  const numericPriority = Number(priority || 0);

  if (numericPriority >= 4) {
    return PRIORITY_THEMES.urgent;
  }

  if (numericPriority >= 2) {
    return PRIORITY_THEMES.important;
  }

  return PRIORITY_THEMES.normal;
};

const readDismissedSignature = (storageKey) => {
  try {
    return window.sessionStorage.getItem(storageKey) || "";
  } catch {
    return "";
  }
};

const writeDismissedSignature = (storageKey, signature) => {
  try {
    if (!signature) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    window.sessionStorage.setItem(storageKey, signature);
  } catch {
    // Ignore storage write errors. The popup can still work without session state.
  }
};

export default function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState([]);
  const [visible, setVisible] = useState(false);

  const username = String(storage.get("user-name") || "guest")
    .trim()
    .toLowerCase();
  const dismissStorageKey = `${POPUP_DISMISS_STORAGE_PREFIX}:${username || "guest"}`;

  useEffect(() => {
    let cancelled = false;

    const syncAnnouncements = async () => {
      try {
        const result = await fetchAnnouncementsApi();
        if (cancelled) {
          return;
        }

        const rows = Array.isArray(result?.data) ? result.data : [];
        const activeRows = sortAnnouncementsByPriority(
          rows.filter((announcement) => isAnnouncementActive(announcement)),
        );
        const activeSignature = getAnnouncementSignature(activeRows);
        const dismissedSignature = readDismissedSignature(dismissStorageKey);

        setAnnouncements(activeRows);

        if (!activeSignature) {
          setVisible(false);
          writeDismissedSignature(dismissStorageKey, "");
          return;
        }

        setVisible(dismissedSignature !== activeSignature);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load announcement popup:", error);
        }
      }
    };

    const handleFocusRefresh = () => {
      if (document.visibilityState === "visible") {
        void syncAnnouncements();
      }
    };

    void syncAnnouncements();

    const intervalId = window.setInterval(() => {
      void syncAnnouncements();
    }, POPUP_POLL_INTERVAL_MS);

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleFocusRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleFocusRefresh);
    };
  }, [dismissStorageKey]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  if (!visible || announcements.length === 0) {
    return null;
  }

  const closePopup = () => {
    writeDismissedSignature(
      dismissStorageKey,
      getAnnouncementSignature(announcements),
    );
    setVisible(false);
  };

  const featuredAnnouncement = announcements[0];
  const featuredTheme = getPopupTheme(featuredAnnouncement?.priority);
  const activeCount = announcements.length;

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.16),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.46),rgba(15,23,42,0.76))] p-3 sm:p-4">
      <div className="flex min-h-full items-center justify-center">
        <div
          className={`relative w-full max-w-2xl overflow-hidden rounded-[1.8rem] border border-white/60 bg-gradient-to-br ${featuredTheme.soft} shadow-[0_30px_90px_-30px_rgba(15,23,42,0.42)]`}
        >
          <div
            className={`absolute inset-x-0 top-0 h-36 bg-gradient-to-r ${featuredTheme.hero}`}
          />
          <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-white/12 blur-3xl" />
          <div className="absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

          <div className="relative px-4 py-4 sm:px-6 sm:py-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.65)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Live Announcement
                  </span>
                  {activeCount > 1 && (
                    <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                      {activeCount} Notices
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={closePopup}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/85 text-slate-500 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.4)] transition hover:bg-white hover:text-slate-700"
                aria-label="Close announcements"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className={`overflow-hidden rounded-[1.55rem] border bg-white/90 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.32)] ${featuredTheme.panel}`}
            >
              <div className="border-b border-white/70 px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-[0_14px_30px_-22px_rgba(15,23,42,0.4)] ${featuredTheme.iconWrap}`}
                  >
                    <Megaphone className="h-5 w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-[1.3rem] font-black tracking-[-0.035em] text-slate-900 sm:text-[1.75rem]">
                      {featuredAnnouncement?.title || "Announcement"}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="px-4 py-4 sm:px-5">
                {featuredAnnouncement?.message && (
                  <div className="rounded-[1.3rem] border border-white/70 bg-white/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <p className="whitespace-pre-wrap break-words text-[0.98rem] leading-7 text-slate-700">
                      {featuredAnnouncement.message}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={closePopup}
                    className={`inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-bold shadow-[0_18px_34px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 ${featuredTheme.button}`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
