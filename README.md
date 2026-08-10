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