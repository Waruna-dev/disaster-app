# FloodGuard Administrator Dashboard

This document describes the admin dashboard module added to the FloodGuard
project. It was built as an **isolated addition** — no existing
resident/volunteer files were rewritten or deleted; where a shared file
(`server.js`, `App.jsx`, `Home.jsx`, `Report.js`, `reportRoutes.js`,
`reportController.js`, `upload.js`) needed a small additive change to wire the
new features in, that change is called out below.

## What's included

- **Admin Login** (`/admin/login`) — fixed credentials `admin@gmail.com` /
  `admin123` (overridable via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars),
  issuing a scoped JWT (`role: "admin"`).
- **Summary Dashboard** (`/admin/summary`) — live counts for active disasters,
  pending/approved/rejected reports, and an approve-vs-reject pie + bar chart.
  "Affected Residents", "Available Volunteers" and "Active Tasks" are shown as
  placeholders (`—`) since those depend on Volunteer/Task modules that don't
  exist yet in this codebase.
- **Pending Reports** (`/admin/pending-reports`) — reports grouped by severity
  (Low/Medium/High) as cards with photo/video, disaster type, location, time,
  and reporter name. Clicking a card opens a modal with full details, a
  Report ID, and Approve / Reject (with a required rejection reason) actions.
  Reviewed reports appear in a table below with an "Update" button to reopen
  the modal. A **Report Generate** button produces a downloadable PDF with a
  FloodGuard-branded header, counts, approve/reject charts (overall + 7-day
  daily analysis), a full data table, an analysis summary, and a signature
  block.
- **Create Announcements** (`/admin/announcements`) — form with title, image
  drag-and-drop, English message, an auto-translate button for Sinhala/Tamil
  drafts, and multi-select province/district targeting (districts filter
  based on selected provinces). Announcements list as cards with Update and
  Delete actions. Published announcements also appear in a new
  "Latest Announcements" section on the public Home page.
- Sidebar navigation lists all six admin modules from the spec; **Disaster
  Monitoring Map, Volunteer Management, and Volunteer Task Management** are
  intentionally left as "coming soon" placeholders per your instructions,
  since those belong to other team members.

## Backend changes

All backend changes are additive (new fields/functions/routes) unless noted.

| File | Change |
|---|---|
| `models/Report.js` | Added `locationName`, `reportedByName`, `severity`, `approvalStatus`, `rejectReason`, `reviewedAt` fields. Extended `incidentType` enum with `landslide` and `heavy-rain`. Existing fields untouched. |
| `controllers/reportController.js` | Added `approveReport`, `rejectReport`, `getAdminSummary`. `createReport` now also accepts the new optional fields. |
| `routes/reportRoutes.js` | Added `GET /admin/summary`, `PATCH /:id/approve`, `PATCH /:id/reject` (all behind `protectAdmin`). |
| `middleware/upload.js` | Added `uploadAnnouncementImage` (single image upload) alongside the existing report-upload config. |
| `server.js` | Two new lines mounting `/api/admin` and `/api/announcements`. |
| `models/Announcement.js` | **New file.** |
| `controllers/announcementController.js` | **New file.** CRUD + `previewTranslation`. |
| `routes/announcementRoutes.js` | **New file.** |
| `controllers/adminAuthController.js` | **New file.** Fixed-credential admin login. |
| `middleware/adminAuth.js` | **New file.** JWT guard for admin-only routes. |
| `utils/translate.js` | **New file.** Offline dictionary-based EN→SI/TA translator (see limitation below). |

## Frontend changes

- New self-contained module: `frontend/src/admin/` (context, API client, pages,
  components, utils). Uses its own `AdminAuthContext` and `adminToken` in
  localStorage, entirely separate from the resident/volunteer `AuthContext`.
- `App.jsx` — added an `/admin/*` route tree (additive; existing routes
  untouched).
- `Home.jsx` — added one import and one `<AnnouncementsSection />` insertion
  to show published announcements.
- `package.json` — added `recharts`, `jspdf`, `jspdf-autotable` (all resolved
  and verified with `npm run build`).
- New asset: `src/assets/floodguard-logo.png` (used in the generated PDF
  header).

## Known limitations / things to double-check

1. **Translation is offline and best-effort.** There's no reachable
   translation API in this environment, so `utils/translate.js` uses a small
   hand-built disaster-vocabulary dictionary and literal word/phrase
   substitution — it is **not** a full machine translation. The admin UI
   always shows the Sinhala/Tamil fields as editable textareas so staff can
   correct the draft before publishing. Swap in Google Cloud Translate /
   Microsoft Translator later by replacing the body of `translateText()` —
   the function signature won't need to change.
2. **"Affected Residents", "Available Volunteers", "Active Tasks"** on the
   Summary dashboard show `—` because there's no Volunteer/Task model in this
   codebase yet. Once a teammate adds those models, wire real counts into
   `getAdminSummary` in `reportController.js`.
3. **Reports need admin-relevant fields to be submitted from the resident
   app** (`locationName`, `reportedByName`, `severity`) for the cards/table to
   show meaningful data — the resident `SubmitReport` form wasn't modified
   (per your instructions), so these fields currently only populate if a
   client sends them in the `POST /api/reports` body. If they're omitted, the
   report still saves with sensible defaults (`severity: "medium"`,
   `reportedByName: "Anonymous Resident"`).
4. **Security:** rotate the MongoDB Atlas credentials that were shared in
   plain text before deploying, and change `JWT_SECRET` / `ADMIN_PASSWORD` for
   any real deployment.
5. **Testing performed:** all backend files pass `node --check`; the frontend
   was installed (`npm install`) and successfully built (`npm run build`)
   with no errors. Full end-to-end testing against a live MongoDB instance
   was not possible in this environment (no network access to MongoDB Atlas),
   so please test the approve/reject/announcement flows against your own
   database before presenting/submitting.
