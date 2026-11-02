(()=>{const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mb=$('.menu-btn'),ms=$('#msheet'),mbd=$('.ms-bd');
const msOpen=()=>{ms.hidden=mbd.hidden=false;document.body.classList.add('ms-lock');mb.setAttribute('aria-expanded','true');requestAnimationFrame(()=>ms.classList.add('open'));$('.ms-x').focus()};
const msClose=(f=true)=>{if(ms.hidden)return;ms.classList.remove('open');document.body.classList.remove('ms-lock');mb.setAttribute('aria-expanded','false');mbd.hidden=true;setTimeout(()=>ms.hidden=true,rm?0:280);if(f)mb.focus()};
if(mb&&ms){mb.onclick=msOpen;$('.ms-x').onclick=()=>msClose();mbd.onclick=()=>msClose();
$$('.ms-g>.ms-h').forEach(b=>b.onclick=()=>{const o=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',o);$('#'+b.getAttribute('aria-controls')).hidden=!o});
$$('a',ms).forEach(a=>a.addEventListener('click',()=>msClose(false)));
document.addEventListener('keydown',e=>{if(e.key==='Escape')msClose()});
ms.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const f=$$('a,button',ms).filter(x=>x.offsetParent),a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});
matchMedia('(min-width:901px)').addEventListener('change',e=>e.matches&&msClose(false))}
$$('.dd>button').forEach(b=>b.onclick=()=>{const o=b.getAttribute('aria-expanded')!=='true';$$('.dd>button').forEach(x=>{x.setAttribute('aria-expanded','false');x.parentNode.classList.remove('open')});b.setAttribute('aria-expanded',o);b.parentNode.classList.toggle('open',o)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.dd.open').forEach(d=>{d.classList.remove('open');$('button',d).setAttribute('aria-expanded','false')})});
// reveal
if(!rm&&'IntersectionObserver'in window){$$('.rv').forEach(e=>{if(e.getBoundingClientRect().top<innerHeight)e.classList.add('in')});const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});$$('.rv').forEach(el=>io.observe(el))}else $$('.rv').forEach(e=>e.classList.add('in'));
// auth
const au=$('#auth');$$('[data-signin]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();location.href=new URL('portal/?tab='+(/apply/i.test(b.textContent)?'professionals':(sessionStorage.ptLast||'practices')),document.baseURI)}));if(au){$$('[data-close]',au).forEach(b=>b.onclick=()=>au.close());$$('.sso',au).forEach(b=>b.onclick=()=>{$('#au-msg').textContent='Demo only: '+b.dataset.p+' sign-in is not connected in this concept.'})}
if(location.hash==='#signin'&&au)au.showModal();
// v9.4 round 2: prefill request form from the home quick start
{const q=new URLSearchParams(location.search);['field','when'].forEach(k=>{const v=q.get(k);if(v)$$(`input[name=${k}]`).forEach(i=>{if(i.value===v)i.checked=true})})}
// demo forms
$$('form[data-demo]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const m=$('.ok-msg',f);m.classList.add('show');m.focus()}));
// calculator
$$('[data-calc]').forEach(c=>{const d=$('[name=days]',c),v=$('[name=val]',c),o=$('.calc-out',c),dl=$('.dv',c),vl=$('.vv',c);const u=()=>{dl.textContent=d.value;vl.textContent='$'+(+v.value).toLocaleString();o.textContent='$'+(d.value*v.value*12).toLocaleString()};d.oninput=v.oninput=u;u()});
// jobs board
const bd=$('#board');if(bd){const q=new URLSearchParams(location.search);const fr=$('#f-role'),fs=$('#f-state'),fc=$('#f-city');if(q.get('role'))fr.value=q.get('role');if(q.get('state'))fs.value=q.get('state');if(q.get('city'))fc.value=q.get('city');
const run=()=>{let n=0;$$('.job',bd).forEach(j=>{const ok=(!fr.value||fr.value==="dental"||j.dataset.role===fr.value)&&(!fs.value||j.dataset.state===fs.value)&&(!fc.value||j.dataset.city===fc.value);j.hidden=!ok;n+=ok});$('#count').textContent=n+' demo openings'};[fr,fs,fc].forEach(s=>s.onchange=run);run()}
$$('form[data-jobsearch]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();location.href='jobs.html?role='+f.job.value+'&city='+f.location.value+'#board'}));
})();
