import { parseCsv } from "./csv";
import { buildSchedule } from "./parse";
import { getMomenceWeek } from "./momence";
import { readOverrides } from "./scheduleStore";
import { datesForWeek } from "./stories";
import { FALLBACK_ROWS, TEACHER_PHOTOS } from "./fallback";
import type { ClassItem, Day, SchedulePayload } from "./types";

export const REVALIDATE = 300;
const TZ = "Asia/Makassar";

async function fetchCsv(url: string): Promise<string[][] | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return null;
    const rows = parseCsv(await res.text());
    return rows.length ? rows : null;
  } catch {
    return null;
  }
}

async function fetchTeacherPhotos(url: string): Promise<Record<string, string>> {
  const rows = await fetchCsv(url);
  if (!rows || rows.length < 2) return {};
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const nameCol = header.indexOf("name");
  const photoCol = header.indexOf("photo");
  if (nameCol === -1 || photoCol === -1) return {};
  const photos: Record<string, string> = {};
  for (const row of rows.slice(1)) {
    const name = (row[nameCol] ?? "").trim();
    const photo = (row[photoCol] ?? "").trim();
    if (name && /^https?:\/\//.test(photo)) photos[name] = photo;
  }
  return photos;
}

export async function getSchedule(week: Record<Day, Date> = datesForWeek(TZ)): Promise<SchedulePayload> {
  const weekKey = week.MONDAY.toISOString().slice(0, 10);
  const teachersUrl = process.env.TEACHERS_CSV_URL;
  const [momenceClasses, sharedOverrides, teacherPhotos] = await Promise.all([
    getMomenceWeek(week),
    readOverrides(weekKey),
    teachersUrl ? fetchTeacherPhotos(teachersUrl) : Promise.resolve({}),
  ]);

  const classes: ClassItem[] = sharedOverrides?.length
    ? sharedOverrides
    : momenceClasses ?? buildSchedule(FALLBACK_ROWS);

  return {
    classes,
    teacherPhotos: { ...TEACHER_PHOTOS, ...teacherPhotos },
    weeklyBackgroundImage: null,
    source: momenceClasses ? "momence" : "fallback",
    fetchedAt: new Date().toISOString(),
  };
}
