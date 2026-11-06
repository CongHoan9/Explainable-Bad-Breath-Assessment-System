/* Three horizontally paged result screens, with touch and keyboard navigation. */
let resultResizeObserver = null;
let resultScrollFrame = null;

function renderAnalyzedTongue(record) {
  const coating = record.answers[3];
  return `<section class="pf-card"><div class="pf-section-title"><h3>Ảnh phân tích</h3><span class="pf-badge">${record.photoKind === 'test' ? 'Ảnh kiểm thử' : 'Ảnh đã lưu'}</span></div><div class="pf-image-switch" role="group" aria-label="Chế độ xem ảnh"><button onclick="toggleAssessmentOverlay(false)" aria-pressed="${!patientFlow.overlay}" class="${!patientFlow.overlay ? 'active' : ''}">Ảnh gốc</button><button onclick="toggleAssessmentOverlay(true)" aria-pressed="${patientFlow.overlay}" class="${patientFlow.overlay ? 'active' : ''}">Vùng quan sát</button></div>
    <div class="pf-analysis-image pf-portrait-analysis"><img src="${escapePatientText(record.photo)}" alt="Ảnh lưỡi trong lần đánh giá">${patientFlow.overlay ? `<svg viewBox="0 0 300 400" aria-label="Sơ đồ vùng tham chiếu trên lưỡi" role="img"><defs><clipPath id="tongueRegion"><path d="${TONGUE_CAPTURE.outline}"/></clipPath></defs><g clip-path="url(#tongueRegion)">${[0, 1, 2].map(row => [0, 1].map(col => `<rect x="${53 + col * 97}" y="${52 + row * 101}" width="97" height="101" fill="${coating === 0 ? '#10b981' : row < (coating === 1 ? 1 : coating === 2 ? 2 : 3) ? '#f59e0b' : '#2dd4bf'}" fill-opacity=".3" stroke="white" stroke-opacity=".8" stroke-dasharray="3 3"/>`).join('')).join('')}</g><path d="${TONGUE_CAPTURE.outline}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="5 4"/><text x="150" y="32" text-anchor="middle" fill="#fff" stroke="#164e63" stroke-width=".4" font-size="11">Vùng cuống lưỡi</text><text x="150" y="382" text-anchor="middle" fill="#fff" stroke="#164e63" stroke-width=".4" font-size="11">Vùng đầu lưỡi</text></svg>` : ''}</div>
    <div class="pf-analysis-legend"><span><i></i> Vùng tham chiếu</span><span><i></i> Vùng rêu theo mô tả</span></div><p class="pf-image-caption">Lớp phủ màu minh họa theo mô tả rêu lưỡi trong câu trả lời, không xác định tổn thương trên ảnh.</p></section>`;
}
function renderAssessmentResult(record, { fromHistory = false } = {}) {
  const level = ASSESSMENT_LEVELS[record.level];
  const slide = patientFlow.resultSlide || 0;
  return `<div class="pf-result-heading"><h2>Kết quả đánh giá</h2></div>
    <div class="pf-result-tabs" role="tablist" aria-label="Chi tiết kết quả" onkeydown="handleResultSlideKey(event)">${['Mức độ', 'Ảnh phân tích', 'Giải thích'].map((label, index) => `<button id="resultTab${index}" role="tab" aria-controls="resultPanel${index}" aria-selected="${slide === index}" tabindex="${slide === index ? 0 : -1}" onclick="goResultSlide(${index})">${label}</button>`).join('')}</div>
    <div class="pf-result-shell"><div id="resultCarousel" class="pf-result-carousel" onscroll="queueResultSlideSync()" onkeydown="handleResultSlideKey(event)">
      <section id="resultPanel0" class="pf-result-panel" role="tabpanel" aria-labelledby="resultTab0" tabindex="0" ${slide !== 0 ? 'inert aria-hidden="true"' : ''}>
        <div class="pf-level-summary pf-level--${record.level}"><span class="pf-badge">MỨC ĐỘ HÔI MIỆNG ƯỚC TÍNH</span><div class="pf-level-dial"><strong class="pf-result-number">${record.level}<small>/ 3</small></strong></div><h2>${level.name}</h2></div>
        <div class="pf-result-scale">${ASSESSMENT_LEVELS.map((item, index) => `<div class="pf-level--${index} ${index === record.level ? 'selected' : ''}"><strong>${index}</strong><span>${item.name}</span></div>`).join('')}</div><p class="pf-result-date">${patientIcon('calendar-days')} ${formatAssessmentDate(record.createdAt)}</p>
        <p class="pf-result-note">Kết quả tham khảo, không thay thế đánh giá của bác sĩ.</p>
      </section>
      <section id="resultPanel1" class="pf-result-panel" role="tabpanel" aria-labelledby="resultTab1" tabindex="0" ${slide !== 1 ? 'inert aria-hidden="true"' : ''}>${renderAnalyzedTongue(record)}</section>
      <section id="resultPanel2" class="pf-result-panel" role="tabpanel" aria-labelledby="resultTab2" tabindex="0" ${slide !== 2 ? 'inert aria-hidden="true"' : ''}>
        <div class="pf-explanation-heading"><h3>Vì sao có mức độ ${record.level}?</h3></div><section class="pf-card"><div class="pf-reasons">${ASSESSMENT_QUESTIONS.map((question, index) => `<div><span class="pf-reason-dot pf-level--${record.answers[index]}"></span><div><strong>${question.short}</strong><p>${escapePatientText(question.options[record.answers[index]])}</p></div></div>`).join('')}</div></section>
      </section>
    </div><footer class="pf-stage-actions pf-result-actions ${fromHistory ? 'pf-result-actions--history' : ''}">${fromHistory ? '<button class="pf-secondary" onclick="returnToPatientHistory()">Quay lại lịch sử</button>' : '<button class="pf-secondary" onclick="returnToPatientHistory()">Lịch sử</button><button class="pf-primary" onclick="startAssessment()">Đánh giá mới</button>'}</footer></div>`;
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
    const index = patientFlow.resultSlide || 0;
    
    const panel = carousel.querySelector('.pf-result-panel');
    if (panel) {
        const slideWidth = panel.offsetWidth + 15;
        carousel.scrollLeft = index * slideWidth;
    }
    syncResultSlide(index);
    if (!resultResizeObserver) {
        resultResizeObserver = new ResizeObserver(() => {
            const currentPanel = carousel.querySelector('.pf-result-panel');
            if (currentPanel) {
                const slideWidth = currentPanel.offsetWidth + 15;
                carousel.scrollLeft = (patientFlow.resultSlide || 0) * slideWidth;
            }
        });
        resultResizeObserver.observe(carousel);
    }
}
function syncResultSlide(index) {
  patientFlow.resultSlide = Math.max(0, Math.min(2, index));
  document.querySelectorAll('.pf-result-tabs button').forEach((tab, current) => {
    const active = current === patientFlow.resultSlide;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(`resultPanel${current}`);
    panel.inert = !active;
    panel.setAttribute('aria-hidden', String(!active));
  });
}
function queueResultSlideSync() {
    if (resultScrollFrame !== null) return;
    resultScrollFrame = requestAnimationFrame(() => {
        resultScrollFrame = null;
        const carousel = document.getElementById('resultCarousel');
        const panel = carousel?.querySelector('.pf-result-panel');
        if (carousel && panel) {
            const slideWidth = panel.offsetWidth + 15;
            const activeIndex = Math.round(carousel.scrollLeft / slideWidth);
            syncResultSlide(activeIndex);
        }
    });
}
function goResultSlide(index) {
    const carousel = document.getElementById('resultCarousel');
    const panel = carousel?.querySelector('.pf-result-panel');
    if (!carousel || !panel) return;
    
    index = Math.max(0, Math.min(2, index));
    const slideWidth = panel.offsetWidth + 15;
    
    carousel.scrollTo({
        left: index * slideWidth,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
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
