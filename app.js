/* ═══════════════════════════════════════════════════════
   AADAM MUSIC ACADEMY — app.js
   Vanilla JS + Supabase | LTR English
═══════════════════════════════════════════════════════ */

// ── Supabase Init ──
const SUPABASE_URL = 'https://qatzmmbnmnispcufgcio.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdHptbWJubW5pc3BjdWZnY2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjkzNDgsImV4cCI6MjA5MzgwNTM0OH0.fPzBxeR9ssrdhQbAbgQvBsYPWPH87976bQSnOoQaA0c';
let db;

// ── State ──
let currentUser = null;
let currentProfile = null;
let timerInterval = null;
let timerSeconds = 0;


// ════════════════════════════════
// THEME PALETTE
// ════════════════════════════════

const PALETTES = ['gold', 'silver', 'rose', 'sage'];

function applyPalette(name) {
  document.documentElement.setAttribute('data-palette', name);
  localStorage.setItem('aadam-palette', name);
  document.querySelectorAll('.palette-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.palette === name);
  });
}

function initPalette() {
  const saved = localStorage.getItem('aadam-palette') || 'gold';
  applyPalette(saved);
}

// ════════════════════════════════
// ANIMATIONS TOGGLE
// ════════════════════════════════

function initAnimations() {
  const saved = localStorage.getItem('aadam-animations');
  const enabled = saved !== 'off';
  document.body.classList.toggle('no-animations', !enabled);
  const toggle = document.getElementById('toggle-animations');
  if (toggle) toggle.checked = enabled;
}

function setAnimations(enabled) {
  localStorage.setItem('aadam-animations', enabled ? 'on' : 'off');
  document.body.classList.toggle('no-animations', !enabled);
}

// ════════════════════════════════
// SIDEBAR MOBILE TOGGLE
// ════════════════════════════════

function openSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ════════════════════════════════
// CARD STAGGER HELPER
// ════════════════════════════════

function staggerCards(containerSelector) {
  const cards = document.querySelectorAll(
    `${containerSelector} .student-card, ${containerSelector} .rep-card,
     ${containerSelector} .term-card, ${containerSelector} .score-card,
     ${containerSelector} .exercise-card`
  );
  cards.forEach((card, i) => {
    card.style.setProperty('--card-i', i);
  });
}

// ════════════════════════════════
// UTILITIES
// ════════════════════════════════

function showNotif(msg, type = '') {
  const el = document.getElementById('notif');
  el.textContent = msg;
  el.className = `notif ${type}`;
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.className = 'notif hidden'; }, 3000);
}

async function logError(error, context = '') {
  try {
    const { data: { user } } = await db.auth.getUser();
    await db.from('error_logs').insert({
      user_id: user?.id ?? null,
      error: error?.message ?? String(error),
      context
    });
  } catch (_) { /* silent */ }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showPanel(panelId, navEl) {
  const panels = navEl.closest('.screen').querySelectorAll('.panel');
  panels.forEach(p => p.classList.remove('active'));
  document.getElementById(panelId).classList.add('active');

  const nav = navEl.closest('nav');
  const navItems = nav.querySelectorAll('.nav-item, .sidebar-nav-item, .tab-bar-item');
  navItems.forEach(n => n.classList.remove('active'));
  navEl.classList.add('active');
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function paymentLabel(status) {
  if (status === 'paid') return { text: 'Paid', cls: 'paid' };
  if (status === 'overdue') return { text: 'Overdue', cls: 'overdue' };
  return { text: 'Pending', cls: '' };
}

// ════════════════════════════════
// AUTH
// ════════════════════════════════

async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) { showNotif('Invalid email or password', 'error'); logError(error, 'login'); return; }
  await afterAuth(data.user);
}

async function register(name, email, password, role, inviteCode) {
  // Validate invite code for student/parent
  let teacherProfile = null;
  if (role === 'student' || role === 'parent') {
    if (!inviteCode) { showNotif('Invite code is required', 'error'); return; }
    const { data: tp, error: te } = await db
      .from('profiles')
      .select('id, name')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();
    if (te || !tp) { showNotif('Invalid invite code', 'error'); return; }
    teacherProfile = tp;
  }

  const { data, error } = await db.auth.signUp({ email, password });
  if (error) { showNotif(error.message, 'error'); logError(error, 'register'); return; }

  const profileData = {
    id: data.user.id,
    name,
    role,
    teacher_id: teacherProfile?.id ?? null,
    teacher_name: teacherProfile?.name ?? null,
    invite_code: role === 'teacher' ? generateInviteCode() : null
  };

  const { error: pe } = await db.from('profiles').insert(profileData);
  if (pe) { showNotif('Error saving profile', 'error'); logError(pe, 'register-profile'); return; }

  // Auto-add to students table
  if (role === 'student' && teacherProfile) {
    await db.from('students').insert({
      teacher_id: teacherProfile.id,
      profile_id: data.user.id,
      name: name,
      status: 'active'
    });
  }

  showNotif('Registration successful!', 'success');
  await afterAuth(data.user);
}

async function logout() {
  await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showScreen('screen-auth');
}

async function afterAuth(user) {
  currentUser = user;
  const { data: profile, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    showNotif('Error loading profile', 'error');
    logError(error, 'afterAuth');
    return;
  }
  currentProfile = profile;

  if (profile.role === 'teacher') {
    document.getElementById('teacher-name-display').textContent = profile.name;
    const avatarEl = document.getElementById('teacher-avatar-initials');
    if (avatarEl) avatarEl.textContent = profile.name?.[0]?.toUpperCase() || 'T';
    document.getElementById('invite-code-display').textContent = profile.invite_code || '—';
    showScreen('screen-teacher');
    loadStudents();
    loadLessons();
  } else {
    document.getElementById('student-name-display').textContent = profile.name;
    showScreen('screen-student');
    initKarname();
    loadStudentMessages();
    loadStudentTerms();
    loadStudentRepertoire();
    loadPracticeStreak();
  }
}

// ════════════════════════════════
// STUDENTS (Teacher)
// ════════════════════════════════


/* ── HalfMeter SVG helper ── */
function halfMeterSVG(pct, label) {
  const R = 22, cx = 28, cy = 28;
  const startAngle = Math.PI;
  const endAngle   = 2 * Math.PI;
  const arc = endAngle - startAngle;
  const total = Math.round(arc * R);
  const filled = Math.round(pct / 100 * total);
  const x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle);
  const x2 = cx + R * Math.cos(endAngle),   y2 = cy + R * Math.sin(endAngle);
  return `
    <div class="c-half-meter">
      <svg width="56" height="32" viewBox="0 0 56 32" fill="none">
        <path d="M6 28 A22 22 0 0 1 50 28"
          class="c-half-meter__track" stroke-width="3"/>
        <path d="M6 28 A22 22 0 0 1 50 28"
          class="c-half-meter__fill"
          stroke-dasharray="${filled} ${total - filled}"
          stroke-dashoffset="0"
          stroke-width="3"/>
      </svg>
      <span class="c-half-meter__value">${label}</span>
    </div>`;
}

async function loadStudents() {
  const { data: students, error } = await db
    .from('students')
    .select('*')
    .eq('teacher_id', currentProfile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) { logError(error, 'loadStudents'); return; }

  const list = document.getElementById('students-list');
  if (!students.length) {
    list.innerHTML = '<div class="empty-state">No students added yet</div>';
    return;
  }

  list.innerHTML = students.map(s => {
    const badge = paymentLabel(s.payment_status);
    const initials = s.name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || '?';
    return `
      <div class="student-card" data-id="${s.id}" data-name="${s.name}">
        <div class="c-avatar c-avatar--md">${initials}</div>
        <div class="student-card-body">
          <span class="student-name">${s.name}</span>
          <div class="student-meta-row">
            <span class="student-meta">${s.instrument || '—'} · ${s.class_time || '—'}</span>
            <span class="student-badge ${badge.cls}">${badge.text}</span>
          </div>
        </div>
        <div class="student-card-meter">${halfMeterSVG(0, '—')}</div>
      </div>`;
  }).join('');

  // Click on student card → open profile modal
  list.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('click', () => {
      const student = students.find(s => s.id === card.dataset.id);
      openStudentProfile(student);
    });
  });

  populateStudentSelects(students);
  staggerCards('#students-list');
  // Load real scores into HalfMeters async
  loadStudentHalfMeters(students);
}

function populateStudentSelects(students) {
  const scoreSelect = document.getElementById('score-student-select');
  const msgSelect = document.getElementById('msg-to-select');
  const opts = students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  scoreSelect.innerHTML = '<option value="">— Select —</option>' + opts;
  msgSelect.innerHTML = '<option value="">— Select Student —</option>' + opts;
}

async function addStudent(data) {
  const { error } = await db.from('students').insert({
    teacher_id: currentProfile.id,
    ...data
  });
  if (error) { showNotif('Error saving student', 'error'); logError(error, 'addStudent'); return; }
  showNotif('Student added ✓', 'success');
  closeModal('modal-add-student');
  loadStudents();
}

async function loadLessons() {
  const { data: lessons, error } = await db
    .from('lessons')
    .select('*')
    .eq('teacher_id', currentProfile.id)
    .order('created_at', { ascending: false });

  if (error) { logError(error, 'loadLessons'); return; }

  const list = document.getElementById('lessons-list');
  if (!lessons.length) {
    list.innerHTML = '<div class="empty-state">No lessons added yet</div>';
    return;
  }

  list.innerHTML = lessons.map(l => `
    <div class="student-card">
      <div class="student-info">
        <span class="student-name">${l.title}</span>
        <span class="student-meta">${l.level || '—'} · Session ${l.session_number || '—'}</span>
      </div>
    </div>`).join('');
}

async function addLesson(data) {
  const { error } = await db.from('lessons').insert({
    teacher_id: currentProfile.id,
    ...data
  });
  if (error) { showNotif('Error saving lesson', 'error'); logError(error, 'addLesson'); return; }
  showNotif('Lesson added ✓', 'success');
  closeModal('modal-add-lesson');
  loadLessons();
}

// ════════════════════════════════
// TERMS (Teacher)
// ════════════════════════════════

let currentStudentForTerm = null;

function openStudentProfile(student) {
  currentStudentForTerm = student;
  document.getElementById('profile-student-name').textContent = student.name;

  // Info tab
  document.getElementById('student-info-display').innerHTML = `
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Instrument</span><span>${student.instrument || '—'}</span></div>
      <div class="info-row"><span class="info-label">Level</span><span>${student.level || '—'}</span></div>
      <div class="info-row"><span class="info-label">Class Time</span><span>${student.class_time || '—'}</span></div>
      <div class="info-row"><span class="info-label">Monthly Fee</span><span>${student.monthly_fee ? student.monthly_fee.toLocaleString('en') + ' Tomans' : '—'}</span></div>
      <div class="info-row"><span class="info-label">Class Type</span><span>${student.class_type === 'online' ? 'Online' : 'In-Person'}</span></div>
    </div>`;

  // Hide add-term button for non-teachers
  const btnAddTerm = document.getElementById('btn-add-term');
  if (btnAddTerm) btnAddTerm.style.display = currentProfile?.role === 'teacher' ? '' : 'none';

  // Switch to terms tab
  switchProfileTab('terms');
  loadTerms(student.id);
  openModal('modal-student-profile');
}

function switchProfileTab(tabName) {
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.profile-tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`profile-tab-${tabName}`).classList.add('active');
  if (tabName === 'karname' && currentStudentForTerm) {
    loadTeacherKarname();
  }
  if (tabName === 'repertoire' && currentStudentForTerm) {
    loadRepertoire(currentStudentForTerm.id);
  }
}

