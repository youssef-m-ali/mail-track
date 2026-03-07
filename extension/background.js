// Set default server URL on first install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ serverUrl: 'http://localhost:3000' });
});

// M3 will add the SSE connection and browser notification logic here
