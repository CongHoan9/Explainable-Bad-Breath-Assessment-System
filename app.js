/**
 * EXPLAINABLE BAD BREATH ASSESSMENT SYSTEM - MOBILE APP CONTROLLER
 * Single Active Screen State Management & JSON Data Loading (Pure JavaScript)
 */

// Global Application State
const appState = {
  currentScreen: 'screen-patient',
  isAuthenticated: false,
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
  initializeApplication();

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
 * @param {'screen-auth' | 'screen-patient' | 'screen-doctor'} screenId
 */
function navigateTo(screenId) {
  if (screenId !== 'screen-patient' && typeof stopPatientCamera === 'function') stopPatientCamera();
  const allScreens = ['screen-auth', 'screen-patient', 'screen-doctor'];
  
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

  loginAs('user');
}

function loginAs(role) {
  appState.currentUser.role = role;
  appState.isAuthenticated = true;
  persistApplicationSession();
  clearAuthenticationInputs();
  const destination = patientNavigation.pending || 'home';
  patientNavigation.pending = null;
  if (role === 'user') {
    navigateTo('screen-patient');
    initPatientApp();
    if (destination !== 'home') renderPatientTab(destination);
  } else {
    renderAdminPatientList(appState.activeFilter);
    navigateTo('screen-doctor');
    switchDoctorTab('cases');
    showToast('Đang ở giao diện Bác sĩ: BS. Nguyễn Minh Đức');
  }
}

function logout() {
  closePatientMenus(false);
  appState.isAuthenticated = false;
  try { sessionStorage.removeItem(PATIENT_SESSION_KEY); } catch { /* Storage may be unavailable. */ }
  patientNavigation.pending = null;
  if (typeof patientFlow !== 'undefined') {
    stopPatientCamera();
    patientFlow.draft = null;
    patientFlow.completing = false;
  }
  appState.currentUser = { username: '', phone: '', role: 'user', recordId: '' };
  navigateTo('screen-patient');
  initPatientApp();
  showToast('Đã đăng xuất.');
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
