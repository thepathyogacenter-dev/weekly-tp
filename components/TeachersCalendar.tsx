"use client";

import { useEffect, useMemo, useState } from "react";
import type { SchedulePayload } from "@/lib/types";
import { DAYS } from "@/lib/types";
import { datesForWeek, titleCase, weekRangeLabel } from "@/lib/stories";
import { buildIcs, teacherEvents } from "@/lib/ics";

const TZ = "Asia/Makassar";

export function TeachersCalendar({ data, embedded = false }: { data: SchedulePayload; embedded?: boolean }) {
  const week = useMemo(() => datesForWeek(TZ), []);
  const rangeLabel = useMemo(() => weekRangeLabel([...DAYS], week, TZ), [week]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const feedUrl = (teacher: string) => `${origin}/api/calendar/${encodeURIComponent(teacher)}`;
  const webcalUrl = (teacher: string) =>
    `${origin.replace(/^https?:/, "webcal:")}/api/calendar/${encodeURIComponent(teacher)}`;

  const copyFeed = async (teacher: string) => {
    try {
      await navigator.clipboard.writeText(feedUrl(teacher));
      setCopied(teacher);
      setTimeout(() => setCopied((t) => (t === teacher ? null : t)), 2000);
    } catch {
      /* clipboard blocked — user can still use the Subscribe link */
    }
  };

  const teachers = useMemo(() => {
    const map = new Map<string, typeof data.classes>();
    for (const c of data.classes) {
      if (c.start === null) continue;
      for (const t of c.teachers) {
        if (!map.has(t)) map.set(t, []);
        map.get(t)!.push(c);
      }
    }
    return [...map.entries()]
      .map(([name, classes]) => ({
        name,
        classes: [...classes].sort(
          (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || (a.start ?? 0) - (b.start ?? 0)
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.classes]);

  const download = (teacher: string) => {
    const events = teacherEvents(data.classes, week, teacher);
    if (!events.length) return;
    const ics = buildIcs(events, `The Path — ${teacher} (${rangeLabel})`);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `the-path-${teacher.toLowerCase().replace(/\s+/g, "-")}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const calendarContent = (
    <>
      {embedded && <h2 className="teacher-calendar-title" id="teacher-calendars">Teacher calendars</h2>}
      {!embedded && (
      <header className="stories-head">
        <p className="stories-eyebrow">The Path · Canggu</p>
        <h1 className="stories-title">Teacher Portal</h1>
        <a className="stories-back" href="/">
          ← Choose portal
        </a>
      </header>
      )}

      <p className="cal-intro">
        Subscribe once and your classes keep syncing as the schedule changes — in Google Calendar,
        add the copied link under <em>Other calendars → From URL</em>; in Apple Calendar or Outlook,
        tap <em>Subscribe</em>. (Google refreshes subscribed calendars on its own schedule, up to
        about a day.) Or grab a one-time file for this week ({rangeLabel}).
      </p>
      <div className="cal-grid">
        {teachers.map(({ name, classes }) => (
          <section className="cal-card" key={name}>
            <header className="cal-card-head">
              <h2 className="cal-name">{name}</h2>
              <span className="cal-count">
                {classes.length} {classes.length === 1 ? "class" : "classes"}
              </span>
            </header>

            <ul className="cal-list">
              {classes.map((c) => (
                <li className="cal-row" key={c.id}>
                  <span className="cal-day">{titleCase(c.day).slice(0, 3)}</span>
                  <span className="cal-time">{c.timeLabel || "TBC"}</span>
                  <span className="cal-class">{c.name}</span>
                </li>
              ))}
            </ul>

            <div className="cal-actions">
              <a className="cal-subscribe" href={webcalUrl(name)}>
                Subscribe (auto-sync)
              </a>
              <div className="cal-sublinks">
                <button type="button" className="cal-linkbtn" onClick={() => copyFeed(name)}>
                  {copied === name ? "Copied!" : "Copy sync link"}
                </button>
                <span className="cal-dot">·</span>
                <button type="button" className="cal-linkbtn" onClick={() => download(name)}>
                  Download this week
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );

  return embedded ? calendarContent : (
    <main className="stories-shell">
      {calendarContent}
    </main>
  );
}
