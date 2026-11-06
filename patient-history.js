/* History state and rendering. Layout and level colors live in patient-history.css. */
const patientHistoryState = { query: '', level: 'all', date: '', selectedId: null, scrollTop: 0 };

function resetPatientHistory() {
  Object.assign(patientHistoryState, { query: '', level: 'all', date: '', selectedId: null, scrollTop: 0 });
}
function normalizeHistorySearch(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
}
function historyDateKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function filterAssessmentHistory(records, query, level, selectedDate = '') {
  const words = normalizeHistorySearch(query).split(' ').map(word => word.replace(/^#/, '')).filter(Boolean);
  return records.filter(record => {
    if (level !== 'all' && record.level !== Number(level)) return false;
    if (selectedDate && historyDateKey(record.createdAt) !== selectedDate) return false;
    const text = normalizeHistorySearch(`${record.id} ${ASSESSMENT_LEVELS[record.level].name} mức độ ${record.level} mức${record.level}`);
    return words.every(word => text.includes(word));
  }).sort((a, b) => b.createdAt - a.createdAt);
}
function getHistoryDetailRecord() {
  if (!isPatientAuthenticated()) return undefined;
  return patientFlow.history.find(record => record.id === patientHistoryState.selectedId);
}
function renderHistoryCard(record) {
  const level = ASSESSMENT_LEVELS[record.level];
  const label = `Xem kết quả ${record.id}, ${level.name}, ${formatAssessmentDate(record.createdAt)}`;
  return `<button class="pf-history-record pf-level--${record.level}" data-record-id="${escapePatientText(record.id)}" onclick="viewAssessment(this.dataset.recordId)" aria-label="${escapePatientText(label)}">
    <img class="pf-history-record__photo" src="${escapePatientText(record.photo)}" alt="" loading="lazy">
    <span class="pf-history-record__body"><strong class="pf-history-record__title">${level.name}</strong><time class="pf-history-record__date" datetime="${new Date(record.createdAt).toISOString()}">${formatAssessmentDate(record.createdAt)}</time><span class="pf-history-record__id">#${escapePatientText(record.id.toUpperCase())}</span></span>
    <span class="pf-history-record__level" aria-label="Mức độ ${record.level} trên 3">${record.level}<small>/3</small></span>
    <span class="pf-history-record__arrow">${patientIcon('chevron-right')}</span>
  </button>`;
}
function renderHistoryMatches() {
  if (!patientFlow.history.length) return `<div class="pf-history-empty">${patientIcon('history')}<h2>Chưa có kết quả</h2><p>Kết quả sẽ xuất hiện sau khi bạn hoàn tất đánh giá.</p></div>`;
  const records = filterAssessmentHistory(patientFlow.history, patientHistoryState.query, patientHistoryState.level, patientHistoryState.date);
  if (!records.length) return `<div class="pf-history-empty">${patientIcon('search-x')}<h2>Không tìm thấy kết quả</h2><p>Thử từ khóa, mức độ hoặc ngày khác.</p><button class="pf-secondary" onclick="clearHistoryFilters()">Xóa bộ lọc</button></div>`;
  return `<div class="pf-history-list">${records.map(renderHistoryCard).join('')}</div>`;
}
function renderPatientHistory() {
  if (!isPatientAuthenticated()) return renderGuestSignIn('history');
  const record = getHistoryDetailRecord();
  if (record) return renderAssessmentResult(record, { fromHistory: true });
  patientHistoryState.selectedId = null;
  return `<section class="pf-history" aria-label="Tra cứu lịch sử đánh giá">
    <div class="pf-history-toolbar">
      <div class="pf-history-search">${patientIcon('search')}<input id="historySearch" type="search" value="${escapePatientText(patientHistoryState.query)}" placeholder="Tìm theo mã hoặc tên mức độ" aria-label="Tìm kiếm bản ghi" autocomplete="off" oninput="setHistorySearch(this.value)"><button id="historySearchClear" aria-label="Xóa từ khóa tìm kiếm" onclick="clearHistorySearch()" ${patientHistoryState.query ? '' : 'hidden'}>${patientIcon('x')}</button></div>
      <div class="pf-history-filters">
        <div class="pf-history-field"><label for="historyLevel">Mức độ</label><select id="historyLevel" onchange="setHistoryLevel(this.value)">${[['all', 'Tất cả'], ['0', 'Mức 0'], ['1', 'Mức 1'], ['2', 'Mức 2'], ['3', 'Mức 3']].map(([value, label]) => `<option value="${value}" ${patientHistoryState.level === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
        <div class="pf-history-field"><label for="historyDate">Ngày đánh giá</label><div class="pf-history-date"><input id="historyDate" type="date" lang="vi" value="${escapePatientText(patientHistoryState.date)}" onclick="openHistoryCalendar()" onchange="setHistoryDate(this.value)"><button id="historyDateClear" onclick="clearHistoryDate()" aria-label="Xóa ngày đã chọn" ${patientHistoryState.date ? '' : 'hidden'}>${patientIcon('x')}</button></div></div>
      </div>
    </div>
    <div id="historyRecords" class="pf-history-records" role="region" aria-label="Danh sách kết quả" tabindex="0" onscroll="patientHistoryState.scrollTop = this.scrollTop">${renderHistoryMatches()}</div>
    <span id="historySearchStatus" class="pf-visually-hidden" role="status" aria-live="polite"></span>
  </section>`;
}
function attachPatientHistory() {
  const records = document.getElementById('historyRecords');
  if (records) records.scrollTop = patientHistoryState.scrollTop;
}
function updateHistoryMatches() {
  const records = document.getElementById('historyRecords');
  if (!records) return;
  patientHistoryState.scrollTop = 0;
  records.innerHTML = renderHistoryMatches();
  records.scrollTop = 0;
  document.getElementById('historySearchClear').hidden = !patientHistoryState.query;
  document.getElementById('historyLevel').value = patientHistoryState.level;
  document.getElementById('historyDate').value = patientHistoryState.date;
  document.getElementById('historyDateClear').hidden = !patientHistoryState.date;
  document.getElementById('historySearchStatus').textContent = records.querySelector('.pf-history-record') ? 'Đã cập nhật danh sách kết quả.' : 'Không có kết quả phù hợp.';
  refreshPatientIcons();
}
function setHistorySearch(query) {
  patientHistoryState.query = query;
  updateHistoryMatches();
}
function setHistoryLevel(level) {
  if (!['all', '0', '1', '2', '3'].includes(level)) return;
  patientHistoryState.level = level;
  updateHistoryMatches();
}
function openHistoryCalendar() {
  const input = document.getElementById('historyDate');
  try { input.showPicker?.(); } catch { input.focus(); }
}
function setHistoryDate(date) {
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || historyDateKey(new Date(`${date}T12:00:00`).getTime()) !== date)) return;
  patientHistoryState.date = date;
  updateHistoryMatches();
}
function clearHistoryDate() {
  setHistoryDate('');
  document.getElementById('historyDate').focus();
}
function clearHistorySearch() {
  patientHistoryState.query = '';
  const input = document.getElementById('historySearch');
  input.value = '';
  updateHistoryMatches();
  input.focus();
}
function clearHistoryFilters() {
  patientHistoryState.level = 'all';
  patientHistoryState.date = '';
  clearHistorySearch();
}
function viewAssessment(id) {
  if (!requirePatientSession('history')) return;
  if (!patientFlow.history.some(record => record.id === id)) return;
  stopPatientCamera();
  patientHistoryState.selectedId = id;
  patientFlow.overlay = true;
  patientFlow.resultSlide = 0;
  renderPatientTab('history');
}
function returnToPatientHistory() {
  patientHistoryState.selectedId = null;
  renderPatientTab('history');
}
