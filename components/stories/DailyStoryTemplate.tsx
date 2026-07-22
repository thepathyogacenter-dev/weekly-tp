import type { ClassItem } from "@/lib/types";
import { groupByPeriod, storyTimeRange, titleCase } from "@/lib/stories";

const PERIOD_LABEL: Record<string, string> = { AM: "AM", NOON: "NOON", PM: "PM" };

const TAG_ICON: Record<string, string> = {
  EVENT: "/stories/icon-event.png",
  WORKSHOP: "/stories/icon-workshop.png",
};

export function DailyStoryTemplate({
  day,
  dateLabel,
  shalaLabel,
  classes,
  bgSrc,
}: {
  day: string;
  dateLabel: string;
  shalaLabel: string;
  classes: ClassItem[];
  bgSrc: string;
}) {
  const periods = groupByPeriod(classes);
  const entries = (["AM", "NOON", "PM"] as const).filter((p) => periods[p].length > 0);

  return (
    <>
      <div className="story-wash" />
      <img
        className="story-bg"
        src={bgSrc}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="story-tint-gradient" />
      <div className="story-tint-dark" />
      <div className="story-content">
        <img
          className="story-logo"
          src="/stories/logo.png"
          alt="The Path"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        <div className="story-header">
          <h1 className="story-h1">Daily Schedule</h1>
          <div className="story-date">
            {titleCase(day)} · {dateLabel}
          </div>
        </div>

        <div className="story-body">
          <div className="story-shala-heading">{shalaLabel}</div>

          {entries.length === 0 ? (
            <div className="story-glass-card">
              <div className="story-entry-meta">No classes scheduled today</div>
            </div>
          ) : (
            <div className="story-timeline">
              {entries.map((period) => (
                <div className="story-period-row" key={period}>
                  <div className="story-period-label">{PERIOD_LABEL[period]}</div>
                  <div className="story-glass-card">
                    {periods[period].map((c) => (
                      <div className="story-entry" key={c.id}>
                        <div className="story-entry-top">
                          <div className="story-entry-name">{c.name}</div>
                          {c.tag && (
                            <div className="story-tag-badge" title={c.tag}>
                              <span>{c.tag.charAt(0)}</span>
                              <img
                                src={TAG_ICON[c.tag]}
                                alt={c.tag}
                                onLoad={(e) => {
                                  const letter = e.currentTarget.previousElementSibling as HTMLElement | null;
                                  if (letter) letter.style.display = "none";
                                }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="story-entry-meta">
                          {storyTimeRange(c) && <span>[ {storyTimeRange(c)} ]</span>}
                          {c.teachers.length > 0 && (
                            <>
                              <span>·</span>
                              <span>{c.teachers.join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="story-footer">Book online or pay in person</div>
      </div>
    </>
  );
}
