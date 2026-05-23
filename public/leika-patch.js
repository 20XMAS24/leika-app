// leika-patch.js — патч для подключения реального backend
// Вставить ПОСЛЕ leika-api.js и ДО закрывающего </body>

(function applyBackendPatch() {
  const API_ENABLED = true;

  (function restoreSession() {
    const user = LeikaAPI.getUser();
    const token = LeikaAPI.getToken();
    if (user && token) {
      if (typeof hideAuth === 'function') hideAuth();
      if (typeof doLogin === 'function') doLogin(user.username, user.email);
      console.info('[Leika] Сессия восстановлена:', user.username);
    }
  })();

  const loginBtn = document.getElementById('loginSubmitBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async function(e) {
      if (!API_ENABLED) return;
      e.stopImmediatePropagation();
      const email = document.getElementById('loginEmail').value.trim();
      const pass  = document.getElementById('loginPassword').value;
      if (!email || !pass) return;
      loginBtn.textContent = 'Вход...';
      loginBtn.disabled = true;
      try {
        const { user } = await LeikaAPI.login(email, pass);
        if (typeof doLogin === 'function') doLogin(user.username, user.email);
        if (typeof showToast === 'function') showToast('Добро пожаловать, ' + user.username + '! 👋');
        loadDashboard();
      } catch (err) {
        if (typeof showToast === 'function') showToast('❌ ' + err.message);
        const errEl = document.getElementById('loginEmailErr');
        if (errEl) { errEl.textContent = err.message; errEl.classList.add('show'); }
      } finally {
        loginBtn.textContent = 'Войти';
        loginBtn.disabled = false;
      }
    }, true);
  }

  const regBtn = document.getElementById('registerSubmitBtn');
  if (regBtn) {
    regBtn.addEventListener('click', async function(e) {
      if (!API_ENABLED) return;
      e.stopImmediatePropagation();
      const name  = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const pass  = document.getElementById('regPassword').value;
      if (!name || !email || !pass) return;
      regBtn.textContent = 'Регистрация...';
      regBtn.disabled = true;
      try {
        const { user } = await LeikaAPI.register(name, email, pass);
        if (typeof doLogin === 'function') doLogin(user.username, user.email);
        if (typeof showToast === 'function') showToast('Аккаунт создан! 🌿');
        loadDashboard();
      } catch (err) {
        if (typeof showToast === 'function') showToast('❌ ' + err.message);
        const errEl = document.getElementById('regEmailErr');
        if (errEl) { errEl.textContent = err.message; errEl.classList.add('show'); }
      } finally {
        regBtn.textContent = 'Создать аккаунт';
        regBtn.disabled = false;
      }
    }, true);
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (!API_ENABLED) return;
      LeikaAPI.logout();
      if (typeof showAuthWrap === 'function') showAuthWrap();
      if (typeof showToast === 'function') showToast('До встречи! 👋');
    }, true);
  }

  const saveBtn = document.getElementById('profileSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      if (!API_ENABLED) return;
      const name  = document.getElementById('pNameInput').value.trim();
      const email = document.getElementById('pEmailInput').value.trim();
      try {
        await LeikaAPI.updateProfile({ username: name, email });
        if (typeof showToast === 'function') showToast('Профиль сохранён ✓');
      } catch (err) {
        if (typeof showToast === 'function') showToast('❌ ' + err.message);
      }
    }, true);
  }

  async function loadDashboard() {
    if (!API_ENABLED || !LeikaAPI.getToken()) return;
    try {
      const data = await LeikaAPI.watering.dashboard();
      if (data.length > 0) {
        const moistures = data.map(z => z.last_moisture).filter(m => m != null);
        if (moistures.length > 0) {
          const avg = Math.round(moistures.reduce((a,b) => a+b, 0) / moistures.length);
          const el = document.getElementById('avgMoisture');
          if (el) el.textContent = avg;
        }
        const totalLiters = data.reduce((s, z) => s + (z.total_liters || 0), 0);
        const usageEl = document.getElementById('waterUsage');
        if (usageEl && totalLiters > 0) usageEl.textContent = Math.round(totalLiters);
      }
    } catch (e) {
      console.warn('[Leika API] Dashboard load failed:', e.message);
    }
  }

  document.addEventListener('click', async function(e) {
    if (!API_ENABLED || !LeikaAPI.getToken()) return;
    const navBtn = e.target.closest('[data-nav]');
    if (!navBtn) return;
    const screen = navBtn.dataset.nav;
    if (screen === 'home' || screen === 'analytics') loadDashboard();
  });

  setTimeout(loadDashboard, 500);
  console.info('[Leika] Backend patch активирован ✓');
})();
