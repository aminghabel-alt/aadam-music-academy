const DEMO_USERS={
  student:{name:'علی رضایی',email:'student@demo.com',pass:'1234',role:'student',sub:'سطح متوسط'},
  teacher:{name:'استاد محمدی',email:'teacher@demo.com',pass:'1234',role:'teacher',sub:'مربی ارشد'},
  parent:{name:'آقای رضایی',email:'parent@demo.com',pass:'1234',role:'parent',sub:'والدین علی'}
};

let currentUser=null;

function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach((t,i)=>t.classList.toggle('active',(tab==='login')===!i));
  document.getElementById('login-form').style.display=tab==='login'?'block':'none';
  document.getElementById('register-form').style.display=tab==='register'?'block':'none';
}
/* SUPABASE */
const SUPABASE_URL='https://gqunxatjbifdhlyvwmuf.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxdW54YXRqYmlmZGhseXZ3bXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTgxNDIsImV4cCI6MjA5MzQ5NDE0Mn0.KWMRnxGhavdW-i7OQKndktrshAI3FNn6CXRYHzgWQE4';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
window.addEventListener('DOMContentLoaded',async()=>{
  const {data:{session}}=await sb.auth.getSession();
  if(session){
    const {data:profile}=await sb.from('profiles').select('*').eq('id',session.user.id).single();
    if(profile){currentUser=profile;enterApp();}
  }
});
async function doLogin(){
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-pass').value;
  if(!email||!pass){showNotif('⚠️ ایمیل و رمز را وارد کن');return;}
  showNotif('⏳ در حال ورود...');
  const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
  if(error){showNotif('❌ '+error.message);return;}
  const {data:profile}=await sb.from('profiles').select('*').eq('id',data.user.id).single();
  currentUser=profile||{id:data.user.id,name:email,role:'student',sub:'هنرجو'};
  enterApp();
}
function onRoleChange(role){
  document.getElementById('teacher-note').style.display = (role==='teacher') ? 'block' : 'none';
}

function generateInviteCode(name){
  const part1 = name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z\u0600-\u06FF]/g,'').substring(0,6);
  const part2 = Math.floor(1000+Math.random()*9000);
  return part1+'-'+part2;
}

async function doRegister(){
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const role  = document.getElementById('reg-role').value;

  if(!name||!email||!pass){ showNotif('⚠️ تمام فیلدها را پر کن'); return; }
  showNotif('⏳ در حال ثبت‌نام...');

  const {data,error} = await sb.auth.signUp({email, password:pass});
  if(error){ showNotif('❌ '+error.message); return; }

  const profile = { id:data.user.id, name, role };
  if(role === 'teacher') profile.invite_code = generateInviteCode(name);

  await sb.from('profiles').insert(profile);

  if(role === 'teacher'){
    showInviteModal(name, profile.invite_code);
  } else {
    showNotif('✅ ثبت‌نام موفق — وارد شو و کد استادت رو وارد کن');
  }
}

async function connectToTeacher(){
  const code = document.getElementById('connect-code').value.trim().toUpperCase();
  if(!code){ showNotif('⚠️ کد دعوت را وارد کن'); return; }
  showNotif('⏳ در حال بررسی کد...');

  const {data:teacher, error} = await sb.from('profiles')
    .select('id,name')
    .eq('invite_code', code)
    .eq('role','teacher')
    .single();

  if(error || !teacher){ showNotif('❌ کد دعوت نامعتبر است'); return; }

  const {error:ue} = await sb.from('profiles')
    .update({ teacher_id: teacher.id })
    .eq('id', currentUser.id);

  if(ue){ showNotif('❌ خطا: '+ue.message); return; }

  currentUser.teacher_id = teacher.id;
  currentUser.teacher_name = teacher.name;
  showNotif('✅ به استاد '+teacher.name+' متصل شدی!');

  setTimeout(()=>{ navigate('dashboard'); loadStudentDashboard(); }, 1000);
}