async function loadTerms(studentId) {
  const list = document.getElementById('terms-list');
  list.innerHTML = '<div class="empty-state">Loading...</div>';

  const { data: terms, error } = await db
    .from('terms')
    .select('*, term_months(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) { logError(error, 'loadTerms'); return; }

  if (!terms.length) {
    list.innerHTML = '<div class="empty-state">No terms defined yet</div>';
    return;
  }

  const levelLabel = {
    moghadamati_1: 'Beginner 1', moghadamati_2: 'Beginner 2',
    motevaset_1: 'Intermediate 1', motevaset_2: 'Intermediate 2',
    pishrafte_1: 'Advanced 1', pishrafte_2: 'Advanced 2'
  };

  list.innerHTML = terms.map(t => {
    const months = (t.term_months || []).sort((a, b) => a.month_number - b.month_number);
    return `
      <div class="term-card" data-term-id="${t.id}" style="cursor:pointer">
        <div class="term-header">
          <span class="term-title">${t.title}</span>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span class="term-level">${levelLabel[t.level] || t.level}</span>
            <button class="btn-delete-term" data-term-id="${t.id}" title="Delete term">🗑</button>
          </div>
        </div>
        <div class="term-months">
          ${months.map(m => `
            <div class="month-row">
              <span class="month-label">Month ${m.month_number}</span>
              <label class="toggle-label">
                <input type="checkbox" class="month-unlock-toggle"
                  data-month-id="${m.id}"
                  ${m.is_unlocked ? 'checked' : ''} />
                <span class="toggle-track"></span>
                <span>${m.is_unlocked ? 'Open' : 'Locked'}</span>
              </label>
            </div>`).join('')}
        </div>
        <div class="term-footer" style="display:flex;justify-content:space-between;align-items:center">
          <span class="term-detail-hint">Click for details →</span>
          <label class="toggle-label" onclick="event.stopPropagation()">
            <input type="checkbox" class="term-report-toggle"
              data-term-id="${t.id}"
              ${t.include_in_report !== false ? 'checked' : ''} />
            <span class="toggle-track"></span>
            <span style="font-size:0.75rem">${t.include_in_report !== false ? 'In Report' : 'Excluded'}</span>
          </label>
        </div>
      </div>`;
  }).join('');

  // Click on term card → show detail
  list.querySelectorAll('.term-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.btn-delete-term') || e.target.closest('.toggle-label')) return;
      const term = terms.find(t => t.id === card.dataset.termId);
      openTermDetail(term, levelLabel);
    });
  });

  // Toggle month lock
  list.querySelectorAll('.month-unlock-toggle').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const monthId = toggle.dataset.monthId;
      const isUnlocked = toggle.checked;
      const { error } = await db.from('term_months').update({
        is_unlocked: isUnlocked,
        unlocked_at: isUnlocked ? new Date().toISOString() : null
      }).eq('id', monthId);
      if (error) { showNotif('Error changing access', 'error'); logError(error, 'toggleMonth'); toggle.checked = !isUnlocked; return; }
      toggle.nextElementSibling.nextElementSibling.textContent = isUnlocked ? 'Open' : 'Locked';
      showNotif(isUnlocked ? 'Month unlocked ✓' : 'Month locked', 'success');
    });
  });

  // Toggle include_in_report
  list.querySelectorAll('.term-report-toggle').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const termId = toggle.dataset.termId;
      const val = toggle.checked;
      const { error } = await db.from('terms').update({ include_in_report: val }).eq('id', termId);
      if (error) { showNotif('Error', 'error'); toggle.checked = !val; return; }
      toggle.nextElementSibling.nextElementSibling.textContent = val ? 'In Report' : 'Excluded';
      showNotif(val ? 'Added to report ✓' : 'Removed from report', 'success');
    });
  });

  // Delete term
  list.querySelectorAll('.btn-delete-term').forEach(btn => {
    btn.addEventListener('click', async () => {
      const termId = btn.dataset.termId;
      if (!confirm('This term and all its sessions will be deleted. Are you sure?')) return;
      const { error } = await db.from('terms').delete().eq('id', termId);
      if (error) { showNotif('Error deleting term', 'error'); logError(error, 'deleteTerm'); return; }
      showNotif('Term deleted', 'success');
      loadTerms(currentStudentForTerm.id);
    });
  });
}

async function openTermDetail(term, levelLabel) {
  const { data: sessions, error } = await db
    .from('sessions')
    .select('*')
    .eq('term_id', term.id)
    .order('session_number', { ascending: true });

  if (error) { logError(error, 'openTermDetail'); return; }

  const today = new Date().toISOString().split('T')[0];

  const sessionRows = (sessions || []).map(s => {
    const isPast = s.session_date && s.session_date < today;
    const isToday = s.session_date === today;
    const statusClass = isToday ? 'session-today' : isPast ? 'session-past' : 'session-future';
    const statusLabel = isToday ? '📍 Today' : isPast ? '✓' : '—';
    const hasContent = s.content_text ? '📝' : '';
    return `
      <div class="session-row ${statusClass}" data-session-id="${s.id}" style="cursor:pointer">
        <span class="session-num">Session ${s.session_number} ${hasContent}</span>
        <span class="session-date">${s.session_date ? new Date(s.session_date).toLocaleDateString('en-GB') : '—'}</span>
        <span class="session-status">${statusLabel}</span>
      </div>`;
  }).join('');

  document.getElementById('term-detail-title').textContent = term.title;
  document.getElementById('term-detail-level').textContent = levelLabel[term.level] || term.level;
  document.getElementById('term-detail-start').textContent = term.start_date
    ? new Date(term.start_date).toLocaleDateString('en-GB') : '—';
  document.getElementById('term-detail-sessions').innerHTML =
    sessionRows || '<div class="empty-state">No sessions recorded</div>';

  // Click on session row
  document.querySelectorAll('.session-row[data-session-id]').forEach(row => {
    row.addEventListener('click', () => {
      const session = sessions.find(s => s.id === row.dataset.sessionId);
      openSessionDetail(session);
    });
  });

  openModal('modal-term-detail');
}

let currentSession = null;

function openSessionDetail(session) {
  currentSession = session;
  document.getElementById('session-detail-title').textContent = `Session ${session.session_number}`;
  document.getElementById('session-detail-date').value = session.session_date || '';
  document.getElementById('session-detail-content').value = session.content_text || '';
  const linkEl = document.getElementById('session-detail-link');
  if (linkEl) linkEl.value = session.link || '';
  loadExercises(session.id);
  loadSessionFiles(session.id);
  openModal('modal-session-detail');
}

async function saveSessionDate() {
  const newDate = document.getElementById('session-detail-date').value;
  if (!newDate) { showNotif('Please select a date', 'error'); return; }
  const { error } = await db.from('sessions').update({ session_date: newDate }).eq('id', currentSession.id);
  if (error) { showNotif('Error saving date', 'error'); logError(error, 'saveSessionDate'); return; }
  currentSession.session_date = newDate;
  showNotif('Date saved ✓', 'success');
}

async function saveSessionContent() {
  const content = document.getElementById('session-detail-content').value;
  const linkEl = document.getElementById('session-detail-link');
  const link = linkEl ? linkEl.value || null : null;
  const { error } = await db.from('sessions').update({ content_text: content, link }).eq('id', currentSession.id);
  if (error) { showNotif('Error saving content', 'error'); logError(error, 'saveSessionContent'); return; }
  currentSession.content_text = content;
  currentSession.link = link;
  showNotif('Content saved ✓', 'success');
}


// Calculate 12 session dates from start date + class days
function calcSessionDates(startDateStr, classDays) {
  const dayMap = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0 };
  const targetDays = classDays.map(d => dayMap[d]).filter(d => d !== undefined);
  if (!targetDays.length) return [];

  const dates = [];
  const start = new Date(startDateStr);
  let current = new Date(start);

  while (dates.length < 12) {
    if (targetDays.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
    if (dates.length === 0 && current - start > 14 * 86400000) break; // safety
  }
  return dates;
}

async function addTerm() {
  const title = document.getElementById('term-title').value.trim();
  const level = document.getElementById('term-level').value;
  const startDate = document.getElementById('term-start-date').value;
  const classDays = [...document.querySelectorAll('input[name="class-day"]:checked')].map(c => c.value);

  if (!title || !level || !startDate || !classDays.length) {
    showNotif('All required fields must be filled', 'error'); return;
  }

  const sessionDates = calcSessionDates(startDate, classDays);
  if (sessionDates.length < 12) {
    showNotif('Not enough dates — select more days', 'error'); return;
  }

  // Insert term
  const { data: term, error: termErr } = await db.from('terms').insert({
    teacher_id: currentProfile.id,
    student_id: currentStudentForTerm.id,
    title, level, start_date: startDate, status: 'active'
  }).select().single();

  if (termErr) { showNotif('Error creating term', 'error'); logError(termErr, 'addTerm'); return; }

  // Insert 3 term_months
  const months = [1, 2, 3].map(m => ({ term_id: term.id, month_number: m, is_unlocked: false }));
  const { error: monthErr } = await db.from('term_months').insert(months);
  if (monthErr) { logError(monthErr, 'addTerm-months'); }

  // Insert 12 sessions
  const sessions = sessionDates.map((date, i) => ({
    term_id: term.id,
    month_number: Math.ceil((i + 1) / 4),
    session_number: i + 1,
    session_date: date.toISOString().split('T')[0]
  }));
  const { error: sessErr } = await db.from('sessions').insert(sessions);
  if (sessErr) { logError(sessErr, 'addTerm-sessions'); }

  showNotif('Term created ✓', 'success');
  closeModal('modal-add-term'); openModal('modal-student-profile');
  loadTerms(currentStudentForTerm.id);
}



