/* Live camera acquisition and the three-second quality gate. */
const tongueCameraState = {
  timer: null, loading: false, armed: false, quality: null, previousGray: null,
  clock: { goodSince: null, lastSampleAt: null }, best: null, sample: null,
  mask: null, lastVideoTime: -1, openedAt: 0, dismissedIssue: null, lastIssue: null,
  facing: 'user', layoutObserver: null, guideLayout: ''
};

function resetTongueCountdown() {
  tongueCameraState.clock = { goodSince: null, lastSampleAt: null, progress: 0, remaining: 3, ready: false };
  tongueCameraState.best = null;
}
function stopPatientCamera() {
  patientFlow.operation++;
  tongueCameraState.layoutObserver?.disconnect();
  tongueCameraState.layoutObserver = null;
  tongueCameraState.guideLayout = '';
  document.querySelector('.mobile-device-shell')?.classList.remove('is-camera-view');
  clearInterval(tongueCameraState.timer);
  tongueCameraState.timer = null;
  tongueCameraState.loading = false;
  tongueCameraState.armed = false;
  tongueCameraState.quality = null;
  tongueCameraState.previousGray = null;
  resetTongueCountdown();
  if (patientFlow.stream) patientFlow.stream.getTracks().forEach(track => track.stop());
  patientFlow.stream = null;
}
function tongueGuideSvg(instructions = false) {
  return `<svg viewBox="0 0 300 400" class="pf-tongue-guide ${instructions ? 'pf-guide-illustration' : ''}" aria-hidden="true"><path class="pf-guide-shade" d="M0 0H300V400H0Z ${TONGUE_CAPTURE.outline}" fill-rule="evenodd"/><path class="pf-tongue-outline" d="${TONGUE_CAPTURE.outline}"/><path class="pf-guide-midline" d="M150 82V320"/><text x="150" y="30" text-anchor="middle">Cuống lưỡi</text><text x="150" y="382" text-anchor="middle">Đầu lưỡi</text></svg>`;
}
function renderCaptureGuide() {
  const body = `<div class="pf-intro"><h2>Hướng dẫn chụp ảnh</h2></div><div class="pf-guide-preview">${tongueGuideSvg(true)}<div><h3>Căn lưỡi trong khuôn</h3><p>Thấy rõ cuống lưỡi và đầu lưỡi.</p><span class="pf-guide-seconds">3<small>giây giữ yên</small></span></div></div>
    <section class="pf-instruction-list">${[
      ['sun', 'Đủ sáng', 'Hướng mặt về nguồn sáng, tránh lóa.'],
      ['scan-line', 'Đúng khuôn', 'Đưa lưỡi ra tự nhiên, căn theo viền.'],
      ['timer', 'Giữ yên', 'Bấm Chụp rồi giữ máy và lưỡi yên 3 giây.']
    ].map(([icon, title, description]) => `<div><span>${patientIcon(icon)}</span><div><h3>${title}</h3><p>${description}</p></div></div>`).join('')}</section>`;
  return renderPatientStage(body, `<button class="pf-primary" onclick="acceptTongueCaptureGuide()">${patientIcon('camera')} Mở camera</button>${renderCaptureTestShortcut()}`, 'pf-stage-guide');
}
function renderCaptureTestShortcut() {
  return `<button class="pf-secondary" onclick="bypassTongueCaptureForTest()" aria-label="Bỏ qua chụp ảnh để test">Bỏ qua để test</button>`;
}
function bypassTongueCaptureForTest() {
  stopPatientCamera();
  const canvas = document.createElement('canvas');
  canvas.width = 300; canvas.height = 400;
  const context = canvas.getContext('2d');
  context.fillStyle = '#e8f3ef'; context.fillRect(0, 0, 300, 400);
  context.fillStyle = '#d99b9e'; context.fill(new Path2D(TONGUE_CAPTURE.outline));
  context.fillStyle = '#efddd0';
  context.beginPath(); context.ellipse(150, 160, 55, 65, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#115e59'; context.font = 'bold 16px sans-serif'; context.textAlign = 'center';
  context.fillText('ẢNH KIỂM THỬ', 150, 380);
  patientFlow.draft = { ...newAssessmentDraft(), guidanceAccepted: true, stage: 'questions', photo: canvas.toDataURL('image/png'), photoKind: 'test', confirmed: true };
  patientFlow.resultId = null;
  patientFlow.resultSlide = 0;
  patientFlow.completing = false;
  patientFlow.error = '';
  renderPatientTab('diagnosis');
}
function renderAssessmentCapture() {
  const draft = patientFlow.draft;
  if (draft.stage === 'guide') return renderCaptureGuide();
  if (draft.stage === 'review') return renderPatientStage(`<div class="pf-intro"><h2>${draft.photoKind === 'test' ? 'Ảnh kiểm thử' : 'Xác nhận ảnh'}</h2><p>Kiểm tra ảnh trước khi tiếp tục.</p></div><div class="pf-capture has-photo pf-photo-review"><img src="${escapePatientText(draft.photo)}" alt="${draft.photoKind === 'test' ? 'Ảnh kiểm thử' : 'Ảnh lưỡi đã chụp'}"></div>`, `<button class="pf-secondary" onclick="retakeTonguePhoto()">Chụp lại</button><button class="pf-primary" onclick="confirmTonguePhoto()">Dùng ảnh này ${patientIcon('arrow-right')}</button>`, 'pf-stage-review');
  const body = `<div class="pf-live-camera" id="tongueCameraFrame"><video id="tongueCamera" class="${tongueCameraState.facing === 'user' ? 'is-mirrored' : ''}" autoplay muted playsinline aria-label="Camera chụp ảnh lưỡi"></video><div class="pf-camera-guide-region" id="cameraGuideRegion">${tongueGuideSvg()}</div>
      <div id="cameraCountdown" class="pf-capture-countdown" hidden><strong id="cameraCountdownNumber">3</strong><span>Giữ yên</span></div>
      <div id="cameraQualityPopup" class="pf-quality-popup" role="alert" hidden><span>${patientIcon('triangle-alert')}</span><div><strong id="cameraQualityTitle"></strong><p id="cameraQualityMessage"></p></div><button onclick="dismissCameraQualityPopup()" aria-label="Đóng thông báo chất lượng">${patientIcon('x')}</button></div>
      ${!patientFlow.stream ? `<div class="pf-camera-loading">${tongueCameraState.loading ? '<div class="pf-spinner"></div><span>Đang mở camera…</span>' : `${patientIcon('camera-off')}<span>Camera chưa hoạt động</span>`}</div>` : ''}</div>
    <div class="pf-camera-status pf-visually-hidden" id="cameraStatus" role="status" aria-live="polite">${patientFlow.stream ? 'Đặt lưỡi trong khung rồi bấm Chụp.' : tongueCameraState.loading ? 'Cho phép truy cập camera để tiếp tục.' : 'Mở lại camera để tiếp tục chụp ảnh.'}</div>
    ${patientFlow.error ? `<p class="pf-error" role="alert">${escapePatientText(patientFlow.error)}</p>` : ''}`;
  const controls = `<div class="pf-camera-topbar"><button class="pf-camera-icon" onclick="renderPatientTab('home')" aria-label="Đóng camera">${patientIcon('x')}</button><button class="pf-camera-icon" onclick="showTongueCaptureGuide()" aria-label="Xem lại hướng dẫn">${patientIcon('circle-help')}</button></div><div class="pf-camera-dock"><button class="pf-camera-icon pf-camera-test" onclick="bypassTongueCaptureForTest()" aria-label="Bỏ qua chụp ảnh để test">${patientIcon('skip-forward')}<small>Test</small></button><button id="cameraShutter" class="pf-camera-shutter" aria-label="${patientFlow.stream ? 'Chụp' : tongueCameraState.loading ? 'Đang mở camera' : 'Mở lại camera'}" onclick="${patientFlow.stream ? 'armTongueCapture()' : 'openTongueCamera()'}" ${tongueCameraState.loading ? 'disabled' : ''}>${patientFlow.stream ? '<span class="pf-shutter-core"></span>' : patientIcon('rotate-cw')}</button>${patientFlow.stream ? `<button class="pf-camera-icon" onclick="switchTongueCamera()" aria-label="Đổi camera trước hoặc sau">${patientIcon('switch-camera')}</button>` : '<span></span>'}</div>`;
  return `<section class="pf-stage pf-stage-camera">${body}${controls}</section>`;
}
function showTongueCaptureGuide() {
  stopPatientCamera();
  patientFlow.error = '';
  patientFlow.draft.stage = 'guide';
  renderPatientTab('diagnosis');
}
function acceptTongueCaptureGuide() {
  if (!patientFlow.draft) return;
  patientFlow.draft.guidanceAccepted = true;
  openTongueCamera();
}
async function openTongueCamera() {
  const draft = patientFlow.draft;
  if (!draft?.guidanceAccepted) return;
  stopPatientCamera();
  draft.stage = 'camera';
  patientFlow.error = '';
  tongueCameraState.loading = true;
  const operation = patientFlow.operation;
  renderPatientTab('diagnosis');
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('unavailable');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: tongueCameraState.facing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    if (operation !== patientFlow.operation || draft !== patientFlow.draft || patientFlow.tab !== 'diagnosis' || appState.currentScreen !== 'screen-patient') {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    patientFlow.stream = stream;
    tongueCameraState.loading = false;
    // Mirror only when the actual device reports a front camera.
    const facing = stream.getVideoTracks()[0]?.getSettings().facingMode;
    if (facing === 'environment' || facing === 'user') tongueCameraState.facing = facing;
    stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
      if (patientFlow.stream !== stream) return;
      stopPatientCamera();
      patientFlow.error = 'Camera đã ngắt kết nối. Vui lòng kiểm tra thiết bị và mở lại camera.';
      if (patientFlow.tab === 'diagnosis') renderPatientTab('diagnosis');
    }, { once: true }));
    renderPatientTab('diagnosis');
  } catch (error) {
    if (operation !== patientFlow.operation) return;
    tongueCameraState.loading = false;
    patientFlow.error = !window.isSecureContext ? 'Camera cần được mở qua HTTPS hoặc localhost.'
      : error.name === 'NotAllowedError' ? 'Chưa có quyền camera. Vui lòng cho phép camera trong trình duyệt rồi thử lại.'
      : error.name === 'NotFoundError' ? 'Không tìm thấy camera. Vui lòng kết nối camera rồi thử lại.'
      : 'Không mở được camera. Hãy kiểm tra quyền truy cập và đóng ứng dụng khác đang dùng camera.';
    renderPatientTab('diagnosis');
  }
}
function switchTongueCamera() {
  tongueCameraState.facing = tongueCameraState.facing === 'user' ? 'environment' : 'user';
  openTongueCamera();
}
function attachTongueCamera() {
  const video = document.getElementById('tongueCamera');
  if (!video) return;
  tongueCameraState.layoutObserver?.disconnect();
  layoutTongueCameraGuide();
  tongueCameraState.layoutObserver = new ResizeObserver(layoutTongueCameraGuide);
  tongueCameraState.layoutObserver.observe(document.getElementById('tongueCameraFrame'));
  if (!patientFlow.stream) return;
  clearInterval(tongueCameraState.timer);
  tongueCameraState.armed = false;
  tongueCameraState.previousGray = null;
  tongueCameraState.lastVideoTime = -1;
  tongueCameraState.quality = null;
  tongueCameraState.dismissedIssue = null;
  tongueCameraState.lastIssue = null;
  tongueCameraState.openedAt = performance.now();
  resetTongueCountdown();
  const sample = document.createElement('canvas');
  sample.width = TONGUE_CAPTURE.width; sample.height = TONGUE_CAPTURE.height;
  const maskContext = sample.getContext('2d', { willReadFrequently: true });
  maskContext.scale(sample.width / 300, sample.height / 400);
  maskContext.fill(new Path2D(TONGUE_CAPTURE.outline));
  const pixels = maskContext.getImageData(0, 0, sample.width, sample.height).data;
  tongueCameraState.mask = Uint8Array.from({ length: sample.width * sample.height }, (_, index) => pixels[index * 4 + 3] > 128 ? 1 : 0);
  maskContext.setTransform(1, 0, 0, 1, 0, 0);
  tongueCameraState.sample = sample;
  video.srcObject = patientFlow.stream;
  const operation = patientFlow.operation;
  video.play().catch(() => {
    if (operation !== patientFlow.operation) return;
    stopPatientCamera();
    patientFlow.error = 'Không phát được hình ảnh camera. Vui lòng mở lại camera.';
    renderPatientTab('diagnosis');
  });
  tongueCameraState.timer = setInterval(pollTongueCamera, 150);
}
function layoutTongueCameraGuide() {
  const frame = document.getElementById('tongueCameraFrame');
  const guide = document.getElementById('cameraGuideRegion');
  if (!frame || !guide || !frame.clientWidth || !frame.clientHeight) return;
  const width = Math.min(frame.clientWidth - 32, Math.max(80, frame.clientHeight - 220) * .75, 400);
  const height = width / .75;
  const left = (frame.clientWidth - width) / 2;
  const top = 64 + Math.max(0, (frame.clientHeight - 220 - height) / 2);
  const signature = [width, height, left, top].join(':');
  guide.style.cssText = `width:${width}px;height:${height}px;left:${left}px;top:${top}px`;
  if (signature !== tongueCameraState.guideLayout) {
    tongueCameraState.guideLayout = signature;
    resetTongueCountdown();
    tongueCameraState.previousGray = null;
    tongueCameraState.quality = null;
  }
}
function getTongueCameraCrop(video) {
  const frame = video.getBoundingClientRect();
  const guide = document.getElementById('cameraGuideRegion').getBoundingClientRect();
  return computeTongueVideoCrop(frame.width, frame.height, video.videoWidth, video.videoHeight,
    { left: guide.left - frame.left, top: guide.top - frame.top, width: guide.width, height: guide.height }, tongueCameraState.facing === 'user');
}
function drawTongueCameraFrame(canvas, video) {
  const context = canvas.getContext('2d', { willReadFrequently: canvas === tongueCameraState.sample });
  const crop = getTongueCameraCrop(video);
  context.save();
  if (tongueCameraState.facing === 'user') { context.translate(canvas.width, 0); context.scale(-1, 1); }
  context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  context.restore();
  return context;
}
function bestTongueCameraFrame(video) {
  const canvas = document.createElement('canvas');
  const crop = getTongueCameraCrop(video);
  const scale = Math.min(1, 960 / crop.height);
  canvas.width = Math.round(crop.width * scale); canvas.height = Math.round(canvas.width / .75);
  drawTongueCameraFrame(canvas, video);
  return canvas;
}
function pollTongueCamera() {
  const video = document.getElementById('tongueCamera');
  if (!video || !patientFlow.stream || patientFlow.draft?.stage !== 'camera') return;
  const now = performance.now();
  if (document.hidden || video.readyState < 2 || video.paused || !video.videoWidth || tongueCameraState.lastVideoTime === video.currentTime) {
    if (tongueCameraState.clock.lastSampleAt !== null && now - tongueCameraState.clock.lastSampleAt > TONGUE_CAPTURE.maximumFrameGap) {
      resetTongueCountdown();
      tongueCameraState.quality = null;
      updateTongueCameraUi();
    }
    return;
  }
  tongueCameraState.lastVideoTime = video.currentTime;
  try {
    const canvas = tongueCameraState.sample;
    const context = drawTongueCameraFrame(canvas, video);
    const quality = analyzeTongueFrame(context.getImageData(0, 0, canvas.width, canvas.height), tongueCameraState.previousGray, tongueCameraState.mask);
    tongueCameraState.previousGray = quality.gray;
    tongueCameraState.quality = quality;
    if (quality.issue !== tongueCameraState.lastIssue) tongueCameraState.dismissedIssue = null;
    tongueCameraState.lastIssue = quality.issue;
    if (tongueCameraState.armed) {
      tongueCameraState.clock = advanceTongueCountdown(tongueCameraState.clock, quality, now);
      if (!quality.ready) tongueCameraState.best = null;
      else {
        const rank = quality.sharpness / (1 + Math.abs(quality.brightness - 150) / 150 + quality.motion / 10);
        if (!tongueCameraState.best || rank > tongueCameraState.best.rank) {
          const { brightness, sharpness, motion, coverage, containment } = quality;
          tongueCameraState.best = { canvas: bestTongueCameraFrame(video), rank, quality: { brightness, sharpness, motion, coverage, containment } };
        }
        if (tongueCameraState.clock.ready) { finishTongueCapture(); return; }
      }
    }
    updateTongueCameraUi();
  } catch {
    stopPatientCamera();
    patientFlow.error = 'Không đọc được khung hình camera. Vui lòng mở lại camera.';
    renderPatientTab('diagnosis');
  }
}
function armTongueCapture() {
  if (!patientFlow.stream || tongueCameraState.armed || patientFlow.draft?.stage !== 'camera') return;
  tongueCameraState.armed = true;
  tongueCameraState.dismissedIssue = null;
  resetTongueCountdown();
  updateTongueCameraUi();
}
function cancelTongueCapture() {
  tongueCameraState.armed = false;
  resetTongueCountdown();
  updateTongueCameraUi();
}
function dismissCameraQualityPopup() {
  tongueCameraState.dismissedIssue = tongueCameraState.quality?.issue;
  document.getElementById('cameraQualityPopup').hidden = true;
}
function updateTongueCameraUi() {
  const shutter = document.getElementById('cameraShutter');
  if (!shutter || !patientFlow.stream) return;
  const state = tongueCameraState, quality = state.quality;
  document.getElementById('tongueCameraFrame').classList.toggle('is-ready', Boolean(quality?.ready));
  shutter.disabled = false;
  shutter.classList.toggle('is-armed', state.armed);
  shutter.setAttribute('aria-label', state.armed ? 'Hủy tự chụp' : 'Chụp');
  shutter.onclick = state.armed ? cancelTongueCapture : armTongueCapture;
  shutter.setAttribute('aria-pressed', String(state.armed));
  const counting = state.armed && state.clock.goodSince !== null;
  const countdown = document.getElementById('cameraCountdown');
  countdown.hidden = !counting;
  countdown.style.setProperty('--capture-progress', `${(state.clock.progress || 0) * 360}deg`);
  document.getElementById('cameraCountdownNumber').textContent = state.clock.remaining || 3;
  const issues = {
    dark: ['Ảnh chưa đủ sáng', 'Di chuyển đến nơi sáng hơn, hướng mặt về nguồn sáng dịu.'],
    bright: ['Ảnh đang bị lóa', 'Tránh nguồn sáng chiếu trực tiếp và điều chỉnh vị trí máy.'],
    blur: ['Ảnh chưa đủ nét', 'Lau sạch ống kính, giữ máy yên và điều chỉnh khoảng cách.'],
    alignment: ['Lưỡi chưa vừa khung', 'Đặt cuống lưỡi, hai bên và đầu lưỡi trong đường viền.'],
    motion: ['Máy hoặc lưỡi đang di chuyển', 'Giữ nguyên vị trí để bắt đầu lại khoảng 3 giây.']
  };
  const status = counting ? `Ảnh đạt yêu cầu. Giữ yên ${state.clock.remaining} giây…`
    : quality?.issue ? `${issues[quality.issue][0]}.${state.armed ? ' Bộ đếm sẽ bắt đầu khi ảnh đạt yêu cầu.' : ''}`
    : !quality ? 'Đang kiểm tra khung hình…' : state.armed ? 'Đang chờ khung hình đạt chất lượng…' : 'Đã sẵn sàng. Bấm Chụp để bắt đầu giữ yên 3 giây.';
  const statusElement = document.getElementById('cameraStatus');
  if (statusElement.textContent !== status) statusElement.textContent = status;
  const showPopup = quality?.issue && state.dismissedIssue !== quality.issue
    && performance.now() - state.openedAt > 900 && (state.armed || ['dark', 'bright', 'blur'].includes(quality.issue));
  const popup = document.getElementById('cameraQualityPopup');
  popup.hidden = !showPopup;
  if (showPopup) {
    document.getElementById('cameraQualityTitle').textContent = issues[quality.issue][0];
    document.getElementById('cameraQualityMessage').textContent = issues[quality.issue][1];
  }
}
function finishTongueCapture() {
  const state = tongueCameraState, draft = patientFlow.draft;
  if (!state.armed || !state.clock.ready || !state.quality?.ready || !state.best || !draft) return;
  const best = state.best;
  draft.photo = best.canvas.toDataURL('image/jpeg', .86);
  draft.photoKind = 'camera';
  draft.brightness = Math.round(best.quality.brightness);
  draft.captureQuality = best.quality;
  draft.confirmed = false;
  draft.answers.fill(null);
  draft.questionIndex = 0;
  draft.stage = 'review';
  stopPatientCamera();
  patientFlow.error = '';
  renderPatientTab('diagnosis');
}
function retakeTonguePhoto() {
  stopPatientCamera();
  patientFlow.draft = newAssessmentDraft();
  patientFlow.draft.guidanceAccepted = true;
  openTongueCamera();
}
function confirmTonguePhoto() {
  if (!patientFlow.draft?.photo || patientFlow.draft.stage !== 'review') return;
  patientFlow.draft.confirmed = true;
  patientFlow.draft.stage = 'questions';
  renderPatientTab('diagnosis');
}
window.addEventListener('pagehide', stopPatientCamera);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (patientFlow.stream || tongueCameraState.loading)) {
    stopPatientCamera();
    patientFlow.error = 'Camera đã tạm dừng khi bạn rời ứng dụng. Mở lại camera để tiếp tục.';
    if (patientFlow.tab === 'diagnosis') renderPatientTab('diagnosis');
  }
});
