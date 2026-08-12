import "../stories/stories.css";
import { TeachersCalendar } from "@/components/TeachersCalendar";
import { ScheduleBoard } from "@/components/ScheduleBoard";
import { getSchedule, REVALIDATE } from "@/lib/schedule";
import { datesForWeek, weekRangeLabel } from "@/lib/stories";
import { DAYS } from "@/lib/types";

export const revalidate = 300;

export const metadata = {
  title: "Teacher Schedule — The Path",
  description: "The Path weekly schedule and teacher calendar subscriptions.",
};

export default async function TeachersPage() {
  const data = await getSchedule();
  const weekRange = weekRangeLabel([...DAYS], datesForWeek("Asia/Makassar"), "Asia/Makassar");

  return (
    <main className="shell teacher-schedule-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">The Path · Canggu</p>
          <h1 className="wordmark">
            Weekly
            <br />
            <em>Schedule</em>
          </h1>
          <p className="week-range">{weekRange}</p>
        </div>
        <div className="masthead-aside">
          <span>
            <span className="live-dot" />
            {data.classes.length} classes / week
          </span>
          <br />
          <span>Drop-in or book online</span>
          <br />
          <a className="ig-stories-link" href="#teacher-calendars">Teacher calendars →</a>
        </div>
      </header>

      <ScheduleBoard data={data} revalidateSeconds={REVALIDATE} />

      <section className="teacher-calendar-section">
        <TeachersCalendar data={data} embedded />
      </section>

      <footer className="footnote">
        <span>
          Source: {data.source === "sheet" ? "Google Sheet" : "Local fallback"} · refreshed every {REVALIDATE / 60} min
        </span>
        <span>All times WITA (UTC+8)</span>
      </footer>
    </main>
  );
}
