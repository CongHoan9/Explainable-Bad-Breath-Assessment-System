/* Fixed Vietnamese templates only. No free-text generation or language-model call.
 * Probability thresholds are provisional product settings, not clinical cutoffs.
 */
const AssessmentExplanation = (() => {
  const capture = typeof module !== 'undefined' && module.exports ? require('./camera-quality.js').TONGUE_CAPTURE : TONGUE_CAPTURE;
  const DISCLAIMER = 'Kết quả không thay thế chẩn đoán.';
  const WARNINGS = Object.freeze({ weightLoss: 'sụt cân không rõ lý do', thirst: 'khát nhiều', jaundice: 'vàng da', fruityBreath: 'mùi trái cây', ammoniaBreath: 'mùi khai' });
  const REGIONS = Object.freeze({ tip: 'đầu lưỡi', middle: 'giữa lưỡi', back: 'cuống lưỡi', middleBack: 'giữa và cuống lưỡi', whole: 'toàn bộ lưỡi', unspecified: 'chưa rõ vùng' });
  const COATINGS = ['không thấy rêu', 'rêu mỏng', 'rêu thấy rõ', 'rêu dày'];
  const SYMPTOMS = ['không khô miệng', 'đôi lúc khô miệng', 'khô miệng khi thức dậy', 'thường xuyên khô miệng'];
  const LEVELS = ['Không đáng kể', 'Mức độ nhẹ', 'Mức độ trung bình', 'Mức độ cao'];
  const POLICY = Object.freeze({ minimumConfidence: .7, minimumClassGap: .1, decisionMargin: .05 });

  function usableImage(record) {
    const q = record?.captureQuality;
    return record?.photoKind === 'camera' && typeof record.photo === 'string' && /^data:image\/(jpeg|png)[;,]/.test(record.photo)
      && q?.ready === true && q.lighting === true && q.sharp === true && q.aligned === true && q.stable === true
      && ['brightness', 'sharpness', 'motion', 'coverage', 'containment'].every(key => Number.isFinite(q[key]))
      && q.brightness >= capture.minimumBrightness && q.brightness <= capture.maximumBrightness
      && q.sharpness >= capture.minimumSharpness && q.motion >= 0 && q.motion <= capture.maximumMotion
      && q.coverage >= .34 && q.coverage <= 1 && q.containment >= .67 && q.containment <= 1;
  }
  function modelConfidence(model) {
    const p = model?.probabilities;
    if (!Array.isArray(p) || p.length !== 4 || !p.every(value => Number.isFinite(value) && value >= 0 && value <= 1)
      || Math.abs(p.reduce((sum, value) => sum + value, 0) - 1) > .001) return { status: 'unknown', level: null };
    const sorted = [...p].sort((a, b) => b - a);
    let nearThreshold = false;
    if (model.decisionProbability !== undefined || model.decisionThreshold !== undefined) {
      if (![model.decisionProbability, model.decisionThreshold].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) return { status: 'unknown', level: null };
      nearThreshold = Math.abs(model.decisionProbability - model.decisionThreshold) <= POLICY.decisionMargin + 1e-9;
    }
    return { status: sorted[0] < POLICY.minimumConfidence || sorted[0] - sorted[1] <= POLICY.minimumClassGap + 1e-9 || nearThreshold ? 'low' : 'high', level: p.indexOf(sorted[0]) };
  }
  function decide(record) {
    const warningIds = Object.keys(WARNINGS).filter(id => Array.isArray(record.warningSigns) && record.warningSigns.includes(id));
    const screeningComplete = record.warningScreened === true && Array.isArray(record.warningSigns) && record.warningSigns.every(id => Object.hasOwn(WARNINGS, id));
    const imageReady = usableImage(record);
    const isTest = record.photoKind === 'test';
    const questionnaire = questionnaireResult(record.answers);
    const confidence = modelConfidence(record.modelOutput);
    const needsRetake = !imageReady && !isTest;
    const urgent = warningIds.includes('fruityBreath') && warningIds.includes('thirst');
    const canShowLevel = screeningComplete && !warningIds.length && (isTest ? questionnaire !== null : imageReady && confidence.status === 'high');
    const resultLevel = canShowLevel ? (isTest ? questionnaire.level : confidence.level) : null;
    const state = needsRetake ? 'retake' : warningIds.length ? 'warning' : !screeningComplete ? 'incomplete' : isTest ? (questionnaire ? 'questionnaire' : 'incomplete') : confidence.status === 'high' ? 'estimate' : confidence.status;
    const title = needsRetake ? 'Ảnh chưa đạt yêu cầu' : warningIds.length ? 'Cần khám bác sĩ' : !screeningComplete || (isTest && !questionnaire) ? 'Thiếu câu trả lời' : canShowLevel ? LEVELS[resultLevel] : 'Chưa đủ chắc chắn';
    const coating = COATINGS[record.answers?.[3]] || 'chưa rõ mức rêu';
    const region = REGIONS[record.tongueRegion] || REGIONS.unspecified;
    const description = `${coating}${record.answers?.[3] === 0 ? '' : `, ${region}`}; ${SYMPTOMS[record.answers?.[2]] || 'chưa rõ triệu chứng'}`;
    const warningAction = urgent ? 'Cần đến cơ sở cấp cứu ngay.' : 'Cần khám bác sĩ sớm.';
    let text;
    if (needsRetake) text = `Ảnh chưa đạt yêu cầu; hãy chụp lại. ${warningIds.length ? `Bạn báo: ${warningIds.map(id => WARNINGS[id]).join(', ')}. ${warningAction}` : confidence.status === 'low' ? 'Chưa có kết luận. Độ tin cậy thấp; bạn nên khám bác sĩ.' : 'Chưa có kết luận. Chụp nơi đủ sáng, giữ máy yên và đặt lưỡi trong khung.'}`;
    else if (warningIds.length) text = `Bạn báo: ${warningIds.map(id => WARNINGS[id]).join(', ')}. Bạn mô tả ${coating}${record.answers?.[3] === 0 ? '' : `, ${region}`}. ${warningAction}`;
    else if (isTest) text = `Bạn mô tả ${description}. ${questionnaire ? (questionnaire.level >= 2 ? 'Nên khám bác sĩ.' : '') : 'Chưa đủ câu trả lời.'}`;
    else if (!screeningComplete) text = `Bạn mô tả ${description}. Chưa đủ thông tin cảnh báo; chưa thể kết luận. Hãy đánh giá lại và khám bác sĩ.`;
    else if (confidence.status !== 'high') text = `Bạn mô tả ${description}. ${confidence.status === 'low' ? 'Độ tin cậy thấp' : 'Chưa có độ tin cậy'}; nên khám bác sĩ.`;
    else text = `Bạn mô tả ${description}. ${confidence.level >= 2 ? 'Nên khám bác sĩ.' : 'Nên khám nếu mùi kéo dài.'}`;
    return { state, title, source: isTest ? 'questionnaire' : 'model', confidence: isTest ? 'not-applicable' : confidence.status, needsRetake, urgent, canShowLevel, level: resultLevel,
      requiresExam: warningIds.length > 0 || (!isTest && confidence.status === 'low') || (!needsRetake && (!screeningComplete || (!isTest && confidence.status !== 'high') || (canShowLevel && resultLevel >= 2))),
      text: `${text.trim()} ${DISCLAIMER}` };
  }
  function questionnaireResult(answers) {
    if (!Array.isArray(answers) || answers.length !== 5 || !Array.from(answers).every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 3)) return null;
    const score = answers.reduce((sum, answer) => sum + answer, 0);
    return { score, level: Math.min(3, Math.floor((score + 1) / 4)) };
  }
  return Object.freeze({ WARNINGS, REGIONS, POLICY, DISCLAIMER, usableImage, modelConfidence, questionnaireResult, decide });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AssessmentExplanation;