function calcAverage() {
  const ids = ['score-technique', 'score-rhythm', 'score-melody', 'score-fretboard', 'score-ear'];
  const vals = ids.map(id => parseFloat(document.getElementById(id).value)).filter(v => !isNaN(v));
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function updateAvgDisplay() {
  const avg = calcAverage();
  document.getElementById('score-avg-display').textContent = avg ? `${avg} / 20` : '—';
}

async function saveScore() {
  const studentId = document.getElementById('score-student-select').value;
  const session = parseInt(document.getElementById('score-session').value);
  const isAbsent = document.getElementById('score-absent').checked;

  if (!studentId) { showNotif('Please select a student', 'error'); return; }
  if (!session) { showNotif('Please enter a session number', 'error'); return; }

  const payload = {
    teacher_id: currentProfile.id,
    student_id: studentId,
    session_number: session,
    is_absent: isAbsent,
    comment: document.getElementById('score-comment').value || null
  };

  if (!isAbsent) {
    payload.technique = parseInt(document.getElementById('score-technique').value) || null;
    payload.rhythm = parseInt(document.getElementById('score-rhythm').value) || null;
    payload.melody = parseInt(document.getElementById('score-melody').value) || null;
    payload.fretboard = parseInt(document.getElementById('score-fretboard').value) || null;
    payload.ear = parseInt(document.getElementById('score-ear').value) || null;
    payload.average = calcAverage() ? parseFloat(calcAverage()) : null;
  }

  const { error } = await db.from('scores').insert(payload);
  if (error) { showNotif('Error saving score', 'error'); logError(error, 'saveScore'); return; }
  showNotif('Score saved ✓', 'success');
}

// ════════════════════════════════
// SCORES (Student)
// ════════════════════════════════

async function loadMyScores() {
  // Find student record linked to this profile
  const { data: studentRec, error: se } = await db
    .from('students')
    .select('id')
    .eq('profile_id', currentUser.id)
    .single();

  if (se || !studentRec) {
    document.getElementById('my-scores-list').innerHTML =
      '<div class="empty-state">No scores recorded yet</div>';
    return;
  }

  const { data: scores, error } = await db
    .from('scores')
    .select('*')
    .eq('student_id', studentRec.id)
    .order('session_number', { ascending: false });

  if (error) { logError(error, 'loadMyScores'); return; }

  const list = document.getElementById('my-scores-list');
  if (!scores.length) {
    list.innerHTML = '<div class="empty-state">No scores recorded yet</div>';
    return;
  }

  list.innerHTML = scores.map(s => {
    if (s.is_absent) return `
      <div class="score-card">
        <div class="score-card-header">
          <span class="score-session-label">Session ${s.session_number}</span>
          <span class="score-absent-label">Absent</span>
        </div>
        ${s.comment ? `<p style="font-size:0.82rem;color:var(--text-dim)">${s.comment}</p>` : ''}
      </div>`;

    const bars = [
      { label: 'Technique', val: s.technique },
      { label: 'Rhythm', val: s.rhythm },
      { label: 'Melody', val: s.melody },
      { label: 'Fretboard', val: s.fretboard },
      { label: 'Ear Training', val: s.ear }
    ].filter(b => b.val !== null);

    return `
      <div class="score-card">
        <div class="score-card-header">
          <span class="score-session-label">Session ${s.session_number}</span>
          <span class="score-avg-badge">${s.average ?? '—'} / 20</span>
        </div>
        <div class="score-bars">
          ${bars.map(b => `
            <div class="score-bar-row">
              <span class="score-bar-label">${b.label}</span>
              <div class="score-bar-track">
                <div class="score-bar-fill" style="width:${(b.val / 20) * 100}%"></div>
              </div>
              <span class="score-bar-val">${b.val}</span>
            </div>`).join('')}
        </div>
        ${s.comment ? `<p style="font-size:0.82rem;color:var(--text-dim);margin-top:0.75rem">${s.comment}</p>` : ''}
      </div>`;
  }).join('');
}


// ════════════════════════════════
// KARNAME (Teacher view)
// ════════════════════════════════

// ════════════════════════════════
// KARNAME (Teacher view)
// ════════════════════════════════

let teacherKarnaTerms = [];
let teacherKarnaTermMonths = {};

async function loadTeacherKarname() {
  if (!currentStudentForTerm) return;
  const studentId = currentStudentForTerm.id;

  const { data: terms } = await db
    .from('terms').select('*, term_months(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (!terms?.length) {
    document.getElementById('teacher-karname-skills').innerHTML = '<div class="empty-state">No terms defined yet</div>';
    return;
  }

  teacherKarnaTerms = terms;

  // Build checkboxes
  const checkboxEl = document.getElementById('karname-term-checkboxes');
  checkboxEl.innerHTML = terms.map(t => {
    const months = (t.term_months || []).sort((a, b) => a.month_number - b.month_number);
    return `
      <div class="karname-term-group">
        <div class="karname-term-label">
          <label class="karname-check-all">
            <input type="checkbox" class="term-all-check" data-term-id="${t.id}" checked />
            <span>${t.title}</span>
          </label>
        </div>
        <div class="karname-month-checks">
          ${months.map(m => `
            <label class="karname-month-check">
              <input type="checkbox" class="month-karname-check"
                data-term-id="${t.id}"
                data-month="${m.month_number}"
                checked />
              <span>Month ${m.month_number}</span>
            </label>`).join('')}
        </div>
      </div>`;
  }).join('');

  // Term all-check toggle
  checkboxEl.querySelectorAll('.term-all-check').forEach(cb => {
    cb.addEventListener('change', () => {
      checkboxEl.querySelectorAll(`.month-karname-check[data-term-id="${cb.dataset.termId}"]`)
        .forEach(m => { m.checked = cb.checked; });
    });
  });
}

async function applyTeacherKarname() {
  if (!currentStudentForTerm) return;
  const studentId = currentStudentForTerm.id;

  // Collect selected term+month combos
  const selected = [];
  document.querySelectorAll('.month-karname-check:checked').forEach(cb => {
    selected.push({ termId: cb.dataset.termId, month: parseInt(cb.dataset.month) });
  });

  if (!selected.length) {
    document.getElementById('teacher-karname-skills').innerHTML = '<div class="empty-state">No months selected</div>';
    document.getElementById('teacher-karname-chart').innerHTML = '';
    return;
  }

  // Load sessions matching selected term+month
  const termIds = [...new Set(selected.map(s => s.termId))];
  const { data: allSessions } = await db
    .from('sessions').select('id, session_number, session_date, term_id, month_number')
    .in('term_id', termIds).order('session_number', { ascending: true });

  const sessions = (allSessions || []).filter(s =>
    selected.some(sel => sel.termId === s.term_id && sel.month === s.month_number)
  );

  if (!sessions.length) {
    document.getElementById('teacher-karname-skills').innerHTML = '<div class="empty-state">No sessions found</div>';
    document.getElementById('teacher-karname-chart').innerHTML = '';
    return;
  }

  const sessionIds = sessions.map(s => s.id);
  const { data: exercises } = await db
    .from('exercises').select('id, session_id, max_score, title, skill_categories(name)')
    .in('session_id', sessionIds);

  const { data: scores } = await db
    .from('exercise_scores').select('exercise_id, score')
    .eq('student_id', studentId)
    .in('exercise_id', (exercises || []).map(e => e.id));

  const scoreMap = {};
  (scores || []).forEach(s => { scoreMap[s.exercise_id] = s.score; });

  // Skill summary
  const skillMap = {};
  (exercises || []).forEach(ex => {
    const cat = ex.skill_categories?.name || 'Other';
    if (!skillMap[cat]) skillMap[cat] = { total: 0, max: 0 };
    const score = scoreMap[ex.id];
    if (score !== null && score !== undefined) {
      skillMap[cat].total += score;
      skillMap[cat].max += ex.max_score;
    }
  });

  const skillsEl = document.getElementById('teacher-karname-skills');
  const skillEntries = Object.entries(skillMap).filter(([, v]) => v.max > 0);
  if (skillEntries.length) {
    skillsEl.innerHTML = `
      <div class="karname-section-title">Skill Summary</div>
      ${skillEntries.map(([name, v]) => {
        const pct = Math.round((v.total / v.max) * 100);
        return `<div class="skill-summary-row">
          <span class="skill-name">${name}</span>
          <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${pct}%"></div></div>
          <span class="skill-score">${v.total} / ${v.max}</span>
        </div>`;
      }).join('')}`;
  } else {
    skillsEl.innerHTML = '<div class="empty-state">No scores recorded yet</div>';
  }

  // Session chart
  const exBySession = {};
  (exercises || []).forEach(ex => {
    if (!exBySession[ex.session_id]) exBySession[ex.session_id] = [];
    exBySession[ex.session_id].push(ex);
  });

  const sessionData = sessions.map(s => {
    const exs = exBySession[s.id] || [];
    const scored = exs.filter(e => scoreMap[e.id] !== null && scoreMap[e.id] !== undefined);
    if (!scored.length) return null;
    const total = scored.reduce((a, e) => a + scoreMap[e.id], 0);
    const max = scored.reduce((a, e) => a + e.max_score, 0);
    return { ...s, pct: Math.round((total / max) * 100), total, max, exs: scored };
  }).filter(Boolean);

  const chartEl = document.getElementById('teacher-karname-chart');
  const chartTitle = document.getElementById('karname-chart-title');
  if (!sessionData.length) {
    chartEl.innerHTML = '<div class="empty-state">No scores recorded in sessions yet</div>';
    if (chartTitle) chartTitle.style.display = 'none';
    return;
  }

  if (chartTitle) chartTitle.style.display = '';
  chartEl.innerHTML = `<div class="session-bars">
    ${sessionData.map(s => `
      <div class="session-bar-col" data-session-id="${s.id}" data-total="${s.total}" data-max="${s.max}" data-num="${s.session_number}" data-date="${s.session_date || ''}">
        <div class="session-bar-wrap">
          <div class="session-bar-inner" style="height:${s.pct}%"></div>
        </div>
        <span class="session-bar-label">S${s.session_number}</span>
      </div>`).join('')}
  </div>`;

  chartEl.querySelectorAll('.session-bar-col').forEach(col => {
    col.addEventListener('click', () => {
      const s = sessionData.find(s => s.id === col.dataset.sessionId);
      if (!s) return;
      const detailEl = document.getElementById('teacher-karname-session-detail');
      detailEl.classList.remove('hidden');
      detailEl.innerHTML = `
        <div class="karname-detail-header">Session ${s.session_number}${s.session_date ? ' — ' + new Date(s.session_date).toLocaleDateString('en-GB') : ''}</div>
        ${s.exs.map(e => `
          <div class="karname-detail-row">
            <span>${e.skill_categories?.name || 'Other'} — ${e.title}</span>
            <span class="karname-detail-score">${scoreMap[e.id]} / ${e.max_score}</span>
          </div>`).join('')}
        <div class="karname-detail-total">Total: ${s.total} / ${s.max}</div>`;
    });
  });
}


// ════════════════════════════════
// KARNAME (Student)
// ════════════════════════════════

let myStudentId = null;
let myTerms = [];

async function initKarname() {
  const { data: studentRec, error } = await db
    .from('students').select('id').eq('profile_id', currentUser.id).single();
  if (error || !studentRec) return;
  myStudentId = studentRec.id;

  const { data: terms } = await db
    .from('terms').select('*')
    .eq('student_id', myStudentId)
    .order('created_at', { ascending: false });
  myTerms = terms || [];

  // Add term options to dropdown
  const sel = document.getElementById('karname-term-select');
  if (sel && myTerms.length) {
    myTerms.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => loadKarname(sel.value));
  }
  loadKarname('selected');
}

async function loadKarname(mode) {
  if (!myStudentId) return;

  // Filter terms
  let termIds = [];
  if (mode === 'selected') {
    termIds = myTerms.filter(t => t.include_in_report !== false).map(t => t.id);
  } else if (mode === 'all') {
    termIds = myTerms.map(t => t.id);
  } else {
    termIds = [mode]; // specific term id
  }

  if (!termIds.length) {
    document.getElementById('karname-skills').innerHTML = '<div class="empty-state">No terms selected</div>';
    document.getElementById('karname-chart').innerHTML = '';
    return;
  }

  // Load sessions in these terms
  const { data: sessions } = await db
    .from('sessions').select('id, session_number, session_date, term_id')
    .in('term_id', termIds)
    .order('session_number', { ascending: true });

  if (!sessions?.length) {
    document.getElementById('karname-skills').innerHTML = '<div class="empty-state">No sessions recorded yet</div>';
    document.getElementById('karname-chart').innerHTML = '';
    return;
  }

  const sessionIds = sessions.map(s => s.id);

  // Load exercises
  const { data: exercises } = await db
    .from('exercises').select('id, session_id, max_score, skill_categories(name)')
    .in('session_id', sessionIds);

  // Load scores
  const { data: scores } = await db
    .from('exercise_scores').select('exercise_id, score')
    .eq('student_id', myStudentId)
    .in('exercise_id', (exercises || []).map(e => e.id));

  const scoreMap = {};
  (scores || []).forEach(s => { scoreMap[s.exercise_id] = s.score; });

  // Build skill summary
  const skillMap = {};
  (exercises || []).forEach(ex => {
    const cat = ex.skill_categories?.name || 'Other';
    if (!skillMap[cat]) skillMap[cat] = { total: 0, max: 0, count: 0 };
    const score = scoreMap[ex.id];
    if (score !== null && score !== undefined) {
      skillMap[cat].total += score;
      skillMap[cat].max += ex.max_score;
      skillMap[cat].count++;
    }
  });

  // Render skill summary
  const skillsEl = document.getElementById('karname-skills');
  const skillEntries = Object.entries(skillMap).filter(([, v]) => v.count > 0);
  if (skillEntries.length) {
    skillsEl.innerHTML = `
      <div class="karname-section-title">Skill Summary</div>
      ${skillEntries.map(([name, v]) => {
        const pct = Math.round((v.total / v.max) * 100);
        return `
          <div class="skill-summary-row">
            <span class="skill-name">${name}</span>
            <div class="skill-bar-track">
              <div class="skill-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="skill-score">${v.total} / ${v.max}</span>
          </div>`;
      }).join('')}`;
  } else {
    skillsEl.innerHTML = '<div class="empty-state">No scores recorded yet</div>';
  }

  // Build session chart — per session average score %
  const exBySession = {};
  (exercises || []).forEach(ex => {
    if (!exBySession[ex.session_id]) exBySession[ex.session_id] = [];
    exBySession[ex.session_id].push(ex);
  });

  const chartEl = document.getElementById('karname-chart');
  const sessionData = sessions.map(s => {
    const exs = exBySession[s.id] || [];
    const scored = exs.filter(e => scoreMap[e.id] !== null && scoreMap[e.id] !== undefined);
    if (!scored.length) return { ...s, pct: null, total: 0, max: 0 };
    const total = scored.reduce((a, e) => a + scoreMap[e.id], 0);
    const max = scored.reduce((a, e) => a + e.max_score, 0);
    return { ...s, pct: Math.round((total / max) * 100), total, max };
  }).filter(s => s.pct !== null);

  if (!sessionData.length) {
    chartEl.innerHTML = '<div class="empty-state">No scores recorded in sessions yet</div>';
    return;
  }

  chartEl.innerHTML = `
    <div class="session-bars">
      ${sessionData.map(s => `
        <div class="session-bar-col" data-session-id="${s.id}" data-total="${s.total}" data-max="${s.max}" data-num="${s.session_number}" data-date="${s.session_date || ''}">
          <div class="session-bar-wrap">
            <div class="session-bar-inner" style="height:${s.pct}%" title="${s.pct}%"></div>
          </div>
          <span class="session-bar-label">S${s.session_number}</span>
        </div>`).join('')}
    </div>`;

  // Click on session bar → show detail
  chartEl.querySelectorAll('.session-bar-col').forEach(col => {
    col.addEventListener('click', () => {
      const detailEl = document.getElementById('karname-session-detail');
      const exs = exBySession[col.dataset.sessionId] || [];
      const scored = exs.filter(e => scoreMap[e.id] !== null && scoreMap[e.id] !== undefined);
      if (!scored.length) { detailEl.classList.add('hidden'); return; }
      detailEl.classList.remove('hidden');
      detailEl.innerHTML = `
        <div class="karname-detail-header">Session ${col.dataset.num}
          ${col.dataset.date ? ' — ' + new Date(col.dataset.date).toLocaleDateString('en-GB') : ''}
        </div>
        ${scored.map(e => `
          <div class="karname-detail-row">
            <span>${e.skill_categories?.name || 'Other'} — ${e.title || ''}</span>
            <span class="karname-detail-score">${scoreMap[e.id]} / ${e.max_score}</span>
          </div>`).join('')}
        <div class="karname-detail-total">Total: ${col.dataset.total} / ${col.dataset.max}</div>`;
    });
  });
}

