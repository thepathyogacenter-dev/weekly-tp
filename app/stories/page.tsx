import "./stories.css";
import { StoriesClient } from "@/components/stories/StoriesClient";
import { getSchedule } from "@/lib/schedule";
import { tomorrowInTimeZone } from "@/lib/stories";

export const revalidate = 300;

export const metadata = {
  title: "Instagram Stories — The Path",
  description: "Downloadable daily and weekly schedule templates for Instagram stories.",
};

export default async function StoriesPage() {
  // Satu sumber untuk semua post: schedule (Momence + merge Sheet). Daily, Weekly,
  // Carousel, dan bulletin semuanya dialiri lewat Schedule Editor di client.
  const data = await getSchedule();
  const tomorrow = tomorrowInTimeZone("Asia/Makassar");

  return (
    <StoriesClient
      data={data}
      dailyDay={tomorrow.day}
      dailyDate={tomorrow.date.toISOString()}
      momenceAvailable={data.source === "momence"}
    />
  );
}
