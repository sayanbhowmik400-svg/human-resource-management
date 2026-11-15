/* ===================== Constants & helpers ===================== */
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW=['Su','Mo','Tu','We','Th','Fr','Sa'];

function pad2(n){return String(n).padStart(2,'0');}
function ymd(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function fmtDate(d){return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
function todayKey(){return ymd(new Date());}
function initials(name){return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function money(n){return '₹'+Number(n||0).toLocaleString('en-IN');}
function sameId(a,b){return String(a)===String(b);}

/* ===================== API layer ===================== */
async function api(path, {method='GET', body}={}){
  const headers={'Content-Type':'application/json'};
  if(state.token) headers.Authorization='Bearer '+state.token;
  const res=await fetch(path, {method, headers, body: body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}

/* ===================== App state ===================== */
const state = {
  token: localStorage.getItem('mhr_token') || null,
  user: JSON.parse(localStorage.getItem('mhr_user') || 'null'),
  view: 'auth', authMode:'signin', authError:'', signupError:'',
  activeEmpId: null, nav:'dashboard',
  cache:{ employees:null, profile:null, attendanceRecords:[], leaveAll:null, payroll:null, payrollAll:null },
  editingProfile:false, attendanceMode:'weekly',
  leaveSelStart:null, leaveSelEnd:null, leaveCalOffset:0,
  payrollEditing:false, toast:null, busy:false
};
if(state.token && state.user){ state.view='app'; state.activeEmpId=state.user._id; }

function isAdmin(){ return state.user && state.user.role==='HR'; }
function showToast(msg){
  state.toast=msg; render();
  setTimeout(()=>{
    const t=document.querySelector('.toast');
    if(t){ t.classList.add('toast-hide'); }
    setTimeout(()=>{ state.toast=null; render(); },220);
  },2600);
}
function statusBadgeClass(s){
  return {Present:'badge-green',Absent:'badge-red','Half-day':'badge-amber',Leave:'badge-blue',
    Approved:'badge-green',Pending:'badge-amber',Rejected:'badge-red'}[s]||'badge-ink';
}

/* ===================== Root render ===================== */
function render(){
  const app=document.getElementById('app');
  app.innerHTML = state.view==='auth' ? authScreen() : appShell();
  attachHandlers();
  const old=document.querySelector('.toast'); if(old) old.remove();
  if(state.toast){
    const t=document.createElement('div'); t.className='toast'; t.textContent=state.toast;
    document.body.appendChild(t);
  }
}

/* ===================== Auth screen ===================== */
function authScreen(){
  const isSignin = state.authMode==='signin';
  return `
  <div class="auth-wrap">
    <div class="auth-side">
      <div class="grid-lines"></div>
      <div class="auth-side-content">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:60px;">
          <div class="brand-mark">M</div>
          <div><div class="brand-name">Meridian HR</div><div class="brand-tag">Every workday, perfectly aligned.</div></div>
        </div>
        <div class="stamp-quote">"Attendance, leave, and payroll — stamped, filed, and always in order."</div>
      </div>
    </div>
    <div class="auth-form-wrap">
      <div class="auth-box">
        <div class="tab-row">
          <button class="tab-btn ${isSignin?'active':''}" data-action="auth-tab" data-tab="signin">Sign in</button>
          <button class="tab-btn ${!isSignin?'active':''}" data-action="auth-tab" data-tab="signup">Sign up</button>
        </div>
        ${isSignin ? signinForm() : signupForm()}
      </div>
    </div>
  </div>`;
}

function signinForm(){
  return `
  <h2 style="margin-bottom:18px;">Welcome back</h2>
  <div class="field-group"><label class="field-label">Email</label>
    <input class="field" id="in-email" placeholder="you@company.com"></div>
  <div class="field-group"><label class="field-label">Password</label>
    <input class="field" id="in-pass" type="password" placeholder="••••••••"></div>
  ${state.authError ? `<div class="err-text">${state.authError}</div>` : ''}
  <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px;" data-action="signin" ${state.busy?'disabled':''}>
    ${state.busy?'Signing in…':'Sign in'}</button>`;
}

function signupForm(){
  return `
  <h2 style="margin-bottom:18px;">Create your account</h2>
  <div class="field-group"><label class="field-label">Employee ID</label><input class="field" id="up-empid" placeholder="EMP-1005"></div>
  <div class="field-group"><label class="field-label">Full name</label><input class="field" id="up-name" placeholder="Jordan Lee"></div>
  <div class="field-group"><label class="field-label">Email</label><input class="field" id="up-email" placeholder="you@company.com"></div>
  <div class="field-group"><label class="field-label">Password</label>
    <input class="field" id="up-pass" type="password" placeholder="At least 8 characters, 1 number">
    <div class="help-text">Use at least 8 characters with a letter and a number.</div></div>
  <div class="field-group"><label class="field-label">Role</label>
    <select class="field" id="up-role"><option value="Employee">Employee</option><option value="HR">HR</option></select></div>
  ${state.signupError ? `<div class="err-text">${state.signupError}</div>` : ''}
  <button class="btn btn-gold" style="width:100%;justify-content:center;margin-top:8px;" data-action="signup" ${state.busy?'disabled':''}>
    ${state.busy?'Creating…':'Create account'}</button>`;
}

/* ===================== App shell ===================== */
function appShell(){
  return `
  <div class="shell">
    <div class="sidebar">
      <div class="brand"><div class="brand-mark">M</div><div><div class="brand-name">Meridian HR</div></div></div>
      <div class="nav">
        ${navItem('dashboard','⌂','Dashboard')}
        ${isAdmin() ? navItem('employees','☰','Employees') : navItem('profile','◍','Profile')}
        ${navItem('attendance','▤','Attendance')}
        ${navItem('leave','◷','Leave'+(isAdmin()?' Approvals':''))}
        ${navItem('payroll','฿','Payroll')}
      </div>
      <div class="nav-foot">
        <div class="user-chip">
          <div class="avatar" style="background:${state.user.avatarColor}">${initials(state.user.name)}</div>
          <div><div class="user-chip-name">${state.user.name}</div><div class="user-chip-role">${state.user.role==='HR'?'HR Officer':'Employee'}</div></div>
        </div>
        <button class="nav-item" data-action="logout" style="margin-top:6px;"><span class="nav-icon">⏻</span> Log out</button>
      </div>
    </div>
    <div class="main">
      ${state.activeEmpId && !sameId(state.activeEmpId, state.user._id) ? viewingBanner() : ''}
      <div id="view-slot">${loadingBlock()}</div>
    </div>
  </div>`;
}

function navItem(key,icon,label){
  return `<button class="nav-item ${state.nav===key?'active':''}" data-action="nav" data-nav="${key}"><span class="nav-icon">${icon}</span> ${label}</button>`;
}
function viewingBanner(){
  const name = state.cache.profile ? state.cache.profile.name : '…';
  return `<div class="badge badge-blue" style="margin-bottom:16px;">Viewing as HR — ${name}'s records
    <button class="btn btn-ghost btn-sm" style="margin-left:10px;padding:2px 8px;" data-action="stop-viewing">Back to my view</button></div>`;
}
function loadingBlock(){ return `<div class="empty-state loading">Loading…</div>`; }

/* After the shell paints, load whichever view is active */
function loadCurrentView(){
  switch(state.nav){
    case 'dashboard': return isAdmin() ? loadAdminDashboard() : loadEmployeeDashboard();
    case 'employees': return loadEmployeesView();
    case 'profile': return loadProfileView();
    case 'attendance': return loadAttendanceView();
    case 'leave': return loadLeaveView();
    case 'payroll': return loadPayrollView();
  }
}
function paintView(html){
  const slot=document.getElementById('view-slot');
  if(slot) slot.innerHTML=`<div class="view-anim">${html}</div>`;
  attachHandlers();
}

/* ===================== Dashboard ===================== */
async function loadEmployeeDashboard(){
  try{
    const [records, leaves] = await Promise.all([
      api(`/api/attendance/${state.user._id}?year=${new Date().getFullYear()}&month=${new Date().getMonth()+1}`),
      api('/api/leave')
    ]);
    const today = records.find(r=>r.date===todayKey());
    const pending = leaves.filter(l=>l.status==='Pending').length;
    const recent = leaves.slice(0,4);
    paintView(`
    <div class="topbar">
      <div><div class="eyebrow">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
        <h1 class="section-title" style="font-size:26px;">Good to see you, ${state.user.name.split(' ')[0]}.</h1></div>
      <span class="badge ${today?statusBadgeClass(today.status):'badge-ink'}">${today?today.status+' today':'Not checked in yet'}</span>
    </div>
    <div class="grid cols-4" style="margin-bottom:24px;">
      ${dashCard('◍','Profile','View & edit your details','profile')}
      ${dashCard('▤','Attendance','Check in and track hours','attendance')}
      ${dashCard('◷','Leave Requests', pending+' pending request'+(pending===1?'':'s'),'leave')}
      ${dashCard('⏻','Logout','End your session', null, 'logout')}
    </div>
    <div class="card pad">
      <h3 style="font-size:15px;margin-bottom:12px;">Recent leave activity</h3>
      ${recent.length===0?`<div class="empty-state">No leave requests yet.</div>`:
        recent.map(l=>`<div class="kv-row"><span class="k">${l.type} · ${fmtDate(new Date(l.start))}</span><span class="v"><span class="badge ${statusBadgeClass(l.status)}" style="font-size:11px;">${l.status}</span></span></div>`).join('')}
    </div>`);
  }catch(e){ paintView(errorBlock(e)); }
}

async function loadAdminDashboard(){
  try{
    const [employees, leaves] = await Promise.all([api('/api/employees'), api('/api/leave')]);
    state.cache.employees=employees;
    const y=new Date().getFullYear(), m=new Date().getMonth()+1;
    const todayRecords = await Promise.all(employees.map(e=>api(`/api/attendance/${e._id}?year=${y}&month=${m}`)));
    const presentToday = todayRecords.filter(recs=>{
      const t=recs.find(r=>r.date===todayKey());
      return t && (t.status==='Present'||t.status==='Half-day');
    }).length;
    const pendingLeaves = leaves.filter(l=>l.status==='Pending');
    paintView(`
    <div class="topbar"><div><div class="eyebrow">HR overview</div>
      <h1 class="section-title" style="font-size:26px;">Welcome back, ${state.user.name.split(' ')[0]}.</h1></div></div>
    <div class="grid cols-4" style="margin-bottom:24px;">
      ${statCard('Total employees', employees.length)}
      ${statCard('Present today', presentToday+' / '+employees.length)}
      ${statCard('Pending leave requests', pendingLeaves.length)}
      ${statCard('Payroll status', 'Up to date')}
    </div>
    <div class="grid cols-2">
      <div class="card pad">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:15px;">Employees</h3><button class="btn btn-ghost btn-sm" data-action="nav" data-nav="employees">View all</button>
        </div>
        <table class="tbl"><tr><th>Name</th><th>Department</th><th>Today</th></tr>
        ${employees.map((e,i)=>{const t=todayRecords[i].find(r=>r.date===todayKey());return `
        <tr class="clickable" data-action="view-employee" data-id="${e._id}">
          <td>${e.name}</td><td>${e.department}</td>
          <td><span class="badge ${t?statusBadgeClass(t.status):'badge-ink'}" style="font-size:11px;">${t?t.status:'—'}</span></td>
        </tr>`;}).join('')}
        </table>
      </div>
      <div class="card pad">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:15px;">Pending leave approvals</h3><button class="btn btn-ghost btn-sm" data-action="nav" data-nav="leave">View all</button>
        </div>
        ${pendingLeaves.length===0?`<div class="empty-state">No pending requests. All caught up.</div>`:
          pendingLeaves.slice(0,4).map(l=>`
          <div class="kv-row"><span class="k">${l.user.name} — ${l.type} (${fmtDate(new Date(l.start))})</span>
          <span><button class="btn btn-sm btn-primary" data-action="leave-decide" data-id="${l._id}" data-decision="Approved">Approve</button>
          <button class="btn btn-sm btn-danger" data-action="leave-decide" data-id="${l._id}" data-decision="Rejected">Reject</button></span></div>`).join('')}
      </div>
    </div>`);
  }catch(e){ paintView(errorBlock(e)); }
}

function dashCard(icon,title,sub,nav,action){
  return `<button class="card pad" style="text-align:left;display:flex;flex-direction:column;gap:8px;border:1px solid var(--line);"
    data-action="${action?action:'nav'}" ${nav?`data-nav="${nav}"`:''}>
    <div style="font-size:20px;color:var(--gold);">${icon}</div>
    <div style="font-weight:600;color:var(--heading);">${title}</div>
    <div style="font-size:12.5px;color:var(--text-soft);">${sub}</div></button>`;
}
function statCard(label,val){
  return `<div class="card pad"><div style="font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-soft);margin-bottom:6px;">${label}</div><div class="display" style="font-size:28px;">${val}</div></div>`;
}
function errorBlock(e){ return `<div class="card pad"><div class="empty-state">${e.message}</div></div>`; }

/* ===================== Employees list (admin) ===================== */
async function loadEmployeesView(){
  try{
    const employees = await api('/api/employees');
    state.cache.employees=employees;
    paintView(`
    <div class="topbar"><div><div class="eyebrow">Admin</div><h1 class="section-title">Employees</h1></div></div>
    <div class="card pad"><table class="tbl">
      <tr><th>Employee</th><th>ID</th><th>Department</th><th>Designation</th><th>Role</th><th></th></tr>
      ${employees.map(e=>`<tr>
        <td style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:26px;height:26px;font-size:11px;background:${e.avatarColor}">${initials(e.name)}</div>${e.name}</td>
        <td class="mono">${e.empId}</td><td>${e.department}</td><td>${e.designation}</td>
        <td><span class="badge badge-ink">${e.role}</span></td>
        <td><button class="btn btn-ghost btn-sm" data-action="view-employee" data-id="${e._id}">Open profile</button></td>
      </tr>`).join('')}
    </table></div>`);
  }catch(e){ paintView(errorBlock(e)); }
}

/* ===================== Profile ===================== */
async function loadProfileView(){
  try{
    const emp = await api(`/api/employees/${state.activeEmpId}`);
    state.cache.profile=emp;
    paintView(profileHTML(emp));
  }catch(e){ paintView(errorBlock(e)); }
}
function profileHTML(emp){
  const canEditAll = isAdmin();
  const edit = state.editingProfile;
  return `
  <div class="topbar">
    <div><div class="eyebrow">${canEditAll && !sameId(emp._id,state.user._id)?'Employee record':'My profile'}</div><h1 class="section-title">${emp.name}</h1></div>
    <div>${edit ? `<button class="btn btn-primary" data-action="save-profile">Save changes</button>
      <button class="btn btn-ghost" data-action="cancel-edit-profile" style="margin-left:8px;">Cancel</button>`
      : `<button class="btn btn-gold" data-action="edit-profile">Edit profile</button>`}</div>
  </div>
  <div class="grid cols-2">
    <div class="card pad"><h3 style="font-size:14px;margin-bottom:14px;">Personal details</h3>
      ${profField('Full name','name',emp.name, canEditAll && edit)}
      ${profField('Email','email',emp.email, canEditAll && edit)}
      ${profField('Phone','phone',emp.phone, edit)}
      ${profField('Address','address',emp.address, edit)}
    </div>
    <div class="card pad"><h3 style="font-size:14px;margin-bottom:14px;">Job details</h3>
      <div class="kv-row"><span class="k">Employee ID</span><span class="v mono">${emp.empId}</span></div>
      ${profField('Department','department',emp.department, canEditAll && edit)}
      ${profField('Designation','designation',emp.designation, canEditAll && edit)}
      <div class="kv-row"><span class="k">Reporting manager</span><span class="v">${emp.manager}</span></div>
      <div class="kv-row"><span class="k">Date joined</span><span class="v">${fmtDate(new Date(emp.joinDate))}</span></div>
    </div>
  </div>
  <div class="grid cols-2" style="margin-top:16px;">
    <div class="card pad"><h3 style="font-size:14px;margin-bottom:14px;">Salary structure (summary)</h3>
      <div class="kv-row"><span class="k">Net monthly pay</span><span class="v" style="font-size:16px;">${money(netPay(emp.salary))}</span></div>
      <div class="help-text">Full breakdown and editing available under Payroll.</div></div>
    <div class="card pad"><h3 style="font-size:14px;margin-bottom:14px;">Documents</h3>
      ${(emp.documents||[]).map(d=>`<div class="doc-row"><span>📄 ${d}</span><span class="help-text">On file</span></div>`).join('') || `<div class="empty-state">No documents uploaded.</div>`}
    </div>
  </div>`;
}
function profField(label,key,val,editable){
  if(!editable) return `<div class="kv-row"><span class="k">${label}</span><span class="v">${val||'—'}</span></div>`;
  return `<div class="field-group"><label class="field-label">${label}</label><input class="field" id="pf-${key}" value="${(val||'').replace(/"/g,'&quot;')}"></div>`;
}
function netPay(s){ return s.basic+s.hra+s.allowances-s.deductions; }

/* ===================== Attendance ===================== */
async function loadAttendanceView(){
  try{
    const empId = state.activeEmpId;
    const now=new Date(); const y=now.getFullYear(), m=now.getMonth()+1;
    const [emp, records] = await Promise.all([
      sameId(empId,state.user._id) ? Promise.resolve(state.user) : api(`/api/employees/${empId}`),
      api(`/api/attendance/${empId}?year=${y}&month=${m}`)
    ]);
    state.cache.profile=emp; state.cache.attendanceRecords=records;
    paintView(attendanceHTML(emp, records, now));
  }catch(e){ paintView(errorBlock(e)); }
}
function attendanceHTML(emp, records, now){
  const isSelf = sameId(emp._id, state.user._id);
  const today = records.find(r=>r.date===todayKey());
  const recMap={}; records.forEach(r=>recMap[r.date]=r);
  return `
  <div class="topbar">
    <div><div class="eyebrow">Attendance</div><h1 class="section-title">${isSelf?'Your attendance':emp.name+"'s attendance"}</h1></div>
    ${isAdmin() ? employeePicker() : ''}
  </div>
  ${isSelf ? punchTicket(today) : ''}
  <div style="height:20px;"></div>
  <div class="card pad">
    <div class="cal-head">
      <h3 style="font-size:15px;">${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}</h3>
      <div class="pill-select">
        <button class="${state.attendanceMode==='daily'?'active':''}" data-action="att-mode" data-mode="daily">Daily</button>
        <button class="${state.attendanceMode==='weekly'?'active':''}" data-action="att-mode" data-mode="weekly">Weekly</button>
      </div>
    </div>
    ${state.attendanceMode==='weekly' ? monthCalendar(now.getFullYear(),now.getMonth(),recMap) : dailyList(records)}
    <div class="legend">${legendDot('var(--green)','Present')}${legendDot('var(--amber)','Half-day')}${legendDot('var(--red)','Absent')}${legendDot('var(--blue)','Leave')}</div>
  </div>`;
}
function employeePicker(){
  const employees=state.cache.employees||[];
  return `<select class="field" style="width:220px;" id="emp-picker">
    ${employees.map(e=>`<option value="${e._id}" ${sameId(e._id,state.activeEmpId)?'selected':''}>${e.name}</option>`).join('')}
  </select>`;
}
function punchTicket(rec){
  const checkedIn = rec && rec.checkIn;
  const checkedOut = rec && rec.checkOut;
  return `<div class="ticket">
    <div class="ticket-stub"><div class="ticket-label">Check in</div>
      <div class="ticket-time ${checkedIn?'':'empty'}">${checkedIn||'--:--'}</div>
      ${checkedIn?`<div class="stamp">✓ Stamped</div>`:`<button class="btn btn-gold btn-sm" style="margin-top:10px;" data-action="check-in">Check in now</button>`}
    </div>
    <div class="ticket-divider"></div>
    <div class="ticket-stub out"><div class="ticket-label">Check out</div>
      <div class="ticket-time ${checkedOut?'':'empty'}">${checkedOut||'--:--'}</div>
      ${checkedOut?`<div class="stamp">✓ Stamped</div>`:checkedIn?`<button class="btn btn-ghost btn-sm" style="margin-top:10px;" data-action="check-out">Check out</button>`:`<div class="help-text" style="margin-top:10px;">Check in first</div>`}
    </div></div>`;
}
function legendDot(color,label){return `<div class="legend-item"><span class="legend-dot" style="background:${color}"></span>${label}</div>`;}
function monthCalendar(y,m,recMap){
  const first=new Date(y,m,1); const startDow=first.getDay();
  const daysInMonth=new Date(y,m+1,0).getDate();
  let cells=`<div class="cal-grid">`;
  DOW.forEach(d=>cells+=`<div class="cal-dow">${d}</div>`);
  for(let i=0;i<startDow;i++) cells+=`<div class="cal-cell empty"></div>`;
  const colorMap={Present:'var(--green)',Absent:'var(--red)','Half-day':'var(--amber)',Leave:'var(--blue)'};
  for(let day=1;day<=daysInMonth;day++){
    const d=new Date(y,m,day); const key=ymd(d); const rec=recMap[key]; const isToday=key===todayKey();
    cells+=`<div class="cal-cell" style="${isToday?'border-color:var(--gold);border-width:2px;':''}">
      <div class="num">${day}</div>${rec?`<div class="mark" style="background:${colorMap[rec.status]}"></div>`:''}</div>`;
  }
  cells+=`</div>`; return cells;
}
function dailyList(records){
  const sorted=records.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const rows=sorted.map(r=>`<tr><td>${fmtDate(new Date(r.date))}</td>
    <td><span class="badge ${statusBadgeClass(r.status)}">${r.status}</span></td>
    <td class="mono">${r.checkIn||'—'}</td><td class="mono">${r.checkOut||'—'}</td></tr>`).join('');
  return `<table class="tbl"><tr><th>Date</th><th>Status</th><th>Check in</th><th>Check out</th></tr>${rows||`<tr><td colspan="4" class="empty-state">No records yet this month.</td></tr>`}</table>`;
}

/* ===================== Leave ===================== */
async function loadLeaveView(){
  try{
    const all = await api('/api/leave');
    state.cache.leaveAll=all;
    if(isAdmin() && sameId(state.activeEmpId, state.user._id)){
      paintView(leaveApprovalsHTML(all));
    } else if(sameId(state.activeEmpId, state.user._id)){
      paintView(leaveApplyHTML(all.filter(l=>sameId(l.user._id||l.user, state.user._id))));
    } else {
      const mine = all.filter(l=>sameId(l.user._id||l.user, state.activeEmpId));
      const emp = state.cache.profile || await api(`/api/employees/${state.activeEmpId}`);
      paintView(leaveReadOnlyHTML(emp, mine));
    }
  }catch(e){ paintView(errorBlock(e)); }
}
function leaveApplyHTML(mine){
  const now=new Date(); const base=new Date(now.getFullYear(), now.getMonth()+state.leaveCalOffset, 1);
  const y=base.getFullYear(), m=base.getMonth();
  return `
  <div class="topbar"><div><div class="eyebrow">Leave &amp; time-off</div><h1 class="section-title">Apply for leave</h1></div></div>
  <div class="grid cols-2">
    <div class="card pad"><h3 style="font-size:14px;margin-bottom:12px;">Select dates</h3>
      <div class="cal-head">
        <button class="btn btn-ghost btn-sm" data-action="leave-cal-nav" data-dir="-1">‹ Prev</button>
        <strong>${MONTH_NAMES[m]} ${y}</strong>
        <button class="btn btn-ghost btn-sm" data-action="leave-cal-nav" data-dir="1">Next ›</button>
      </div>
      ${leavePickCalendar(y,m)}
      <div class="help-text" style="margin-top:10px;">Click a start date, then an end date. ${state.leaveSelStart?('Selected: '+fmtDate(new Date(state.leaveSelStart))+(state.leaveSelEnd?' – '+fmtDate(new Date(state.leaveSelEnd)):'')):''}</div>
    </div>
    <div class="card pad"><h3 style="font-size:14px;margin-bottom:12px;">Request details</h3>
      <div class="field-group"><label class="field-label">Leave type</label>
        <select class="field" id="leave-type"><option>Paid</option><option>Sick</option><option>Unpaid</option></select></div>
      <div class="field-group"><label class="field-label">Remarks</label>
        <textarea class="field" id="leave-remarks" rows="3" placeholder="Add a short note for your manager"></textarea></div>
      <button class="btn btn-primary" data-action="submit-leave" ${state.leaveSelStart?'':'disabled'}>Submit request</button>
    </div>
  </div>
  <div class="card pad" style="margin-top:16px;"><h3 style="font-size:14px;margin-bottom:12px;">Request history</h3>
    ${leaveTable(mine)}</div>`;
}
function leaveReadOnlyHTML(emp, records){
  return `
  <div class="topbar"><div><div class="eyebrow">Leave</div><h1 class="section-title">${emp.name}'s leave</h1></div></div>
  <div class="card pad">${leaveTable(records)}</div>`;
}
function leaveTable(records){
  if(records.length===0) return `<div class="empty-state">No leave requests yet.</div>`;
  return `<table class="tbl"><tr><th>Type</th><th>Dates</th><th>Remarks</th><th>Status</th><th>Comment</th></tr>
    ${records.map(l=>`<tr><td>${l.type}</td>
      <td>${fmtDate(new Date(l.start))}${l.start!==l.end?' – '+fmtDate(new Date(l.end)):''}</td>
      <td style="max-width:220px;">${l.remarks}</td>
      <td><span class="badge ${statusBadgeClass(l.status)}">${l.status}</span></td>
      <td style="color:var(--text-soft);">${l.comment||'—'}</td></tr>`).join('')}</table>`;
}
function leavePickCalendar(y,m){
  const first=new Date(y,m,1); const startDow=first.getDay();
  const daysInMonth=new Date(y,m+1,0).getDate();
  let cells=`<div class="cal-grid">`;
  DOW.forEach(d=>cells+=`<div class="cal-dow">${d}</div>`);
  for(let i=0;i<startDow;i++) cells+=`<div class="cal-cell empty"></div>`;
  for(let day=1;day<=daysInMonth;day++){
    const d=new Date(y,m,day); const key=ymd(d);
    let cls='cal-cell selectable';
    if(state.leaveSelStart && key===state.leaveSelStart) cls+=' range-end';
    else if(state.leaveSelEnd && key===state.leaveSelEnd) cls+=' range-end';
    else if(state.leaveSelStart && state.leaveSelEnd && key>state.leaveSelStart && key<state.leaveSelEnd) cls+=' in-range';
    cells+=`<div class="${cls}" data-action="leave-pick-day" data-key="${key}"><div class="num">${day}</div></div>`;
  }
  cells+=`</div>`; return cells;
}
function leaveApprovalsHTML(all){
  const sorted=all.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  return `
  <div class="topbar"><div><div class="eyebrow">HR</div><h1 class="section-title">Leave approvals</h1></div></div>
  <div class="card pad"><table class="tbl">
    <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Remarks</th><th>Status</th><th></th></tr>
    ${sorted.map(l=>`<tr>
      <td>${l.user.name}</td><td>${l.type}</td>
      <td>${fmtDate(new Date(l.start))}${l.start!==l.end?' – '+fmtDate(new Date(l.end)):''}</td>
      <td style="max-width:220px;">${l.remarks}</td>
      <td><span class="badge ${statusBadgeClass(l.status)}">${l.status}</span></td>
      <td>${l.status==='Pending'?`
        <button class="btn btn-sm btn-primary" data-action="leave-decide" data-id="${l._id}" data-decision="Approved">Approve</button>
        <button class="btn btn-sm btn-danger" data-action="leave-decide" data-id="${l._id}" data-decision="Rejected">Reject</button>`
        :`<span class="help-text">${l.comment||'—'}</span>`}</td>
    </tr>`).join('')}
  </table></div>`;
}

/* ===================== Payroll ===================== */
async function loadPayrollView(){
  try{
    if(isAdmin() && sameId(state.activeEmpId, state.user._id)){
      const all = await api('/api/payroll');
      state.cache.payrollAll=all;
      paintView(payrollAdminOverviewHTML(all));
    } else {
      const emp = await api(`/api/payroll/${state.activeEmpId}`);
      state.cache.payroll=emp;
      paintView(payrollHTML(emp));
    }
  }catch(e){ paintView(errorBlock(e)); }
}
function payrollHTML(emp){
  const s=emp.salary;
  const canEdit = isAdmin() && !sameId(emp._id, state.user._id);
  const editing = state.payrollEditing;
  return `
  <div class="topbar">
    <div><div class="eyebrow">Payroll</div><h1 class="section-title">${sameId(emp._id,state.user._id)?'My payroll':emp.name+"'s payroll"}</h1></div>
    ${canEdit && !editing ? `<button class="btn btn-gold" data-action="edit-payroll">Edit salary structure</button>`:''}
    ${canEdit && editing ? `<button class="btn btn-primary" data-action="save-payroll">Save</button> <button class="btn btn-ghost" data-action="cancel-payroll" style="margin-left:8px;">Cancel</button>`:''}
  </div>
  <div class="grid cols-2">
    <div class="card pad"><h3 style="font-size:14px;margin-bottom:14px;">Monthly breakdown</h3>
      ${payrollRow('Basic pay','basic',s.basic,canEdit&&editing)}
      ${payrollRow('HRA','hra',s.hra,canEdit&&editing)}
      ${payrollRow('Allowances','allowances',s.allowances,canEdit&&editing)}
      ${payrollRow('Deductions','deductions',s.deductions,canEdit&&editing)}
      <div class="divider"></div>
      <div class="kv-row"><span class="k" style="font-weight:600;color:var(--heading);">Net pay</span><span class="v" style="font-size:18px;">${money(netPay(s))}</span></div>
    </div>
    <div class="card pad"><h3 style="font-size:14px;margin-bottom:14px;">Payslip history</h3>
      ${['June 2026','May 2026','April 2026'].map(mo=>`<div class="doc-row"><span>${mo}</span><span class="badge badge-green" style="font-size:11px;">Paid</span></div>`).join('')}
      <div class="help-text" style="margin-top:10px;">${sameId(emp._id,state.user._id)?'Payroll figures are read-only for employees.':''}</div>
    </div>
  </div>`;
}
function payrollRow(label,key,val,editable){
  if(!editable) return `<div class="kv-row"><span class="k">${label}</span><span class="v">${money(val)}</span></div>`;
  return `<div class="field-group"><label class="field-label">${label}</label><input class="field mono" id="pr-${key}" type="number" value="${val}"></div>`;
}
function payrollAdminOverviewHTML(all){
  return `
  <div class="topbar"><div><div class="eyebrow">HR</div><h1 class="section-title">Payroll — all employees</h1></div></div>
  <div class="card pad"><table class="tbl">
    <tr><th>Employee</th><th>Basic</th><th>HRA</th><th>Allowances</th><th>Deductions</th><th>Net pay</th><th></th></tr>
    ${all.map(e=>`<tr><td>${e.name}</td><td class="mono">${money(e.salary.basic)}</td><td class="mono">${money(e.salary.hra)}</td>
      <td class="mono">${money(e.salary.allowances)}</td><td class="mono">${money(e.salary.deductions)}</td>
      <td class="mono" style="font-weight:600;">${money(e.netPay)}</td>
      <td><button class="btn btn-ghost btn-sm" data-action="view-employee-payroll" data-id="${e.id}">Manage</button></td>
    </tr>`).join('')}
  </table></div>`;
}

/* ===================== Event handling ===================== */
function attachHandlers(){
  const root=document.getElementById('app');
  root.onclick=(e)=>{ const el=e.target.closest('[data-action]'); if(el) handleAction(el.dataset.action, el); };
  const picker=document.getElementById('emp-picker');
  if(picker) picker.onchange=()=>{ state.activeEmpId=picker.value; loadCurrentView(); };
}

async function handleAction(action, el){
  switch(action){
    case 'auth-tab': state.authMode=el.dataset.tab; state.authError=''; state.signupError=''; render(); break;
    case 'signin': await doLogin(document.getElementById('in-email').value.trim(), document.getElementById('in-pass').value); break;
    case 'signup': await doSignup(); break;
    case 'logout': doLogout(); break;
    case 'nav':
      state.nav=el.dataset.nav; state.editingProfile=false; state.payrollEditing=false;
      state.activeEmpId=state.user._id; render(); loadCurrentView(); break;
    case 'view-employee': state.activeEmpId=el.dataset.id; state.nav='profile'; render(); loadCurrentView(); break;
    case 'view-employee-payroll': state.activeEmpId=el.dataset.id; state.nav='payroll'; render(); loadCurrentView(); break;
    case 'stop-viewing': state.activeEmpId=state.user._id; render(); loadCurrentView(); break;
    case 'edit-profile': state.editingProfile=true; render(); loadCurrentView(); break;
    case 'cancel-edit-profile': state.editingProfile=false; render(); loadCurrentView(); break;
    case 'save-profile': await saveProfile(); break;
    case 'check-in': await doCheckIn(); break;
    case 'check-out': await doCheckOut(); break;
    case 'att-mode': state.attendanceMode=el.dataset.mode; paintView(loadingBlock()); loadCurrentView(); break;
    case 'leave-pick-day': pickLeaveDay(el.dataset.key); break;
    case 'leave-cal-nav': state.leaveCalOffset+=Number(el.dataset.dir); loadCurrentView(); break;
    case 'submit-leave': await submitLeave(); break;
    case 'leave-decide': await decideLeave(el.dataset.id, el.dataset.decision); break;
    case 'edit-payroll': state.payrollEditing=true; loadCurrentView(); break;
    case 'cancel-payroll': state.payrollEditing=false; loadCurrentView(); break;
    case 'save-payroll': await savePayroll(); break;
  }
}

async function doLogin(email, password){
  try{
    state.busy=true;
    const data=await api('/api/auth/login', {method:'POST', body:{email,password}});
    state.token=data.token; state.user=data.user; state.activeEmpId=data.user._id;
    localStorage.setItem('mhr_token', state.token); localStorage.setItem('mhr_user', JSON.stringify(state.user));
    state.view='app'; state.nav='dashboard'; state.authError=''; state.busy=false;
    render(); loadCurrentView();
  }catch(e){ state.busy=false; state.authError=e.message; render(); }
}
async function doSignup(){
  try{
    state.busy=true;
    const empId=document.getElementById('up-empid').value.trim();
    const name=document.getElementById('up-name').value.trim();
    const email=document.getElementById('up-email').value.trim();
    const password=document.getElementById('up-pass').value;
    const role=document.getElementById('up-role').value;
    await api('/api/auth/signup', {method:'POST', body:{empId,name,email,password,role}});
    state.busy=false; state.authMode='signin'; state.signupError='';
    showToast('Account created. A verification email would be sent in production — sign in now.');
  }catch(e){ state.busy=false; state.signupError=e.message; render(); }
}
function doLogout(){
  state.token=null; state.user=null; state.activeEmpId=null; state.view='auth'; state.nav='dashboard';
  localStorage.removeItem('mhr_token'); localStorage.removeItem('mhr_user');
  render();
}
async function saveProfile(){
  try{
    const body={};
    ['name','email','phone','address','department','designation'].forEach(key=>{
      const input=document.getElementById('pf-'+key); if(input) body[key]=input.value;
    });
    await api(`/api/employees/${state.activeEmpId}`, {method:'PUT', body});
    state.editingProfile=false;
    showToast('Profile updated.');
    loadCurrentView();
  }catch(e){ showToast(e.message); }
}
async function doCheckIn(){
  try{ await api('/api/attendance/check-in', {method:'POST'}); loadCurrentView(); }
  catch(e){ showToast(e.message); }
}
async function doCheckOut(){
  try{ await api('/api/attendance/check-out', {method:'POST'}); loadCurrentView(); }
  catch(e){ showToast(e.message); }
}
function pickLeaveDay(key){
  if(!state.leaveSelStart || (state.leaveSelStart && state.leaveSelEnd)){ state.leaveSelStart=key; state.leaveSelEnd=null; }
  else if(key<state.leaveSelStart){ state.leaveSelEnd=state.leaveSelStart; state.leaveSelStart=key; }
  else state.leaveSelEnd=key;
  loadCurrentView();
}
async function submitLeave(){
  try{
    const type=document.getElementById('leave-type').value;
    const remarks=document.getElementById('leave-remarks').value.trim();
    const start=state.leaveSelStart, end=state.leaveSelEnd||state.leaveSelStart;
    await api('/api/leave', {method:'POST', body:{type,start,end,remarks}});
    state.leaveSelStart=null; state.leaveSelEnd=null;
    showToast('Leave request submitted.');
    loadCurrentView();
  }catch(e){ showToast(e.message); }
}
async function decideLeave(id, decision){
  try{ await api(`/api/leave/${id}/decision`, {method:'PUT', body:{decision}}); loadCurrentView(); }
  catch(e){ showToast(e.message); }
}
async function savePayroll(){
  try{
    const body={};
    ['basic','hra','allowances','deductions'].forEach(key=>{
      const input=document.getElementById('pr-'+key); if(input) body[key]=input.value;
    });
    await api(`/api/payroll/${state.activeEmpId}`, {method:'PUT', body});
    state.payrollEditing=false;
    showToast('Salary structure updated.');
    loadCurrentView();
  }catch(e){ showToast(e.message); }
}

/* ===================== Boot ===================== */
render();
if(state.view==='app') loadCurrentView();