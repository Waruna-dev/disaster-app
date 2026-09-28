# Update: Shelters, Rescue Teams, Resources, Analytics & Reports

## Setup
1. `cd frontend && npm install`   (adds expo-print + expo-sharing for PDF export)
2. Deploy rules: `firebase deploy --only firestore:rules`
3. Run: `npx expo start` (mobile for citizens) / `npx expo start --web` (District Officer web)
4. Sign in as an admin (users/{uid}.role == 'admin') and add shelters, rescue teams and resources
   from the District Officer screens first — citizens see them immediately.

## Citizen (mobile)
- Home: new "Emergency Services" row -> Shelters / Rescue Teams / Resources
- /(user)/shelters            map + list, filtered to the user's current district and status
- /(user)/shelters/[id]       details + Request button (status based)
- /(user)/shelters/request/[id]   location (map picker), people, description -> Send
- /(user)/shelters/my-requests    Pending / Assigned / Rejected
- /(user)/rescue-teams (+ [id], request/[id], my-requests)  same flow; type, contact, people count;
  status tracker Pending > Assigned > On the way > Pickup > Completed
- /(user)/resources           read-only stock availability
- /(user)/pick-location       shared "select location on map" screen

## District Officer (web)
- /(DMC)/shelters, shelter-form, shelter-requests
- /(DMC)/rescue-teams, rescue-requests (assign team, advance status)
- /(DMC)/resources            Manage | Record Distribution | History (stock deducted transactionally)
- /(DMC)/analytics            tables, pie/column/bar charts, decisions, "Generate PDF Report"

## Existing files edited (small, additive)
firestore.rules, frontend/package.json, (user)/(tabs)/index.tsx (quick actions row),
components/DMCTabBar.tsx, components/DMCNavHeader.tsx (new menu links)

## Notes
- Maps use Leaflet/OpenStreetMap (same as the existing report map) — no Google Maps API key needed.
- New Firestore collections: shelters, shelterRequests, rescueTeams, rescueRequests, resources, resourceDistributions.
- Shelter district filter uses the device's reverse-geocoded district; names must match the district
  chosen by the officer (list in constants/districts.ts).
