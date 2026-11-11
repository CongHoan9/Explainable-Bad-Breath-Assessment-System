/* One local data store for both roles. No generated cases or appointments. */
function createBreathDataStore(storage) {
  const KEY = 'breath-shared-data-v1';
  const listeners = new Set();
  const empty = () => ({ version: 1, patients: {}, changes: {}, appointments: [] });
  let memory = empty(), pending = false;
  const clone = value => JSON.parse(JSON.stringify(value));
  function read() {
    if (!pending) try {
      const saved = JSON.parse(storage?.getItem(KEY) || 'null');
      if (saved?.version === 1 && saved.patients && typeof saved.patients === 'object' && !Array.isArray(saved.patients)
        && saved.changes && typeof saved.changes === 'object' && !Array.isArray(saved.changes) && Array.isArray(saved.appointments)) memory = saved;
    } catch { /* Keep the last usable snapshot in this session. */ }
    return clone(memory);
  }
  function notify() { for (const listener of listeners) queueMicrotask(listener); }
  function write(update) {
    const data = read();
    update(data);
    memory = data;
    let saved = false;
    try { if (storage) { storage.setItem(KEY, JSON.stringify(data)); saved = true; } } catch { /* The caller reports session-only data. */ }
    pending = !saved;
    notify();
    return saved;
  }
  function mergeHistory(oldRecords, records) {
    const byId = new Map();
    for (const record of [...(oldRecords || []), ...(records || [])]) if (record && typeof record.id === 'string') byId.set(record.id, record);
    return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  }
  function patient(account) {
    const data = read();
    return Object.hasOwn(data.patients, account) ? data.patients[account] : null;
  }
  function savePatient(account, snapshot) {
    return write(data => {
      const previous = Object.hasOwn(data.patients, account) ? data.patients[account] : {};
      data.patients = { ...data.patients, [account]: { ...snapshot, history: mergeHistory(previous.history, snapshot.history) } };
    });
  }
  const caseId = (account, recordId) => `${encodeURIComponent(account)}~${recordId}`;
  function saveWorkflow(changes, appointments) {
    return write(data => {
      for (const [id, change] of Object.entries(changes)) if (!Object.hasOwn(data.changes, id) || (change.updatedAt || 0) >= (data.changes[id].updatedAt || 0)) data.changes = { ...data.changes, [id]: change };
      const byId = new Map(data.appointments.map(item => [item.id, item]));
      for (const item of appointments) if (!byId.has(item.id) || (item.updatedAt || 0) >= (byId.get(item.id).updatedAt || 0)) byId.set(item.id, item);
      data.appointments = [...byId.values()];
    });
  }
  function migrateLegacy() {
    const keys = [];
    try { for (let i = 0; i < storage.length; i++) keys.push(storage.key(i)); } catch { return; }
    for (const key of keys) {
      if (!key?.startsWith('breath-assessments-v1:')) continue;
      try {
        const account = decodeURIComponent(key.slice('breath-assessments-v1:'.length));
        const old = JSON.parse(storage.getItem(key));
        if (!account || !Array.isArray(old?.history)) continue;
        const current = patient(account);
        if (savePatient(account, { ...old, ...current, history: mergeHistory(old.history, current?.history) })) storage.removeItem(key);
      } catch { /* Preserve malformed or unconverted legacy data. */ }
    }
    // The previous doctor workspace contains the sample cases and sample agenda.
    for (const key of keys) if (key?.startsWith('breath-doctor-v1:')) try { storage.removeItem(key); } catch { /* New workspaces never read these keys. */ }
  }
  function receiveStorage(event) {
    if (event.key !== KEY && event.key !== null) return;
    if (!pending) memory = empty();
    notify();
  }
  return { KEY, read, patient, savePatient, saveWorkflow, caseId, migrateLegacy, receiveStorage,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
let breathStorage;
try { if (typeof localStorage !== 'undefined') breathStorage = localStorage; } catch { /* Browser storage can be disabled. */ }
const SharedDataStore = createBreathDataStore(breathStorage);
if (typeof window !== 'undefined') window.addEventListener('storage', event => SharedDataStore.receiveStorage(event));
if (typeof module !== 'undefined' && module.exports) module.exports = { createBreathDataStore };
