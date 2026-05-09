/* ═══════════════════════════════════════════════════════
   AADAM MUSIC ACADEMY — app.js
   Vanilla JS + Supabase | RTL فارسی
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

  const navItems = navEl.closest('nav').querySelectorAll('.nav-item');
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
  if (status === 'paid') return { text: 'پرداخت شده', cls: 'paid' };
  if (status === 'overdue') return { text: 'معوق', cls: 'overdue' };
  return { text: 'در انتظار', cls: '' };
}

// ════════════════════════════════
// AUTH
// ════════════════════════════════

async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) { showNotif('ایمیل یا رمز اشتباه است', 'error'); logError(error, 'login'); return; }
  await afterAuth(data.user);
}

async function register(name, email, password, role, inviteCode) {
  // Validate invite code for student/parent
  let teacherProfile = null;
  if (role === 'student' || role === 'parent') {
    if (!inviteCode) { showNotif('کد دعوت الزامی است', 'error'); return; }
    const { data: tp, error: te } = await db
      .from('profiles')
      .select('id, name')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();
    if (te || !tp) { showNotif('کد دعوت نامعتبر است', 'error'); return; }
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
  if (pe) { showNotif('خطا در ذخیره پروفایل', 'error'); logError(pe, 'register-profile'); return; }

  // Auto-add to students table
  if (role === 'student' && teacherProfile) {
    await db.from('students').insert({
      teacher_id: teacherProfile.id,
      profile_id: data.user.id,
      name: name,
      status: 'active'
    });
  }

  showNotif('ثبت‌نام موفق!', 'success');
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
    showNotif('خطا در بارگذاری پروفایل', 'error');
    logError(error, 'afterAuth');
    return;
  }
  currentProfile = profile;

  if (profile.role === 'teacher') {
    document.getElementById('teacher-name-display').textContent = profile.name;
    document.getElementById('invite-code-display').textContent = profile.invite_code || '—';
    showScreen('screen-teacher');
    loadStudents();
    loadLessons();
  } else {
    document.getElementById('student-name-display').textContent = profile.name;
    showScreen('screen-student');
    loadMyScores();
    loadStudentMessages();
  }
}

// ════════════════════════════════
// STUDENTS (Teacher)
// ════════════════════════════════

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
    list.innerHTML = '<div class="empty-state">هنوز هنرجویی اضافه نشده</div>';
    return;
  }

  list.innerHTML = students.map(s => {
    const badge = paymentLabel(s.payment_status);
    return `
      <div class="student-card" data-id="${s.id}" data-name="${s.name}" style="cursor:pointer">
        <div class="student-info">
          <span class="student-name">${s.name}</span>
          <span class="student-meta">${s.instrument || '—'} · ${s.class_time || '—'}</span>
        </div>
        <span class="student-badge ${badge.cls}">${badge.text}</span>
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
}

function populateStudentSelects(students) {
  const scoreSelect = document.getElementById('score-student-select');
  const msgSelect = document.getElementById('msg-to-select');
  const opts = students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  scoreSelect.innerHTML = '<option value="">— انتخاب کنید —</option>' + opts;
  msgSelect.innerHTML = '<option value="">— انتخاب هنرجو —</option>' + opts;
}

async function addStudent(data) {
  const { error } = await db.from('students').insert({
    teacher_id: currentProfile.id,
    ...data
  });
  if (error) { showNotif('خطا در ذخیره هنرجو', 'error'); logError(error, 'addStudent'); return; }
  showNotif('هنرجو اضافه شد ✓', 'success');
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
    list.innerHTML = '<div class="empty-state">هنوز درسی اضافه نشده</div>';
    return;
  }

  list.innerHTML = lessons.map(l => `
    <div class="student-card">
      <div class="student-info">
        <span class="student-name">${l.title}</span>
        <span class="student-meta">${l.level || '—'} · جلسه ${l.session_number || '—'}</span>
      </div>
    </div>`).join('');
}

async function addLesson(data) {
  const { error } = await db.from('lessons').insert({
    teacher_id: currentProfile.id,
    ...data
  });
  if (error) { showNotif('خطا در ذخیره درس', 'error'); logError(error, 'addLesson'); return; }
  showNotif('درس اضافه شد ✓', 'success');
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
      <div class="info-row"><span class="info-label">ساز</span><span>${student.instrument || '—'}</span></div>
      <div class="info-row"><span class="info-label">سطح</span><span>${student.level || '—'}</span></div>
      <div class="info-row"><span class="info-label">ساعت کلاس</span><span>${student.class_time || '—'}</span></div>
      <div class="info-row"><span class="info-label">شهریه</span><span>${student.monthly_fee ? student.monthly_fee.toLocaleString('fa') + ' تومان' : '—'}</span></div>
      <div class="info-row"><span class="info-label">نوع کلاس</span><span>${student.class_type === 'online' ? 'آنلاین' : 'حضوری'}</span></div>
    </div>`;

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
}

async function loadTerms(studentId) {
  const list = document.getElementById('terms-list');
  list.innerHTML = '<div class="empty-state">در حال بارگذاری...</div>';

  const { data: terms, error } = await db
    .from('terms')
    .select('*, term_months(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) { logError(error, 'loadTerms'); return; }

  if (!terms.length) {
    list.innerHTML = '<div class="empty-state">هنوز ترمی تعریف نشده</div>';
    return;
  }

  const levelLabel = {
    moghadamati_1: 'مقدماتی ۱', moghadamati_2: 'مقدماتی ۲',
    motevaset_1: 'متوسط ۱', motevaset_2: 'متوسط ۲',
    pishrafte_1: 'پیشرفته ۱', pishrafte_2: 'پیشرفته ۲'
  };

  list.innerHTML = terms.map(t => {
    const months = (t.term_months || []).sort((a, b) => a.month_number - b.month_number);
    return `
      <div class="term-card" data-term-id="${t.id}">
        <div class="term-header">
          <span class="term-title">${t.title}</span>
          <span class="term-level">${levelLabel[t.level] || t.level}</span>
        </div>
        <div class="term-months">
          ${months.map(m => `
            <div class="month-row">
              <span class="month-label">ماه ${m.month_number}</span>
              <label class="toggle-label">
                <input type="checkbox" class="month-unlock-toggle"
                  data-month-id="${m.id}"
                  ${m.is_unlocked ? 'checked' : ''} />
                <span class="toggle-track"></span>
                <span>${m.is_unlocked ? 'باز' : 'قفل'}</span>
              </label>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');

  // Toggle month lock
  list.querySelectorAll('.month-unlock-toggle').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const monthId = toggle.dataset.monthId;
      const isUnlocked = toggle.checked;
      const { error } = await db.from('term_months').update({
        is_unlocked: isUnlocked,
        unlocked_at: isUnlocked ? new Date().toISOString() : null
      }).eq('id', monthId);
      if (error) { showNotif('خطا در تغییر دسترسی', 'error'); logError(error, 'toggleMonth'); toggle.checked = !isUnlocked; return; }
      toggle.nextElementSibling.nextElementSibling.textContent = isUnlocked ? 'باز' : 'قفل';
      showNotif(isUnlocked ? 'ماه باز شد ✓' : 'ماه قفل شد', 'success');
    });
  });
}

// Calculate 12 session dates from start date + class days
function calcSessionDates(startDateStr, classDays) {
  const dayMap = { 'شنبه': 6, 'یکشنبه': 0, 'دوشنبه': 1, 'سه‌شنبه': 2, 'چهارشنبه': 3, 'پنجشنبه': 4 };
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
    showNotif('همه فیلدهای ستاره‌دار الزامی است', 'error'); return;
  }

  const sessionDates = calcSessionDates(startDate, classDays);
  if (sessionDates.length < 12) {
    showNotif('تاریخ‌ها کافی نیست — روزهای بیشتری انتخاب کن', 'error'); return;
  }

  // Insert term
  const { data: term, error: termErr } = await db.from('terms').insert({
    teacher_id: currentProfile.id,
    student_id: currentStudentForTerm.id,
    title, level, start_date: startDate, status: 'active'
  }).select().single();

  if (termErr) { showNotif('خطا در ساختن ترم', 'error'); logError(termErr, 'addTerm'); return; }

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

  showNotif('ترم ساخته شد ✓', 'success');
  closeModal('modal-add-term');
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
  document.getElementById('score-avg-display').textContent = avg ? `${avg} / ۲۰` : '—';
}

async function saveScore() {
  const studentId = document.getElementById('score-student-select').value;
  const session = parseInt(document.getElementById('score-session').value);
  const isAbsent = document.getElementById('score-absent').checked;

  if (!studentId) { showNotif('هنرجو را انتخاب کنید', 'error'); return; }
  if (!session) { showNotif('شماره جلسه را وارد کنید', 'error'); return; }

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
  if (error) { showNotif('خطا در ذخیره نمره', 'error'); logError(error, 'saveScore'); return; }
  showNotif('نمره ذخیره شد ✓', 'success');
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
      '<div class="empty-state">هنوز نمره‌ای ثبت نشده</div>';
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
    list.innerHTML = '<div class="empty-state">هنوز نمره‌ای ثبت نشده</div>';
    return;
  }

  list.innerHTML = scores.map(s => {
    if (s.is_absent) return `
      <div class="score-card">
        <div class="score-card-header">
          <span class="score-session-label">جلسه ${s.session_number}</span>
          <span class="score-absent-label">غیبت</span>
        </div>
        ${s.comment ? `<p style="font-size:0.82rem;color:var(--text-dim)">${s.comment}</p>` : ''}
      </div>`;

    const bars = [
      { label: 'تکنیک', val: s.technique },
      { label: 'ریتم', val: s.rhythm },
      { label: 'ملودی', val: s.melody },
      { label: 'دسته', val: s.fretboard },
      { label: 'شنیداری', val: s.ear }
    ].filter(b => b.val !== null);

    return `
      <div class="score-card">
        <div class="score-card-header">
          <span class="score-session-label">جلسه ${s.session_number}</span>
          <span class="score-avg-badge">${s.average ?? '—'} / ۲۰</span>
        </div>
        <div class="score-bars">
          ${bars.map(b => `
            <div class="score-bar-row">
              <span class="score-bar-label">${b.label}</span>
              <div class="score-bar-track">
                <div class="score-bar-fill" style="width:${(b.val / 20) * 100}%"></div>
              </div>
              <span style="font-size:0.78rem;color:var(--text-mid)">${b.val}</span>
            </div>`).join('')}
        </div>
        ${s.comment ? `<p style="font-size:0.82rem;color:var(--text-dim);margin-top:0.75rem">${s.comment}</p>` : ''}
      </div>`;
  }).join('');
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
    const time = new Date(m.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    return `
      <div>
        <div class="msg-bubble ${isMine ? 'sent' : 'received'}">${m.body}</div>
        <div class="msg-time" style="text-align:${isMine ? 'left' : 'right'}">${time}</div>
      </div>`;
  }).join('');
  list.scrollTop = list.scrollHeight;
}

async function sendMessage(toId, body, listId = 'messages-list') {
  if (!body.trim()) { showNotif('پیام خالی است', 'error'); return; }
  const { error } = await db.from('messages').insert({
    from_id: currentProfile.id,
    to_id: toId,
    body: body.trim(),
    role: currentProfile.role
  });
  if (error) { showNotif('خطا در ارسال پیام', 'error'); logError(error, 'sendMessage'); return; }
  showNotif('پیام ارسال شد ✓', 'success');
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
    const time = new Date(m.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
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
  document.getElementById('timer-display').textContent = '۰۰:۰۰';
  document.getElementById('btn-timer-start').style.display = 'none';
  document.getElementById('btn-timer-stop').style.display = 'inline-flex';
  timerInterval = setInterval(() => {
    timerSeconds++;
    document.getElementById('timer-display').textContent = formatTime(timerSeconds);
  }, 1000);
}

async function stopTimer() {
  clearInterval(timerInterval);
  document.getElementById('btn-timer-start').style.display = 'inline-flex';
  document.getElementById('btn-timer-stop').style.display = 'none';

  if (timerSeconds < 10) { showNotif('تمرین خیلی کوتاه بود', 'error'); return; }

  const { data: studentRec } = await db
    .from('students')
    .select('id')
    .eq('profile_id', currentUser.id)
    .single();

  if (!studentRec) { showNotif('پروفایل هنرجو پیدا نشد', 'error'); return; }

  const note = document.getElementById('practice-note').value || null;
  const { error } = await db.from('practice_logs').insert({
    student_id: studentRec.id,
    duration_seconds: timerSeconds,
    note
  });

  if (error) { showNotif('خطا در ذخیره تمرین', 'error'); logError(error, 'stopTimer'); return; }
  showNotif(`تمرین ${formatTime(timerSeconds)} ذخیره شد ✓`, 'success');
  document.getElementById('practice-note').value = '';
}

// ════════════════════════════════
// EVENT LISTENERS
// ════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    if (!role) { showNotif('نقش خود را انتخاب کنید', 'error'); return; }
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
  document.querySelectorAll('#screen-teacher .nav-item').forEach(item => {
    item.addEventListener('click', () => showPanel(item.dataset.panel, item));
  });

  // ── Nav (Student) ──
  document.querySelectorAll('#screen-student .nav-item').forEach(item => {
    item.addEventListener('click', () => showPanel(item.dataset.panel, item));
  });

  // ── Add Student Button ──
  document.getElementById('btn-add-student').addEventListener('click', () => openModal('modal-add-student'));

  // ── Modal Close ──
  document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
    el.addEventListener('click', () => {
      const modal = el.closest('.modal') || document.getElementById(el.dataset.modal);
      if (modal) modal.classList.add('hidden');
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
    if (!toId) { showNotif('هنرجو را انتخاب کنید', 'error'); return; }
    await sendMessage(toId, body);
    document.getElementById('msg-body').value = '';
    await loadMessages(toId);
  });

  // ── Messages (Student) ──
  document.getElementById('btn-student-send-msg').addEventListener('click', async () => {
    const body = document.getElementById('student-msg-body').value;
    if (!currentProfile?.teacher_id) { showNotif('استاد پیدا نشد', 'error'); return; }
    await sendMessage(currentProfile.teacher_id, body, 'student-messages-list');
    document.getElementById('student-msg-body').value = '';
    await loadStudentMessages();
  });

  // ── Practice Timer ──
  document.getElementById('btn-timer-start').addEventListener('click', startTimer);
  document.getElementById('btn-timer-stop').addEventListener('click', stopTimer);

  // ── Copy Invite Code ──
  document.getElementById('btn-copy-invite').addEventListener('click', () => {
    const code = currentProfile?.invite_code;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => showNotif('کد کپی شد ✓', 'success'));
  });

  // ── Student Profile Modal Tabs ──
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => switchProfileTab(tab.dataset.tab));
  });

  // ── Add Term Button ──
  const btnAddTerm = document.getElementById('btn-add-term');
  if (btnAddTerm) btnAddTerm.addEventListener('click', () => {
    document.getElementById('form-add-term').reset();
    document.getElementById('term-sessions-preview').classList.add('hidden');
    openModal('modal-add-term');
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
      `<div class="preview-session">جلسه ${i + 1} — ${d.toLocaleDateString('fa-IR')}</div>`
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