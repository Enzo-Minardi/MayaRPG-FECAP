// ===== API CONFIG =====
const API_URL = '/api';
let TOKEN = localStorage.getItem('rpg-token') || null;

function apiHeaders() {
  return { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) };
}

async function api(method, endpoint, body) {
  const opts = { method, headers: apiHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_URL + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

// ===== STATE =====
let state = {
  currentUser: null,
  clients: [],
  fichas: [],
  appointments: [],
  alerts: [],
  exercises: [],
  plans: [],
  currentClient: null,
  selectedExercises: [],
  calDate: new Date(),
  agendaDate: new Date(),
  agendaSelectedDay: new Date(),
  exLibCategory: 'all',
};

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS   = ['D','S','T','Q','Q','S','S'];

// ===== UTILS =====
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatDateBR(str) {
  if (!str) return '';
  const [y,m,d] = str.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

// ===== AUTH =====
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const err   = document.getElementById('login-error');
  try {
    const data = await api('POST', '/auth/login', { email, password: pass });
    TOKEN = data.token;
    localStorage.setItem('rpg-token', TOKEN);
    state.currentUser = data.user;
    err.textContent = '';
    showApp();
  } catch (e) {
    err.textContent = e.message || 'E-mail ou senha incorretos.';
  }
}

async function doRegister() {
  const name    = document.getElementById('reg-name').value.trim();
  const age     = document.getElementById('reg-age').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const phone   = document.getElementById('reg-phone').value.trim();
  const pass    = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const err     = document.getElementById('reg-error');

  if (!name || !email || !phone || !pass || !age) { err.textContent = 'Preencha todos os campos.'; return; }
  if (pass.length < 6) { err.textContent = 'Senha deve ter ao menos 6 caracteres.'; return; }
  if (pass !== confirm) { err.textContent = 'Senhas não coincidem.'; return; }
  err.textContent = '';
  try {
    const data = await api('POST', '/auth/register', { name, age, email, phone, password: pass });
    TOKEN = data.token;
    localStorage.setItem('rpg-token', TOKEN);
    state.currentUser = data.user;
    showApp();
  } catch (e) {
    err.textContent = e.message;
  }
}

function doLogout() {
  TOKEN = null;
  localStorage.removeItem('rpg-token');
  state.currentUser = null;
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.add('active');
  navigate('dashboard');
  showToast('Até logo! 👋');
}

// ===== NAVIGATION =====
function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  const firstName = state.currentUser.name.split(' ')[0];
  document.getElementById('sidebar-name').textContent = firstName;
  document.getElementById('dash-name').textContent    = firstName;
  navigate('dashboard');
}

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  renderPage(page);
}

function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'clients':   renderClients();   break;
    case 'agenda':    renderAgenda();    break;
    case 'exercises': renderExerciseLibrary(); break;
    case 'reports':   renderReports();   break;
    case 'alerts':    renderAlerts();    break;
  }
}

// ===== DASHBOARD =====
async function renderDashboard() {
  try {
    const d = await api('GET', '/dashboard');
    const { stats, todaySchedule, recentAlerts, clientsByStatus, regionData } = d;

    document.getElementById('stat-new-clients').textContent = stats.newClients;
    document.getElementById('stat-today').textContent       = stats.todayAppts;

    const unread = stats.unreadAlerts;
    document.getElementById('alert-badge').textContent = unread || '';
    const painBadge = document.getElementById('pain-badge');
    if (painBadge) painBadge.textContent = unread || '';

    // Agenda do dia
    const agendaEl = document.getElementById('dash-agenda');
    agendaEl.innerHTML = todaySchedule.length
      ? todaySchedule.map(a => `
          <div class="agenda-item">
            <span class="agenda-time">${a.time.slice(0,5)}</span>
            <div>
              <div class="agenda-patient">${a.client_name || '—'}</div>
              <div class="agenda-type">${a.type}</div>
            </div>
            <span class="status-pill ${a.status==='concluido'?'done':a.status==='confirmado'?'confirmed':'pending'}">${a.status}</span>
          </div>`).join('')
      : '<div class="empty-state"><span class="emoji">📅</span>Nenhuma consulta hoje</div>';

    // Alertas recentes
    const alertEl = document.getElementById('dash-alerts');
    alertEl.innerHTML = recentAlerts.map(a =>
      `<div class="alert-item">
        <div class="alert-dot"></div>
        <div>
          <div class="alert-text">${a.client_name} — ${a.region}</div>
          <div class="alert-sub">${a.alert_time}</div>
        </div>
      </div>`
    ).join('');

    renderCalendar();
  } catch (e) {
    console.error('Erro ao carregar dashboard:', e);
  }
}

