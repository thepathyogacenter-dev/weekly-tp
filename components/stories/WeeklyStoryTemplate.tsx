import type { ClassItem, Day } from "@/lib/types";
import { storyTimeRange, titleCase } from "@/lib/stories";

export function WeeklyStoryTemplate({
  days,
  classesByDay,
  dateRangeLabel,
  bgSrc,
}: {
  days: Day[];
  classesByDay: Record<Day, ClassItem[]>;
  dateRangeLabel: string;
  bgSrc?: string;
}) {
  return (
    <>
      {bgSrc && (
        <img
          className="story-bg"
          src={bgSrc}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="story-tint" />
      <div className="story-content">
        <img
          className="story-logo"
          src="/stories/logo.png"
          alt="The Path"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        <div className="story-header">
          <h1 className="story-h1">Weekly Schedule</h1>
          <div className="story-date">{dateRangeLabel}</div>
        </div>

        <div className="story-week-body">
          {days.map((day, i) => (
            <div className="story-week-panel" data-alt={i % 2 === 1} key={day}>
              <div className="story-week-day-badge">{titleCase(day)}</div>
              {classesByDay[day].length === 0 ? (
                <div className="story-week-empty">No classes scheduled</div>
              ) : (
                <div className="story-week-rows">
                  {classesByDay[day].map((c) => (
                    <div className="story-week-row" key={c.id}>
                      <div className="story-week-time">{storyTimeRange(c) || "TBC"}</div>
                      <div className="story-week-name">{c.name}</div>
                      <div className="story-week-teacher">{c.teachers.join(", ")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="story-footer">Book online or pay in person</div>
      </div>
    </>
  );
}
