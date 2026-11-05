/**
 * BreathCare AI - Clinical Oral Assessment Application
 * Pure JavaScript logic separated from index.html
 */

// Application State Management
const state = {
  isFlashOn: false,
  currentAngle: 'Mặt lưng lưỡi (Dorsal)',
  hasCapturedPhoto: false,
  stepCompleted: 1, // Step 1 is completed by default
  sampleCapturedDataUrl: null
};

// Initialize Application once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Render Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Setup Notification Button Click
  const notifyBtn = document.getElementById('notifyBtn');
  if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
      showToast('Bạn có lịch khám đo khí Halimeter lúc 14:30 hôm nay.');
    });
  }
});

/**
 * Toast Notification Utility
 * @param {string} message - Notification text
 */
function showToast(message) {
  const toast = document.getElementById('toastMessage');
  const text = document.getElementById('toastText');
  if (!toast || !text) return;

  text.innerText = message;
  toast.classList.remove('hidden');
  // Trigger animation frame for CSS transition
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  if (toast._timer) {
    clearTimeout(toast._timer);
  }

  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/**
 * Tab Navigation Controller
 * @param {'home' | 'form' | 'history' | 'profile'} tab
 */
function switchTab(tab) {
  // Update nav item active state
  const navIds = {
    home: 'navHome',
    form: 'navForm',
    history: 'navHistory',
    profile: 'navProfile'
  };

  Object.entries(navIds).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) {
      if (key === tab) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });

  if (tab === 'form') {
    openFormModal();
  } else if (tab === 'history') {
    openHistoryModal();
  } else if (tab === 'home') {
    showToast('Bạn đang ở Trang chủ sàng lọc nguy cơ hôi miệng');
  } else if (tab === 'profile') {
    showToast('Hồ sơ bệnh nhân: Trần Tuấn Anh (Mã: #VSC-3184)');
  }
}

/**
 * Camera Viewfinder Modal Controllers
 */
