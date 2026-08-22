"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { StoryLibrary } from "./StoryLibrary";

const TZ = "Asia/Makassar";

export function StoriesClient({
  data,
  dailyDay,
  dailyDate,
  momenceAvailable,
}: {
  data: SchedulePayload;
  dailyDay: Day;
  dailyDate: string;
  momenceAvailable: boolean;
}) {
  const [tab, setTab] = useState<"daily" | "weekly" | "carousel" | "schedule" | "library">("daily");
  const [adminClasses, setAdminClasses] = useState<ClassItem[]>(data.classes);
  const [syncState, setSyncState] = useState<"saved" | "saving" | "error">("saved");
  const [dailyEditing, setDailyEditing] = useState(false);
  const [weeklyEventsEditing, setWeeklyEventsEditing] = useState(false);
  const [weeklyEventsTitle, setWeeklyEventsTitle] = useState("This week at The Path");

  const week = useMemo(() => datesForWeek(TZ), []);
  // Semua post Instagram (termasuk Daily) ambil dari Schedule Editor (adminClasses),
  // yang berbasis Momence + merge Sheet + override manual. Daily = kelas hari besok.
  const { outdoor, indoor } = useMemo(
    () => splitBySpace(classesForDay(adminClasses, dailyDay)),
    [adminClasses, dailyDay]
  );
  const dateLabel = formatDateLabel(new Date(dailyDate), TZ);
  const weekKey = week.MONDAY.toISOString().slice(0, 10);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSharedClasses = useRef<ClassItem[]>(data.classes);

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
  const [eventImagePositions, setEventImagePositions] = useState<Record<string, number>>({});
  const eventPositionsKey = `${storageKey}-positions`;
  const eventTitleKey = `${storageKey}-title`;

  useEffect(() => {
    lastSharedClasses.current = data.classes;
    setAdminClasses(data.classes);
  }, [data.classes]);

  // A user edit is published to the shared server store. The UI only keeps a
  // change when the server confirms it, so one browser cannot show unpublished data.
  const applyChange = (next: ClassItem[]) => {
    setAdminClasses(next);
    setSyncState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/admin/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: weekKey, classes: next }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok) throw new Error("Shared schedule save failed");
        lastSharedClasses.current = next;
        setSyncState("saved");
      } catch {
        setAdminClasses(lastSharedClasses.current);
        setSyncState("error");
      }
    }, 600);
  };

  const resetAdminClasses = async () => {
    setSyncState("saving");
    try {
      const response = await fetch(`/api/admin/schedule?week=${weekKey}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error("Shared schedule reset failed");
      window.location.reload();
    } catch {
      setAdminClasses(lastSharedClasses.current);
      setSyncState("error");
    }
  };

  const updateDailyClass = (id: string, patch: { name?: string; teachers?: string[]; timeLabel?: string }) => {
    applyChange(adminClasses.map((classItem) => classItem.id === id ? { ...classItem, ...patch } : classItem));
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setEventImages(JSON.parse(saved));
      const savedPositions = window.localStorage.getItem(eventPositionsKey);
      if (savedPositions) setEventImagePositions(JSON.parse(savedPositions));
      const savedTitle = window.localStorage.getItem(eventTitleKey);
      if (savedTitle) setWeeklyEventsTitle(savedTitle);
    } catch {
      setEventImages({});
    }
  }, [storageKey, eventPositionsKey, eventTitleKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(eventImages));
      window.localStorage.setItem(eventPositionsKey, JSON.stringify(eventImagePositions));
      window.localStorage.setItem(eventTitleKey, weeklyEventsTitle);
    } catch {
      // Image selections are still available until the current page is closed.
    }
  }, [eventImages, eventImagePositions, weeklyEventsTitle, storageKey, eventPositionsKey, eventTitleKey]);

  const updateWeeklyEvent = (id: string, patch: { name?: string; teachers?: string[]; tag?: ClassItem["tag"] }) => {
    applyChange(adminClasses.map((classItem) => classItem.id === id ? { ...classItem, ...patch } : classItem));
  };

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
        <button
          type="button"
          className="stories-tab"
          data-active={tab === "library"}
          onClick={() => setTab("library")}
        >
          Story library
        </button>
      </div>

      {tab === "schedule" ? (
        <AdminScheduleEditor classes={adminClasses} onChange={applyChange} onReset={resetAdminClasses} syncState={syncState} />
      ) : tab === "library" ? (
        <StoryLibrary />
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
                  weekLabel={weekRangeLabel(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"], week, TZ)}
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
          <div className="daily-edit-head">
            <p className="stories-panel-label">Tomorrow · {titleCase(dailyDay)}</p>
            <button type="button" className="story-edit-link" onClick={() => setDailyEditing((editing) => !editing)}>{dailyEditing ? "Done editing" : "Edit in canvas"}</button>
          </div>
          {dailyEditing && <p className="stories-source-note" role="status">Click a class name, teacher, or time in the story, then click outside the text to save it for everyone.</p>}

          {!momenceAvailable && (
            <p className="stories-source-note" role="status">
              Momence is temporarily unavailable. Try refreshing before downloading.
            </p>
          )}

          <div className="stories-grid">
            <div>
              <p className="stories-panel-label">Outdoor Shala</p>
              <button type="button" className="story-edit-link" onClick={() => setTab("schedule")}>Edit schedule</button>
              <StoryCanvas filename={`tomorrow-${dailyDay.toLowerCase()}-outdoor-shala.png`} label="Outdoor Shala">
                <DailyStoryTemplate
                  day={dailyDay}
                  dateLabel={dateLabel}
                  shalaLabel="Outdoor Shala"
                  classes={outdoor}
                  bgSrc="/stories/outdoor-shala.jpg"
                  editable={dailyEditing}
                  onClassChange={updateDailyClass}
                />
              </StoryCanvas>
            </div>

            <div>
              <p className="stories-panel-label">Indoor Shala</p>
              <button type="button" className="story-edit-link" onClick={() => setTab("schedule")}>Edit schedule</button>
              <StoryCanvas filename={`tomorrow-${dailyDay.toLowerCase()}-indoor-shala.png`} label="Indoor Shala">
                <DailyStoryTemplate
                  day={dailyDay}
                  dateLabel={dateLabel}
                  shalaLabel="Indoor Shala"
                  classes={indoor}
                  bgSrc="/stories/indoor-shala.jpg"
                  editable={dailyEditing}
                  onClassChange={updateDailyClass}
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
              <p>Click <strong>Edit in canvas</strong> to edit the poster text or drag an image vertically to choose its crop. Image uploads are also shared with the Weekly Posts Carousel.</p>
              <button type="button" className="story-edit-link" onClick={() => setWeeklyEventsEditing((editing) => !editing)}>{weeklyEventsEditing ? "Done editing" : "Edit in canvas"}</button>
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
                  editable={weeklyEventsEditing}
                  eventImagePositions={eventImagePositions}
                  onEventImagePositionChange={(id, position) => setEventImagePositions((current) => ({ ...current, [id]: position }))}
                  onEventChange={updateWeeklyEvent}
                  headerTitle={weeklyEventsTitle}
                  onHeaderTitleChange={setWeeklyEventsTitle}
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
