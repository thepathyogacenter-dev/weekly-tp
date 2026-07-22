import { parseCsv } from "./csv";
import { buildSchedule } from "./parse";
import { FALLBACK_ROWS, TEACHER_PHOTOS } from "./fallback";
import type { SchedulePayload } from "./types";

export const REVALIDATE = 300; // detik

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

interface SheetsColor {
  red?: number;
  green?: number;
  blue?: number;
}

/** Pastel pink/magenta highlight: red channel clearly ahead of green, green ≈ blue. */
function isPinkish(color: SheetsColor): boolean {
  const r = color.red ?? 0;
  const g = color.green ?? 0;
  const b = color.blue ?? 0;
  // Widen the tolerance from 0.08 to 0.15 so it catches Light Magenta 2
  return r > 0.75 && r - g > 0.06 && Math.abs(g - b) < 0.15; 
}

/**
 * Warna cell nggak ada di CSV — perlu Sheets API v4 (butuh API key + spreadsheet ID asli,
 * bukan link "publish to web"). Return Set berisi "row,col" (0-indexed, sama seperti rows[][]
 * dari CSV) yang backgroundnya pink.
 */
async function fetchPinkCells(apiKey: string, spreadsheetId: string, sheetName?: string) {
  const out = new Set<string>();
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set(
    "fields",
    "sheets.data.rowData.values.userEnteredFormat.backgroundColor"
  );
  if (sheetName) url.searchParams.set("ranges", sheetName);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: REVALIDATE } });
    if (!res.ok) return out;
    const json = await res.json();
    const rowData = json.sheets?.[0]?.data?.[0]?.rowData ?? [];
    rowData.forEach((row: { values?: { userEnteredFormat?: { backgroundColor?: SheetsColor } }[] }, r: number) => {
      (row.values ?? []).forEach((cell, c) => {
        const bg = cell?.userEnteredFormat?.backgroundColor;
        if (bg && isPinkish(bg)) out.add(`${r},${c}`);
      });
    });
  } catch {
    // biarin kosong, tag WORKSHOP dari warna cuma bonus
  }
  return out;
}

export async function getSchedule(): Promise<SchedulePayload> {
  const scheduleUrl = process.env.SCHEDULE_CSV_URL;
  const teachersUrl = process.env.TEACHERS_CSV_URL;
  const sheetsApiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.SCHEDULE_SHEET_ID;
  const sheetName = process.env.SCHEDULE_SHEET_NAME;

  const rows = scheduleUrl ? await fetchCsv(scheduleUrl) : null;
  const pinkCells =
    sheetsApiKey && sheetId ? await fetchPinkCells(sheetsApiKey, sheetId, sheetName) : undefined;

  return {
    classes: buildSchedule(rows ?? FALLBACK_ROWS, pinkCells),
    teacherPhotos: {
      ...TEACHER_PHOTOS,
      ...(teachersUrl ? await fetchTeacherPhotos(teachersUrl) : {}),
    },
    source: rows ? "sheet" : "fallback",
    fetchedAt: new Date().toISOString(),
  };
}