// ===== CALENDAR =====
function renderCalendar() {
  const d = state.calDate;
  document.getElementById('cal-title').textContent = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const cal = document.getElementById('calendar');
  cal.innerHTML = DAYS.map(day => `<div class="cal-day-name">${day}</div>`).join('');
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last  = new Date(d.getFullYear(), d.getMonth()+1, 0);
  const today = new Date();

  for (let i = 0; i < first.getDay(); i++) {
    cal.innerHTML += `<div class="cal-day other-month">${new Date(d.getFullYear(), d.getMonth(), -first.getDay()+i+1).getDate()}</div>`;
  }
  for (let i = 1; i <= last.getDate(); i++) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const hasAppt = state.appointments.some(a => (a.date||'').startsWith(dateStr));
    const isToday = i === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    cal.innerHTML += `<div class="cal-day${isToday?' today':''}${hasAppt?' has-event':''}" onclick="jumpToDay(${d.getFullYear()},${d.getMonth()},${i})">${i}</div>`;
  }
}

function prevMonth() { state.calDate = new Date(state.calDate.getFullYear(), state.calDate.getMonth()-1, 1); renderCalendar(); }
function nextMonth() { state.calDate = new Date(state.calDate.getFullYear(), state.calDate.getMonth()+1, 1); renderCalendar(); }
function jumpToDay(y, m, day) { navigate('agenda'); state.agendaSelectedDay = new Date(y,m,day); renderAgenda(); }

// ===== CLIENTS =====
async function renderClients(filter = '') {
  try {
    const url  = filter ? `/clients?q=${encodeURIComponent(filter)}` : '/clients';
    state.clients = await api('GET', url);
    const list = state.clients;
    document.getElementById('clients-count').textContent = `${list.length} cliente${list.length!==1?'s':''}`;
    const tbody = document.getElementById('clients-tbody');
    tbody.innerHTML = list.length
      ? list.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.email}</td>
            <td>${c.phone}</td>
            <td>${c.age || '—'}</td>
            <td><span class="status-badge${c.status==='concluido'?' inactive':c.status==='pendente'?' pending':''}">${c.status}</span></td>
            <td>
              <div class="action-btns">
                <button class="action-btn" onclick="openFicha('${c.id}')">📋 Ficha</button>
                <button class="action-btn" onclick="openEditClient('${c.id}')">✏️</button>
                <button class="action-btn danger" onclick="deleteClient('${c.id}')">🗑️</button>
              </div>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="6"><div class="empty-state"><span class="emoji">👥</span>Nenhum cliente encontrado</div></td></tr>';
  } catch (e) {
    showToast('Erro ao carregar clientes.');
  }
}

function filterClients(val) { renderClients(val); }

