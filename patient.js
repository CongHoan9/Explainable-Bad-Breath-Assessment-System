/* Patient journey: capture → confirm → questionnaire → explained result.
 * Replace evaluateAssessment() with the inference service when it is available.
 * Image annotations are reference regions, not detected lesions or a model heatmap.
 */
const LEGACY_ASSESSMENT_QUESTIONS = [
  { title: 'Hơi thở có mùi thường xuyên thế nào?', short: 'Tần suất có mùi', options: ['Không nhận thấy có mùi', 'Thỉnh thoảng, sau khi ngủ dậy hoặc ăn uống', 'Thường xuyên trong ngày', 'Gần như liên tục trong ngày'] },
  { title: 'Người khác có nhận xét hơi thở có mùi?', short: 'Nhận xét từ người khác', options: ['Chưa có ai nhận xét', 'Có, nhưng rất hiếm', 'Đôi khi có người nhận xét', 'Thường xuyên có người nhận xét'] },
  { title: 'Bạn có thường bị khô miệng?', short: 'Cảm giác khô miệng', options: ['Không bị khô miệng', 'Thỉnh thoảng hơi khô', 'Thường khô miệng sau khi thức dậy', 'Khô miệng thường xuyên cả ngày'] },
  { title: 'Lớp rêu lưỡi trong ảnh như thế nào?', short: 'Mô tả rêu lưỡi', options: ['Hầu như không có rêu lưỡi', 'Lớp rêu mỏng, chỉ ở một vài vùng', 'Rêu thấy rõ ở vùng giữa và cuống lưỡi', 'Rêu dày, phủ phần lớn bề mặt lưỡi'] },
  { title: 'Bạn làm sạch lưỡi thường xuyên thế nào?', short: 'Vệ sinh lưỡi', options: ['Hàng ngày', 'Vài lần mỗi tuần', 'Rất ít khi', 'Chưa có thói quen làm sạch lưỡi'] }
];
const ASSESSMENT_QUESTIONS = AssessmentQuestionnaire.questions;
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
        for (const key of ['name', 'phone', 'age', 'gender', 'occupation', 'address']) {
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
    && (record.questionnaireVersion === 2
      ? AssessmentQuestionnaire.complete(record.answers, record.administration, record.answerDetails)
      : Array.isArray(record.answers) && record.answers.length === 5 && record.answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 3))
    && typeof record.photo === 'string' && /^data:image\/(jpeg|png|svg\+xml)[;,]/.test(record.photo)
    && Number.isFinite(record.brightness) && Number.isFinite(record.createdAt);
}
function persistPatientData() {
  if (!isPatientAuthenticated()) return false;
  return SharedDataStore.savePatient(patientFlow.account, { profile: patientFlow.profile, history: patientFlow.history, consultations: patientCommunication.consultations, readNotifications: patientCommunication.readIds });
}
function newAssessmentDraft() {
  return { administration: { ...patientFlow.profile }, administrationCompleted: false, answerDetails: {}, questionnaireVersion: 2, stage: 'guide', guidanceAccepted: false, photo: '', photoKind: '', brightness: 0, confirmed: false, questionIndex: 0, answers: Array(ASSESSMENT_QUESTIONS.length).fill(null), tongueRegion: 'unspecified', warningSigns: [], warningScreened: false, supplementalScreening: 'not-collected' };
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
      <p>Hiểu hơn về hơi thở qua ảnh lưỡi và bảng hỏi.</p>
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
    <section class="pf-hero"><h2>Đánh giá hơi thở</h2><p>Chụp ảnh lưỡi và trả lời bảng hỏi.</p><button class="pf-primary pf-hero-button" onclick="startAssessment()">Bắt đầu chẩn đoán ${patientIcon('arrow-right')}</button></section>
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
  if (patientFlow.draft.stage === 'quality-error') return renderPatientStage(`<div class="pf-intro"><h2>Ảnh chưa đạt yêu cầu</h2></div><p class="pf-error" role="alert">${escapePatientText(patientFlow.error)}</p>`, '<button class="pf-secondary" onclick="renderPatientTab(\'home\')">Trang chủ</button><button class="pf-primary" onclick="retakeTonguePhoto()">Chụp lại ảnh</button>', 'pf-stage-quality-error');
  return renderAssessmentCapture();
}
function renderAssessmentAdministration() {
  const profile = patientFlow.profile;
  const fields = [['name', 'Họ và tên', 'text'], ['age', 'Tuổi', 'number'], ['phone', 'Số điện thoại', 'tel'], ['occupation', 'Nghề nghiệp', 'text'], ['address', 'Địa chỉ', 'text']];
  const body = `<div class="pf-intro"><h2>Xác nhận thông tin cá nhân</h2></div><form id="assessmentAdministration" class="pf-profile-form" onsubmit="saveAssessmentAdministration(event)" oninput="invalidateAssessmentConfirmation(event)">${fields.map(([key, label, type]) => `<label>${label}<input name="${key}" type="${type}" value="${escapePatientText(profile[key])}" ${key === 'name' ? 'required maxlength="80" autocomplete="name"' : key === 'age' ? 'min="1" max="120" step="1"' : key === 'phone' ? 'maxlength="20" autocomplete="tel"' : 'maxlength="200"'}></label>`).join('')}<label>Giới tính<select name="gender">${[['', 'Chưa chọn'], ['Nam', 'Nam'], ['Nữ', 'Nữ'], ['Khác', 'Khác']].map(([value, title]) => `<option value="${value}" ${profile.gender === value ? 'selected' : ''}>${title}</option>`).join('')}</select></label><label class="pf-profile-confirmation"><input name="confirmed" type="checkbox" required><span>Tôi xác nhận thông tin trên là chính xác</span></label></form>`;
  return renderPatientStage(body, '<button class="pf-secondary" onclick="previousAssessmentQuestion()">Quay lại</button><button class="pf-primary" type="submit" form="assessmentAdministration">Xác nhận và tiếp tục</button>', 'pf-stage-questions');
}
function invalidateAssessmentConfirmation(event) {
  if (event.target.name === 'confirmed') return;
  const form = document.getElementById('assessmentAdministration');
  form.elements.confirmed.checked = false;
  form.elements.namedItem('name').setCustomValidity('');
}
function saveAssessmentAdministration(event) {
  event.preventDefault();
  const draft = patientFlow.draft;
  if (!draft?.confirmed || patientFlow.completing) return;
  const form = document.getElementById('assessmentAdministration');
  if (!form.reportValidity()) return;
  if (!form.elements.confirmed.checked) return;
  const profile = Object.fromEntries(['name', 'age', 'gender', 'phone', 'occupation', 'address'].map(key => [key, form.elements.namedItem(key).value.trim()]));
  if (!profile.name) {
    form.elements.namedItem('name').setCustomValidity('Vui lòng nhập họ và tên.');
    form.reportValidity();
    return;
  }
  patientFlow.profile = { ...patientFlow.profile, ...profile };
  draft.administration = { ...patientFlow.profile };
  draft.administrationCompleted = true;
  normalizeAssessmentAnswers();
  const saved = persistPatientData();
  renderPatientTab('diagnosis');
  if (!saved) showToast('Đã cập nhật trong phiên này. Không truy cập được bộ nhớ trình duyệt.');
}
function normalizeAssessmentAnswers() {
  const draft = patientFlow.draft;
  ASSESSMENT_QUESTIONS.forEach((q, index) => {
    if (AssessmentQuestionnaire.skipped(index, draft.answers, draft.administration)) {
      draft.answers[index] = null;
      delete draft.answerDetails[index];
    }
  });
}
function assessmentQuestionReady(index) {
  const draft = patientFlow.draft, q = ASSESSMENT_QUESTIONS[index];
  return AssessmentQuestionnaire.validAnswer(index, draft.answers[index]) && (!AssessmentQuestionnaire.needsDetail(index, draft.answers[index]) || q.detailOptional || Boolean(draft.answerDetails[index]?.trim()));
}
function renderAssessmentQuestion() {
  const draft = patientFlow.draft;
  if (!draft.administrationCompleted) return renderAssessmentAdministration();
  const index = draft.questionIndex, question = ASSESSMENT_QUESTIONS[index];
  const selected = value => question.multiple ? draft.answers[index]?.includes(value) : draft.answers[index] === value;
  const visible = ASSESSMENT_QUESTIONS.map((q, i) => i).filter(i => !AssessmentQuestionnaire.skipped(i, draft.answers, draft.administration));
  const position = visible.indexOf(index) + 1;
  const body = `<div class="pf-question-progress" aria-hidden="true"><span style="width:${position / visible.length * 100}%"></span></div><div class="pf-question-heading"><h2>${escapePatientText(question.title)}</h2></div><div class="pf-options" role="group" aria-label="${escapePatientText(question.title)}">${question.options.map((option, answer) => `<button class="pf-option ${selected(answer) ? 'selected' : ''}" aria-pressed="${Boolean(selected(answer))}" onclick="selectAssessmentAnswer(${answer})"><span>${escapePatientText(option)}</span><span class="pf-radio">${selected(answer) ? '✓' : ''}</span></button>`).join('')}</div><div id="assessmentDetail" class="pf-profile-form" ${AssessmentQuestionnaire.needsDetail(index, draft.answers[index]) ? '' : 'hidden'}><label>Thông tin bổ sung<input id="assessmentDetailInput" maxlength="500" value="${escapePatientText(draft.answerDetails[index] || '')}" oninput="setAssessmentDetail(this.value)"></label></div>`;
  return renderPatientStage(body, `<div class="pf-question-actions"><button class="pf-secondary" onclick="previousAssessmentQuestion()">${patientIcon('arrow-left')} Quay lại</button><button class="pf-primary" onclick="nextAssessmentQuestion()" ${assessmentQuestionReady(index) ? '' : 'disabled'}>${index === 22 ? 'Xem kết quả' : 'Câu tiếp theo'} ${patientIcon('arrow-right')}</button></div>`, 'pf-stage-questions');
}
function setAssessmentDetail(value) {
  const draft = patientFlow.draft;
  if (!draft || draft.stage !== 'questions' || patientFlow.completing) return;
  draft.answerDetails[draft.questionIndex] = value.slice(0, 500);
  document.querySelector('.pf-question-actions .pf-primary').disabled = !assessmentQuestionReady(draft.questionIndex);
}
function selectAssessmentAnswer(answer) {
  const draft = patientFlow.draft, index = draft?.questionIndex, q = ASSESSMENT_QUESTIONS[index];
  if (!draft?.confirmed || draft.stage !== 'questions' || patientFlow.completing || !Number.isInteger(answer) || answer < 0 || answer >= q.options.length) return;
  if (q.multiple) {
    const previous = Array.isArray(draft.answers[index]) ? draft.answers[index] : [];
    draft.answers[index] = previous.includes(answer) ? previous.filter(value => value !== answer) : answer === q.none ? [answer] : [...previous.filter(value => value !== q.none), answer];
  } else draft.answers[index] = answer;
  normalizeAssessmentAnswers();
  const selected = value => q.multiple ? draft.answers[index].includes(value) : draft.answers[index] === value;
  document.querySelectorAll('.pf-option').forEach((button, value) => {
    button.classList.toggle('selected', selected(value));
    button.setAttribute('aria-pressed', String(selected(value)));
    button.querySelector('.pf-radio').textContent = selected(value) ? '✓' : '';
  });
  const showDetail = AssessmentQuestionnaire.needsDetail(index, draft.answers[index]);
  document.getElementById('assessmentDetail').hidden = !showDetail;
  if (!showDetail) { delete draft.answerDetails[index]; document.getElementById('assessmentDetailInput').value = ''; }
  document.querySelector('.pf-question-actions .pf-primary').disabled = !assessmentQuestionReady(index);
}
function previousAssessmentQuestion() {
  if (patientFlow.completing) return;
  const draft = patientFlow.draft;
  if (!draft) return;
  if (!draft.administrationCompleted) draft.stage = draft.photoKind === 'test' && !draft.captureSimulated ? 'guide' : 'review';
  else if (draft.questionIndex === 0) draft.administrationCompleted = false;
  else {
    do { draft.questionIndex--; } while (draft.questionIndex > 0 && AssessmentQuestionnaire.skipped(draft.questionIndex, draft.answers, draft.administration));
  }
  renderPatientTab('diagnosis');
}
function nextAssessmentQuestion() {
  const draft = patientFlow.draft;
  if (!draft?.confirmed || !assessmentQuestionReady(draft.questionIndex) || patientFlow.completing) return;
  normalizeAssessmentAnswers();
  let next = draft.questionIndex + 1;
  while (next < ASSESSMENT_QUESTIONS.length && AssessmentQuestionnaire.skipped(next, draft.answers, draft.administration)) next++;
  if (next < ASSESSMENT_QUESTIONS.length) draft.questionIndex = next;
  else { completeAssessment(); return; }
  renderPatientTab('diagnosis');
}