// ════════════════════════════════
// MESSAGES
// ════════════════════════════════

async function loadMessages(toId) {
  const { data, error } = await db
    .from('messages')
    .select('*')
    .or(`and(from_id.eq.${currentProfile.id},to_id.eq.${toId}),and(from_id.eq.${toId},to_id.eq.${currentProfile.id})`)
    .order('created_at', { ascending: true });

  if (error) { logError(error, 'loadMessages'); return; }

  const list = document.getElementById('messages-list');
  list.innerHTML = data.map(m => {
    const isMine = m.from_id === currentProfile.id;
    const time = new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `
      <div>
        <div class="msg-bubble ${isMine ? 'sent' : 'received'}">${m.body}</div>
        <div class="msg-time" style="text-align:${isMine ? 'left' : 'right'}">${time}</div>
      </div>`;
  }).join('');
  list.scrollTop = list.scrollHeight;
}

async function sendMessage(toId, body, listId = 'messages-list') {
  if (!body.trim()) { showNotif('Message is empty', 'error'); return; }
  const { error } = await db.from('messages').insert({
    from_id: currentProfile.id,
    to_id: toId,
    body: body.trim(),
    role: currentProfile.role
  });
  if (error) { showNotif('Error sending message', 'error'); logError(error, 'sendMessage'); return; }
  showNotif('Message sent ✓', 'success');
}

async function loadStudentMessages() {
  if (!currentProfile?.teacher_id) return;
  const { data, error } = await db
    .from('messages')
    .select('*')
    .or(`and(from_id.eq.${currentProfile.id},to_id.eq.${currentProfile.teacher_id}),and(from_id.eq.${currentProfile.teacher_id},to_id.eq.${currentProfile.id})`)
    .order('created_at', { ascending: true });

  if (error) { logError(error, 'loadStudentMessages'); return; }

  const list = document.getElementById('student-messages-list');
  list.innerHTML = data.map(m => {
    const isMine = m.from_id === currentProfile.id;
    const time = new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `
      <div>
        <div class="msg-bubble ${isMine ? 'sent' : 'received'}">${m.body}</div>
        <div class="msg-time" style="text-align:${isMine ? 'left' : 'right'}">${time}</div>
      </div>`;
  }).join('');
  list.scrollTop = list.scrollHeight;
}

// ════════════════════════════════
// PRACTICE TIMER (Student)
// ════════════════════════════════

function startTimer() {
  timerSeconds = 0;
  document.getElementById('timer-display').textContent = '00:00';
  document.getElementById('btn-timer-start').style.display = 'none';
  document.getElementById('btn-timer-stop').style.display = 'inline-flex';
  timerInterval = setInterval(() => {
    timerSeconds++;
    document.getElementById('timer-display').textContent = formatTime(timerSeconds);
  }, 1000);
}

async function stopTimer() {
  clearInterval(timerInterval);
  const display = document.getElementById('timer-display');
  display.classList.remove('running');
  document.getElementById('btn-timer-start').style.display = 'inline-flex';
  document.getElementById('btn-timer-stop').style.display = 'none';

  if (timerSeconds < 10) { showNotif('Practice session too short', 'error'); return; }

  const { data: studentRec } = await db
    .from('students')
    .select('id')
    .eq('profile_id', currentUser.id)
    .single();

  if (!studentRec) { showNotif('Student profile not found', 'error'); return; }

  const note = document.getElementById('practice-note').value || null;
  const { error } = await db.from('practice_logs').insert({
    student_id: studentRec.id,
    duration_seconds: timerSeconds,
    note
  });

  if (error) { showNotif('Error saving practice', 'error'); logError(error, 'stopTimer'); return; }
  showNotif(`Practice ${formatTime(timerSeconds)} saved ✓`, 'success');
  document.getElementById('practice-note').value = '';
}




// ════════════════════════════════
// FILE UPLOAD (Teacher)
// ════════════════════════════════

async function loadSessionFiles(sessionId) {
  const listEl = document.getElementById('session-files-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const { data: files, error } = await db.storage
    .from('session-files')
    .list(`sessions/${sessionId}`);

  if (error || !files?.length) return;

  listEl.innerHTML = files.map(f => {
    const { data: urlData } = db.storage
      .from('session-files')
      .getPublicUrl(`sessions/${sessionId}/${f.name}`);
    const url = urlData?.publicUrl || '#';
    const icon = f.name.endsWith('.pdf') ? '📄' : f.name.match(/\.(mp3|m4a|aac)$/) ? '🎵' : '🎬';
    return `
      <div class="file-item">
        <a href="${url}" target="_blank" class="file-link">${icon} ${f.name}</a>
        <button class="btn-delete-file btn-xs" data-path="sessions/${sessionId}/${f.name}">🗑</button>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.btn-delete-file').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this file?')) return;
      const { error } = await db.storage.from('session-files').remove([btn.dataset.path]);
      if (error) { showNotif('Error deleting file', 'error'); return; }
      showNotif('File deleted', 'success');
      loadSessionFiles(sessionId);
    });
  });
}

async function uploadSessionFile(file) {
  if (!currentSession) return;
  if (file.size > 50 * 1024 * 1024) { showNotif('File exceeds 50MB limit', 'error'); return; }

  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}.${ext}`;
  const path = `sessions/${currentSession.id}/${fileName}`;

  showNotif('Uploading...', '');
  const { error } = await db.storage.from('session-files').upload(path, file);
  if (error) { showNotif('Upload error: ' + error.message, 'error'); return; }
  showNotif('File uploaded ✓', 'success');
  loadSessionFiles(currentSession.id);

  // Reset file input
  const inputEl = document.getElementById('session-file-upload');
  if (inputEl) inputEl.value = '';
}

// ════════════════════════════════
// EXERCISES (Teacher)
// ════════════════════════════════

let currentExercise = null;
let skillCategories = [];

async function loadSkillCategories() {
  const { data, error } = await db
    .from('skill_categories')
    .select('*')
    .or(`is_default.eq.true,teacher_id.eq.${currentProfile.id}`)
    .order('is_default', { ascending: false });
  if (error) { logError(error, 'loadSkillCategories'); return; }
  skillCategories = data || [];
  const sel = document.getElementById('exercise-category');
  if (sel) {
    sel.innerHTML = '<option value="">— Select —</option>' +
      skillCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
}

async function loadExercises(sessionId) {
  const list = document.getElementById('exercises-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state">Loading...</div>';

  const [exercisesRes, scoresRes] = await Promise.all([
    db.from('exercises').select('*, skill_categories(name)').eq('session_id', sessionId).order('created_at', { ascending: true }),
    currentStudentForTerm ? db.from('exercise_scores').select('exercise_id, score').eq('student_id', currentStudentForTerm.id) : { data: [] }
  ]);

  if (exercisesRes.error) { logError(exercisesRes.error, 'loadExercises'); return; }

  const exercises = exercisesRes.data || [];
  const scoreMap = {};
  (scoresRes.data || []).forEach(s => { scoreMap[s.exercise_id] = s.score; });

  if (!exercises.length) {
    list.innerHTML = '<div class="empty-state">No exercises added yet</div>';
    return;
  }

  list.innerHTML = exercises.map(ex => {
    const studentScore = scoreMap[ex.id];
    const scoreDisplay = studentScore !== undefined && studentScore !== null
      ? `<span class="exercise-score-badge scored">${studentScore} / ${ex.max_score}</span>`
      : `<span class="exercise-score-badge">${ex.max_score} pts</span>`;
    return `
    <div class="exercise-card" data-exercise-id="${ex.id}" data-title="${ex.title}" data-category="${ex.skill_categories?.name || ''}" data-max="${ex.max_score}" data-desc="${encodeURIComponent(ex.description || '')}" data-link="${ex.link || ''}" style="cursor:pointer">
      <div class="exercise-header">
        <span class="exercise-title">${ex.title}</span>
        <div style="display:flex;gap:0.5rem;align-items:center">
          ${scoreDisplay}
          <button class="btn-score-exercise btn-gold btn-xs" data-exercise-id="${ex.id}" data-title="${ex.title}" data-max="${ex.max_score}">Grade</button>
          <button class="btn-delete-exercise btn-xs" data-exercise-id="${ex.id}">🗑</button>
        </div>
      </div>
      ${ex.skill_categories ? `<span class="exercise-category">${ex.skill_categories.name}</span>` : ''}
      ${ex.description ? `<p class="exercise-desc">${ex.description}</p>` : ''}
      ${ex.link ? `<a href="${ex.link}" target="_blank" class="exercise-link">🔗 Resource</a>` : ''}
    </div>`;
  }).join('');

  // Click exercise card → open detail
  list.querySelectorAll('.exercise-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.btn-score-exercise') || e.target.closest('.btn-delete-exercise')) return;
      openExerciseDetail(card.dataset);
    });
  });

  // Score button
  list.querySelectorAll('.btn-score-exercise').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openScoreExercise(btn.dataset.exerciseId, btn.dataset.title, parseInt(btn.dataset.max)); });
  });

  // Delete exercise
  list.querySelectorAll('.btn-delete-exercise').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this exercise?')) return;
      const { error } = await db.from('exercises').delete().eq('id', btn.dataset.exerciseId);
      if (error) { showNotif('Error deleting', 'error'); return; }
      showNotif('Exercise deleted', 'success');
      loadExercises(currentSession.id);
    });
  });
}

async function addExercise(data) {
  const { error } = await db.from('exercises').insert({
    session_id: currentSession.id,
    teacher_id: currentProfile.id,
    ...data
  });
  if (error) { showNotif('Error saving practice', 'error'); logError(error, 'addExercise'); return; }
  showNotif('Exercise added ✓', 'success');
  closeModal('modal-add-exercise');
  openModal('modal-session-detail');
  loadExercises(currentSession.id);
}

async function openScoreExercise(exerciseId, title, maxScore) {
  currentExercise = { id: exerciseId, title, max_score: maxScore };
  document.getElementById('score-exercise-title').textContent = `Grade — ${title}`;

  // Load students of current teacher
  const { data: students, error: se } = await db
    .from('students')
    .select('id, name')
    .eq('teacher_id', currentProfile.id)
    .eq('status', 'active');

  if (se || !students) { showNotif('Error loading students', 'error'); return; }

  // Load existing scores
  const { data: scores } = await db
    .from('exercise_scores')
    .select('*')
    .eq('exercise_id', exerciseId);

  const scoreMap = {};
  (scores || []).forEach(s => { scoreMap[s.student_id] = s.score; });

  document.getElementById('score-exercise-students').innerHTML = students.map(s => `
    <div class="score-student-row">
      <span class="score-student-name">${s.name}</span>
      <input type="number" class="exercise-score-input" 
        data-student-id="${s.id}"
        value="${scoreMap[s.id] ?? ''}"
        min="0" max="${maxScore}"
        placeholder="/${maxScore}" />
    </div>`).join('');

  closeModal('modal-session-detail');
  openModal('modal-score-exercise');
}

async function saveExerciseScores() {
  const inputs = document.querySelectorAll('.exercise-score-input');
  const upserts = [];

  inputs.forEach(input => {
    const score = input.value === '' ? null : parseInt(input.value);
    upserts.push({
      exercise_id: currentExercise.id,
      student_id: input.dataset.studentId,
      teacher_id: currentProfile.id,
      score
    });
  });

  const { error } = await db.from('exercise_scores').upsert(upserts, {
    onConflict: 'exercise_id,student_id'
  });

  if (error) { showNotif('Error saving scores', 'error'); logError(error, 'saveExerciseScores'); return; }
  showNotif('Scores saved ✓', 'success');
  closeModal('modal-score-exercise');
  openModal('modal-session-detail');
  loadExercises(currentSession.id);
}


let currentExerciseForDetail = null;

async function openExerciseDetail(data) {
  currentExerciseForDetail = { id: data.exerciseId, sessionId: currentSession?.id };

  document.getElementById('exercise-detail-title').textContent = data.title || '—';
  document.getElementById('exercise-detail-category').textContent = data.category || '';
  document.getElementById('exercise-detail-score').textContent = `${data.max} pts`;
  document.getElementById('exercise-detail-desc').value = decodeURIComponent(data.desc || '');
  document.getElementById('exercise-detail-link').value = data.link || '';

  // Show/hide upload based on role
  const uploadWrap = document.getElementById('exercise-file-upload-wrap');
  const saveBtn = document.getElementById('btn-save-exercise-detail');
  if (uploadWrap) uploadWrap.style.display = currentProfile?.role === 'teacher' ? '' : 'none';
  if (saveBtn) saveBtn.style.display = currentProfile?.role === 'teacher' ? '' : 'none';
  const descEl = document.getElementById('exercise-detail-desc');
  if (descEl) descEl.readOnly = currentProfile?.role !== 'teacher';

  // Load files
  await loadExerciseFiles(data.exerciseId);

  closeModal('modal-session-detail');
  openModal('modal-exercise-detail');
}

