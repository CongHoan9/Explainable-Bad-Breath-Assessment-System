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
    switchDoctorTab('analytics');
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
