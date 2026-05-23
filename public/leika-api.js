// ==========================================
// leika-api.js — клиентский API-адаптер
// ==========================================

const API_BASE = window.LEIKA_API_BASE || '/api';

const LeikaAPI = (() => {
  function getToken() { return localStorage.getItem('leika_token'); }
  function setToken(t) { localStorage.setItem('leika_token', t); }
  function clearToken() { localStorage.removeItem('leika_token'); localStorage.removeItem('leika_user'); }
  function getUser() { try { return JSON.parse(localStorage.getItem('leika_user')); } catch { return null; } }
  function setUser(u) { localStorage.setItem('leika_user', JSON.stringify(u)); }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.error || 'Ошибка запроса' };
    return data;
  }

  async function register(username, email, password) {
    const data = await request('POST', '/auth/register', { username, email, password });
    setToken(data.token); setUser(data.user); return data;
  }

  async function login(email, password) {
    const data = await request('POST', '/auth/login', { email, password });
    setToken(data.token); setUser(data.user); return data;
  }

  function logout() { clearToken(); }

  async function updateProfile(fields) {
    const data = await request('PATCH', '/auth/me', fields);
    setUser(data); return data;
  }

  const devices = {
    list:   ()           => request('GET',    '/devices'),
    get:    (id)         => request('GET',    '/devices/' + id),
    create: (mac, name)  => request('POST',   '/devices', { mac_address: mac, device_name: name }),
    update: (id, fields) => request('PATCH',  '/devices/' + id, fields),
    remove: (id)         => request('DELETE', '/devices/' + id),
    ping:   (id)         => request('POST',   '/devices/' + id + '/ping'),
  };

  const zones = {
    list:   (device_id)  => request('GET',    '/zones?device_id=' + device_id),
    get:    (id)         => request('GET',    '/zones/' + id),
    create: (data)       => request('POST',   '/zones', data),
    update: (id, fields) => request('PATCH',  '/zones/' + id, fields),
    remove: (id)         => request('DELETE', '/zones/' + id),
  };

  const telemetry = {
    history: (zone_id, limit=50) => request('GET', `/telemetry?zone_id=${zone_id}&limit=${limit}`),
    latest:  (zone_id)           => request('GET', '/telemetry/latest?zone_id=' + zone_id),
    stats:   (zone_id)           => request('GET', '/telemetry/stats?zone_id=' + zone_id),
    push:    (zone_id, moisture, water_level) => request('POST', '/telemetry', { zone_id, soil_moisture: moisture, water_level }),
  };

  const watering = {
    history:   (zone_id)      => request('GET',  '/watering?zone_id=' + zone_id),
    start:     (zone_id, mode='manual') => request('POST', '/watering/start', { zone_id, mode }),
    stop:      (session_id, liters)     => request('POST', '/watering/stop',  { session_id, water_consumed_liters: liters }),
    summary:   (zone_id)      => request('GET',  '/watering/summary?zone_id=' + zone_id),
    dashboard: ()             => request('GET',  '/watering/dashboard'),
  };

  return { getToken, getUser, register, login, logout, updateProfile, devices, zones, telemetry, watering };
})();
