import "./stories.css";
import { StoriesClient } from "@/components/stories/StoriesClient";
import { getMomenceTomorrow } from "@/lib/momence";
import { getSchedule } from "@/lib/schedule";
import { tomorrowInTimeZone } from "@/lib/stories";

export const revalidate = 300;

export const metadata = {
  title: "Instagram Stories — The Path",
  description: "Downloadable daily and weekly schedule templates for Instagram stories.",
};

export default async function StoriesPage() {
  const [data, momenceClasses] = await Promise.all([getSchedule(), getMomenceTomorrow()]);
  const tomorrow = tomorrowInTimeZone("Asia/Makassar");

  return (
    <StoriesClient
      data={data}
      dailyClasses={momenceClasses ?? []}
      dailyDay={tomorrow.day}
      dailyDate={tomorrow.date.toISOString()}
      momenceAvailable={momenceClasses !== null}
    />
  );
}
