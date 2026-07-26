import type { ClassItem, Day } from "./types";

const TZ_OFFSET_MIN = 8 * 60; // WITA = UTC+8, no DST

export interface CalEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  location?: string;
  description?: string;
}

/** Satu kelas dengan tanggal absolutnya (dipakai untuk feed subscription multi-minggu). */
export interface DatedClass {
  date: Date;
  item: ClassItem;
}

function teaches(teachers: string[], teacher: string): boolean {
  const t = teacher.toLowerCase();
  return teachers.some((x) => x.toLowerCase() === t);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date -> "YYYYMMDDTHHMMSSZ" (UTC). */
function fmtUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Tanggal (kalender WITA) + menit-dari-tengah-malam -> Date absolut (UTC). */
function witaToUtc(day: Date, minutes: number): Date {
  return new Date(
    Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes - TZ_OFFSET_MIN, 0)
  );
}

function escapeText(s: string): string {
  return s.replace(/([\\,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

/** Lipat baris >75 oktet sesuai RFC 5545. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) chunks.push(" " + rest);
  return chunks.join("\r\n");
}

export function buildIcs(events: CalEvent[], calName: string): string {
  const now = fmtUtc(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Path Canggu//Weekly Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calName)}`,
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${fmtUtc(e.start)}`);
    lines.push(`DTEND:${fmtUtc(e.end)}`);
    lines.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n");
}

/** Semua kelas seorang teacher untuk minggu ini -> CalEvent[]. */
export function teacherEvents(
  classes: ClassItem[],
  week: Record<Day, Date>,
  teacher: string
): CalEvent[] {
  const events: CalEvent[] = [];
  for (const c of classes) {
    if (c.start === null || !teaches(c.teachers, teacher)) continue;
    const day = week[c.day];
    if (!day) continue;
    events.push(makeEvent(day, c, teacher));
  }
  return events;
}

/** Feed subscription: kelas dengan tanggal absolut (beberapa minggu ke depan). */
export function datedTeacherEvents(dated: DatedClass[], teacher: string): CalEvent[] {
  const events: CalEvent[] = [];
  for (const { date, item } of dated) {
    if (item.start === null || !teaches(item.teachers, teacher)) continue;
    events.push(makeEvent(date, item, teacher));
  }
  return events;
}

function makeEvent(day: Date, c: ClassItem, teacher: string): CalEvent {
  const start = witaToUtc(day, c.start ?? 0);
  const end = witaToUtc(day, c.end ?? (c.start ?? 0) + 60);
  const others = c.teachers.filter((t) => t.toLowerCase() !== teacher.toLowerCase());
  return {
    uid: `${c.id}-${dateKey(day)}-${teacher.replace(/\s+/g, "")}@thepath-canggu`,
    start,
    end,
    summary: c.name,
    location: `The Path · Canggu — ${c.space}`,
    description: others.length ? `Co-teaching with ${others.join(", ")}.` : "",
  };
}
