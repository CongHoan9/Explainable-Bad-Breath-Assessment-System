/* Adapt the same assessment to the doctor workspace without fabricating VSC. */
function loadDoctorSharedRecords() {
  const shared = SharedDataStore.read();
  doctorWorkspace.changes = shared.changes;
  doctorWorkspace.appointments = shared.appointments.filter(validDoctorAppointment);
  const records = [];
  for (const [account, saved] of Object.entries(shared.patients)) {
    if (!saved || typeof saved !== 'object') continue;
    for (const record of Array.isArray(saved.history) ? saved.history : []) {
      if (!isValidAssessment(record)) continue;
      const decision = AssessmentExplanation.decide(record);
      const profile = record.administration || saved.profile || {};
      const modern = record.questionnaireVersion === 2;
      const answers = modern ? ASSESSMENT_QUESTIONS.map((question, index) => ({ label: question.short, answer: AssessmentQuestionnaire.display(record, index) })) : LEGACY_ASSESSMENT_QUESTIONS.map((question, index) => ({ label: question.short, answer: question.options[record.answers[index]] }));
      if (modern) answers.unshift({ label: 'Nghề nghiệp', answer: profile.occupation || 'Chưa cung cấp' }, { label: 'Địa chỉ', answer: profile.address || 'Chưa cung cấp' });
      const consultation = saved.consultations?.find(item => item.recordId === record.id);
      records.push({ id: SharedDataStore.caseId(account, record.id), assessmentId: record.id, account,
        name: profile.name || account, phone: consultation?.phone || profile.phone || '', age: profile.age || '—', gender: profile.gender || 'Chưa cập nhật',
        submittedAt: formatAssessmentDate(record.createdAt), createdAt: record.createdAt, status: decision.requiresExam ? 'urgent' : 'pending',
        resultTitle: decision.title, resultLevel: decision.level, explanation: decision.text, answers,
        supplementalScreening: record.supplementalScreening,
        warningSigns: (record.warningSigns || []).map(id => AssessmentExplanation.WARNINGS[id]).filter(Boolean),
        source: decision.source, photoUrl: record.photo, photoAngle: record.photoKind === 'upload' ? 'Ảnh tải lên từ file' : record.captureSimulated ? 'Ảnh mẫu minh họa' : 'Ảnh lưỡi do bệnh nhân chụp',
        patientNote: consultation?.note || '', tongueRegion: AssessmentExplanation.REGIONS[record.tongueRegion] || 'Chưa rõ vùng',
        survey: { oralSensations: modern ? AssessmentQuestionnaire.display(record, 21) : answers[2].answer }, doctorDiagnosis: '' });
    }
  }
  setDoctorPatientRecords(records.sort((a, b) => b.createdAt - a.createdAt));
}
let lastPatientSharedSnapshot = '';
function refreshSharedInterfaces() {
  loadDoctorSharedRecords();
  if (isDoctorAuthenticated()) {
    renderAdminPatientList(appState.activeFilter);
    return;
  }
  if (!isPatientAuthenticated()) return;
  const saved = SharedDataStore.patient(patientFlow.account);
  const reviews = SharedDataStore.read().changes;
  const signature = JSON.stringify([saved, Object.entries(reviews).filter(([id]) => id.startsWith(encodeURIComponent(patientFlow.account) + '~'))]);
  if (signature === lastPatientSharedSnapshot) return;
  lastPatientSharedSnapshot = signature;
  if (saved) patientFlow.history = saved.history.filter(isValidAssessment).slice(0, 12);
  const tab = patientFlow.tab;
  const busy = document.getElementById('patientConsultationDialog').open || tab === 'information'
    || (tab === 'diagnosis' && !patientFlow.resultId);
  if (!busy && ['home', 'history', 'diagnosis'].includes(tab)) renderPatientTab(tab);
  else refreshPatientNotifications();
}
function initializeSharedWorkspace() {
  SharedDataStore.migrateLegacy();
  SharedDataStore.subscribe(refreshSharedInterfaces);
}
function patientDoctorReview(recordId) {
  const id = SharedDataStore.caseId(patientFlow.account, recordId);
  const changes = SharedDataStore.read().changes;
  return Object.hasOwn(changes, id) && changes[id].status === 'reviewed' ? changes[id] : null;
}
function renderPatientDoctorReview(recordId) {
  const review = patientDoctorReview(recordId);
  if (!review?.doctorDiagnosis) return '';
  return `<section class="pf-card pf-result-explanation pf-doctor-review"><div class="pf-explanation-heading"><h3>Nhận xét bác sĩ</h3><p>${escapePatientText(review.doctorName || 'Bác sĩ')} · ${formatAssessmentDate(review.updatedAt)}</p></div><p class="pf-explanation-text">${escapePatientText(review.doctorDiagnosis)}</p></section>`;
}
