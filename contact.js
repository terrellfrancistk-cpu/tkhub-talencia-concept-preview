/* v11 contact: "What can we help with?" chooser drives the hint and the form; live recruiter status (demo hours) */
(()=>{const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const HINT={prac:'Fastest: <a href="tel:+12145222008">call or text 214.522.2008</a> with the role and date. Or <a href="request-talent.html">request talent online</a>.',
 pro:'<a href="jobs.html">Browse open shifts</a> now, or send a note below and a recruiter reaches out the same day.',
 team:'Shift changes and pay questions: <a href="sms:+12145222008">text your recruiter</a>. They already know your file.'};
const opts=$$('.ct-opt'),hint=$('.ct-hint'),f=$('.ct-form');
const pick=(w,from)=>{opts.forEach(o=>o.setAttribute('aria-pressed',o.dataset.who===w));if(hint){hint.innerHTML=HINT[w];hint.hidden=false}
 if(f){const r=$(`input[name=who][value=${w}]`,f);if(r)r.checked=true;$$('[data-for]',f).forEach(x=>{x.hidden=x.dataset.for!==w;$$('input,select,textarea',x).forEach(i=>i.disabled=x.hidden)})}};
opts.forEach(o=>o.addEventListener('click',()=>pick(o.dataset.who)));
if(f){$$('input[name=who]',f).forEach(r=>r.addEventListener('change',()=>pick(r.value)));$$('[data-for]',f).forEach(x=>{x.hidden=true;$$('input,select,textarea',x).forEach(i=>i.disabled=true)})}
const st=$('.ct-status [data-live]');if(st){let on=true;try{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'numeric',hourCycle:'h23'}).formatToParts(new Date()),wd=p.find(x=>x.type==='weekday').value,h=+p.find(x=>x.type==='hour').value;on=!/Sat|Sun/.test(wd)&&h>=7&&h<18}catch(e){}
 st.innerHTML=`<i class="${on?'':'off'}" aria-hidden="true"></i>${on?'Recruiters online now':'Recruiters are offline · back at 7am CT'}`}
})();