function showInviteModal(name, code){
  // یه مدال ساده نمایش کد دعوت
  const existing = document.getElementById('modal-invite');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-invite';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:500;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);padding:32px;max-width:360px;width:90%;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px">🎉</div>
      <div style="font-size:17px;font-weight:700;margin-bottom:6px">ثبت‌نام موفق، ${name}!</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:24px">کد دعوت اختصاصی شما:</div>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;color:var(--gold);background:var(--gold-dim);border:1px solid rgba(201,168,76,0.3);border-radius:10px;padding:14px 20px;margin-bottom:8px;cursor:pointer;" onclick="navigator.clipboard.writeText('${code}');showNotif('✅ کپی شد!')">
        ${code}
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:24px">برای کپی روی کد بزن · این کد را به هنرجویانت بده</div>
      <button class="btn-primary" style="margin-top:0" onclick="document.getElementById('modal-invite').remove();showNotif('📧 ایمیلت را تأیید کن')">باشه، فهمیدم</button>
    </div>`;
  document.body.appendChild(modal);
}
function demoLogin(role){loginAs(DEMO_USERS[role]);}
function enterApp(){
  document.getElementById('screen-auth').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');
  setupUserUI();
  showNotif('👋 خوش آمدی، '+(currentUser.name||'')+'!');

  // هنرجو یا والدین بدون استاد → صفحه اتصال
  const role = currentUser.role;
  if((role==='student'||role==='parent') && !currentUser.teacher_id && !currentUser.pass){
    setTimeout(()=> navigate('connect'), 300);
  }
}
function loginAs(user){currentUser=user;enterApp();}
async function doLogout(){
  await sb.auth.signOut();
  currentUser=null;
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-auth').classList.add('active');
  stopTuner();stopMetro();stopPractice();
}

function setupUserUI(){
  const u=currentUser;
  const chip=document.getElementById('user-chip');
  chip.className='user-chip role-'+u.role;
  document.getElementById('role-badge').textContent={student:'هنرجو',teacher:'مربی',parent:'والدین'}[u.role];
  document.getElementById('user-name-display').textContent=u.name;
  document.getElementById('user-sub-display').textContent=u.sub||u.role;
  // greeting در داشبورد هنرجو/مربی جداگانه set می‌شه

  // نمایش کد دعوت مربی در sidebar
  const existingChip = document.getElementById('invite-chip');
  if(existingChip) existingChip.remove();
  if(u.role==='teacher' && u.invite_code){
    const chip = document.createElement('div');
    chip.id = 'invite-chip';
    chip.style.cssText = 'margin:0 14px 8px;padding:10px 12px;background:var(--gold-dim);border:1px solid rgba(201,168,76,0.25);border-radius:var(--radius-sm);cursor:pointer;';
    chip.title = 'برای کپی بزنید';
    chip.onclick = ()=>{ navigator.clipboard.writeText(u.invite_code); showNotif('✅ کد دعوت کپی شد'); };
    chip.innerHTML = `
      <div style="font-size:10px;color:var(--gold);font-weight:600;margin-bottom:4px">🔑 کد دعوت هنرجو</div>
      <div style="font-size:14px;font-weight:700;color:var(--gold);letter-spacing:2px">${u.invite_code}</div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px">بزن تا کپی شه</div>`;
    // بعد از user-chip اضافه کن
    document.getElementById('user-chip').insertAdjacentElement('afterend', chip);
  }
  const navDefs={
    student:[{id:'dashboard',icon:'🏠',label:'داشبورد'},{id:'report',icon:'📊',label:'کارنامه'},{id:'curriculum',icon:'📚',label:'سرفصل'},{id:'tools',icon:'🎵',label:'ابزارها'},{id:'practice',icon:'⏱',label:'تمرین روزانه'},{id:'messages',icon:'💬',label:'پیام به استاد'}],
    teacher:[{id:'dashboard',icon:'🏠',label:'داشبورد'},{id:'students',icon:'👥',label:'هنرجویان'},{id:'scores',icon:'✏️',label:'ثبت نمره'},{id:'tools',icon:'🎵',label:'ابزارها'},{id:'messages',icon:'💬',label:'پیام‌ها'}],
    parent:[{id:'parent',icon:'🏠',label:'داشبورد'},{id:'report',icon:'📊',label:'کارنامه فرزند'},{id:'messages',icon:'💬',label:'پیام به استاد'}]
  };
  const nav=navDefs[u.role];
  const navEl=document.getElementById('nav-items');
  navEl.innerHTML='<div class="nav-label">منو</div>';
  nav.forEach((item,idx)=>{
    const div=document.createElement('div');
    div.className='nav-item'+(idx===0?' active':'');
    div.id='nav-'+item.id;
    div.innerHTML=`<span class="ni">${item.icon}</span>${item.label}`;
    div.onclick=()=>navigate(item.id);
    navEl.appendChild(div);
  });
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+nav[0].id).classList.add('active');
  try{ fillReport().catch(e=>console.warn('fillReport',e)); }catch(e){ console.warn('fillReport',e); }
  try{ fillChapters(); }catch(e){ console.warn('fillChapters',e); }
  try{ fillMessages(); }catch(e){ console.warn('fillMessages',e); }
  try{ buildBeats(4); }catch(e){ console.warn('buildBeats',e); }
  try{ buildWeekGrid(); }catch(e){ console.warn('buildWeekGrid',e); }

  if(u.role==='teacher'){
    document.getElementById('teacher-dashboard').style.display='block';
    document.getElementById('student-dashboard').style.display='none';
    try{ loadStudents(); }catch(e){ console.warn(e); }
    try{ loadScoreStudents(); }catch(e){ console.warn(e); }
    loadTeacherDashboard().catch(e=>console.warn('loadTeacherDashboard',e));
    try{ loadRecentScores(); }catch(e){ console.warn(e); }
  } else {
    document.getElementById('teacher-dashboard').style.display='none';
    document.getElementById('student-dashboard').style.display='block';
    document.getElementById('dash-greeting-s').textContent='سلام '+u.name.split(' ')[0]+' 👋';

    loadStudentDashboard();
  }
}

function navigate(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pg=document.getElementById('page-'+id);if(pg)pg.classList.add('active');
  const ni=document.getElementById('nav-'+id);if(ni)ni.classList.add('active');
  if(id==='students') loadStudents();
  if(id==='scores'){ loadScoreStudents(); loadRecentScores(); }
  if(id==='report') fillReport();
}


function avg(s){return((s.tech+s.rhythm+s.melody+s.fret+s.ear)/5).toFixed(1);}
function gc(v){return v>=17?'badge-green':v>=14?'badge-teal':v>=12?'badge-gold':'badge-red';}

async function fillReport(){
  const tbody = document.getElementById('report-tbody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text3)">در حال بارگذاری...</td></tr>';

  let studentId = null;

  if(currentUser.role === 'teacher'){
    // مربی: selector نمایش داده می‌شه
    const selector = document.getElementById('report-student-selector');
    if(selector) selector.style.display = 'block';

    // پر کردن select اگه خالیه
    const sel = document.getElementById('report-select-student');
    if(sel && sel.options.length <= 1){
      const {data:students} = await sb.from('students')
        .select('id,name')
        .eq('teacher_id', currentUser.id)
        .neq('status','inactive')
        .order('name');
      if(students){
        students.forEach(s=>{
          const opt = document.createElement('option');
          opt.value = s.id; opt.textContent = s.name;
          sel.appendChild(opt);
        });
      }
    }
    studentId = sel?.value || null;
    if(!studentId){
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text3)">یک هنرجو انتخاب کنید</td></tr>';
      return;
    }

  } else {
    // هنرجو: student_id از جدول students
    const {data:stRow} = await sb.from('students')
      .select('id')
      .eq('profile_id', currentUser.id)
      .maybeSingle();
    studentId = stRow?.id || null;
    if(!studentId){
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text3)">منتظر تأیید استاد هستید</td></tr>';
      return;
    }
  }

  const {data:scores, error} = await sb.from('scores')
    .select('*')
    .eq('student_id', studentId)
    .order('session_number', {ascending:false});

  if(error){ tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--red)">خطا در بارگذاری</td></tr>'; return; }
  if(!scores || scores.length === 0){
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text3)">هنوز نمره‌ای ثبت نشده</td></tr>';
    return;
  }

  tbody.innerHTML = scores.map(s => {
    if(s.is_absent) return `<tr style="opacity:0.6">
      <td style="font-weight:600">جلسه ${s.session_number}</td>
      <td style="font-size:11px;color:var(--text3)">${new Date(s.created_at).toLocaleDateString('fa-IR')}</td>
      <td colspan="5" style="color:var(--red);font-size:12px;">🚫 غیبت</td>
      <td><span class="badge badge-red">غیبت</span></td>
      <td style="color:var(--text2);font-size:12px">${s.comment||''}</td>
    </tr>`;
    return `<tr>
      <td style="font-weight:600">جلسه ${s.session_number}</td>
      <td style="font-size:11px;color:var(--text3)">${new Date(s.created_at).toLocaleDateString('fa-IR')}</td>
      <td>${s.technique??'—'}</td>
      <td>${s.rhythm??'—'}</td>
      <td>${s.melody??'—'}</td>
      <td>${s.fretboard??'—'}</td>
      <td>${s.ear??'—'}</td>
      <td><span class="badge ${s.average>=17?'badge-green':s.average>=14?'badge-teal':s.average>=12?'badge-gold':'badge-red'}">${s.average??'—'}</span></td>
      <td style="color:var(--text2);font-size:12px">${s.comment||''}</td>
    </tr>`;
  }).join('');
}