function openCameraModal() {
  const modal = document.getElementById('cameraModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeCameraModal() {
  const modal = document.getElementById('cameraModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Flashlight toggle simulation for oral inspection
 */
function toggleFlash() {
  state.isFlashOn = !state.isFlashOn;
  const icon = document.getElementById('flashIcon');
  const btn = document.getElementById('flashToggle');

  if (!btn) return;

  if (state.isFlashOn) {
    btn.style.backgroundColor = '#fbbf24';
    btn.style.color = '#0f172a';
    showToast('Đã bật đèn quang học soi rêu lưỡi');
  } else {
    btn.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
    btn.style.color = '#ffffff';
    showToast('Đã tắt đèn trợ sáng');
  }
}

/**
 * Angle Selector for Oral / Tongue positioning
 * @param {HTMLElement} btn
 * @param {'mat-lung-luoi' | 'hoc-amidan' | 'niem-mac-rang'} angleKey
 */
function setAngle(btn, angleKey) {
  document.querySelectorAll('.angle-btn').forEach(b => {
    b.classList.remove('active');
  });
  if (btn) {
    btn.classList.add('active');
  }

  const angleMap = {
    'mat-lung-luoi': 'Mặt lưng lưỡi (Dorsal)',
    'hoc-amidan': 'Khe Amidan (Tonsil Stones)',
    'niem-mac-rang': 'Viền nướu & Kẽ răng'
  };

  state.currentAngle = angleMap[angleKey] || 'Mặt lưng lưỡi (Dorsal)';
  showToast(`Chuyển sang góc: ${state.currentAngle}`);
}

/**
 * Simulate camera shutter & generate realistic clinical oral preview
 */
function triggerCapture() {
  const flash = document.getElementById('flashOverlay');
  if (flash) {
    flash.style.opacity = '0.85';
  }

  setTimeout(() => {
    if (flash) {
      flash.style.opacity = '0';
    }

    // Create simulated tongue/oral preview canvas
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // Clinical oral background
    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, '#f87171');
    grad.addColorStop(0.5, '#e11d48');
    grad.addColorStop(1, '#881337');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);

    // Anatomical tongue shape
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(200, 240, 110, 140, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lingual coating (VSC-producing biofilm, pale yellow/white)
    ctx.fillStyle = 'rgba(254, 243, 199, 0.72)';
    ctx.beginPath();
    ctx.ellipse(200, 210, 65, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lingual papillae texture
    ctx.fillStyle = '#fffbeb';
    for (let i = 0; i < 48; i++) {
      const x = 145 + Math.random() * 110;
      const y = 160 + Math.random() * 95;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const dataUrl = canvas.toDataURL('image/jpeg');
    state.sampleCapturedDataUrl = dataUrl;

    // Transition to Result Verification Modal
    closeCameraModal();
    const resultImg = document.getElementById('resultImagePreview');
    const labelAngle = document.getElementById('labelAngle');
    const previewModal = document.getElementById('previewResultModal');

    if (resultImg) resultImg.src = dataUrl;
    if (labelAngle) labelAngle.innerText = state.currentAngle;
    if (previewModal) previewModal.classList.remove('hidden');
  }, 250);
}

/**
 * Handle image file selected from device storage
 * @param {Event} event
 */
function handleFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      state.sampleCapturedDataUrl = e.target.result;
      closeCameraModal();

      const resultImg = document.getElementById('resultImagePreview');
      const labelAngle = document.getElementById('labelAngle');
      const previewModal = document.getElementById('previewResultModal');

      if (resultImg) resultImg.src = e.target.result;
      if (labelAngle) labelAngle.innerText = state.currentAngle;
      if (previewModal) previewModal.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

/**
 * Close result verification dialog
 * @param {boolean} isConfirmed
 */
function closeResultModal(isConfirmed) {
  const previewModal = document.getElementById('previewResultModal');
  if (previewModal) {
    previewModal.classList.add('hidden');
  }
  if (!isConfirmed) {
    openCameraModal();
  }
}

/**
 * Confirm and commit photo to patient record
 */
function confirmAndSavePhoto() {
  closeResultModal(true);
  state.hasCapturedPhoto = true;

  // Update Step 2 Card Badge
  const badge = document.getElementById('step2Badge');
  if (badge) {
    badge.className = 'badge badge-emerald';
    badge.innerText = 'Đã chụp cặn lưỡi';
  }

  // Display Thumbnail
  const previewBox = document.getElementById('capturedPreviewBox');
  const thumbImg = document.getElementById('thumbImg');
  if (thumbImg && state.sampleCapturedDataUrl) {
    thumbImg.src = state.sampleCapturedDataUrl;
  }
  if (previewBox) {
    previewBox.classList.remove('hidden');
  }

  // Update Progress Meter
  const progressText = document.getElementById('progressText');
  const progressBar = document.getElementById('progressBar');
  if (progressText) {
    progressText.innerText = '2 / 3 Hoàn tất';
  }
  if (progressBar) {
    progressBar.style.width = '66.6%';
  }

  // Insert to Assessment History
  const historyList = document.getElementById('historyListContainer');
  const noteInput = document.getElementById('photoPatientNote');
  const noteText = (noteInput && noteInput.value.trim()) ? noteInput.value.trim() : 'Không có ghi chú thêm';

  if (historyList) {
    const newItem = document.createElement('div');
    newItem.className = 'history-item history-item--recent';
    newItem.innerHTML = `
      <div class="history-item__thumb">
        <img src="${state.sampleCapturedDataUrl}" alt="Tongue photo preview">
      </div>
      <div class="history-item__content">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.75rem; font-weight: 700; color: #0f172a;">${state.currentAngle}</span>
          <span class="badge badge-teal">Vừa nộp</span>
        </div>
        <p style="font-size: 0.6875rem; color: #475569; margin-top: 0.125rem;">Ghi chú: ${escapeHtml(noteText)}</p>
        <div class="history-item__meta-row">
          <span>Vừa xong • Trực tuyến</span>
          <span style="color: var(--brand-700); font-weight: 600;">Chờ đối chiếu Halimeter</span>
        </div>
      </div>
    `;
    historyList.prepend(newItem);
  }

  showToast('Đã lưu ảnh phân tích cặn lưỡi gửi tới Bác sĩ Đức');

  // Re-run Lucide Icons for dynamic content
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Google Form / Clinical Questionnaire Handlers
 * @param {boolean} isReview
 */
function openFormModal(isReview) {
  const modal = document.getElementById('formModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
  if (isReview) {
    showToast('Xem lại phiếu khảo sát hơi thở & vi sinh');
  }
}

function closeFormModal() {
  const modal = document.getElementById('formModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  showToast('Đã cập nhật câu trả lời khảo sát');
}

/**
 * Clinical History Modal Handlers
 */
function openHistoryModal() {
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeHistoryModal() {
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Quick Add Medication / Allergy for Halitosis Risk
 */
function quickAddAllergy() {
  const meds = prompt('Nhập tên thuốc điều trị, nước súc miệng đang dùng hoặc tiền sử bệnh dạ dày:');
  if (meds && meds.trim() !== '') {
    showToast('Đã lưu thông tin thuốc/nước súc miệng gửi cho bác sĩ!');
    const step3Badge = document.getElementById('step3Badge');
    if (step3Badge) {
      step3Badge.innerText = 'Đã cập nhật';
      step3Badge.className = 'badge badge-emerald';
    }

    // Full progress completed
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    if (progressText) {
      progressText.innerText = '3 / 3 Sẵn sàng đo Halimeter!';
    }
    if (progressBar) {
      progressBar.style.width = '100%';
    }
  }
}

/**
 * Helper: Quick tips for tongue photographing
 */
function showCameraTips() {
  showToast('Mẹo: Đưa lưỡi ra nhẹ nhàng tự nhiên (không gồng cứng), hướng camera vuông góc với đáy lưỡi.');
}

/**
 * Helper: Basic HTML escaping
 */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(match) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escapeMap[match];
  });
}
