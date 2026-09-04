export const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const SPACES = ["OUTDOOR", "INDOOR", "SHALA 3"] as const;

export type Day = (typeof DAYS)[number];
export type Space = (typeof SPACES)[number];

export interface ClassItem {
  id: string;
  day: Day;
  space: Space;
  name: string;
  teachers: string[];
  /** minutes from midnight, null kalau sel nggak punya jam */
  start: number | null;
  end: number | null;
  /** "07:15 – 08:15" */
  timeLabel: string;
  /** teks dalam kurung yang bukan jam, misal "every 2nd week of the month" */
  note: string;
  /** manually marked as needing cover */
  needsCover: boolean;
  /** Momence-derived event or workshop marker */
  tag: "EVENT" | "WORKSHOP" | null;
}

export interface SchedulePayload {
  classes: ClassItem[];
  teacherPhotos: Record<string, string>;
  /** Optional background for the weekly social download, selected by Monday date. */
  weeklyBackgroundImage: string | null;
  source: "momence" | "fallback";
  fetchedAt: string;
}

export interface SharedStoryDesign {
  eventsTitle?: string;
  teacherTitle?: string;
  outdoorTitle?: string;
  indoorTitle?: string;
  eventImagePositions?: Record<string, number>;
}

export interface StoryLibraryItem {
  id: string;
  title: string;
  /** Training name used to group reusable story designs. */
  category?: string;
  image?: string;
  /** Hides a bundled design without deleting its public asset. */
  deleted?: boolean;
}