function fillChapters(){
  const list=document.getElementById('chapter-list');
  if(!list) return;
  // TODO: فاز بعدی — از Supabase (جدول chapters) بخونه
  list.innerHTML='<div style="text-align:center;color:var(--text3);padding:24px;font-size:13px;">محتوای درسی به زودی...</div>';
}

function fillMessages(){ loadMessages();
}


async function buildWeekGrid(){
  const grid = document.getElementById('week-grid');
  if(!grid) return;

  // پیدا کردن student_id
  const {data:stRow} = await sb.from('students')
    .select('id')
    .eq('profile_id', currentUser.id)
    .maybeSingle();
  const studentId = stRow?.id || null;

  // هفت روز گذشته
  const days = ['ش','ی','د','س','چ','پ','ج'];
  const today = new Date();
  const weekDates = Array.from({length:7},(_,i)=>{
    const d = new Date(today);
    d.setDate(today.getDate() - (6-i));
    return d.toISOString().split('T')[0];
  });

  let logs = [];
  if(studentId){
    const {data} = await sb.from('practice_logs')
      .select('date,duration_seconds')
      .eq('student_id', studentId)
      .gte('date', weekDates[0])
      .lte('date', weekDates[6]);
    logs = data || [];
  }

  grid.innerHTML = weekDates.map((date,i)=>{
    const dayLogs = logs.filter(l=>l.date===date);
    const totalSec = dayLogs.reduce((sum,l)=>sum+l.duration_seconds,0);
    const min = Math.round(totalSec/60);
    const isToday = i===6;
    return `<div class="day-block ${min>0?'has-practice':'no-practice'}${isToday?' today':''}">
      <span class="day-name">${days[i]}</span>
      <span class="day-min">${min>0?min+'′':'—'}</span>
    </div>`;
  }).join('');
}

/* TUNER */
let tunerRunning=false,tunerStream=null,tunerCtx=null,tunerAnalyser=null,tunerAnim=null;
const NOTES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
function toggleTuner(){tunerRunning?stopTuner():startTuner();}
async function startTuner(){
  try{
    tunerStream=await navigator.mediaDevices.getUserMedia({audio:true});
    tunerCtx=new(window.AudioContext||window.webkitAudioContext)();
    const src=tunerCtx.createMediaStreamSource(tunerStream);
    tunerAnalyser=tunerCtx.createAnalyser();tunerAnalyser.fftSize=4096;
    src.connect(tunerAnalyser);tunerRunning=true;
    document.getElementById('btn-tuner').textContent='توقف تیونر';
    document.getElementById('btn-tuner').classList.add('active');
    detectPitch();
  }catch(e){showNotif('❌ دسترسی به میکروفون رد شد');}
}
function stopTuner(){
  tunerRunning=false;
  if(tunerAnim)cancelAnimationFrame(tunerAnim);
  if(tunerStream)tunerStream.getTracks().forEach(t=>t.stop());
  if(tunerCtx)tunerCtx.close();
  document.getElementById('btn-tuner').textContent='شروع تیونر';
  document.getElementById('btn-tuner').classList.remove('active');
  document.getElementById('tuner-note').textContent='—';
  document.getElementById('tuner-freq').textContent='میکروفون را فعال کن';
  document.getElementById('tuner-indicator').textContent='آماده';
  document.getElementById('tuner-indicator').className='tuner-indicator';
  document.getElementById('tuner-needle').style.left='50%';
}
function detectPitch(){
  if(!tunerRunning)return;
  const buf=new Float32Array(tunerAnalyser.fftSize);
  tunerAnalyser.getFloatTimeDomainData(buf);
  const freq=yinPitch(buf,tunerCtx.sampleRate);
  if(freq>50){
    const midi=12*Math.log2(freq/440)+69;
    const r=Math.round(midi);
    const cents=Math.round((midi-r)*100);
    const note=NOTES[((r%12)+12)%12];
    const oct=Math.floor(r/12)-1;
    document.getElementById('tuner-note').textContent=note+oct;
    document.getElementById('tuner-freq').textContent=freq.toFixed(1)+' Hz';
    document.getElementById('tuner-needle').style.left=(50+cents*0.4)+'%';
    const ind=document.getElementById('tuner-indicator');
    if(Math.abs(cents)<5){ind.textContent='✓ کوک است';ind.className='tuner-indicator in-tune';}
    else if(cents>0){ind.textContent='▲ زیاد ('+cents+' سنت)';ind.className='tuner-indicator sharp';}
    else{ind.textContent='▼ کم ('+cents+' سنت)';ind.className='tuner-indicator flat';}
  }
  tunerAnim=requestAnimationFrame(detectPitch);
}
function yinPitch(buf,sr){
  const N=buf.length,h=N>>1;const d=new Float32Array(h);let sum=0;
  for(let t=1;t<h;t++){for(let i=0;i<h;i++){const x=buf[i]-buf[i+t];d[t]+=x*x;}sum+=d[t];d[t]=d[t]*t/sum;}
  for(let t=2;t<h;t++){if(d[t]<0.15){while(t+1<h&&d[t+1]<d[t])t++;return sr/t;}}
  return -1;
}

/* METRONOME */
let metroRunning=false,metroCtx=null,metroBeat=0,metroBeats=4,metroTimeout=null,metroBPM=120;
function updateBPM(v){metroBPM=+v;document.getElementById('metro-bpm').textContent=v;}
function setTimeSig(el,beats){
  document.querySelectorAll('.time-sig-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');metroBeats=beats;metroBeat=0;buildBeats(beats);
  if(metroRunning){stopMetro();startMetro();}
}
function buildBeats(n){
  document.getElementById('metro-beats').innerHTML=Array.from({length:n},(_,i)=>`<div class="metro-beat${i===0?' accent':''}" id="beat-${i}"></div>`).join('');
}
function toggleMetro(){metroRunning?stopMetro():startMetro();}
function startMetro(){
  metroCtx=new(window.AudioContext||window.webkitAudioContext)();
  metroRunning=true;metroBeat=0;
  document.getElementById('btn-metro').textContent='توقف';
  document.getElementById('btn-metro').className='btn-metro stop';
  tick();
}
function stopMetro(){
  metroRunning=false;if(metroTimeout)clearTimeout(metroTimeout);
  if(metroCtx)metroCtx.close();
  document.getElementById('btn-metro').textContent='شروع';
  document.getElementById('btn-metro').className='btn-metro start';
  document.querySelectorAll('.metro-beat').forEach(b=>b.classList.remove('active'));
}
function tick(){
  if(!metroRunning)return;
  const accent=metroBeat===0;
  const osc=metroCtx.createOscillator();const g=metroCtx.createGain();
  osc.connect(g);g.connect(metroCtx.destination);
  osc.frequency.value=accent?1000:800;
  g.gain.setValueAtTime(accent?0.6:0.35,metroCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,metroCtx.currentTime+0.05);
  osc.start();osc.stop(metroCtx.currentTime+0.05);
  document.querySelectorAll('.metro-beat').forEach(b=>b.classList.remove('active'));
  const b=document.getElementById('beat-'+metroBeat);if(b)b.classList.add('active');
  metroBeat=(metroBeat+1)%metroBeats;
  metroTimeout=setTimeout(tick,60000/metroBPM);
}

