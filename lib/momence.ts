import { tomorrowInTimeZone } from "./stories";
import { type ClassItem, type Day, type Space } from "./types";

const API = "https://readonly-api.momence.com";
const TZ = "Asia/Makassar";
const PAGE_SIZE = 20;
export const MOMENCE_REVALIDATE = 300;

interface MomenceSession {
  id: number;
  sessionName: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  teacher?: string | null;
  additionalTeachers?: Array<string | { name?: string | null }> | null;
  isCancelled?: boolean;
}

interface MomenceSessionsResponse {
  payload?: MomenceSession[];
  pagination?: { totalCount?: number };
}

function witaBoundary(date: Date): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), -8)
  ).toISOString();
}

function timeParts(iso: string): { day: Day; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: get("weekday").toUpperCase() as Day,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function spaceFor(location: string | null | undefined): Space {
  const value = (location ?? "").toLowerCase();
  if (value.includes("outdoor")) return "OUTDOOR";
  if (value.includes("3rd") || value.includes("third") || value.includes("shala 3")) return "SHALA 3";
  return "INDOOR";
}

function teachersFor(session: MomenceSession): string[] {
  const teachers = [session.teacher, ...(session.additionalTeachers ?? [])]
    .map((teacher) => (typeof teacher === "string" ? teacher : teacher?.name ?? ""))
    .map((teacher) => teacher.trim())
    .filter(Boolean);
  return [...new Set(teachers)];
}

/** Momence's public feed has no Event/Workshop field, so label the known special formats here. */
function tagForSession(name: string): ClassItem["tag"] {
  if (/\b(?:men|women)['’]?s circle\b/i.test(name)) return "EVENT";
  if (/workshop|ceremony|sound healing|somatic|return to self|thai yoga massage|meditate\.?\s*heal\.?\s*transform/i.test(name)) {
    return "WORKSHOP";
  }
  return null;
}

async function fetchPage(hostId: string, fromDate: string, toDate: string, page: number) {
  const url = new URL(`${API}/host-plugins/host/${hostId}/host-schedule/sessions`);
  url.searchParams.set("fromDate", fromDate);
  url.searchParams.set("toDate", toDate);
  url.searchParams.set("timeZone", TZ);
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, { next: { revalidate: MOMENCE_REVALIDATE } });
  if (!response.ok) throw new Error(`Momence schedule ${response.status}`);
  return (await response.json()) as MomenceSessionsResponse;
}

/**
 * Daily Instagram downloads use only Momence's public schedule feed for
 * tomorrow. Weekly story posts continue to use the published Google Sheet so
 * they remain stable through the weekend.
 */
export async function getMomenceTomorrow(): Promise<ClassItem[] | null> {
  const hostId = process.env.MOMENCE_HOST_ID ?? "14607";
  const { date: tomorrow } = tomorrowInTimeZone(TZ);
  const fromDate = witaBoundary(tomorrow);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setUTCDate(dayAfterTomorrow.getUTCDate() + 1);
  const toDate = witaBoundary(dayAfterTomorrow);

  try {
    const first = await fetchPage(hostId, fromDate, toDate, 0);
    const total = first.pagination?.totalCount ?? first.payload?.length ?? 0;
    const remainingPages = Math.ceil(total / PAGE_SIZE) - 1;
    const pages = await Promise.all(
      Array.from({ length: Math.max(remainingPages, 0) }, (_, index) =>
        fetchPage(hostId, fromDate, toDate, index + 1)
      )
    );
    const sessions = [first, ...pages].flatMap((page) => page.payload ?? []);

    const classes = sessions
      .filter((session) => !session.isCancelled && session.sessionName && session.startsAt && session.endsAt)
      .map((session) => {
        const start = timeParts(session.startsAt);
        const end = timeParts(session.endsAt);
        return {
          id: `momence-${session.id}`,
          day: start.day,
          space: spaceFor(session.location),
          name: session.sessionName.trim(),
          teachers: teachersFor(session),
          start: start.minutes,
          end: end.minutes,
          timeLabel: `${formatTime(start.minutes)} – ${formatTime(end.minutes)}`,
          note: "",
          needsCover: false,
          tag: tagForSession(session.sessionName),
        } satisfies ClassItem;
      });

    return classes.length ? classes : null;
  } catch {
    return null;
  }
}
