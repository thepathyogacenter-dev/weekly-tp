import type { ClassItem, Day } from "@/lib/types";

function dateLabel(day: Day, week: Record<Day, Date>) {
  const date = week[day];
  return `${day} ${date.getUTCDate()}`;
}

function weekLabel(week: Record<Day, Date>) {
  const first = week.MONDAY;
  const last = week.SUNDAY;
  const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Asia/Makassar" })
    .format(last)
    .toUpperCase();
  return `${String(first.getUTCDate()).padStart(2, "0")} - ${String(last.getUTCDate()).padStart(2, "0")} ${month} ${last.getUTCFullYear()}`;
}

function duration(classItem: ClassItem) {
  if (classItem.start === null || classItem.end === null) return null;
  return `${classItem.end - classItem.start} min`;
}

export function WeeklyEventsTemplate({
  events,
  week,
  backgroundImageUrl,
  eventImages,
}: {
  events: ClassItem[];
  week: Record<Day, Date>;
  backgroundImageUrl: string | null;
  eventImages: Record<string, string>;
}) {
  return (
    <section className="weekly-events-poster">
      <img className="weekly-events-background" src={backgroundImageUrl ?? "/stories/weekly-bg.png"} alt="" />
      <div className="weekly-events-overlay" />
      <header className="weekly-events-header">
        <img src="/stories/weekly-schedule-logo.png" alt="The Path" />
        <div>
          <h1>This week at The Path</h1>
          <p>{weekLabel(week)}</p>
        </div>
      </header>

      <div className="weekly-events-grid">
        {events.map((event) => (
          <article className="weekly-event-card" key={event.id}>
            <p className="weekly-event-date">{dateLabel(event.day, week)}</p>
            <div className="weekly-event-card-surface">
              <div className="weekly-event-card-meta">
                <span>{event.tag}</span>
                <span>{event.teachers.join(", ") || "The Path"}</span>
              </div>
              <img src={eventImages[event.id] ?? "/stories/weekly-schedule-photo.png"} alt="" />
              <div className="weekly-event-card-time">
                <strong>{event.timeLabel || "TBC"}</strong>
                {duration(event) && <span>{duration(event)}</span>}
              </div>
              <h2>{event.name}</h2>
            </div>
          </article>
        ))}
      </div>
      {events.length === 0 && <p className="weekly-events-empty">No workshops or events scheduled this week.</p>}
    </section>
  );
}
