import { parseCsv } from "./csv";
import { buildSchedule } from "./parse";
import { fetchMonthlyWeek } from "./monthSchedule";
import { datesForWeek } from "./stories";
import { FALLBACK_ROWS, TEACHER_PHOTOS } from "./fallback";
import type { SchedulePayload } from "./types";

export const REVALIDATE = 300; // detik
const TZ = "Asia/Makassar"; // WITA — Bali

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

  const out: Record<string, string> = {};
  for (const row of rows.slice(1)) {
    const name = (row[nameCol] ?? "").trim();
    const photo = (row[photoCol] ?? "").trim();
    if (name && /^https?:\/\//.test(photo)) out[name] = photo;
  }
  return out;
}

export async function getSchedule(): Promise<SchedulePayload> {
  const teachersUrl = process.env.TEACHERS_CSV_URL;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.SCHEDULE_SHEET_ID;

  // Sumber utama: monthly calendar via Sheets API (butuh warna cell untuk badge workshop).
  // Minggu yang diambil = Senin–Minggu mendatang, sama dengan yang dipakai UI.
  const week = datesForWeek(TZ);
  const classes = apiKey && sheetId ? await fetchMonthlyWeek(apiKey, sheetId, week) : null;

  return {
    classes: classes ?? buildSchedule(FALLBACK_ROWS),
    teacherPhotos: {
      ...TEACHER_PHOTOS,
      ...(teachersUrl ? await fetchTeacherPhotos(teachersUrl) : {}),
    },
    source: classes ? "sheet" : "fallback",
    fetchedAt: new Date().toISOString(),
  };
}
