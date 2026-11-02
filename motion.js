/* v9.4 motion: smooth wheel scrolling, staggered reveals in/out, count-ups, parallax, subtle scroll zoom, map entrance, FAQ accordion, phone fit (never scroll-scaled). Vanilla, rAF-batched, reduced-motion aware. */
(()=>{const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- phone fit: depends on width only, so mobile URL-bar show/hide never rescales it --- */
const phones=$$('.iph');let lastW=0;const H0=Math.max(innerHeight,560);
const fit=()=>{const vw=document.documentElement.clientWidth;if(vw===lastW)return;lastW=vw;
 phones.forEach(ph=>{const maxW=vw<=900?vw-56:440;let s=Math.min(1,maxW/430,vw>900?(H0-140)/876:9);s=Math.max(.5,s);ph.style.setProperty('--s',s.toFixed(4))})};
fit();addEventListener('resize',fit);
/* --- v9.4 phone demo: poster until the user hovers (desktop) or taps; once started it never reloads on scroll --- */
const startDemo=ph=>{const f=$('iframe',ph);if(!f||f.dataset.on)return f;f.dataset.on=1;f.src=f.dataset.src;ph.classList.add('on');const p=$('.iph-poster',ph);f.addEventListener('load',()=>{p&&p.classList.add('gone');setTimeout(()=>p&&p.remove(),450)},{once:true});return f};
$$('.iph').forEach(ph=>{const p=$('.iph-poster',ph);if(!p)return;p.addEventListener('click',()=>startDemo(ph));
 if(matchMedia('(hover:hover) and (pointer:fine)').matches)ph.addEventListener('pointerenter',()=>startDemo(ph),{once:true})});
$$('[data-reload-demo]').forEach(b=>b.addEventListener('click',()=>{const ph=b.closest('section')?.querySelector('.iph');if(!ph)return;const f=$('iframe',ph);if(!f.dataset.on){startDemo(ph);return}f.src=f.dataset.src+'&r='+Date.now()}));

/* --- FAQ accordion with smooth height animation --- */
$$('.faq details').forEach(d=>{const s=$('summary',d),a=$('.ans',d);s.addEventListener('click',e=>{e.preventDefault();if(RM){d.open=!d.open;return}
 if(d.open){a.style.height=a.scrollHeight+'px';requestAnimationFrame(()=>{a.style.transition='height .38s cubic-bezier(.2,.7,.2,1),opacity .3s';a.style.height='0px';a.style.opacity='0'});d.classList.add('closing');setTimeout(()=>{d.open=false;d.classList.remove('closing');a.style.cssText=''},380)}
 else{d.open=true;const h=a.scrollHeight;a.style.height='0px';a.style.opacity='0';requestAnimationFrame(()=>{a.style.transition='height .42s cubic-bezier(.2,.7,.2,1),opacity .4s';a.style.height=h+'px';a.style.opacity='1'});setTimeout(()=>{a.style.cssText=''},440)}})});
$$('.faq-tabs button').forEach(b=>b.addEventListener('click',()=>{$$('.faq-tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));$$('.faq details').forEach(d=>d.hidden=!(b.dataset.f==='all'||d.dataset.f===b.dataset.f))}));

/* --- count-ups --- */
const cnt=el=>{const raw=el.textContent.trim(),m=raw.match(/^([^0-9]*)([\d,]+)(.*)$/);if(!m)return;const to=+m[2].replace(/,/g,''),comma=m[2].includes(',');el.dataset.done=1;
 if(RM)return;const t0=performance.now(),D=1400;const f=t=>{const p=Math.min(1,(t-t0)/D),e=1-Math.pow(1-p,3),v=Math.round(to*e);el.textContent=m[1]+(comma?v.toLocaleString('en-US'):v)+m[3];if(p<1)requestAnimationFrame(f)};el.textContent=m[1]+'0'+m[3];requestAnimationFrame(f)};

if(RM||!('IntersectionObserver'in window))return;

/* --- staggered reveals; elements ease in, and drift out when they leave above --- */
const groups='.tiles,.steps,.stats,.svc-grid,.why,.testi,.feat,.faq,.cols,.acts,.roles';
$$(groups).forEach(g=>[...g.children].forEach((c,i)=>{if(!c.closest('.iph')){c.classList.add('mv');c.style.setProperty('--i',i%8)}}));
$$('section h2, section .eyebrow, section .lead').forEach(e=>{if(!e.closest('.rv')&&!e.closest('.mv'))e.classList.add('mv')});
const io=new IntersectionObserver(es=>es.forEach(e=>{const t=e.target;if(e.isIntersecting){t.classList.add('in');t.classList.remove('out-up')}else if(e.boundingClientRect.top<0){t.classList.add('out-up');t.classList.remove('in')}else t.classList.remove('in','out-up')}),{threshold:.08,rootMargin:'0px 0px -6% 0px'});
$$('.mv').forEach(e=>io.observe(e));
const cio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&!e.target.dataset.done){cnt(e.target);cio.unobserve(e.target)}}),{threshold:.6});
$$('.stat b,[data-count]').forEach(e=>cio.observe(e));

/* --- map entrance --- */
const mb=$('.map-box');if(mb){mb.classList.add('pre');const mio=new IntersectionObserver(es=>{if(es[0].isIntersecting){const ps=$$('#usmap .st',mb);ps.forEach((p,i)=>p.style.transitionDelay=(Math.min(i,50)*14)+'ms');requestAnimationFrame(()=>mb.classList.remove('pre'));setTimeout(()=>ps.forEach(p=>p.style.transitionDelay=''),1600);mio.disconnect()}},{threshold:.25});mio.observe(mb)}

/* --- parallax + subtle zoom (never the phone) --- */
$$('.hx .hx-h,.hx .hx-lead,.page-hero h1').forEach((e,i)=>{e.classList.add('par');e.dataset.p=i?.06:.12});
$$('.tile.big,.map-box,.svc-grid,.testi,.dark .wrap').forEach(e=>{if(!e.closest('.iph'))e.classList.add('zm')});
const par=$$('.par'),zm=$$('.zm');let tick=false;
const upd=()=>{tick=false;const vh=innerHeight,y=scrollY;
 par.forEach(e=>{if(y<vh*1.2)e.style.transform=`translate3d(0,${(y*e.dataset.p).toFixed(1)}px,0)`;});
 zm.forEach(e=>{const r=e.getBoundingClientRect();if(r.bottom<0||r.top>vh)return;const c=(r.top+r.height/2-vh/2)/vh;const z=1-Math.min(.05,Math.abs(c)*.06);e.style.setProperty('--z',z.toFixed(4))})};
addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(upd)}},{passive:true});upd();

