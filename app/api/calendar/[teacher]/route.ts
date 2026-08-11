import { fetchMonthlyRange } from "@/lib/monthSchedule";
import { buildIcs, datedTeacherEvents } from "@/lib/ics";
import { REVALIDATE } from "@/lib/schedule";
import { calendarDateInTimeZone } from "@/lib/stories";

export const revalidate = 300; // literal required by Next build; mirrors REVALIDATE

const TZ = "Asia/Makassar";
const WEEKS_AHEAD = 10;

/** Tanggal "hari ini" menurut WITA, sebagai Date yang y/m/d-nya sesuai WITA. */
function todayInWita(): Date {
  return calendarDateInTimeZone(TZ);
}

export async function GET(_req: Request, { params }: { params: Promise<{ teacher: string }> }) {
  const { teacher: raw } = await params;
  const teacher = decodeURIComponent(raw).replace(/\.ics$/i, "").trim();

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.SCHEDULE_SHEET_ID;

  const dated =
    apiKey && sheetId ? await fetchMonthlyRange(apiKey, sheetId, todayInWita(), WEEKS_AHEAD * 7) : null;
  const events = dated ? datedTeacherEvents(dated, teacher) : [];
  const ics = buildIcs(events, `The Path — ${teacher}`);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="the-path-${teacher.toLowerCase().replace(/\s+/g, "-")}.ics"`,
      "Cache-Control": `public, max-age=0, s-maxage=${REVALIDATE}`,
    },
  });
}
