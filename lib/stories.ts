import { DAYS, type ClassItem, type Day } from "./types";

export interface WeeklyGroup {
  title: string;
  days: Day[];
}

/** 3 IG posts, posted every Sunday for the week ahead. */
export const WEEKLY_GROUPS: WeeklyGroup[] = [
  { title: "Monday – Tuesday", days: ["MONDAY", "TUESDAY"] },
  { title: "Wednesday – Thursday", days: ["WEDNESDAY", "THURSDAY"] },
  { title: "Friday – Sunday", days: ["FRIDAY", "SATURDAY", "SUNDAY"] },
];

export type Period = "AM" | "NOON" | "PM";

const NOON_START = 12 * 60; // 12:00
const PM_START = 15 * 60; // 15:00

export function periodOf(start: number | null): Period {
  if (start === null) return "PM";
  if (start < NOON_START) return "AM";
  if (start < PM_START) return "NOON";
  return "PM";
}

export function groupByPeriod(classes: ClassItem[]): Record<Period, ClassItem[]> {
  const sorted = [...classes].sort((a, b) => (a.start ?? 1e6) - (b.start ?? 1e6));
  const out: Record<Period, ClassItem[]> = { AM: [], NOON: [], PM: [] };
  for (const c of sorted) out[periodOf(c.start)].push(c);
  return out;
}

/** "Shala Indoor" bundles both the INDOOR and SHALA 3 spaces. */
export function splitBySpace(classes: ClassItem[]) {
  const outdoor = classes.filter((c) => c.space === "OUTDOOR");
  const indoor = classes.filter((c) => c.space === "INDOOR" || c.space === "SHALA 3");
  return { outdoor, indoor };
}

export function classesForDay(classes: ClassItem[], day: Day): ClassItem[] {
  return classes
    .filter((c) => c.day === day)
    .sort((a, b) => (a.start ?? 1e6) - (b.start ?? 1e6));
}

/** "07:15" -> "7:15" (drop the leading zero, keep 24h since that's what the Sheet gives us). */
export function shortTime(hhmm: string): string {
  return hhmm.replace(/^0/, "");
}

export function storyTimeRange(c: ClassItem): string {
  if (!c.timeLabel) return "";
  return c.timeLabel
    .split(" – ")
    .map(shortTime)
    .join(" – ");
}

export function titleCase(day: string): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

export function nextDate(day: Day, tz: string): Date {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const todayIdx = DAYS.indexOf(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long" })
      .format(now)
      .toUpperCase() as Day
  );
  const targetIdx = DAYS.indexOf(day);
  const diff = (targetIdx - todayIdx + 7) % 7;
  const d = new Date(now);
  d.setDate(d.getDate() + diff);
  return d;
}

export function formatDateLabel(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "long" })
    .format(date)
    .toUpperCase();
}

/**
 * Dates for the upcoming (or current) Monday-Sunday week, anchored to a single
 * Monday so the 7 dates are always consecutive — calling nextDate() per day
 * independently breaks near week boundaries (e.g. "today" being Thursday would
 * put next Wednesday *after* today's Thursday).
 */
export function datesForWeek(tz: string): Record<Day, Date> {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const dayName = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long" }).format(now).toUpperCase();
  const monday = nextDate("MONDAY", tz);
  // Jika hari ini Minggu, tarik mundur 7 hari agar Senin di minggu ini yang tampil
  if (dayName === "SUNDAY") {
    monday.setDate(monday.getDate() - 7);
  }
  const out = {} as Record<Day, Date>;
  DAYS.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    out[day] = d;
  });
  return out;
}

export function weekRangeLabel(days: Day[], week: Record<Day, Date>, tz: string): string {
  const first = week[days[0]];
  const last = week[days[days.length - 1]];
  const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit" });
  const monthFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, month: "short" });
  const monthYearFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, month: "long", year: "numeric" });

  const sameMonth = monthFmt.format(first) === monthFmt.format(last);
  const from = sameMonth ? dayFmt.format(first) : `${dayFmt.format(first)} ${monthFmt.format(first)}`;
  return `${from} – ${dayFmt.format(last)} ${monthYearFmt.format(last)}`.toUpperCase();
}
