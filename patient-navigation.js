/* Public navigation and client-side sign-in state for the current browser session. */
const patientNavigation = { pending: null, returnTab: 'home', menu: null };
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
  document.getElementById('authBackButton').focus();
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
function refreshPatientMenus() {
  const links = [['home', 'house', 'Trang chủ'], ['diagnosis', 'scan-line', 'Chẩn đoán'], ['history', 'history', 'Lịch sử'], ['profile', 'layout-dashboard', 'Hồ sơ cá nhân'], ['information', 'user-round', 'Thông tin cá nhân'], ['settings', 'settings', 'Cài đặt']];
  document.getElementById('patientNavigationMenu').innerHTML = links.map(([tab, icon, title]) => `<button class="pf-header-menu__item ${tab === 'settings' ? 'pf-header-menu__item--separated' : ''}" role="menuitem" tabindex="-1" onclick="openPatientMenuPage('${tab}')" ${patientFlow.tab === tab ? 'aria-current="page"' : ''}>${patientIcon(icon)}<span>${title}</span></button>`).join('');
  const signedIn = isPatientAuthenticated();
  document.getElementById('patientProfileMenu').innerHTML = `<div class="pf-header-menu__identity">${escapePatientText(signedIn ? patientFlow.profile.name : 'Chưa đăng nhập')}</div><button class="pf-header-menu__item" role="menuitem" tabindex="-1" onclick="openPatientMenuPage('information')">${patientIcon('user-round')}<span>Thông tin cá nhân</span></button><button class="pf-header-menu__item" role="menuitem" tabindex="-1" onclick="openPatientMenuPage('history')">${patientIcon('history')}<span>Lịch sử</span></button><button class="pf-header-menu__item pf-header-menu__item--separated" role="menuitem" tabindex="-1" onclick="${signedIn ? 'logout()' : "beginSignIn('home')"}">${patientIcon(signedIn ? 'log-out' : 'log-in')}<span>${signedIn ? 'Đăng xuất' : 'Đăng nhập'}</span></button>`;
}
function openPatientMenuPage(tab) {
  closePatientMenus();
  if (tab === 'history') returnToPatientHistory();
  else renderPatientTab(tab);
}
function closePatientMenus(restoreFocus = true) {
  const open = patientNavigation.menu;
  for (const [menuId, triggerId] of [['patientNavigationMenu', 'patientMenuButton'], ['patientProfileMenu', 'patientProfileButton']]) {
    document.getElementById(menuId).hidden = true;
    document.getElementById(triggerId).setAttribute('aria-expanded', 'false');
  }
  patientNavigation.menu = null;
  if (open && restoreFocus) document.getElementById(open === 'navigation' ? 'patientMenuButton' : 'patientProfileButton').focus();
}
function togglePatientMenu(name) {
  const wasOpen = patientNavigation.menu === name;
  closePatientMenus(false);
  if (wasOpen) return;
  const menuId = name === 'navigation' ? 'patientNavigationMenu' : 'patientProfileMenu';
  const triggerId = name === 'navigation' ? 'patientMenuButton' : 'patientProfileButton';
  const menu = document.getElementById(menuId);
  menu.hidden = false;
  document.getElementById(triggerId).setAttribute('aria-expanded', 'true');
  patientNavigation.menu = name;
  menu.querySelector('[role="menuitem"]').focus();
}
document.addEventListener('click', event => {
  if (patientNavigation.menu && !event.target.closest('.pf-header')) closePatientMenus(false);
});
document.addEventListener('focusin', event => {
  if (patientNavigation.menu && !event.target.closest('.pf-header')) closePatientMenus(false);
});
document.addEventListener('keydown', event => {
  if (!patientNavigation.menu) return;
  if (event.key === 'Escape') { event.preventDefault(); closePatientMenus(); return; }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const id = patientNavigation.menu === 'navigation' ? 'patientNavigationMenu' : 'patientProfileMenu';
  const items = [...document.getElementById(id).querySelectorAll('[role="menuitem"]')];
  const current = items.indexOf(document.activeElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  items[next].focus();
});
