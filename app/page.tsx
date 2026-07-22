import { ScheduleBoard } from "@/components/ScheduleBoard";
import { getSchedule, REVALIDATE } from "@/lib/schedule";

export const revalidate = REVALIDATE;

export default async function Page() {
  const data = await getSchedule();

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
