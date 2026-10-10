# Smart Disaster Early-Warning System — How to run

```
disaster-app/
├── frontend/      Citizen mobile app (React Native + Expo + Firebase)   [existing app + new Emergency Services]
├── officer-web/   District Officer web portal (React + Vite + Firebase)  [NEW, standalone]
└── firestore.rules, firebase.json ...  shared Firebase project
```

Both apps use the same Firebase project (`.firebaserc` → `floodguard-88be6`; change it to yours if needed).

## 0. One-time Firebase setup
1. Deploy rules (they now include shelters, rescue teams, resources, requests, officer log):
   ```bash
   npm install -g firebase-tools && firebase login
   firebase deploy --only firestore:rules        # run from disaster-app/
   ```
2. Make an officer: register any account, then in Firestore `users/{uid}` set field `role` = `admin`.
3. Make sure `frontend/.env` exists with your Firebase keys (it is git-ignored, so keep your own copy).

## 1. District Officer web portal
```bash
cd officer-web
npm install
npm run dev            # http://localhost:5173
```
Reads Firebase keys from `frontend/.env` automatically (or `officer-web/.env`, see `.env.example`).
Sign in with the admin account → **Settings → Load Demo Data** to fill sample shelters, teams, resources, alerts.

## 2. Citizen mobile app
```bash
cd frontend
npm install
npx expo start         # scan the QR with Expo Go, or press a for Android emulator
```
Home → **Emergency Services** → Shelters / Rescue Teams / Resources, and **My Requests**.
- Shelters: map + list for your district, details, request form (map location, people, description), status Pending/Assigned.
- Rescue Teams: map + list, details, request form (type, contact, people count), status Pending → Assigned → On the way → Pickup → Completed.
- Resources: live availability.

## 3. Try the full flow
1. Citizen (phone): Shelters → choose one → Request → send.
2. Officer (web): Shelters → Citizen Requests → assign a shelter.
3. Citizen: My Requests → pull to refresh → "Assigned".
Rescue: same flow; the officer advances On the way → Pickup → Completed.

## What changed in your existing code (nothing in the DMC officer screens)
- `frontend/app/(user)/(tabs)/index.tsx` — added the "Emergency Services" row + styles (only edit to an existing UI file).
- `firestore.rules` — added blocks for the new collections.
- Everything else is **new files**: `frontend/app/(user)/{shelters,rescue-teams,resources,my-requests,pick-location}`,
  shared components/services/types/utils for them, and the whole `officer-web/` folder.
The existing `(DMC)` screens, auth, and all other UI/code are unchanged.

## Troubleshooting
| Problem | Fix |
|---|---|
| "Missing or insufficient permissions" | Deploy rules; officer user needs `role: "admin"` |
| Citizen sees no shelters/teams | Officer must add data first (or Load Demo Data); toggle the district chip off if the district name doesn't match your location |
| Officer portal says Firebase not configured | Provide `frontend/.env` or `officer-web/.env` and restart `npm run dev` |
| Map blank | Needs internet (OpenStreetMap, no API key) |
