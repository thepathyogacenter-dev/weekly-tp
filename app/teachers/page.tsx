import "../stories/stories.css";
import { TeachersCalendar } from "@/components/TeachersCalendar";
import { getSchedule } from "@/lib/schedule";

export const revalidate = 300;

export const metadata = {
  title: "Teacher Calendars — The Path",
  description: "Each teacher can add their weekly classes to their own calendar.",
};

export default async function TeachersPage() {
  const data = await getSchedule();
  return <TeachersCalendar data={data} />;
}