function openClientModal(clientId = null) {
  const client = clientId ? state.clients.find(c => c.id === clientId) : null;
  document.getElementById('modal-content').innerHTML = `
    <h2>${client ? 'Editar Cliente' : 'Novo Cliente'}</h2>
    <div class="modal-form">
      <div class="fields-row">
        <div class="field-group"><label>Nome completo</label><input type="text" id="mc-name" value="${client?.name||''}"></div>
        <div class="field-group"><label>Idade</label><input type="number" id="mc-age" value="${client?.age||''}"></div>
      </div>
      <div class="field-group"><label>E-mail</label><input type="email" id="mc-email" value="${client?.email||''}"></div>
      <div class="field-group"><label>Telefone</label><input type="tel" id="mc-phone" value="${client?.phone||''}"></div>
      <div class="field-group"><label>Status</label>
        <select id="mc-status">
          <option value="ativo" ${client?.status==='ativo'?'selected':''}>Ativo</option>
          <option value="concluido" ${client?.status==='concluido'?'selected':''}>Concluído</option>
          <option value="pendente" ${client?.status==='pendente'?'selected':''}>Pendente</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-primary" onclick="saveClient('${clientId||''}')">Salvar</button>
        <button class="btn-primary danger" onclick="closeModal()">Cancelar</button>
      </div>
    </div>`;
  openModal();
}

function openEditClient(id) { openClientModal(id); }

async function saveClient(id) {
  const name   = document.getElementById('mc-name').value.trim();
  const age    = document.getElementById('mc-age').value.trim();
  const email  = document.getElementById('mc-email').value.trim();
  const phone  = document.getElementById('mc-phone').value.trim();
  const status = document.getElementById('mc-status').value;
  if (!name || !email || !phone) { showToast('Preencha nome, e-mail e telefone.'); return; }
  try {
    if (id) {
      await api('PUT', `/clients/${id}`, { name, age, email, phone, status });
    } else {
      await api('POST', '/clients', { name, age, email, phone, status });
    }
    closeModal();
    renderClients();
    showToast(id ? 'Cliente atualizado! ✅' : 'Cliente cadastrado! ✅');
  } catch (e) {
    showToast(e.message);
  }
}

async function deleteClient(id) {
  if (!confirm('Excluir este cliente?')) return;
  try {
    await api('DELETE', `/clients/${id}`);
    renderClients();
    showToast('Cliente removido.');
  } catch (e) {
    showToast(e.message);
  }
}

// ===== FICHA =====
async function openFicha(clientId) {
  state.currentClient = state.clients.find(c => c.id === clientId);
  state.selectedExercises = [];
  navigate('ficha');

  const c = state.currentClient;
  document.getElementById('ficha-title').textContent         = `Ficha: ${c.name}`;
  document.getElementById('ficha-patient-name').textContent  = c.name;
  document.getElementById('ficha-patient-email').textContent = c.email;
  document.getElementById('ficha-patient-phone').textContent = c.phone;
  document.getElementById('ficha-patient-status').textContent = c.status;
  document.getElementById('ficha-date').value = formatDate(new Date());

  await renderFichaHistory();
  await renderExercisePicker('all');

  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ftab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('.ftab[data-ftab="nova"]').classList.add('active');
  document.getElementById('ftab-nova').classList.add('active');
}

async function renderFichaHistory() {
  if (!state.currentClient) return;
  try {
    state.fichas = await api('GET', `/fichas?client_id=${state.currentClient.id}`);
    const el = document.getElementById('ficha-history-list');
    el.innerHTML = state.fichas.length
      ? state.fichas.map(f => `
          <div class="history-item" onclick="viewFicha('${f.id}')">
            <div class="history-item-header">
              <span class="history-item-date">${formatDateBR(f.date)}</span>
              <span class="history-item-pain">🔴 Dor: ${f.pain}/10</span>
            </div>
            <div class="history-item-complaint">${f.complaint}</div>
            <div class="history-item-region">📍 ${f.region}</div>
          </div>`).join('')
      : '<div class="empty-state"><span class="emoji">📋</span>Nenhuma ficha registrada ainda</div>';
  } catch (e) {
    console.error(e);
  }
}

