import type { ClassItem, Day } from "@/lib/types";
import { titleCase } from "@/lib/stories";

function startTime(classItem: ClassItem) {
  return classItem.timeLabel.split(" – ")[0] ?? "TBC";
}

function duration(classItem: ClassItem) {
  if (classItem.start === null || classItem.end === null) return null;
  const minutes = classItem.end - classItem.start;
  return minutes > 0 ? `${minutes} MINS` : null;
}

function classesForShala(classes: ClassItem[], shala: "outdoor" | "indoor") {
  return classes.filter((classItem) =>
    shala === "outdoor"
      ? classItem.space === "OUTDOOR"
      : classItem.space === "INDOOR" || classItem.space === "SHALA 3"
  );
}

export function WeeklyStoryTemplate({
  classesByDay,
  dateRangeLabel,
  shala,
}: {
  classesByDay: Record<Day, ClassItem[]>;
  dateRangeLabel: string;
  shala: "outdoor" | "indoor";
}) {
  const title = shala === "outdoor" ? "Outdoor Shala Schedule" : "Indoor Shala Schedule";

  return (
    <>
      <img className="weekly-poster-photo" src="/stories/weekly-schedule-photo.png" alt="" />
      <div className="weekly-poster-overlay" />

      <section className="weekly-poster-panel">
        <h1 className="weekly-poster-title">{title}</h1>
        <div className="weekly-poster-range">{dateRangeLabel}</div>

        <div className="weekly-poster-grid">
          {(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as Day[]).map(
            (day) => {
              const classes = classesForShala(classesByDay[day], shala);
              return (
                <section className="weekly-poster-day" key={day}>
                  <h2>{titleCase(day)}</h2>
                  {classes.length === 0 ? (
                    <p className="weekly-poster-empty">No classes scheduled</p>
                  ) : (
                    <div className="weekly-poster-rows">
                      {classes.map((classItem) => (
                        <div className="weekly-poster-row" key={classItem.id}>
                          <div className="weekly-poster-time">
                            <span>{startTime(classItem)}</span>
                            {duration(classItem) && <small>({duration(classItem)})</small>}
                          </div>
                          {classItem.tag && (
                            <span className="weekly-poster-tag" aria-label={classItem.tag}>
                              {classItem.tag === "WORKSHOP" ? "W" : "E"}
                            </span>
                          )}
                          <div className="weekly-poster-class">
                            <strong>{classItem.name}</strong>
                            {classItem.teachers.length > 0 && <span>{classItem.teachers.join(", ")}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            }
          )}
        </div>

        <footer className="weekly-poster-footer">
          <img src="/stories/weekly-schedule-logo.png" alt="The Path" />
          <p>Drop-in or book online!</p>
          <div className="weekly-poster-key">
            <span><b>E</b> Event</span>
            <span><b>W</b> Workshop</span>
          </div>
        </footer>
      </section>
    </>
  );
}
