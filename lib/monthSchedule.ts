import { DAYS, SPACES, type ClassItem, type Day, type Space } from "./types";
import { classTag, parseCell, timeLabelOf, toMinutes } from "./parse";
import type { DatedClass } from "./ics";

/**
 * Reader untuk spreadsheet "monthly calendar": tiap tab = 1 bulan, minggu ditumpuk
 * vertikal, tiap hari punya angka tanggal + 3 kolom shala (OUTDOOR/INDOOR/3rd SHALA),
 * dan ada kolom TIME SLOT. Warna cell (butuh Sheets API, bukan CSV) menandai
 * workshop/event lewat legend "COLOR MEANING".
 */

const API = "https://sheets.googleapis.com/v4/spreadsheets";

interface RGB {
  red?: number;
  green?: number;
  blue?: number;
}
interface Cell {
  text: string;
  color: RGB | null;
}
type Grid = Cell[][];

const WEEKDAYS: string[] = [...DAYS];

/** "3RD SHALA" / "SHALA 3" -> "SHALA 3"; sisanya dicocokkan apa adanya. */
function normalizeSpace(raw: string): Space | null {
  const s = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (s === "3RD SHALA" || s === "SHALA 3") return "SHALA 3";
  if ((SPACES as readonly string[]).includes(s)) return s as Space;
  return null;
}

function colorsClose(a: RGB | null, b: RGB | null, tol = 0.06): boolean {
  if (!a || !b) return false;
  return (
    Math.abs((a.red ?? 0) - (b.red ?? 0)) < tol &&
    Math.abs((a.green ?? 0) - (b.green ?? 0)) < tol &&
    Math.abs((a.blue ?? 0) - (b.blue ?? 0)) < tol
  );
}

/** Legend fallback kalau cell "COLOR MEANING" nggak ketemu. */
const DEFAULT_WORKSHOP: RGB = { red: 0.835, green: 0.651, blue: 0.741 };
const DEFAULT_RENTAL: RGB = { red: 1, green: 1, blue: 0 };

async function fetchTabTitles(apiKey: string, sheetId: string): Promise<string[]> {
  const url = `${API}/${sheetId}?key=${apiKey}&fields=sheets.properties.title`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`titles ${res.status}`);
  const json = await res.json();
  return (json.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title);
}

const MONTH_TOKENS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** Cari nama tab yang cocok untuk bulan+tahun tertentu (mis. Jul 2026 -> "(2026) JUL"). */
function resolveTabTitle(titles: string[], date: Date): string | null {
  const token = MONTH_TOKENS[date.getUTCMonth()];
  const year = String(date.getUTCFullYear());
  const matches = titles.filter((t) => t.toUpperCase().includes(token));
  if (matches.length === 0) return null;
  // Utamakan yang menyebut tahunnya (mis. "(2026) JUL"), lalu yang tanpa tahun.
  return matches.find((t) => t.includes(year)) ?? matches[0];
}

async function fetchGrid(apiKey: string, sheetId: string, title: string): Promise<Grid> {
  const range = encodeURIComponent(title);
  const url =
    `${API}/${sheetId}?key=${apiKey}&ranges=${range}` +
    `&fields=sheets.data.rowData.values(formattedValue,userEnteredFormat.backgroundColor)`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`grid ${title} ${res.status}`);
  const json = await res.json();
  const rowData = json.sheets?.[0]?.data?.[0]?.rowData ?? [];
  return rowData.map(
    (row: { values?: { formattedValue?: string; userEnteredFormat?: { backgroundColor?: RGB } }[] }) =>
      (row.values ?? []).map((v) => ({
        text: (v.formattedValue ?? "").replace(/\s+/g, " ").trim(),
        color: v.userEnteredFormat?.backgroundColor ?? null,
      }))
  );
}

function cellAt(grid: Grid, r: number, c: number): Cell {
  return grid[r]?.[c] ?? { text: "", color: null };
}

/** Legend color untuk "Workshop or event" dan "Shala Rental" dari blok COLOR MEANING. */
function readLegend(grid: Grid): { workshop: RGB; rental: RGB } {
  let workshop = DEFAULT_WORKSHOP;
  let rental = DEFAULT_RENTAL;
  for (const row of grid) {
    for (const cell of row ?? []) {
      const t = cell.text.toLowerCase();
      if (t === "workshop or event" && cell.color) workshop = cell.color;
      if (t === "shala rental" && cell.color) rental = cell.color;
    }
  }
  return { workshop, rental };
}

/** Baris "7.15 - 8.15" / "16.00 - 17.15" -> menit + apakah termasuk pagi. */
function parseSlot(slot: string): { start: number | null; end: number | null; morning: boolean } {
  const parts = slot.split(/\s*[-–—]\s*/);
  const firstHour = parseInt(parts[0], 10);
  const morning = firstHour >= 7 && firstHour <= 11;
  const start = toMinutes(parts[0] ?? "", morning);
  const end = parts[1] ? toMinutes(parts[1], morning) : null;
  return { start, end, morning };
}