/* --- buttery wheel scrolling (desktop mouse wheels only; touch & trackpads stay native) --- */
if(matchMedia('(pointer:fine)').matches){let target=scrollY,cur=scrollY,running=false;
 const max=()=>document.documentElement.scrollHeight-innerHeight;
 const step=()=>{cur+=(target-cur)*.12;if(Math.abs(target-cur)<.5){cur=target;running=false}window.scrollTo(0,cur);if(running)requestAnimationFrame(step)};
 addEventListener('wheel',e=>{if(e.ctrlKey||e.defaultPrevented||Math.abs(e.deltaY)<40&&e.deltaMode===0&&!Number.isInteger(e.deltaY))return; // trackpad: native
  let n=e.target;while(n&&n!==document.body){if(n.scrollHeight>n.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(n).overflowY))return;n=n.parentElement}
  if(document.body.classList.contains('ms-lock')||$('dialog[open]'))return;
  e.preventDefault();if(!running){target=cur=scrollY}target=Math.max(0,Math.min(max(),target+e.deltaY*(e.deltaMode===1?40:1)));if(!running){running=true;document.documentElement.style.scrollBehavior='auto';requestAnimationFrame(step)}},{passive:false});
 addEventListener('scroll',()=>{if(!running){target=cur=scrollY}},{passive:true})}
})();