function evaluateAssessment(answers) {
  const result = AssessmentExplanation.questionnaireResult(answers);
  if (!result) throw new Error('Incomplete answers');
  // Presentation rule only; these cutoffs are not a validated diagnostic scale.
  return result;
}
async function completeAssessment() {
  const draft = patientFlow.draft;
  if (!isPatientAuthenticated() || !draft?.confirmed || !draft.photo || !AssessmentQuestionnaire.complete(draft.answers, draft.administration, draft.answerDetails) || patientFlow.completing) return;
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
  const record = { id: createdAt.toString(36) + '-' + Math.random().toString(36).slice(2, 8), createdAt, photo: draft.photo, photoKind: draft.photoKind, captureSimulated: draft.captureSimulated === true, brightness: draft.brightness, captureQuality: draft.captureQuality, imageAnalysis: draft.imageAnalysis, demoImageId: draft.demoImageId, demoImageRole: draft.demoImageRole, questionnaireVersion: 2, administration: { ...draft.administration }, answerDetails: { ...draft.answerDetails }, answers: draft.answers.map(answer => Array.isArray(answer) ? [...answer] : answer), tongueRegion: draft.tongueRegion, warningSigns: [...draft.warningSigns], warningScreened: draft.warningScreened, supplementalScreening: 'not-collected', modelOutput: null, explanationVersion: 1, ...evaluateAssessment(draft.answers) };
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
  const body = `<form id="patientProfileForm" class="pf-profile-form" onsubmit="savePatientProfile(event)"><label>Họ và tên<input id="profileName" name="name" value="${escapePatientText(profile.name)}" required maxlength="80" autocomplete="name"></label><label>Số điện thoại<input id="profilePhone" name="phone" type="tel" value="${escapePatientText(profile.phone)}" maxlength="20" autocomplete="tel"></label><div class="pf-two-actions"><label>Tuổi<input id="profileAge" name="age" type="number" min="1" max="120" step="1" value="${escapePatientText(profile.age)}"></label><label>Giới tính<select id="profileGender" name="gender">${[['', 'Chưa chọn'], ['Nam', 'Nam'], ['Nữ', 'Nữ'], ['Khác', 'Khác']].map(([value, title]) => `<option value="${value}" ${profile.gender === value ? 'selected' : ''}>${title}</option>`).join('')}</select></label></div><label>Nghề nghiệp<input id="profileOccupation" name="occupation" maxlength="200" value="${escapePatientText(profile.occupation)}"></label><label>Địa chỉ<input id="profileAddress" name="address" maxlength="200" value="${escapePatientText(profile.address)}" autocomplete="street-address"></label></form>`;
  return renderPatientStage(body, `<button class="pf-secondary" onclick="logout()">Đăng xuất</button><button type="submit" form="patientProfileForm" class="pf-primary">Lưu thông tin</button>`, 'pf-stage-profile');
}
function savePatientProfile(event) {
  event.preventDefault();
  if (!requirePatientSession('information')) return;
  const name = document.getElementById('profileName').value.trim();
  if (!name) { document.getElementById('profileName').focus(); showToast('Vui lòng nhập họ và tên.'); return; }
  patientFlow.profile = { ...patientFlow.profile, name, phone: document.getElementById('profilePhone').value.trim(), age: document.getElementById('profileAge').value, gender: document.getElementById('profileGender').value, occupation: document.getElementById('profileOccupation').value.trim(), address: document.getElementById('profileAddress').value.trim() };
  const saved = persistPatientData();
  if (patientFlow.draft?.editingAdministration) {
    patientFlow.draft.editingAdministration = false;
    patientFlow.draft.administrationCompleted = false;
    renderPatientTab('diagnosis');
  } else renderPatientTab('information');
  showToast(saved ? 'Đã lưu thông tin cá nhân.' : 'Đã cập nhật trong phiên này. Không truy cập được bộ nhớ trình duyệt.');
}
