import type { ClassItem, Day } from "@/lib/types";

function shortDate(day: Day, week: Record<Day, Date>) {
  const date = week[day];
  return `${day} ${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCFullYear()).slice(-2)}`;
}

function twelveHour(start: number | null) {
  if (start === null) return "TIME TBC";
  const hours = Math.floor(start / 60);
  const minutes = String(start % 60).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

function firstTeacher(event: ClassItem) {
  return event.teachers[0]?.trim().split(/\s+/)[0] ?? "THE PATH";
}

export function CarouselCoverTemplate({
  image,
}: {
  image: string;
}) {
  return (
    <section className="carousel-post carousel-cover">
      <img src={image} alt="" />
    </section>
  );
}

export function CarouselEventTemplate({
  event,
  week,
  image,
}: {
  event: ClassItem;
  week: Record<Day, Date>;
  image: string;
}) {
  return (
    <section className="carousel-post carousel-event">
      <img src={image} alt="" />
      <div className="carousel-event-overlay" />
      <div className="carousel-event-copy">
        <p className="carousel-type">{event.tag === "EVENT" ? "EVENT" : "WORKSHOP"}</p>
        <h1>{event.name}</h1>
        <p className="carousel-teacher">WITH <b>{firstTeacher(event)}</b></p>
        <p className="carousel-date">{shortDate(event.day, week)} · {twelveHour(event.start)}</p>
      </div>
    </section>
  );
}
