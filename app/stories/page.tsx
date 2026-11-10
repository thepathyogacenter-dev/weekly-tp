import "./stories.css";
import { StoriesClient } from "@/components/stories/StoriesClient";
import { getSchedule } from "@/lib/schedule";
import {
  datesForWeek,
  tomorrowInTimeZone,
  weekContaining,
  weekKeyOf,
} from "@/lib/stories";

export const revalidate = 300;

export const metadata = {
  title: "Instagram Stories — The Path",
  description:
    "Downloadable daily and weekly schedule templates for Instagram stories.",
};

const TZ = "Asia/Makassar";

export default async function StoriesPage() {
  // Untuk testing: ganti sementara dengan new Date("2026-11-13T19:00:00+08:00")
  const now = new Date();

  const tomorrow = tomorrowInTimeZone(TZ, now);
  const publishWeek = datesForWeek(TZ, now); // Weekly, Carousel, Schedule Editor
  const dailyWeek = weekContaining(tomorrow.date); // Daily
  const sameWeek = weekKeyOf(publishWeek) === weekKeyOf(dailyWeek);

  // Jumat & Sabtu: dua minggu berbeda, fetch paralel. Hari lain: satu fetch.
  const [data, dailyData] = await Promise.all([
    getSchedule(publishWeek),
    sameWeek ? Promise.resolve(null) : getSchedule(dailyWeek),
  ]);

  return (
    <StoriesClient
      data={data}
      dailyClasses={(dailyData ?? data).classes}
      dailyWeekKey={weekKeyOf(dailyWeek)}
      dailyDay={tomorrow.day}
      dailyDate={tomorrow.date.toISOString()}
      momenceAvailable={data.source === "momence"}
    />
  );
}
