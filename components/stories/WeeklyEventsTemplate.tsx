"use client";

import type { ClassItem, Day } from "@/lib/types";

function dateLabel(day: Day, week: Record<Day, Date>) {
  const date = week[day];
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "Asia/Makassar" }).format(date);
  return { day, date: `${date.getUTCDate()} ${month}` };
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

function eventTime(classItem: ClassItem) {
  if (classItem.start === null) return "TBC";
  const hours = Math.floor(classItem.start / 60);
  const minutes = String(classItem.start % 60).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

function teacherName(teachers: string[]) {
  return teachers.map((teacher) => teacher.trim().split(/\s+/)[0]).filter(Boolean).join(" · ") || "The Path";
}

export function WeeklyEventsTemplate({
  events,
  week,
  backgroundImageUrl,
  eventImages,
  editable = false,
  eventImagePositions = {},
  onEventImagePositionChange,
  onEventChange,
  headerTitle = "This week at The Path",
  onHeaderTitleChange,
}: {
  events: ClassItem[];
  week: Record<Day, Date>;
  backgroundImageUrl: string | null;
  eventImages: Record<string, string>;
  editable?: boolean;
  eventImagePositions?: Record<string, number>;
  onEventImagePositionChange?: (eventId: string, position: number) => void;
  onEventChange?: (eventId: string, patch: { name?: string; teachers?: string[]; tag?: ClassItem["tag"] }) => void;
  headerTitle?: string;
  onHeaderTitleChange?: (title: string) => void;
}) {
  return (
    <section className="weekly-events-poster" data-event-count={events.length}>
      <img className="weekly-events-background" src={backgroundImageUrl ?? "/stories/weekly-bg.png"} alt="" />
      <div className="weekly-events-overlay" />
      <header className="weekly-events-header">
        <img src="/stories/weekly-schedule-logo.png" alt="The Path" />
        <div>
          <h1
            contentEditable={editable}
            suppressContentEditableWarning
            className={editable ? "story-canvas-editable" : undefined}
            onBlur={(event) => onHeaderTitleChange?.(event.currentTarget.textContent?.trim() || "This week at The Path")}
          >{headerTitle}</h1>
          <p>{weekLabel(week)}</p>
        </div>
      </header>

      <div className="weekly-events-grid">
        {events.map((event) => (
          <article className="weekly-event-card" key={event.id}>
            <p className="weekly-event-date"><span>{dateLabel(event.day, week).day}</span><strong>{dateLabel(event.day, week).date}</strong></p>
            <div className="weekly-event-card-surface">
              <div className="weekly-event-card-meta">
                <span
                  contentEditable={editable}
                  suppressContentEditableWarning
                  className={editable ? "story-canvas-editable" : undefined}
                  onBlur={(target) => onEventChange?.(event.id, { tag: (target.currentTarget.textContent?.trim().toUpperCase() || null) as ClassItem["tag"] })}
                >{event.tag}</span>
                <span
                  contentEditable={editable}
                  suppressContentEditableWarning
                  className={editable ? "story-canvas-editable" : undefined}
                  onBlur={(target) => onEventChange?.(event.id, { teachers: (target.currentTarget.textContent || "").split(/[,·]/).map((teacher) => teacher.trim()).filter(Boolean) })}
                >{teacherName(event.teachers)}</span>
              </div>
              <img
                className={editable ? "weekly-event-image-editable" : undefined}
                src={eventImages[event.id] ?? "/stories/weekly-schedule-photo.png"}
                alt=""
                style={{ objectPosition: `50% ${eventImagePositions[event.id] ?? 50}%` }}
                onPointerDown={editable ? (pointerEvent) => {
                  const image = pointerEvent.currentTarget;
                  const startY = pointerEvent.clientY;
                  const startPosition = eventImagePositions[event.id] ?? 50;
                  image.setPointerCapture(pointerEvent.pointerId);
                  const onMove = (moveEvent: PointerEvent) => {
                    const nextPosition = Math.max(0, Math.min(100, startPosition - (moveEvent.clientY - startY) * 0.35));
                    onEventImagePositionChange?.(event.id, nextPosition);
                  };
                  const onEnd = () => {
                    image.removeEventListener("pointermove", onMove);
                    image.removeEventListener("pointerup", onEnd);
                    image.removeEventListener("pointercancel", onEnd);
                  };
                  image.addEventListener("pointermove", onMove);
                  image.addEventListener("pointerup", onEnd);
                  image.addEventListener("pointercancel", onEnd);
                } : undefined}
              />
              <div className="weekly-event-card-time">
                <strong>{eventTime(event)}</strong>
                {duration(event) && <span>{duration(event)}</span>}
              </div>
              <h2
                contentEditable={editable}
                suppressContentEditableWarning
                className={editable ? "story-canvas-editable" : undefined}
                onBlur={(target) => onEventChange?.(event.id, { name: target.currentTarget.textContent?.trim() || event.name })}
              >{event.name}</h2>
            </div>
          </article>
        ))}
      </div>
      <div className="weekly-events-link-sticker-space" aria-hidden="true">Add link sticker here</div>
      {events.length === 0 && <p className="weekly-events-empty">No workshops or events scheduled this week.</p>}
    </section>
  );
}