/**
 * Parse satu tab bulan -> map tanggal (angka) ke daftar kelas hari itu.
 * `day` tiap ClassItem diambil dari header hari di blok minggunya.
 */
function parseMonthGrid(grid: Grid): Map<number, ClassItem[]> {
  const legend = readLegend(grid);
  const out = new Map<number, ClassItem[]>();

  // Baris header = baris yang memuat minimal satu nama hari.
  const headerRows: number[] = [];
  grid.forEach((row, r) => {
    if ((row ?? []).some((c) => WEEKDAYS.includes(c.text.toUpperCase()))) headerRows.push(r);
  });

  headerRows.forEach((hr, i) => {
    const header = grid[hr] ?? [];
    const dateRow = hr + 1;
    const spaceRow = hr + 2;
    const firstClassRow = hr + 3;
    const lastClassRow = (i + 1 < headerRows.length ? headerRows[i + 1] : grid.length) - 1;

    const timeCol = header.findIndex((c) => c.text.toUpperCase() === "TIME SLOT");

    header.forEach((cell, col) => {
      const weekday = cell.text.toUpperCase();
      if (!WEEKDAYS.includes(weekday)) return;

      const dateNum = parseInt(cellAt(grid, dateRow, col).text, 10);
      if (!Number.isFinite(dateNum)) return;

      const items: ClassItem[] = [];

      for (let s = 0; s < 3; s++) {
        const scol = col + s;
        const space = normalizeSpace(cellAt(grid, spaceRow, scol).text);
        if (!space) continue;

        for (let r = firstClassRow; r <= lastClassRow; r++) {
          const slotText = timeCol >= 0 ? cellAt(grid, r, timeCol).text : "";
          if (!slotText) continue; // di luar rentang slot blok ini
          const cellData = cellAt(grid, r, scol);
          if (!cellData.text) continue;
          if (colorsClose(cellData.color, legend.rental)) continue; // rental, bukan kelas publik

          const slot = parseSlot(slotText);
          const parsed = parseCell(cellData.text, slot.morning, { start: slot.start, end: slot.end });
          if (!parsed) continue;

          const isWorkshop = colorsClose(cellData.color, legend.workshop);
          items.push({
            id: `${weekday}-${space}-${dateNum}-${r}-${scol}`,
            day: weekday as Day,
            space,
            name: parsed.name,
            teachers: parsed.teachers,
            start: parsed.start,
            end: parsed.end,
            timeLabel: timeLabelOf(parsed.start, parsed.end),
            note: parsed.note,
            needsCover: parsed.needsCover,
            tag: classTag(parsed.name, isWorkshop),
          });
        }
      }

      if (items.length) out.set(dateNum, items);
    });
  });

  return out;
}

/**
 * Ambil kelas untuk minggu (7 tanggal Mon..Sun) dari spreadsheet monthly.
 * Menangani minggu yang lintas bulan (mis. 27 Jul - 2 Aug baca tab JUL + AUG).
 * Return null kalau API nggak bisa diakses -> caller pakai fallback lokal.
 */
export async function fetchMonthlyWeek(
  apiKey: string,
  sheetId: string,
  weekDates: Record<Day, Date>
): Promise<ClassItem[] | null> {
  try {
    const titles = await fetchTabTitles(apiKey, sheetId);
    const gridCache = new Map<string, Map<number, ClassItem[]>>();
    const out: ClassItem[] = [];

    for (const day of DAYS) {
      const date = weekDates[day];
      const title = resolveTabTitle(titles, date);
      if (!title) continue;

      if (!gridCache.has(title)) {
        const grid = await fetchGrid(apiKey, sheetId, title);
        gridCache.set(title, parseMonthGrid(grid));
      }
      const byDate = gridCache.get(title)!;
      const dayItems = byDate.get(date.getUTCDate()) ?? [];
      // Header hari di sheet dan hari target harus sama; pakai `day` target biar konsisten.
      for (const item of dayItems) out.push({ ...item, day });
    }

    return out.length ? out : null;
  } catch {
    return null;
  }
}

/**
 * Ambil kelas untuk rentang tanggal (mis. 10 minggu ke depan) untuk feed calendar
 * subscription. Return null kalau API nggak bisa diakses.
 */
export async function fetchMonthlyRange(
  apiKey: string,
  sheetId: string,
  start: Date,
  dayCount: number
): Promise<DatedClass[] | null> {
  try {
    const titles = await fetchTabTitles(apiKey, sheetId);
    const gridCache = new Map<string, Map<number, ClassItem[]>>();
    const out: DatedClass[] = [];

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      const title = resolveTabTitle(titles, date);
      if (!title) continue;

      if (!gridCache.has(title)) {
        const grid = await fetchGrid(apiKey, sheetId, title);
        gridCache.set(title, parseMonthGrid(grid));
      }
      const items = gridCache.get(title)!.get(date.getUTCDate()) ?? [];
      for (const item of items) out.push({ date, item });
    }

    return out.length ? out : null;
  } catch {
    return null;
  }
}
