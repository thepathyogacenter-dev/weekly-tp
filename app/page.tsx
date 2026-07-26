import { ScheduleBoard } from "@/components/ScheduleBoard";
import { getSchedule, REVALIDATE } from "@/lib/schedule";
import { datesForWeek, weekRangeLabel } from "@/lib/stories";
import { DAYS } from "@/lib/types";

export const revalidate = 300; // must be a literal for Next build; mirrors REVALIDATE

const TZ = "Asia/Makassar";

export default async function Page() {
  const data = await getSchedule();
  const weekRange = weekRangeLabel([...DAYS], datesForWeek(TZ), TZ);

  return (
    <main className="shell">
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
          <a className="ig-stories-link" href="/stories">
            Instagram stories →
          </a>
          <br />
          <a className="ig-stories-link" href="/teachers">
            Teacher calendars →
          </a>
        </div>
      </header>

      <ScheduleBoard data={data} revalidateSeconds={REVALIDATE} />

      <footer className="footnote">
        <span>
          Source: {data.source === "sheet" ? "Google Sheet" : "Local fallback"} · refreshed every{" "}
          {REVALIDATE / 60} min
        </span>
        <span>All times WITA (UTC+8)</span>
      </footer>
    </main>
  );
}
