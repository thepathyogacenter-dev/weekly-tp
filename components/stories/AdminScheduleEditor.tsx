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

export function AdminScheduleEditor({ classes, onChange, onReset }: EditorProps) {
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [day, setDay] = useState<Day>(() => {
    const today = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", weekday: "long" }).format(new Date()).toUpperCase() as Day;
    return DAYS.includes(today) ? today : "MONDAY";
  });
  const dayClasses = classes.filter((item) => item.day === day).sort((a, b) => (a.start ?? 1e6) - (b.start ?? 1e6));

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
      <div className="chip-tabs" role="tablist">
        {DAYS.map((d) => {
          const count = classes.filter((item) => item.day === d).length;
          return (
            <button key={d} type="button" role="tab" aria-selected={day === d} data-active={day === d} onClick={() => setDay(d)}>
              {titleCase(d).slice(0, 3)}
              <small className="sched-count">{count}</small>
            </button>
          );
        })}
      </div>

      <div className="sched-list">
        {dayClasses.length === 0 && <p className="sched-empty">No classes on {titleCase(day)}.</p>}
        {dayClasses.map((item) => {
          const [start, end] = (item.timeLabel || "TBC").split(" – ");
          return (
            <button type="button" className="sched-row" key={item.id} data-cover={item.needsCover} onClick={() => setEditing({ ...item })}>
              <span className="sched-time">
                {start}
                {end && <small>{end}</small>}
              </span>
              <span className="sched-copy">
                <strong>
                  {item.name}
                  {item.tag && <b>{item.tag === "EVENT" ? "E" : "W"}</b>}
                </strong>
                <small>
                  <i data-space={item.space} aria-hidden="true" />
                  {[item.teachers.join(", ") || "Teacher to confirm", titleCase(item.space)].join(" · ")}
                  {item.needsCover && <em> · Cover needed</em>}
                </small>
              </span>
              <span className="sched-chev" aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>

      <div className="sched-actions">
        <button className="sched-add" type="button" onClick={() => setEditing(newClass(day))}>+ Add class</button>
        <button
          className="sched-reset"
          type="button"
          onClick={() => {
            if (window.confirm("Restore this week from Momence? All manual edits for this week will be removed.")) onReset();
          }}
        >
          Restore from Momence
        </button>
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
