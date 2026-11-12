/* Public navigation and client-side sign-in state for the current browser session. */
const patientNavigation = { pending: null, returnTab: 'home', menu: null, informationParent: 'home' };
const patientHeaderPanels = {
  navigation: ['patientNavigationMenu', 'patientMenuButton'],
  profile: ['patientProfileMenu', 'patientProfileButton'],
  notifications: ['patientNotificationPanel', 'patientNotificationButton']
};
const PATIENT_SESSION_KEY = 'breath-session-v1';

function isPatientAuthenticated() {
  return appState.isAuthenticated && appState.currentUser.role === 'user';
}
function persistApplicationSession() {
  try { sessionStorage.setItem(PATIENT_SESSION_KEY, JSON.stringify(appState.currentUser)); } catch { /* In-memory sign-in still works. */ }
}
function initializeApplication() {
  let session = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(PATIENT_SESSION_KEY) || 'null');
    if (saved && typeof saved.username === 'string' && saved.username.trim() && ['user', 'admin'].includes(saved.role)) {
      session = { username: saved.username, role: saved.role, phone: typeof saved.phone === 'string' ? saved.phone : '', recordId: typeof saved.recordId === 'string' ? saved.recordId : '' };
    }
  } catch { /* Start as a guest if the session cannot be read. */ }
  appState.isAuthenticated = Boolean(session);
  if (session) appState.currentUser = session;
  if (session?.role === 'admin') { loginAs('admin'); return; }
  navigateTo('screen-patient');
  initPatientApp();
}
function beginSignIn(destination = 'home') {
  const allowed = ['home', 'diagnosis', 'history', 'profile', 'information', 'settings'];
  patientNavigation.pending = allowed.includes(destination) ? destination : 'home';
  patientNavigation.returnTab = ['home', 'history', 'settings'].includes(patientFlow.tab) ? patientFlow.tab : 'home';
  closePatientMenus();
  switchAuthTab('login');
  document.getElementById('authRoleSelect').value = 'user';
  navigateTo('screen-auth');
  refreshAuthLayout();
  document.getElementById('authBackButton').focus();
}
function beginDoctorSignIn() {
  beginSignIn('home');
  document.getElementById('authRoleSelect').value = 'admin';
  refreshAuthLayout();
  document.getElementById('loginUsername').focus();
}
function refreshAuthLayout() {
  const doctor = appState.currentScreen === 'screen-auth' && document.getElementById('authRoleSelect').value === 'admin';
  document.body.classList.toggle('auth-doctor', doctor);
  document.getElementById('authContextLabel').textContent = doctor ? 'CỔNG LÀM VIỆC NỘI BỘ' : 'TÀI KHOẢN CỦA BẠN';
  document.querySelector('.auth-title').textContent = doctor ? 'Đăng nhập dành cho bác sĩ' : 'Chào mừng đến Breath Care';
  document.querySelector('.auth-sub').textContent = doctor ? 'Quản lý hồ sơ · Theo dõi lịch hẹn · Ghi nhận xét' : 'Chụp ảnh lưỡi · Đánh giá hơi thở · Giải thích kết quả';
  if (doctor) switchAuthTab('login');
}
function clearAuthenticationInputs() {
  for (const id of ['loginPassword', 'regUsername', 'regPhone', 'regPassword']) document.getElementById(id).value = '';
}
function cancelSignIn() {
  const destination = patientNavigation.returnTab;
  patientNavigation.pending = null;
  navigateTo('screen-patient');
  renderPatientTab(destination);
}
function requirePatientSession(destination) {
  if (isPatientAuthenticated()) return true;
  beginSignIn(destination);
  return false;
}
function renderGuestSignIn(destination) {
  return `<section class="pf-signin-state"><button class="pf-primary" onclick="beginSignIn('${destination}')">Đăng nhập</button></section>`;
}
function renderPatientSettings() {
  return '<section class="pf-settings-state"><h2>Đang phát triển</h2></section>';
}
function refreshPatientChrome() {
  const isSubpage = patientFlow.tab !== 'home';
  const screen = document.getElementById('screen-patient');
  screen.classList.toggle('pf-subpage', isSubpage);
  document.getElementById('patientMenuButton').hidden = isSubpage;
  screen.querySelector('.pf-header-actions').hidden = isSubpage;
  screen.querySelector('.pf-bottom-nav').hidden = isSubpage;
  const back = document.getElementById('patientBackButton');
  back.hidden = !isSubpage;
  const destination = patientFlow.tab === 'history' && getHistoryDetailRecord() ? 'lịch sử' : patientFlow.tab === 'information' && patientNavigation.informationParent === 'profile' ? 'hồ sơ cá nhân' : 'trang chủ';
  back.setAttribute('aria-label', `Quay lại ${destination}`);
  back.title = `Quay lại ${destination}`;
}
function goBackPatientPage() {
  const tab = patientFlow.tab;
  if (tab === 'information' && patientFlow.draft?.editingAdministration) {
    patientFlow.draft.editingAdministration = false;
    patientFlow.draft.administrationCompleted = false;
    renderPatientTab('diagnosis');
    return;
  }
  if (tab === 'history' && getHistoryDetailRecord()) {
    returnToPatientHistory();
    document.getElementById('patientBackButton').focus();
    return;
  }
  if (tab === 'information' && patientNavigation.informationParent === 'profile') {
    renderPatientTab('profile');
    document.getElementById('patientBackButton').focus();
    return;
  }
  renderPatientTab('home');
  (document.querySelector(`.pf-bottom-nav [data-patient-tab="${tab}"]`) || document.getElementById('patientMenuButton')).focus();
}
function setPatientMenuBackdrop(visible) {
  const screen = document.getElementById('screen-patient');
  document.getElementById('patientMenuBackdrop').hidden = !visible;
  screen.classList.toggle('pf-menu-open', visible);
  document.getElementById('patientContent').inert = visible;
  screen.querySelector('.pf-bottom-nav').inert = visible;
}
function refreshPatientMenus() {
  const links = [['home', 'house', 'Trang chủ'], ['diagnosis', 'scan-line', 'Chẩn đoán'], ['history', 'history', 'Lịch sử'], ['profile', 'layout-dashboard', 'Hồ sơ cá nhân'], ['settings', 'settings', 'Cài đặt']];
  document.getElementById('patientNavigationMenu').innerHTML = links.map(([tab, icon, title]) => `<button class="pf-header-menu__item ${tab === 'settings' ? 'pf-header-menu__item--separated' : ''}" role="menuitem" tabindex="-1" onclick="openPatientMenuPage('${tab}')" ${patientFlow.tab === tab ? 'aria-current="page"' : ''}>${patientIcon(icon)}<span>${title}</span></button>`).join('');
  const signedIn = isPatientAuthenticated();
  document.getElementById('patientProfileMenu').innerHTML = `<div class="pf-header-menu__identity">${escapePatientText(signedIn ? patientFlow.profile.name : 'Chưa đăng nhập')}</div><button class="pf-header-menu__item" role="menuitem" tabindex="-1" onclick="openPatientMenuPage('information')">${patientIcon('user-round')}<span>Thông tin cá nhân</span></button><button class="pf-header-menu__item" role="menuitem" tabindex="-1" onclick="openPatientMenuPage('history')">${patientIcon('history')}<span>Lịch sử</span></button><button class="pf-header-menu__item pf-header-menu__item--separated" role="menuitem" tabindex="-1" onclick="${signedIn ? 'logout()' : "beginSignIn('home')"}">${patientIcon(signedIn ? 'log-out' : 'log-in')}<span>${signedIn ? 'Đăng xuất' : 'Đăng nhập'}</span></button>`;
  refreshPatientNotifications();
}
function openPatientMenuPage(tab) {
  closePatientMenus();
  if (tab === 'history') returnToPatientHistory();
  else renderPatientTab(tab);
}
function closePatientMenus(restoreFocus = true) {
  const open = patientNavigation.menu;
  for (const [menuId, triggerId] of Object.values(patientHeaderPanels)) {
    document.getElementById(menuId).hidden = true;
    document.getElementById(triggerId).setAttribute('aria-expanded', 'false');
  }
  patientNavigation.menu = null;
  setPatientMenuBackdrop(false);
  if (open && restoreFocus) document.getElementById(patientHeaderPanels[open][1]).focus();
}
function togglePatientMenu(name) {
  if (!patientHeaderPanels[name] || patientFlow.tab !== 'home') return;
  const wasOpen = patientNavigation.menu === name;
  closePatientMenus(false);
  if (wasOpen) return;
  const [menuId, triggerId] = patientHeaderPanels[name];
  const menu = document.getElementById(menuId);
  menu.hidden = false;
  document.getElementById(triggerId).setAttribute('aria-expanded', 'true');
  patientNavigation.menu = name;
  setPatientMenuBackdrop(name === 'navigation' || name === 'profile');
  (menu.querySelector('button:not(:disabled), [role="menuitem"]') || menu).focus();
}
document.addEventListener('click', event => {
  if (patientNavigation.menu && !event.target.closest('.pf-header')) closePatientMenus(false);
});
document.addEventListener('focusin', event => {
  if (event.target.id === 'patientMenuBackdrop') return;
  if (patientNavigation.menu && !event.target.closest('.pf-header')) closePatientMenus(false);
});
document.addEventListener('keydown', event => {
  if (!patientNavigation.menu) return;
  if (event.key === 'Escape') { event.preventDefault(); closePatientMenus(); return; }
  if (event.key === 'Tab' && !document.getElementById('patientMenuBackdrop').hidden) {
    const [panelId, triggerId] = patientHeaderPanels[patientNavigation.menu];
    const controls = [document.getElementById(triggerId), ...document.getElementById(panelId).querySelectorAll('button:not(:disabled)')];
    const index = controls.indexOf(document.activeElement);
    event.preventDefault();
    controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
    return;
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const id = patientHeaderPanels[patientNavigation.menu][0];
  const items = [...document.getElementById(id).querySelectorAll('button:not(:disabled), [role="menuitem"]')];
  if (!items.length) return;
  const current = items.indexOf(document.activeElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  items[next].focus();
});