async function loadExerciseFiles(exerciseId) {
  const listEl = document.getElementById('exercise-files-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const { data: files, error } = await db.storage
    .from('session-files')
    .list(`exercises/${exerciseId}`);

  if (error || !files?.length) return;

  const isTeacher = currentProfile?.role === 'teacher';

  listEl.innerHTML = '<div class="files-list">' + files.map(f => {
    const { data: urlData } = db.storage
      .from('session-files')
      .getPublicUrl(`exercises/${exerciseId}/${f.name}`);
    const url = urlData?.publicUrl || '#';
    const name = f.name.toLowerCase();

    if (name.match(/\.(mp3|m4a|aac)$/)) {
      return `<div class="file-item-player">
        <span class="file-label">🎵 ${f.name}</span>
        ${isTeacher ? `<button class="btn-delete-file btn-xs" data-path="exercises/${exerciseId}/${f.name}" data-eid="${exerciseId}">🗑</button>` : ''}
        <audio controls style="width:100%;margin-top:0.4rem"><source src="${url}" /></audio>
      </div>`;
    } else if (name.match(/\.(mp4|mov|webm)$/)) {
      return `<div class="file-item-player">
        <span class="file-label">🎬 ${f.name}</span>
        ${isTeacher ? `<button class="btn-delete-file btn-xs" data-path="exercises/${exerciseId}/${f.name}" data-eid="${exerciseId}">🗑</button>` : ''}
        <video controls style="width:100%;margin-top:0.4rem;border-radius:8px;max-height:200px"><source src="${url}" /></video>
      </div>`;
    } else {
      return `<div class="file-item">
        <a href="${url}" target="_blank" class="file-link">📄 ${f.name}</a>
        ${isTeacher ? `<button class="btn-delete-file btn-xs" data-path="exercises/${exerciseId}/${f.name}" data-eid="${exerciseId}">🗑</button>` : ''}
      </div>`;
    }
  }).join('') + '</div>';

  listEl.querySelectorAll('.btn-delete-file').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this file?')) return;
      await db.storage.from('session-files').remove([btn.dataset.path]);
      loadExerciseFiles(btn.dataset.eid);
    });
  });
}

async function saveExerciseDetail() {
  if (!currentExerciseForDetail) return;
  const desc = document.getElementById('exercise-detail-desc').value;
  const link = document.getElementById('exercise-detail-link').value || null;
  const { error } = await db.from('exercises').update({ description: desc, link }).eq('id', currentExerciseForDetail.id);
  if (error) { showNotif('Error saving', 'error'); return; }
  showNotif('Saved ✓', 'success');
  if (currentSession) loadExercises(currentSession.id);
}

async function uploadExerciseFile(file) {
  if (!currentExerciseForDetail) return;
  if (file.size > 50 * 1024 * 1024) { showNotif('File exceeds 50MB limit', 'error'); return; }
  const ext = file.name.split('.').pop();
  const path = `exercises/${currentExerciseForDetail.id}/${Date.now()}.${ext}`;
  showNotif('Uploading...', '');
  const { error } = await db.storage.from('session-files').upload(path, file);
  if (error) { showNotif('Upload error', 'error'); return; }
  showNotif('File uploaded ✓', 'success');
  loadExerciseFiles(currentExerciseForDetail.id);
  const inputEl = document.getElementById('exercise-file-upload');
  if (inputEl) inputEl.value = '';
}

// ════════════════════════════════
// TERMS (Student)
// ════════════════════════════════

async function loadStudentTerms() {
  const list = document.getElementById('student-terms-list');
  if (!list) return;

  // Get student record
  const { data: studentRec, error: se } = await db
    .from('students')
    .select('id')
    .eq('profile_id', currentUser.id)
    .single();

  if (se || !studentRec) {
    list.innerHTML = '<div class="empty-state">No terms defined yet</div>';
    return;
  }

  const { data: terms, error } = await db
    .from('terms')
    .select('*, term_months(*)')
    .eq('student_id', studentRec.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) { logError(error, 'loadStudentTerms'); return; }

  if (!terms.length) {
    list.innerHTML = '<div class="empty-state">No terms defined yet</div>';
    return;
  }

  const levelLabel = {
    moghadamati_1: 'Beginner 1', moghadamati_2: 'Beginner 2',
    motevaset_1: 'Intermediate 1', motevaset_2: 'Intermediate 2',
    pishrafte_1: 'Advanced 1', pishrafte_2: 'Advanced 2'
  };

  list.innerHTML = terms.map(t => {
    const unlockedMonths = (t.term_months || [])
      .filter(m => m.is_unlocked)
      .map(m => m.month_number);
    return `
      <div class="term-card" data-term-id="${t.id}" data-student-id="${studentRec.id}" style="cursor:pointer">
        <div class="term-header">
          <span class="term-title">${t.title}</span>
          <span class="term-level">${levelLabel[t.level] || t.level}</span>
        </div>
        <div class="term-unlocked-info">
          ${unlockedMonths.length ? 
            `<span class="unlocked-label">Unlocked Months: ${unlockedMonths.map(m => `Month ${m}`).join(', ')}</span>` :
            '<span class="locked-label">No months unlocked yet</span>'}
        </div>
      </div>`;
  }).join('');

  // Click on term → show sessions
  list.querySelectorAll('.term-card').forEach(card => {
    card.addEventListener('click', () => {
      const term = terms.find(t => t.id === card.dataset.termId);
      openStudentTermSessions(term, levelLabel);
    });
  });
}

async function openStudentTermSessions(term, levelLabel) {
  const unlockedMonths = (term.term_months || [])
    .filter(m => m.is_unlocked)
    .map(m => m.month_number);

  if (!unlockedMonths.length) {
    showNotif('No months unlocked by teacher yet', 'error');
    return;
  }

  const { data: sessions, error } = await db
    .from('sessions')
    .select('*')
    .eq('term_id', term.id)
    .in('month_number', unlockedMonths)
    .order('session_number', { ascending: true });

  if (error) { logError(error, 'openStudentTermSessions'); return; }

  const today = new Date().toISOString().split('T')[0];

  // Reuse modal-term-detail for student view (read-only)
  document.getElementById('term-detail-title').textContent = term.title;
  document.getElementById('term-detail-level').textContent = levelLabel[term.level] || term.level;
  document.getElementById('term-detail-start').textContent = term.start_date
    ? new Date(term.start_date).toLocaleDateString('en-GB') : '—';

  const sessionRows = (sessions || []).map(s => {
    const isPast = s.session_date && s.session_date < today;
    const isToday = s.session_date === today;
    const statusClass = isToday ? 'session-today' : isPast ? 'session-past' : 'session-future';
    const statusLabel = isToday ? '📍 Today' : isPast ? '✓' : '—';
    const hasContent = s.content_text ? '📝' : '';
    return `
      <div class="session-row ${statusClass}" data-session-id="${s.id}" data-content="${encodeURIComponent(s.content_text || '')}" data-date="${s.session_date || ''}" data-num="${s.session_number}" data-link="${s.link || ''}" style="cursor:pointer">
        <span class="session-num">Session ${s.session_number} ${hasContent}</span>
        <span class="session-date">${s.session_date ? new Date(s.session_date).toLocaleDateString('en-GB') : '—'}</span>
        <span class="session-status">${statusLabel}</span>
      </div>`;
  }).join('');

  document.getElementById('term-detail-sessions').innerHTML =
    sessionRows || '<div class="empty-state">No sessions in unlocked months</div>';

  // Click session → read-only view with exercises
  document.querySelectorAll('#term-detail-sessions .session-row[data-session-id]').forEach(row => {
    row.addEventListener('click', async () => {
      const content = decodeURIComponent(row.dataset.content);
      const date = row.dataset.date;
      const num = row.dataset.num;
      const sessionId = row.dataset.sessionId;

      document.getElementById('student-session-title').textContent = `Session ${num}`;
      document.getElementById('student-session-date').textContent =
        date ? new Date(date).toLocaleDateString('en-GB') : '—';

      // Content + link
      const linkMatch = row.dataset.link ? `<a href="${row.dataset.link}" target="_blank" class="exercise-link" style="display:block;margin-top:0.5rem">🔗 Session Resource</a>` : '';
      document.getElementById('student-session-content').innerHTML =
        `<p class="student-session-content">${content || 'No content recorded for this session'}</p>${linkMatch}`;

      // Load exercises + scores
      const exEl = document.getElementById('student-session-exercises');
      exEl.innerHTML = '<div class="empty-state" style="font-size:0.8rem">Loading exercises...</div>';
      openModal('modal-student-session');

      const { data: studentRec } = await db.from('students').select('id').eq('profile_id', currentUser.id).single();
      if (!studentRec) { exEl.innerHTML = ''; return; }

      const [exRes, scRes] = await Promise.all([
        db.from('exercises').select('id, title, max_score, skill_categories(name), description, link').eq('session_id', sessionId).order('created_at'),
        db.from('exercise_scores').select('exercise_id, score').eq('student_id', studentRec.id)
      ]);

      const exercises = exRes.data || [];
      const scoreMap = {};
      (scRes.data || []).forEach(s => { scoreMap[s.exercise_id] = s.score; });

      if (!exercises.length) { exEl.innerHTML = ''; return; }

      exEl.innerHTML = `
        <div class="section-divider"><span>Session Exercises</span></div>
        ${exercises.map(ex => {
          const score = scoreMap[ex.id];
          const hasScore = score !== null && score !== undefined;
          return `
            <div class="exercise-card" data-exercise-id="${ex.id}" data-title="${ex.title}" data-category="${ex.skill_categories?.name || ''}" data-max="${ex.max_score}" data-desc="${encodeURIComponent(ex.description || '')}" data-link="${ex.link || ''}" style="cursor:pointer">
              <div class="exercise-header">
                <span class="exercise-title">${ex.title}</span>
                <span class="exercise-score-badge ${hasScore ? 'scored' : ''}">
                  ${hasScore ? `${score} of ${ex.max_score}` : `${ex.max_score} pts`}
                </span>
              </div>
              ${ex.skill_categories ? `<span class="exercise-category">${ex.skill_categories.name}</span>` : ''}
              ${ex.description ? `<p class="exercise-desc">${ex.description}</p>` : ''}
              ${ex.link ? `<a href="${ex.link}" target="_blank" class="exercise-link">🔗 Exercise Resource</a>` : ''}
            </div>`;
        }).join('')}`;

      // Student click on exercise → view detail
      exEl.querySelectorAll('.exercise-card').forEach(card => {
        card.addEventListener('click', e => {
          if (e.target.closest('a')) return;
          openExerciseDetail(card.dataset);
        });
      });

      // Load session files for student
      await loadStudentSessionFiles(sessionId, exEl);
    });
  });

  openModal('modal-term-detail');
}

async function loadStudentSessionFiles(sessionId, container) {
  const { data: files, error } = await db.storage
    .from('session-files')
    .list(`sessions/${sessionId}`);

  if (error || !files?.length) return;

  const filesHtml = files.map(f => {
    const { data: urlData } = db.storage
      .from('session-files')
      .getPublicUrl(`sessions/${sessionId}/${f.name}`);
    const url = urlData?.publicUrl || '#';
    const name = f.name.toLowerCase();

    if (name.match(/\.(mp3|m4a|aac)$/)) {
      return `
        <div class="file-item-player">
          <span class="file-label">🎵 ${f.name}</span>
          <audio controls style="width:100%;margin-top:0.4rem">
            <source src="${url}" />
          </audio>
        </div>`;
    } else if (name.match(/\.(mp4|mov|webm)$/)) {
      return `
        <div class="file-item-player">
          <span class="file-label">🎬 ${f.name}</span>
          <video controls style="width:100%;margin-top:0.4rem;border-radius:8px;max-height:200px">
            <source src="${url}" />
          </video>
        </div>`;
    } else {
      // PDF or other — open in new tab
      return `<div class="file-item"><a href="${url}" target="_blank" class="file-link">📄 ${f.name}</a></div>`;
    }
  }).join('');

  container.insertAdjacentHTML('beforeend', `
    <div class="section-divider"><span>Session Files</span></div>
    <div class="files-list">${filesHtml}</div>`);
}


// ════════════════════════════════
// PRACTICE STREAK (Student)
// ════════════════════════════════

