import { DAYS, SPACES, type ClassItem, type Day, type Space } from "./types";

/**
 * Berapa baris jadwal pertama yang dianggap pagi.
 * Google Sheet nggak menyimpan AM/PM, jadi jam 7-11 ditebak dari posisi baris.
 * Kalau kamu ubah urutan baris di Sheet, angka ini ikut berubah.
 * Solusi permanen: tulis jam 24 jam di Sheet, misal "19.00 - 20.30".
 */
export const MORNING_ROWS = 3;

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

export function toMinutes(raw: string, morning: boolean): number | null {
  const m = clean(raw).replace(",", ".").match(/^(\d{1,2})(?:[.:](\d{1,2}))?$/);
  if (!m) return null;

  const h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2].padEnd(2, "0"), 10) : 0;
  if (h > 23 || min > 59) return null;

  if (h === 12) return 12 * 60 + min;
  if (h >= 1 && h <= 6) return (h + 12) * 60 + min;
  if (h >= 7 && h <= 11) return (morning ? h : h + 12) * 60 + min;
  return h * 60 + min;
}

export function fmtTime(mins: number | null): string {
  if (mins === null) return "";
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface ParsedCell {
  name: string;
  teachers: string[];
  start: number | null;
  end: number | null;
  note: string;
  needsCover: boolean;
}

/**
 * "Sunrise Flow. Meli (7.15 - 8.15)" -> objek.
 * `morning` menentukan jam 7-11 dibaca pagi atau malam.
 * `fallback` dipakai kalau sel nggak punya jam dalam kurung (mis. jam diambil dari kolom TIME SLOT).
 */
export function parseCell(
  raw: string,
  morning: boolean,
  fallback?: { start: number | null; end: number | null }
): ParsedCell | null {
  let text = clean(raw);
  if (!text) return null;

  const needsCover = /^MIA\s*[-–—]\s*/i.test(text);
  if (needsCover) text = text.replace(/^MIA\s*[-–—]\s*/i, "");

  let start: number | null = fallback?.start ?? null;
  let end: number | null = fallback?.end ?? null;
  let note = "";

  const paren = text.match(/\(([^()]*)\)\s*$/);
  if (paren) {
    text = text.slice(0, paren.index).trim();
    const inner = clean(paren[1]);
    const parts = inner.split(/\s*[-–—]\s*/);
    const s = toMinutes(parts[0], morning);
    if (s === null) {
      note = inner;
    } else {
      start = s;
      end = parts.length > 1 ? toMinutes(parts[1], morning) : null;
    }
  }

  // Sesi gabungan: "Tibetan Sound Healing. Val / Crystal Bowl Sound Healing. Komal"
  const segments = text.split(" / ");
  const multi = segments.length > 1 && segments.every((s) => s.includes(". "));

  let name: string;
  let teachers: string[] = [];

  if (multi) {
    name = segments.map((s) => s.slice(0, s.lastIndexOf(". ")).trim()).join(" / ");
    teachers = segments.map((s) => s.slice(s.lastIndexOf(". ") + 2).trim());
  } else {
    const dot = text.lastIndexOf(". ");
    if (dot > 0) {
      name = text.slice(0, dot).trim();
      teachers = text
        .slice(dot + 2)
        .split(/\s*[,/&]\s*|\s+and\s+/i)
        .map((t) => t.trim())
        .filter(Boolean);
    } else {
      name = text;
    }
  }

  return { name, teachers, start, end, note, needsCover };
}

/** Men's/Women's Circle selalu EVENT; sel yang di-highlight warna "Workshop or event" jadi WORKSHOP. */
export function classTag(name: string, isWorkshopColor: boolean): ClassItem["tag"] {
  if (/\b(?:men|women)['’]s circle\b/i.test(name)) return "EVENT";
  if (isWorkshopColor) return "WORKSHOP";
  return null;
}

/** Nama/waktu -> timeLabel "07:15 – 08:15" (atau "" kalau nggak ada jam). */
export function timeLabelOf(start: number | null, end: number | null): string {
  if (start === null) return "";
  return fmtTime(start) + (end !== null ? ` – ${fmtTime(end)}` : "");
}

/**
 * Ubah matrix Sheet (kolom = hari x ruang) jadi daftar kelas.
 * Dipakai untuk snapshot fallback lokal (tanpa warna).
 * Baris 1 = nama hari (merged), baris 2 = OUTDOOR/INDOOR/SHALA 3.
 */
export function buildSchedule(rows: string[][]): ClassItem[] {
  const dayList: string[] = [...DAYS];
  const spaceList: string[] = [...SPACES];

  let dayRow = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    if (rows[i].some((c) => dayList.includes(clean(c).toUpperCase()))) {
      dayRow = i;
      break;
    }
  }
  if (dayRow === -1) return [];

  const spaceRow = rows[dayRow + 1] ?? [];
  const columns: { day: Day | null; space: Space }[] = [];
  let currentDay: Day | null = null;

  for (let c = 0; c < rows[dayRow].length; c++) {
    const d = clean(rows[dayRow][c]).toUpperCase();
    if (dayList.includes(d)) currentDay = d as Day;

    const s = clean(spaceRow[c]).toUpperCase();
    columns[c] = {
      day: currentDay,
      space: (spaceList.includes(s) ? s : "OUTDOOR") as Space,
    };
  }

  const out: ClassItem[] = [];

  for (let r = dayRow + 2; r < rows.length; r++) {
    const rowIndex = r - (dayRow + 2);
    for (let c = 0; c < rows[r].length; c++) {
      const col = columns[c];
      if (!col?.day) continue;

      const parsed = parseCell(rows[r][c], rowIndex < MORNING_ROWS);
      if (!parsed) continue;

      out.push({
        id: `${col.day}-${col.space}-${r}-${c}`,
        day: col.day,
        space: col.space,
        name: parsed.name,
        teachers: parsed.teachers,
        start: parsed.start,
        end: parsed.end,
        timeLabel: timeLabelOf(parsed.start, parsed.end),
        note: parsed.note,
        needsCover: parsed.needsCover,
        tag: classTag(parsed.name, false),
      });
    }
  }

  return out;
}
