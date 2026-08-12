import type { ClassItem, Day } from "@/lib/types";

const DAY_COLUMNS: Day[][] = [
  ["MONDAY", "TUESDAY", "WEDNESDAY"],
  ["THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
];

function dayLabel(day: Day, date: Date) {
  const dayNumber = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day} ${dayNumber}.${month}.${year}`;
}

function timeLabel(classItem: ClassItem) {
  return classItem.timeLabel || "TBC";
}

function weeklyRangeLabel(week: Record<Day, Date>) {
  const monday = week.MONDAY;
  const sunday = week.SUNDAY;
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "Asia/Makassar" })
    .format(sunday)
    .toUpperCase();
  return `${monday.getUTCDate()} - ${sunday.getUTCDate()} ${month} ${sunday.getUTCFullYear()}`;
}

function scheduleForDay(classes: ClassItem[]) {
  return [...classes].sort((a, b) => (a.start ?? Number.MAX_SAFE_INTEGER) - (b.start ?? Number.MAX_SAFE_INTEGER));
}

export function TeacherWeeklyTemplate({
  classesByDay,
  week,
}: {
  classesByDay: Record<Day, ClassItem[]>;
  week: Record<Day, Date>;
}) {
  return (
    <section className="teacher-weekly-poster">
      <img className="teacher-weekly-watermark" src="/stories/weekly-schedule-logo.png" alt="" />

      <header className="teacher-weekly-header">
        <div className="teacher-weekly-title-block">
          <span>Weekly Schedule</span>
          <strong>{weeklyRangeLabel(week)}</strong>
        </div>
        <div className="teacher-weekly-meta">
          <strong>Drop-in or book online!</strong>
          <div className="teacher-weekly-legend" aria-label="Schedule legend">
            <span><b>E</b> Event</span>
            <span><b>W</b> Workshop</span>
          </div>
        </div>
      </header>

      <div className="teacher-weekly-columns">
        {DAY_COLUMNS.map((days) => (
          <div className="teacher-weekly-column" key={days.join("-")}>
            {days.map((day) => {
              const classes = scheduleForDay(classesByDay[day]);
              return (
                <section className="teacher-weekly-day" key={day}>
                  <h2>{dayLabel(day, week[day])}</h2>
                  <div className="teacher-weekly-rows">
                    {classes.length === 0 ? (
                      <p className="teacher-weekly-empty">No classes scheduled</p>
                    ) : (
                      classes.map((classItem) => (
                        <div className="teacher-weekly-row" key={classItem.id}>
                          <time>{timeLabel(classItem)}</time>
                          {classItem.tag && <span className="teacher-weekly-tag">{classItem.tag === "EVENT" ? "E" : "W"}</span>}
                          <p>
                            <strong>{classItem.name}</strong>
                            {classItem.teachers.length > 0 && <span> with {classItem.teachers.join(", ")}</span>}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ))}
      </div>

      <footer className="teacher-weekly-footer">thepathyogacenter.com</footer>
    </section>
  );
}
