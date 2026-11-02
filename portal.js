/* v12 portal: email-first sign-in for practices and professionals, routed by role, on top of window.Talencia (lib/talencia.js).
   Demo mode: any email works and dashboards read data/demo/*.json. Live mode: Supabase auth and queries. One renderer for both. */
(()=>{const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],T=window.Talencia;if(!T)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const live=T.mode==='live';$$('[data-demo-only]').forEach(e=>e.hidden=live);

/* ---------- copy ---------- */
const TX={practices:{signin:['Welcome back','Sign in to your client portal.'],join:['Create a practice account','Request talent the same day.'],email:'you@practice.com'},
 professionals:{signin:['Welcome back','Sign in to claim shifts and track pay.'],join:['Join Talencia','Free. Takes about five minutes.'],email:'you@email.com'}};
const IC={req:'<path d="M12 5v14M5 12h14"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',pay:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',shift:'<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/>',cred:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'};
const li=(i,t)=>`<li><span class="au-ico"><svg viewBox="0 0 24 24">${IC[i]}</svg></span><span>${t}</span></li>`;
const SIDE={practices:{k:'For practices &amp; facilities',h:'Fill tomorrow’s empty chair.',pts:[['req','<b>Request talent</b> in two minutes'],['clock','<b>Approve time</b> and pay invoices in one place'],['star','<b>Earn 1 point</b> for every hour booked']],proof:[['98%','Fill rate'],['24 hr','Typical fill'],['45+ yrs','In staffing']]},
 professionals:{k:'For professionals',h:'Pick shifts. Get paid. Earn rewards.',pts:[['shift','<b>Claim shifts</b> near you with one tap'],['pay','<b>Weekly pay</b>, benefits for full-time W-2'],['cred','<b>Credentials</b> and your recruiter in one place']],proof:[['$1','Reward per hour'],['Same day','Recruiter reply'],['Free','To join']]}};

/* ---------- state ---------- */
const card=$('.au-card'),form=$('#au-form'),msg=$('#au-msg'),go=$('#au-go'),email=$('#au-email'),pass=$('#au-pass'),code=$('#au-code');
let role='practices',mode='signin',step='email',factor=null;
const say=(t,k='')=>{msg.className='au-msg'+(k?' '+k:'');msg.innerHTML=t||''};
const busy=b=>card.setAttribute('aria-busy',b?'true':'false');
const setUrl=()=>{const u=new URL(location);u.searchParams.set('tab',role);mode==='join'?u.searchParams.set('mode','join'):u.searchParams.delete('mode');history.replaceState(null,'',u.pathname+u.search)};
const label=()=>{go.textContent=mode==='join'?'Create account':step==='email'?'Continue':step==='mfa'?'Verify code':'Sign in';
 $('[data-magic]').textContent=mode==='join'?'Email me a link instead of a password':'Email me a sign-in link instead'};
function setStep(s){step=s;form.dataset.step=s;$('.au-mfa').hidden=s!=='mfa';label()}
function setRole(r,push){role=r;card.dataset.role=r;$$('button[data-role]').forEach(b=>{const on=b.dataset.role===r;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1});
 $('#au-h').textContent=TX[r][mode][0];$('#au-sub').textContent=TX[r][mode][1];email.placeholder=TX[r].email;
 const S=SIDE[r];$('[data-side=k]').innerHTML=S.k;$('[data-side=h]').textContent=S.h;$('[data-side=pts]').innerHTML=S.pts.map(p=>li(...p)).join('');$('[data-side=proof]').innerHTML=S.proof.map(([b,t])=>`<span><b>${b}</b>${t}</span>`).join('');
 say('');if(push)setUrl()}
function setMode(m,push){mode=m;card.classList.toggle('join',m==='join');form.classList.toggle('join',m==='join');pass.autocomplete=m==='join'?'new-password':'current-password';
 pass.placeholder=m==='join'?'At least 8 characters':'';setStep(m==='join'?'password':'email');setRole(role,push)}
$$('button[data-role]').forEach(b=>{b.onclick=()=>setRole(b.dataset.role,1);b.onkeydown=e=>{if(/Arrow(Left|Right)/.test(e.key)){const r=role==='practices'?'professionals':'practices';setRole(r,1);$('#r-'+r).focus()}}});
$$('[data-mode]').forEach(b=>b.onclick=()=>{setMode(b.dataset.mode,1);(mode==='join'?$('#au-name'):email).focus()});

/* ---------- submit: email → password (→ code) / create account ---------- */
const validEmail=()=>{if(!email.value||!email.checkValidity()){say('Enter a valid email address.','err');email.focus();return false}return true};
form.addEventListener('submit',async e=>{e.preventDefault();say('');
 if(step==='email'){if(!validEmail())return;setStep('password');pass.focus();return}
 if(step==='mfa'){if(!/^\d{6}$/.test(code.value)){say('Enter the 6 digits from your authenticator app.','err');return}busy(1);const r=await T.auth.verifyMfa(factor,code.value);busy(0);return r.ok?enter(r.role||role):say(r.error,'err')}
 if(!validEmail())return;
 if(live&&pass.value.length<8){say('Your password needs at least 8 characters.','err');pass.focus();return}
 busy(1);
 if(mode==='join'){const r=await T.auth.signUp({email:email.value,password:pass.value,role,name:$('#au-name').value,org:$('#au-org').value});busy(0);
  if(!r.ok)return say(r.error,'err');if(r.confirm)return say(`<b>Check your email.</b> We sent a confirmation link to ${esc(email.value)}.`,'ok');return enter(role)}
 const r=await T.auth.signIn(email.value,pass.value,role);busy(0);
 if(!r.ok)return say(r.error==='Invalid login credentials'?'That email and password don’t match. Try again or use a sign-in link.':r.error,'err');
 if(r.mfaRequired){factor=r.factorId;setStep('mfa');code.focus();return}
 enter(r.role||role)});

$('[data-magic]').onclick=async()=>{if(!validEmail())return;busy(1);const r=await T.auth.magicLink(email.value,role,mode==='join');busy(0);
 if(!r.ok)return say(r.error,'err');
 say(`<b>Check your email.</b> We sent a sign-in link to ${esc(email.value)}.`+(r.demo?` Demo: nothing was sent. <button type="button" class="au-lnk" data-enter>Open the demo link</button>`:''),'ok');
 $('[data-enter]',msg)?.addEventListener('click',()=>{T.demo.enterDemo(role);enter(role)})};
$('[data-forgot]').onclick=async()=>{if(!validEmail())return;busy(1);const r=await T.auth.resetPassword(email.value,role);busy(0);
 r.ok?say(`<b>Check your email.</b> We sent a reset link to ${esc(email.value)}.${r.demo?' Demo: nothing was sent.':''}`,'ok'):say(r.error,'err')};

/* ---------- Apple / Google / LinkedIn: real redirect in live mode, a consent sheet in demo mode ---------- */
const SH=$('#sso-sheet');let ssoP;
$$('[data-sso]').forEach(b=>b.onclick=async()=>{ssoP=b.dataset.sso;
 if(live){busy(1);const r=await T.auth.oauth(ssoP,role);if(!r.ok){busy(0);say(r.error,'err')}return}
 const nm=b.querySelector('span').textContent;$('#sso-t').textContent='Signing in with '+nm;$('.sheet-g',SH).innerHTML=b.querySelector('svg').outerHTML;
 $('.sa-n',SH).textContent=role==='practices'?'Lakeside Dental (demo)':'Maya R. (demo)';$('.sheet-acct small',SH).textContent=email.value||(role==='practices'?'office@lakeside.demo':'maya@demo.talencia');
 $('.sheet',SH).classList.remove('busy');SH.hidden=false;$('[data-sso-ok]',SH).focus()});
if(SH){$('[data-sso-x]',SH).onclick=()=>{SH.hidden=true};SH.onclick=e=>{if(e.target===SH)SH.hidden=true};addEventListener('keydown',e=>{if(e.key==='Escape')SH.hidden=true});
 $('[data-sso-ok]',SH).onclick=()=>{$('.sheet',SH).classList.add('busy');setTimeout(async()=>{SH.hidden=true;await T.auth.oauth(ssoP,role);enter(role)},800)}}
$$('[data-enter]').forEach(b=>b.onclick=()=>{T.demo.enterDemo(role);enter(role)});

/* ---------- dashboard ---------- */
const row=(a,b,c,cls='')=>`<div class="cp-row"><div><b>${esc(a)}</b>${b?`<br><small>${esc(b)}</small>`:''}</div>${c?`<span class="st ${cls}">${esc(c)}</span>`:''}</div>`;
const rows=(L,empty='Nothing here yet.')=>L&&L.length?`<div class="cp-list">${L.map(x=>row(x.title,x.meta,x.status,x.tone)).join('')}</div>`:`<p class="cp-empty">${empty}</p>`;
const kpis=K=>K&&K.length?`<div class="kpis">${K.map(([b,s])=>`<div class="kpi"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div>`:'';
const chat=D=>D.messages&&D.messages.length?`<p style="color:var(--mute)">Your recruiter: <b>${esc(D.recruiter)}</b></p><div class="msgs">${D.messages.map(m=>`<div class="bub${m.me?' me':''}">${esc(m.text)}</div>`).join('')}</div>`:'<p class="cp-empty">No messages yet. Your recruiter will reach out here.</p>';
const help=D=>rows(D.tickets,'No tickets.')+(D.faq||[]).map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')+'<p><a class="btn sm ghost" href="help.html">Visit the help center</a></p>';
const PR={
 overview:['Overview',D=>kpis(D.kpis)+`<h3 style="margin-top:28px">Open requests</h3>${rows(D.requests,'No open requests.')}<h3 style="margin-top:28px">Recently filled</h3>${rows(D.filled,'No filled shifts yet.')}`],
 request:['Request talent',()=>`<form class="form" style="margin:0;max-width:none" data-act="createRequest"><div class="row2"><div><label for="r1">Role</label><select id="r1" name="role"><option>Dental Hygienist</option><option>Dental Assistant</option><option>Dentist</option><option>Front office</option><option>Medical</option><option>Other industry</option></select></div><div><label for="r2">Type</label><select id="r2" name="engagement"><option value="temp">Temp shift</option><option value="temp_to_hire">Temp-to-hire</option><option value="permanent">Permanent</option><option value="eor">Employer of Record</option></select></div></div><div class="row2"><div><label for="r3">Date</label><input id="r3" name="startsAt" type="date"></div><div><label for="r4">Hours</label><input id="r4" name="hours" placeholder="8:00a–5:00p"></div></div><label for="r5">Notes</label><textarea id="r5" name="notes" rows="3" placeholder="Software, specialties…"></textarea><p style="margin-top:18px"><button class="btn">Submit request</button></p><div class="ok-msg" role="status"></div></form>`],
 calendar:['Calendar',D=>{const C=D.calendar;if(!C)return'<p class="cp-empty">Your booked shifts will show here.</p>';let c=`<h3>${esc(C.month)}</h3><div class="cal">`+['S','M','T','W','T','F','S'].map(d=>`<div class="h">${d}</div>`).join('');for(let d=1;d<=C.days;d++){const b=C.booked.includes(d);c+=`<div class="${b?'b':''}" aria-label="${esc(C.month.split(' ')[0])} ${d}${b?', shift booked':''}">${d}</div>`}return c+'</div><p style="color:var(--mute);font-size:14px;margin-top:10px">● Booked shift</p>'}],
 workers:['Workers',D=>rows(D.workers,'Professionals you’ve worked with will show here.')],
 time:['Timesheets',D=>D.timesheets&&D.timesheets.length?`<div class="cp-list">${D.timesheets.map(t=>`<div class="cp-row"><div><b>${esc(t.who)}</b><br><small>${esc(t.detail)}</small></div><span class="acts"><button class="btn sm" data-act-btn="approveTimesheet" data-id="${esc(t.id)}">Approve</button></span></div>`).join('')}</div>`:'<p class="cp-empty">No timesheets waiting for approval.</p>'],
 invoices:['Invoices',D=>{const I=D.invoices||{};const B=I.breakdown;return rows(I.list,'No invoices yet.')+(B?`<div class="tile" style="margin-top:20px"><h3>${esc(B.id)} breakdown</h3><table class="fee">${B.lines.map(([a,b])=>`<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}${B.totals.map(([a,b])=>`<tr class="t"><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table><p style="font-size:13px;color:var(--mute)">Demo rates and fees for illustration only.</p><div class="acts"><button class="btn" data-msg="Demo: no payment was made.">Pay by ACH</button><button class="btn ghost" data-msg="Demo: no payment was made.">Pay by card</button></div></div>`:'')}],
 rewards:['Rewards',D=>{const R=D.rewards||{};return kpis(R.kpis)+rows(R.items,'')+'<p><a class="btn sm ghost" href="rewards.html">How rewards work</a></p>'}],
 team:['Team',D=>rows((D.team||[]).map(t=>({title:t.title||t.name,meta:t.meta,status:t.status||t.role,tone:t.tone})),'Invite your team to approve time and pay invoices.')],
 messages:['Messages',chat],help:['Help',help]};
const PRO={
 shifts:['Open shifts',D=>D.shifts&&D.shifts.length?`<p style="color:var(--mute)">Press and hold <b>Claim</b> for a second to grab a shift.</p><div class="cp-list">${D.shifts.map(s=>`<div class="cp-row"><div><b>${esc(s.title)}</b><br><small>${esc(s.meta)}${s.rate?` · <b style="color:var(--teal-d)">${esc(s.rate)}</b>`:''}</small></div><button class="btn sm hold" data-hold data-id="${esc(s.id)}"><i></i><span>Hold to claim</span></button></div>`).join('')}</div>`:'<p class="cp-empty">No open shifts near you right now. We’ll notify you.</p>'],
 schedule:['My schedule',D=>rows(D.schedule,'No upcoming shifts.')],
 pay:['Pay',D=>{const P=D.pay;if(!P)return'<p class="cp-empty">Pay details appear after your first approved shift.</p>';return`<div class="kpis"><div class="kpi"><b id="live">$0.00</b><span>Earned today</span></div>${P.kpis.map(([b,s])=>`<div class="kpi"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div><div class="tile" style="margin-top:20px"><h3>This week</h3><div class="bar"><b style="width:${+P.weekPct||0}%"></b></div><small>${esc(P.weekNote)}</small>${rows(P.rows,'')}</div>`}],
 clock:['Timesheets',D=>{const S=D.timesheet||{};return(S.today?`<div class="tile"><h3>${esc(S.today.title)}</h3><p style="color:var(--mute)">${esc(S.today.meta)}</p><button class="btn" data-clock>Clock in</button><p class="ok-msg" role="status"></p></div>`:'')+rows(S.rows,'No timesheets yet.')}],
 wallet:['Rewards',D=>{const W=D.wallet||{};return kpis(W.kpis)+rows(W.rows,'Every hour you work earns $1 in reward dollars.')+'<p><a class="btn sm ghost" href="rewards.html">How rewards work</a></p>'}],
 apps:['Applications',D=>rows(D.apps,'No applications yet.')],creds:['Credentials',D=>rows(D.creds,'Add your license and certifications.')+'<p><button class="btn sm" data-msg="Demo: no file uploaded.">Upload document</button></p>'],
 messages:['Messages',chat],help:['Help',help]};
const SETS={practices:PR,professionals:PRO};let D=null,cur=null;
function show(r,t){const A=$('#app-'+r),Tb=$('.cp-tabs',A);Tb.innerHTML=Object.entries(SETS[r]).map(([x,v])=>`<button role="tab" data-tab="${x}" aria-selected="${x===t}">${v[0]}</button>`).join('');
 $$('[data-tab]',A).forEach(b=>b.onclick=()=>show(r,b.dataset.tab));$('.cp-body',A).innerHTML=SETS[r][t][1](D);bind(A)}
async function act(name,p,done){const r=await T.data.act(name,p);done(r.ok?r.message:(r.error||'Something went wrong.'),r.ok)}
function bind(A){
 $$('form[data-act]',A).forEach(f=>f.onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(f));const m=f.querySelector('.ok-msg');act(f.dataset.act,fd,t=>{m.textContent=t;m.classList.add('show')})});
 $$('[data-act-btn]',A).forEach(b=>b.onclick=()=>{b.disabled=true;act(b.dataset.actBtn,{id:b.dataset.id},(t,ok)=>{b.textContent=ok?t:'Try again';b.disabled=ok})});
 $$('[data-msg]',A).forEach(b=>b.onclick=()=>{b.textContent=b.dataset.msg;b.disabled=true});
 $$('[data-clock]',A).forEach(b=>b.onclick=()=>{const m=b.nextElementSibling,i=b.textContent==='Clock in';act('clock',{out:!i},t=>{b.textContent=i?'Clock out':'Clock in';m.textContent=(i?'Clocked in at ':'Clocked out at ')+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+(live?'':' (demo)');m.classList.add('show')})});
 $$('[data-hold]',A).forEach(b=>{let t;const claim=()=>{b.classList.remove('h');b.disabled=true;act('claimShift',{id:b.dataset.id},(m,ok)=>{b.querySelector('span').textContent=ok?m:'Try again';b.disabled=ok;navigator.vibrate?.(30)})};
  b.onpointerdown=e=>{e.preventDefault();b.classList.add('h');t=setTimeout(claim,1000)};b.onpointerup=b.onpointerleave=()=>{clearTimeout(t);b.classList.remove('h')};b.onclick=e=>{if(e.detail===0)claim()}});
 const lv=$('#live',A);if(lv&&D.pay){let v=+D.pay.today||0;clearInterval(window._lv);lv.textContent='$'+v.toFixed(2);if(!live)window._lv=setInterval(()=>{if(!document.contains(lv))return clearInterval(window._lv);v+=.02;lv.textContent='$'+v.toFixed(2)},1000)}}
