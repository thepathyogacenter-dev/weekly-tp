import { buildIcs, teacherEvents } from "@/lib/ics";
import { REVALIDATE, getSchedule } from "@/lib/schedule";
import { datesForWeek } from "@/lib/stories";

export const revalidate = 300;
const TZ = "Asia/Makassar";

// Momence is the only calendar source. The subscribed URL refreshes its current
// Monday–Sunday week whenever the schedule changes.
export async function GET(_req: Request, { params }: { params: Promise<{ teacher: string }> }) {
  const { teacher: raw } = await params;
  const teacher = decodeURIComponent(raw).replace(/\.ics$/i, "").trim();
  const data = await getSchedule();
  const events = teacherEvents(data.classes, datesForWeek(TZ), teacher);
  const ics = buildIcs(events, "The Path — " + teacher);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=the-path-" + teacher.toLowerCase().replace(/\s+/g, "-") + ".ics",
      "Cache-Control": "public, max-age=0, s-maxage=" + REVALIDATE,
    },
  });
}