async function viewFicha(fichaId) {
  try {
    const f = await api('GET', `/fichas/${fichaId}`);
    const plans = f.plans || [];
    document.getElementById('modal-content').innerHTML = `
      <h2>Ficha — ${formatDateBR(f.date)}</h2>
      <div class="history-detail">
        <div class="history-detail-label">Queixa Principal</div>
        <div class="history-detail-value">${f.complaint}</div>
      </div>
      <div class="history-detail">
        <div class="history-detail-label">Região / Dor</div>
        <div class="history-detail-value">${f.region} — Intensidade ${f.pain}/10</div>
      </div>
      <div class="history-detail">
        <div class="history-detail-label">Notas</div>
        <div class="history-detail-value">${f.notes || '—'}</div>
      </div>
      <div class="history-detail">
        <div class="history-detail-label">Plano de Tratamento</div>
        <div class="history-detail-value">${f.plan || '—'}</div>
      </div>
      ${plans.length ? `<div class="history-detail">
        <div class="history-detail-label">Exercícios Designados</div>
        ${plans.map(p => `<div class="plan-item">
          <span class="plan-item-name">${p.icon} ${p.exercise_name}</span>
          <span class="plan-item-reps">${p.series}x${p.reps}</span>
        </div>`).join('')}
      </div>` : ''}`;
    openModal();
  } catch (e) {
    showToast('Erro ao carregar ficha.');
  }
}

async function saveFicha() {
  if (!state.currentClient) return;
  const date      = document.getElementById('ficha-date').value;
  const complaint = document.getElementById('ficha-complaint').value.trim();
  const region    = document.getElementById('ficha-region').value;
  const pain      = document.getElementById('ficha-pain').value;
  const notes     = document.getElementById('ficha-notes').value.trim();
  const plan      = document.getElementById('ficha-plan').value.trim();

  if (!complaint || !region) { showToast('Preencha a queixa e região.'); return; }

  try {
    await api('POST', '/fichas', {
      client_id: state.currentClient.id, date, complaint, region,
      pain: parseInt(pain), notes, plan
    });

    document.getElementById('ficha-complaint').value = '';
    document.getElementById('ficha-region').value    = '';
    document.getElementById('ficha-pain').value      = '0';
    document.getElementById('pain-label').textContent = '0';
    document.getElementById('ficha-notes').value     = '';
    document.getElementById('ficha-plan').value      = '';

    await renderFichaHistory();
    showToast('Ficha salva com sucesso! ✅');
    switchFichaTab('historico');

    if (parseInt(pain) >= 7) {
      document.getElementById('alert-badge').textContent = '!';
    }
  } catch (e) {
    showToast(e.message);
  }
}

function updatePainLabel(val) { document.getElementById('pain-label').textContent = val; }

function switchFichaTab(tab) {
  document.querySelectorAll('.ftab').forEach(t => { t.classList.toggle('active', t.dataset.ftab === tab); });
  document.querySelectorAll('.ftab-content').forEach(t => { t.classList.toggle('active', t.id === 'ftab-' + tab); });
}

// ===== EXERCISE PICKER (ficha) =====
async function renderExercisePicker(region) {
  try {
    if (state.exercises.length === 0) {
      state.exercises = await api('GET', '/exercises');
    }
    const list = region === 'all' ? state.exercises : state.exercises.filter(e => e.region === region);
    const el = document.getElementById('exercise-picker');
    el.innerHTML = list.map(ex => {
      const sel = state.selectedExercises.includes(ex.id);
      return `<div class="ex-pick-item${sel?' selected':''}" onclick="toggleExercise(${ex.id})">
        <div class="ex-pick-name">${ex.icon} ${ex.name}</div>
        <div class="ex-pick-region">${ex.region}</div>
      </div>`;
    }).join('');
  } catch (e) {
    console.error(e);
  }
}

function filterExercises(region) { renderExercisePicker(region); }

function toggleExercise(id) {
  const idx = state.selectedExercises.indexOf(id);
  if (idx >= 0) state.selectedExercises.splice(idx, 1);
  else state.selectedExercises.push(id);
  renderExercisePicker(document.getElementById('ex-filter').value);
  renderSelectedExercises();
}

