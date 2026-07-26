import "./stories.css";
import { StoriesClient } from "@/components/stories/StoriesClient";
import { getSchedule } from "@/lib/schedule";

export const revalidate = 300;

export const metadata = {
  title: "Instagram Stories — The Path",
  description: "Downloadable daily and weekly schedule templates for Instagram stories.",
};

export default async function StoriesPage() {
  const data = await getSchedule();
  return <StoriesClient data={data} />;
}
