function fmt(isoString) {
  if (!isoString) return null;
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function show(id) {
  ['loading', 'error', 'empty', 'mail-list'].forEach(el => {
    document.getElementById(el).classList.toggle('hidden', el !== id);
  });
}

function renderMails(mails) {
  if (mails.length === 0) { show('empty'); return; }

  const list = document.getElementById('mail-list');
  list.innerHTML = '';

  mails.forEach(({ subject, recipient, sent_at, opened_at }) => {
    const li = document.createElement('li');
    li.className = 'mail-item';

    const opened = !!opened_at;
    li.innerHTML = `
      <div class="mail-top">
        <span class="mail-subject">${subject || '(no subject)'}</span>
        <span class="badge ${opened ? 'badge-opened' : 'badge-pending'}">
          ${opened ? 'Opened' : 'Not opened'}
        </span>
      </div>
      <div class="mail-meta">
        <span>${recipient || '(unknown)'}</span>
        <span>Sent ${fmt(sent_at)}</span>
        ${opened ? `<span class="opened-at">Opened ${fmt(opened_at)}</span>` : ''}
      </div>
    `;
    list.appendChild(li);
  });

  show('mail-list');
}

async function load() {
  const { serverUrl } = await chrome.storage.sync.get({ serverUrl: 'https://localhost:3000' });
  try {
    const res = await fetch(`${serverUrl}/mails`);
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    renderMails(await res.json());
  } catch (err) {
    const el = document.getElementById('error');
    el.textContent = `Could not reach server at ${serverUrl}`;
    show('error');
  }
}

load();
