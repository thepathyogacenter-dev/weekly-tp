# The Path — Weekly Schedule

Next.js 15 (App Router, TypeScript, zero runtime dependencies beyond React/Next).
Reads the studio's Google Sheet in its existing matrix layout — no restructuring needed.

## Run it

```bash
npm install
cp .env.example .env.local   # isi SCHEDULE_CSV_URL
npm run dev
```

Without `SCHEDULE_CSV_URL` it renders the local snapshot in `lib/fallback.ts`, so it
works out of the box.

## Connect the Sheet

1. Google Sheets → File → Share → **Publish to web**
2. Pick the **Fix Schedule** tab, format **CSV**
3. Paste the link into `SCHEDULE_CSV_URL`

The fetch happens on the server (`lib/schedule.ts`), so there's no CORS issue and the
cache is yours: `REVALIDATE = 300` seconds. Lower it if the studio edits often.

If the Sheet is unreachable at request time the page silently falls back to the local
snapshot rather than showing an error. The footer tells you which source is live.

## Teacher photos

Two options, photos win over initials:

**A. In code** — `lib/fallback.ts` → `TEACHER_PHOTOS`. Keys must match the Sheet exactly.

**B. From a Sheet tab** — make a tab with columns `Name` and `Photo` (Photo = image URL,
e.g. a Webflow asset), publish as CSV, set `TEACHERS_CSV_URL`.

No photo → circle with the teacher's initials.

## Weekly bulletin background image

Add a tab named **Weekly Images** to the same Google Sheet. Use these exact headers in row 1:

| Week Start | Background Image URL |
|---|---|
| `2026-08-10` | `https://your-image-host.com/the-path-weekly-10-aug.jpg` |

Add one row per Monday. The weekly social download automatically uses the matching image
for that Monday–Sunday schedule. Use a public direct image URL (JPG, PNG, or WebP) that
allows cross-origin loading; if there is no matching row, it uses the existing Path image.

## Admin access

The `/stories` admin dashboard is password-protected. Add these values to `.env.local` before
using it in production:

```bash
ADMIN_PASSWORD=your-strong-admin-password
ADMIN_SESSION_SECRET=your-long-random-session-secret
```

Keep both values private. The `/teachers` portal remains accessible to teachers without the
admin password.

## Embed in Webflow

Deploy, then drop an Embed element on the page:

```html
<iframe
  src="https://schedule.thepath.com"
  title="Weekly schedule"
  loading="lazy"
  style="width:100%;border:0;min-height:1400px"
></iframe>
```

Lock it down by editing `frame-ancestors` in `next.config.mjs`.

## Sheet format the parser expects

| Row | Contents |
|---|---|
| 1 | Day names, merged across three columns (`MONDAY`, `TUESDAY`, …) |
| 2 | `OUTDOOR` / `INDOOR` / `SHALA 3` under each day |
| 3+ | One class per cell: `Class Name. Teacher (7.15 - 8.15)` |

Cell conventions the parser understands:

- `MIA - Vinyasa. Theresa (…)` → renders dimmed with a **Cover needed** flag
- `A. Teacher1 / B. Teacher2 (…)` → two classes, two teachers, two avatars
- `Blissful Kirtan. Diana, Theresa, Helena (every 2nd week of the month)` → the
  parenthesis isn't a time, so it becomes a note and sorts last
- Multiple teachers split on `,` `/` `&`

## Known limitation: AM/PM

The Sheet writes `7.15` and `8.30` without AM/PM. Times 1–6 are treated as afternoon,
12 as noon, and 7–11 depend on row position — the first `MORNING_ROWS` (3) rows are
morning, everything below is evening. That's how `Men's Circle (7 - 8.30)` becomes
19:00–20:30.

Reorder the rows in the Sheet and the times break.

**Fix it properly:** write 24-hour times in the Sheet (`19.00 - 20.30`), then set
`MORNING_ROWS = 99` in `lib/parse.ts`. Five minutes of work, one class of bug gone.

## Files

```
app/page.tsx              server component, fetches + renders
app/api/schedule/route.ts JSON endpoint (same data, if you want it elsewhere)
app/globals.css           all styling, design tokens at the top
components/ScheduleBoard  filters + board (client)
components/Avatar.tsx     photo or initials
lib/parse.ts              matrix → class list, time parsing
lib/csv.ts                RFC 4180 parser, no dependency
lib/schedule.ts           fetch + fallback logic
lib/fallback.ts           local snapshot + photo map
```
