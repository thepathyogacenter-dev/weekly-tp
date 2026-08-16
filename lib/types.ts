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
  /** sel diawali "MIA -" di Sheet */
  needsCover: boolean;
  /** dari tab "Tags" opsional, dicocokkan lewat day + nama kelas */
  tag: "EVENT" | "WORKSHOP" | null;
}

export interface SchedulePayload {
  classes: ClassItem[];
  teacherPhotos: Record<string, string>;
  /** Optional background for the weekly social download, selected by Monday date. */
  weeklyBackgroundImage: string | null;
  source: "momence" | "sheet" | "fallback";
  fetchedAt: string;
}
