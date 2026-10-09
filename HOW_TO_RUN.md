# Smart Disaster Early-Warning System — How to run

Two apps, one Firebase project (`frontend/.env` already holds the keys):

| App | Who | Runs on | Command |
|---|---|---|---|
| Citizen app | Residents | Phone (Expo Go / emulator) | `npx expo start` |
| District Officer portal | Officers | Web browser | `npx expo start --web` |

## 1. One-time setup
```bash
cd disaster-app/frontend
npm install
npm install -g firebase-tools && firebase login
cd .. && firebase deploy --only firestore:rules && cd frontend
```
(Or paste `firestore.rules` into Firebase Console -> Firestore -> Rules -> Publish.)

## 2. Create an officer account
1. Register any account in the citizen app (or Firebase Console -> Authentication -> Add user).
2. Firebase Console -> Firestore -> `users` -> that user's document -> add field `role` = `admin`.

## 3. Run the District Officer web portal
```bash
cd frontend
npx expo start --web            # opens http://localhost:8081  (add -c to clear cache)
```
The web build always opens the officer portal: sign in at `/officer/login`.
First time: **Settings -> Load Demo Data** fills shelters, rescue teams, resources and alerts.

Pages: Dashboard, Hazard Alerts, Shelters (+ register/edit, citizen requests), Rescue Teams
(assign, + citizen requests), Resources (manage, record distribution, history), Reports
(charts, tables, decisions, PDF), Settings, Information Updated summary.

## 4. Run the citizen mobile app
```bash
npx expo start                  # scan QR with Expo Go, or press a for Android emulator
```
Home -> Emergency Services -> Shelters / Rescue Teams / Resources, and "My Requests".
To run both at once use a second terminal: `npx expo start --web --port 8082`.

## 5. Try the full flow
1. Officer (web): Settings -> Load Demo Data.
2. Citizen (phone): Shelters -> pick one -> Request -> send.
3. Officer (web): Shelters -> Citizen Requests -> assign a shelter.
4. Citizen: My Requests -> pull to refresh -> status is now "Assigned".
Rescue: same, then the officer advances On the way -> Pickup -> Completed.

## Troubleshooting
- "Missing or insufficient permissions": deploy the rules; make sure your user has `role: admin`.
- Blank map: needs internet (OpenStreetMap tiles). Maps use Leaflet, no API key.
- Citizen sees no shelters: turn off the district chip, or the shelter district differs from the phone's location.
- Web shows stale code: `npx expo start --web -c`.
- PDF: Reports -> Generate PDF Report -> choose "Save as PDF" in the browser print dialog.

## What changed in existing files
`firestore.rules` (new collections), `frontend/package.json` (expo-print, expo-sharing),
`frontend/app.json` (web output "single"), `frontend/config/firebase.ts` (web auth init),
`frontend/app/index.tsx` (web opens officer portal), `(user)/(tabs)/index.tsx` (Emergency Services row),
`components/DMCTabBar.tsx`, `components/DMCNavHeader.tsx` (links). Everything else is new.
