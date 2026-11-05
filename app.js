/**
 * EXPLAINABLE BAD BREATH ASSESSMENT SYSTEM - MOBILE APP CONTROLLER
 * Single Active Screen State Management & JSON Data Loading (Pure JavaScript)
 */

// Global Application State
const appState = {
  currentScreen: 'screen-auth',
  currentUser: {
    username: 'Trần Tuấn Anh',
    phone: '0912 345 678',
    role: 'user',
    recordId: '#VSC-3184'
  },
  currentDoctor: {
    name: 'BS. Nguyễn Minh Đức',
    department: 'Vi sinh Khoang miệng & Điều trị Hơi thở',
    clinicRoom: 'Phòng 204'
  },
  isFlashActive: false,
  currentViewingPatientId: null,
  activeFilter: 'all',
  
  // Dữ liệu bệnh nhân được nạp động từ file patients.json
  patients: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Chỉ hiển thị màn hình auth khi khởi động
  navigateTo('screen-auth');

  // Nạp dữ liệu bệnh nhân từ file patients.json
  loadPatientsFromJson();

  // Khởi tạo icons Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * Nạp dữ liệu hồ sơ bệnh nhân từ file patients.json
 */
async function loadPatientsFromJson() {
  try {
    const res = await fetch('patients.json');
    if (res.ok) {
      appState.patients = await res.json();
      console.log('Đã nạp thành công dữ liệu từ patients.json:', appState.patients.length, 'hồ sơ');
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn('Lưu ý: Không thể fetch patients.json qua HTTP (thường gặp khi mở trực tiếp file:// trong trình duyệt). Đang sử dụng dữ liệu mặc định dự phòng.', err);
    // Dữ liệu dự phòng đồng bộ với patients.json khi mở dạng file:// cục bộ
    appState.patients = [
      {
        id: "VSC-3184",
        name: "Trần Tuấn Anh",
        age: 28,
        gender: "Nam",
        phone: "0912 345 678",
        submittedAt: "09:22 hôm nay",
        status: "pending",
        vscScore: 185,
        vscLevel: "Trung bình",
        photoUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
        photoAngle: "Mặt lưng lưỡi (Dorsal Tongue)",
        patientNote: "Rêu lưỡi trắng ngả vàng ở cuống lưỡi nhiều vào buổi sáng, cảm giác miệng khô và hơi đắng sau khi thức dậy.",
        winkelIndex: "4 / 12 (Màng sinh học tập trung 1/3 sau lưỡi)",
        survey: {
          peakTime: "Ngay sau khi thức dậy & Kéo dài suốt cả ngày",
          oralSensations: "Khô miệng đặc quánh vào ban đêm, vị đắng kim loại ở cuống họng",
          gerdHistory: "Thỉnh thoảng có ợ hơi, trào ngược dịch dạ dày sau bữa tối",
          cleaningHabit: "Chỉ dùng lông bàn chải cọ nhẹ qua lưỡi, chưa dùng cây cạo chuyên dụng",
          anxietyScore: "7 / 10 (Ngại giao tiếp gần với đồng nghiệp)"
        },
        medications: {
          prescriptions: "Loratadine 10mg (thuốc kháng dị ứng uống hàng ngày - tác dụng phụ giảm tiết nước bọt)",
          mouthwash: "Nước súc miệng thông thường chứa cồn 12% (dùng 2 lần/ngày)"
        },
        doctorDiagnosis: ""
      },
      {
        id: "VSC-8812",
        name: "Lê Thị Bích Ngọc",
        age: 34,
        gender: "Nữ",
        phone: "0988 776 554",
        submittedAt: "08:45 hôm nay",
        status: "urgent",
        vscScore: 340,
        vscLevel: "Nguy cơ rất cao (VSC > 250)",
        photoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80",
        photoAngle: "Khe Amidan & Đáy họng (Tonsil Crypts)",
        patientNote: "Thường khạc ra các hạt nhỏ màu trắng đục có mùi rất hôi, họng vướng víu kéo dài nhiều tháng.",
        winkelIndex: "8 / 12 (Lớp cặn sinh học dày bao phủ kèm sỏi amidan)",
        survey: {
          peakTime: "Liên tục suốt cả ngày, nặng hơn khi đói",
          oralSensations: "Từng khạc ra hạt nhỏ trắng đục (sỏi amidan), khô họng, khàn tiếng nhẹ",
          gerdHistory: "Ợ chua thường xuyên sau khi ăn đồ dầu mỡ",
          cleaningHabit: "Chưa từng cạo lưỡi, chỉ súc nước muối sinh lý",
          anxietyScore: "9 / 10 (Rất căng thẳng, phải đeo khẩu trang liên tục)"
        },
        medications: {
          prescriptions: "Amlodipine 5mg (thuốc huyết áp), Esomeprazole 40mg",
          mouthwash: "Chỉ dùng nước muối sinh lý 0.9%"
        },
        doctorDiagnosis: ""
      },
      {
        id: "VSC-5521",
        name: "Hoàng Văn Khang",
        age: 45,
        gender: "Nam",
        phone: "0903 221 188",
        submittedAt: "Hôm qua • 16:30",
        status: "reviewed",
        vscScore: 210,
        vscLevel: "Mức độ Trung bình cao",
        photoUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
        photoAngle: "Mặt lưng lưỡi (Dorsal Tongue)",
        patientNote: "Miệng khô rát vào buổi sáng, có cảm giác nóng rát ngực.",
        winkelIndex: "6 / 12 (Mảng vàng nhạt rải rác)",
        survey: {
          peakTime: "Sau khi ngủ dậy và sau ăn 1 tiếng",
          oralSensations: "Ợ chua, rát cổ họng, khô tuyến nước bọt",
          gerdHistory: "Tiền sử trào ngược dạ dày thực quản GERD độ A",
          cleaningHabit: "Dùng cây cạo lưỡi nhựa 1 lần/tuần",
          anxietyScore: "6 / 10"
        },
        medications: {
          prescriptions: "Pantoprazole 40mg, Domperidone 10mg",
          mouthwash: "Nước súc miệng thảo dược không cồn"
        },
        doctorDiagnosis: "Chỉ định vệ sinh cơ học đáy lưỡi bằng gel kháng khuẩn Kẽm + Điều trị dứt điểm trào ngược GERD."
      }
    ];
  }

  // Cập nhật giao diện danh sách Bác sĩ
  renderAdminPatientList(appState.activeFilter);
}

/**
 * CORE SCREEN MANAGER: Trong 1 thời điểm CHỈ 1 MÀN HÌNH ĐƯỢC HIỂN THỊ
 * @param {'screen-auth' | 'screen-patient' | 'screen-doctor' | 'screen-camera'} screenId 
 */
function navigateTo(screenId) {
  const allScreens = ['screen-auth', 'screen-patient', 'screen-doctor', 'screen-camera'];
  
  allScreens.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === screenId) {
        el.classList.remove('hidden');
        el.style.display = 'flex';
      } else {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    }
  });

  appState.currentScreen = screenId;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Toast Notification Utility
 * @param {string} msg 
 */
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;

  toastMsg.innerText = msg;
  toast.classList.remove('hidden');
  
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  if (toast._timer) {
    clearTimeout(toast._timer);
  }

  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 200);
  }, 2600);
}