/* PRACTICE */
let practiceRunning=false,practiceSeconds=0,practiceInterval=null;
function togglePractice(){practiceRunning?stopPractice():startPractice();}
function startPractice(){
  practiceRunning=true;
  document.getElementById('btn-practice').textContent='توقف';
  document.getElementById('btn-practice').className='btn-practice stop';
  practiceInterval=setInterval(()=>{
    practiceSeconds++;
    const m=String(Math.floor(practiceSeconds/60)).padStart(2,'0');
    const s=String(practiceSeconds%60).padStart(2,'0');
    document.getElementById('practice-timer').textContent=m+':'+s;
  },1000);
}
function stopPractice(){
  practiceRunning=false;clearInterval(practiceInterval);
  document.getElementById('btn-practice').textContent='ادامه تمرین';
  document.getElementById('btn-practice').className='btn-practice start';
}
function resetPractice(){
  stopPractice();practiceSeconds=0;
  document.getElementById('practice-timer').textContent='۰۰:۰۰';
  document.getElementById('btn-practice').textContent='شروع تمرین';
}

/* MESSAGES */
async function sendMsg(){
  const txt = document.getElementById('msg-text').value.trim();
  if(!txt){showNotif('⚠️ پیام خالی است');return;}

  // to_id = استاد هنرجو
  const toId = currentUser.teacher_id || null;
  if(!toId && currentUser.role==='student'){
    showNotif('⚠️ ابتدا به استاد وصل شو');
    return;
  }

  const {error} = await sb.from('messages').insert({
    from_id: currentUser.id,
    to_id:   toId,
    body:    txt,
    role:    currentUser.role
  });

  if(error){ showNotif('❌ خطا: '+error.message); return; }
  document.getElementById('msg-text').value='';
  showNotif('✅ پیام ارسال شد');
  loadMessages();
}

