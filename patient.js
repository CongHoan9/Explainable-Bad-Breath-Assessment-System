/* Patient journey: capture → confirm → questionnaire → explained result.
 * Replace evaluateAssessment() with the inference service when it is available.
 * Image annotations are reference regions, not detected lesions or a model heatmap.
 */
const ASSESSMENT_QUESTIONS = [
  { title: 'Hơi thở có mùi thường xuyên thế nào?', short: 'Tần suất có mùi', options: ['Không nhận thấy có mùi', 'Thỉnh thoảng, sau khi ngủ dậy hoặc ăn uống', 'Thường xuyên trong ngày', 'Gần như liên tục trong ngày'] },
  { title: 'Người khác có nhận xét hơi thở có mùi?', short: 'Nhận xét từ người khác', options: ['Chưa có ai nhận xét', 'Có, nhưng rất hiếm', 'Đôi khi có người nhận xét', 'Thường xuyên có người nhận xét'] },
  { title: 'Bạn có thường bị khô miệng?', short: 'Cảm giác khô miệng', options: ['Không bị khô miệng', 'Thỉnh thoảng hơi khô', 'Thường khô miệng sau khi thức dậy', 'Khô miệng thường xuyên cả ngày'] },
  { title: 'Lớp rêu lưỡi trong ảnh như thế nào?', short: 'Mô tả rêu lưỡi', options: ['Hầu như không có rêu lưỡi', 'Lớp rêu mỏng, chỉ ở một vài vùng', 'Rêu thấy rõ ở vùng giữa và cuống lưỡi', 'Rêu dày, phủ phần lớn bề mặt lưỡi'] },
  { title: 'Bạn làm sạch lưỡi thường xuyên thế nào?', short: 'Vệ sinh lưỡi', options: ['Hàng ngày', 'Vài lần mỗi tuần', 'Rất ít khi', 'Chưa có thói quen làm sạch lưỡi'] }
];
const ASSESSMENT_LEVELS = [
  { name: 'Không đáng kể', color: '#059669', background: '#ecfdf5', text: 'Các câu trả lời của bạn ghi nhận ít dấu hiệu về mùi hơi thở.' },
  { name: 'Mức độ nhẹ', color: '#0d9488', background: '#f0fdfa', text: 'Bạn ghi nhận một số dấu hiệu nhẹ hoặc không thường xuyên.' },
  { name: 'Mức độ trung bình', color: '#b45309', background: '#fffbeb', text: 'Nhiều dấu hiệu về mùi hơi thở được ghi nhận trong câu trả lời.' },
  { name: 'Mức độ cao', color: '#e11d48', background: '#fff1f2', text: 'Các câu trả lời ghi nhận nhiều dấu hiệu xuất hiện thường xuyên.' }
];
const patientFlow = { tab: 'home', history: [], profile: {}, account: '', draft: null, resultId: null, stream: null, operation: 0, completing: false, error: '', overlay: true, resultSlide: 0 };

function escapePatientText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function patientIcon(name) { return `<i data-lucide="${name}" aria-hidden="true"></i>`; }
function refreshPatientIcons() { if (window.lucide) window.lucide.createIcons(); }

