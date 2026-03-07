# Product Requirements Document
## MailTrack — Email Open Tracker Chrome Extension

---

## 1. Overview

**MailTrack** is an open-source Chrome extension that notifies users in real time when their sent emails are opened. It targets Gmail as the primary client, is self-hostable, and is designed to be lightweight, privacy-conscious, and easy to set up.

---

## 2. Problem Statement

When you send an important email — a job application, a pitch, a follow-up — you have no way of knowing if it was ever opened. Native email clients offer no read receipts for standard SMTP email. Existing tools (Mailtrack, Streak) solve this but are closed-source, SaaS-only, and require trusting a third party with your email metadata.

MailTrack solves this as a fully open-source, self-hostable alternative.

---

## 3. Goals

- Notify the user the moment a tracked email is opened
- Work seamlessly inside Gmail with zero friction
- Be self-hostable with a simple setup
- Be fully open source and transparent about how tracking works

**Non-goals (v1):**
- Link click tracking
- Per-device / per-open analytics
- Multi-user / team support
- Mobile app
- Non-Gmail client support

---

## 4. Target Users

| User | Description |
|---|---|
| Primary | Individual Gmail users who want read receipts on specific emails |
| Secondary | Developers who want a reference implementation or want to self-host |

---

## 5. Architecture Overview

The system has two components:

### 5.1 Chrome Extension (Frontend)
- Injects into Gmail's compose window
- Adds a "Track this email" toggle to the compose toolbar
- When toggled on, appends a unique tracking pixel `<img>` to the email body before send
- Displays notification history in a popup

### 5.2 Tracking Server (Backend)
- Minimal HTTP server (Node.js or Python — user's choice when self-hosting)
- Exposes a single endpoint: `GET /track/:id`
- Serves a 1x1 transparent PNG
- Records the open event (timestamp, approximate user agent)
- Pushes a real-time notification to the extension via WebSocket or server-sent events

---

## 6. Features

### 6.1 Compose Integration
- A **track toggle button** appears in the Gmail compose toolbar (alongside Bold, Italic, etc.)
- Off by default; user opts in per email
- When enabled, a unique tracking ID is generated and a pixel URL is injected into the email body (hidden, 1x1px)
- A subtle indicator shows the email is being tracked before sending

### 6.2 Real-Time Open Notification
- When the pixel is loaded by the recipient's mail client, the server fires a notification
- The Chrome extension receives it and displays a **browser notification**: *"Your email '[subject]' was just opened"*
- Only fires on **first open** in v1

### 6.3 Extension Popup
- Lists all tracked sent emails
- Shows status for each: **Sent**, **Opened**, or **Not yet opened**
- Shows the timestamp of first open
- Simple, clean UI — no charts or dashboards in v1

### 6.4 Self-Hosted Server
- Provided as a standalone repo or subfolder
- One-command setup (Docker or a simple `npm start` / `python app.py`)
- User configures their server URL in the extension settings
- No accounts, no sign-up — just point the extension at your server

### 6.5 Settings Page
- Server URL (where the user's tracking server is hosted)
- Toggle: track all emails by default vs. opt-in per email
- Toggle: enable/disable browser notifications

---

## 7. Technical Stack (Recommended)

| Layer | Choice | Reason |
|---|---|---|
| Extension | Vanilla JS + Manifest V3 | No framework overhead, MV3 is the current standard |
| Extension UI | Plain HTML/CSS or lightweight like Preact | Keeps bundle small |
| Backend | Node.js (Express) or Python (FastAPI) | Simple, approachable for contributors |
| Database | SQLite | Zero-config, file-based, perfect for personal use |
| Real-time | WebSockets or SSE | Push open events to extension instantly |
| Hosting | Any VPS, Railway, Fly.io, or localhost | User's choice |

---

## 8. User Flow

```
User opens Gmail
        |
        v
Clicks Compose
        |
        v
Clicks "Track" toggle in toolbar
        |
        v
Writes email -> hits Send
        |
        v
Extension injects pixel URL before send
Extension stores { id, subject, recipient, sentAt } locally
        |
        v
Recipient opens email -> email client loads pixel
        |
        v
Tracking server receives GET /track/:id
Server stores open event -> pushes event via WebSocket/SSE
        |
        v
Extension receives event
-> Browser notification fires
-> Popup updates email status to "Opened"
```

---

## 9. Known Limitations (to document openly)

| Limitation | Detail |
|---|---|
| Apple Mail Privacy Protection | Pre-fetches all images — may cause false positives for Apple Mail users |
| Gmail Image Proxy | Gmail caches images through its own proxy — first open may be delayed or show Google's IP |
| Image blocking | Recipients with "load remote images" disabled won't trigger the pixel |
| No guarantee | Pixel tracking is best-effort, not a reliable read receipt |

These should be documented clearly in the README — being honest about limitations is a feature, not a weakness.

---

## 10. Milestones

| Milestone | Scope |
|---|---|
| **M1 - Server** | Tracking server with `/track/:id` endpoint, SQLite storage, WebSocket/SSE push |
| **M2 - Extension Core** | MV3 extension skeleton, Gmail compose injection, pixel append on send |
| **M3 - Notifications** | Real-time browser notification on open event |
| **M4 - Popup UI** | Tracked emails list with sent/opened status and timestamps |
| **M5 - Settings** | Server URL config, default tracking toggle |
| **M6 - Polish & Docs** | README, self-hosting guide, limitations documented, demo GIF |

---

## 11. Open Source Considerations

- MIT License
- Clear README with setup instructions for both the extension and server
- `.env.example` for server config
- Contribution guidelines
- No telemetry, no phoning home — all data stays on the user's server
