export const parseStoreDateValue = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const dmyMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s|$)/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const year = Number(dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3]);
    const parsed = new Date(year, month, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isCurrentMonth = (date: Date, reference = new Date()) =>
  date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();

export const compareCurrentMonthFirstDesc = (a: unknown, b: unknown): number => {
  const dateA = parseStoreDateValue(a);
  const dateB = parseStoreDateValue(b);

  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;

  const currentMonthA = isCurrentMonth(dateA);
  const currentMonthB = isCurrentMonth(dateB);

  if (currentMonthA !== currentMonthB) {
    return currentMonthA ? -1 : 1;
  }

  return dateB.getTime() - dateA.getTime();
};

export const compareDateDesc = (a: unknown, b: unknown): number => {
  const dateA = parseStoreDateValue(a);
  const dateB = parseStoreDateValue(b);

  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;

  return dateB.getTime() - dateA.getTime();
};
