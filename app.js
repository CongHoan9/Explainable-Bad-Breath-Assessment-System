/**
 * EXPLAINABLE BAD BREATH ASSESSMENT SYSTEM - MOBILE APP CONTROLLER
 * Single Active Screen State Management & JSON Data Loading (Pure JavaScript)
 */

// Global Application State
const appState = {
  currentScreen: 'screen-patient',
  isAuthenticated: false,
  currentUser: {
    username: '',
    phone: '',
    role: 'user',
    recordId: ''
  },
  currentDoctor: {
    name: 'Bác sĩ phụ trách',
    department: '',
    clinicRoom: ''
  },
  isFlashActive: false,
  currentViewingPatientId: null,
  activeFilter: 'all',
  
  // Hồ sơ lấy từ kho dữ liệu chung của hai vai trò.
  patients: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initializeSharedWorkspace();
  initializeApplication();

  loadDoctorSharedRecords();
  renderAdminPatientList(appState.activeFilter);

  // Khởi tạo icons Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

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
  document.body.classList.toggle('doctor-mode', screenId === 'screen-doctor');
  document.body.classList.toggle('patient-mode', screenId === 'screen-patient');
  if (screenId !== 'screen-auth') document.body.classList.remove('auth-doctor');
  document.title = screenId === 'screen-doctor' ? 'Breath Care · Không gian bác sĩ' : 'Breath Care · Chăm sóc hơi thở';

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
    initializeDoctorWorkspace();
    navigateTo('screen-doctor');
    switchDoctorTab('analytics');
  }
}

function logout() {
  closePatientMenus(false);
  closeDoctorMenus(false);
  closePatientDossier();
  closeDoctorAppointment();
  appState.isAuthenticated = false;
  try { sessionStorage.removeItem(PATIENT_SESSION_KEY); } catch { /* Storage may be unavailable. */ }
  patientNavigation.pending = null;
  if (typeof patientFlow !== 'undefined') {
    stopPatientCamera();
    patientFlow.draft = null;
    patientFlow.completing = false;
  }
  appState.currentUser = { username: '', phone: '', role: 'user', recordId: '' };
  appState.currentDoctor = { ...doctorDefaults };
  applyDoctorRecordChanges();
  navigateTo('screen-patient');
  initPatientApp();
  showToast('Đã đăng xuất.');
}
