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
const PM_START = 13 * 60; // 13:00 — Noon is only the 12 PM hour

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

/** "13:30" -> "1:30" for the compact 12-hour Daily story time labels. */
export function shortTime(hhmm: string): string {
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return hhmm;
  const hours = Number(match[1]);
  const minutes = match[2];
  return `${hours % 12 || 12}:${minutes}`;
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

/**
 * A date-only value whose UTC fields are the calendar date in `tz`.
 *
 * Schedule data has no time zone attached to its dates. Keeping these values
 * at UTC midnight avoids accidentally changing the day when the app runs on a
 * server outside Bali.
 */
export function calendarDateInTimeZone(tz: string, now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

/** Calendar date and weekday for tomorrow in the requested time zone. */
export function tomorrowInTimeZone(tz: string, now = new Date()): { date: Date; day: Day } {
  const date = calendarDateInTimeZone(tz, now);
  date.setUTCDate(date.getUTCDate() + 1);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long" })
    .format(new Date(date.getTime() + 12 * 60 * 60 * 1000))
    .toUpperCase() as Day;
  return { date, day };
}

function dayInTimeZone(tz: string, now = new Date()): Day {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long" })
    .format(now)
    .toUpperCase() as Day;
}

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function nextDate(day: Day, tz: string, now = new Date()): Date {
  const today = calendarDateInTimeZone(tz, now);
  const todayIdx = DAYS.indexOf(dayInTimeZone(tz, now));
  const targetIdx = DAYS.indexOf(day);
  const diff = (targetIdx - todayIdx + 7) % 7;
  return addCalendarDays(today, diff);
}

export function formatDateLabel(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "long" })
    .format(date)
    .toUpperCase();
}

/**
 * Dates for the current Monday-Sunday week, except from Friday onward when the
 * upcoming week is prepared for the studio's weekly publishing workflow.
 */
export function datesForWeek(tz: string, now = new Date()): Record<Day, Date> {
  const today = calendarDateInTimeZone(tz, now);
  const dayIndex = DAYS.indexOf(dayInTimeZone(tz, now));
  const isFridayOrLater = dayIndex >= DAYS.indexOf("FRIDAY");
  const monday = addCalendarDays(today, -dayIndex + (isFridayOrLater ? 7 : 0));
  const out = {} as Record<Day, Date>;
  DAYS.forEach((day, i) => {
    out[day] = addCalendarDays(monday, i);
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
