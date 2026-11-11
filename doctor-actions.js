/* Header navigation, profile and appointment actions for the doctor workspace. */
function renderDoctorMenus() {
  const item = (tab, label, icon) => `<button class="pf-header-menu__item" role="menuitem" onclick="switchDoctorTab('${tab}')" ${doctorWorkspace.tab === tab ? 'aria-current="page"' : ''}>${doctorIcon(icon)} ${label}</button>`;
  document.getElementById('doctorNavigationMenu').innerHTML = item('analytics', 'Tổng quan', 'house') + item('cases', 'Hồ sơ bệnh nhân', 'clipboard-list') + item('schedule', 'Lịch hẹn', 'calendar-days') + item('profile', 'Hồ sơ bác sĩ', 'user-round');
  document.getElementById('doctorProfileMenu').innerHTML = `<div class="pf-header-menu__identity">${doctorText(appState.currentDoctor.name)}</div>${item('profile', 'Thông tin cá nhân', 'user-round')}${item('schedule', 'Lịch làm việc', 'calendar-days')}<button class="pf-header-menu__item pf-header-menu__item--separated" role="menuitem" onclick="logout()">${doctorIcon('log-out')} Đăng xuất</button>`;
}
function closeDoctorMenus(restoreFocus = true) {
  const open = doctorWorkspace.menu;
  for (const [panel, trigger] of Object.values(doctorHeaderPanels)) {
    document.getElementById(panel).hidden = true;
    document.getElementById(trigger).setAttribute('aria-expanded', 'false');
  }
  doctorWorkspace.menu = null;
  document.getElementById('doctorMenuBackdrop').hidden = true;
  const screen = document.getElementById('screen-doctor');
  screen.classList.remove('pf-menu-open');
  screen.querySelectorAll('.df-page, .dw-sidebar').forEach(element => { element.inert = false; });
  if (open && restoreFocus) document.getElementById(doctorHeaderPanels[open][1]).focus();
}
function toggleDoctorMenu(name) {
  if (!isDoctorAuthenticated() || !doctorHeaderPanels[name]) return;
  const same = doctorWorkspace.menu === name;
  closeDoctorMenus(false);
  if (same) return;
  renderDoctorMenus();
  refreshDoctorNotifications();
  doctorWorkspace.menu = name;
  const [panel, trigger] = doctorHeaderPanels[name];
  document.getElementById(panel).hidden = false;
  document.getElementById(trigger).setAttribute('aria-expanded', 'true');
  document.getElementById('doctorMenuBackdrop').hidden = false;
  const screen = document.getElementById('screen-doctor');
  screen.classList.add('pf-menu-open');
  screen.querySelectorAll('.df-page, .dw-sidebar').forEach(element => { element.inert = true; });
  doctorIcons();
  (document.getElementById(panel).querySelector('button:not(:disabled)') || document.getElementById(panel)).focus();
}
function doctorNotifications() {
  return appState.patients.filter(patient => patient.status !== 'reviewed').sort((a, b) => Number(b.status === 'urgent') - Number(a.status === 'urgent'));
}
function refreshDoctorNotifications() {
  const records = doctorNotifications();
  const unread = records.filter(patient => !doctorWorkspace.readIds.includes(`${patient.id}:${patient.status}`));
  const badge = document.getElementById('doctorNotificationBadge');
  badge.hidden = !unread.length;
  badge.textContent = unread.length > 9 ? '9+' : unread.length;
  document.getElementById('doctorNotificationButton').setAttribute('aria-label', unread.length ? `Thông báo bác sĩ, ${unread.length} chưa đọc` : 'Thông báo bác sĩ');
  document.getElementById('doctorNotificationPanel').innerHTML = `<div class="pf-notification-heading"><h2 id="doctorNotificationTitle">Thông báo</h2><button class="pf-notification-read-all" onclick="markDoctorNotificationsRead()" ${unread.length ? '' : 'disabled'}>Đọc tất cả</button></div>${records.length ? `<div class="pf-notification-list">${records.map(patient => `<button class="pf-notification-item ${unread.includes(patient) ? 'is-unread' : ''}" data-doctor-notification="${doctorText(patient.id)}"><span class="pf-notification-icon">${doctorIcon(patient.status === 'urgent' ? 'flag' : 'clipboard-list')}</span><span class="pf-notification-copy"><strong>${doctorText(patient.name)}</strong><span>${patient.status === 'urgent' ? 'Hồ sơ ưu tiên cần xem xét' : 'Hồ sơ đang chờ nhận xét'}</span><time>${doctorText(patient.submittedAt)}</time></span><span class="pf-notification-dot"></span></button>`).join('')}</div>` : `<div class="pf-notification-empty">${doctorIcon('bell-check')}<strong>${appState.patients.length ? 'Bạn đã xem hết hồ sơ' : 'Chưa có hồ sơ mới'}</strong><p>Thông báo về hồ sơ chờ xem sẽ xuất hiện tại đây.</p></div>`}`;
}
function markDoctorNotificationsRead() {
  if (!isDoctorAuthenticated()) return;
  doctorWorkspace.readIds = [...new Set([...doctorWorkspace.readIds, ...doctorNotifications().map(patient => `${patient.id}:${patient.status}`)])];
  const saved = persistDoctorWorkspace();
  refreshDoctorNotifications();
  doctorIcons();
  document.getElementById('doctorNotificationPanel').focus();
  if (!saved) showToast('Trạng thái đã đọc chỉ được giữ trong phiên này.');
}
function openDoctorNotification(id) {
  const patient = appState.patients.find(item => item.id === id);
  if (!patient || !isDoctorAuthenticated()) return;
  doctorWorkspace.readIds = [...new Set([...doctorWorkspace.readIds, `${patient.id}:${patient.status}`])];
  persistDoctorWorkspace();
  closeDoctorMenus();
  refreshDoctorNotifications();
  openPatientDossier(id);
}
function renderDoctorProfile() {
  const doctor = appState.currentDoctor;
  document.getElementById('doctorProfileName').textContent = doctor.name;
  document.getElementById('doctorProfileAccount').textContent = `Tài khoản: ${appState.currentUser.username}`;
  document.getElementById('doctorName').value = doctor.name;
  document.getElementById('doctorDepartment').value = doctor.department;
  document.getElementById('doctorRoom').value = doctor.clinicRoom;
}
function saveDoctorProfile(event) {
  event.preventDefault();
  if (!isDoctorAuthenticated()) return;
  const profile = {};
  for (const [key, id] of [['name', 'doctorName'], ['department', 'doctorDepartment'], ['clinicRoom', 'doctorRoom']]) {
    const input = document.getElementById(id);
    input.setCustomValidity(input.value.trim() ? '' : 'Vui lòng nhập thông tin.');
    if (!input.reportValidity()) return;
    profile[key] = input.value.trim();
  }
  appState.currentDoctor = profile;
  const saved = persistDoctorWorkspace();
  renderDoctorProfile();
  renderDoctorMenus();
  renderAdminPatientList(appState.activeFilter);
  showToast(saved ? 'Đã lưu thông tin bác sĩ.' : 'Thông tin chỉ được giữ trong phiên này. Không lưu được vào trình duyệt.');
}
function setDoctorScheduleDate(date) {
  if (!validDoctorDate(date)) { document.getElementById('doctorScheduleDate').value = doctorWorkspace.date; return; }
  doctorWorkspace.date = date;
  renderDoctorSchedule();
  doctorIcons();
}
function openDoctorAppointment(patientId = '', appointmentId = '') {
  if (!isDoctorAuthenticated()) return;
  const appointment = doctorWorkspace.appointments.find(item => item.id === appointmentId);
  if (appointmentId && !appointment) return;
  if (!appState.patients.length) { showToast('Chưa có hồ sơ bệnh nhân để tạo lịch hẹn.'); return; }
  doctorWorkspace.appointmentReturnFocus = document.activeElement;
  doctorWorkspace.editingAppointment = appointment?.id || null;
  document.getElementById('doctorAppointmentTitle').textContent = appointment ? 'Chỉnh sửa lịch hẹn' : 'Tạo lịch hẹn';
  const select = document.getElementById('doctorAppointmentPatient');
  select.innerHTML = '<option value="">Chọn bệnh nhân</option>' + appState.patients.map(patient => `<option value="${doctorText(patient.id)}">${doctorText(patient.name)} · ${doctorText(patient.id)}</option>`).join('');
  select.value = appointment?.patientId || patientId;
  document.getElementById('doctorAppointmentDate').value = appointment?.date || doctorWorkspace.date || doctorLocalDate();
  document.getElementById('doctorAppointmentTime').value = appointment?.time || '';
  document.getElementById('doctorAppointmentType').value = appointment?.type || 'consultation';
  document.getElementById('doctorAppointmentNote').value = appointment?.note || '';
  document.getElementById('doctorAppointmentError').hidden = true;
  document.getElementById('doctorAppointmentDialog').showModal();
  select.focus();
  doctorIcons();
}
function closeDoctorAppointment() { document.getElementById('doctorAppointmentDialog').close(); }
function finishDoctorAppointment() {
  const trigger = doctorWorkspace.appointmentReturnFocus;
  if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus();
  else if (appState.currentScreen === 'screen-doctor') focusDoctorNavigation();
  doctorWorkspace.editingAppointment = null;
}
function scheduleDoctorPatient() {
  const patientId = appState.currentViewingPatientId;
  closePatientDossier();
  switchDoctorTab('schedule');
  openDoctorAppointment(patientId);
}
function doctorScheduleConflict(candidate) {
  return doctorWorkspace.appointments.some(item => item.id !== candidate.id && item.status === 'scheduled' && item.date === candidate.date && item.time === candidate.time);
}
function saveDoctorAppointment(event) {
  event.preventDefault();
  if (!isDoctorAuthenticated()) return;
  const item = {
    id: doctorWorkspace.editingAppointment || `appt-${crypto.randomUUID()}`,
    patientId: document.getElementById('doctorAppointmentPatient').value,
    date: document.getElementById('doctorAppointmentDate').value,
    time: document.getElementById('doctorAppointmentTime').value,
    type: document.getElementById('doctorAppointmentType').value,
    note: document.getElementById('doctorAppointmentNote').value.trim(), status: 'scheduled', updatedAt: Date.now()
  };
  const error = document.getElementById('doctorAppointmentError');
  const patientExists = appState.patients.some(patient => patient.id === item.patientId);
  if (!validDoctorAppointment(item) || !patientExists || doctorScheduleConflict(item)) {
    error.textContent = doctorScheduleConflict(item) ? 'Khung giờ này đã có lịch hẹn. Vui lòng chọn giờ khác.' : 'Vui lòng chọn bệnh nhân, ngày và giờ hợp lệ.';
    error.hidden = false;
    return;
  }
  doctorWorkspace.appointments = [...doctorWorkspace.appointments.filter(old => old.id !== item.id), item];
  doctorWorkspace.date = item.date;
  const saved = persistDoctorWorkspace();
  closeDoctorAppointment();
  switchDoctorTab('schedule');
  showToast(saved ? 'Đã lưu lịch hẹn.' : 'Lịch hẹn chỉ được giữ trong phiên này. Không lưu được vào trình duyệt.');
}
function setDoctorAppointmentStatus(id, status) {
  if (!isDoctorAuthenticated() || !['scheduled', 'completed', 'cancelled'].includes(status)) return;
  const item = doctorWorkspace.appointments.find(appointment => appointment.id === id);
  if (!item) return;
  if (status === 'scheduled' && doctorScheduleConflict(item)) { showToast('Khung giờ đã có lịch khác. Hãy sửa lịch trước khi mở lại.'); return; }
  item.status = status;
  item.updatedAt = Date.now();
  const saved = persistDoctorWorkspace();
  renderDoctorSchedule();
  renderDoctorOverview();
  doctorIcons();
  document.getElementById('doctorScheduleDate').focus();
  showToast(saved ? 'Đã cập nhật trạng thái lịch hẹn.' : 'Thay đổi chỉ được giữ trong phiên này.');
}
document.addEventListener('click', event => {
  if (appState.currentScreen !== 'screen-doctor') return;
  const date = event.target.closest('[data-doctor-date]');
  if (date) { setDoctorScheduleDate(date.dataset.doctorDate); return; }
  const notification = event.target.closest('[data-doctor-notification]');
  if (notification) { openDoctorNotification(notification.dataset.doctorNotification); return; }
  const edit = event.target.closest('[data-appointment-edit]');
  if (edit) { openDoctorAppointment('', edit.dataset.appointmentEdit); return; }
  const status = event.target.closest('[data-appointment-status]');
  if (status) { setDoctorAppointmentStatus(status.dataset.appointmentId, status.dataset.appointmentStatus); return; }
  // Icon rendering may replace the clicked SVG. Use the original event path.
  if (doctorWorkspace.menu && !event.composedPath().includes(document.querySelector('#screen-doctor .pf-header'))) closeDoctorMenus(false);
});
document.addEventListener('keydown', event => {
  if (!doctorWorkspace.menu) return;
  if (event.key === 'Escape') { event.preventDefault(); closeDoctorMenus(); return; }
  const [panelId, triggerId] = doctorHeaderPanels[doctorWorkspace.menu];
  const buttons = [...document.getElementById(panelId).querySelectorAll('button:not(:disabled)')];
  if (event.key === 'Tab') {
    const controls = [document.getElementById(triggerId), ...buttons];
    const index = controls.indexOf(document.activeElement);
    event.preventDefault();
    controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
    return;
  }
  if (buttons.length && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
  }
});
document.addEventListener('input', event => {
  if (event.target.closest('#doctorProfileForm')) event.target.setCustomValidity('');
  if (event.target.closest('#doctorAppointmentForm')) document.getElementById('doctorAppointmentError').hidden = true;
});
