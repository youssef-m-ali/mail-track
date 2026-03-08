// Set default server URL on first install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ serverUrl: 'http://localhost:3000' });
});

// Proxy server fetches from the content script.
// Content scripts run under mail.google.com's origin and are blocked by
// Chrome's Private Network Access policy from fetching localhost directly.
// Background service workers are not subject to the same restriction.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'REGISTER_MAIL') {
    chrome.storage.sync.get({ serverUrl: 'http://localhost:3000' }, async ({ serverUrl }) => {
      try {
        await fetch(`${serverUrl}/mails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg.payload),
        });
      } catch (err) {
        console.warn('[MailTrack] Server unreachable:', err.message);
      }
    });
  }
});

// M3 will add the SSE connection and browser notification logic here