async function loadMessages(){
  const {data,error} = await sb.from('messages')
    .select('*, from_profile:from_id(name)')
    .or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`)
    .order('created_at',{ascending:false})
    .limit(30);

  if(error){ console.error(error); return; }

  const list = document.getElementById('msg-list');
  if(!list) return;

  if(!data || data.length===0){
    list.innerHTML='<div style="text-align:center;color:var(--text3);padding:24px;font-size:13px;">هنوز پیامی وجود ندارد</div>';
    return;
  }

  list.innerHTML = data.map(m=>{
    const isMine = m.from_id === currentUser.id;
    const senderName = isMine ? 'شما' : (m.from_profile?.name || 'استاد');
    return `
    <div class="msg-item${!isMine?' msg-unread':''}">
      <div class="msg-header">
        <span class="msg-from">${senderName}</span>
        <span class="msg-time">${new Date(m.created_at).toLocaleDateString('fa-IR')}</span>
      </div>
      <div class="msg-body">${m.body}</div>
    </div>`;
  }).join('');
}




function toggleAbsent(isAbsent){
  const scoreInputs = ['sc-tech','sc-rhythm','sc-melody','sc-fret','sc-ear'];
  scoreInputs.forEach(id=>{
    const el = document.getElementById(id);
    if(el){
      el.disabled = isAbsent;
      el.style.opacity = isAbsent ? '0.4' : '1';
      if(isAbsent) el.value = '';
    }
  });
  const comment = document.getElementById('sc-comment');
  if(comment && isAbsent && !comment.value){
    comment.value = 'غیبت';
  } else if(!isAbsent && comment.value === 'غیبت'){
    comment.value = '';
  }
}
/* SCORE */
async function saveScore(){
  const sel       = document.getElementById('score-student');
  const selectedId = sel.value;
  const studentName = sel.options[sel.selectedIndex]?.text?.replace(' ✓','') || '';
  if(!selectedId){ showNotif('⚠️ یک هنرجو انتخاب کن'); return; }

  const session = document.getElementById('score-session').value;
  if(!session){ showNotif('⚠️ شماره جلسه را وارد کن'); return; }

  const isAbsent = document.getElementById('sc-absent')?.checked || false;
  const tech    = isAbsent ? null : (+document.getElementById('sc-tech').value   || 0);
  const rhythm  = isAbsent ? null : (+document.getElementById('sc-rhythm').value || 0);
  const melody  = isAbsent ? null : (+document.getElementById('sc-melody').value || 0);
  const fret    = isAbsent ? null : (+document.getElementById('sc-fret').value   || 0);
  const ear     = isAbsent ? null : (+document.getElementById('sc-ear').value    || 0);
  const comment = document.getElementById('sc-comment').value || (isAbsent ? 'غیبت' : '');
  const average = isAbsent ? null : +((tech+rhythm+melody+fret+ear)/5).toFixed(1);

  // تشخیص source: آیا از جدول students هست یا profiles
  const selectedOpt = sel.options[sel.selectedIndex];
  const source = selectedOpt?.dataset?.source || 'students';

  let studentId = selectedId;

  if(source === 'profiles'){
    // هنرجو هنوز فعال نشده (فقط ثبت‌نام کرده)
    const {data: stRow} = await sb.from('students')
      .select('id')
      .eq('profile_id', selectedId)
      .single();
    if(!stRow){
      showNotif('⚠️ این هنرجو هنوز فعال نشده — ابتدا در صفحه هنرجویان فعال‌سازی کن');
      return;
    }
    studentId = stRow.id;
  }

  const {error} = await sb.from('scores').insert({
    teacher_id:     currentUser.id,
    student_id:     studentId,
    session_number: +session,
    technique:      tech,
    rhythm,
    melody,
    fretboard:      fret,
    ear,
    average,
    comment
  });

  if(error){ showNotif('❌ '+error.message); return; }

  showNotif(isAbsent ? '🚫 غیبت جلسه '+session+' برای '+studentName+' ثبت شد' : '✅ نمره جلسه '+session+' برای '+studentName+' ثبت شد — میانگین: '+average);
  if(document.getElementById('sc-absent')) { document.getElementById('sc-absent').checked=false; toggleAbsent(false); }
  loadRecentScores();
}


// داده‌های داشبورد — برای modal
let _dashData = { pending:[], active:[], inactive:[], scores:[] };

async function loadTeacherDashboard(){
  // جدول students
  const {data:allStudents} = await sb.from('students')
    .select('id,name,profile_id,status,instrument,level,payment_status')
    .eq('teacher_id',currentUser.id);

  // هنرجوهای pending از profiles
  const {data:profileStudents} = await sb.from('profiles')
    .select('id,name,email')
    .eq('teacher_id', currentUser.id)
    .eq('role','student');

  const fullProfileIds = new Set((allStudents||[]).map(s=>s.profile_id).filter(Boolean));
  const pending  = (profileStudents||[]).filter(p => !fullProfileIds.has(p.id));
  const active   = (allStudents||[]).filter(s => s.status !== 'inactive');
  const inactive = (allStudents||[]).filter(s => s.status === 'inactive');

  const {data:scores} = await sb.from('scores')
    .select('id,average,session_number,created_at,students(name)')
    .eq('teacher_id',currentUser.id)
    .order('created_at',{ascending:false});

  // ذخیره برای modal
  _dashData = { pending, active, inactive, scores: scores||[] };

  // آپدیت کارت‌ها
  document.getElementById('t-stat-pending').textContent  = pending.length;
  document.getElementById('t-stat-active').textContent   = active.length;
  document.getElementById('t-stat-inactive').textContent = inactive.length;
  document.getElementById('t-stat-scores').textContent   = (scores||[]).length;

  // پر کردن select هنرجوی داشبورد
  const allForSelect = [
    ...active.map(s=>({id:s.id, name:s.name, type:'active'})),
    ...pending.map(s=>({id:s.id, name:s.name+' (در انتظار)', type:'pending'})),
  ];
  const sel = document.getElementById('t-select-student');
  if(sel){
    sel.innerHTML = '<option value="">-- انتخاب هنرجو --</option>' +
      allForSelect.map(s=>`<option value="${s.id}" data-type="${s.type}">${s.name}</option>`).join('');
  }
}

// باز کردن modal آماری
function openStatModal(type){
  const modal = document.getElementById('modal-stat');
  const title = document.getElementById('stat-modal-title');
  const list  = document.getElementById('stat-modal-list');
  const search = document.getElementById('stat-modal-search');
  search.value = '';

  const titles = {pending:'⏳ در انتظار تأیید', active:'✅ هنرجویان فعال', inactive:'📦 هنرجویان غیرفعال', scores:'📝 کل نمرات ثبت‌شده'};
  title.textContent = titles[type] || type;
  modal._type = type;
  renderStatModalList(type, '');
  modal.style.display = 'flex';
}

function filterStatModal(){
  const modal = document.getElementById('modal-stat');
  const q = document.getElementById('stat-modal-search').value;
  renderStatModalList(modal._type, q);
}

function renderStatModalList(type, query){
  const list = document.getElementById('stat-modal-list');
  const q = query.toLowerCase();
  const levelMap = {beginner:'مبتدی',intermediate:'متوسط',advanced:'پیشرفته'};

  if(type === 'scores'){
    const rows = _dashData.scores.filter(s => !q || (s.students?.name||'').includes(q));
    if(rows.length === 0){ list.innerHTML = '<div style="text-align:center;color:var(--text3);padding:16px;font-size:13px;">نتیجه‌ای یافت نشد</div>'; return; }
    list.innerHTML = rows.map(s=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg3);border-radius:var(--radius-sm);">
        <div>
          <div style="font-size:14px;font-weight:600;">${s.students?.name||'—'}</div>
          <div style="font-size:11px;color:var(--text3);">جلسه ${s.session_number||'—'} · ${new Date(s.created_at).toLocaleDateString('fa-IR')}</div>
        </div>
        <span class="badge ${s.average>=17?'badge-green':s.average>=14?'badge-teal':'badge-gold'}">${s.average||'—'}</span>
      </div>`).join('');
    return;
  }

  const src = _dashData[type] || [];
  const rows = src.filter(s => !q || s.name?.toLowerCase().includes(q) || s.name?.includes(query));
  if(rows.length === 0){ list.innerHTML = '<div style="text-align:center;color:var(--text3);padding:16px;font-size:13px;">نتیجه‌ای یافت نشد</div>'; return; }

  list.innerHTML = rows.map(s=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg3);border-radius:var(--radius-sm);">
      <div>
        <div style="font-size:14px;font-weight:600;">${s.name||'—'}</div>
        ${s.instrument ? `<div style="font-size:11px;color:var(--text3);">${s.instrument}${s.level?' · '+levelMap[s.level]:''}</div>` : (s.email ? `<div style="font-size:11px;color:var(--text3);">${s.email}</div>` : '')}
      </div>
      ${type==='pending' ? `<span class="badge badge-gold">در انتظار</span>` :
        type==='active'  ? `<span class="badge badge-green">فعال</span>` :
        `<button onclick="setStudentStatus('${s.id}','active');document.getElementById('modal-stat').style.display='none';" style="padding:4px 12px;background:var(--green-dim);border:1px solid rgba(74,222,128,0.3);border-radius:5px;font-size:11px;color:var(--green);cursor:pointer;font-family:inherit;">فعال‌سازی</button>`}
    </div>`).join('');
}

async function loadStudentDetail(studentId){
  const detail = document.getElementById('student-detail');
  const empty  = document.getElementById('student-detail-empty');
  if(!studentId){ detail.style.display='none'; empty.style.display='block'; return; }
  detail.style.display='block'; empty.style.display='none';

  // اطلاعات هنرجو از students
  const {data:student} = await sb.from('students')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();

  // نمرات
  const {data:scores} = await sb.from('scores')
    .select('*')
    .eq('student_id', studentId)
    .order('session_number', {ascending:false})
    .limit(10);

  const list = scores||[];
  const validScores = list.filter(s=>!s.is_absent);
  const avgVal = validScores.length > 0
    ? (validScores.reduce((s,r)=>s+(+r.average||0),0)/validScores.length).toFixed(1) : '—';

  document.getElementById('sd-avg').textContent      = avgVal;
  document.getElementById('sd-sessions').textContent = list.length;
  document.getElementById('sd-practice').textContent = '—';

  // اطلاعات کلاس هنرجو
  const levelMap = {beginner:'مبتدی',intermediate:'متوسط',advanced:'پیشرفته'};
  const payMap   = {paid:'badge-green',pending:'badge-gold',overdue:'badge-red'};
  const payLabel = {paid:'پرداخت شده',pending:'در انتظار',overdue:'معوق'};

  // اطلاعات کلاس را زیر stats نشون بده
  let infoEl = document.getElementById('sd-class-info');
  if(!infoEl){
    infoEl = document.createElement('div');
    infoEl.id = 'sd-class-info';
    infoEl.style.cssText = 'margin-bottom:16px;padding:12px 16px;background:var(--bg3);border-radius:var(--radius-sm);display:flex;flex-wrap:wrap;gap:12px;';
    detail.querySelector('.stats-grid').insertAdjacentElement('afterend', infoEl);
  }
  if(student){
    infoEl.innerHTML = [
      student.instrument   ? `<span style="font-size:12px;color:var(--text2)">🎸 ${student.instrument}</span>` : '',
      student.level        ? `<span style="font-size:12px;color:var(--text2)">📊 ${levelMap[student.level]||student.level}</span>` : '',
      student.class_time   ? `<span style="font-size:12px;color:var(--text2)">🕐 ${student.class_time}</span>` : '',
      student.class_days?.length ? `<span style="font-size:12px;color:var(--text2)">📅 ${student.class_days.join('، ')}</span>` : '',
      student.class_duration ? `<span style="font-size:12px;color:var(--text2)">⏱ ${student.class_duration} دقیقه</span>` : '',
      student.payment_status ? `<span class="badge ${payMap[student.payment_status]||'badge-gold'}">${payLabel[student.payment_status]||'—'}</span>` : '',
    ].filter(Boolean).join('');
  }

  // جدول نمرات با غیبت
  document.getElementById('sd-scores-tbody').innerHTML = list.length===0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--text3)">هنوز نمره‌ای ثبت نشده</td></tr>'
    : list.map(s=> s.is_absent
        ? `<tr style="opacity:0.6"><td>جلسه ${s.session_number}</td><td colspan="3" style="color:var(--red);font-size:12px;">🚫 غیبت</td><td><span class="badge badge-red">غیبت</span></td></tr>`
        : `<tr>
          <td>جلسه ${s.session_number}</td>
          <td>${s.technique??'—'}</td>
          <td>${s.rhythm??'—'}</td>
          <td>${s.melody??'—'}</td>
          <td><span class="badge ${s.average>=17?'badge-green':s.average>=14?'badge-teal':'badge-gold'}">${s.average??'—'}</span></td>
        </tr>`).join('');

  renderStrengths('sd-strengths', validScores);
}

async function loadStudentDashboard(){
  // اسم استاد — مستقیم از currentUser.teacher_id
  const teacherCard = document.getElementById('s-teacher-card');
  const teacherNameEl = document.getElementById('s-teacher-name');

  if(currentUser.teacher_id && teacherCard && teacherNameEl){
    teacherCard.style.display = 'flex';
    // اگه قبلاً teacher_name داریم، همونو نشون بده
    if(currentUser.teacher_name){
      teacherNameEl.textContent = currentUser.teacher_name;
    } else {
      const {data:teacher} = await sb.from('profiles')
        .select('name')
        .eq('id', currentUser.teacher_id)
        .single();
      if(teacher){
        teacherNameEl.textContent = teacher.name;
        currentUser.teacher_name = teacher.name;
      }
    }
  } else if(teacherCard){
    teacherCard.style.display = 'none';
  }

  // پیدا کردن student_id از جدول students
  let studentId = null;
  const {data:stRow} = await sb.from('students')
    .select('id')
    .eq('profile_id', currentUser.id)
    .maybeSingle();
  if(stRow) studentId = stRow.id;

  if(!studentId){
    // هنوز فعال نشده — فقط وضعیت pending نشون بده
    document.getElementById('s-avg').textContent      = '—';
    document.getElementById('s-sessions').textContent = '۰';
    document.getElementById('s-practice').textContent = '—';
    document.getElementById('s-chapters').textContent = '—';
    document.getElementById('s-scores-tbody').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text3)">منتظر تأیید استاد هستید</td></tr>';
    document.getElementById('s-strengths').innerHTML =
      '<div style="text-align:center;color:var(--text3);font-size:13px;padding:16px;">بعد از تأیید استاد فعال می‌شود</div>';
    return;
  }

  // نمرات
  const {data:scores} = await sb.from('scores')
    .select('*')
    .eq('student_id', studentId)
    .order('session_number', {ascending:false})
    .limit(8);

  const list = scores||[];
  const avg  = list.length > 0
    ? (list.reduce((s,r)=>s+(+r.average||0),0)/list.length).toFixed(1) : '—';

  document.getElementById('s-avg').textContent      = avg;
  document.getElementById('s-sessions').textContent = list.length || '۰';
  document.getElementById('s-practice').textContent = '—';
  document.getElementById('s-chapters').textContent = '—';

  document.getElementById('s-scores-tbody').innerHTML = list.length===0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--text3)">هنوز نمره‌ای ثبت نشده</td></tr>'
    : list.map(s=>`<tr>
        <td>جلسه ${s.session_number}</td>
        <td>${s.technique??'—'}</td>
        <td>${s.rhythm??'—'}</td>
        <td>${s.melody??'—'}</td>
        <td><span class="badge ${s.average>=17?'badge-green':s.average>=14?'badge-teal':'badge-gold'}">${s.average??'—'}</span></td>
      </tr>`).join('');

  renderStrengths('s-strengths', list);
}

function renderStrengths(containerId, scores){
  const el = document.getElementById(containerId);
  if(!scores || scores.length===0){
    el.innerHTML='<div style="text-align:center;color:var(--text3);font-size:13px;padding:16px;">داده‌ای موجود نیست</div>';
    return;
  }
  const fields = [
    {key:'technique', label:'تکنیک'},
    {key:'rhythm',    label:'ریتم'},
    {key:'melody',    label:'ملودی'},
    {key:'fretboard', label:'فرت‌برد'},
    {key:'ear',       label:'گوش'},
  ];
  el.innerHTML = fields.map(f=>{
    const vals = scores.map(s=>+s[f.key]||0).filter(v=>v>0);
    const avg  = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    const pct  = Math.round((avg/20)*100);
    const color= pct>=80?'var(--green)':pct>=65?'var(--teal)':pct>=50?'var(--gold)':'var(--red)';
    const label= pct>=80?'عالی':pct>=65?'خوب':pct>=50?'متوسط':'نیاز به تمرین';
    const bg   = pct>=80?'linear-gradient(90deg,var(--green),#6ee7b7)':pct>=65?'linear-gradient(90deg,var(--teal),#5eead4)':pct>=50?'linear-gradient(90deg,var(--gold),var(--gold2))':'linear-gradient(90deg,var(--red),#fca5a5)';
    return `<div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;">
        <span style="color:var(--text2)">${f.label}</span>
        <span style="color:${color};font-weight:600">${label} — ${pct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${bg}"></div></div>
    </div>`;
  }).join('');
}


async function loadScoreStudents(){
  const sel = document.getElementById('score-student');
  if(!sel) return;

  const {data: manualStudents} = await sb.from('students')
    .select('id, name')
    .eq('teacher_id', currentUser.id)
    .neq('status', 'inactive')
    .order('name');

  const {data: profileStudents} = await sb.from('profiles')
    .select('id, name')
    .eq('teacher_id', currentUser.id)
    .eq('role', 'student');

  const all = [
    ...(manualStudents  || []).map(s => ({id:s.id, name:s.name, fromStudents:true})),
    ...(profileStudents || []).map(s => ({id:s.id, name:s.name+' ✓', fromStudents:false})),
  ];

  if(all.length === 0){
    sel.innerHTML = '<option value="">-- هنوز هنرجوی فعالی ندارید --</option>';
    return;
  }
  sel.innerHTML = '<option value="">-- انتخاب هنرجو --</option>' +
    all.map(s=>`<option value="${s.id}" data-source="${s.fromStudents?'students':'profiles'}">${s.name}</option>`).join('');

  // وقتی هنرجو انتخاب می‌شه، شماره جلسه بعدی رو پر کن
  sel.onchange = async function(){
    const id = this.value;
    if(!id) return;
    const {data} = await sb.from('scores')
      .select('session_number')
      .eq('student_id', id)
      .order('session_number', {ascending:false})
      .limit(1);
    const next = data && data.length > 0 ? data[0].session_number + 1 : 1;
    document.getElementById('score-session').value = next;
  };
}

async function sendParentMsg(){
  const txt = document.getElementById('parent-msg').value.trim();
  if(!txt){ showNotif('⚠️ پیام خالی است'); return; }
  if(currentUser.pass){ showNotif('✅ پیام ارسال شد (دمو)'); document.getElementById('parent-msg').value=''; return; }

  const toId = currentUser.teacher_id || null;
  const {error} = await sb.from('messages').insert({
    from_id: currentUser.id,
    to_id:   toId,
    body:    txt,
    role:    currentUser.role
  });
  if(error){ showNotif('❌ خطا: '+error.message); return; }
  document.getElementById('parent-msg').value='';
  showNotif('✅ پیام برای مربی ارسال شد');
}

function copyInviteCode(){
  const code = currentUser?.invite_code;
  if(!code) return;
  navigator.clipboard.writeText(code).then(()=> showNotif('✅ کد دعوت کپی شد: '+code));
}

function shareInviteCode(){
  const code = currentUser?.invite_code;
  const name = currentUser?.name || 'مربی';
  if(!code) return;
  const text = `سلام! برای ثبت‌نام در اپ آکادمی موسیقی استاد ${name}، این کد دعوت رو موقع ثبت‌نام وارد کن:\n\n🔑 ${code}\n\nآدرس اپ: https://aminghabel-alt.github.io/music-academy`;
  if(navigator.share){
    navigator.share({ title:'کد دعوت آکادمی موسیقی', text });
  } else {
    navigator.clipboard.writeText(text).then(()=> showNotif('✅ متن اشتراک‌گذاری کپی شد'));
  }
}

