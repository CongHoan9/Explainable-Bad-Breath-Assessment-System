/* Notifications and consultation drafts are scoped to the signed-in account.
 * Requests are saved locally; no message is delivered to an external service.
 */
const patientCommunication = { consultations: [], readIds: [], recordId: null, returnFocus: null, restoreFocus: true };
let consultationResizeObserver = null;

function syncConsultationBounds() {
  const dialog = document.getElementById('patientConsultationDialog');
  const screen = document.getElementById('screen-patient');
  const bounds = screen.getBoundingClientRect();
  const shellStyle = getComputedStyle(screen.closest('.mobile-device-shell'));
  const radius = Math.max(0, parseFloat(shellStyle.borderBottomLeftRadius) - parseFloat(shellStyle.borderLeftWidth));
  for (const [name, value] of Object.entries({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, radius })) {
    dialog.style.setProperty(`--consultation-${name}`, `${value}px`);
  }
}
function detachConsultationLayout() {
  consultationResizeObserver?.disconnect();
  consultationResizeObserver = null;
  window.removeEventListener('resize', syncConsultationBounds);
  window.removeEventListener('scroll', syncConsultationBounds, true);
  window.visualViewport?.removeEventListener('resize', syncConsultationBounds);
  window.visualViewport?.removeEventListener('scroll', syncConsultationBounds);
}
function attachConsultationLayout() {
  detachConsultationLayout();
  syncConsultationBounds();
  consultationResizeObserver = new ResizeObserver(syncConsultationBounds);
  consultationResizeObserver.observe(document.getElementById('screen-patient'));
  window.addEventListener('resize', syncConsultationBounds);
  window.addEventListener('scroll', syncConsultationBounds, true);
  window.visualViewport?.addEventListener('resize', syncConsultationBounds);
  window.visualViewport?.addEventListener('scroll', syncConsultationBounds);
}

