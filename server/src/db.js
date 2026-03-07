const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'mails.json');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

function load() {
  if (!fs.existsSync(dbPath)) return [];
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function save(mails) {
  fs.writeFileSync(dbPath, JSON.stringify(mails, null, 2));
}

function insertMail({ id, subject, recipient, sent_at }) {
  const mails = load();
  if (mails.find(m => m.id === id)) return;
  mails.unshift({ id, subject, recipient, sent_at, opened_at: null });
  save(mails);
}

function getMails() {
  return load();
}

function getMailById(id) {
  return load().find(m => m.id === id) || null;
}

// Returns true if this was the first open, false if already opened
function markOpened(id, openedAt) {
  const mails = load();
  const mail = mails.find(m => m.id === id);
  if (mail && !mail.opened_at) {
    mail.opened_at = openedAt;
    save(mails);
    return true;
  }
  return false;
}

module.exports = { insertMail, getMails, getMailById, markOpened };
