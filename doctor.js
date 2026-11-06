/* Doctor workspace. All counts and views share the same patient records. */
const doctorWorkspace = { tab: 'analytics', query: '', returnFocus: null };
const doctorStatuses = { pending: 'Chờ xem', urgent: 'Ưu tiên', reviewed: 'Đã xem' };
const doctorAppointments = [
  { patientId: 'VSC-3184', time: '14:30' },
  { patientId: 'VSC-8812', time: '15:15' },
  { patientId: 'VSC-5521', time: '16:00' }
];
function doctorText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function doctorIcon(name) { return `<i data-lucide="${name}" aria-hidden="true"></i>`; }
function doctorIcons() { if (window.lucide) window.lucide.createIcons(); }
function doctorNormalize(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
function doctorInitials(name) { return doctorText(String(name).trim().split(/\s+/).slice(-2).map(word => word[0]).join('')); }
function doctorStatus(patient) { return `<span class="df-status df-status--${Object.hasOwn(doctorStatuses, patient.status) ? patient.status : 'pending'}">${doctorStatuses[patient.status] || 'Chờ xem'}</span>`; }
function doctorCaseCard(patient, compact = false) {
  return `<article class="df-case ${compact ? 'df-case--compact' : ''}">
    <div class="df-case-top"><span class="df-avatar">${doctorInitials(patient.name)}</span><div class="df-identity"><h3>${doctorText(patient.name)}</h3><p>${doctorText(patient.id)} · ${doctorText(patient.age)} tuổi · ${doctorText(patient.gender)}</p></div>${doctorStatus(patient)}</div>
    ${compact ? '' : `<p class="df-case-description">${doctorText(patient.survey?.oralSensations || 'Chưa có thông tin khảo sát.')}</p><div class="df-case-metrics"><span>${doctorIcon('activity')} VSC <strong>${doctorText(patient.vscScore)} <small>ppb</small></strong></span><span>${doctorIcon('image')} ${patient.photoUrl ? 'Có ảnh đính kèm' : 'Chưa có ảnh'}</span></div>`}
    <div class="df-case-bottom"><span>${doctorText(patient.submittedAt)}</span><button class="df-text-button" data-doctor-record="${doctorText(patient.id)}">Xem hồ sơ ${doctorIcon('arrow-up-right')}</button></div>
  </article>`;
}
function filterPatients(filterKey) {
  appState.activeFilter = ['all', ...Object.keys(doctorStatuses)].includes(filterKey) ? filterKey : 'all';
  document.getElementById('doctorStatusFilter').value = appState.activeFilter;
  renderAdminPatientList(appState.activeFilter);
}
function searchDoctorPatients(value) { doctorWorkspace.query = value; renderAdminPatientList(appState.activeFilter); }
function renderAdminPatientList(filter = 'all') {
  const container = document.getElementById('adminPatientListContainer');
  if (!container) return;
  const query = doctorNormalize(doctorWorkspace.query.trim());
  const order = { urgent: 0, pending: 1, reviewed: 2 };
  const list = appState.patients.filter(patient => (filter === 'all' || patient.status === filter) && doctorNormalize(`${patient.name} ${patient.id} ${patient.phone}`).includes(query)).sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));
  container.innerHTML = list.length ? list.map(patient => doctorCaseCard(patient)).join('') : `<div class="df-empty">${doctorIcon('search-x')}<h3>Không tìm thấy hồ sơ</h3><p>Thử tên, mã hồ sơ hoặc trạng thái khác.</p><button class="df-text-button" onclick="resetDoctorFilters()">Xóa bộ lọc</button></div>`;
  document.getElementById('doctorResultCount').textContent = `${list.length} hồ sơ`;
  renderDoctorOverview();
  renderDoctorSchedule();
  doctorIcons();
}
function resetDoctorFilters() {
  doctorWorkspace.query = '';
  document.getElementById('doctorSearch').value = '';
  filterPatients('all');
}
function showDoctorCases(status = 'all') {
  resetDoctorFilters();
  filterPatients(status);
  switchDoctorTab('cases');
}
function renderDoctorOverview() {
  const records = appState.patients;
  const waiting = records.filter(patient => patient.status !== 'reviewed');
  const urgent = records.filter(patient => patient.status === 'urgent');
  const reviewed = records.filter(patient => patient.status === 'reviewed');
  document.getElementById('doctorHeaderName').textContent = appState.currentDoctor.name;
  document.getElementById('doctorHeaderRoom').textContent = appState.currentDoctor.clinicRoom;
  document.getElementById('doctorToday').textContent = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(new Date());
  document.getElementById('doctorWorkload').textContent = waiting.length ? `${waiting.length} hồ sơ cần xem` : 'Đã xem hết hồ sơ';
  document.getElementById('doctorWorkloadHint').textContent = urgent.length ? `${urgent.length} hồ sơ được đánh dấu ưu tiên trong danh sách.` : 'Theo dõi hồ sơ và lịch hẹn của bạn tại đây.';
  const first = urgent[0] || waiting[0];
  const action = document.getElementById('doctorReviewNext');
  action.disabled = !first;
  if (first) action.dataset.doctorRecord = first.id;
  else delete action.dataset.doctorRecord;
  document.getElementById('doctorOverviewStats').innerHTML = [
    ['all', records.length, 'Tổng hồ sơ', 'folders'], ['urgent', urgent.length, 'Ưu tiên', 'flag'], ['reviewed', reviewed.length, 'Đã xem', 'circle-check']
  ].map(([status, count, label, icon]) => `<button class="df-stat" onclick="showDoctorCases('${status}')">${doctorIcon(icon)}<strong>${count}</strong><span>${label}</span></button>`).join('');
  document.getElementById('doctorPriorityList').innerHTML = waiting.length ? [...urgent, ...waiting.filter(patient => patient.status !== 'urgent')].slice(0, 2).map(patient => doctorCaseCard(patient, true)).join('') : `<div class="df-empty">${doctorIcon('circle-check')}<h3>Không còn hồ sơ chờ xem</h3><p>Bạn có thể xem lại các hồ sơ đã xử lý.</p></div>`;
  const percent = records.length ? Math.round(reviewed.length / records.length * 100) : 0;
  document.getElementById('doctorProgressLabel').textContent = `${reviewed.length}/${records.length} hồ sơ`;
  document.getElementById('doctorProgress').value = percent;
}
function renderDoctorSchedule() {
  const appointments = doctorAppointments.map(appointment => ({ ...appointment, patient: appState.patients.find(patient => patient.id === appointment.patientId) })).filter(appointment => appointment.patient);
  document.getElementById('doctorScheduleCount').textContent = `${appointments.length} lịch hẹn`;
  document.getElementById('doctorScheduleRoom').textContent = appState.currentDoctor.clinicRoom;
  document.getElementById('doctorScheduleList').innerHTML = appointments.length ? appointments.map(({ time, patient }) => `<article class="df-appointment"><div class="df-appointment-time"><time>${time}</time><span class="df-timeline-dot"></span></div><div class="df-appointment-card"><span class="df-eyebrow">ĐO KHÍ HALIMETER</span><h3>${doctorText(patient.name)}</h3><p>${doctorText(patient.id)} · ${doctorText(patient.age)} tuổi</p><div class="df-appointment-footer">${doctorStatus(patient)}<button class="df-text-button" data-doctor-record="${doctorText(patient.id)}">Hồ sơ ${doctorIcon('arrow-up-right')}</button></div></div></article>`).join('') : '<div class="df-empty"><h3>Chưa có lịch hẹn</h3></div>';
}
function switchDoctorTab(tabId) {
  if (!['cases', 'schedule', 'analytics'].includes(tabId)) return;
  doctorWorkspace.tab = tabId;
  for (const [tab, suffix] of [['cases', 'Cases'], ['schedule', 'Schedule'], ['analytics', 'Analytics']]) {
    const active = tab === tabId;
    const panel = document.getElementById(`docSubpage${suffix}`);
    panel.hidden = !active;
    const button = document.getElementById(`docNav_${tab}`);
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  renderAdminPatientList(appState.activeFilter);
}
function doctorDetail(label, value) { return `<div class="df-detail-row"><dt>${label}</dt><dd>${doctorText(value || 'Chưa có thông tin')}</dd></div>`; }
function openPatientDossier(patientId) {
  const patient = appState.patients.find(item => item.id === patientId);
  if (!patient) return;
  appState.currentViewingPatientId = patientId;
  doctorWorkspace.returnFocus = document.activeElement;
  document.getElementById('dossierPatientName').textContent = patient.name;
  document.getElementById('dossierRecordId').textContent = `${patient.id} · ${patient.gender} · ${patient.age} tuổi`;
  document.getElementById('dossierPatientSummary').innerHTML = `<span class="df-avatar">${doctorInitials(patient.name)}</span><div><span class="df-eyebrow">NỒNG ĐỘ VSC</span><p class="df-vsc">${doctorText(patient.vscScore)} <small>ppb</small></p></div>${doctorStatus(patient)}<p class="df-summary-meta">${doctorIcon('phone')} ${doctorText(patient.phone)}<br>${doctorText(patient.submittedAt)}</p>`;
  const survey = patient.survey || {};
  document.getElementById('dossierPanel_survey').innerHTML = `<dl>${doctorDetail('Thời điểm xuất hiện', survey.peakTime)}${doctorDetail('Triệu chứng khai báo', survey.oralSensations)}${doctorDetail('Tiền sử trào ngược', survey.gerdHistory)}${doctorDetail('Thói quen vệ sinh', survey.cleaningHabit)}${doctorDetail('Mức độ lo lắng', survey.anxietyScore)}</dl>`;
  document.getElementById('dossierPanel_photo').innerHTML = `<figure class="df-photo"><img id="dossierPhotoImg" alt="Ảnh đính kèm hồ sơ" hidden><figcaption id="dossierPhotoCaption">Chưa có ảnh đính kèm</figcaption></figure><dl>${doctorDetail('Góc chụp', patient.photoAngle)}${doctorDetail('Chỉ số Winkel', patient.winkelIndex)}${doctorDetail('Mô tả của bệnh nhân', patient.patientNote)}</dl>`;
  const photo = document.getElementById('dossierPhotoImg');
  if (/^https?:\/\//i.test(patient.photoUrl || '')) {
    photo.hidden = false;
    document.getElementById('dossierPhotoCaption').textContent = 'Ảnh đính kèm hồ sơ';
    photo.onerror = () => { photo.hidden = true; document.getElementById('dossierPhotoCaption').textContent = 'Không tải được ảnh. Vui lòng kiểm tra kết nối.'; };
    photo.src = patient.photoUrl;
  }
  document.getElementById('dossierPanel_meds').innerHTML = `<dl>${doctorDetail('Thuốc đang sử dụng', patient.medications?.prescriptions)}${doctorDetail('Nước súc miệng', patient.medications?.mouthwash)}</dl>`;
  document.getElementById('doctorOrderInput').value = patient.doctorDiagnosis || '';
  document.getElementById('doctorNoteError').hidden = true;
  switchDossierTab('survey');
  document.getElementById('patientDossierModal').showModal();
  doctorIcons();
}
function closePatientDossier() { document.getElementById('patientDossierModal').close(); }
function finishDoctorDossier() {
  const trigger = doctorWorkspace.returnFocus;
  if (trigger?.isConnected) trigger.focus();
  else document.getElementById(`docNav_${doctorWorkspace.tab}`)?.focus();
  appState.currentViewingPatientId = null;
}
function switchDossierTab(tabKey) {
  for (const key of ['survey', 'photo', 'meds', 'notes']) {
    const active = key === tabKey;
    document.getElementById(`dossierPanel_${key}`).hidden = !active;
    const tab = document.getElementById(`dossierTab_${key}`);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  document.getElementById('doctorDossierBody').scrollTop = 0;
}
function submitDoctorOrder() {
  const patient = appState.patients.find(item => item.id === appState.currentViewingPatientId);
  const input = document.getElementById('doctorOrderInput');
  if (!patient) return;
  if (!input.value.trim()) {
    switchDossierTab('notes');
    document.getElementById('doctorNoteError').hidden = false;
    input.focus();
    return;
  }
  patient.doctorDiagnosis = input.value.trim();
  patient.status = 'reviewed';
  renderAdminPatientList(appState.activeFilter);
  closePatientDossier();
  showToast('Đã lưu ghi chú và cập nhật trạng thái hồ sơ.');
}
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-doctor-record]');
  if (trigger && appState.currentScreen === 'screen-doctor') openPatientDossier(trigger.dataset.doctorRecord);
});
document.addEventListener('keydown', event => {
  if (!event.target.matches('.df-tabs [role="tab"]') || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...event.target.parentElement.querySelectorAll('[role="tab"]')];
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(event.target) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[index].click();
  tabs[index].focus();
});
