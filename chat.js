/* v11 chat: Talencia assistant. A simulated AI demo (rule-based, nothing is sent): quick-start choices, answers drawn from the
   help center with article links, short guided requests, and a person always one tap away. Conversation persists for the session. */
(()=>{if(window.__tc)return;window.__tc=1;
const d=document,$=(s,r=d)=>r.querySelector(s),RM=matchMedia('(prefers-reduced-motion: reduce)').matches,KEY='tc-v1';
const css=d.createElement('link');css.rel='stylesheet';css.href='chat.css?v=11';d.head.append(css);
if(!window.TC_HELP){const hs=d.createElement('script');hs.src='help-data.js?v=11';d.head.append(hs)}
const PHONE='214.522.2008',TEL='tel:+12145222008',SMS='sms:+12145222008',MAIL='mailto:recruiting@gotalencia.com';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(location.pathname.split('/').pop()||'index.html').replace('.html','');
const ctx=/^(dental-practices|medical-facilities|request-talent|eor|all-industries|employer-of-record-services|dental-temp-staffing|healthcare-staffing-agency)$/.test(page)?'prac':/^(dental-professionals|medical-professionals|jobs|rewards|community|the-app|join|dental-temp-jobs|dental-jobs-in-dallas|healthcare-jobs|pay-waitlist)$/.test(page)?'pro':'any';

/* recruiter hours (demo): Mon–Fri 7am–6pm Central */
const hours=()=>{let wd='Mon',h=12;try{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'numeric',hourCycle:'h23'}).formatToParts(new Date());wd=p.find(x=>x.type==='weekday').value;h=+p.find(x=>x.type==='hour').value}catch(e){}
 const on=!/Sat|Sun/.test(wd)&&h>=7&&h<18;return{on,txt:on?'Recruiters online now':'Recruiters are offline · back at 7am CT',note:on?'A recruiter usually picks up right away during business hours.':'Leave your details and a recruiter reaches out first thing.'}};

/* --- state (sessionStorage; the widget still works if storage is blocked) --- */
let S={log:[],node:null,chips:[],data:{},open:false,seen:false};
try{const v=JSON.parse(sessionStorage.getItem(KEY)||'null');if(v&&Array.isArray(v.log))S=Object.assign(S,v)}catch(e){}
const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};

