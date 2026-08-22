"use client";

import { useState } from "react";
import { DAYS, SPACES, type ClassItem, type Day, type Space } from "@/lib/types";
import { titleCase } from "@/lib/stories";

type EditorProps = {
  classes: ClassItem[];
  onChange: (classes: ClassItem[]) => void;
  onReset: () => void;
  syncState: "saved" | "saving" | "error";
};

function minutesFromTime(value: string | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.trim().split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function inputTime(value: string, position: 0 | 1) {
  return value.split(" – ")[position] ?? "";
}

function newClass(day: Day): ClassItem {
  return {
    id: `admin-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    day,
    space: "INDOOR",
    name: "New class",
    teachers: [],
    start: null,
    end: null,
    timeLabel: "",
    note: "",
    needsCover: false,
    tag: null,
  };
}

export function AdminScheduleEditor({ classes, onChange, onReset, syncState }: EditorProps) {
  const [editing, setEditing] = useState<ClassItem | null>(null);

  const save = () => {
    if (!editing) return;
    const startText = inputTime(editing.timeLabel, 0);
    const endText = inputTime(editing.timeLabel, 1);
    const clean = {
      ...editing,
      name: editing.name.trim() || "Untitled class",
      teachers: editing.teachers.map((teacher) => teacher.trim()).filter(Boolean),
      start: minutesFromTime(startText),
      end: minutesFromTime(endText),
      timeLabel: startText && endText ? `${startText} – ${endText}` : "",
    };
    onChange(classes.some((item) => item.id === clean.id) ? classes.map((item) => (item.id === clean.id ? clean : item)) : [...classes, clean]);
    setEditing(null);
  };

  const remove = (id: string) => {
    onChange(classes.filter((item) => item.id !== id));
    if (editing?.id === id) setEditing(null);
  };

  return (
    <section className="admin-schedule" aria-labelledby="admin-schedule-title">
      <div className="admin-schedule-head">
        <div>
          <p className="stories-panel-label">Admin only</p>
          <h2 id="admin-schedule-title">Weekly schedule</h2>
          <p>Make a cover change, edit a class, or add a one-off class. Saved changes update the shared schedule for everyone using the portal link; your Google Sheet is unchanged.</p>
          <p className="stories-source-note" role="status">{syncState === "saving" ? "Saving shared schedule…" : syncState === "error" ? "Could not save the shared schedule. Your change was not published." : "Shared schedule is up to date."}</p>
        </div>
        <button className="admin-reset" type="button" onClick={onReset}>Reset to sheet</button>
      </div>

      <div className="admin-schedule-grid">
        {DAYS.map((day) => {
          const dayClasses = classes.filter((item) => item.day === day).sort((a, b) => (a.start ?? 1e6) - (b.start ?? 1e6));
          return (
            <section className="admin-schedule-day" key={day}>
              <header>
                <h3>{titleCase(day)}</h3>
                <span>{String(dayClasses.length).padStart(2, "0")}</span>
              </header>
              <div className="admin-schedule-list">
                {dayClasses.map((item) => (
                  <article className="admin-schedule-item" key={item.id} data-cover={item.needsCover}>
                    <div className="admin-schedule-time">{item.timeLabel || "TBC"}</div>
                    <div className="admin-schedule-copy">
                      <div className="admin-schedule-name-row">
                        <strong>{item.name}</strong>
                        {item.tag && <b data-tag={item.tag}>{item.tag === "EVENT" ? "E" : "W"}</b>}
                      </div>
                      <span>{item.teachers.join(" · ") || "Teacher to confirm"}</span>
                      <small>{item.space}{item.needsCover ? " · Cover needed" : ""}</small>
                    </div>
                    <button type="button" onClick={() => setEditing({ ...item })}>Edit</button>
                  </article>
                ))}
              </div>
              <button className="admin-add-class" type="button" onClick={() => setEditing(newClass(day))}>+ Add class</button>
            </section>
          );
        })}
      </div>

      {editing && (
        <div className="admin-edit-backdrop" role="presentation" onMouseDown={() => setEditing(null)}>
          <form className="admin-edit-form" onSubmit={(event) => { event.preventDefault(); save(); }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-edit-title"><h3>Edit class</h3><button type="button" onClick={() => setEditing(null)}>×</button></div>
            <label>Class title<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
            <label>Teachers <input value={editing.teachers.join(", ")} placeholder="Names separated by commas" onChange={(event) => setEditing({ ...editing, teachers: event.target.value.split(",") })} /></label>
            <div className="admin-edit-row">
              <label>Day<select value={editing.day} onChange={(event) => setEditing({ ...editing, day: event.target.value as Day })}>{DAYS.map((day) => <option key={day} value={day}>{titleCase(day)}</option>)}</select></label>
              <label>Space<select value={editing.space} onChange={(event) => setEditing({ ...editing, space: event.target.value as Space })}>{SPACES.map((space) => <option key={space} value={space}>{space}</option>)}</select></label>
            </div>
            <div className="admin-edit-row">
              <label>Start<input type="time" value={inputTime(editing.timeLabel, 0)} onChange={(event) => setEditing({ ...editing, timeLabel: `${event.target.value} – ${inputTime(editing.timeLabel, 1)}` })} /></label>
              <label>End<input type="time" value={inputTime(editing.timeLabel, 1)} onChange={(event) => setEditing({ ...editing, timeLabel: `${inputTime(editing.timeLabel, 0)} – ${event.target.value}` })} /></label>
            </div>
            <label>Type<select value={editing.tag ?? ""} onChange={(event) => setEditing({ ...editing, tag: (event.target.value || null) as ClassItem["tag"] })}><option value="">Regular class</option><option value="EVENT">Event (E)</option><option value="WORKSHOP">Workshop (W)</option></select></label>
            <label>Note<input value={editing.note} onChange={(event) => setEditing({ ...editing, note: event.target.value })} /></label>
            <label className="admin-cover-toggle"><input type="checkbox" checked={editing.needsCover} onChange={(event) => setEditing({ ...editing, needsCover: event.target.checked })} /> Teacher cover needed</label>
            <div className="admin-edit-actions">
              <button className="admin-delete" type="button" onClick={() => remove(editing.id)}>Remove class</button>
              <span />
              <button className="admin-cancel" type="button" onClick={() => setEditing(null)}>Cancel</button>
              <button className="admin-save" type="submit">Save change</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
