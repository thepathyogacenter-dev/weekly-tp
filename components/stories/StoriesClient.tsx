"use client";

import { useEffect, useState } from "react";
import { DAYS, type ClassItem, type Day, type SchedulePayload } from "@/lib/types";
import {
  WEEKLY_GROUPS,
  classesForDay,
  datesForWeek,
  formatDateLabel,
  nextDate,
  splitBySpace,
  titleCase,
  weekRangeLabel,
} from "@/lib/stories";
import { StoryCanvas } from "./StoryCanvas";
import { DailyStoryTemplate } from "./DailyStoryTemplate";
import { WeeklyStoryTemplate } from "./WeeklyStoryTemplate";

const TZ = "Asia/Makassar";

function todayInTz(): Day {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long" })
    .format(new Date())
    .toUpperCase() as Day;
}

export function StoriesClient({ data }: { data: SchedulePayload }) {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [day, setDay] = useState<Day>("MONDAY");

  useEffect(() => {
    setDay(todayInTz());
  }, []);

  const dayClasses = classesForDay(data.classes, day);
  const { outdoor, indoor } = splitBySpace(dayClasses);
  const dateLabel = formatDateLabel(nextDate(day, TZ), TZ);

  const classesByDay: Record<Day, ClassItem[]> = Object.fromEntries(
    DAYS.map((d) => [d, classesForDay(data.classes, d)])
  ) as Record<Day, ClassItem[]>;
  const week = datesForWeek(TZ);

  return (
    <main className="stories-shell">
      <header className="stories-head">
        <p className="stories-eyebrow">The Path · Canggu</p>
        <h1 className="stories-title">Instagram Stories</h1>
        <a className="stories-back" href="/">
          ← Back to schedule
        </a>
      </header>

      <div className="stories-tabs">
        <button
          type="button"
          className="stories-tab"
          data-active={tab === "daily"}
          onClick={() => setTab("daily")}
        >
          Daily
        </button>
        <button
          type="button"
          className="stories-tab"
          data-active={tab === "weekly"}
          onClick={() => setTab("weekly")}
        >
          Weekly
        </button>
      </div>

      {tab === "daily" ? (
        <>
          <div className="stories-day-picker">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                className="stories-day-chip"
                data-active={day === d}
                onClick={() => setDay(d)}
              >
                {titleCase(d)}
              </button>
            ))}
          </div>

          <div className="stories-grid">
            <div>
              <p className="stories-panel-label">Outdoor Shala</p>
              <StoryCanvas filename={`${day.toLowerCase()}-outdoor-shala.png`} label="Outdoor Shala">
                <DailyStoryTemplate
                  day={day}
                  dateLabel={dateLabel}
                  shalaLabel="Outdoor Shala"
                  classes={outdoor}
                  bgSrc="/stories/outdoor-shala.jpg"
                />
              </StoryCanvas>
            </div>

            <div>
              <p className="stories-panel-label">Indoor Shala</p>
              <StoryCanvas filename={`${day.toLowerCase()}-indoor-shala.png`} label="Indoor Shala">
                <DailyStoryTemplate
                  day={day}
                  dateLabel={dateLabel}
                  shalaLabel="Indoor Shala"
                  classes={indoor}
                  bgSrc="/stories/indoor-shala.jpg"
                />
              </StoryCanvas>
            </div>
          </div>
        </>
      ) : (
        <div className="stories-grid">
          {WEEKLY_GROUPS.map((group, i) => (
            <div key={group.title}>
              <p className="stories-panel-label">{group.title}</p>
              <StoryCanvas filename={`weekly-post-${i + 1}.png`} label={`Post ${i + 1}`}>
                <WeeklyStoryTemplate
                  days={group.days}
                  classesByDay={classesByDay}
                  dateRangeLabel={weekRangeLabel(group.days, week, TZ)}
                  bgSrc="/stories/weekly-bg.png"
                />
              </StoryCanvas>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
