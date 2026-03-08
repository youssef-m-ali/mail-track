// MailTrack — content script injected into mail.google.com
//
// NOTE: Gmail's internal class names change frequently. Where possible
// we rely on data-tooltip and aria attributes which are more stable.
// If tracking stops working after a Gmail update, these selectors are
// the first place to check.

// -----------------------------------------------------------------------
// Selectors
// -----------------------------------------------------------------------
// The send button in a compose window
const SEND_BTN_SELECTOR = '[data-tooltip^="Send"], [aria-label^="Send "]';

// The formatting toolbar — we insert our button here.
// Identified by finding the Bold button and walking up to its toolbar row.
const BOLD_BTN_SELECTOR = '[data-tooltip="Bold"]';

// The compose body (editable area).
// Gmail doesn't expose a stable selector here — we try several in order.
const BODY_SELECTORS = [
  'div[contenteditable="true"][aria-label*="Message Body"]',
  'div[contenteditable="true"][g_editable="true"]',
  'div[contenteditable="true"].Am',
  'div[contenteditable="true"]',
];

// Subject and recipient fields
const SUBJECT_SELECTOR = 'input[name="subjectbox"]';
const TO_SELECTOR = '[data-hovercard-id]';       // recipient chips
const TO_INPUT_SELECTOR = 'input[name="to"]';    // fallback before chips render

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
function generateId() {
  return crypto.randomUUID();
}

function isContextValid() {
  try { return !!chrome.runtime?.id; } catch { return false; }
}

async function getServerUrl() {
  try {
    const { serverUrl } = await chrome.storage.sync.get({ serverUrl: 'https://localhost:3000' });
    return serverUrl;
  } catch {
    return 'https://localhost:3000';
  }
}

function getSubject(composeEl) {
  return composeEl.querySelector(SUBJECT_SELECTOR)?.value?.trim() || '(no subject)';
}

function getRecipient(composeEl) {
  // Prefer chips (rendered recipients) over the raw input
  const chip = composeEl.querySelector(TO_SELECTOR);
  if (chip) return chip.getAttribute('data-hovercard-id');
  return composeEl.querySelector(TO_INPUT_SELECTOR)?.value?.trim() || '';
}

function findComposeBody(composeEl) {
  // Walk up the DOM level by level, checking each ancestor's subtree.
  // The compose window root will contain both the send button and the body,
  // so we'll find the contenteditable once we reach that level.
  let ancestor = composeEl;

  while (ancestor && ancestor !== document.body) {
    for (const sel of BODY_SELECTORS) {
      const el = ancestor.querySelector(sel);
      if (el) return el;
    }
    ancestor = ancestor.parentElement;
  }

  console.warn('[MailTrack] Could not find compose body');
  return null;
}

function injectPixel(composeEl, id, serverUrl) {
  const body = findComposeBody(composeEl);
  if (!body) {
    console.warn('[MailTrack] Pixel not injected — no compose body found');
    return;
  }

  // Move cursor to end of body so the pixel is appended there
  body.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(body);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);

  // execCommand fires the proper input/mutation events that Gmail's internal
  // content model listens to — plain appendChild does not.
  const imgHtml = `<img src="${serverUrl}/track/${id}" data-mailtrack="true" width="1" height="1" style="width:1px!important;height:1px!important;border:0!important;display:block!important;" alt="">`;
  document.execCommand('insertHTML', false, imgHtml);

  console.log(`[MailTrack] Pixel injected — tracking id: ${id}`);
}

async function registerMail(id, subject, recipient) {
  if (!isContextValid()) return;
  const sentAt = new Date().toISOString();

  try {
    // Always write to local storage first (works even if server is unreachable)
    const { mails = [] } = await chrome.storage.local.get('mails');
    mails.unshift({ id, subject, recipient, sent_at: sentAt, opened_at: null });
    await chrome.storage.local.set({ mails });

    // Delegate the server fetch to the background service worker.
    // Content scripts are blocked from fetching localhost directly by Chrome's
    // Private Network Access policy. The background worker is not.
    chrome.runtime.sendMessage({ type: 'REGISTER_MAIL', payload: { id, subject, recipient } });
  } catch (err) {
    console.warn('[MailTrack] Context invalidated during registerMail:', err.message);
  }
}

// -----------------------------------------------------------------------
// Per-compose injection
// -----------------------------------------------------------------------
// Track which send buttons we've already wired up
const wiredSendButtons = new WeakSet();

function setupCompose(sendBtn) {
  if (wiredSendButtons.has(sendBtn)) return;
  wiredSendButtons.add(sendBtn);

  // Walk up to find the compose container
  // Floating compose uses [role="dialog"]; inline replies use a table cell
  const composeEl = sendBtn.closest('[role="dialog"]') ?? sendBtn.closest('td');
  if (!composeEl) return;

  // --- Build the track toggle button ---
  let isTracking = false;
  let trackingId = null;

  const trackBtn = document.createElement('button');
  trackBtn.className = 'mailtrack-toggle';
  trackBtn.type = 'button';
  trackBtn.title = 'MailTrack: click to track this email';
  trackBtn.setAttribute('data-tracking', 'off');
  trackBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
               A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42
               2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72
               c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.64
               a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45
               c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  `;

  trackBtn.addEventListener('click', async () => {
    isTracking = !isTracking;
    trackBtn.setAttribute('data-tracking', isTracking ? 'on' : 'off');
    trackBtn.title = isTracking
      ? 'MailTrack: tracking ON — click to disable'
      : 'MailTrack: click to track this email';

    if (isTracking) {
      // Inject the pixel now, while the compose window is open and idle.
      // This ensures it's already in the body when Gmail serializes on Send.
      trackingId = generateId();
      const serverUrl = await getServerUrl();
      injectPixel(composeEl, trackingId, serverUrl);
    } else {
      // Remove the pixel if the user toggles tracking off
      const body = findComposeBody(composeEl);
      body?.querySelector('img[data-mailtrack]')?.remove();
      trackingId = null;
    }
  });

  // Insert after the Bold button's toolbar row, falling back to beside the send button
  const boldBtn = composeEl.querySelector(BOLD_BTN_SELECTOR);
  const toolbar = boldBtn?.parentElement;
  if (toolbar) {
    toolbar.appendChild(trackBtn);
  } else {
    sendBtn.insertAdjacentElement('afterend', trackBtn);
  }

  // --- Wire up the send button ---
  // Pixel is already in the body from toggle time. Just register the mail.
  sendBtn.addEventListener('click', () => {
    if (!isTracking || !trackingId) return;
    const subject = getSubject(composeEl);
    const recipient = getRecipient(composeEl);
    registerMail(trackingId, subject, recipient);
  }, { capture: true });
}

// -----------------------------------------------------------------------
// MutationObserver — watch for compose windows opening
// -----------------------------------------------------------------------
const observer = new MutationObserver(() => {
  document.querySelectorAll(SEND_BTN_SELECTOR).forEach(setupCompose);
});

observer.observe(document.body, { childList: true, subtree: true });

// Handle any compose windows already open on script load
document.querySelectorAll(SEND_BTN_SELECTOR).forEach(setupCompose);