async function enter(r){r=SETS[r]?r:role;cur=r;busy(1);
 try{D=await T.data.load(r)}catch(e){busy(0);return say('We couldn’t load your dashboard. '+esc(e.message),'err')}busy(0);
 $('.au').hidden=true;$('.cp-dash').hidden=false;$$('.cp-app').forEach(a=>a.hidden=a.id!=='app-'+r);
 const h=new Date().getHours(),g=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
 $(`[data-hi=${r}]`).textContent=r==='practices'?`${g}, ${D.account.name}`:`Hi, ${D.account.name}`;$(`[data-meta=${r}]`).textContent=D.account.meta||'';
 $$('[data-swap]').forEach(b=>b.hidden=live);show(r,Object.keys(SETS[r])[0]);role=r;setUrl();scrollTo(0,0)}
$$('[data-out]').forEach(b=>b.onclick=async()=>{await T.auth.signOut();$('.cp-dash').hidden=true;$('.au').hidden=false;setMode('signin');setRole(cur||role,1);email.value='';pass.value=''});
$$('[data-swap]').forEach(b=>b.onclick=()=>{const r=cur==='practices'?'professionals':'practices';T.demo.enterDemo(r);enter(r)});

/* ---------- start: URL (?tab=, ?mode=join, legacy #demo), then resume an existing session ---------- */
const Q=new URLSearchParams(location.search),q=Q.get('tab')||location.hash.slice(1);
role=/^pro/.test(q)?'professionals':'practices';setMode(Q.get('mode')==='join'?'join':'signin');setRole(role,1);
if(!live&&/demo/.test(location.hash))T.demo.enterDemo(role);
if(T.fellBack)say('Live mode isn’t configured yet, so this is running in demo mode.','');
T.auth.current().then(me=>{if(me&&me.role){if(me.role!==role&&Q.get('tab'))say(`You’re signed in with a ${me.role==='practices'?'practice':'professional'} account.`);enter(me.role)}
 else if(me&&!me.role){say('Your account doesn’t have a role yet. Choose Practice or Professional and sign in again.','err')}}).catch(e=>console.warn(e));
})();