function renderSelectedExercises() {
  const section = document.getElementById('selected-exercises-section');
  const list    = document.getElementById('selected-exercises-list');
  const config  = document.getElementById('ex-config');
  const btn     = document.getElementById('btn-designar');

  if (state.selectedExercises.length === 0) {
    section.style.display = 'none'; config.style.display = 'none'; btn.style.display = 'none'; return;
  }
  section.style.display = 'flex'; config.style.display = 'grid'; btn.style.display = 'block';
  list.innerHTML = state.selectedExercises.map(id => {
    const ex = state.exercises.find(e => e.id === id);
    return `<div class="sel-ex-tag">${ex.icon} ${ex.name}<button class="sel-ex-remove" onclick="toggleExercise(${id})">✕</button></div>`;
  }).join('');
}

async function designarPlano() {
  if (!state.currentClient || state.selectedExercises.length === 0) return;
  const series  = document.getElementById('ex-series').value;
  const reps    = document.getElementById('ex-reps').value;
  const fichaId = state.fichas.sort((a,b) => b.date.localeCompare(a.date))[0]?.id || null;

  try {
    await api('POST', '/exercises/plans', {
      client_id: state.currentClient.id,
      ficha_id:  fichaId,
      exercises: state.selectedExercises.map(id => ({ exercise_id: id, series: parseInt(series), reps: parseInt(reps) }))
    });
    state.selectedExercises = [];
    renderSelectedExercises();
    renderExercisePicker(document.getElementById('ex-filter').value);
    showToast('Plano designado! ✅');
  } catch (e) {
    showToast(e.message);
  }
}

// ===== AGENDA =====
async function renderAgenda() {
  try {
    state.appointments = await api('GET', '/appointments');
    renderAgendaCalendar();
    renderAgendaDay(state.agendaSelectedDay);
  } catch (e) {
    console.error(e);
  }
}

function renderAgendaCalendar() {
  const d = state.agendaDate;
  document.getElementById('agenda-cal-title').textContent = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const cal   = document.getElementById('agenda-calendar');
  cal.innerHTML = DAYS.map(day => `<div class="cal-day-name">${day}</div>`).join('');
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last  = new Date(d.getFullYear(), d.getMonth()+1, 0);
  const sel   = state.agendaSelectedDay;

  for (let i = 0; i < first.getDay(); i++) {
    cal.innerHTML += `<div class="cal-day other-month">${new Date(d.getFullYear(), d.getMonth(), -first.getDay()+i+1).getDate()}</div>`;
  }
  for (let i = 1; i <= last.getDate(); i++) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const hasAppt = state.appointments.some(a => (a.date||'').startsWith(dateStr));
    const isSel   = sel && sel.getDate()===i && sel.getMonth()===d.getMonth() && sel.getFullYear()===d.getFullYear();
    cal.innerHTML += `<div class="cal-day${hasAppt?' has-event':''}${isSel?' selected':''}" onclick="selectAgendaDay(${d.getFullYear()},${d.getMonth()},${i})">${i}</div>`;
  }
}

function selectAgendaDay(y, m, d) {
  state.agendaSelectedDay = new Date(y, m, d);
  renderAgendaCalendar();
  renderAgendaDay(state.agendaSelectedDay);
}