/* NOTIF */
let notifTimer=null;
function showNotif(msg){
  const el=document.getElementById('notif-banner');el.textContent=msg;el.style.display='block';
  if(notifTimer)clearTimeout(notifTimer);notifTimer=setTimeout(()=>el.style.display='none',3000);
}
/* STUDENTS */
function showAddStudent(){
  document.getElementById('modal-student').style.display='flex';
}
function closeStudentModal(){
  document.getElementById('modal-student').style.display='none';
}

async function saveStudent(){
  const name=document.getElementById('st-name').value.trim();
  if(!name){showNotif('⚠️ نام هنرجو الزامی است');return;}
  const days=[...document.querySelectorAll('.day-check:checked')].map(c=>c.value);
  const {error}=await sb.from('students').insert({
    teacher_id:currentUser.id,
    name,
    phone:document.getElementById('st-phone').value,
    age:+document.getElementById('st-age').value||null,
    email:document.getElementById('st-email').value,
    instrument:document.getElementById('st-instrument').value,
    level:document.getElementById('st-level').value,
    goal:document.getElementById('st-goal').value,
    class_days:days,
    class_time:document.getElementById('st-time').value,
    class_duration:+document.getElementById('st-duration').value,
    class_type:document.getElementById('st-type').value,
    monthly_fee:+document.getElementById('st-fee').value||null,
    payment_status:document.getElementById('st-payment').value,
    notes:document.getElementById('st-notes').value
  });
  if(error){showNotif('❌ '+error.message);return;}
  showNotif('✅ هنرجو اضافه شد');
  closeStudentModal();
  loadStudents();
}

