# District Officer Portal (web)

Standalone **React + TypeScript + Vite + Firebase** web app for District Officers of the
Smart Disaster Early-Warning System. It lives in its own folder and **does not modify or import
anything from `frontend/`** (the citizen mobile app). Both apps share the same Firebase project.

| Page | What it does |
|---|---|
| Dashboard | Stats, affected-areas map, recent alerts, ongoing activities, auto-generated tasks |
| Hazard Alerts | Publish / cancel / delete public warnings (shown to citizens in the mobile app) |
| Shelters | Search + filter + paginate, details + map, register / edit / remove, citizen shelter requests |
| Rescue Teams | Team management, assign to affected area, active missions, citizen rescue requests with status steps |
| Resources | Manage stock, record distribution (transactional stock deduction), history + CSV export |
| Reports | Pie / column / bar charts, tables, decision recommendations, **real PDF download** |
| Information Updated | Summary + timeline of the latest updates |
| Settings | Profile, change password, **Load Demo Data** |

Data is live (Firestore `onSnapshot`) — new citizen requests appear instantly and the sidebar badge updates.

## 1. Run it

Requirements: **Node.js 18+** (20 or 22 recommended).

```bash
cd disaster-app/officer-web
npm install
npm run dev          # opens http://localhost:5173
```

**Firebase keys:** nothing to configure if `disaster-app/frontend/.env` exists — it is read
automatically (the `EXPO_PUBLIC_FIREBASE_*` values). Otherwise copy `.env.example` to `.env`
and fill the `VITE_FIREBASE_*` values (Firebase Console → Project settings → Web app).
Restart `npm run dev` after changing env files.

## 2. One-time Firebase setup

1. **Rules** — open `firestore.rules.additions`, merge those blocks into `disaster-app/firestore.rules`, then
   `firebase deploy --only firestore:rules` (or paste into Firebase Console → Firestore → Rules → Publish).
2. **Officer account** — create/register a user, then in Firestore `users/{uid}` set `role` = `admin`.
3. Sign in at the login page. First time: **Settings → Load Demo Data**.

## 3. Try the full flow with the mobile app

1. Citizen (phone): request a shelter / rescue team.
2. Officer (web): Shelters → *Citizen Requests* (or Rescue Teams → *Citizen Requests*) → assign.
3. Citizen: pull to refresh *My Requests* → status updates (Pending → Assigned → On the way → Pickup → Completed).

## Build for deployment

```bash
npm run build        # outputs dist/  (host anywhere, e.g. Firebase Hosting: firebase deploy --only hosting)
npm run typecheck
```

## Troubleshooting

| Problem | Fix |
|---|---|
| "Firebase is not configured" | Provide `.env` (see above) and restart the dev server |
| Yellow banner "Firestore denied access" | Deploy the rules and make sure your user has `role: "admin"` |
| "This account is not authorised" | `users/{uid}.role` must be exactly `admin` |
| Map is blank | Needs internet (OpenStreetMap tiles). No API key is used |
| Citizen app doesn't show data | Same Firebase project in both apps; rules deployed |

## Tech

React 19, React Router, TypeScript, Vite, Firebase (Auth + Firestore), Leaflet/OpenStreetMap,
Recharts, jsPDF + AutoTable, lucide-react. Single stylesheet in `src/index.css`.
