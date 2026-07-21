const ANNOUNCEMENT_INPUT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export const parseAnnouncementDate = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(ANNOUNCEMENT_INPUT_PATTERN);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    0,
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatAnnouncementDate = (value) => {
  const parsed = parseAnnouncementDate(value);
  if (!parsed) {
    return "-";
  }

  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const isAnnouncementActive = (announcement, now = new Date()) => {
  if (!announcement?.is_active) {
    return false;
  }

  const startDate = parseAnnouncementDate(announcement.start_date);
  const endDate = parseAnnouncementDate(announcement.end_date);

  if (startDate && startDate > now) {
    return false;
  }

  if (endDate && endDate < now) {
    return false;
  }

  return true;
};

export const getAnnouncementStatus = (announcement, now = new Date()) => {
  if (!announcement?.is_active) {
    return "inactive";
  }

  const startDate = parseAnnouncementDate(announcement.start_date);
  const endDate = parseAnnouncementDate(announcement.end_date);

  if (startDate && startDate > now) {
    return "upcoming";
  }

  if (endDate && endDate < now) {
    return "expired";
  }

  return "active";
};

export const sortAnnouncementsByPriority = (announcements = []) =>
  [...announcements].sort((left, right) => {
    const priorityDelta = Number(right?.priority || 0) - Number(left?.priority || 0);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return Number(right?.id || 0) - Number(left?.id || 0);
  });

export const getAnnouncementSignature = (announcements = []) =>
  sortAnnouncementsByPriority(announcements)
    .map((announcement) =>
      [
        announcement?.id ?? "",
        announcement?.priority ?? "",
        announcement?.start_date ?? "",
        announcement?.end_date ?? "",
        announcement?.title ?? "",
        announcement?.message ?? "",
      ].join("::"),
    )
    .join("||");
