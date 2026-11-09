"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type ClassItem, type Day, type SchedulePayload, type SharedStoryDesign } from "@/lib/types";
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
  dailyClasses,
  dailyWeekKey,
  dailyDay,
  dailyDate,
  momenceAvailable,
}: {
  data: SchedulePayload;
  dailyClasses: ClassItem[];
  dailyWeekKey: string;
  dailyDay: Day;
  dailyDate: string;
  momenceAvailable: boolean;
}) {
  const [tab, setTab] = useState<"daily" | "weekly" | "carousel" | "schedule" | "library">("daily");
  const [adminClasses, setAdminClasses] = useState<ClassItem[]>(data.classes);
  const [syncState, setSyncState] = useState<"saved" | "saving" | "error">("saved");
  const [dailyEditing, setDailyEditing] = useState(false);
  const [weeklyCanvasEditing, setWeeklyCanvasEditing] = useState(false);
  const [storyDesign, setStoryDesign] = useState<SharedStoryDesign>({});

  const week = useMemo(() => datesForWeek(TZ), []);
  const weekKey = week.MONDAY.toISOString().slice(0, 10);

  // Senin–Kamis & Minggu: Daily ikut Schedule Editor (adminClasses), sama seperti sebelumnya.
  // Jumat & Sabtu: editor sudah di minggu depan, Daily butuh minggu ini, jadi pakai state terpisah.
  const dailySeparate = dailyWeekKey !== weekKey;
  const [dailyOnly, setDailyOnly] = useState<ClassItem[]>(dailyClasses);
  const lastDailyShared = useRef<ClassItem[]>(dailyClasses);
  const dailySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dailySource = dailySeparate ? dailyOnly : adminClasses;

  const { outdoor, indoor } = useMemo(
    () => splitBySpace(classesForDay(dailySource, dailyDay)),
    [dailySource, dailyDay]
  );
  const dateLabel = formatDateLabel(new Date(dailyDate), TZ);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const designSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSharedClasses = useRef<ClassItem[]>(data.classes);
  const storyDesignRef = useRef<SharedStoryDesign>({});
  const lastSharedDesign = useRef<SharedStoryDesign>({});
  const savingRef = useRef(false);

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
  const [eventImages, setEventImages] = useState<Record<string, string>>({});

  useEffect(() => {
    lastSharedClasses.current = data.classes;
    setAdminClasses(data.classes);
  }, [data.classes]);

  // A user edit is published to the shared server store. The UI only keeps a
  // change when the server confirms it, so one browser cannot show unpublished data.
  const applyChange = (next: ClassItem[]) => {
    setAdminClasses(next);
    savingRef.current = true;
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
        savingRef.current = false;
        setSyncState("saved");
      } catch {
        setAdminClasses(lastSharedClasses.current);
        savingRef.current = false;
        setSyncState("error");
      }
    }, 600);
  };

  const resetAdminClasses = async () => {
    savingRef.current = true;
    setSyncState("saving");
    try {
      const response = await fetch(`/api/admin/schedule?week=${weekKey}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error("Shared schedule reset failed");
      savingRef.current = false;
      window.location.reload();
    } catch {
      setAdminClasses(lastSharedClasses.current);
      savingRef.current = false;
      setSyncState("error");
    }
  };

  const updateDailyClass = (id: string, patch: { name?: string; teachers?: string[]; timeLabel?: string }) => {
    const patchList = (list: ClassItem[]) =>
      list.map((classItem) => (classItem.id === id ? { ...classItem, ...patch } : classItem));

    // Daily di minggu yang sama dengan editor: simpan lewat jalur biasa.
    if (!dailySeparate) {
      applyChange(patchList(adminClasses));
      return;
    }

    // Jumat & Sabtu: simpan ke minggu Daily, bukan minggu editor.
    const next = patchList(dailyOnly);
    setDailyOnly(next);
    setSyncState("saving");
    if (dailySaveTimer.current) clearTimeout(dailySaveTimer.current);
    dailySaveTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/admin/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: dailyWeekKey, classes: next }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok) throw new Error("Daily save failed");
        lastDailyShared.current = next;
        setSyncState("saved");
      } catch {
        setDailyOnly(lastDailyShared.current);
        setSyncState("error");
      }
    }, 600);
  };

  // Keep already-open admin pages aligned with shared edits from another device.
  useEffect(() => {
    let active = true;
    const refreshSharedCanvas = async () => {
      // Tab tersembunyi atau sedang menyimpan: jangan poll.
      if (savingRef.current || document.hidden) return;
      try {
        const response = await fetch(`/api/admin/schedule?week=${weekKey}`, { cache: "no-store" });
        const result = await response.json();
        if (!active) return;
        // Update state hanya kalau datanya benar-benar berubah.
        if (
          Array.isArray(result?.classes) &&
          JSON.stringify(result.classes) !== JSON.stringify(lastSharedClasses.current)
        ) {
          lastSharedClasses.current = result.classes;
          setAdminClasses(result.classes);
        }
        if (
          result?.design &&
          typeof result.design === "object" &&
          JSON.stringify(result.design) !== JSON.stringify(lastSharedDesign.current)
        ) {
          storyDesignRef.current = result.design;
          lastSharedDesign.current = result.design;
          setStoryDesign(result.design);
        }
      } catch {
        // Retain the last confirmed shared version while offline.
      }
    };
    const onVisible = () => {
      if (!document.hidden) void refreshSharedCanvas();
    };
    void refreshSharedCanvas();
    const timer = window.setInterval(refreshSharedCanvas, 10_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [weekKey]);

  // Gambar event hanya di-fetch ulang kalau daftar event berubah, bukan tiap poll.
  const eventIdsKey = JSON.stringify(weeklyEvents.map((event) => event.id));
  useEffect(() => {
    let active = true;
    const ids: string[] = JSON.parse(eventIdsKey);
    Promise.all(ids.map(async (id) => {
      const response = await fetch(`/api/admin/story-image?week=${weekKey}&event=${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = response.ok ? await response.json() : null;
      return [id, result?.image] as const;
    })).then((items) => {
      if (!active) return;
      setEventImages(Object.fromEntries(items.filter(([, image]) => typeof image === "string")));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [weekKey, eventIdsKey]);


  const updateStoryDesign = (patch: Partial<SharedStoryDesign>) => {
    const next = { ...storyDesignRef.current, ...patch };
    storyDesignRef.current = next;
    setStoryDesign(next);
    savingRef.current = true;
    setSyncState("saving");
    if (designSaveTimer.current) clearTimeout(designSaveTimer.current);
    designSaveTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/admin/schedule", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: weekKey, design: next }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok) throw new Error("Shared story design save failed");
        lastSharedDesign.current = next;
        savingRef.current = false;
        setSyncState("saved");
      } catch {
        storyDesignRef.current = lastSharedDesign.current;
        setStoryDesign(lastSharedDesign.current);
        savingRef.current = false;
        setSyncState("error");
      }
    }, 450);
  };

  const updateWeeklyClass = (id: string, patch: { name?: string; teachers?: string[]; tag?: ClassItem["tag"]; timeLabel?: string }) => {
    applyChange(adminClasses.map((classItem) => classItem.id === id ? { ...classItem, ...patch } : classItem));
  };

  const prepareSharedStoryImage = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const source = new Image();
      source.onerror = () => reject(new Error("Could not prepare image"));
      source.onload = () => {
        let width = source.naturalWidth;
        let height = source.naturalHeight;
        const maxSide = 1080;
        if (Math.max(width, height) > maxSide) {
          const ratio = maxSide / Math.max(width, height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Could not prepare image"));
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(source, 0, 0, width, height);
        let quality = 0.84;
        let result = canvas.toDataURL("image/jpeg", quality);
        while (result.length > 600_000 && quality > 0.5) {
          quality -= 0.08;
          result = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(result);
      };
      source.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  const uploadEventImage = async (eventId: string, file: File | undefined) => {
    if (!file) return;
    savingRef.current = true;
    setSyncState("saving");
    try {
      const image = await prepareSharedStoryImage(file);
      const response = await fetch("/api/admin/story-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: weekKey, event: eventId, image }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error("Shared image save failed");
      setEventImages((current) => ({ ...current, [eventId]: image }));
      savingRef.current = false;
      setSyncState("saved");
    } catch {
      savingRef.current = false;
      setSyncState("error");
    }
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
              <p>Upload an image for each event. Every upload is shared across admins and used in the matching weekly story too.</p>
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
              <p>Click <strong>Edit all canvases</strong> to edit every weekly poster. Text and image crops are shared across every device automatically.</p>
              <button type="button" className="story-edit-link" onClick={() => setWeeklyCanvasEditing((editing) => !editing)}>{weeklyCanvasEditing ? "Done editing" : "Edit all canvases"}</button>
              {syncState !== "saved" && <p className="stories-source-note" role="status">{syncState === "saving" ? "Saving shared changes…" : "Could not save. Your last shared version was restored."}</p>}
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
                  editable={weeklyCanvasEditing}
                  eventImagePositions={storyDesign.eventImagePositions}
                  onEventImagePositionChange={(id, position) => updateStoryDesign({ eventImagePositions: { ...storyDesignRef.current.eventImagePositions, [id]: position } })}
                  onEventChange={updateWeeklyClass}
                  headerTitle={storyDesign.eventsTitle}
                  onHeaderTitleChange={(eventsTitle) => updateStoryDesign({ eventsTitle })}
                />
              </StoryCanvas>
            </div>
            <div>
            <p className="stories-panel-label">Teacher WhatsApp bulletin</p>
            <StoryCanvas filename="weekly-teacher-whatsapp-schedule.png" label="Teacher WhatsApp bulletin">
              <TeacherWeeklyTemplate classesByDay={classesByDay} week={week} editable={weeklyCanvasEditing} onClassChange={updateWeeklyClass} title={storyDesign.teacherTitle} onTitleChange={(teacherTitle) => updateStoryDesign({ teacherTitle })} />
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
                  editable={weeklyCanvasEditing}
                  onClassChange={updateWeeklyClass}
                  title={shala === "outdoor" ? storyDesign.outdoorTitle : storyDesign.indoorTitle}
                  onTitleChange={(title) => updateStoryDesign(shala === "outdoor" ? { outdoorTitle: title } : { indoorTitle: title })}
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
