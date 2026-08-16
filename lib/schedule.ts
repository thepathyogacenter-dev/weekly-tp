import { parseCsv } from "./csv";
import { buildSchedule } from "./parse";
import { fetchMonthlyWeek, fetchWeeklyBackgroundImage } from "./monthSchedule";
import { getMomenceWeek } from "./momence";
import { datesForWeek } from "./stories";
import { FALLBACK_ROWS, TEACHER_PHOTOS } from "./fallback";
import type { ClassItem, SchedulePayload } from "./types";

export const REVALIDATE = 300; // detik
const TZ = "Asia/Makassar"; // WITA — Bali

/** Normalisasi nama kelas biar Momence & Sheet bisa dicocokkan: buang penanda
 *  Event/Workshop dari Sheet ("E - ", "W - ") lalu sisakan huruf/angka saja. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^[ew]\s*[-–—]\s*/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Cocokkan kelas Momence & Sheet lewat hari + nama ternormalisasi. Ruang sengaja
 * diabaikan: Momence menaruh workshop di INDOOR sementara Sheet pakai SHALA 3, jadi
 * kalau ikut ruang, workshop yang sama muncul dobel.
 */
function classKey(item: ClassItem): string {
  return `${item.day}|${normalizeName(item.name)}`;
}

/**
 * Momence selalu up-to-date, jadi dia yang menang untuk kelas reguler. Sheet cuma
 * menambah entri yang belum ada di Momence — workshop/training/event seperti "Yin YTT"
 * yang nggak muncul di feed booking publik.
 */
function mergeMomenceWithSheet(momence: ClassItem[], sheet: ClassItem[]): ClassItem[] {
  const covered = new Set(momence.map(classKey));
  const extras = sheet.filter((item) => !covered.has(classKey(item)));
  return [...momence, ...extras];
}

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

  // Sumber utama: Momence (booking system) untuk minggu berjalan — data live yang
  // selalu up-to-date dan menang untuk kelas reguler. Google Sheet (monthly calendar
  // via Sheets API, punya warna cell untuk badge workshop) di-merge untuk menambah
  // entri yang belum ada di Momence, mis. workshop/training seperti "Yin YTT".
  // Kalau Momence tidak bisa diakses, pakai Sheet penuh; kalau dua-duanya gagal, snapshot.
  // Minggu yang diambil = Senin–Minggu, sama dengan yang dipakai UI.
  const week = datesForWeek(TZ);
  const momencePromise = getMomenceWeek();
  const sheetClassesPromise = apiKey && sheetId ? fetchMonthlyWeek(apiKey, sheetId, week) : Promise.resolve(null);
  const weeklyImagePromise = apiKey && sheetId
    ? fetchWeeklyBackgroundImage(apiKey, sheetId, week.MONDAY)
    : Promise.resolve(null);
  const photosPromise = teachersUrl ? fetchTeacherPhotos(teachersUrl) : Promise.resolve({});
  const [momenceClasses, sheetClasses, sheetPhotos, weeklyBackgroundImage] = await Promise.all([
    momencePromise,
    sheetClassesPromise,
    photosPromise,
    weeklyImagePromise,
  ]);

  let classes: ClassItem[] | null;
  let source: SchedulePayload["source"];
  if (momenceClasses) {
    classes = sheetClasses ? mergeMomenceWithSheet(momenceClasses, sheetClasses) : momenceClasses;
    source = "momence";
  } else if (sheetClasses) {
    classes = sheetClasses;
    source = "sheet";
  } else {
    classes = null;
    source = "fallback";
  }

  return {
    classes: classes ?? buildSchedule(FALLBACK_ROWS),
    teacherPhotos: {
      ...TEACHER_PHOTOS,
      ...sheetPhotos,
    },
    weeklyBackgroundImage,
    source,
    fetchedAt: new Date().toISOString(),
  };
}