/* --- DOM --- */
const IC={chat:'<svg class="tc-c" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" stroke-width="2.6"/></svg>',
 x:'<svg class="tc-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
 msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
 send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>'};
const hr=hours();
const btn=d.createElement('button');btn.type='button';btn.className='tc-launch';btn.setAttribute('aria-controls','tc-panel');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Chat with Talencia');btn.innerHTML=IC.chat+IC.x+`<i class="${hr.on?'':'off'}" aria-hidden="true"></i>`;
const P=d.createElement('div');P.id='tc-panel';P.className='tc-panel';P.hidden=true;P.setAttribute('role','dialog');P.setAttribute('aria-label','Chat with Talencia');
P.innerHTML=`<div class="tc-head"><div class="tc-top"><span class="tc-av${hr.on?'':' off'}" aria-hidden="true">t</span><div class="tc-ttl"><b>Talencia Assistant <em class="tc-ai">AI demo</em></b><span>${hr.txt}</span></div><button type="button" class="tc-close" aria-label="Close chat">×</button></div>
<div class="tc-human"><a href="${TEL}">${IC.phone}Call</a><a href="${SMS}">${IC.msg}Text us</a></div></div>
<div class="tc-log" role="log" aria-live="polite" aria-label="Conversation"></div>
<form class="tc-form" autocomplete="off"><label class="tc-sr" for="tc-in">Message</label><input id="tc-in" type="text" placeholder="Type a message…" enterkeyhint="send"><button class="tc-send" type="submit" aria-label="Send">${IC.send}</button></form>
<div class="tc-foot"><span>Simulated AI · nothing is sent</span><span><a href="help.html">Help center</a> · <button type="button" data-restart>Start over</button></span></div>`;
d.body.append(btn,P);
const log=$('.tc-log',P),inp=$('#tc-in',P);

/* --- rendering --- */
const scroll=()=>{log.scrollTop=log.scrollHeight};
const draw=it=>{const e=d.createElement('div');if(it.k==='card'){e.className='tc-card';e.innerHTML=it.h}else{e.className='tc-m '+it.k;e.innerHTML=it.h}log.append(e)};
const drawChips=()=>{const old=$('.tc-chips',log);old&&old.remove();if(!S.chips.length)return;const w=d.createElement('div');w.className='tc-chips';w.setAttribute('role','group');w.setAttribute('aria-label','Suggested replies');
 S.chips.forEach(c=>{const b=d.createElement('button');b.type='button';b.className='tc-chip';b.textContent=c;b.onclick=()=>reply(c);w.append(b)});log.append(w)};
const redraw=()=>{log.innerHTML='';S.log.forEach(draw);drawChips();scroll()};
let q=Promise.resolve(),busy=0;
const out=(k,h)=>{busy++;q=q.then(()=>new Promise(res=>{const t=d.createElement('div');t.className='tc-typing';t.innerHTML='<i></i><i></i><i></i>';t.setAttribute('aria-hidden','true');
 if(!RM){log.append(t);scroll()}setTimeout(()=>{t.remove();const it={k,h};S.log.push(it);draw(it);scroll();save();busy--;res()},RM?0:Math.min(900,380+h.length*4))}))};
const bot=h=>out('bot',h),card=h=>out('card',h);
const chips=a=>{S.chips=a;save();q=q.then(()=>{drawChips();scroll()})};

/* --- content --- */
const A={
 fill:'For any request, tell us the role, date and office and a recruiter reaches out the same day. Medical facilities get coverage within 24 hours.',
 who:'Talencia by KAD does. Every professional is a W-2 employee, so payroll, taxes, workers’ comp and compliance sit with us, not your practice.',
 vet:'AI screening plus face-to-face interviews, license and credential checks, background checks and references, all before anyone walks through your door.',
 perm:'Yes. We offer temp, temp-to-hire and permanent placement, so you can try the fit before you commit.',
 eor:'With Employer of Record you keep your team and the lead. We become the employer on paper and take on payroll, HR and liability. <a href="eor.html">How it works</a>',
 any:'Yes. Talencia places professionals across all industries nationwide, including sales, HR, finance, IT and trades.',
 cost:'Nothing. Joining the talent network is free and takes about five minutes. A recruiter makes contact the same day.',
 ben:'Full-time professionals get medical, dental, vision and 401(k), as W-2 employees with workers’ comp included.',
 sched:'Yes. Pick up shifts that fit your life in the app, from a single day to temp-to-hire or permanent roles.',
 rew:'Talencia Rewards earn cash back for every hour worked. Same-day pay (coming soon) lands earnings on your Talencia pay card the day you work. Program terms apply. <a href="rewards.html">See Rewards</a>'};
const MORE={fill:'request-talent',who:'who-employs-the-professional',vet:'how-candidates-are-vetted',perm:'temp-to-hire',eor:'employer-of-record',any:'other-industries',cost:'join-the-talent-network',ben:'benefits',sched:'pick-up-shifts',rew:'talencia-rewards'};
const ans=k=>A[k]+(MORE[k]&&!/<a /.test(A[k])?` <a href="help/${MORE[k]}.html">Read more</a>`:'');
const FAQ_P=[['How fast can you fill a shift?','fill'],['Who employs the staff?','who'],['How are candidates vetted?','vet'],['Can a temp become permanent?','perm'],['What is Employer of Record?','eor']];
const FAQ_W=[['Does it cost to join?','cost'],['Do I get benefits?','ben'],['Can I choose my schedule?','sched'],['What are Talencia Rewards?','rew']];
const FAQS=ctx==='pro'?FAQ_W.concat(FAQ_P.slice(0,2)):ctx==='prac'?FAQ_P.concat(FAQ_W.slice(0,1)):[FAQ_P[0],FAQ_P[1],FAQ_W[0],FAQ_W[1],FAQ_W[3],FAQ_P[4]];
const INTENTS=[[/\b(human|person|someone|agent|representative|call|phone|speak|talk)\b/,'human'],[/\b(hours?|open|closed|available)\b/,'hours'],
 [/\b(change|cancel|swap|reschedul\w*)\b/,'x_shift'],[/\b(paycheck|paid|timesheet|pay ?card|direct deposit|payroll)\b/,'x_pay'],[/\b(license|licence|credential|cpr|certif\w*)\b/,'x_cred'],
 [/\b(fast|quick|urgent|asap|how soon)\b/,'a:fill'],[/\b(w-?2|employ(s|er|ed)?)\b/,'a:who'],[/\b(vet|vetted|screen\w*|background)\b/,'a:vet'],[/\b(perm\w*|temp.to.hire|full.time hire)\b/,'a:perm'],
 [/\b(eor|employer of record)\b/,'a:eor'],[/\b(cost|free|fee|price)\b/,'a:cost'],[/\b(benefit\w*|insurance|401|dental plan|vision)\b/,'a:ben'],[/\b(schedule|flexib\w*)\b/,'a:sched'],
 [/\b(reward\w*|points|cash back|same.day pay)\b/,'a:rew'],[/\b(industr\w*|outside healthcare|finance|trades)\b/,'a:any'],
 [/\b(staff|hire|hiring|cover\w*|need (a|an|someone)|short.?staffed|fill)\b/,'hire'],[/\b(job|jobs|shift|shifts|work|career|apply|position)\b/,'work']];
const ROLES_P=['Dental hygienist','Dental assistant','Dentist','Front office','Medical','Something else'];
const ROLE_CODE={'Hygienist':'hyg','Dental hygienist':'hyg','Assistant':'asst','Dental assistant':'asst','Dentist':'dds','Front office':'fo'};
/* simulated AI: search the help center, answer with the best article's summary and share links */
const LEAD=['Here’s what I found:','This should help:','Good question. Here’s the short answer:'];let lead=0;
const helpAnswer=t=>{if(!window.TC_HELP_SEARCH)return false;const r=window.TC_HELP_SEARCH(t,3);if(!r.length||r[0].sc<2||r[0].sc<3&&r[1]&&r[1].sc>=r[0].sc)return false;const top=r[0].a,more=r.slice(1).filter(x=>x.sc>=3);
 bot(LEAD[lead++%LEAD.length]);
 card(`<h4>Help center</h4><p><b>${esc(top.title)}</b><br>${esc(top.summary)}</p><div class="tc-acts"><a class="tc-btn" href="help/${top.slug}.html">Read the article</a><button type="button" class="tc-btn alt" data-say="Talk to a person">Talk to a person</button></div>${more.length?'<p class="tc-rel">Related: '+more.map(x=>`<a href="help/${x.a.slug}.html">${esc(x.a.title)}</a>`).join(' · ')+'</p>':''}`);
 chips(['That helped','Ask something else','Talk to a person']);return true};
const humanCard=()=>card(`<h4>Talk to a person</h4><p>${hr.note}</p><div class="tc-acts"><a class="tc-btn" href="${TEL}">Call ${PHONE}</a><a class="tc-btn alt" href="${SMS}">Text us</a><a class="tc-btn alt" href="${MAIL}">Email</a></div>`);

/* --- conversation nodes: say() runs on entry, on(text) handles a reply (return false to fall through to intents) --- */
const N={
 start:{say(){const g=ctx==='prac'?'Hi! Need to cover a shift or make a hire? I can get a recruiter on it in about a minute.':ctx==='pro'?'Hi! Looking for shifts or a new role? I can point you to open work near you.':'Hi! I’m the Talencia assistant. I get you to the right person, fast.';
  bot(g+'\nWhat brings you here today?');chips(['I need staff','I’m looking for work','I already work with Talencia','Ask a question','Browse help articles'])},
  on(t){return t==='I need staff'?go('hire'):t==='I’m looking for work'?go('work'):t==='I already work with Talencia'?go('existing'):t==='Ask a question'?go('faq'):t==='Browse help articles'?go('help'):false}},
 hire:{say(){bot('Happy to help. What role do you need covered?');chips(ROLES_P)},on(t){if(!ROLES_P.includes(t))return false;S.data.role=t;return go('hire_when')}},
 hire_when:{say(){bot('When do you need them?');chips(['Today','This week','This month','Planning ahead'])},on(t){if(!['Today','This week','This month','Planning ahead'].includes(t))return false;S.data.when=t;return go('hire_zip')}},
 hire_zip:{say(){bot('What’s the zip code of the office?');chips([]);inp.placeholder='Zip code, e.g. 75201';inp.inputMode='numeric'},
  on(t){const z=(t.match(/\b\d{5}\b/)||[])[0];if(!z){bot('That doesn’t look like a 5-digit zip code. Could you try again?');return true}S.data.zip=z;return go('hire_contact')}},
 hire_contact:{say(){bot('Last thing: what’s the best phone number or email to reach you?');inp.placeholder='Phone or email';inp.inputMode='text'},
  on(t){const ok=/\S+@\S+\.\S+/.test(t)||t.replace(/\D/g,'').length>=10;if(!ok){bot('I need a 10-digit phone number or an email address so a recruiter can reach you.');return true}S.data.contact=t;return go('hire_done')}},
 hire_done:{say(){const D=S.data,field=/Medical/.test(D.role)?'Medical':D.role==='Something else'?'Other industry':'Dental',when=D.when==='This month'?'Within a month':D.when==='Planning ahead'?'Planning ahead':'ASAP — this week';
  card(`<h4>Request ready</h4><dl><dt>Role</dt><dd>${esc(D.role)}</dd><dt>When</dt><dd>${esc(D.when)}</dd><dt>Zip</dt><dd>${esc(D.zip)}</dd><dt>Contact</dt><dd>${esc(D.contact)}</dd></dl><p>${hr.on?'A recruiter will reach out today.':'A recruiter will reach out first thing tomorrow.'} <span class="demo">Demo</span> Nothing was sent.</p><div class="tc-acts"><a class="tc-btn" href="request-talent.html?field=${encodeURIComponent(field)}&amp;when=${encodeURIComponent(when)}">Add details</a><a class="tc-btn alt" href="${TEL}">Call now</a></div>`);
  inp.placeholder='Type a message…';chips(['Ask a question','Start over'])},on(){return false}},
 work:{say(){bot('Great. What do you do?');chips(['Hygienist','Assistant','Dentist','Front office','Medical','Something else'])},on(t){if(!['Hygienist','Assistant','Dentist','Front office','Medical','Something else'].includes(t))return false;S.data.role=t;return go('work_where')}},
 work_where:{say(){bot('Where would you like to work? A city or zip code is fine.');chips(['Dallas','Houston','Anywhere in Texas']);inp.placeholder='City or zip'},
  on(t){if(t.trim().length<2)return true;S.data.where=t.trim();return go('work_done')}},
 work_done:{say(){const D=S.data,r=ROLE_CODE[D.role],tx=/texas|tx|dallas|houston|austin|san antonio|fort worth|\b7[5-9]\d{3}\b/i.test(D.where);
  card(`<h4>${esc(D.role==='Something else'?'Open roles':D.role+' shifts')} near ${esc(D.where)}</h4><p>${tx?'Texas has the most open shifts on Talencia right now. <span class="demo">Demo</span>':'We’re growing nationwide, and a recruiter can tell you what’s open near you.'} Join the network and a recruiter reaches out the same day.</p><div class="tc-acts"><a class="tc-btn" href="jobs.html?${[tx&&'state=TX',r&&'role='+r].filter(Boolean).join('&amp;')}#board">Browse shifts</a><a class="tc-btn alt" href="portal/?mode=join&amp;tab=professionals">Join the network</a></div>`);
  inp.placeholder='Type a message…';chips(['Ask a question','Talk to a person','Start over'])},on(){return false}},
 existing:{say(){bot('Welcome back! What do you need help with?');chips(['Change or cancel a shift','Pay or timesheets','Credentials','Something else'])},
  on(t){return t==='Change or cancel a shift'?go('x_shift'):t==='Pay or timesheets'?go('x_pay'):t==='Credentials'?go('x_cred'):t==='Something else'?go('human'):false}},
 x_shift:{say(){card(`<h4>Change or cancel a shift</h4><p>Shift changes go straight to your recruiter so nothing gets missed. Text them now, or manage the shift in the app.</p><div class="tc-acts"><a class="tc-btn" href="${SMS}">Text your recruiter</a><a class="tc-btn alt" href="the-app.html">Open the app</a></div>`);chips(['Ask a question','Start over'])},on(){return false}},
 x_pay:{say(){card(`<h4>Pay and timesheets</h4><p>Pay questions go to a person who can see your file. Call or text and have your shift dates handy.</p><div class="tc-acts"><a class="tc-btn" href="${TEL}">Call ${PHONE}</a><a class="tc-btn alt" href="${SMS}">Text us</a></div>`);chips(['What are Talencia Rewards?','Start over'])},on(t){return t==='What are Talencia Rewards?'?(bot(A.rew),true):false}},
 x_cred:{say(){card(`<h4>Credentials</h4><p>Keep your license, certifications and CPR current in the app so you can say yes to short-notice shifts. Your recruiter can help if anything is expiring.</p><div class="tc-acts"><a class="tc-btn" href="the-app.html">Open the app</a><a class="tc-btn alt" href="${SMS}">Text your recruiter</a></div>`);chips(['Ask a question','Start over'])},on(){return false}},
 faq:{say(){bot('Ask me anything, or pick a common question:');chips(FAQS.map(f=>f[0]))},on(t){const f=FAQS.find(x=>x[0]===t);if(!f)return false;bot(ans(f[1]));chips(FAQS.filter(x=>x[0]!==t).slice(0,3).map(x=>x[0]).concat(['Talk to a person']));return true}},
 help:{say(){const pop=['change-or-cancel-a-shift','pay-and-timesheets','request-talent','join-the-talent-network','benefits'].map(s=>(window.TC_HELP||[]).find(a=>a.slug===s)).filter(Boolean);
  bot('Here are the most popular help articles. You can also type a question and I’ll find the right one.');
  card(`<h4>Popular articles</h4><ul class="tc-list">${pop.map(a=>`<li><a href="help/${a.slug}.html">${esc(a.title)}</a></li>`).join('')}</ul><div class="tc-acts"><a class="tc-btn alt" href="help.html">Visit the help center</a></div>`);chips(['Ask a question','Start over'])},on(){return false}},
 helped:{say(){bot('Glad that helped! Anything else I can do?');chips(['I need staff','I’m looking for work','Ask something else','Start over'])},on(){return false}},
 human:{say(){bot('Of course. A real person is one tap away:');humanCard();chips(['Ask a question','Start over'])},on(){return false}},
 hours:{say(){bot(`${hr.txt}. Recruiter hours are Monday to Friday, 7am to 6pm Central. ${hr.on?'':'You can still leave your details and we’ll follow up first thing.'}`);chips(['Talk to a person','Start over'])},on(){return false}}};
function go(id){S.node=id;S.chips=[];save();N[id].say();return true}
const GLOBAL={'that helped':()=>go('helped'),'ask something else':()=>{bot('Sure. Type your question below.');inp.focus()},'start over':()=>{S.log=[];S.data={};log.innerHTML='';go('start')},'talk to a person':()=>go('human'),'ask a question':()=>go('faq')};
function reply(t){t=t.trim();if(!t||busy)return;S.log.push({k:'me',h:esc(t)});draw(S.log[S.log.length-1]);S.chips=[];drawChips();scroll();save();
 const g=GLOBAL[t.toLowerCase()];if(g){g();return}
 const n=N[S.node];if(n&&n.on&&n.on(t))return;
 /* routing: a person or hours always wins; questions go to the help center first; requests ("I need a hygienist") start a flow */
 const low=t.toLowerCase(),question=/^(how|what|when|where|why|who|can|do|does|is|are|will|should)\b|\?\s*$/.test(low);
 const hit=INTENTS.find(([re])=>re.test(low)),k=hit&&hit[1];
 if(k==='human'||k==='hours'){go(k);return}
 if((question||!k)&&helpAnswer(t))return;
 if(k==='hire'){const role=ROLES_P.find(r=>r!=='Something else'&&low.includes(r.toLowerCase().replace('dental ','')))||(/\b(nurse|rn|medical|ma)\b/.test(low)?'Medical':null),when=/\b(today|tonight|asap|tomorrow)\b/.test(low)?'Today':/\bthis week\b/.test(low)?'This week':/\bthis month|next month\b/.test(low)?'This month':null;
  if(role){S.data.role=role;if(when){S.data.when=when;bot(`Got it: ${role.toLowerCase()}, ${when.toLowerCase()==='today'?'as soon as possible':when.toLowerCase()}.`);return go('hire_zip')}bot(`Got it: ${role.toLowerCase()}.`);return go('hire_when')}}
 if(k){if(k.startsWith('a:')){bot(ans(k.slice(2)));chips(['Ask a question','Talk to a person','Start over'])}else go(k);return}
 bot(question?'I couldn’t find a help article on that. A recruiter who can see your details is the fastest way to an answer.':'I’m a demo assistant, so I stick to Talencia: shifts, staffing, pay, benefits and your account. For anything else, a real person can help.');humanCard();chips(['Browse help articles','Ask a question','Start over'])}

/* --- open / close --- */
let teaser;
const setOpen=o=>{S.open=o;save();P.hidden=!o;btn.setAttribute('aria-expanded',o);btn.setAttribute('aria-label',o?'Close chat':'Chat with Talencia');d.body.classList.toggle('tc-open',o);teaser&&teaser.remove();
 if(o){S.seen=true;save();if(!S.log.length)go('start');else{redraw();requestAnimationFrame(scroll)}setTimeout(()=>{if(!matchMedia('(max-width:760px)').matches||!S.log.length)inp.focus()},60)}else btn.focus()};
btn.onclick=()=>setOpen(P.hidden);
$('.tc-close',P).onclick=()=>setOpen(false);
$('[data-restart]',P).onclick=()=>GLOBAL['start over']();
log.addEventListener('click',e=>{const b=e.target.closest('[data-say]');if(b)reply(b.dataset.say)});
$('.tc-form',P).addEventListener('submit',e=>{e.preventDefault();const v=inp.value;inp.value='';reply(v)});
d.addEventListener('keydown',e=>{if(e.key==='Escape'&&!P.hidden)setOpen(false)});
/* "Chat with us" links (footer, contact page) open the widget instead of navigating */
d.addEventListener('click',e=>{const a=e.target.closest('a[href$="#chat"],[data-chat-open]');if(!a)return;e.preventDefault();setOpen(true)});
if(S.open||location.hash==='#chat')setOpen(true);
/* one gentle prompt per session, after the visitor has had time to look around */
else if(!S.seen)setTimeout(()=>{if(!P.hidden||S.seen)return;S.seen=true;save();teaser=d.createElement('div');teaser.className='tc-teaser';teaser.setAttribute('role','status');
 teaser.innerHTML='<b>Questions?</b>Quick answers here, and a real person is one tap away.<button type="button" aria-label="Dismiss">×</button>';
 teaser.onclick=e=>{if(e.target.tagName==='BUTTON'){teaser.remove();return}setOpen(true)};d.body.append(teaser)},12000);
})();
