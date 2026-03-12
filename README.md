# MailTrack

An open-source Gmail email open tracker.

MailTrack is a Chrome extension + self-hosted server. When you send a tracked email, a 1×1 invisible pixel is embedded. When the recipient opens it, your server records the event and the extension popup shows the open time.


---

## How it works

1. You deploy the tracking server
2. You load the Chrome extension and point it at your server
3. In Gmail, click the tracking emoji next to the send button in the compose toolbar to track an email
4. When the recipient opens it, the popup shows **Opened** with a timestamp

---

## 1. Deploy the server (Railway)

Railway auto-detects Node.js and gives you a public HTTPS URL in minutes.

1. Fork or clone this repo and push it to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repo and set the **Root Directory** to `server`
4. Railway will auto-detect Node.js and run `npm start`
5. In Railway's dashboard, go to **Settings → Networking → Generate Domain** to get your public URL (e.g. `https://mailtrack-production.up.railway.app`)

> **Note:** Railway's filesystem is ephemeral — `mails.json` resets on each deploy. Your tracking history will clear when you redeploy. This is fine for personal use; for persistence, upgrade to a Railway volume or switch to a VPS.

### Environment variables (Railway dashboard → Variables)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Railway sets this automatically — leave it unset |

---

## 2. Alternative: run locally

```bash
cd server
npm install
npm start
# Server runs at http://localhost:3000
```

For HTTPS on localhost (required for Gmail's Private Network Access policy):

```bash
# Install mkcert if you haven't: brew install mkcert
mkcert -install
mkcert localhost
# Then set in server/.env:
# SSL_CERT=./localhost.pem
# SSL_KEY=./localhost-key.pem
npm start
# Server runs at https://localhost:3000
```

---

## 3. Load the Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `extension/` folder
4. Click the MailTrack icon → **⚙** (gear) → enter your server URL → **Save**

---

## 4. Track an email

1. Open Gmail and click **Compose**
2. Click the **phone icon** in the formatting toolbar to toggle tracking on (it turns blue)
3. Write and send your email as normal
4. Click the MailTrack extension icon to see tracked emails and open status

---

## Known limitations

| Limitation | Detail |
|---|---|
| **Apple Mail Privacy Protection** | Apple Mail pre-fetches all remote images, which will trigger a false positive open event immediately after send |
| **Gmail Image Proxy** | Gmail routes images through its own proxy — the recorded IP will be Google's, not the recipient's |
| **Image blocking** | Recipients with "load remote images" disabled will never trigger the pixel |
| **Ephemeral storage on Railway** | `mails.json` is reset on each deploy; use a VPS with a persistent volume for long-term history |
| **First open only** | Only the first open is recorded in v1 — repeat opens are ignored |

Pixel tracking is best-effort, not a reliable read receipt. These limitations are inherent to how email clients handle remote images.

---

## Project structure

```
mail-track/
  server/          Node.js + Express tracking server
    src/
      index.js     Express app — GET /track/:id, POST /mails, GET /mails
      db.js        JSON file storage (no native dependencies)
    .env.example
  extension/       Chrome MV3 extension
    manifest.json
    background.js  Service worker — proxies server fetches
    content.js     Gmail compose injection
    popup.html/js  Extension popup — tracked email list
    options.html/js Settings page — server URL + default tracking
```