async function loadPracticeStreak() {
  const banner = document.getElementById('streak-banner');
  if (!banner) return;

  const { data: studentRec } = await db
    .from('students').select('id')
    .eq('profile_id', currentUser.id).single();
  if (!studentRec) return;

  const { data: logs } = await db
    .from('practice_logs')
    .select('created_at')
    .eq('student_id', studentRec.id)
    .order('created_at', { ascending: false })
    .limit(90);

  if (!logs?.length) { banner.classList.add('hidden'); return; }

  const practiced = new Set(
    logs.map(l => new Date(l.created_at).toLocaleDateString('en-CA'))
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString('en-CA');
    if (practiced.has(key)) streak++;
    else if (i > 0) break;
  }

  if (streak < 2) { banner.classList.add('hidden'); return; }

  banner.classList.remove('hidden');
  banner.innerHTML = `
    <div class="streak-inner">
      <span class="streak-flame">🔥</span>
      <div class="streak-text">
        <span class="streak-count">${streak}-day streak</span>
        <span class="streak-sub">Keep the momentum going!</span>
      </div>
    </div>`;
}

// ════════════════════════════════
// REPERTOIRE (Teacher)
// ════════════════════════════════

async function loadRepertoire(studentId) {
  const list = document.getElementById('repertoire-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state">Loading...</div>';

  const { data, error } = await db
    .from('repertoire')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) { logError(error, 'loadRepertoire'); return; }

  if (!data.length) {
    list.innerHTML = '<div class="empty-state">No pieces added yet</div>';
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="rep-card" data-rep-id="${r.id}">
      <div class="rep-card-header">
        <div class="rep-card-title-block">
          <span class="rep-title">${r.title}</span>
          ${r.composer ? `<span class="rep-composer">${r.composer}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span class="rep-status-badge rep-status--${r.status}">${repStatusLabel(r.status)}</span>
          <button class="btn-delete-rep btn-xs" data-rep-id="${r.id}" style="color:var(--danger);background:none;border:none;cursor:pointer;font-size:1rem;padding:2px" title="Delete">🗑</button>
        </div>
      </div>
      ${r.level ? `<span class="rep-level">${r.level}</span>` : ''}
      ${r.notes ? `<p class="rep-notes">${r.notes}</p>` : ''}
      ${r.started_at ? `<span class="rep-date">Started: ${r.started_at}</span>` : ''}
    </div>`).join('');

  list.querySelectorAll('.btn-delete-rep').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this piece?')) return;
      const { error } = await db.from('repertoire').delete().eq('id', btn.dataset.repId);
      if (error) { showNotif('Error deleting piece', 'error'); return; }
      showNotif('Piece deleted', 'success');
      loadRepertoire(studentId);
    });
  });
}

function repStatusLabel(status) {
  return { learning: '● Learning', mastered: '✓ Mastered', paused: '⏸ Paused' }[status] || status;
}

async function addRepertoire(studentId) {
  const title     = document.getElementById('rep-title').value.trim();
  const composer  = document.getElementById('rep-composer').value.trim();
  const level     = document.getElementById('rep-level').value;
  const status    = document.getElementById('rep-status').value;
  const startedAt = document.getElementById('rep-started-at').value || null;
  const notes     = document.getElementById('rep-notes').value.trim() || null;

  if (!title) { showNotif('Title is required', 'error'); return; }

  const { error } = await db.from('repertoire').insert({
    student_id: studentId,
    teacher_id: currentProfile.id,
    title, composer: composer || null,
    level: level || null,
    status, started_at: startedAt, notes
  });

  if (error) { showNotif('Error saving piece', 'error'); logError(error, 'addRepertoire'); return; }
  showNotif('Piece added ✓', 'success');
  closeModal('modal-add-repertoire');
  document.getElementById('form-add-repertoire').reset();
  loadRepertoire(studentId);
}

// ════════════════════════════════
// REPERTOIRE (Student view)
// ════════════════════════════════

async function loadStudentRepertoire() {
  const list = document.getElementById('student-repertoire-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state">Loading...</div>';

  const { data: studentRec } = await db
    .from('students').select('id')
    .eq('profile_id', currentUser.id).single();
  if (!studentRec) { list.innerHTML = '<div class="empty-state">No repertoire yet</div>'; return; }

  const { data, error } = await db
    .from('repertoire')
    .select('*')
    .eq('student_id', studentRec.id)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) { logError(error, 'loadStudentRepertoire'); return; }
  if (!data.length) { list.innerHTML = '<div class="empty-state">No pieces added yet</div>'; return; }

  const groups = { mastered: [], learning: [], paused: [] };
  data.forEach(r => { (groups[r.status] || groups.learning).push(r); });

  let html = '';
  [['mastered','Mastered'], ['learning','Learning'], ['paused','Paused']].forEach(([key, label]) => {
    if (!groups[key].length) return;
    html += `<div class="rep-group-label">${label} (${groups[key].length})</div>`;
    html += groups[key].map(r => `
      <div class="rep-card rep-card--student">
        <div class="rep-card-header">
          <div class="rep-card-title-block">
            <span class="rep-title">${r.title}</span>
            ${r.composer ? `<span class="rep-composer">${r.composer}</span>` : ''}
          </div>
          <span class="rep-status-badge rep-status--${r.status}">${repStatusLabel(r.status)}</span>
        </div>
        ${r.level ? `<span class="rep-level">${r.level}</span>` : ''}
        ${r.notes ? `<p class="rep-notes">${r.notes}</p>` : ''}
        ${r.started_at ? `<span class="rep-date">Started: ${r.started_at}</span>` : ''}
      </div>`).join('');
  });
  list.innerHTML = html;
}

// ════════════════════════════════
// HALFMETER — real scores
// ════════════════════════════════

async function loadStudentHalfMeters(students) {
  if (!students?.length) return;
  const studentIds = students.map(s => s.id);

  const { data: terms } = await db
    .from('terms').select('id, student_id')
    .in('student_id', studentIds).eq('status', 'active');
  if (!terms?.length) return;

  const { data: sessions } = await db
    .from('sessions').select('id, term_id')
    .in('term_id', terms.map(t => t.id))
    .not('session_date', 'is', null)
    .order('session_date', { ascending: false });
  if (!sessions?.length) return;

  // last session per student
  const lastSession = {};
  terms.forEach(t => {
    const s = sessions.find(se => se.term_id === t.id);
    if (s && !lastSession[t.student_id]) lastSession[t.student_id] = s.id;
  });

  const sessionIds = Object.values(lastSession);
  if (!sessionIds.length) return;

  const { data: exercises } = await db
    .from('exercises').select('id, session_id, max_score')
    .in('session_id', sessionIds);
  if (!exercises?.length) return;

  const { data: scores } = await db
    .from('exercise_scores').select('exercise_id, score, student_id')
    .in('exercise_id', exercises.map(e => e.id));

  students.forEach(st => {
    const sessId = lastSession[st.id];
    if (!sessId) return;
    const exs = exercises.filter(e => e.session_id === sessId);
    const scoreMap = {};
    (scores || []).filter(sc => sc.student_id === st.id)
      .forEach(sc => { scoreMap[sc.exercise_id] = sc.score; });
    let total = 0, max = 0;
    exs.forEach(ex => {
      if (scoreMap[ex.id] != null) { total += scoreMap[ex.id]; max += ex.max_score; }
    });
    if (!max) return;
    const pct = Math.round((total / max) * 100);
    const card = document.querySelector(`.student-card[data-id="${st.id}"] .student-card-meter`);
    if (card) card.innerHTML = halfMeterSVG(pct, `${pct}%`);
  });
}