async function loadStudents(){
  // هنرجوهایی که از طریق کد وصل شدن (جدول profiles)
  const {data:profileStudents} = await sb.from('profiles')
    .select('id,name,email,role,status')
    .eq('teacher_id', currentUser.id)
    .eq('role','student');

  // هنرجوهایی که در جدول students هستن (با اطلاعات کامل)
  const {data:fullStudents} = await sb.from('students')
    .select('*')
    .eq('teacher_id', currentUser.id)
    .order('created_at',{ascending:false});

  const fullMap = {};
  (fullStudents||[]).forEach(s => { if(s.profile_id) fullMap[s.profile_id] = s; });

  const pending  = (profileStudents||[]).filter(p => !fullMap[p.id]);
  const active   = (fullStudents||[]).filter(s => s.status !== 'inactive');
  const inactive = (fullStudents||[]).filter(s => s.status === 'inactive');

  // شمارش
  document.getElementById('pending-count').textContent  = pending.length  + ' نفر';
  document.getElementById('active-count').textContent   = active.length   + ' نفر';
  document.getElementById('inactive-count').textContent = inactive.length + ' نفر';

  // section pending — همیشه نمایش داده می‌شه
  const pendingEl = document.getElementById('students-pending');
  const sectionPending = document.getElementById('section-pending');
  sectionPending.style.display = 'block';
  pendingEl.innerHTML = pending.length === 0
    ? '<div style="grid-column:1/-1;text-align:center;color:var(--text3);padding:20px;font-size:13px;background:var(--bg3);border-radius:var(--radius);">هیچ هنرجوی جدیدی در انتظار تأیید نیست</div>'
    : pending.map(p=>`
    <div class="card" style="border-right:3px solid var(--teal);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="font-size:15px;font-weight:700;">${p.name}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px;">${p.email||''}</div>
          <div style="font-size:11px;color:var(--teal);margin-top:6px;background:var(--teal-dim);display:inline-block;padding:2px 8px;border-radius:10px;">ثبت‌نام کرده — منتظر تأیید</div>
        </div>
        <button onclick="openStudentModal('${p.id}','${p.name.replace(/'/g,"\\'")}','${p.email||''}')"
          style="padding:8px 16px;background:var(--teal);border:none;border-radius:var(--radius-sm);font-size:12px;font-weight:700;color:#0a0a0f;cursor:pointer;font-family:inherit;white-space:nowrap;">
          فعال‌سازی ←
        </button>
      </div>
    </div>`).join('');

  // section active
  const levelMap = {beginner:'مبتدی',intermediate:'متوسط',advanced:'پیشرفته'};
  const payMap   = {paid:'badge-green',pending:'badge-gold',overdue:'badge-red'};
  const payLabel = {paid:'پرداخت شده',pending:'در انتظار',overdue:'معوق'};

  function renderActiveCard(s){
    return `<div class="card" style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="font-size:15px;font-weight:700;">${s.name}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          ${s.instrument ? `<span class="badge badge-teal">${s.instrument}</span>`:''}
          <span class="badge badge-purple">${levelMap[s.level]||s.level||'—'}</span>
          <span class="badge ${payMap[s.payment_status]||'badge-gold'}">${payLabel[s.payment_status]||'—'}</span>
          <button onclick="setStudentStatus('${s.id}','inactive')"
            style="padding:3px 10px;background:var(--red-dim);border:1px solid rgba(248,113,113,0.2);border-radius:5px;font-size:11px;color:var(--red);cursor:pointer;font-family:inherit;">
            غیرفعال
          </button>
        </div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text2);">
        ${s.phone         ? `<span>📞 ${s.phone}</span>`:''}
        ${s.age           ? `<span>🎂 ${s.age} سال</span>`:''}
        ${s.class_time    ? `<span>🕐 ${s.class_time}</span>`:''}
        ${s.class_days?.length ? `<span>📅 ${s.class_days.join('، ')}</span>`:''}
        ${s.class_duration? `<span>⏱ ${s.class_duration} دقیقه</span>`:''}
        <span>${s.class_type==='online'?'💻 آنلاین':'🏫 حضوری'}</span>
      </div>
      ${s.notes ? `<div style="font-size:12px;color:var(--text3);padding:8px;background:var(--bg3);border-radius:6px;">${s.notes}</div>`:''}
    </div>`;
  }

  document.getElementById('students-list').innerHTML = active.length===0
    ? '<div style="text-align:center;color:var(--text3);padding:20px;font-size:13px;">هنوز هنرجوی فعالی ندارید</div>'
    : active.map(renderActiveCard).join('');

  document.getElementById('students-archive').innerHTML = inactive.length===0
    ? '<div style="text-align:center;color:var(--text3);padding:12px;font-size:12px;">آرشیوی وجود ندارد</div>'
    : inactive.map(s=>`
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:14px;font-weight:600;">${s.name}</div>
          <div style="font-size:12px;color:var(--text2)">${s.instrument||''} ${s.level?'· '+levelMap[s.level]:''}</div>
        </div>
        <button onclick="setStudentStatus('${s.id}','active')"
          style="padding:5px 14px;background:var(--green-dim);border:1px solid rgba(74,222,128,0.3);border-radius:5px;font-size:12px;color:var(--green);cursor:pointer;font-family:inherit;">
          فعال‌سازی مجدد
        </button>
      </div>`).join('');
}

