"use client";

import { useEffect, useMemo, useState } from "react";
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
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { DailyStoryTemplate } from "./DailyStoryTemplate";
import { TeacherWeeklyTemplate } from "./TeacherWeeklyTemplate";
import { WeeklyStoryTemplate } from "./WeeklyStoryTemplate";
import { WeeklyEventsTemplate } from "./WeeklyEventsTemplate";
import { AdminScheduleEditor } from "./AdminScheduleEditor";
import { CarouselCoverTemplate, CarouselEventTemplate } from "./CarouselTemplates";
import { CarouselDownloadButton } from "./CarouselDownloadButton";

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
  const [tab, setTab] = useState<"daily" | "weekly" | "carousel" | "schedule">("daily");
  const [adminClasses, setAdminClasses] = useState<ClassItem[]>(data.classes);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);

  const week = useMemo(() => datesForWeek(TZ), []);
  const { outdoor, indoor } = splitBySpace(dailyClasses);
  const dateLabel = formatDateLabel(new Date(dailyDate), TZ);
  const scheduleStorageKey = `the-path-admin-schedule-${week.MONDAY.toISOString().slice(0, 10)}`;

  const classesByDay: Record<Day, ClassItem[]> = Object.fromEntries(
    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => [
      d,
      classesForDay(adminClasses, d as Day),
    ])
  ) as Record<Day, ClassItem[]>;
  const weeklyEvents = useMemo(
    () =>
      adminClasses
        .filter((classItem) => classItem.tag !== null)
        .sort(
          (a, b) =>
            ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].indexOf(a.day) -
              ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].indexOf(b.day) ||
            (a.start ?? 1e6) - (b.start ?? 1e6)
        ),
    [adminClasses]
  );
  const storageKey = `the-path-weekly-event-images-${week.MONDAY.toISOString().slice(0, 10)}`;
  const [eventImages, setEventImages] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(scheduleStorageKey);
      setAdminClasses(saved ? JSON.parse(saved) : data.classes);
    } catch {
      setAdminClasses(data.classes);
    } finally {
      setScheduleLoaded(true);
    }
  }, [data.classes, scheduleStorageKey]);

  useEffect(() => {
    if (!scheduleLoaded) return;
    try {
      window.localStorage.setItem(scheduleStorageKey, JSON.stringify(adminClasses));
    } catch {
      // The source schedule remains available if local browser storage is full.
    }
  }, [adminClasses, scheduleLoaded, scheduleStorageKey]);

  const resetAdminClasses = () => {
    window.localStorage.removeItem(scheduleStorageKey);
    setAdminClasses(data.classes);
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setEventImages(JSON.parse(saved));
    } catch {
      setEventImages({});
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(eventImages));
    } catch {
      // Image selections are still available until the current page is closed.
    }
  }, [eventImages, storageKey]);

  const uploadEventImage = (eventId: string, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = reader.result;
      if (typeof image === "string") {
        setEventImages((current) => ({ ...current, [eventId]: image }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="stories-shell">
      <header className="stories-head">
        <p className="stories-eyebrow">The Path · Admin</p>
        <h1 className="stories-title">Story Downloads</h1>
        <div className="stories-head-actions">
          <a className="stories-back" href="/">← Choose portal</a>
          <AdminLogoutButton />
        </div>
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
        <button
          type="button"
          className="stories-tab"
          data-active={tab === "carousel"}
          onClick={() => setTab("carousel")}
        >
          Weekly posts carousel
        </button>
        <button
          type="button"
          className="stories-tab"
          data-active={tab === "schedule"}
          onClick={() => setTab("schedule")}
        >
          Schedule editor
        </button>
      </div>

      {tab === "schedule" ? (
        <AdminScheduleEditor classes={adminClasses} onChange={setAdminClasses} onReset={resetAdminClasses} />
      ) : tab === "carousel" ? (
        <>
          <section className="weekly-events-admin" aria-labelledby="carousel-admin-title">
            <div>
              <p className="stories-panel-label">Weekly Instagram posts</p>
              <h2 id="carousel-admin-title">Workshops & events carousel</h2>
              <p>Use the same image uploads as the Events & Workshops story. Each uploaded image is automatically used on its matching carousel post.</p>
            </div>
            <div className="weekly-events-upload-list">
              {weeklyEvents.map((event) => (
                <label className="weekly-events-upload" key={`carousel-upload-${event.id}`}>
                  <span>{event.tag === "EVENT" ? "E" : "W"}</span>
                  <strong>{event.name}</strong>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadEventImage(event.id, e.target.files?.[0])} />
                  <em>{eventImages[event.id] ? "Image linked to post" : "Upload image for post"}</em>
                </label>
              ))}
            </div>
          </section>
          <div className="carousel-download-bar">
            <CarouselDownloadButton
              items={[
                { canvasId: "weekly-carousel-cover", filename: "weekly-workshops-events-cover.png" },
                ...weeklyEvents.map((event, index) => ({
                  canvasId: `weekly-carousel-${event.id}`,
                  filename: `weekly-carousel-${index + 1}-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`,
                })),
              ]}
            />
          </div>
          <div className="stories-grid">
            <div>
              <p className="stories-panel-label">Cover</p>
              <StoryCanvas filename="weekly-workshops-events-cover.png" label="Weekly posts carousel cover" width={1080} height={1350} canvasId="weekly-carousel-cover" hideActions>
                <CarouselCoverTemplate
                  image="/stories/weekly-posts-carousel-cover.png"
                />
              </StoryCanvas>
            </div>
            {weeklyEvents.map((event, index) => (
              <div key={`carousel-${event.id}`}>
                <p className="stories-panel-label">Post {index + 1}</p>
                <StoryCanvas filename={`weekly-carousel-${index + 1}-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`} label={event.name} width={1080} height={1350} canvasId={`weekly-carousel-${event.id}`} hideActions>
                  <CarouselEventTemplate event={event} week={week} image={eventImages[event.id] ?? "/stories/weekly-schedule-photo.png"} />
                </StoryCanvas>
              </div>
            ))}
          </div>
        </>
      ) : tab === "daily" ? (
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
        <>
          <section className="weekly-events-admin" aria-labelledby="weekly-events-admin-title">
            <div>
              <p className="stories-panel-label">New weekly story</p>
              <h2 id="weekly-events-admin-title">Events & workshops</h2>
              <p>Upload a photo for each card. The same image is automatically shared with its Weekly Posts Carousel post.</p>
            </div>
            <div className="weekly-events-upload-list">
              {weeklyEvents.map((event) => (
                <label className="weekly-events-upload" key={event.id}>
                  <span>{event.tag === "EVENT" ? "E" : "W"}</span>
                  <strong>{event.name}</strong>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadEventImage(event.id, e.target.files?.[0])} />
                  <em>{eventImages[event.id] ? "Image linked to carousel" : "Upload image"}</em>
                </label>
              ))}
            </div>
          </section>

          <div className="stories-grid">
            <div>
              <p className="stories-panel-label">Events & workshops</p>
              <StoryCanvas filename="weekly-events-and-workshops.png" label="Events & workshops">
                <WeeklyEventsTemplate
                  events={weeklyEvents}
                  week={week}
                  backgroundImageUrl={data.weeklyBackgroundImage}
                  eventImages={eventImages}
                />
              </StoryCanvas>
            </div>
            <div>
            <p className="stories-panel-label">Teacher WhatsApp bulletin</p>
            <StoryCanvas filename="weekly-teacher-whatsapp-schedule.png" label="Teacher WhatsApp bulletin">
              <TeacherWeeklyTemplate classesByDay={classesByDay} week={week} />
            </StoryCanvas>
            </div>
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
                  backgroundImageUrl={data.weeklyBackgroundImage}
                />
              </StoryCanvas>
            </div>
          ))}
          </div>
        </>
      )}
    </main>
  );
}
