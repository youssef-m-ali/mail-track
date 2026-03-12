const form = document.getElementById('settings-form');
const serverUrlInput = document.getElementById('server-url');
const trackDefaultInput = document.getElementById('track-default');
const savedMsg = document.getElementById('saved-msg');

// Load current settings
chrome.storage.sync.get(
  { serverUrl: 'https://localhost:3000', trackDefault: false },
  ({ serverUrl, trackDefault }) => {
    serverUrlInput.value = serverUrl;
    trackDefaultInput.checked = trackDefault;
  }
);

// Save on submit
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const serverUrl = serverUrlInput.value.trim().replace(/\/$/, '');
  const trackDefault = trackDefaultInput.checked;

  chrome.storage.sync.set({ serverUrl, trackDefault }, () => {
    savedMsg.classList.remove('hidden');
    setTimeout(() => savedMsg.classList.add('hidden'), 2000);
  });
});
