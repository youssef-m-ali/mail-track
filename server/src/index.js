require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { insertMail, getMails, getMailById, markOpened } = require('./db');
const { addClient, broadcast } = require('./sse');

const app = express();
app.use(cors());
app.use(express.json());

// Chrome's Private Network Access policy requires this header when a public
// page (e.g. mail.google.com over HTTPS) fetches a loopback address.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Private-Network', 'true');
  next();
});

// Handle the PNA preflight (OPTIONS) requests explicitly
app.options('*', (req, res) => {
  res.set('Access-Control-Allow-Private-Network', 'true');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.sendStatus(204);
});

// 1x1 transparent PNG (hardcoded to avoid a file read on every request)
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// -------------------------------------------------------------------
// GET /track/:id
// Serves the tracking pixel and records the first open event.
// Cache-control headers are set to discourage proxy caching, though
// Gmail's image proxy may still cache — see known limitations in PRD.
// -------------------------------------------------------------------
app.get('/track/:id', (req, res) => {
  const { id } = req.params;
  const mail = getMailById(id);

  if (mail) {
    const openedAt = new Date().toISOString();
    const wasFirstOpen = markOpened(id, openedAt);
    if (wasFirstOpen) {
      broadcast('opened', {
        id,
        subject: mail.subject,
        recipient: mail.recipient,
        opened_at: openedAt,
      });
    }
  }

  res.set({
    'Content-Type': 'image/png',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.send(PIXEL);
});

// -------------------------------------------------------------------
// GET /events
// SSE stream — the Chrome extension connects here to receive real-time
// open notifications.
// -------------------------------------------------------------------
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();
  res.write('event: connected\ndata: {}\n\n');
  addClient(res);
});

// -------------------------------------------------------------------
// POST /mails
// Called by the extension when a tracked email is sent.
// Body: { id, subject, recipient }
// -------------------------------------------------------------------
app.post('/mails', (req, res) => {
  const { id, subject = '', recipient = '' } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });

  insertMail({ id, subject, recipient, sent_at: new Date().toISOString() });
  res.status(201).json({ id });
});

// -------------------------------------------------------------------
// GET /mails
// Returns all tracked mails — used by the extension popup.
// -------------------------------------------------------------------
app.get('/mails', (req, res) => {
  res.json(getMails());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MailTrack server running on http://localhost:${PORT}`);
});
