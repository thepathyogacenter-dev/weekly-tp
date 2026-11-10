"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type ClassItem, type Day, type SchedulePayload, type SharedStoryDesign } from "@/lib/types";
import {
  classesForDay,
  datesForWeek,
  formatDateLabel,
  splitBySpace,
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

type TabId = "daily" | "weekly" | "carousel" | "schedule" | "library";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "daily", label: "Daily", icon: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" /></> },
  { id: "weekly", label: "Weekly", icon: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></> },
  { id: "carousel", label: "Carousel", icon: <><rect x="7" y="4" width="10" height="16" rx="1.5" /><path d="M3 6v12M21 6v12" /></> },
  { id: "schedule", label: "Schedule", icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
  { id: "library", label: "Library", icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> },
];

function ChipTabs<T extends string>({ items, value, onChange }: { items: { id: T; label: string; badge?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="chip-tabs" role="tablist">
      {items.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={value === item.id} data-active={value === item.id} onClick={() => onChange(item.id)}>
          {item.label}
          {item.badge ? <i>{item.badge}</i> : null}
        </button>
      ))}
    </div>
  );
}

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
  const [tab, setTab] = useState<TabId>("daily");
  const [adminClasses, setAdminClasses] = useState<ClassItem[]>(data.classes);
  const [syncState, setSyncState] = useState<"saved" | "saving" | "error">("saved");
  const [dailyEditing, setDailyEditing] = useState(false);
  const [weeklyCanvasEditing, setWeeklyCanvasEditing] = useState(false);
  const [subView, setSubView] = useState<"posts" | "photos">("posts");
  const [dailyView, setDailyView] = useState<"outdoor" | "indoor">("outdoor");
  const [weeklyView, setWeeklyView] = useState<"events" | "outdoor" | "indoor" | "teachers" | "photos">("events");
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
  const tomorrowShort = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(dailyDate));
  const weekLabel = weekRangeLabel(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"], week, TZ);
  const tabContext =
    tab === "daily" ? `Tomorrow · ${tomorrowShort}` : tab === "library" ? "Ready-made designs" : weekLabel;
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
  const eventIdsKey = JSON.stringify(weeklyEvents.map((event) => [event.id, event.name]));
  useEffect(() => {
    let active = true;
    const pairs: [string, string][] = JSON.parse(eventIdsKey);
    Promise.all(pairs.map(async ([id, name]) => {
      const response = await fetch(`/api/admin/story-image?week=${weekKey}&event=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`, { cache: "no-store" });
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
        body: JSON.stringify({
          week: weekKey,
          event: eventId,
          name: weeklyEvents.find((event) => event.id === eventId)?.name ?? "",
          image,
        }),
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

  const photosDone = weeklyEvents.filter((event) => eventImages[event.id]).length;
  const photosMissing = weeklyEvents.length - photosDone;

  const subTabs = (
    <ChipTabs
      items={[
        { id: "posts", label: "Posts" },
        { id: "photos", label: "Event photos", badge: photosMissing },
      ]}
      value={subView}
      onChange={setSubView}
    />
  );

  const photosPanel = (
    <section className="event-photos" aria-label="Event photos">
      <p className="event-photos-summary">
        <b>{photosDone} of {weeklyEvents.length}</b> events have a photo. Photos are shared by the carousel and the weekly story, and reused next week for events with the same name.
      </p>
      {weeklyEvents.length === 0 && <p className="stories-source-note">No workshops or events this week.</p>}
      <ul className="event-photo-list">
        {weeklyEvents.map((event) => {
          const image = eventImages[event.id];
          const day = event.day.charAt(0) + event.day.slice(1, 3).toLowerCase();
          const time = event.timeLabel.split(" – ")[0];
          return (
            <li key={event.id}>
              <label className="event-photo-card">
                <span className="event-photo-thumb" style={image ? { backgroundImage: `url(${image})` } : undefined} aria-hidden="true">
                  {image ? null : "+"}
                </span>
                <span className="event-photo-copy">
                  <strong>{event.name}</strong>
                  <small>{[day, time, event.teachers.join(", ")].filter(Boolean).join(" · ")}</small>
                  <em data-ok={Boolean(image)}>{image ? "Photo set" : "Using default"}</em>
                </span>
                <span className="event-photo-action" data-primary={!image}>{image ? "Change" : "Upload"}</span>
                <input
                  className="event-photo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = "";
                    void uploadEventImage(event.id, file);
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <main className="stories-shell">
      <header className="app-bar">
        <div className="app-bar-title">
          <p className="stories-eyebrow">The Path · Admin</p>
          <h1>{TABS.find((item) => item.id === tab)?.label}</h1>
          <small>{tabContext}</small>
        </div>
        <div className="app-bar-actions">
          <span className="sync-pill" data-state={syncState} role="status" aria-live="polite">
            <i aria-hidden="true" />
            {syncState === "saving" ? "Saving…" : syncState === "error" ? "Not saved" : "Saved"}
          </span>
          <a className="stories-back" href="/">Portal</a>
          <AdminLogoutButton />
        </div>
      </header>

      <nav className="app-tabs" aria-label="Sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="app-tab"
            data-active={tab === item.id}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => {
              setTab(item.id);
              window.scrollTo({ top: 0 });
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {tab === "schedule" ? (
        <AdminScheduleEditor classes={adminClasses} onChange={applyChange} onReset={resetAdminClasses} syncState={syncState} />
      ) : tab === "library" ? (
        <StoryLibrary />
      ) : tab === "carousel" ? (
        <>
          {subTabs}
          {subView === "photos" && photosPanel}
          <div className="carousel-download-bar" hidden={subView === "photos"}>
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
          <div className="stories-grid" hidden={subView === "photos"}>
            <div>
              <p className="stories-panel-label">Cover</p>
              <StoryCanvas filename="weekly-workshops-events-cover.png" label="Weekly posts carousel cover" width={1080} height={1350} canvasId="weekly-carousel-cover" hideActions>
                <CarouselCoverTemplate
                  weekLabel={weekRangeLabel(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"], week, TZ)}
                  image="/stories/weekly-posts-carousel-cover.jpg"
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
          <ChipTabs
            items={[
              { id: "outdoor", label: "Outdoor Shala" },
              { id: "indoor", label: "Indoor Shala" },
            ]}
            value={dailyView}
            onChange={setDailyView}
          />
          <div className="daily-edit-head">
            <button type="button" className="story-edit-link" onClick={() => setDailyEditing((editing) => !editing)}>{dailyEditing ? "Done editing" : "Edit in canvas"}</button>
          </div>
          {dailyEditing && <p className="stories-source-note" role="status">Click a class name, teacher, or time in the story, then click outside the text to save it for everyone.</p>}

          {!momenceAvailable && (
            <p className="stories-source-note" role="status">
              Momence is temporarily unavailable. Try refreshing before downloading.
            </p>
          )}

          <div className="stories-grid tabbed">
            <div hidden={dailyView !== "outdoor"}>
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

            <div hidden={dailyView !== "indoor"}>
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
          <ChipTabs
            items={[
              { id: "events", label: "Events" },
              { id: "outdoor", label: "Outdoor" },
              { id: "indoor", label: "Indoor" },
              { id: "teachers", label: "Teachers" },
              { id: "photos", label: "Photos", badge: photosMissing },
            ]}
            value={weeklyView}
            onChange={setWeeklyView}
          />
          {weeklyView === "photos" ? photosPanel : (
            <div className="sub-toolbar">
              <button type="button" className="story-edit-link" onClick={() => setWeeklyCanvasEditing((editing) => !editing)}>{weeklyCanvasEditing ? "Done editing" : "Edit all canvases"}</button>
            </div>
          )}

          <div className="stories-grid tabbed" hidden={weeklyView === "photos"}>
            <div hidden={weeklyView !== "events"}>
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
            <div hidden={weeklyView !== "teachers"}>
            <p className="stories-panel-label">Teacher WhatsApp bulletin</p>
            <StoryCanvas filename="weekly-teacher-whatsapp-schedule.png" label="Teacher WhatsApp bulletin">
              <TeacherWeeklyTemplate classesByDay={classesByDay} week={week} editable={weeklyCanvasEditing} onClassChange={updateWeeklyClass} title={storyDesign.teacherTitle} onTitleChange={(teacherTitle) => updateStoryDesign({ teacherTitle })} />
            </StoryCanvas>
            </div>
            {([
            { shala: "outdoor", label: "Outdoor Shala", filename: "weekly-outdoor-shala.png" },
            { shala: "indoor", label: "Indoor Shala", filename: "weekly-indoor-shala.png" },
          ] as const).map(({ shala, label, filename }) => (
            <div key={shala} hidden={weeklyView !== shala}>
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
