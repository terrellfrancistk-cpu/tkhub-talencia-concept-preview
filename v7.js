(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
// nav menu
const mb=$('.menu-btn'),nv=$('#mainnav');mb.onclick=()=>{const o=mb.getAttribute('aria-expanded')!=='true';mb.setAttribute('aria-expanded',o);nv.classList.toggle('open',o)};
nv.addEventListener('click',e=>{if(e.target.tagName==='A'){nv.classList.remove('open');mb.setAttribute('aria-expanded','false')}});
// quick search
window.qs=e=>{e.preventDefault();const f=$('#qs-r').value;$(`[data-f=${f}]`)?.click();location.hash='shifts';return false};
window.pickWho=v=>{const r=$(`[name=who][value=${v}]`);if(r){r.checked=true;r.dispatchEvent(new Event('change'))}};
// count up
const fmt=n=>n.toLocaleString('en-US');const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const co=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;co.unobserve(e.target);const el=e.target,t=+el.dataset.count,s=el.dataset.suf||'';if(rm)return;const t0=performance.now();const f=n=>{const p=Math.min(1,(n-t0)/1200),v=Math.round(t*(1-Math.pow(1-p,3)));el.textContent=fmt(v)+s;if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}),{threshold:.5});

// map
const N={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
const HUB={TX:[412,3860,'1.6 hr','Dallas · Fort Worth · Houston · Austin · San Antonio'],OK:[38,310,'5 hr','Oklahoma City · Tulsa'],LA:[31,240,'6 hr','New Orleans · Baton Rouge'],AZ:[44,390,'5 hr','Phoenix · Tucson'],CO:[36,300,'6 hr','Denver · Colorado Springs'],FL:[58,520,'4 hr','Tampa · Orlando · Miami'],GA:[41,350,'5 hr','Atlanta'],TN:[27,210,'7 hr','Nashville · Memphis'],NC:[33,280,'6 hr','Charlotte · Raleigh'],CA:[61,540,'5 hr','Los Angeles · San Diego'],IL:[29,260,'7 hr','Chicago'],NY:[35,300,'7 hr','New York City']};
const P=window.US_STATES||{},svg=$('#usmap'),sel=$('#state-pick'),det=$('#map-detail'),NS='http://www.w3.org/2000/svg';
const h=s=>{let x=0;for(const c of s)x=x*31+c.charCodeAt(0);return x};
const data=k=>{if(HUB[k]){const[o,p,t,c]=HUB[k];return{tier:k==='TX'?'Headquarters':'Recruiter hub',o,p,t,c}}const v=h(k);return{tier:'National reach',o:4+v%14,p:30+v%120,t:(10+v%14)+' hr',c:'Placements through our national network'}};
const codes=Object.keys(N).sort((a,b)=>N[a].localeCompare(N[b]));
sel.innerHTML=codes.map(k=>`<option value="${k}">${N[k]}</option>`).join('');
let cur=null;
function show(k,focus){const d=data(k);cur=k;sel.value=k;$$('#usmap path').forEach(p=>p.classList.toggle('sel',p.dataset.s===k));
det.innerHTML=`<p class="tier tier-${d.tier[0]}">${d.tier}</p><h3>${N[k]}</h3><p class="cities">${d.c}</p><dl class="mstats"><div><dt>Open shifts</dt><dd>${fmt(d.o)}</dd></div><div><dt>Professionals</dt><dd>${fmt(d.p)}</dd></div><div><dt>Avg. fill time</dt><dd>${d.t}</dd></div></dl><span class="demo-tag">DEMO NUMBERS</span>`}
codes.forEach(k=>{if(!P[k])return;const p=document.createElementNS(NS,'path');p.setAttribute('d',P[k]);p.dataset.s=k;const d=data(k);p.setAttribute('class','st '+(k==='TX'?'hq':HUB[k]?'hub':'nat'));p.setAttribute('tabindex','0');p.setAttribute('role','button');p.setAttribute('aria-label',`${N[k]}: ${d.tier}`);
const t=document.createElementNS(NS,'title');t.textContent=N[k];p.appendChild(t);
p.addEventListener('mouseenter',()=>show(k));p.addEventListener('focus',()=>show(k));p.addEventListener('click',()=>show(k));p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(k)}});svg.appendChild(p)});
const tx=svg.querySelector('[data-s=TX]');if(tx)svg.appendChild(tx);
const star=document.createElementNS(NS,'circle');star.setAttribute('cx','452');star.setAttribute('cy','445');star.setAttribute('r','7');star.setAttribute('class','hqdot');star.setAttribute('aria-hidden','true');svg.appendChild(star);
sel.onchange=()=>show(sel.value);show('TX');
// tabs helper
function tabs(btns,onSel){btns.forEach((b,i)=>{b.onclick=()=>sel2(i);b.onkeydown=e=>{const k={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];if(e.key==='Home')sel2(0,1);else if(e.key==='End')sel2(btns.length-1,1);else if(k){e.preventDefault();sel2((i+k+btns.length)%btns.length,1)}}});function sel2(i,f){btns.forEach((b,j)=>{b.setAttribute('aria-selected',j===i);b.tabIndex=j===i?0:-1});if(f)btns[i].focus();onSel(i)}}
tabs($$('[data-ht]'),i=>{$('#hp-o').hidden=i!==0;$('#hp-p').hidden=i!==1});
// app showcase
const A=[
['AI Council, led by Grok','Ask once, get a team of AI specialists. Grok chairs the council, pulls in scheduling, credentialing and payroll experts, and hands you one clear answer with the steps already done.',`<div class="ps-h">AI Council</div><div class="bub me">Cover Dr. Lee's hygiene column Friday and tell me the cost.</div><div class="bub ai"><b>Grok · Council lead</b>Scheduling found 3 RDHs within 12 mi. Credentialing verified all 3. Payroll estimate: $468 for 9 hrs.</div><div class="chiprow"><span>Book Jasmine</span><span>See all 3</span></div>`],
['Voice control','Hands full at chairside? Say it. Post a shift, approve hours, or check tomorrow without touching the screen.',`<div class="ps-h">Voice</div><div class="mic" aria-hidden="true"><i></i></div><p class="vq">“Post an assistant for Monday, 8 to 5.”</p><div class="bub ai">Done. Shift posted at $27/hr. 6 assistants nearby were notified.</div>`],
['Help Center with AI','Answers from Talencia\'s own policies in seconds, with sources, in English or Spanish. If it can\'t solve it, it hands off to a person with the context attached.',`<div class="ps-h">Help Center</div><div class="search">How do I renew my RDH license?</div><div class="bub ai">Upload your new license in Profile → Credentials. We verify within 1 business day.<small>Source: Credentialing guide</small></div><div class="chiprow"><span>Talk to a person</span></div>`],
['Live agent & tickets','A real Talencia agent joins the same chat. Every issue gets a ticket you can track, from opened to solved.',`<div class="ps-h">Support</div><div class="tk"><small>TICKET #4821</small><b>Timesheet correction</b><span class="pg">In progress · Maria (live)</span></div><div class="bub ag"><b>Maria · Talencia</b>Fixed your Tuesday hours. You'll see it on Friday's pay.</div>`],
['Account management','Profile, licenses, team members, locations and notifications in one place, with expiry reminders before anything lapses.',`<div class="ps-h">Account</div><ul class="ls"><li>Locations <b>3</b></li><li>Team members <b>7</b></li><li>RDH license <b class="warn">expires in 20 days</b></li><li>Two-step sign-in <b>On</b></li></ul>`],
['Payments','Offices pay one invoice with auto-pay courtesies. Professionals see every paycheck, same-day pay and Rewards on their Talencia card.',`<div class="ps-h">Payments</div><div class="bal"><small>TALENCIA PAY CARD</small><b>$412.50</b><span>Same-day pay · today</span></div><ul class="ls"><li>Rewards <b>340 pts</b></li><li>Next payroll <b>Fri</b></li><li>Office invoice <b>Auto-pay on</b></li></ul>`],
['Sign in your way','Email and password, a one-tap magic link, or Google, Apple and LinkedIn. Two-step verification keeps accounts safe.',`<div class="ps-h">Welcome</div><div class="sbtn">Continue with Google</div><div class="sbtn dk">Continue with Apple</div><div class="sbtn li">Continue with LinkedIn</div><div class="sbtn ghost">Email me a magic link</div><div class="sbtn ghost">Email and password</div><a class="btn sm" href="#signin">Try the sign-in demo</a>`]];
tabs($$('[data-a]'),i=>{$('#app-screen').innerHTML=A[i][2];$('#app-copy').innerHTML=`<h3>${A[i][0]}</h3><p>${A[i][1]}</p><p class="tiny">Preview screens with demo data.</p>`});
$('#app-screen').innerHTML=A[0][2];$('#app-copy').innerHTML=`<h3>${A[0][0]}</h3><p>${A[0][1]}</p><p class="tiny">Preview screens with demo data.</p>`;
// calculator
const cv=$('#cv'),cd=$('#cd');const calc=()=>{$('#cv-o').textContent='$'+fmt(+cv.value);$('#cd-o').textContent=cd.value;$('#cost').textContent='$'+fmt(cv.value*cd.value*12)+' a year at risk'};cv.oninput=cd.oninput=calc;calc();
// contact button label
$$('[name=who]').forEach(r=>r.addEventListener('change',()=>{$('.go').textContent=r.value==='office'?'Request talent: we call today':'Join the network'}));
})();
