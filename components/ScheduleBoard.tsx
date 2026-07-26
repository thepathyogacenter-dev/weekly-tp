"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarStack } from "./Avatar";
import { DAYS, SPACES, type ClassItem, type Day, type SchedulePayload } from "@/lib/types";

const TZ = "Asia/Makassar"; // WITA — Bali

interface Now {
  day: Day;
  minutes: number;
}

function readNow(): Now {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    day: get("weekday").toUpperCase() as Day,
    minutes: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10),
  };
}

export function ScheduleBoard({
  data,
  revalidateSeconds,
}: {
  data: SchedulePayload;
  revalidateSeconds: number;
}) {
  const router = useRouter();
  const [now, setNow] = useState<Now | null>(null);
  const [day, setDay] = useState<string>("ALL");
  const [space, setSpace] = useState<string>("ALL");
  const [teacher, setTeacher] = useState<string>("ALL");
  const [query, setQuery] = useState("");

  // Dihitung setelah mount supaya nggak bentrok dengan HTML dari server.
  useEffect(() => {
    setNow(readNow());
    const id = setInterval(() => setNow(readNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Re-fetch the server-rendered data on the studio's cadence so an
  // open tab (e.g. a kiosk display) picks up Sheet edits without a manual reload.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), revalidateSeconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, revalidateSeconds]);

  const teachers = useMemo(() => {
    const set = new Set<string>();
    data.classes.forEach((c) => c.teachers.forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data.classes]);

  const dayOptions = useMemo(
    () => [
      { value: "ALL", label: "All" },
      { value: "TODAY", label: "Today" },
      ...DAYS.map((d) => ({ value: d, label: d.charAt(0) + d.slice(1).toLowerCase() })),
    ],
    []
  );

  const spaceOptions = useMemo(
    () => [{ value: "ALL", label: "All" }, ...SPACES.map((s) => ({ value: s, label: s }))],
    []
  );

  const teacherOptions = useMemo(
    () => [{ value: "ALL", label: "All" }, ...teachers.map((t) => ({ value: t, label: t }))],
    [teachers]
  );

  const activeDay = day === "TODAY" ? (now?.day ?? "ALL") : day;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.classes.filter((c) => {
      if (activeDay !== "ALL" && c.day !== activeDay) return false;
      if (space !== "ALL" && c.space !== space) return false;
      if (teacher !== "ALL" && !c.teachers.includes(teacher)) return false;
      if (q) {
        const hay = `${c.name} ${c.teachers.join(" ")} ${c.space}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.classes, activeDay, space, teacher, query]);

  const byDay = useMemo(() => {
    return DAYS.map((d) => ({
      day: d,
      items: filtered
        .filter((c) => c.day === d)
        .sort((a, b) => (a.start ?? 1e6) - (b.start ?? 1e6)),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const isLive = (c: ClassItem) =>
    !!now &&
    !c.needsCover &&
    c.day === now.day &&
    c.start !== null &&
    c.start <= now.minutes &&
    (c.end ?? c.start + 60) > now.minutes;

  const dirty = day !== "ALL" || space !== "ALL" || teacher !== "ALL" || query !== "";

  const reset = () => {
    setDay("ALL");
    setSpace("ALL");
    setTeacher("ALL");
    setQuery("");
  };

  return (
    <>
      <div className="filters">
        <div className="filter-row filter-row--dropdowns">
          <div className="filter-item">
            <span className="filter-label" data-active={day !== "ALL"}>
              Day
            </span>
            <Dropdown
              label="Filter by day"
              value={day}
              options={dayOptions}
              active={day !== "ALL"}
              accent={day === "TODAY"}
              onChange={setDay}
            />
          </div>

          <div className="filter-item">
            <span className="filter-label" data-active={space !== "ALL"}>
              Space
            </span>
            <Dropdown
              label="Filter by space"
              value={space}
              options={spaceOptions}
              active={space !== "ALL"}
              onChange={setSpace}
            />
          </div>

          <div className="filter-item">
            <span className="filter-label" data-active={teacher !== "ALL"}>
              Teacher
            </span>
            <Dropdown
              label="Filter by teacher"
              value={teacher}
              options={teacherOptions}
              active={teacher !== "ALL"}
              columns={3}
              onChange={setTeacher}
            />
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">Find</span>
          <input
            className="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Class, teacher"
            suppressHydrationWarning={true}
            aria-label="Search classes"
          />
          <div className="filter-meta">
            <span className="count">
              {filtered.length} {filtered.length === 1 ? "class" : "classes"}
            </span>
            {dirty && (
              <button className="reset" type="button" onClick={reset}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="board" data-single={byDay.length === 1}>
        {byDay.length === 0 && <p className="empty">Nothing matches those filters</p>}

        {byDay.map(({ day: d, items }) => (
          <section className="column" key={d}>
            <header className="column-head">
              <h2 className="column-day" data-today={now?.day === d}>
                {d}
              </h2>
              <span className="column-tally">{String(items.length).padStart(2, "0")}</span>
            </header>

            {items.map((c) => (
              <article className="entry" key={c.id} data-cover={c.needsCover} data-live={isLive(c)}>
                <div className="rail">
                  {c.timeLabel ? (
                    <>
                      <span>{c.timeLabel.split(" – ")[0]}</span>
                      <span className="rail-end">{c.timeLabel.split(" – ")[1] ?? ""}</span>
                    </>
                  ) : (
                    <span className="rail-note">TBC</span>
                  )}
                </div>

                <div className="entry-body">
                  <AvatarStack teachers={c.teachers} photos={data.teacherPhotos} />
                  <div className="entry-text">
                    <h3 className="class-name">{c.name}</h3>
                    <p className="class-meta">
                      {c.teachers.length > 0 && (
                        <>
                          {c.teachers.join(" · ")}
                          <span className="sep">/</span>
                        </>
                      )}
                      <span className="space-tag" data-space={c.space}>
                        {c.space}
                      </span>
                    </p>
                    {c.tag && <span className="flag" data-tag={c.tag}>{c.tag === "EVENT" ? "Event" : "Workshop"}</span>}
                    {c.needsCover && <span className="flag">Cover needed</span>}
                    {c.note && <span className="flag">{c.note}</span>}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

interface DropdownOption {
  value: string;
  label: string;
}

function Dropdown({
  label,
  value,
  options,
  active,
  accent,
  columns = 1,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  active: boolean;
  accent?: boolean;
  columns?: number;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className="dropdown-wrap" data-active={active} data-accent={!!accent} ref={wrapRef}>
      <button
        type="button"
        className="dropdown"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dropdown-value">{current?.label ?? value}</span>
        <svg className="dropdown-arrow" data-open={open} viewBox="0 0 10 6" aria-hidden="true">
          <path
            d="M1 1L5 5L9 1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="dropdown-panel" data-columns={columns} role="listbox" aria-label={label}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              data-selected={o.value === value}
              className="dropdown-option"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
