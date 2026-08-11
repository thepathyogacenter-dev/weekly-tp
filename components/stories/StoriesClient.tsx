"use client";

import { useState } from "react";
import { type ClassItem, type Day, type SchedulePayload } from "@/lib/types";
import {
  classesForDay,
  datesForWeek,
  formatDateLabel,
  splitBySpace,
  titleCase,
  weekRangeLabel,
} from "@/lib/stories";
import { StoryCanvas } from "./StoryCanvas";
import { DailyStoryTemplate } from "./DailyStoryTemplate";
import { WeeklyStoryTemplate } from "./WeeklyStoryTemplate";

const TZ = "Asia/Makassar";

export function StoriesClient({
  data,
  dailyClasses,
  dailyDay,
  dailyDate,
  momenceAvailable,
}: {
  data: SchedulePayload;
  dailyClasses: ClassItem[];
  dailyDay: Day;
  dailyDate: string;
  momenceAvailable: boolean;
}) {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");

  const week = datesForWeek(TZ);
  const { outdoor, indoor } = splitBySpace(dailyClasses);
  const dateLabel = formatDateLabel(new Date(dailyDate), TZ);

  const classesByDay: Record<Day, ClassItem[]> = Object.fromEntries(
    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => [
      d,
      classesForDay(data.classes, d as Day),
    ])
  ) as Record<Day, ClassItem[]>;

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
          <p className="stories-panel-label">Tomorrow · {titleCase(dailyDay)}</p>

          {!momenceAvailable && (
            <p className="stories-source-note" role="status">
              Momence is temporarily unavailable. Try refreshing before downloading.
            </p>
          )}

          <div className="stories-grid">
            <div>
              <p className="stories-panel-label">Outdoor Shala</p>
              <StoryCanvas filename={`tomorrow-${dailyDay.toLowerCase()}-outdoor-shala.png`} label="Outdoor Shala">
                <DailyStoryTemplate
                  day={dailyDay}
                  dateLabel={dateLabel}
                  shalaLabel="Outdoor Shala"
                  classes={outdoor}
                  bgSrc="/stories/outdoor-shala.jpg"
                />
              </StoryCanvas>
            </div>

            <div>
              <p className="stories-panel-label">Indoor Shala</p>
              <StoryCanvas filename={`tomorrow-${dailyDay.toLowerCase()}-indoor-shala.png`} label="Indoor Shala">
                <DailyStoryTemplate
                  day={dailyDay}
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
          {([
            { shala: "outdoor", label: "Outdoor Shala", filename: "weekly-outdoor-shala.png" },
            { shala: "indoor", label: "Indoor Shala", filename: "weekly-indoor-shala.png" },
          ] as const).map(({ shala, label, filename }) => (
            <div key={shala}>
              <p className="stories-panel-label">{label}</p>
              <StoryCanvas filename={filename} label={label}>
                <WeeklyStoryTemplate
                  classesByDay={classesByDay}
                  dateRangeLabel={weekRangeLabel(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"], week, TZ)}
                  shala={shala}
                />
              </StoryCanvas>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
