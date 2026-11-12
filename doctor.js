/* Doctor workspace. All counts and views share the same patient records. */
const doctorDefaults = { ...appState.currentDoctor };
const doctorWorkspace = { tab: 'analytics', query: '', returnFocus: null, menu: null, account: '', basePatients: [], changes: {}, appointments: [], readIds: [], date: '', editingAppointment: null, appointmentReturnFocus: null };
const doctorStatuses = { pending: 'Chờ xem', urgent: 'Ưu tiên', reviewed: 'Đã xem' };
const doctorAppointmentTypes = { consultation: 'Tư vấn', measurement: 'Đo khí Halimeter', followup: 'Tái khám' };
const doctorHeaderPanels = {
  navigation: ['doctorNavigationMenu', 'doctorMenuButton'],
  profile: ['doctorProfileMenu', 'doctorProfileButton'],
  notifications: ['doctorNotificationPanel', 'doctorNotificationButton']
};
function isDoctorAuthenticated() { return appState.isAuthenticated && appState.currentUser.role === 'admin'; }
function doctorLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function validDoctorDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T12:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function validDoctorAppointment(item) {
  return item && typeof item.id === 'string' && /^[a-z0-9-]+$/i.test(item.id)
    && typeof item.patientId === 'string' && validDoctorDate(item.date)
    && typeof item.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)
    && Object.hasOwn(doctorAppointmentTypes, item.type) && ['scheduled', 'completed', 'cancelled'].includes(item.status)
    && typeof item.note === 'string' && item.note.length <= 500;
}
function initializeDoctorWorkspace() {
  closeDoctorMenus(false);
  doctorWorkspace.account = appState.currentUser.username.trim().toLocaleLowerCase('vi');
  doctorWorkspace.query = '';
  doctorWorkspace.date = doctorLocalDate();
  doctorWorkspace.changes = {};
  doctorWorkspace.readIds = [];
  doctorWorkspace.appointments = [];
  appState.currentDoctor = { name: appState.currentUser.username, department: '', clinicRoom: '' };
  try {
    const saved = JSON.parse(localStorage.getItem(doctorStorageKey()) || 'null');
    if (saved && typeof saved === 'object') {
      if (Array.isArray(saved.readIds)) doctorWorkspace.readIds = saved.readIds.filter(id => typeof id === 'string');
      for (const key of ['name', 'department', 'clinicRoom']) {
        if (typeof saved.profile?.[key] === 'string' && saved.profile[key].trim()) appState.currentDoctor[key] = saved.profile[key].slice(0, 120);
      }
    }
  } catch { /* A damaged or unavailable store starts a fresh workspace. */ }
  appState.activeFilter = 'all';
  document.getElementById('doctorSearch').value = '';
  document.getElementById('doctorStatusFilter').value = 'all';
  loadDoctorSharedRecords();
}
function doctorStorageKey() { return 'breath-doctor-v2:' + encodeURIComponent(doctorWorkspace.account); }
function persistDoctorWorkspace() {
  if (!isDoctorAuthenticated()) return false;
  const sharedSaved = SharedDataStore.saveWorkflow(doctorWorkspace.changes, doctorWorkspace.appointments);
  try {
    localStorage.setItem(doctorStorageKey(), JSON.stringify({ profile: appState.currentDoctor, readIds: doctorWorkspace.readIds }));
    return sharedSaved;
  } catch { return false; }
}
function setDoctorPatientRecords(records) {
  doctorWorkspace.basePatients = JSON.parse(JSON.stringify(records));
  applyDoctorRecordChanges();
}
function applyDoctorRecordChanges() {
  appState.patients = doctorWorkspace.basePatients.map(patient => {
    const changed = Object.hasOwn(doctorWorkspace.changes, patient.id) ? doctorWorkspace.changes[patient.id] : null;
    return changed && Object.hasOwn(doctorStatuses, changed.status) && typeof changed.doctorDiagnosis === 'string'
      ? { ...patient, status: changed.status, doctorDiagnosis: changed.doctorDiagnosis.slice(0, 4000) } : { ...patient };
  });
}
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
    ${compact ? '' : `<p class="df-case-description">${doctorText(patient.survey?.oralSensations || 'Chưa có thông tin khảo sát.')}</p><div class="df-case-metrics"><span>${doctorIcon('activity')} Kết quả <strong>${doctorText(patient.resultTitle)}</strong></span><span>${doctorIcon('image')} ${patient.photoUrl ? 'Có ảnh đính kèm' : 'Chưa có ảnh'}</span></div>`}
    <div class="df-case-bottom"><span>${doctorText(patient.submittedAt)}</span><button class="df-text-button" data-doctor-record="${doctorText(patient.id)}">Xem hồ sơ ${doctorIcon('arrow-up-right')}</button></div>
  </article>`;
}
function filterPatients(filterKey) {
  appState.activeFilter = ['all', ...Object.keys(doctorStatuses)].includes(filterKey) ? filterKey : 'all';
  document.getElementById('doctorStatusFilter').value = appState.activeFilter;
  renderAdminPatientList(appState.activeFilter);
}
function searchDoctorPatients(value) { doctorWorkspace.query = value; renderAdminPatientList(appState.activeFilter); }
function doctorPatientTable(patients) {
  return `<table class="dw-patient-table"><caption class="pf-visually-hidden">Danh sách hồ sơ bệnh nhân</caption><thead><tr><th scope="col">Bệnh nhân</th><th scope="col">Liên hệ</th><th scope="col">Kết quả đánh giá</th><th scope="col">Trạng thái</th><th scope="col">Gửi lúc</th><th scope="col"><span class="pf-visually-hidden">Thao tác</span></th></tr></thead><tbody>${patients.map(patient => `<tr><td><div class="dw-table-person"><span class="df-avatar">${doctorInitials(patient.name)}</span><div><strong>${doctorText(patient.name)}</strong><span>${doctorText(patient.id)} · ${doctorText(patient.age)} tuổi · ${doctorText(patient.gender)}</span></div></div></td><td class="dw-table-phone">${doctorText(patient.phone)}</td><td><strong class="dw-vsc-value">${doctorText(patient.resultTitle)}</strong><br><span class="dw-muted">${patient.source === 'questionnaire' ? 'Tham khảo theo bảng hỏi' : 'Đánh giá từ ảnh'}</span></td><td>${doctorStatus(patient)}</td><td class="dw-table-submitted">${doctorText(patient.submittedAt)}</td><td><button class="dw-open-record" data-doctor-record="${doctorText(patient.id)}" aria-label="Xem hồ sơ ${doctorText(patient.name)}">Xem hồ sơ ${doctorIcon('arrow-up-right')}</button></td></tr>`).join('')}</tbody></table>`;
}
function renderAdminPatientList(filter = 'all') {
  const container = document.getElementById('adminPatientListContainer');
  if (!container) return;
  const query = doctorNormalize(doctorWorkspace.query.trim());
  const order = { urgent: 0, pending: 1, reviewed: 2 };
  const list = appState.patients.filter(patient => (filter === 'all' || patient.status === filter) && doctorNormalize(`${patient.name} ${patient.id} ${patient.phone}`).includes(query)).sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));
  container.innerHTML = !appState.patients.length ? `<div class="df-empty">${doctorIcon('inbox')}<h3>Chưa có kết quả đánh giá</h3><p>Hồ sơ sẽ xuất hiện khi bệnh nhân hoàn tất đánh giá.</p></div>` : list.length ? doctorPatientTable(list) : `<div class="df-empty">${doctorIcon('search-x')}<h3>Không tìm thấy hồ sơ</h3><p>Thử tên, mã hồ sơ hoặc trạng thái khác.</p><button class="df-text-button" onclick="resetDoctorFilters()">Xóa bộ lọc</button></div>`;
  document.getElementById('doctorResultCount').textContent = `${list.length} hồ sơ`;
  renderDoctorOverview();
  renderDoctorSchedule();
  refreshDoctorNotifications();
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
  document.getElementById('doctorGreeting').textContent = `Xin chào, ${appState.currentDoctor.name}`;
  document.getElementById('doctorHeaderRoom').textContent = [appState.currentDoctor.clinicRoom, appState.currentDoctor.department].filter(Boolean).join(' · ') || 'Chưa cập nhật thông tin phòng khám';
  document.getElementById('doctorHeaderClinic').textContent = appState.currentDoctor.clinicRoom;
  document.getElementById('doctorSidebarName').textContent = appState.currentDoctor.name;
  document.getElementById('doctorSidebarRoom').textContent = appState.currentDoctor.clinicRoom;
  document.getElementById('doctorSidebarAvatar').innerHTML = doctorInitials(appState.currentDoctor.name);
  document.getElementById('doctorSidebarCount').textContent = records.length;
  document.getElementById('doctorToday').textContent = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(new Date());
  document.getElementById('doctorWorkload').textContent = !records.length ? 'Chưa có hồ sơ' : waiting.length ? `${waiting.length} hồ sơ cần xem` : 'Đã xem hết hồ sơ';
  document.getElementById('doctorWorkloadHint').textContent = urgent.length ? `${urgent.length} hồ sơ được đánh dấu ưu tiên trong danh sách.` : 'Theo dõi hồ sơ và lịch hẹn của bạn tại đây.';
  const first = urgent[0] || waiting[0];
  const action = document.getElementById('doctorReviewNext');
  action.disabled = !first;
  if (first) action.dataset.doctorRecord = first.id;
  else delete action.dataset.doctorRecord;
  document.getElementById('doctorOverviewStats').innerHTML = [
    ['all', records.length, 'Tổng hồ sơ', 'users-round', 'Tất cả bệnh nhân'], ['pending', records.filter(patient => patient.status === 'pending').length, 'Đang chờ xem', 'clipboard-list', 'Cần xem xét hồ sơ'], ['urgent', urgent.length, 'Hồ sơ ưu tiên', 'flag', 'Ưu tiên xử lý trước'], ['reviewed', reviewed.length, 'Đã xem xét', 'circle-check', 'Đã có nhận xét']
  ].map(([status, count, label, icon, hint]) => `<button class="df-stat df-stat--${status}" onclick="showDoctorCases('${status}')"><span class="dw-stat-top"><span>${label}</span><i class="dw-stat-icon">${doctorIcon(icon)}</i></span><strong>${count}</strong><span class="dw-stat-hint">${hint} ${doctorIcon('arrow-up-right')}</span></button>`).join('');
  document.getElementById('doctorPriorityList').innerHTML = waiting.length ? [...urgent, ...waiting.filter(patient => patient.status !== 'urgent')].slice(0, 2).map(patient => doctorCaseCard(patient, true)).join('') : `<div class="df-empty">${doctorIcon('circle-check')}<h3>${records.length ? 'Không còn hồ sơ chờ xem' : 'Chưa có hồ sơ bệnh nhân'}</h3><p>${records.length ? 'Bạn có thể xem lại các hồ sơ đã xử lý.' : 'Kết quả mới của bệnh nhân sẽ xuất hiện tại đây.'}</p></div>`;
  const percent = records.length ? Math.round(reviewed.length / records.length * 100) : 0;
  document.getElementById('doctorProgressLabel').textContent = `${reviewed.length}/${records.length} hồ sơ`;
  document.getElementById('doctorProgress').value = percent;
  document.getElementById('doctorProgressPercent').textContent = `${percent}%`;
  document.getElementById('doctorProgressRing').style.setProperty('--progress', `${percent}%`);
  const todayAppointments = doctorWorkspace.appointments.filter(item => item.date === doctorLocalDate() && item.status === 'scheduled').map(item => ({ ...item, patient: records.find(patient => patient.id === item.patientId) })).filter(item => item.patient).sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById('doctorTodayAppointmentCount').textContent = `${todayAppointments.length} lịch đang hẹn trong ngày`;
  document.getElementById('doctorTodayAppointments').innerHTML = todayAppointments.length ? todayAppointments.map(item => `<button class="dw-agenda-item" data-doctor-record="${doctorText(item.patientId)}"><time>${doctorText(item.time)}</time><span><strong>${doctorText(item.patient.name)}</strong><small>${doctorText(doctorAppointmentTypes[item.type])}</small></span>${doctorIcon('chevron-right')}</button>`).join('') : `<div class="df-empty dw-agenda-empty">${doctorIcon('calendar-check')}<h3>Chưa có lịch hẹn hôm nay</h3><p>Lên lịch để theo dõi buổi hẹn tiếp theo.</p><button class="df-text-button" onclick="switchDoctorTab('schedule'); openDoctorAppointment()">Tạo lịch hẹn</button></div>`;
}
function renderDoctorWeek(date) {
  const selected = new Date(date + 'T12:00:00');
  const monday = new Date(selected);
  monday.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
  document.getElementById('doctorWeekStrip').innerHTML = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + offset);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const hasAppointments = doctorWorkspace.appointments.some(item => item.date === key && item.status === 'scheduled');
    return `<button data-doctor-date="${key}" ${key === date ? 'aria-current="date"' : ''} aria-label="${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(day)}"><span>${['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day.getDay()]}</span><strong>${day.getDate()}</strong><i class="${hasAppointments ? 'has-appointments' : ''}"></i></button>`;
  }).join('');
}
function renderDoctorSchedule() {
  const date = doctorWorkspace.date || doctorLocalDate();
  document.getElementById('doctorScheduleDate').value = date;
  renderDoctorWeek(date);
  const appointments = doctorWorkspace.appointments.filter(item => item.date === date).map(appointment => ({ ...appointment, patient: appState.patients.find(patient => patient.id === appointment.patientId) })).filter(appointment => appointment.patient).sort((a, b) => a.time.localeCompare(b.time));
  const planned = appointments.filter(item => item.status === 'scheduled').length;
  document.getElementById('doctorScheduleCount').textContent = `${planned} lịch đang hẹn · ${appointments.length} tổng lịch`;
  document.getElementById('doctorScheduleRoom').textContent = appState.currentDoctor.clinicRoom;
  document.getElementById('doctorScheduleList').innerHTML = appointments.length ? appointments.map(item => `<article class="df-appointment"><div class="df-appointment-time"><time>${doctorText(item.time)}</time><span class="df-timeline-dot"></span></div><div class="df-appointment-card"><span class="df-eyebrow">${doctorText(doctorAppointmentTypes[item.type])}</span><h3>${doctorText(item.patient.name)}</h3><p>${doctorText(item.patient.id)} · ${doctorText(item.patient.age)} tuổi</p>${item.note ? `<p class="df-appointment-note">${doctorText(item.note)}</p>` : ''}<div class="df-appointment-footer"><span class="df-status df-status--${item.status === 'completed' ? 'reviewed' : 'pending'}">${{ scheduled: 'Đã lên lịch', completed: 'Hoàn tất', cancelled: 'Đã hủy' }[item.status]}</span><button class="df-text-button" data-doctor-record="${doctorText(item.patient.id)}">Hồ sơ ${doctorIcon('arrow-up-right')}</button></div><div class="df-appointment-actions">${item.status === 'scheduled' ? `<button data-appointment-edit="${doctorText(item.id)}">Sửa lịch</button><button data-appointment-status="completed" data-appointment-id="${doctorText(item.id)}">Hoàn tất</button><button data-appointment-status="cancelled" data-appointment-id="${doctorText(item.id)}">Hủy lịch</button>` : `<button data-appointment-status="scheduled" data-appointment-id="${doctorText(item.id)}">Mở lại lịch</button>`}</div></div></article>`).join('') : `<div class="df-empty">${doctorIcon('calendar-days')}<h3>Chưa có lịch hẹn trong ngày</h3><p>Chọn ngày khác hoặc tạo lịch hẹn mới.</p><button class="df-text-button" onclick="openDoctorAppointment()">Tạo lịch hẹn</button></div>`;
}
function switchDoctorTab(tabId) {
  if (!isDoctorAuthenticated() || !['cases', 'schedule', 'analytics', 'profile'].includes(tabId)) return;
  closeDoctorMenus(false);
  doctorWorkspace.tab = tabId;
  for (const [tab, suffix] of [['cases', 'Cases'], ['schedule', 'Schedule'], ['analytics', 'Analytics'], ['profile', 'Profile']]) {
    const active = tab === tabId;
    const panel = document.getElementById(`docSubpage${suffix}`);
    panel.hidden = !active;
    if (active) panel.scrollTop = 0;
    const button = document.getElementById(`docNav_${tab}`);
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  document.getElementById('doctorScreenTitle').textContent = { analytics: 'Tổng quan', cases: 'Hồ sơ bệnh nhân', schedule: 'Lịch hẹn', profile: 'Hồ sơ bác sĩ' }[tabId];
  renderDoctorMenus();
  if (tabId === 'profile') renderDoctorProfile();
  renderAdminPatientList(appState.activeFilter);
}
function goBackDoctorPage() {
  switchDoctorTab('analytics');
  focusDoctorNavigation();
}
function focusDoctorNavigation() {
  const link = document.getElementById(`docNav_${doctorWorkspace.tab}`);
  (link?.getClientRects().length ? link : document.getElementById('doctorMenuButton')).focus();
}
function doctorDetail(label, value) { return `<div class="df-detail-row"><dt>${label}</dt><dd>${doctorText(value || 'Chưa có thông tin')}</dd></div>`; }
function openPatientDossier(patientId) {
  if (!isDoctorAuthenticated()) return;
  const patient = appState.patients.find(item => item.id === patientId);
  if (!patient) return;
  appState.currentViewingPatientId = patientId;
  doctorWorkspace.returnFocus = document.activeElement;
  document.getElementById('dossierPatientName').textContent = patient.name;
  document.getElementById('dossierRecordId').textContent = `${patient.id} · ${patient.gender} · ${patient.age} tuổi`;
  document.getElementById('dossierPatientSummary').innerHTML = `<span class="df-avatar">${doctorInitials(patient.name)}</span><div><span class="df-eyebrow">KẾT QUẢ ĐÁNH GIÁ</span><p class="df-assessment-result">${doctorText(patient.resultTitle)}</p></div>${doctorStatus(patient)}<p class="df-summary-meta">${doctorIcon('phone')} ${doctorText(patient.phone || 'Chưa có số điện thoại')}<br>${doctorText(patient.submittedAt)}</p><p class="df-shared-explanation">${doctorText(patient.explanation)}</p>`;
  document.getElementById('dossierPanel_survey').innerHTML = `<dl>${(patient.answers || []).map(item => doctorDetail(item.label, item.answer)).join('')}${patient.supplementalScreening === 'not-collected' ? '' : doctorDetail('Vùng lưỡi do bệnh nhân mô tả', patient.tongueRegion) + doctorDetail('Dấu hiệu cần lưu ý', patient.warningSigns?.join(', ') || 'Không ghi nhận trong bảng hỏi')}${doctorDetail('Lời nhắn cho bác sĩ', patient.patientNote)}</dl>`;
  document.getElementById('dossierPanel_photo').innerHTML = `<figure class="df-photo"><img id="dossierPhotoImg" alt="Ảnh đính kèm hồ sơ" hidden><figcaption id="dossierPhotoCaption">Chưa có ảnh đính kèm</figcaption></figure><dl>${doctorDetail('Góc chụp', patient.photoAngle)}${patient.supplementalScreening === 'not-collected' ? '' : doctorDetail('Vùng lưỡi do bệnh nhân mô tả', patient.tongueRegion)}${doctorDetail('Mô tả của bệnh nhân', patient.patientNote)}</dl>`;
  const photo = document.getElementById('dossierPhotoImg');
  if (/^(https?:\/\/|data:image\/(?:jpeg|png|svg\+xml)[;,])/i.test(patient.photoUrl || '')) {
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
  if (!document.getElementById('doctorAppointmentDialog').open) {
    if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus();
    else if (appState.currentScreen === 'screen-doctor') focusDoctorNavigation();
  }
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
  if (!isDoctorAuthenticated()) return;
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
  doctorWorkspace.changes[patient.id] = { doctorDiagnosis: patient.doctorDiagnosis, status: patient.status, doctorName: appState.currentDoctor.name, updatedAt: Date.now() };
  const saved = persistDoctorWorkspace();
  renderAdminPatientList(appState.activeFilter);
  closePatientDossier();
  showToast(saved ? 'Đã lưu nhận xét và đánh dấu hồ sơ đã xem.' : 'Đã cập nhật trong phiên này. Không lưu được vào trình duyệt.');
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