function openStudentModal(profileId, name, email){
  document.getElementById('st-profile-id').value = profileId;
  document.getElementById('modal-student-name').textContent = name;
  document.getElementById('modal-student-title').textContent = 'تکمیل اطلاعات: '+name;
  // پاک‌سازی فرم
  ['st-phone','st-age','st-time','st-fee','st-notes'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.querySelectorAll('.day-check').forEach(c=>c.checked=false);
  document.getElementById('modal-student').style.display='flex';
}

function showAddStudent(){ openStudentModal('','هنرجوی جدید',''); }
function closeStudentModal(){ document.getElementById('modal-student').style.display='none'; }

async function activateStudent(){
  const profileId = document.getElementById('st-profile-id').value;
  const name      = document.getElementById('modal-student-name').textContent;
  const days      = [...document.querySelectorAll('.day-check:checked')].map(c=>c.value);

  const data = {
    teacher_id:      currentUser.id,
    profile_id:      profileId || null,
    name,
    phone:           document.getElementById('st-phone').value,
    age:             +document.getElementById('st-age').value || null,
    instrument:      document.getElementById('st-instrument').value,
    level:           document.getElementById('st-level').value,
    goal:            document.getElementById('st-goal').value,
    class_days:      days,
    class_time:      document.getElementById('st-time').value,
    class_duration:  +document.getElementById('st-duration').value,
    class_type:      document.getElementById('st-type').value,
    monthly_fee:     +document.getElementById('st-fee').value || null,
    payment_status:  document.getElementById('st-payment').value,
    notes:           document.getElementById('st-notes').value,
    status:          'active'
  };

  const {error} = await sb.from('students').insert(data);
  if(error){ showNotif('❌ خطا: '+error.message); return; }

  showNotif('✅ '+name+' فعال شد!');
  closeStudentModal();
  loadStudents();
  loadScoreStudents();
}

async function saveStudent(){ await activateStudent(); }

async function setStudentStatus(id, status){
  const {error} = await sb.from('students').update({status}).eq('id',id);
  if(error){ showNotif('❌ خطا: '+error.message); return; }
  showNotif(status==='active' ? '✅ هنرجو فعال شد' : '📦 هنرجو به آرشیو رفت');
  loadStudents();
  loadScoreStudents();
}

async function loadRecentScores(){
  const {data} = await sb.from('scores')
    .select('*, students(name)')
    .eq('teacher_id', currentUser.id)
    .order('created_at', {ascending:false})
    .limit(15);

  const tbody = document.getElementById('recent-scores-tbody');
  if(!tbody) return;
  if(!data || data.length===0){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3)">هنوز نمره‌ای ثبت نشده</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(s=> s.is_absent
    ? `<tr style="opacity:0.65">
        <td style="font-weight:600">${s.students?.name||'—'}</td>
        <td>${s.session_number}</td>
        <td colspan="2" style="color:var(--red);font-size:12px;">🚫 غیبت</td>
        <td style="color:var(--text3);font-size:11px">${new Date(s.created_at).toLocaleDateString('fa-IR')}</td>
      </tr>`
    : `<tr>
        <td style="font-weight:600">${s.students?.name||'—'}</td>
        <td>${s.session_number}</td>
        <td><span class="badge ${s.average>=17?'badge-green':s.average>=14?'badge-teal':'badge-gold'}">${s.average??'—'}</span></td>
        <td style="font-size:12px;color:var(--text3)">${s.comment||''}</td>
        <td style="color:var(--text3);font-size:11px">${new Date(s.created_at).toLocaleDateString('fa-IR')}</td>
      </tr>`).join('');
}

document.getElementById('login-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});