function initPatientApp() {
  stopPatientCamera();
  resetPatientHistory();
  resetPatientCommunication();
  const signedIn = isPatientAuthenticated();
  patientFlow.account = signedIn ? appState.currentUser.username.trim().toLocaleLowerCase('vi') : '';
  patientFlow.history = [];
  patientFlow.profile = { name: signedIn ? appState.currentUser.username : '', phone: signedIn ? appState.currentUser.phone : '', age: '', gender: '' };
  try {
    const saved = signedIn ? SharedDataStore.patient(patientFlow.account) : null;
    if (saved && Array.isArray(saved.history)) {
      patientFlow.history = saved.history.filter(isValidAssessment).slice(0, 12);
      if (saved.profile && typeof saved.profile === 'object') {
        for (const key of ['name', 'phone', 'age', 'gender']) {
          if (typeof saved.profile[key] === 'string') patientFlow.profile[key] = saved.profile[key];
        }
      }
      restorePatientCommunication(saved);
    }
  } catch { /* An unavailable or damaged local store must not prevent using the app. */ }
  patientFlow.draft = null;
  patientFlow.resultId = null;
  patientFlow.resultSlide = 0;
  patientFlow.completing = false;
  patientFlow.error = '';
  renderPatientTab('home');
}
function isValidAssessment(record) {
  return record && typeof record.id === 'string' && /^[a-z0-9-]+$/.test(record.id)
    && Number.isInteger(record.level) && record.level >= 0 && record.level <= 3
    && Array.isArray(record.answers) && record.answers.length === ASSESSMENT_QUESTIONS.length
    && record.answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 3)
    && typeof record.photo === 'string' && /^data:image\/(jpeg|png|svg\+xml)[;,]/.test(record.photo)
    && Number.isFinite(record.brightness) && Number.isFinite(record.createdAt);
}
function persistPatientData() {
  if (!isPatientAuthenticated()) return false;
  return SharedDataStore.savePatient(patientFlow.account, { profile: patientFlow.profile, history: patientFlow.history, consultations: patientCommunication.consultations, readNotifications: patientCommunication.readIds });
}
function newAssessmentDraft() {
  return { stage: 'guide', guidanceAccepted: false, photo: '', photoKind: '', brightness: 0, confirmed: false, questionIndex: 0, answers: Array(ASSESSMENT_QUESTIONS.length).fill(null), tongueRegion: 'unspecified', warningSigns: [], warningScreened: false };
}
function startAssessment() {
  if (!requirePatientSession('diagnosis')) return;
  stopPatientCamera();
  patientFlow.draft = newAssessmentDraft();
  patientFlow.resultId = null;
  patientFlow.resultSlide = 0;
  patientFlow.completing = false;
  patientFlow.error = '';
  renderPatientTab('diagnosis');
}
function renderPatientTab(tab) {
  if (!['home', 'diagnosis', 'history', 'profile', 'information', 'settings'].includes(tab)) return;
  if (['diagnosis', 'profile', 'information'].includes(tab) && !requirePatientSession(tab)) return;
  closeConsultationDialog(false);
  closePatientMenus();
  if (tab !== 'diagnosis') stopPatientCamera();
  if (tab === 'information' && patientFlow.tab !== 'information') patientNavigation.informationParent = patientFlow.tab === 'profile' ? 'profile' : 'home';
  patientFlow.tab = tab;
  const titles = { home: 'Trang chủ', diagnosis: 'Chẩn đoán', history: 'Lịch sử', profile: 'Hồ sơ cá nhân', information: 'Thông tin cá nhân', settings: 'Cài đặt' };
  const historyDetail = tab === 'history' && Boolean(getHistoryDetailRecord());
  document.getElementById('patientScreenTitle').textContent = historyDetail ? 'Chi tiết kết quả' : titles[tab];
  refreshPatientChrome();
  document.querySelectorAll('[data-patient-tab]').forEach(button => {
    const selected = button.dataset.patientTab === (tab === 'information' ? 'profile' : tab);
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  destroyResultCarousel();
  const content = document.getElementById('patientContent');
  content.classList.toggle('pf-results-mode', historyDetail || (tab === 'diagnosis' && patientFlow.history.some(record => record.id === patientFlow.resultId)));
  content.classList.toggle('pf-history-mode', tab === 'history' && !historyDetail);
  const cameraView = tab === 'diagnosis' && !patientFlow.resultId && patientFlow.draft?.stage === 'camera';
  content.classList.toggle('pf-camera-mode', cameraView);
  document.querySelector('.mobile-device-shell').classList.toggle('is-camera-view', cameraView);
  content.classList.toggle('pf-stage-mode', tab === 'information' || (tab === 'diagnosis' && !patientFlow.resultId && !patientFlow.completing));
  content.innerHTML = ({ home: renderPatientHome, diagnosis: renderAssessment, history: renderPatientHistory, profile: renderPatientProfile, information: renderPatientInformation, settings: renderPatientSettings })[tab]();
  content.scrollTop = 0;
  refreshPatientMenus();
  refreshPatientIcons();
  attachTongueCamera();
  attachResultCarousel();
  attachPatientHistory();
}
function renderPatientHome() {
  const doctor = appState.currentDoctor;
  const signedIn = isPatientAuthenticated();
  const name = signedIn ? patientFlow.profile.name.trim().split(/\s+/).pop() : 'bạn';
  const latest = patientFlow.history[0];
  const steps = [['camera', 'Chụp ảnh lưỡi'], ['list-checks', 'Trả lời câu hỏi'], ['chart-no-axes-column', 'Xem kết quả']];
  return `<div class="pf-home">
    <div class="pf-home-welcome"><div><p>CHĂM SÓC BẢN THÂN MỖI NGÀY</p><h2>Xin chào, ${escapePatientText(name)} <span aria-hidden="true">✦</span></h2><span>Hôm nay, hơi thở của bạn thế nào?</span></div><span class="pf-welcome-icon">${patientIcon('sprout')}</span></div>
    <section class="pf-hero pf-home-hero" aria-labelledby="homeHeroTitle">
      <span class="pf-hero-tag">${patientIcon('scan-line')} Đánh giá hơi thở</span>
      <h2 id="homeHeroTitle">Tự tin hơn trong<br>từng lời nói.</h2>
      <p>Hiểu hơn về hơi thở qua ảnh lưỡi, 5 câu hỏi và các dấu hiệu cần lưu ý.</p>
      <span class="pf-hero-art">${patientIcon('scan-line')}</span>
      <button class="pf-primary pf-hero-button" onclick="startAssessment()">Bắt đầu đánh giá ${patientIcon('arrow-right')}</button>
    </section>
    <section class="pf-card pf-home-process" aria-labelledby="homeProcessTitle">
      <div class="pf-section-title"><h3 id="homeProcessTitle">Một hành trình, 3 bước</h3><span>Đơn giản & dễ hiểu</span></div>
      <ol class="pf-home-steps">${steps.map(([icon, title], index) => `<li><span>${patientIcon(icon)}</span><small>0${index + 1}</small><strong>${title}</strong></li>`).join('')}</ol>
    </section>
    ${signedIn && latest ? `<section class="pf-home-latest"><div class="pf-section-title"><h3>Đánh giá gần nhất</h3><button class="pf-text-button" onclick="returnToPatientHistory()">Xem lịch sử ${patientIcon('arrow-right')}</button></div>${renderHistoryCard(latest)}</section>` : `<div class="pf-home-shortcuts"><button onclick="returnToPatientHistory()"><span>${patientIcon('history')}</span><strong>Lịch sử đánh giá</strong>${patientIcon('chevron-right')}</button><button onclick="renderPatientTab('profile')"><span>${patientIcon('user-round')}</span><strong>Hồ sơ của bạn</strong>${patientIcon('chevron-right')}</button></div>`}
    <section class="pf-card pf-home-doctor" aria-labelledby="homeDoctorTitle">
      <div class="pf-section-title"><h3 id="homeDoctorTitle">Bác sĩ đồng hành</h3>${patientIcon('stethoscope')}</div>
      <div class="pf-home-doctor__body"><span class="pf-home-doctor__avatar">${patientIcon('user-round')}</span><div><h4>${escapePatientText(doctor.name)}</h4><p>${escapePatientText(doctor.department)}</p><span class="pf-home-doctor__location">${patientIcon('map-pin')}${escapePatientText(doctor.clinicRoom)}</span></div></div>
    </section>
    <button class="pf-doctor-portal" onclick="beginDoctorSignIn()">${patientIcon('stethoscope')} Cổng làm việc dành cho bác sĩ ${patientIcon('arrow-up-right')}</button>
  </div>`;
}
function renderPatientProfile() {
  const latest = patientFlow.history[0];
  return `<div class="pf-greeting"><h2>Xin chào, ${escapePatientText(patientFlow.profile.name.trim().split(/\s+/).pop())}</h2><button class="pf-profile-edit" onclick="renderPatientTab('information')" aria-label="Chỉnh sửa thông tin cá nhân">${patientIcon('user-pen')}</button></div>
    <section class="pf-hero"><h2>Đánh giá hơi thở</h2><p>Chụp ảnh lưỡi, trả lời 5 câu hỏi và bổ sung dấu hiệu cần lưu ý.</p><button class="pf-primary pf-hero-button" onclick="startAssessment()">Bắt đầu chẩn đoán ${patientIcon('arrow-right')}</button></section>
    ${isPatientAuthenticated() ? `<section><div class="pf-section-title"><h3>Đánh giá gần nhất</h3></div>${latest ? renderHistoryCard(latest) : `<div class="pf-card pf-empty-inline">${patientIcon('clipboard-list')}<div><strong>Chưa có kết quả</strong><p>Bắt đầu chẩn đoán để lưu lần đánh giá đầu tiên.</p></div></div>`}</section>` : ''}`;
}
function renderFlowSteps(step) {
  return `<ol class="pf-flow-steps">${['Ảnh lưỡi', 'Câu hỏi', 'Kết quả'].map((text, index) => `<li class="${index + 1 <= step ? 'is-current' : ''}"><span>${index + 1 < step ? '✓' : index + 1}</span>${text}</li>`).join('')}</ol>`;
}
function renderPatientStage(body, actions, className = '') {
  return `<section class="pf-stage ${className}"><div class="pf-stage-body">${body}</div><footer class="pf-stage-actions">${actions}</footer></section>`;
}
function renderAssessment() {
  const result = patientFlow.history.find(record => record.id === patientFlow.resultId);
  if (result) return renderAssessmentResult(result);
  if (!patientFlow.draft) patientFlow.draft = newAssessmentDraft();
  if (patientFlow.completing) return `${renderFlowSteps(3)}<div class="pf-processing" role="status"><div class="pf-spinner"></div><h2>Đang tổng hợp kết quả</h2><p>Chuẩn bị ảnh và phần giải thích của bạn…</p></div>`;
  if (patientFlow.draft.stage === 'questions') return renderAssessmentQuestion();
  if (patientFlow.draft.stage === 'safety') return renderAssessmentSafety();
  if (patientFlow.draft.stage === 'quality-error') return renderPatientStage(`<div class="pf-intro"><h2>Ảnh chưa đạt yêu cầu</h2></div><p class="pf-error" role="alert">${escapePatientText(patientFlow.error)}</p>`, '<button class="pf-secondary" onclick="renderPatientTab(\'home\')">Trang chủ</button><button class="pf-primary" onclick="retakeTonguePhoto()">Chụp lại ảnh</button>', 'pf-stage-quality-error');
  return renderAssessmentCapture();
}
function renderAssessmentSafety() {
  const draft = patientFlow.draft;
  const body = `<div class="pf-intro"><h2>Thông tin bổ sung</h2><p>Chọn theo những gì bạn đang nhận thấy.</p></div>
    <label class="pf-safety-region" for="tongueRegion">Vùng có rêu lưỡi<select id="tongueRegion" onchange="patientFlow.draft.tongueRegion = this.value">${Object.entries(AssessmentExplanation.REGIONS).map(([value, label]) => `<option value="${value}" ${draft.tongueRegion === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><p class="pf-muted">Vị trí do bạn mô tả, không phải phát hiện từ ảnh.</p>
    <fieldset class="pf-warning-options"><legend>Bạn có dấu hiệu nào sau đây?</legend><p>Chọn tất cả dấu hiệu đang có.</p>${Object.entries(AssessmentExplanation.WARNINGS).map(([value, label]) => `<label><input type="checkbox" value="${value}" ${draft.warningSigns.includes(value) ? 'checked' : ''} onchange="setAssessmentWarning(this.value, this.checked)"><span>${label}</span></label>`).join('')}<label><input id="warningNone" type="checkbox" ${draft.warningScreened && !draft.warningSigns.length ? 'checked' : ''} onchange="setAssessmentWarning('none', this.checked)"><span>Không có các dấu hiệu trên</span></label></fieldset><p class="pf-answer-status" role="status" aria-live="polite">${assessmentAnswerStatus(draft)}</p>`;
  return renderPatientStage(body, `<button class="pf-secondary" onclick="returnToAssessmentQuestions()">Quay lại</button><button id="assessmentSafetySubmit" class="pf-primary" onclick="completeAssessment()" ${draft.warningScreened ? '' : 'disabled'}>Xem kết quả ${patientIcon('arrow-right')}</button>`, 'pf-stage-safety');
}
function returnToAssessmentQuestions() {
  patientFlow.draft.stage = 'questions';
  renderPatientTab('diagnosis');
}
function assessmentAnswerStatus(draft) {
  return draft.warningSigns.length ? `Đã chọn ${draft.warningSigns.length} mục.` : draft.warningScreened ? 'Đã ghi nhận câu trả lời.' : 'Chọn mục phù hợp để tiếp tục.';
}
function setAssessmentWarning(id, checked) {
  const draft = patientFlow.draft;
  if (!draft || draft.stage !== 'safety' || (id !== 'none' && !Object.hasOwn(AssessmentExplanation.WARNINGS, id))) return;
  if (id === 'none') {
    draft.warningSigns = [];
    draft.warningScreened = checked;
    document.querySelectorAll('.pf-warning-options input:not(#warningNone)').forEach(input => { input.checked = false; });
  } else {
    draft.warningSigns = [...new Set(draft.warningSigns.filter(value => value !== id).concat(checked ? [id] : []))];
    draft.warningScreened = draft.warningSigns.length > 0;
    document.getElementById('warningNone').checked = false;
  }
  document.getElementById('assessmentSafetySubmit').disabled = !draft.warningScreened;
  document.querySelector('.pf-answer-status').textContent = assessmentAnswerStatus(draft);
}
function renderAssessmentQuestion() {
  const draft = patientFlow.draft, index = draft.questionIndex, question = ASSESSMENT_QUESTIONS[index];
  const hasPhoto = draft.photoKind !== 'test' || draft.captureSimulated === true;
  const title = index === 3 && !hasPhoto ? 'Bạn thấy rêu lưỡi như thế nào?' : question.title;
  const body = `<div class="pf-question-top"><span>Câu ${index + 1}/${ASSESSMENT_QUESTIONS.length}</span></div><div class="pf-question-progress"><span style="width:${(index + 1) / ASSESSMENT_QUESTIONS.length * 100}%"></span></div>
    <div class="pf-question-heading"><h2>${title}</h2>${index === 3 && hasPhoto ? `<img src="${escapePatientText(draft.photo)}" alt="${draft.captureSimulated ? 'Ảnh mẫu để đối chiếu' : 'Ảnh lưỡi để đối chiếu'}">` : ''}</div>
    <div class="pf-options" role="group" aria-label="${escapePatientText(title)}">${question.options.map((option, answer) => `<button class="pf-option ${draft.answers[index] === answer ? 'selected' : ''}" aria-pressed="${draft.answers[index] === answer}" onclick="selectAssessmentAnswer(${answer})"><span>${escapePatientText(option)}</span><span class="pf-radio">${draft.answers[index] === answer ? '✓' : ''}</span></button>`).join('')}</div>`;
  return renderPatientStage(body, `<div class="pf-question-actions"><button class="pf-secondary" onclick="previousAssessmentQuestion()">${patientIcon('arrow-left')} ${index === 0 && hasPhoto ? 'Xem ảnh' : 'Quay lại'}</button><button class="pf-primary" onclick="nextAssessmentQuestion()" ${draft.answers[index] === null ? 'disabled' : ''}>${index === ASSESSMENT_QUESTIONS.length - 1 ? 'Kết quả' : 'Tiếp tục'} ${patientIcon('arrow-right')}</button></div>`, 'pf-stage-questions');
}
function selectAssessmentAnswer(answer) {
  const draft = patientFlow.draft;
  if (!draft?.confirmed || patientFlow.completing || !Number.isInteger(answer) || answer < 0 || answer > 3) return;
  draft.answers[draft.questionIndex] = answer;
  // Updating the buttons in place preserves keyboard focus.
  document.querySelectorAll('.pf-option').forEach((button, index) => {
    button.classList.toggle('selected', index === answer);
    button.setAttribute('aria-pressed', String(index === answer));
    button.querySelector('.pf-radio').textContent = index === answer ? '✓' : '';
  });
  document.querySelector('.pf-question-actions .pf-primary').disabled = false;
}
function previousAssessmentQuestion() {
  if (patientFlow.completing) return;
  const draft = patientFlow.draft;
  if (!draft) return;
  if (draft.questionIndex === 0) draft.stage = draft.photoKind === 'test' && !draft.captureSimulated ? 'guide' : 'review';
  else draft.questionIndex--;
  renderPatientTab('diagnosis');
}
function nextAssessmentQuestion() {
  const draft = patientFlow.draft;
  if (!draft?.confirmed || draft.answers[draft.questionIndex] === null || patientFlow.completing) return;
  if (draft.questionIndex < ASSESSMENT_QUESTIONS.length - 1) { draft.questionIndex++; renderPatientTab('diagnosis'); }
  else { draft.stage = 'safety'; renderPatientTab('diagnosis'); }
}
function evaluateAssessment(answers) {
  const result = AssessmentExplanation.questionnaireResult(answers);
  if (!result) throw new Error('Incomplete answers');
  // Presentation rule only; these cutoffs are not a validated diagnostic scale.
  return result;
}
async function completeAssessment() {
  const draft = patientFlow.draft;
  if (!isPatientAuthenticated() || !draft?.confirmed || !draft.photo || draft.answers.includes(null) || !draft.warningScreened || patientFlow.completing) return;
  if (draft.photoKind !== 'test' && !AssessmentExplanation.usableImage(draft)) {
    patientFlow.error = AssessmentExplanation.decide(draft).text;
    draft.stage = 'quality-error';
    renderPatientTab('diagnosis');
    return;
  }
  patientFlow.completing = true;
  renderPatientTab('diagnosis');
  await new Promise(resolve => setTimeout(resolve, 650));
  if (draft !== patientFlow.draft || !patientFlow.completing) return;
  const createdAt = Date.now();
  const record = { id: createdAt.toString(36) + '-' + Math.random().toString(36).slice(2, 8), createdAt, photo: draft.photo, photoKind: draft.photoKind, captureSimulated: draft.captureSimulated === true, brightness: draft.brightness, captureQuality: draft.captureQuality, answers: [...draft.answers], tongueRegion: draft.tongueRegion, warningSigns: [...draft.warningSigns], warningScreened: draft.warningScreened, modelOutput: null, explanationVersion: 1, ...evaluateAssessment(draft.answers) };
  patientFlow.history.unshift(record);
  patientFlow.history = patientFlow.history.slice(0, 12);
  prunePatientCommunication();
  patientFlow.resultId = record.id;
  patientFlow.completing = false;
  patientFlow.overlay = true;
  patientFlow.resultSlide = 0;
  const saved = persistPatientData();
  if (appState.currentScreen === 'screen-patient' && patientFlow.tab !== 'information') renderPatientTab(patientFlow.tab);
  if (!saved) showToast('Kết quả được giữ trong phiên này. Bộ nhớ trình duyệt hiện không khả dụng.');
}
function formatAssessmentDate(timestamp) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp);
}
function renderPatientInformation() {
  const profile = patientFlow.profile;
  const body = `<form id="patientProfileForm" class="pf-profile-form" onsubmit="savePatientProfile(event)"><label>Họ và tên<input id="profileName" name="name" value="${escapePatientText(profile.name)}" required maxlength="80" autocomplete="name"></label><label>Số điện thoại<input id="profilePhone" name="phone" type="tel" value="${escapePatientText(profile.phone)}" maxlength="20" autocomplete="tel"></label><div class="pf-two-actions"><label>Tuổi<input id="profileAge" name="age" type="number" min="1" max="120" step="1" value="${escapePatientText(profile.age)}"></label><label>Giới tính<select id="profileGender" name="gender">${[['', 'Chưa chọn'], ['Nam', 'Nam'], ['Nữ', 'Nữ'], ['Khác', 'Khác']].map(([value, title]) => `<option value="${value}" ${profile.gender === value ? 'selected' : ''}>${title}</option>`).join('')}</select></label></div></form><p class="pf-muted">Thông tin được lưu trên trình duyệt này.</p>`;
  return renderPatientStage(body, `<button class="pf-secondary" onclick="logout()">Đăng xuất</button><button type="submit" form="patientProfileForm" class="pf-primary">Lưu thông tin</button>`, 'pf-stage-profile');
}
function savePatientProfile(event) {
  event.preventDefault();
  if (!requirePatientSession('information')) return;
  const name = document.getElementById('profileName').value.trim();
  if (!name) { document.getElementById('profileName').focus(); showToast('Vui lòng nhập họ và tên.'); return; }
  patientFlow.profile = { name, phone: document.getElementById('profilePhone').value.trim(), age: document.getElementById('profileAge').value, gender: document.getElementById('profileGender').value };
  const saved = persistPatientData();
  renderPatientTab('information');
  showToast(saved ? 'Đã lưu thông tin cá nhân.' : 'Đã cập nhật trong phiên này. Không truy cập được bộ nhớ trình duyệt.');
}