// ════════════════════════════════
// EVENT LISTENERS
// ════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // Init theme + animations
  initPalette();
  initAnimations();

  // Check existing session
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    await afterAuth(session.user);
  }

  // ── Auth Tabs ──
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`form-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // ── Role Select (show/hide invite) ──
  document.querySelectorAll('input[name="role"]').forEach(r => {
    r.addEventListener('change', () => {
      const needInvite = r.value === 'student' || r.value === 'parent';
      document.getElementById('field-invite').style.display = needInvite ? 'block' : 'none';
    });
  });

  // ── Login ──
  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    await login(
      document.getElementById('login-email').value,
      document.getElementById('login-password').value
    );
  });

  // ── Register ──
  document.getElementById('form-register').addEventListener('submit', async e => {
    e.preventDefault();
    const role = document.querySelector('input[name="role"]:checked')?.value;
    if (!role) { showNotif('Please select your role', 'error'); return; }
    await register(
      document.getElementById('reg-name').value,
      document.getElementById('reg-email').value,
      document.getElementById('reg-password').value,
      role,
      document.getElementById('reg-invite').value
    );
  });

  // ── Logout ──
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-logout-student').addEventListener('click', logout);

  // ── Nav (Teacher) ──
  document.querySelectorAll('#screen-teacher .sidebar-nav-item').forEach(item => {
    item.addEventListener('click', () => showPanel(item.dataset.panel, item));
  });

  // ── Nav (Student) ──
  document.querySelectorAll('#screen-student .tab-bar-item').forEach(item => {
    item.addEventListener('click', () => showPanel(item.dataset.panel, item));
  });

  // ── Add Student Button ──
  document.getElementById('btn-add-student').addEventListener('click', () => openModal('modal-add-student'));

  // ── Modal Close ──
  document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
    el.addEventListener('click', () => {
      const modal = el.closest('.modal') || document.getElementById(el.dataset.modal);
      if (modal) {
        modal.classList.add('hidden');
        if (modal.id === 'modal-add-term') openModal('modal-student-profile');
        if (modal.id === 'modal-term-detail' && currentProfile?.role === 'teacher') openModal('modal-student-profile');
        if (modal.id === 'modal-session-detail') openModal('modal-term-detail');
        if (modal.id === 'modal-add-exercise') openModal('modal-session-detail');
        if (modal.id === 'modal-score-exercise') openModal('modal-session-detail');
        if (modal.id === 'modal-exercise-detail') openModal('modal-session-detail');
      }
    });
  });

  // ── Add Student Form ──
  document.getElementById('form-add-student').addEventListener('submit', async e => {
    e.preventDefault();
    await addStudent({
      name: document.getElementById('st-name').value,
      phone: document.getElementById('st-phone').value || null,
      age: parseInt(document.getElementById('st-age').value) || null,
      instrument: document.getElementById('st-instrument').value || null,
      level: document.getElementById('st-level').value || null,
      monthly_fee: parseInt(document.getElementById('st-fee').value) || null,
      class_type: document.getElementById('st-class-type').value,
      class_time: document.getElementById('st-time').value || null,
      notes: document.getElementById('st-notes').value || null
    });
  });

  // ── Score Student Select ──
  document.getElementById('score-student-select').addEventListener('change', e => {
    document.getElementById('score-form-wrap').style.display = e.target.value ? 'block' : 'none';
  });

  // ── Score Absent Toggle ──
  document.getElementById('score-absent').addEventListener('change', e => {
    document.getElementById('score-fields').style.display = e.target.checked ? 'none' : 'block';
  });

  // ── Score Average Live Calc ──
  ['score-technique', 'score-rhythm', 'score-melody', 'score-fretboard', 'score-ear'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateAvgDisplay);
  });

  // ── Save Score ──
  document.getElementById('btn-save-score').addEventListener('click', saveScore);

  // ── Messages (Teacher) ──
  document.getElementById('msg-to-select').addEventListener('change', async e => {
    if (e.target.value) await loadMessages(e.target.value);
  });

  document.getElementById('btn-send-msg').addEventListener('click', async () => {
    const toId = document.getElementById('msg-to-select').value;
    const body = document.getElementById('msg-body').value;
    if (!toId) { showNotif('Please select a student', 'error'); return; }
    await sendMessage(toId, body);
    document.getElementById('msg-body').value = '';
    await loadMessages(toId);
  });

  // ── Messages (Student) ──
  document.getElementById('btn-student-send-msg').addEventListener('click', async () => {
    const body = document.getElementById('student-msg-body').value;
    if (!currentProfile?.teacher_id) { showNotif('Teacher not found', 'error'); return; }
    await sendMessage(currentProfile.teacher_id, body, 'student-messages-list');
    document.getElementById('student-msg-body').value = '';
    await loadStudentMessages();
  });

  // ── Practice Timer ──
  document.getElementById('btn-timer-start').addEventListener('click', startTimer);
  document.getElementById('btn-timer-stop').addEventListener('click', stopTimer);

  // ── Copy Invite Code ──
  // ── Palette switcher ──
  document.querySelectorAll('.palette-swatch').forEach(sw => {
    sw.addEventListener('click', () => applyPalette(sw.dataset.palette));
  });

  // ── Animations toggle ──
  const animToggle = document.getElementById('toggle-animations');
  if (animToggle) {
    animToggle.addEventListener('change', () => setAnimations(animToggle.checked));
  }

  // ── Sidebar mobile open/close ──
  const btnSidebarOpen  = document.getElementById('sidebar-open');
  const btnSidebarClose = document.getElementById('sidebar-close');
  const sidebarOverlay  = document.getElementById('sidebar-overlay');
  if (btnSidebarOpen)  btnSidebarOpen.addEventListener('click', openSidebar);
  if (btnSidebarClose) btnSidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay)  sidebarOverlay.addEventListener('click', closeSidebar);

  // Close sidebar when a nav item is tapped on mobile
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 680) closeSidebar();
    });
  });

  document.getElementById('btn-copy-invite').addEventListener('click', () => {
    const code = currentProfile?.invite_code;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => showNotif('Code copied ✓', 'success'));
  });

  // ── File Upload ──
  document.addEventListener('change', e => {
    if (e.target.id === 'session-file-upload' && e.target.files[0]) uploadSessionFile(e.target.files[0]);
    if (e.target.id === 'exercise-file-upload' && e.target.files[0]) uploadExerciseFile(e.target.files[0]);
  });

  // ── Exercise Detail Save ──
  document.addEventListener('click', e => {
    if (e.target.id === 'btn-save-exercise-detail') saveExerciseDetail();
  });

  // ── Apply Karname Button ──
  document.addEventListener('click', e => {
    if (e.target.id === 'btn-apply-karname') applyTeacherKarname();
  });

  // ── Session Detail + Exercise Buttons (delegated) ──
  document.addEventListener('click', e => {
    if (e.target.id === 'btn-save-session-date') saveSessionDate();
    if (e.target.id === 'btn-save-session-content') saveSessionContent();
    if (e.target.id === 'btn-add-exercise') {
      document.getElementById('form-add-exercise').reset();
      loadSkillCategories();
      closeModal('modal-session-detail');
      openModal('modal-add-exercise');
    }
    if (e.target.id === 'btn-save-exercise-scores') saveExerciseScores();
  });

  // ── Add Exercise Form ──
  const formAddExercise = document.getElementById('form-add-exercise');
  if (formAddExercise) formAddExercise.addEventListener('submit', async e => {
    e.preventDefault();
    await addExercise({
      title: document.getElementById('exercise-title').value,
      category_id: document.getElementById('exercise-category').value || null,
      max_score: parseInt(document.getElementById('exercise-max-score').value) || 20,
      description: document.getElementById('exercise-description').value || null,
      link: document.getElementById('exercise-link').value || null
    });
  });

  // Fix: modal-add-exercise close → back to session detail


  // ── Student Profile Modal Tabs ──
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => switchProfileTab(tab.dataset.tab));
  });

  // ── Add Term Button ──
  // ── Add Term Button (delegated) ──
  document.addEventListener("click", e => {
    if (e.target.id === "btn-add-term" || e.target.closest("#btn-add-term")) {
      document.getElementById("form-add-term").reset();
      document.getElementById("term-sessions-preview").classList.add("hidden");
      openModal("modal-add-term");
    }
  });

  // ── Add Repertoire Button (delegated) ──
  document.addEventListener("click", e => {
    if (e.target.id === "btn-add-repertoire" || e.target.closest("#btn-add-repertoire")) {
      document.getElementById("form-add-repertoire").reset();
      openModal("modal-add-repertoire");
    }
  });

  // ── Repertoire form submit ──
  document.getElementById('form-add-repertoire').addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentStudentForTerm) return;
    await addRepertoire(currentStudentForTerm.id);
  });







  // ── Preview sessions when date/days change ──
  function updatePreview() {
    const startDate = document.getElementById('term-start-date').value;
    const classDays = [...document.querySelectorAll('input[name="class-day"]:checked')].map(c => c.value);
    if (!startDate || !classDays.length) { document.getElementById('term-sessions-preview').classList.add('hidden'); return; }
    const dates = calcSessionDates(startDate, classDays);
    if (!dates.length) return;
    document.getElementById('term-sessions-preview').classList.remove('hidden');
    document.getElementById('preview-list').innerHTML = dates.map((d, i) =>
      `<div class="preview-session">Session ${i + 1} — ${d.toLocaleDateString('en-GB')}</div>`
    ).join('');
  }

  document.getElementById('term-start-date').addEventListener('change', updatePreview);
  document.querySelectorAll('input[name="class-day"]').forEach(cb => cb.addEventListener('change', updatePreview));

  // ── Add Term Form ──
  const formAddTerm = document.getElementById('form-add-term');
  if (formAddTerm) formAddTerm.addEventListener('submit', async e => {
    e.preventDefault();
    await addTerm();
  });


  document.getElementById('btn-add-lesson').addEventListener('click', () => openModal('modal-add-lesson'));

  document.getElementById('form-add-lesson').addEventListener('submit', async e => {
    e.preventDefault();
    await addLesson({
      title: document.getElementById('lesson-title').value,
      level: document.getElementById('lesson-level').value || null,
      session_number: parseInt(document.getElementById('lesson-session').value) || null,
      content: document.getElementById('lesson-content').value || null,
      link: document.getElementById('lesson-link').value || null
    });
  });

});

// ════════════════════════════════════════════════════════
// METRONOME
// ════════════════════════════════════════════════════════
function initMetronome(prefix) {

  // ── State ──
  let bpm = 80;
  let ts = '2/4';
  let mode = 'zarb';      // 'zarb' | 'both' | 'zad'
  let activeTheme = 'pendulum';
  let audioCtx = null;
  let playing = false;
  let nextBeatTime = 0;
  let schedulerTimer = null;
  let currentStep = 0;
  let currentBeatDisplay = 0;
  let accentState = [];
  let tapTimes = [];
  let tReference = 0;

  // ── Conducting state ──
  const conductingState = { currentBeat: 0, beatStartTime: 0 };
  let conductingRAF = null;
  let pendulumRAF = null;

  // ── DOM ──
  const bpmVal  = document.getElementById(prefix+'metro-bpm-val');
  const slider  = document.getElementById(prefix+'metro-slider');
  const playBtn = document.getElementById(prefix+'metro-play');
  const tapBtn  = document.getElementById(prefix+'metro-tap');
  const stage   = document.getElementById(prefix+'metro-stage');
  if (!bpmVal) return;

  // ── Audio ──
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  const PROFILES = {
    'A':   { freq:1700, cutoff:null, gain:1.0,  decay:0.04 },
    "A'":  { freq:1700, cutoff:800,  gain:1.0,  decay:0.04 },
    "A''": { freq:1700, cutoff:1400, gain:1.0,  decay:0.04 },
    'B':   { freq:1700, cutoff:2500, gain:1.0,  decay:0.04 },
    'C':   { freq:1700, cutoff:4500, gain:1.0,  decay:0.04 },
    'D':   { freq:1700, cutoff:6000, gain:1.0,  decay:0.04 },
    'E':   { freq:1700, cutoff:9000, gain:1.0,  decay:0.04 },
    'Z':   { freq:800,  cutoff:400,  gain:0.15, decay:0.03 },
  };

  const ACCENT_LABELS = ['A', "A'", "A''"];
  const NON_ACCENT_LABELS = ['B', 'C', 'D', 'E'];

  const SCHEDULES = {
    '2/4': ['A','B'],
    '3/4': ['A','B','C'],
    '4/4': ['A','B','C','D'],
    '6/8': ['A','B','C',"A'",'D','E'],
  };

  function getFullCycle() { return 60 / bpm; }
  function getHalfCycle() { return 30 / bpm; }
  function getOmega()     { return Math.PI * bpm / 30; }
  function getThetaMax()  { return (45 - (bpm - 40) * (20 / 168)) * Math.PI / 180; }

  function playNote(time, label) {
    const isZ = label === 'Z';
    if (mode === 'zarb' && isZ) return;
    if (mode === 'zad' && !isZ) return;
    const p = PROFILES[label] || PROFILES['E'];
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = p.freq;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(p.gain, time + 0.001);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + p.decay);
    if (p.cutoff) {
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = p.cutoff;
      hpf.Q.value = 0.5;
      osc.connect(hpf);
      hpf.connect(gainNode);
    } else {
      osc.connect(gainNode);
    }
    gainNode.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + p.decay + 0.02);
  }

  // ── Accent System ──
  function initAccentState() {
    const beats = SCHEDULES[ts];
    accentState = beats.map((_, i) => i === 0);
  }

  function computeLabels() {
    let aRank = 0, bRank = 0;
    return accentState.map(isAccent => {
      if (isAccent) return ACCENT_LABELS[Math.min(aRank++, ACCENT_LABELS.length - 1)];
      else return NON_ACCENT_LABELS[Math.min(bRank++, NON_ACCENT_LABELS.length - 1)];
    });
  }

  function buildAccentGrid() {
    const grid = document.getElementById(prefix+'metro-accent-grid');
    if (!grid) return;
    grid.innerHTML = '';
    accentState.forEach((isOn, i) => {
      const cell = document.createElement('div');
      cell.className = 'metro-accent-cell' + (isOn ? ' on' : '');
      cell.addEventListener('click', () => {
        const onCount = accentState.filter(Boolean).length;
        if (isOn && onCount <= 1) return;
        accentState[i] = !accentState[i];
        buildAccentGrid();
        currentStep = 0;
      });
      grid.appendChild(cell);
    });
  }

  // ── Scheduler ──
  function scheduler() {
    if (!playing) return;
    const ctx = getAudioCtx();
    const full = getFullCycle();
    const half = getHalfCycle();
    const beatSteps = computeLabels();
    const len = beatSteps.length;

    while (nextBeatTime < ctx.currentTime + 0.1) {
      const beatIdx = currentStep % len;
      playNote(nextBeatTime, beatSteps[beatIdx]);
      playNote(nextBeatTime + half, 'Z');
      const t = nextBeatTime;
      const bi = beatIdx;
      const delay = (t - ctx.currentTime) * 1000;
      setTimeout(() => {
        currentBeatDisplay = bi + 1;
        conductingState.currentBeat = bi;
        conductingState.beatStartTime = performance.now() - (ctx.currentTime - t) * 1000;
      }, Math.max(0, delay));
      currentStep = (currentStep + 1) % len;
      nextBeatTime += full;
    }
  }

  // ── BPM ──
  function setBpm(val) {
    bpm = Math.min(208, Math.max(40, val));
    if (bpmVal) bpmVal.textContent = bpm;
    if (slider) slider.value = bpm;
    if (playing) {
      const ctx = getAudioCtx();
      tReference = ctx.currentTime;
      nextBeatTime = tReference + getHalfCycle();
      currentStep = 0;
    }
  }

  // ── Tap Tempo ──
  function tapTempo() {
    const now = Date.now();
    tapTimes.push(now);
    if (tapTimes.length > 4) tapTimes.shift();
    if (tapTimes.length >= 2) {
      const gaps = [];
      for (let i = 1; i < tapTimes.length; i++) gaps.push(tapTimes[i] - tapTimes[i-1]);
      const avg = gaps.reduce((a,b)=>a+b,0)/gaps.length;
      setBpm(Math.round(60000/avg));
    }
  }

  // ── Start / Stop ──
  function start() {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;
    currentStep = 0;
    currentBeatDisplay = 0;
    conductingState.currentBeat = 0;
    conductingState.beatStartTime = performance.now();
    tReference = ctx.currentTime;
    nextBeatTime = tReference + getHalfCycle();
    schedulerTimer = setInterval(scheduler, 25);
    if (playBtn) { playBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="3" y="2" width="4" height="12" fill="currentColor"/><rect x="9" y="2" width="4" height="12" fill="currentColor"/></svg> Stop'; playBtn.classList.add('playing'); }
    renderStage();
  }

  function stop() {
    playing = false;
    clearInterval(schedulerTimer);
    currentStep = 0;
    currentBeatDisplay = 0;
    conductingState.currentBeat = 0;
    if (pendulumRAF) { cancelAnimationFrame(pendulumRAF); pendulumRAF = null; }
    if (conductingRAF) { cancelAnimationFrame(conductingRAF); conductingRAF = null; }
    if (playBtn) { playBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M4 3l10 5-10 5V3z" fill="currentColor"/></svg> Start'; playBtn.classList.remove('playing'); }
    renderStage();
  }

  // ════════════════════════════
  // PENDULUM
  // ════════════════════════════
  function renderPendulum() {
    stage.innerHTML = '<canvas id="metro-cv-pendulum" style="width:100%;height:100%;display:block;"></canvas>';
    const cv = document.getElementById('metro-cv-pendulum');
    const dpr = window.devicePixelRatio || 1;
    const W = stage.offsetWidth * dpr;
    const H = stage.offsetHeight * dpr;
    cv.width = W;
    cv.height = H;

    function drawPendulumFrame() {
      if (activeTheme !== 'pendulum') return;
      const c = cv.getContext('2d');
      c.setTransform(1,0,0,1,0,0);
      c.clearRect(0,0,W,H);

      const pivotX = W/2, pivotY = H*0.08;
      const rodLen = H*0.78;
      const bobR = Math.max(10*dpr, W*0.038);
      const thetaMax = getThetaMax();

      let theta;
      if (!playing) {
        theta = -thetaMax;
      } else {
        const ctx = getAudioCtx();
        const elapsed = ctx.currentTime - tReference;
        theta = thetaMax * Math.cos(getOmega() * elapsed + Math.PI);
      }

      const bobX = pivotX + rodLen*Math.sin(theta);
      const bobY = pivotY + rodLen*Math.cos(theta);

      c.save();
      c.scale(dpr, dpr);

      c.strokeStyle = 'rgba(201,168,76,0.3)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(pivotX/dpr, pivotY/dpr);
      c.lineTo(bobX/dpr, bobY/dpr);
      c.stroke();

      c.fillStyle = 'rgba(201,168,76,0.5)';
      c.beginPath();
      c.arc(pivotX/dpr, pivotY/dpr, 4, 0, Math.PI*2);
      c.fill();

      c.fillStyle = '#c9a84c';
      c.shadowColor = 'rgba(201,168,76,0.5)';
      c.shadowBlur = playing ? 12 : 0;
      c.beginPath();
      c.arc(bobX/dpr, bobY/dpr, bobR/dpr, 0, Math.PI*2);
      c.fill();
      c.shadowBlur = 0;

      if (playing) {
        c.fillStyle = 'rgba(201,168,76,0.15)';
        c.font = `${Math.round(H*0.18/dpr)}px monospace`;
        c.textAlign = 'right';
        c.textBaseline = 'middle';
        c.fillText(currentBeatDisplay, W*0.92/dpr, H*0.85/dpr);
      }

      c.restore();
      pendulumRAF = requestAnimationFrame(drawPendulumFrame);
    }

    if (pendulumRAF) cancelAnimationFrame(pendulumRAF);
    pendulumRAF = requestAnimationFrame(drawPendulumFrame);
  }

  // ════════════════════════════
  // CONDUCTING
  // ════════════════════════════
  const CW = 300, CH = 180;

  function getConductingPoints() {
    const cx  = CW*0.5, top = CH*0.10, bot = CH*0.88;
    const mid = CH*0.52, lft = CW*0.22, rgt = CW*0.78;
    const beats = {
      '2/4': [{x:cx,y:bot},{x:cx,y:top}],
      '3/4': [{x:cx,y:bot},{x:lft,y:mid},{x:cx,y:top}],
      '4/4': [{x:cx,y:bot},{x:lft,y:mid},{x:rgt,y:mid},{x:cx,y:top}],
      '6/8': [
        {x:cx,        y:bot      },
        {x:cx-CW*0.15,y:bot*0.88 },
        {x:lft,       y:bot*0.80 },
        {x:cx+CW*0.05,y:bot*0.88 },
        {x:rgt,       y:bot*0.80 },
        {x:cx,        y:top      },
      ],
    };
    return beats[ts] || beats['4/4'];
  }

  function getConductingCP(p0, p1, pts, segIdx) {
    const cpMap = {
      '2/4': [[{x:p0.x-55,y:p0.y+28},{x:p1.x-45,y:p1.y+75}]],
      '3/4': [
        [{x:p0.x-45,y:p0.y+18},{x:p1.x-18,y:p1.y+55}],
        [{x:p0.x+8, y:p0.y-35},{x:p1.x-35,y:p1.y+55}],
      ],
      '4/4': [
        [{x:p0.x-55,y:p0.y+8 },{x:p1.x+8, y:p1.y+60}],
        [{x:p0.x+25,y:p0.y+25},{x:p1.x-25,y:p1.y+25}],
        [{x:p0.x+8, y:p0.y-25},{x:p1.x+45,y:p1.y+55}],
      ],
      '6/8': [
        [{x:p0.x-30,y:p0.y+10},{x:p1.x+10,y:p1.y+30}],
        [{x:p0.x-20,y:p0.y+10},{x:p1.x+10,y:p1.y+20}],
        [{x:p0.x+20,y:p0.y-10},{x:p1.x-10,y:p1.y+20}],
        [{x:p0.x-10,y:p0.y+10},{x:p1.x+10,y:p1.y+20}],
        [{x:p0.x+10,y:p0.y-25},{x:p1.x+35,y:p1.y+50}],
      ],
    };
    const m = cpMap[ts];
    if (m && m[segIdx]) return m[segIdx];
    return [{x:p0.x-40,y:p0.y+20},{x:p1.x-20,y:p1.y+50}];
  }

  function cubicBezierPt(t,p0,cp1,cp2,p1) {
    const u=1-t;
    return {
      x:u*u*u*p0.x+3*u*u*t*cp1.x+3*u*t*t*cp2.x+t*t*t*p1.x,
      y:u*u*u*p0.y+3*u*u*t*cp1.y+3*u*t*t*cp2.y+t*t*t*p1.y,
    };
  }

  function easeBaton(t) { return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2.5; }
  function reboundOffset(t) { return t<0.12?-Math.sin(t/0.12*Math.PI)*0.04:0; }

  function drawConductingScene(cv, beatIdx, tInBeat) {
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = cv.width, H = cv.height;
    const Wd = W/dpr, Hd = H/dpr;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.scale(dpr,dpr);

    const pts = getConductingPoints();
    const n = pts.length;
    const sx = Wd/CW, sy = Hd/CH;
    const spts = pts.map(p=>({x:p.x*sx,y:p.y*sy}));
    function scp(cp){return{x:cp.x*sx,y:cp.y*sy};}

    // Ghost path
    ctx.strokeStyle='rgba(201,168,76,0.08)';
    ctx.lineWidth=1.2;
    ctx.setLineDash([3,6]);
    for(let i=0;i<n;i++){
      const [c1,c2]=getConductingCP(pts[i],pts[(i+1)%n],pts,i);
      ctx.beginPath();
      ctx.moveTo(spts[i].x,spts[i].y);
      ctx.bezierCurveTo(scp(c1).x,scp(c1).y,scp(c2).x,scp(c2).y,spts[(i+1)%n].x,spts[(i+1)%n].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Beat labels
    ctx.font='300 10px monospace';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    for(let i=0;i<n;i++){
      const isActive=i===beatIdx;
      ctx.fillStyle=isActive?'rgba(201,168,76,0.9)':'rgba(120,110,150,0.6)';
      const ox=i===0?0:(i%2===0?14:-14);
      const oy=i===0?14:(i===n-1?-14:0);
      ctx.fillText(i+1,spts[i].x+ox,spts[i].y+oy);
    }

    // Keypoint dots
    for(let i=0;i<n;i++){
      const isActive=i===beatIdx;
      ctx.beginPath();
      ctx.arc(spts[i].x,spts[i].y,isActive?5:3,0,Math.PI*2);
      ctx.fillStyle=isActive?'#c9a84c':'rgba(80,70,110,0.8)';
      if(isActive){ctx.shadowColor='#c9a84c';ctx.shadowBlur=14;}
      ctx.fill();
      ctx.shadowBlur=0;
    }

    // Moving baton
    const segIdx=beatIdx%n;
    const [c1r,c2r]=getConductingCP(pts[segIdx],pts[(segIdx+1)%n],pts,segIdx);
    const p0s=spts[segIdx],p1s=spts[(segIdx+1)%n];
    const c1s=scp(c1r),c2s=scp(c2r);
    const easedT=easeBaton(tInBeat);
    const rb=reboundOffset(tInBeat);
    const finalT=Math.max(0,Math.min(1,easedT+rb));
    const pos=cubicBezierPt(finalT,p0s,c1s,c2s,p1s);

    // Trail
    const TRAIL=18;
    for(let s=TRAIL;s>0;s--){
      const tt=Math.max(0,finalT-s*0.025);
      const tp=cubicBezierPt(tt,p0s,c1s,c2s,p1s);
      const alpha=(1-s/TRAIL)*0.22;
      ctx.beginPath();
      ctx.arc(tp.x,tp.y,2,0,Math.PI*2);
      ctx.fillStyle=`rgba(201,168,76,${alpha.toFixed(2)})`;
      ctx.fill();
    }

    // Dot
    ctx.beginPath();
    ctx.arc(pos.x,pos.y,7,0,Math.PI*2);
    ctx.fillStyle='#c9a84c';
    ctx.shadowColor='rgba(201,168,76,0.7)';
    ctx.shadowBlur=14;
    ctx.fill();
    ctx.shadowBlur=0;

    // Flash
    if(tInBeat<0.08){
      const fa=(1-tInBeat/0.08)*0.14;
      ctx.beginPath();
      ctx.arc(spts[segIdx].x,spts[segIdx].y,35,0,Math.PI*2);
      const fg=ctx.createRadialGradient(spts[segIdx].x,spts[segIdx].y,0,spts[segIdx].x,spts[segIdx].y,35);
      fg.addColorStop(0,`rgba(201,168,76,${fa.toFixed(3)})`);
      fg.addColorStop(1,'transparent');
      ctx.fillStyle=fg;
      ctx.fill();
    }

    ctx.restore();
  }

  function renderConducting() {
    stage.innerHTML='<canvas id="metro-cv-conducting" style="width:100%;height:100%;display:block;"></canvas>';
    const cv=document.getElementById('metro-cv-conducting');
    const dpr=window.devicePixelRatio||1;
    cv.width=stage.offsetWidth*dpr;
    cv.height=stage.offsetHeight*dpr;

    function conductLoop(timestamp) {
      if(activeTheme!=='conducting'){conductingRAF=null;return;}
      const beatDuration=60000/bpm;
      const n=getConductingPoints().length;
      if(!playing){
        drawConductingScene(cv,0,0);
      } else {
        const elapsed=timestamp-conductingState.beatStartTime;
        const tInBeat=Math.min(elapsed/beatDuration,1);
        drawConductingScene(cv,conductingState.currentBeat%n,tInBeat);
      }
      conductingRAF=requestAnimationFrame(conductLoop);
    }

    if(conductingRAF) cancelAnimationFrame(conductingRAF);
    conductingRAF=requestAnimationFrame(conductLoop);
  }

  // ── Render Stage ──
  function renderStage() {
    if(pendulumRAF){cancelAnimationFrame(pendulumRAF);pendulumRAF=null;}
    if(conductingRAF){cancelAnimationFrame(conductingRAF);conductingRAF=null;}
    if(activeTheme==='pendulum') renderPendulum();
    else if(activeTheme==='conducting') renderConducting();
  }

  // ── Event Listeners ──
  document.getElementById(prefix+'metro-bpm-minus')?.addEventListener('click',()=>setBpm(bpm-1));
  document.getElementById(prefix+'metro-bpm-plus')?.addEventListener('click', ()=>setBpm(bpm+1));
  slider?.addEventListener('input', e=>setBpm(Number(e.target.value)));
  playBtn?.addEventListener('click', ()=>playing?stop():start());
  tapBtn?.addEventListener('click', tapTempo);

  const sigContainer = document.getElementById(prefix+'metro-sig-grid');
  if (sigContainer) sigContainer.querySelectorAll('.metro-sig-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      sigContainer.querySelectorAll('.metro-sig-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      ts=btn.dataset.sig;
      currentStep=0;
      conductingState.currentBeat=0;
      initAccentState();
      buildAccentGrid();
      if(playing){stop();start();}
      else renderStage();
    });
  });

  document.getElementById(prefix+'metro-mode-zarb')?.addEventListener('click',()=>{
    mode='zarb';
    document.querySelectorAll('.metro-mode-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(prefix+'metro-mode-zarb').classList.add('active');
  });
  document.getElementById(prefix+'metro-mode-both')?.addEventListener('click',()=>{
    mode='both';
    document.querySelectorAll('.metro-mode-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(prefix+'metro-mode-both').classList.add('active');
  });
  document.getElementById(prefix+'metro-mode-zad')?.addEventListener('click',()=>{
    mode='zad';
    document.querySelectorAll('.metro-mode-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(prefix+'metro-mode-zad').classList.add('active');
  });

  const themePanel = prefix === '' ?
    document.querySelector('#panel-metronome .metro-theme-row') :
    document.querySelector('#panel-student-metronome .metro-theme-row');
  themePanel?.querySelectorAll('.metro-theme-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      themePanel.querySelectorAll('.metro-theme-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeTheme=btn.dataset.theme;
      renderStage();
    });
  });

  // ── Init ──
  initAccentState();
  buildAccentGrid();
  renderStage();
}

// Init both metronome instances
initMetronome('');       // Teacher
initMetronome('s-');    // Student