/* ==========================================================================
   AUTHENTICATION LOGIC (LOGIN & REGISTER)
   ========================================================================== */

function switchAuthTab(tab) {
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginFormBox = document.getElementById('loginFormBox');
  const registerFormBox = document.getElementById('registerFormBox');

  if (tab === 'login') {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginFormBox.classList.remove('hidden');
    loginFormBox.style.display = 'flex';
    registerFormBox.classList.add('hidden');
    registerFormBox.style.display = 'none';
  } else {
    tabLoginBtn.classList.remove('active');
    tabRegisterBtn.classList.add('active');
    loginFormBox.classList.add('hidden');
    loginFormBox.style.display = 'none';
    registerFormBox.classList.remove('hidden');
    registerFormBox.style.display = 'flex';
  }
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function handleLoginSubmit(event) {
  if (event) event.preventDefault();

  const usernameInput = document.getElementById('loginUsername');
  const roleSelect = document.getElementById('authRoleSelect');
  
  const username = usernameInput ? usernameInput.value.trim() : '';
  const role = roleSelect ? roleSelect.value : 'user';

  if (!username) {
    showToast('Vui lòng nhập tên tài khoản (Username)!');
    return;
  }

  appState.currentUser.username = username;
  appState.currentUser.role = role;

  loginAs(role);
}

function handleRegisterSubmit(event) {
  if (event) event.preventDefault();

  const username = document.getElementById('regUsername').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const pass = document.getElementById('regPassword').value;

  if (!username) {
    showToast('Vui lòng nhập Username mong muốn');
    return;
  }
  if (!phone) {
    showToast('Vui lòng nhập số điện thoại');
    return;
  }
  if (!pass) {
    showToast('Vui lòng tạo mật khẩu bảo mật');
    return;
  }

  appState.currentUser.username = username;
  appState.currentUser.phone = phone;
  appState.currentUser.role = 'user';
  appState.currentUser.recordId = '#VSC-' + Math.floor(1000 + Math.random() * 9000);

  showToast(`Đăng ký thành công tài khoản [${username}]! Đang đăng nhập...`);

  setTimeout(() => {
    loginAs('user');
  }, 400);
}

function loginAs(role) {
  if (role === 'user') {
    const nameEl = document.getElementById('displayPatientName');
    const avatarEl = document.getElementById('displayPatientAvatar');
    const recordEl = document.getElementById('displayPatientRecord');

    if (nameEl) nameEl.innerText = appState.currentUser.username;
    if (avatarEl) {
      const words = appState.currentUser.username.split(' ');
      const initials = words.length > 1 
        ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
        : appState.currentUser.username.substring(0, 2).toUpperCase();
      avatarEl.innerText = initials;
    }
    if (recordEl) recordEl.innerText = `Hồ sơ bảo mật: ${appState.currentUser.recordId}`;

    navigateTo('screen-patient');
    showToast(`Bệnh nhân: ${appState.currentUser.username}`);
  } else {
    renderAdminPatientList(appState.activeFilter);
    navigateTo('screen-doctor');
    switchDoctorTab('cases');
    showToast('Đang ở giao diện Bác sĩ: BS. Nguyễn Minh Đức');
  }
}

function logout() {
  navigateTo('screen-auth');
  showToast('Đã đăng xuất tài khoản an toàn');
}

/* ==========================================================================
   CAMERA SCREEN HANDLERS
   ========================================================================== */

function openCameraModal() {
  navigateTo('screen-camera');
}

function closeCameraModal() {
  navigateTo('screen-patient');
}

function toggleFlash() {
  appState.isFlashActive = !appState.isFlashActive;
  const btn = document.getElementById('cameraFlashBtn');
  if (!btn) return;

  if (appState.isFlashActive) {
    btn.style.backgroundColor = '#f59e0b';
    btn.style.color = '#0f172a';
    showToast('Đã bật đèn quang học soi rêu');
  } else {
    btn.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
    btn.style.color = '#ffffff';
    showToast('Đã tắt đèn trợ sáng');
  }
}

function snapPhoto() {
  const flash = document.getElementById('flashOverlay');
  if (flash) flash.style.opacity = '0.85';

  setTimeout(() => {
    if (flash) flash.style.opacity = '0';
    closeCameraModal();

    const samplePhoto = "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=160&q=80";
    const img = document.getElementById('userCapturedImg');
    const box = document.getElementById('userCapturedThumbBox');
    const badge = document.getElementById('step2StatusBadge');
    const progressBadge = document.getElementById('userProgressBadge');
    const progressBar = document.getElementById('userProgressBar');

    if (img) img.src = samplePhoto;
    if (box) {
      box.classList.remove('hidden');
      box.style.display = 'flex';
    }

    if (badge) {
      badge.innerText = "Đã chụp đạt chuẩn";
      badge.className = "badge badge-emerald";
    }

    if (progressBadge) progressBadge.innerText = "2 / 3 Hoàn tất";
    if (progressBar) progressBar.style.width = "66.6%";

    showToast("Đã chụp ảnh cặn lưỡi gửi tới Bác sĩ Đức!");

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, 200);
}

/* ==========================================================================
   DOCTOR SCREEN & CLINICAL DOSSIER
   ========================================================================== */

function filterPatients(filterKey, btn) {
  appState.activeFilter = filterKey;
  
  document.querySelectorAll('.filter-chip, .filter-tab-btn').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');

  renderAdminPatientList(filterKey);
}

function renderAdminPatientList(filter) {
  const container = document.getElementById('adminPatientListContainer');
  if (!container) return;

  let list = appState.patients;
  if (filter === 'pending') {
    list = list.filter(p => p.status === 'pending');
  } else if (filter === 'urgent') {
    list = list.filter(p => p.status === 'urgent');
  } else if (filter === 'reviewed') {
    list = list.filter(p => p.status === 'reviewed');
  }

  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: #94a3b8; font-size: 0.75rem;">
        <i data-lucide="inbox" style="width: 28px; height: 28px; margin: 0 auto 0.5rem auto; color: #cbd5e1;"></i>
        <p>Không có hồ sơ nào trong mục này</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  list.forEach(p => {
    const isUrgent = p.status === 'urgent';
    const isReviewed = p.status === 'reviewed';

    const card = document.createElement('div');
    card.className = `admin-patient-card ${isUrgent ? 'admin-patient-card--urgent' : ''}`;
    card.innerHTML = `
      <!-- HEADER: Tên BN + Tuổi + Mã HS | VSC Score -->
      <div class="apc-header">
        <div class="apc-header__left">
          <span class="apc-status-dot ${isUrgent ? 'apc-status-dot--urgent' : isReviewed ? 'apc-status-dot--reviewed' : 'apc-status-dot--pending'}"></span>
          <strong class="apc-name">${p.name}</strong>
          <span class="apc-age">(${p.age}t)</span>
          <span class="badge badge-mono badge-slate">#${p.id}</span>
        </div>
        <div class="apc-header__right">
          <span class="badge badge-mono ${p.vscScore > 250 ? 'badge-rose' : 'badge-amber'}">${p.vscScore} ppb</span>
        </div>
      </div>

      <!-- ROW 1: Ảnh cặn lưỡi + Đánh giá Winkel Index -->
      <div class="apc-row-clinical">
        <div class="apc-img-thumb-wrap">
          <img src="${p.photoUrl}" alt="Ảnh lưỡi" class="apc-img-thumb">
        </div>
        <div class="apc-clinical-info">
          <span class="apc-row-label">Đánh giá cặn lưỡi</span>
          <p class="apc-clinical-text"><strong>Winkel:</strong> ${p.winkelIndex}</p>
        </div>
      </div>

      <!-- ROW 2: Triệu chứng người bệnh khai báo (Tách rõ 2 row: Row 2.1 Tiêu đề + Row 2.2 Nội dung không bị chèn ép) -->
      <div class="apc-row-symptom">
        <div class="apc-symptom-label-row">
          <i data-lucide="activity" style="width: 11px; height: 11px;"></i>
          <span>TRIỆU CHỨNG KHAI BÁO:</span>
        </div>
        <p class="apc-symptom-content">${p.survey.oralSensations}</p>
      </div>

      <!-- ROW 3: Hồ sơ đính kèm & Thời gian nộp (Ngang 1 hàng) -->
      <div class="apc-row-docs">
        <div class="apc-docs-list">
          <span class="apc-doc-chip apc-doc-chip--active">
            <i data-lucide="file-text" style="width: 10px; height: 10px;"></i> Phiếu KS
          </span>
          <span class="apc-doc-chip apc-doc-chip--active">
            <i data-lucide="image" style="width: 10px; height: 10px;"></i> Ảnh lưỡi
          </span>
          <span class="apc-doc-chip">
            <i data-lucide="pill" style="width: 10px; height: 10px;"></i> Toa thuốc
          </span>
        </div>
        <span class="apc-time">Nộp: ${p.submittedAt}</span>
      </div>

      <!-- ROW 4 / ACTIONS: Cặp nút hành động 50% - 50% bằng nhau -->
      <div class="apc-actions">
        <button onclick="openPatientDossier('${p.id}')" class="btn btn-secondary btn-action-view">
          <i data-lucide="file-search" style="width: 13px; height: 13px;"></i>
          <span>Xem giấy tờ</span>
        </button>
        <button onclick="quickApprove('${p.id}')" class="btn ${isReviewed ? 'btn-teal-light' : isUrgent ? 'btn-danger' : 'btn-primary'} btn-action-approve">
          <i data-lucide="${isReviewed ? 'check-check' : 'check'}" style="width: 13px; height: 13px;"></i>
          <span>${isReviewed ? 'Đã duyệt' : 'Duyệt & Đo khí'}</span>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function openPatientDossier(patientId) {
  const p = appState.patients.find(item => item.id === patientId);
  if (!p) return;

  appState.currentViewingPatientId = patientId;

  document.getElementById('dossierTitle').innerText = `Hồ sơ nộp tới BS. Đức: ${p.name}`;
  document.getElementById('dossierRecordId').innerText = `#${p.id}`;
  
  const nameEl = document.getElementById('dossierPatientName');
  if (nameEl) nameEl.innerText = p.name;
  
  const demoEl = document.getElementById('dossierPatientDemographics');
  if (demoEl) demoEl.innerText = `${p.gender} • ${p.age} tuổi`;
  
  const phoneEl = document.getElementById('dossierPatientPhone');
  if (phoneEl) phoneEl.innerText = p.phone;

  const timeEl = document.getElementById('dossierSubmittedTime');
  if (timeEl) timeEl.innerText = `Nộp: ${p.submittedAt}`;

  const vscScoreEl = document.getElementById('dossierVscScore');
  if (vscScoreEl) {
    vscScoreEl.innerText = `${p.vscScore} ppb`;
    vscScoreEl.className = `badge badge-mono ${p.vscScore > 250 ? 'badge-rose' : 'badge-amber'} dpc-vsc-badge`;
  }

  const vscLevelEl = document.getElementById('dossierVscLevel');
  if (vscLevelEl) {
    vscLevelEl.innerText = p.vscLevel;
    vscLevelEl.style.color = p.vscScore > 250 ? 'var(--rose-600)' : 'var(--amber-600)';
  }

  document.getElementById('dossierSurveyPeak').innerText = p.survey.peakTime;
  document.getElementById('dossierSurveySensations').innerText = p.survey.oralSensations;
  document.getElementById('dossierSurveyGerd').innerText = p.survey.gerdHistory;
  document.getElementById('dossierSurveyHabit').innerText = p.survey.cleaningHabit;
  document.getElementById('dossierSurveyAnxiety').innerText = p.survey.anxietyScore;

  document.getElementById('dossierPhotoImg').src = p.photoUrl;
  document.getElementById('dossierPhotoAngle').innerText = p.photoAngle;
  document.getElementById('dossierPatientNote').innerText = p.patientNote;
  document.getElementById('dossierWinkelIndex').innerText = p.winkelIndex;

  document.getElementById('dossierMedsPrescription').innerText = p.medications.prescriptions;
  document.getElementById('dossierMedsMouthwash').innerText = p.medications.mouthwash;

  const noteBox = document.getElementById('doctorOrderInput');
  if (noteBox) {
    noteBox.value = p.doctorDiagnosis || `Chỉ định lấy mẫu khí Halimeter lúc 14:30. Khuyên dùng cây cạo lưỡi chuyên dụng 2 lần/ngày kết hợp súc miệng diệt khuẩn kỵ khí sinh VSC.`;
  }

  switchDossierTab('survey');

  const modal = document.getElementById('patientDossierModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function closePatientDossier() {
  const modal = document.getElementById('patientDossierModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function switchDossierTab(tabKey) {
  const tabs = ['survey', 'photo', 'meds'];
  tabs.forEach(t => {
    const btn = document.getElementById(`dossierTab_${t}`);
    const panel = document.getElementById(`dossierPanel_${t}`);
    if (btn) btn.classList.remove('active');
    if (panel) {
      panel.classList.add('hidden');
      panel.style.display = 'none';
    }
  });

  const activeBtn = document.getElementById(`dossierTab_${tabKey}`);
  const activePanel = document.getElementById(`dossierPanel_${tabKey}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activePanel) {
    activePanel.classList.remove('hidden');
    activePanel.style.display = 'flex';
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function appendPrescriptionTemplate(type) {
  const box = document.getElementById('doctorOrderInput');
  if (!box) return;

  const templates = {
    halimeter: 'Chỉ định đo nồng độ khí Halimeter tại Phòng 204 lúc 14:30.',
    scraper: 'Sử dụng cây cạo lưỡi chuyên dụng 2 lần/ngày (sáng sau ngủ dậy và tối trước khi ngủ).',
    rinse: 'Súc miệng dung dịch kháng khuẩn Kẽm + CPC 2 lần/ngày, ngưng súc miệng chứa cồn.',
  };

  const textToAdd = templates[type];
  if (!textToAdd) return;

  if (box.value.trim() === '') {
    box.value = textToAdd;
  } else if (!box.value.includes(textToAdd)) {
    box.value = box.value.trim() + ' ' + textToAdd;
  }
  
  box.focus();
}

function submitDoctorOrder() {
  const patientId = appState.currentViewingPatientId;
  const p = appState.patients.find(item => item.id === patientId);
  const noteBox = document.getElementById('doctorOrderInput');

  if (p && noteBox) {
    p.status = 'reviewed';
    p.doctorDiagnosis = noteBox.value.trim();

    closePatientDossier();
    renderAdminPatientList(appState.activeFilter);
    showToast(`BS. Đức đã duyệt đơn & gửi phác đồ tới ${p.name}`);
  }
}

function quickApprove(patientId) {
  const p = appState.patients.find(item => item.id === patientId);
  if (p) {
    p.status = 'reviewed';
    p.doctorDiagnosis = 'Đã duyệt yêu cầu đo khí Halimeter tại Phòng 204.';
    renderAdminPatientList(appState.activeFilter);
    showToast(`Đã duyệt đơn và xếp lịch đo khí Halimeter cho ${p.name}`);
  }
}

/* ==========================================================================
   DOCTOR SUB-PAGE NAVIGATION (CHUYỂN TRANG RIÊNG BIỆT CHO BÁC SĨ)
   ========================================================================== */

function switchDoctorTab(tabId) {
  const tabs = ['cases', 'schedule', 'analytics'];
  tabs.forEach(t => {
    const navBtn = document.getElementById(`docNav_${t}`);
    const subpage = document.getElementById(
      t === 'cases' ? 'docSubpageCases' : (t === 'schedule' ? 'docSubpageSchedule' : 'docSubpageAnalytics')
    );
    if (navBtn) {
      if (t === tabId) {
        navBtn.classList.add('active');
      } else {
        navBtn.classList.remove('active');
      }
    }
    if (subpage) {
      if (t === tabId) {
        subpage.classList.remove('hidden');
        subpage.style.display = 'flex';
      } else {
        subpage.classList.add('hidden');
        subpage.style.display = 'none';
      }
    }
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* ==========================================================================
   DYNAMIC CLINICAL QUESTIONNAIRE (KHẢO SÁT HƠI THỞ GỌN GÀNG CHO NGƯỜI DÂN)
   - Ngôn từ gần gũi, loại bỏ thuật ngữ chuyên ngành khó hiểu
   - Số câu hỏi động, phân nhánh linh hoạt, có thể nộp sớm
   ========================================================================== */

const clinicalSurveyTree = {
  startNodeId: 'node_timing',
  nodes: {
    node_timing: {
      id: 'node_timing',
      stepText: 'Câu hỏi 1',
      branchTag: 'Thời điểm có mùi',
      progressPct: 35,
      question: 'Hơi thở của bạn thường có mùi vào lúc nào?',
      hint: 'Chọn 1 trường hợp bạn thấy đúng nhất gần đây:',
      options: [
        {
          id: 'opt_food',
          title: 'Chỉ sau khi ăn thức ăn nặng mùi (hành, tỏi, mắm...)',
          subtitle: 'Sau khi chải răng hoặc súc miệng kỹ là hết mùi hoàn toàn.',
          isEarlyExit: true,
          earlyExitData: {
            title: 'Mùi hơi thở do thức ăn (Bình thường)',
            description: 'Mùi này chỉ xuất hiện tạm thời sau khi ăn thức ăn nồng mùi, không phải do bệnh lý vi khuẩn ở khoang miệng.',
            advice: 'Chỉ cần chải răng sau bữa ăn, uống nhiều nước và nhai kẹo cao su không đường để làm sạch khoang miệng.',
            recommendation: 'Hồ sơ đã đủ thông tin. Bạn có thể nộp ngay kết quả này cho Bác sĩ Đức.'
          }
        },
        {
          id: 'opt_morning',
          title: 'Chỉ vào buổi sáng khi vừa ngủ dậy',
          subtitle: 'Sau khi đánh răng và ăn bữa sáng thì đỡ hoặc hết hẳn.',
          nextNodeId: 'node_morning_habit'
        },
        {
          id: 'opt_all_day',
          title: 'Kéo dài cả ngày, dù đã đánh răng sạch',
          subtitle: 'Hơi thở vẫn có mùi khiến bạn cảm thấy thiếu tự tin.',
          nextNodeId: 'node_oral_signs'
        }
      ]
    },

    node_morning_habit: {
      id: 'node_morning_habit',
      stepText: 'Câu hỏi 2',
      branchTag: 'Khô họng khi ngủ',
      progressPct: 70,
      question: 'Khi thức dậy, bạn có cảm giác nào sau đây?',
      hint: 'Ban đêm tuyến nước bọt tiết ít hơn bình thường:',
      options: [
        {
          id: 'opt_dry_yes',
          title: 'Họng rất khô, đắng miệng, hay thở bằng miệng khi ngủ',
          subtitle: 'Thường thức dậy phải uống nước ngay cho đỡ khô họng.',
          nextNodeId: 'node_communication_impact'
        },
        {
          id: 'opt_dry_no',
          title: 'Khoang miệng bình thường, chỉ hơi khô nhẹ tự nhiên',
          subtitle: 'Không bị khô rát hay khát nước ban đêm.',
          isEarlyExit: true,
          earlyExitData: {
            title: 'Mùi hơi thở buổi sáng nhẹ (Bình thường)',
            description: 'Tuyến nước bọt của bạn hoạt động tốt. Hơi thở có mùi nhẹ buổi sáng là do cơ thể giảm tiết nước bọt tự nhiên khi ngủ say.',
            advice: 'Uống 1 cốc nước ấm ngay sau khi thức dậy và chải răng sạch để giữ ẩm khoang miệng.',
            recommendation: 'Thông tin đã đủ, bạn có thể nộp ngay cho Bác sĩ Đức.'
          }
        }
      ]
    },

    node_oral_signs: {
      id: 'node_oral_signs',
      stepText: 'Câu hỏi 2',
      branchTag: 'Dấu hiệu khoang miệng',
      progressPct: 70,
      question: 'Bạn thấy trong miệng có dấu hiệu nào rõ nhất?',
      hint: 'Chọn 1 dấu hiệu bạn gặp gần đây:',
      options: [
        {
          id: 'opt_tongue_coating',
          title: 'Lưỡi có mảng bám trắng hoặc vàng dày ở cuống lưỡi',
          subtitle: 'Cạo lưỡi thấy ra nhiều bợn trắng tích tụ.',
          nextNodeId: 'node_communication_impact'
        },
        {
          id: 'opt_tonsil_hick',
          title: 'Hay khạc ra hạt nhỏ màu trắng có mùi hôi ở họng',
          subtitle: 'Cảm giác vướng víu hoặc ngứa nhẹ ở cuống họng.',
          nextNodeId: 'node_communication_impact'
        },
        {
          id: 'opt_gerd_acid',
          title: 'Hay bị ợ chua, nóng rát dạ dày sau khi ăn',
          subtitle: 'Có vị chua hoặc đắng trào ngược lên miệng.',
          nextNodeId: 'node_communication_impact'
        },
        {
          id: 'opt_gum_bleed',
          title: 'Chân răng hay chảy máu khi đánh răng',
          subtitle: 'Nướu răng sưng đỏ hoặc có cảm giác ê buốt.',
          nextNodeId: 'node_communication_impact'
        }
      ]
    },

    node_communication_impact: {
      id: 'node_communication_impact',
      stepText: 'Câu hỏi 3',
      branchTag: 'Mức độ ảnh hưởng',
      progressPct: 100,
      question: 'Mùi hơi thở có làm bạn ngại khi nói chuyện không?',
      hint: 'Giúp bác sĩ hiểu rõ mức độ lo lắng của bạn:',
      options: [
        {
          id: 'opt_impact_low',
          title: 'Ít lo lắng, chỉ ngại khi nói chuyện rất gần',
          subtitle: 'Vẫn thoải mái trong công việc và giao tiếp hàng ngày.',
          isFinalSubmit: true
        },
        {
          id: 'opt_impact_mid',
          title: 'Khá lo, hay phải ngậm kẹo hoặc che miệng khi nói',
          subtitle: 'Có xu hướng giữ khoảng cách khi trò chuyện với người khác.',
          isFinalSubmit: true
        },
        {
          id: 'opt_impact_high',
          title: 'Rất tự ti, luôn phải đeo khẩu trang khi gặp người khác',
          subtitle: 'Rất căng thẳng và ảnh hưởng nhiều đến công việc, cuộc sống.',
          isFinalSubmit: true
        }
      ]
    }
  }
};

let surveyState = {
  currentNodeId: 'node_timing',
  history: [],
  selectedOptionIndex: null,
  answers: {},
  showingEarlyExit: false,
  earlyExitPayload: null
};

function openFormModal() {
  const modal = document.getElementById('formModal');
  if (!modal) return;
  
  // Khởi tạo lại trạng thái khảo sát động
  surveyState = {
    currentNodeId: 'node_timing',
    history: [],
    selectedOptionIndex: null,
    answers: {},
    showingEarlyExit: false,
    earlyExitPayload: null
  };
  
  renderSurveyNode();
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeFormModal() {
  const modal = document.getElementById('formModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function renderSurveyNode() {
  const container = document.getElementById('dynamicSurveyContainer');
  const stepBadge = document.getElementById('surveyStepBadge');
  const branchBadge = document.getElementById('surveyBranchBadge');
  const progressBar = document.getElementById('surveyProgressBar');
  const backBtn = document.getElementById('surveyBackBtn');
  const actionBtn = document.getElementById('surveyActionBtn');

  if (!container) return;

  // Nếu đang hiển thị màn hình Cho nộp sớm (Early Exit)
  if (surveyState.showingEarlyExit && surveyState.earlyExitPayload) {
    const data = surveyState.earlyExitPayload;
    if (stepBadge) stepBadge.innerText = 'Kết quả sơ bộ';
    if (branchBadge) {
      branchBadge.innerText = 'Nguy cơ thấp';
      branchBadge.className = 'badge badge-emerald';
    }
    if (progressBar) progressBar.style.width = '100%';
    if (backBtn) {
      backBtn.disabled = false;
      backBtn.style.opacity = '1';
      backBtn.style.pointerEvents = 'auto';
      backBtn.innerHTML = `<i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i><span>Chọn lại</span>`;
    }

    container.innerHTML = `
      <div class="quiz-early-box">
        <div class="quiz-early-icon">
          <i data-lucide="check-circle" style="width: 22px; height: 22px;"></i>
        </div>
        <h4 class="quiz-early-title">${data.title}</h4>
        <p class="quiz-early-desc">${data.description}</p>
        
        <div class="quiz-early-tip">
          <strong style="color: #065f46;">Lời khuyên:</strong> ${data.advice}
        </div>

        <p style="font-size: 0.6875rem; color: #059669; font-weight: 600; margin: 0;">${data.recommendation}</p>
      </div>
    `;

    if (actionBtn) {
      actionBtn.disabled = false;
      actionBtn.innerHTML = `<span>Nộp đơn</span><i data-lucide="send" style="width: 14px; height: 14px;"></i>`;
    }

    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Lấy dữ liệu node hiện tại
  const node = clinicalSurveyTree.nodes[surveyState.currentNodeId];
  if (!node) return;

  // Cập nhật bước động
  if (stepBadge) stepBadge.innerText = node.stepText;
  if (branchBadge) {
    branchBadge.innerText = node.branchTag;
    branchBadge.className = 'badge badge-teal';
  }
  if (progressBar) progressBar.style.width = `${node.progressPct}%`;

  // Cột 1: Nút Quay lại (luôn ở bên trái panel footer)
  if (backBtn) {
    backBtn.innerHTML = `<i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i><span>Quay lại</span>`;
    if (surveyState.history.length > 0) {
      backBtn.disabled = false;
      backBtn.style.opacity = '1';
      backBtn.style.pointerEvents = 'auto';
    } else {
      backBtn.disabled = true;
      backBtn.style.opacity = '0.35';
      backBtn.style.pointerEvents = 'none';
    }
  }

  // Render câu hỏi & danh sách lựa chọn dạng thẻ gọn gàng
  let optionsHtml = '';
  node.options.forEach((opt, idx) => {
    const isSelected = surveyState.selectedOptionIndex === idx;
    optionsHtml += `
      <div onclick="selectSurveyOption(${idx})" class="quiz-option-card ${isSelected ? 'selected' : ''}" id="quizOpt_${idx}">
        <div>
          <div class="quiz-opt-text">${opt.title}</div>
          <div class="quiz-opt-sub">${opt.subtitle}</div>
        </div>
        <div class="quiz-opt-radio"></div>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="quiz-question-box">
      <div>
        <h4 class="quiz-question-title">${node.question}</h4>
        <p class="quiz-question-hint">${node.hint}</p>
      </div>
      <div class="quiz-options-grid">
        ${optionsHtml}
      </div>
    </div>
  `;

  // Cột 2: Nút Tiếp tục / Nộp đơn (sát bên phải, màu nổi, có border, disabled khi chưa chọn)
  if (actionBtn) {
    const isOptSelected = surveyState.selectedOptionIndex !== null;
    actionBtn.disabled = !isOptSelected;

    if (isOptSelected) {
      const selectedOpt = node.options[surveyState.selectedOptionIndex];
      if (selectedOpt.isEarlyExit) {
        actionBtn.innerHTML = `<span>Xem kết quả</span><i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>`;
      } else if (selectedOpt.isFinalSubmit) {
        actionBtn.innerHTML = `<span>Nộp đơn</span><i data-lucide="send" style="width: 14px; height: 14px;"></i>`;
      } else {
        actionBtn.innerHTML = `<span>Tiếp tục</span><i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>`;
      }
    } else {
      // Chưa chọn: kiểm tra xem nhánh này có kết thúc ở node hiện tại không
      const isFinalNode = node.options.some(o => o.isFinalSubmit);
      if (isFinalNode) {
        actionBtn.innerHTML = `<span>Nộp đơn</span><i data-lucide="send" style="width: 14px; height: 14px;"></i>`;
      } else {
        actionBtn.innerHTML = `<span>Tiếp tục</span><i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>`;
      }
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

function selectSurveyOption(index) {
  surveyState.selectedOptionIndex = index;
  const node = clinicalSurveyTree.nodes[surveyState.currentNodeId];
  if (!node) return;

  // Highlight lựa chọn
  node.options.forEach((_, idx) => {
    const el = document.getElementById(`quizOpt_${idx}`);
    if (el) {
      if (idx === index) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    }
  });

  // Enable và cập nhật nhãn Action Button (ở sát phải, nổi bật)
  const actionBtn = document.getElementById('surveyActionBtn');
  if (actionBtn) {
    actionBtn.disabled = false;
    const selectedOpt = node.options[index];
    if (selectedOpt.isEarlyExit) {
      actionBtn.innerHTML = `<span>Xem kết quả</span><i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>`;
    } else if (selectedOpt.isFinalSubmit) {
      actionBtn.innerHTML = `<span>Nộp đơn</span><i data-lucide="send" style="width: 14px; height: 14px;"></i>`;
    } else {
      actionBtn.innerHTML = `<span>Tiếp tục</span><i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>`;
    }
    if (window.lucide) window.lucide.createIcons();
  }
}

function handleSurveyActionClick() {
  // Nếu đang ở màn hình Cho nộp sớm -> Xác nhận nộp sớm
  if (surveyState.showingEarlyExit) {
    confirmSubmitDynamicSurvey(true);
    return;
  }

  const node = clinicalSurveyTree.nodes[surveyState.currentNodeId];
  if (!node || surveyState.selectedOptionIndex === null) return;

  const chosenOpt = node.options[surveyState.selectedOptionIndex];
  
  // Lưu câu trả lời của node này
  surveyState.answers[node.id] = {
    question: node.question,
    choiceTitle: chosenOpt.title
  };

  // 1. Nhánh Cho nộp sớm (Early Exit)
  if (chosenOpt.isEarlyExit) {
    surveyState.showingEarlyExit = true;
    surveyState.earlyExitPayload = chosenOpt.earlyExitData;
    renderSurveyNode();
    return;
  }

  // 2. Nhánh Nộp hồ sơ hoàn chỉnh (Final Node)
  if (chosenOpt.isFinalSubmit) {
    confirmSubmitDynamicSurvey(false);
    return;
  }

  // 3. Phân nhánh đi tiếp vào câu hỏi sâu hơn
  if (chosenOpt.nextNodeId) {
    surveyState.history.push({
      nodeId: surveyState.currentNodeId,
      selectedOptionIndex: surveyState.selectedOptionIndex
    });
    surveyState.currentNodeId = chosenOpt.nextNodeId;
    surveyState.selectedOptionIndex = null;
    renderSurveyNode();
  }
}

function handleSurveyBack() {
  if (surveyState.showingEarlyExit) {
    surveyState.showingEarlyExit = false;
    surveyState.earlyExitPayload = null;
    renderSurveyNode();
    return;
  }

  if (surveyState.history.length > 0) {
    const prev = surveyState.history.pop();
    surveyState.currentNodeId = prev.nodeId;
    surveyState.selectedOptionIndex = prev.selectedOptionIndex;
    renderSurveyNode();
  }
}

function confirmSubmitDynamicSurvey(isEarlyExit) {
  // Cập nhật dữ liệu vào hồ sơ bệnh nhân hiện tại trong appState.patients
  const currentPatient = appState.patients.find(p => p.id === 'VSC-3184') || appState.patients[0];
  
  if (currentPatient) {
    if (isEarlyExit) {
      currentPatient.survey = {
        peakTime: surveyState.answers['node_timing']?.choiceTitle || "Thoáng qua sau khi ăn đồ nặng mùi",
        oralSensations: "Khoang miệng bình thường, không khô rát",
        gerdHistory: "Không có trào ngược dạ dày",
        cleaningHabit: "Vệ sinh răng miệng hàng ngày (Đã nộp sớm)",
        anxietyScore: "1 / 10 (Ít lo lắng • Đã được duyệt nộp sớm)"
      };
      currentPatient.winkelIndex = "1 / 12 (Lớp màng mỏng bình thường)";
    } else {
      // Nhánh bệnh lý / chuyên sâu
      const timingAns = surveyState.answers['node_timing']?.choiceTitle || "Kéo dài cả ngày";
      const pathAns = surveyState.answers['node_oral_signs']?.choiceTitle || surveyState.answers['node_morning_habit']?.choiceTitle || "Họng khô rát khi ngủ dậy";
      const psychoAns = surveyState.answers['node_communication_impact']?.choiceTitle || "Khá lo lắng khi tiếp xúc";

      let gerdText = "Không có dấu hiệu trào ngược";
      if (pathAns.includes('ợ chua')) {
        gerdText = "Thường xuyên ợ chua, nóng rát dạ dày sau khi ăn";
      }

      currentPatient.survey = {
        peakTime: timingAns,
        oralSensations: pathAns,
        gerdHistory: gerdText,
        cleaningHabit: "Đã hoàn thành khảo sát sàng lọc tiền lâm sàng",
        anxietyScore: psychoAns
      };
    }
  }

  // Cập nhật mô tả trên thẻ chuẩn bị của bệnh nhân
  const patientDesc = document.querySelector('#screen-patient .card-desc');
  if (patientDesc) {
    patientDesc.innerText = isEarlyExit 
      ? "Đã nộp: Hơi thở có mùi do thực phẩm (Nguy cơ thấp)." 
      : "Đã hoàn thành khảo sát và gửi phiếu cho Bác sĩ Đức.";
  }

  closeFormModal();
  showToast(isEarlyExit ? "Đã nộp phiếu khảo sát nguy cơ thấp tới BS. Đức!" : "Đã gửi phiếu khảo sát hơi thở tới BS. Đức!");
}

function saveForm() {
  closeFormModal();
  showToast("Đã lưu khảo sát thói quen & yếu tố nguy cơ!");
}

function openHistoryModal() {
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function closeHistoryModal() {
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}