function resetPatientCommunication() {
  closeConsultationDialog(false);
  patientCommunication.consultations = [];
  patientCommunication.readIds = [];
}
function restorePatientCommunication(saved) {
  const seen = new Set();
  patientCommunication.consultations = (Array.isArray(saved.consultations) ? saved.consultations : []).filter(item => {
    if (!item || typeof item.recordId !== 'string' || seen.has(item.recordId)
      || !patientFlow.history.some(record => record.id === item.recordId)
      || !Number.isFinite(item.createdAt) || !Number.isFinite(item.updatedAt)
      || Number.isNaN(new Date(item.createdAt).getTime()) || Number.isNaN(new Date(item.updatedAt).getTime())
      || !['name', 'phone', 'note', 'doctorName'].every(key => typeof item[key] === 'string')) return false;
    seen.add(item.recordId);
    return true;
  }).slice(0, 12).map(item => ({ recordId: item.recordId, createdAt: item.createdAt, updatedAt: item.updatedAt,
    name: item.name.slice(0, 80), phone: item.phone.slice(0, 24), note: item.note.slice(0, 600), doctorName: item.doctorName.slice(0, 100) }));
  patientCommunication.readIds = Array.isArray(saved.readNotifications) ? saved.readNotifications.filter(id => typeof id === 'string') : [];
  prunePatientCommunication();
}
function prunePatientCommunication() {
  const records = new Set(patientFlow.history.map(record => record.id));
  patientCommunication.consultations = patientCommunication.consultations.filter(item => records.has(item.recordId)).slice(0, 12);
  const notifications = new Set(getPatientNotifications().map(item => item.id));
  patientCommunication.readIds = [...new Set(patientCommunication.readIds)].filter(id => notifications.has(id)).slice(0, 24);
}
function getPatientNotifications() {
  if (!isPatientAuthenticated()) return [];
  const results = patientFlow.history.map(record => ({ id: `result-${record.id}`, recordId: record.id, type: 'result', createdAt: record.createdAt,
    title: 'Đã cập nhật đánh giá', text: AssessmentExplanation.decide(record).title }));
  const consultations = patientCommunication.consultations.map(item => ({ id: `consultation-${item.recordId}-${item.updatedAt}`, recordId: item.recordId,
    type: 'consultation', createdAt: item.updatedAt, title: 'Đã lưu yêu cầu tư vấn', text: `${item.doctorName} · Xem lại thông tin liên hệ và lời nhắn.` }));
  const changes = SharedDataStore.read().changes;
  const reviews = patientFlow.history.flatMap(record => {
    const review = changes[SharedDataStore.caseId(patientFlow.account, record.id)];
    return review?.status === 'reviewed' && review.doctorDiagnosis ? [{ id: `review-${record.id}-${review.updatedAt}`, recordId: record.id, type: 'review', createdAt: review.updatedAt,
      title: 'Bác sĩ đã nhận xét kết quả', text: review.doctorName || 'Mở kết quả để xem nhận xét.' }] : [];
  });
  return [...results, ...consultations, ...reviews].sort((a, b) => b.createdAt - a.createdAt);
}
function refreshPatientNotifications() {
  const panel = document.getElementById('patientNotificationPanel');
  const items = getPatientNotifications();
  const unread = items.filter(item => !patientCommunication.readIds.includes(item.id)).length;
  const badge = document.getElementById('patientNotificationBadge');
  badge.hidden = !unread;
  badge.textContent = unread > 9 ? '9+' : String(unread);
  document.getElementById('patientNotificationButton').setAttribute('aria-label', unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo');
  panel.innerHTML = `<div class="pf-notification-heading"><h2 id="patientNotificationTitle">Thông báo</h2>${unread ? '<button class="pf-notification-read-all" onclick="markAllPatientNotificationsRead()">Đọc tất cả</button>' : ''}</div>
    ${items.length ? `<div class="pf-notification-list">${items.map(item => `<button class="pf-notification-item ${patientCommunication.readIds.includes(item.id) ? '' : 'is-unread'}" data-notification-id="${escapePatientText(item.id)}" onclick="openPatientNotification(this.dataset.notificationId)"><span class="pf-notification-icon">${patientIcon(item.type === 'result' ? 'clipboard-check' : 'stethoscope')}</span><span class="pf-notification-copy"><strong>${escapePatientText(item.title)}</strong><span>${escapePatientText(item.text)}</span><time datetime="${new Date(item.createdAt).toISOString()}">${formatAssessmentDate(item.createdAt)}</time></span><span class="pf-notification-dot" aria-label="${patientCommunication.readIds.includes(item.id) ? 'Đã đọc' : 'Chưa đọc'}"></span></button>`).join('')}</div>`
      : `<div class="pf-notification-empty">${patientIcon('bell')}<strong>Chưa có thông báo</strong><p>${isPatientAuthenticated() ? 'Thông báo sẽ xuất hiện khi bạn hoàn tất chẩn đoán hoặc lưu yêu cầu tư vấn.' : 'Đăng nhập để xem thông báo của bạn.'}</p>${isPatientAuthenticated() ? '' : '<button class="pf-primary" onclick="beginSignIn(\'home\')">Đăng nhập</button>'}</div>`}`;
  refreshPatientIcons();
}
function markAllPatientNotificationsRead() {
  patientCommunication.readIds = getPatientNotifications().map(item => item.id);
  persistPatientData();
  refreshPatientNotifications();
  const panel = document.getElementById('patientNotificationPanel');
  (panel.querySelector('button') || panel).focus();
}
function openPatientNotification(id) {
  const item = getPatientNotifications().find(notification => notification.id === id);
  if (!item) return;
  if (!patientCommunication.readIds.includes(id)) patientCommunication.readIds.push(id);
  persistPatientData();
  closePatientMenus(false);
  refreshPatientNotifications();
  if (item.type === 'consultation') {
    document.getElementById('patientNotificationButton').focus();
    openDoctorConsultation(item.recordId);
  }
  else viewAssessment(item.recordId);
}
function openDoctorConsultation(recordId) {
  if (!requirePatientSession('history')) return;
  const record = patientFlow.history.find(item => item.id === recordId);
  if (!record) { showToast('Không tìm thấy kết quả để liên hệ bác sĩ.'); return; }
  const existing = patientCommunication.consultations.find(item => item.recordId === recordId);
  const doctor = appState.currentDoctor;
  const dialog = document.getElementById('patientConsultationDialog');
  const trigger = document.activeElement;
  patientCommunication.returnFocus = trigger?.closest('#patientNotificationPanel') ? document.getElementById('patientNotificationButton') : trigger;
  patientCommunication.restoreFocus = true;
  patientCommunication.recordId = recordId;
  closePatientMenus(false);
  dialog.innerHTML = `<header class="pf-consultation-heading"><div><p>YÊU CẦU TƯ VẤN</p><h2 id="patientConsultationTitle">Liên hệ bác sĩ</h2></div><button type="button" class="pf-header-button" onclick="closeConsultationDialog()" aria-label="Đóng biểu mẫu tư vấn">${patientIcon('x')}</button></header>
    <form id="patientConsultationForm" onsubmit="saveDoctorConsultation(event)">
      <div class="pf-consultation-body">
        <section class="pf-consultation-doctor"><span class="pf-consultation-avatar">${patientIcon('stethoscope')}</span><div><h3>${escapePatientText(doctor.name)}</h3><p>${escapePatientText(doctor.department)}</p><span>${patientIcon('map-pin')}${escapePatientText(doctor.clinicRoom)}</span></div></section>
        <div class="pf-consultation-result"><span>${patientIcon('paperclip')} Kết quả đính kèm</span><strong>${escapePatientText(AssessmentExplanation.decide(record).title)}</strong><p>${escapePatientText(AssessmentExplanation.decide(record).text)}</p><time datetime="${new Date(record.createdAt).toISOString()}">${formatAssessmentDate(record.createdAt)}</time></div>
        ${existing ? `<p class="pf-consultation-saved">${patientIcon('circle-check')} Yêu cầu đã lưu lúc ${formatAssessmentDate(existing.updatedAt)}.</p>` : ''}
        <label for="consultationName">Họ và tên<input id="consultationName" name="name" value="${escapePatientText(existing?.name ?? patientFlow.profile.name)}" required maxlength="80" autocomplete="name"></label>
        <label for="consultationPhone">Số điện thoại liên hệ<input id="consultationPhone" name="phone" type="tel" value="${escapePatientText(existing?.phone ?? patientFlow.profile.phone)}" required maxlength="24" autocomplete="tel" placeholder="Nhập số điện thoại" oninput="this.setCustomValidity('')"></label>
        <label for="consultationNote"><span class="pf-consultation-note-label">Lời nhắn cho bác sĩ <small>(không bắt buộc)</small></span><textarea id="consultationNote" name="note" rows="3" maxlength="600" placeholder="Bạn muốn trao đổi điều gì?">${escapePatientText(existing?.note ?? '')}</textarea></label>
        <p class="pf-consultation-hint">Nội dung được lưu cùng kết quả đánh giá để bạn xem lại.</p>
      </div>
      <footer class="pf-consultation-actions"><button type="button" class="pf-secondary" onclick="closeConsultationDialog()">Để sau</button><button type="submit" class="pf-primary">${existing ? 'Cập nhật yêu cầu' : 'Lưu yêu cầu tư vấn'}</button></footer>
    </form>`;
  refreshPatientIcons();
  attachConsultationLayout();
  dialog.showModal();
  dialog.querySelector('.pf-consultation-heading button').focus();
}
function closeConsultationDialog(restoreFocus = true) {
  const dialog = document.getElementById('patientConsultationDialog');
  if (!dialog?.open) return;
  patientCommunication.restoreFocus = restoreFocus;
  dialog.close();
}
function finishConsultationDialog() {
  detachConsultationLayout();
  const trigger = patientCommunication.returnFocus;
  patientCommunication.recordId = null;
  patientCommunication.returnFocus = null;
  if (patientCommunication.restoreFocus && trigger?.isConnected && trigger.getClientRects().length) trigger.focus();
}
function saveDoctorConsultation(event) {
  event.preventDefault();
  if (!isPatientAuthenticated()) { closeConsultationDialog(false); return; }
  const recordId = patientCommunication.recordId;
  if (!patientFlow.history.some(item => item.id === recordId)) { closeConsultationDialog(); showToast('Kết quả không còn trong lịch sử.'); return; }
  const nameInput = document.getElementById('consultationName');
  const phoneInput = document.getElementById('consultationPhone');
  const name = nameInput.value.trim(), phone = phoneInput.value.trim();
  if (!name) { nameInput.focus(); showToast('Vui lòng nhập họ và tên.'); return; }
  const digits = phone.replace(/\D/g, '');
  if (!/^[+\d\s().-]+$/.test(phone) || digits.length < 8 || digits.length > 15) {
    phoneInput.setCustomValidity('Nhập số điện thoại hợp lệ, từ 8 đến 15 chữ số.');
    phoneInput.reportValidity();
    return;
  }
  const existing = patientCommunication.consultations.find(item => item.recordId === recordId);
  const now = Date.now();
  const request = { recordId, name, phone, note: document.getElementById('consultationNote').value.trim(), doctorName: appState.currentDoctor.name,
    createdAt: existing?.createdAt ?? now, updatedAt: now };
  patientCommunication.consultations = [request, ...patientCommunication.consultations.filter(item => item.recordId !== recordId)];
  prunePatientCommunication();
  const saved = persistPatientData();
  closeConsultationDialog();
  refreshPatientNotifications();
  showToast(saved ? 'Đã lưu yêu cầu tư vấn của bạn.' : 'Yêu cầu đang được giữ trong phiên này. Không lưu được vào trình duyệt.');
}
