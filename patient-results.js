/* Severity with its explanation, plus an image page with touch and keyboard navigation. */
const RESULT_TABS = ['Mức độ', 'Ảnh phân tích'];
let resultResizeObserver = null;
let resultScrollFrame = null;

function renderAnalyzedTongue(record) {
  if (record.photoKind === 'upload') return renderUploadedTongueAnalysis(record);
  const modern = record.questionnaireVersion === 2;
  const coating = modern ? null : record.answers[3];
  return `<section class="pf-card"><div class="pf-section-title"><h3>Ảnh phân tích</h3><span class="pf-badge">${record.photoKind === 'test' ? 'Ảnh mẫu' : 'Ảnh đã lưu'}</span></div><div class="pf-image-switch" role="group" aria-label="Chế độ xem ảnh"><button onclick="toggleAssessmentOverlay(false)" aria-pressed="${!patientFlow.overlay}" class="${!patientFlow.overlay ? 'active' : ''}">Ảnh gốc</button><button onclick="toggleAssessmentOverlay(true)" aria-pressed="${patientFlow.overlay}" class="${patientFlow.overlay ? 'active' : ''}">Vùng quan sát</button></div>
    <div class="pf-analysis-image pf-portrait-analysis"><img src="${escapePatientText(record.photo)}" alt="Ảnh lưỡi trong lần đánh giá">${patientFlow.overlay ? `<svg viewBox="0 0 300 400" aria-label="Sơ đồ vùng tham chiếu trên lưỡi" role="img"><defs><clipPath id="tongueRegion"><path d="${TONGUE_CAPTURE.outline}"/></clipPath></defs><g clip-path="url(#tongueRegion)">${[0, 1, 2].map(row => [0, 1].map(col => `<rect x="${53 + col * 97}" y="${52 + row * 101}" width="97" height="101" fill="${coating === null ? '#2dd4bf' : coating === 0 ? '#10b981' : row < (coating === 1 ? 1 : coating === 2 ? 2 : 3) ? '#f59e0b' : '#2dd4bf'}" fill-opacity=".3" stroke="white" stroke-opacity=".8" stroke-dasharray="3 3"/>`).join('')).join('')}</g><path d="${TONGUE_CAPTURE.outline}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="5 4"/><text x="150" y="32" text-anchor="middle" fill="#fff" stroke="#164e63" stroke-width=".4" font-size="11">Vùng cuống lưỡi</text><text x="150" y="382" text-anchor="middle" fill="#fff" stroke="#164e63" stroke-width=".4" font-size="11">Vùng đầu lưỡi</text></svg>` : ''}</div>
    <div class="pf-analysis-legend"><span><i></i> Vùng tham chiếu</span>${modern ? '' : '<span><i></i> Vùng rêu theo mô tả</span>'}</div><p class="pf-image-caption">${modern ? 'Lớp phủ chỉ minh họa vùng tham chiếu trên lưỡi; bảng hỏi không đánh giá mức rêu và ảnh chưa được mô hình phân tích.' : 'Lớp phủ màu minh họa theo mô tả rêu lưỡi trong câu trả lời, không xác định tổn thương trên ảnh.'}</p></section>`;
}
function renderUploadedTongueAnalysis(record) {
  const analysis = record.imageAnalysis;
  const demo = DemoImageCatalog.byId(record.demoImageId);
  const reference = Boolean(demo && patientFlow.overlay);
  const photo = reference ? encodeURI(demo.reference) : record.photo;
  const dimensions = analysis ? `${analysis.width} × ${analysis.height}` : '—';
  const metrics = ImageUpload.valid(analysis) ? [
    ['Kích thước ảnh', dimensions],
    ['Độ sáng trung bình', `${analysis.brightness.toFixed(1)} / 255`],
    ['Độ tương phản', analysis.contrast.toFixed(1)],
    ['Chỉ số độ nét', analysis.sharpness.toFixed(1)]
  ] : [];
  return `<section class="pf-card"><div class="pf-section-title"><h3>Ảnh phân tích</h3><span class="pf-badge">${demo ? 'Ảnh demo' : 'Ảnh tải lên'}</span></div>${demo ? `<div class="pf-image-switch" role="group" aria-label="Ảnh đối chiếu"><button onclick="toggleAssessmentOverlay(false)" aria-pressed="${!reference}" class="${!reference ? 'active' : ''}">Ảnh tải lên</button><button onclick="toggleAssessmentOverlay(true)" aria-pressed="${reference}" class="${reference ? 'active' : ''}">Ảnh đối chiếu</button></div>` : ''}<div class="pf-upload-analysis-image"><img onload="orientUploadedResultImage(this)" src="${escapePatientText(photo)}" alt="${reference ? 'Ảnh tương ứng trong thư mục Đã phân tích' : 'Ảnh đã tải lên từ file'}"></div><dl class="pf-image-metrics">${metrics.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapePatientText(value)}</dd></div>`).join('')}</dl></section>`;
}
function orientUploadedResultImage(image) {
  // Reference files and older saved uploads can still contain landscape pixels.
  // Rotate their display without cropping or depending on canvas file permissions.
  const frame = image.parentElement;
  if (!frame || !image.naturalWidth || !image.naturalHeight) return;
  const landscape = image.naturalWidth > image.naturalHeight;
  frame.classList.toggle('is-landscape', landscape);
  if (landscape) {
    frame.style.aspectRatio = `${image.naturalHeight} / ${image.naturalWidth}`;
    frame.style.setProperty('--upright-image-width', `${image.naturalWidth / image.naturalHeight * 100}%`);
    frame.style.setProperty('--upright-image-height', `${image.naturalHeight / image.naturalWidth * 100}%`);
  } else frame.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
}
function renderAssessmentScale(decision) {
  const hasLevel = decision.canShowLevel;
  const level = hasLevel ? ASSESSMENT_LEVELS[decision.level] : null;
  const point = (angle, radius = 94) => ({ x: 140 + radius * Math.cos(angle * Math.PI / 180), y: 128 - radius * Math.sin(angle * Math.PI / 180) });
  const marker = hasLevel ? point(157.5 - decision.level * 45) : null;
  return `<section class="pf-level-summary pf-severity-summary ${hasLevel ? `pf-level--${decision.level}` : 'pf-result-unresolved'}">
    <span class="pf-severity-eyebrow">${decision.source === 'questionnaire' ? 'MỨC ĐỘ THAM KHẢO' : 'MỨC ĐỘ ƯỚC TÍNH'}</span>
    <div class="pf-severity-gauge ${hasLevel ? '' : 'pf-severity-gauge--pending'}" ${hasLevel ? `role="meter" aria-label="Mức độ hôi miệng ước tính" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${decision.level}" aria-valuetext="Mức ${decision.level}: ${level.name}"` : 'role="img" aria-label="Thang tham chiếu từ 0 đến 3, chưa xác định mức độ"'}>
      <svg viewBox="0 0 280 148" aria-hidden="true"><g class="pf-severity-track">${ASSESSMENT_LEVELS.map((item, index) => {
        const start = point(178 - index * 45), end = point(137 - index * 45);
        return `<path class="pf-level--${index} ${hasLevel && index === decision.level ? 'is-current' : ''}" d="M${start.x} ${start.y} A94 94 0 0 1 ${end.x} ${end.y}"/>`;
      }).join('')}</g><g class="pf-severity-labels">${ASSESSMENT_LEVELS.map((item, index) => {
        const tick = point(157.5 - index * 45, 119);
        return `<text x="${tick.x}" y="${tick.y + 4}" class="${hasLevel && index === decision.level ? 'is-current' : ''}">${index}</text>`;
      }).join('')}</g>${hasLevel ? `<circle class="pf-severity-marker" data-level="${decision.level}" cx="${marker.x}" cy="${marker.y}" r="7"/>` : ''}<text class="pf-severity-value" x="140" y="112">${hasLevel ? `${decision.level}<tspan class="pf-severity-total">/3</tspan>` : '—'}</text></svg>
    </div><h2>${hasLevel ? level.name : decision.title}</h2>
  </section>`;
}
function renderAssessmentResult(record, { fromHistory = false } = {}) {
  const decision = AssessmentExplanation.decide(record);
  const withImage = record.photoKind !== 'test' || record.captureSimulated === true;
  const slide = withImage ? Math.max(0, Math.min(RESULT_TABS.length - 1, patientFlow.resultSlide || 0)) : 0;
  return `<div class="pf-result-heading"><h2 id="assessmentResultTitle">Kết quả</h2></div>
    ${withImage ? `<div class="pf-result-tabs" role="tablist" aria-label="Chi tiết kết quả" onkeydown="handleResultSlideKey(event)">${RESULT_TABS.map((label, index) => `<button id="resultTab${index}" role="tab" aria-controls="resultPanel${index}" aria-selected="${slide === index}" tabindex="${slide === index ? 0 : -1}" onclick="goResultSlide(${index})">${label}</button>`).join('')}</div>` : ''}
    <div class="pf-result-shell"><div id="resultCarousel" class="pf-result-carousel" onscroll="queueResultSlideSync()" onkeydown="handleResultSlideKey(event)">
      <section id="resultPanel0" class="pf-result-panel" role="${withImage ? 'tabpanel' : 'region'}" aria-labelledby="${withImage ? 'resultTab0' : 'assessmentResultTitle'}" tabindex="0" ${slide !== 0 ? 'inert aria-hidden="true"' : ''}>
        ${renderAssessmentScale(decision)}
        <section class="pf-card pf-result-explanation" aria-labelledby="resultExplanationTitle"><div class="pf-explanation-heading"><h3 id="resultExplanationTitle">Giải thích</h3></div><p class="pf-explanation-text">${escapePatientText(decision.text)}</p></section>
        ${renderPatientDoctorReview(record.id)}
      </section>
      ${withImage ? `<section id="resultPanel1" class="pf-result-panel" role="tabpanel" aria-labelledby="resultTab1" tabindex="0" ${slide !== 1 ? 'inert aria-hidden="true"' : ''}>${renderAnalyzedTongue(record)}</section>` : ''}
    </div><footer class="pf-stage-actions pf-result-actions ${fromHistory ? 'pf-result-actions--history' : ''}">${decision.needsRetake ? '<button class="pf-primary" onclick="startAssessment()">Chụp lại ảnh</button>' : ''}<button class="pf-primary pf-contact-doctor" data-record-id="${escapePatientText(record.id)}" onclick="openDoctorConsultation(this.dataset.recordId)">${patientIcon('stethoscope')} Liên hệ bác sĩ</button>${fromHistory ? '<button class="pf-secondary" onclick="returnToPatientHistory()">Quay lại lịch sử</button>' : '<button class="pf-secondary" onclick="returnToPatientHistory()">Lịch sử</button><button class="pf-secondary" onclick="startAssessment()">Đánh giá mới</button>'}</footer></div>`;
}
function destroyResultCarousel() {
  resultResizeObserver?.disconnect();
  resultResizeObserver = null;
  if (resultScrollFrame !== null) cancelAnimationFrame(resultScrollFrame);
  resultScrollFrame = null;
}
function attachResultCarousel() {
  const carousel = document.getElementById('resultCarousel');
  if (!carousel) return;
  const index = Math.max(0, Math.min(carousel.children.length - 1, patientFlow.resultSlide || 0));
  carousel.scrollLeft = index * carousel.clientWidth;
  syncResultSlide(index);
  resultResizeObserver = new ResizeObserver(() => {
    carousel.scrollLeft = (patientFlow.resultSlide || 0) * carousel.clientWidth;
  });
  resultResizeObserver.observe(carousel);
}
function syncResultSlide(index) {
  const panels = document.querySelectorAll('#resultCarousel .pf-result-panel');
  patientFlow.resultSlide = Math.max(0, Math.min(panels.length - 1, index));
  document.querySelectorAll('.pf-result-tabs button').forEach((tab, current) => {
    const active = current === patientFlow.resultSlide;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach((panel, current) => {
    const active = current === patientFlow.resultSlide;
    panel.inert = !active;
    panel.setAttribute('aria-hidden', String(!active));
  });
}
function queueResultSlideSync() {
  if (resultScrollFrame !== null) return;
  resultScrollFrame = requestAnimationFrame(() => {
    resultScrollFrame = null;
    const carousel = document.getElementById('resultCarousel');
    if (carousel?.clientWidth) syncResultSlide(Math.round(carousel.scrollLeft / carousel.clientWidth));
  });
}
function goResultSlide(index) {
  const carousel = document.getElementById('resultCarousel');
  if (!carousel) return;
  index = Math.max(0, Math.min(carousel.children.length - 1, index));
  carousel.scrollTo({ left: index * carousel.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
function handleResultSlideKey(event) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  goResultSlide((patientFlow.resultSlide || 0) + (event.key === 'ArrowRight' ? 1 : -1));
}
function toggleAssessmentOverlay(show) {
  const panel = document.getElementById('resultPanel1');
  const scroll = panel?.scrollTop || 0;
  patientFlow.overlay = show;
  renderPatientTab(patientFlow.tab);
  document.getElementById('resultPanel1').scrollTop = scroll;
}
