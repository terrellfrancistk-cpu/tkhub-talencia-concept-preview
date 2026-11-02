/* v11 blog: audience filter (index), reading progress + TOC scroll-spy (article), demo newsletter */
(()=>{const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

/* --- index: All / For practices / For professionals --- */
/* a 3-column grid with 2 cards left over widens those two so the row has no gap */
const fit=()=>$$('.bl-grid').forEach(g=>{const v=$$(':scope>*',g).filter(c=>!c.hidden);v.forEach(c=>c.classList.remove('wide'));if(v.length%3===2)v.slice(-2).forEach(c=>c.classList.add('wide'))});fit();
const fb=$$('.bl-filter button');if(fb.length){const set=a=>{fb.forEach(b=>b.setAttribute('aria-pressed',b.dataset.a===a));$$('[data-aud]').forEach(c=>c.hidden=!(a==='all'||c.dataset.aud===a));fit();try{history.replaceState(null,'',a==='all'?location.pathname:'#'+a)}catch(e){}};
 fb.forEach(b=>b.addEventListener('click',()=>set(b.dataset.a)));const h=location.hash.slice(1);if(h==='prac'||h==='pro')set(h)}

/* --- article: reading progress bar --- */
const body=$('.ar-body'),bar=$('.ar-progress');if(body&&bar){let t=false;const u=()=>{t=false;const r=body.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight*.35-r.top)/Math.max(1,r.height-innerHeight*.5)));bar.style.setProperty('--rp',p.toFixed(3))};addEventListener('scroll',()=>{if(!t){t=true;requestAnimationFrame(u)}},{passive:true});u()}

/* --- article: table of contents scroll-spy; collapsed by default on small screens --- */
const toc=$('.ar-toc');if(toc){if(matchMedia('(max-width:1000px)').matches)toc.removeAttribute('open');
 const ls=$$('a',toc),hs=ls.map(a=>document.getElementById(a.hash.slice(1))).filter(Boolean);
 const spy=()=>{let i=0;hs.forEach((h,k)=>{if(h.getBoundingClientRect().top<innerHeight*.3)i=k});ls.forEach((a,k)=>a.classList.toggle('on',k===i))};
 addEventListener('scroll',()=>requestAnimationFrame(spy),{passive:true});spy();
 ls.forEach(a=>a.addEventListener('click',()=>{if(matchMedia('(max-width:1000px)').matches)toc.removeAttribute('open')}))}

/* --- demo newsletter: nothing is sent --- */
$$('form[data-news]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const i=$('input',f),m=$('.fine',f);if(!i.value||!i.checkValidity()){i.focus();m.textContent='Enter a valid email address.';return}m.innerHTML='<span class="ok">You’re on the list.</span> Demo only: nothing was sent.';i.value=''}));
})();
