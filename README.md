# 🌊 FloodGuard: Local Disaster & Early-Warning Network

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

FloodGuard is a comprehensive, full-stack disaster management platform designed to minimize emergency response times during severe floods and landslides. By bridging the gap between local residents, volunteer rescue teams, and disaster management authorities, the system ensures verified, real-time data flows to those who need it most. 

## 🚀 System Architecture

This project is built using a modern decoupled architecture, split between a mobile application for on-the-ground users and a web dashboard for administrative oversight.

### Tech Stack
*   **Mobile Application (Residents & Volunteers):** React Native / Flutter
*   **Web Dashboard (Admins & Officers):** React.js 
*   **Backend API:** Node.js with Express.js
*   **Database:** MongoDB (NoSQL)
*   **Authentication:** JSON Web Tokens (JWT) & Role-Based Access Control (RBAC)
*   **Cloud & Integrations:** 
    *   Firebase Cloud Messaging (FCM) for push notifications
    *   Google Maps API for live geolocation and routing
    *   Cloudinary / AWS S3 for disaster image storage

## 🧩 Core Modules

### 1. Resident Mobile App
*   **One-Tap Reporting:** Upload photos and auto-capture GPS coordinates of rising floodwaters.
*   **Live Hazard Maps:** View active disaster zones, blocked routes, and nearby safe shelters.
*   **Push Alerts:** Receive instant, loud notifications when authorities verify a localized threat.

### 2. Disaster Management Web Dashboard
*   **Incident Verification:** Officers can view incoming reports, validate photo evidence against GPS data, and approve/reject alerts.
*   **Live Analytics:** Heatmaps of disaster hotspots and resource allocation tracking.
*   **Broadcast System:** Push verified emergency announcements directly to affected districts.

### 3. Volunteer Rescue Interface
*   **Dispatch & Routing:** Volunteers receive SOS assignments and use integrated Google Maps to find the safest routes to victims.
*   **Status Tracking:** Real-time updates (En Route, Rescue Completed) synced with the central administrative dashboard.

## 📂 Repository Structure

```text
├── client/                 # React.js web dashboard for Admins/Officers
├── mobile/                 # Mobile application for Residents/Volunteers
├── server/                 # Node.js/Express API and business logic
│   ├── controllers/        # Route logic and database interactions
│   ├── models/             # Mongoose database schemas
│   ├── routes/             # API endpoint definitions
│   └── middleware/         # JWT authentication and error handling
├── docs/                   # UI/UX deliverables, Empathy Maps, and System Blueprints
└── README.md
```

> **Note:** the diagram above describes the project's target architecture. This
> repository's actual folders are `backend/` (Node.js/Express API) and
> `frontend/` (React + Vite + Tailwind web app) — see the setup guide below.

## 🛠️ Getting Started

### Prerequisites
* Node.js 18+ and npm
* A MongoDB connection string (local MongoDB or MongoDB Atlas)

### 1. Backend setup (`/backend`)

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (copy from the variables below):

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MAX_UPLOAD_SIZE=10485760
JWT_SECRET=change_this_to_a_long_random_string

# Admin dashboard login (defaults shown below if not set)
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin123
```

> ⚠️ **Security note:** a MongoDB Atlas connection string with a live
> username/password was previously shared in plain text in project chat/specs.
> Rotate that database user's password in MongoDB Atlas before deploying this
> project anywhere, and never commit a `.env` file to version control.

Run the API:

```bash
npm run dev      # nodemon, auto-restarts on file changes
# or
npm start        # plain node
```

The API will be available at `http://localhost:5000`. Health check:
`GET http://localhost:5000/api/health`.

### 2. Frontend setup (`/frontend`)

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. Logging in

| Role | URL | Credentials |
|---|---|---|
| Resident / Volunteer | `/login` | Create an account via `/register` |
| **Administrator** | **`/admin/login`** | **Email:** `admin@gmail.com` &nbsp;&nbsp; **Password:** `admin123` |

The administrator account is a single fixed login (not a database user) —
see `backend/controllers/adminAuthController.js`. Override it with the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables for production.

## 🧭 Admin Dashboard (this update)

This update adds the **FloodGuard Administrator Dashboard** under `/admin`,
built without modifying any of the existing resident/volunteer pages, routes,
or components. See [`ADMIN_DASHBOARD.md`](./ADMIN_DASHBOARD.md) for a full
breakdown of what was added, how it works, and its current limitations.