function renderAgendaDay(date) {
  const dateStr = formatDate(date);
  const appts = state.appointments
    .filter(a => (a.date||'').startsWith(dateStr))
    .sort((a,b) => a.time.localeCompare(b.time));
  document.getElementById('agenda-day-title').textContent = `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  const el = document.getElementById('agenda-day-list');
  el.innerHTML = appts.length
    ? appts.map(a => `
        <div class="appt-item">
          <div class="appt-time">${(a.time||'').slice(0,5)}${a.end_time?'–'+(a.end_time||'').slice(0,5):''}</div>
          <div class="appt-info">
            <div class="appt-patient">${a.client_name || '—'}</div>
            <div class="appt-type">${a.type}</div>
          </div>
          <span class="status-pill ${a.status==='concluido'?'done':a.status==='confirmado'?'confirmed':'pending'}">${a.status}</span>
        </div>`).join('')
    : '<div class="empty-state"><span class="emoji">📱</span>Sem consultas neste dia.<br>Os agendamentos vêm do app Android.</div>';
}

function prevMonthAgenda() { state.agendaDate = new Date(state.agendaDate.getFullYear(), state.agendaDate.getMonth()-1, 1); renderAgendaCalendar(); }
function nextMonthAgenda() { state.agendaDate = new Date(state.agendaDate.getFullYear(), state.agendaDate.getMonth()+1, 1); renderAgendaCalendar(); }

// ===== EXERCISE LIBRARY =====
async function renderExerciseLibrary(search = '') {
  try {
    if (state.exercises.length === 0) {
      state.exercises = await api('GET', '/exercises');
    }

    const categories = [
      { id: 'all',     label: '🔍 Todos',      count: state.exercises.length },
      { id: 'lombar',  label: '🦴 Lombar',      count: state.exercises.filter(e=>e.region==='lombar').length },
      { id: 'cervical',label: '🔵 Cervical',    count: state.exercises.filter(e=>e.region==='cervical').length },
      { id: 'joelho',  label: '🦵 Joelho',      count: state.exercises.filter(e=>e.region==='joelho').length },
      { id: 'ombro',   label: '💪 Ombro',       count: state.exercises.filter(e=>e.region==='ombro').length },
      { id: 'quadril', label: '🍑 Quadril',     count: state.exercises.filter(e=>e.region==='quadril').length },
      { id: 'coluna',  label: '⭕ Coluna/RPG',  count: state.exercises.filter(e=>e.region==='coluna').length },
    ];

    const catEl = document.getElementById('category-list');
    catEl.innerHTML = categories.map(cat =>
      `<div class="cat-item${state.exLibCategory===cat.id?' active':''}" onclick="setExLibCat('${cat.id}')">
        ${cat.label} <span style="color:var(--text-dim);font-size:0.75rem">(${cat.count})</span>
       </div>`
    ).join('');

    let list = state.exLibCategory === 'all' ? state.exercises : state.exercises.filter(e => e.region === state.exLibCategory);
    if (search) list = list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
    const grid = document.getElementById('ex-library-grid');
    grid.innerHTML = list.map(ex => `
      <div class="ex-card">
        <div class="ex-card-icon">${ex.icon}</div>
        <div class="ex-card-name">${ex.name}</div>
        <div class="ex-card-region">${ex.region}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">${ex.description || ''}</div>
      </div>`).join('');
  } catch (e) {
    console.error(e);
  }
}

function setExLibCat(cat) { state.exLibCategory = cat; renderExerciseLibrary(); }
function filterExLib(val) { renderExerciseLibrary(val); }

function openExerciseModal() {
  document.getElementById('modal-content').innerHTML = `
    <h2>Novo Exercício</h2>
    <div class="modal-form">
      <div class="field-group"><label>Nome do exercício</label><input type="text" id="ne-name"></div>
      <div class="field-group"><label>Região</label>
        <select id="ne-region">
          <option value="lombar">Lombar</option><option value="cervical">Cervical</option>
          <option value="joelho">Joelho</option><option value="ombro">Ombro</option>
          <option value="quadril">Quadril</option><option value="coluna">Coluna/RPG</option>
        </select>
      </div>
      <div class="field-group"><label>Descrição</label><textarea id="ne-desc" rows="3"></textarea></div>
      <div class="field-group"><label>Ícone (emoji)</label><input type="text" id="ne-icon" value="🏋️" maxlength="2"></div>
      <div class="modal-actions">
        <button class="btn-primary" onclick="saveNewExercise()">Salvar</button>
        <button class="btn-primary danger" onclick="closeModal()">Cancelar</button>
      </div>
    </div>`;
  openModal();
}

async function saveNewExercise() {
  const name   = document.getElementById('ne-name').value.trim();
  const region = document.getElementById('ne-region').value;
  const desc   = document.getElementById('ne-desc').value.trim();
  const icon   = document.getElementById('ne-icon').value || '🏋️';
  if (!name) { showToast('Informe o nome do exercício.'); return; }
  try {
    const newEx = await api('POST', '/exercises', { name, region, icon, description: desc });
    state.exercises.push(newEx);
    closeModal();
    renderExerciseLibrary();
    showToast('Exercício adicionado! ✅');
  } catch (e) {
    showToast(e.message);
  }
}

// ===== REPORTS =====
async function renderReports() {
  try {
    const d = await api('GET', '/dashboard');
    const { regionData } = d;
    const sorted = regionData.sort((a,b) => b.count - a.count).slice(0, 6);
    const max = Math.max(...sorted.map(r => r.count), 1);
    document.getElementById('region-chart').innerHTML = sorted.map(({region, count}) =>
      `<div class="bar-row">
        <div class="bar-label">${region}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(count/max)*100}%"></div></div>
        <div class="bar-val">${count}</div>
      </div>`
    ).join('') || '<div class="empty-state">Sem dados ainda</div>';
  } catch (e) {
    console.error(e);
  }
}

// ===== ALERTS =====
async function renderAlerts() {
  try {
    state.alerts = await api('GET', '/alerts');
    const el = document.getElementById('alerts-full-list');
    el.innerHTML = state.alerts.length
      ? state.alerts.map(a => `
          <div class="alert-full-item${a.is_read?' read':' unread'}">
            <div class="alert-icon ${a.type}">${a.type==='pain'?'🔴':'ℹ️'}</div>
            <div class="alert-body">
              <div class="alert-title">${a.client_name} — ${a.region}</div>
              <div class="alert-desc">${a.message}</div>
              <div class="alert-time">${a.alert_time}</div>
            </div>
            ${!a.is_read?`<button class="alert-read-btn" onclick="markRead('${a.id}')">✓ Lida</button>`:''}
          </div>`).join('')
      : '<div class="empty-state"><span class="emoji">🔔</span>Nenhum alerta</div>';

    const unread = state.alerts.filter(a => !a.is_read).length;
    document.getElementById('alert-badge').textContent = unread || '';
  } catch (e) {
    console.error(e);
  }
}

async function markRead(id) {
  try {
    await api('PATCH', `/alerts/${id}/read`);
    renderAlerts();
  } catch (e) {
    showToast(e.message);
  }
}

async function clearAlerts() {
  try {
    await api('PATCH', '/alerts/read-all');
    renderAlerts();
    document.getElementById('alert-badge').textContent = '';
    showToast('Todos os alertas marcados como lidos.');
  } catch (e) {
    showToast(e.message);
  }
}

// ===== MODAL =====
function openModal()  { document.getElementById('modal-overlay').classList.add('active'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== NAV BINDINGS =====
document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('form-' + tab.dataset.tab).classList.add('active');
  });
});
document.querySelectorAll('.ftab').forEach(tab => {
  tab.addEventListener('click', () => switchFichaTab(tab.dataset.ftab));
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('form-login').classList.contains('active')) doLogin();
});

// ===== INIT =====
// Verifica se já tem token salvo e tenta restaurar sessão
async function init() {
  if (!TOKEN) return; // Não logado, fica na tela de login
  try {
    // Valida o token buscando os dados do dashboard
    await api('GET', '/health');
    const savedUser = localStorage.getItem('rpg-user');
    if (savedUser) {
      state.currentUser = JSON.parse(savedUser);
    } else {
      // Extrai info básica do JWT (sem verificar assinatura no client)
      const payload = JSON.parse(atob(TOKEN.split('.')[1]));
      state.currentUser = { id: payload.id, name: payload.name, email: payload.email };
      localStorage.setItem('rpg-user', JSON.stringify(state.currentUser));
    }
    showApp();
  } catch (e) {
    // Token inválido/expirado — limpa e fica no login
    TOKEN = null;
    localStorage.removeItem('rpg-token');
    localStorage.removeItem('rpg-user');
  }
}

init();
