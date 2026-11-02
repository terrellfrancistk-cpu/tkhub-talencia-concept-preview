/* v13 rewards: your hours drive one live estimate (hero card, spend picker, tier ladder, sticky CTA). Uses Talencia's published values:
   1 point = $1 per hour worked or booked, milestone and birthday bonuses, tap-to-add referral/CE/community/auto-pay bonuses. */
(()=>{const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const WEEKS=48,TIERS=[['Spark',500],['Stride',1000],['Momentum',1500],['Summit',2000],['Vanguard',Infinity]];
const h=$('#rw-h'),b=$('#rw-b'),tot=$('#rw-tot');if(!tot)return;
let aud='pro',shown=0,anim;

/* count the big number from what's shown to the new value */
let fb;const tween=to=>{cancelAnimationFrame(anim);clearTimeout(fb);if(RM||document.hidden){shown=to;tot.textContent=money(to);return}
 fb=setTimeout(()=>{cancelAnimationFrame(anim);shown=to;tot.textContent=money(to)},600); /* lands the final value even if animation frames are paused */
 const from=shown,t0=performance.now();
 const f=t=>{const p=Math.min(1,(t-t0)/450),e=1-Math.pow(1-p,3);shown=from+(to-from)*e;tot.textContent=money(shown);if(p<1)anim=requestAnimationFrame(f)};anim=requestAnimationFrame(f)};

const calc=()=>{let rows;
 if(aud==='pro'){const hrs=+h.value*WEEKS,ms=[100,500,1000].filter(x=>hrs>=x).length;$('#rw-ho').textContent=h.value;
  rows=[[`${hrs.toLocaleString('en-US')} hours worked`,hrs],[`${ms} hour milestone${ms===1?'':'s'}`,ms*25],['Birthday bonus',25]]}
 else{const hrs=+b.value*WEEKS;$('#rw-bo').textContent=b.value;rows=[[`${hrs.toLocaleString('en-US')} hours booked`,hrs]]}
 $$(`.rw-bonus[data-aud=${aud}][aria-pressed=true]`).forEach(x=>rows.push([$('span:not(.ico)',x).textContent,+x.dataset.pts]));
 const t=rows.reduce((a,r)=>a+r[1],0),i=TIERS.findIndex(x=>t<=x[1]),lo=i?TIERS[i-1][1]:0,hi=i<4?TIERS[i][1]:2500;
 tween(t);$('#rw-mo').textContent=money(t/12);$('#rw-tier').textContent=TIERS[i][0];
 $('#rw-next').textContent=i<4?`${(hi+1-t).toLocaleString('en-US')} to ${TIERS[i+1][0]}`:'Top tier';
 $('#rw-pb').style.width=Math.min(100,(t-lo)/(hi-lo)*100).toFixed(1)+'%';
 $('#rw-feed').innerHTML=rows.filter(r=>r[1]).map(r=>`<li><span>${r[0]}</span><b>+${money(r[1])}</b></li>`).join('');
 $('#rw-amt').textContent=money(t);$('#rw-st').textContent=money(t);$('#rw-mini').textContent=money(t);
 /* ladder: each tier is a fifth of the track; Vanguard fills the last fifth up to 2,500 */
 $('.rw-track').style.setProperty('--p',Math.min(100,i*20+20*Math.min(1,(t-lo)/(hi-lo))).toFixed(1)+'%');
 $$('.rw-tiers li').forEach((li,k)=>li.classList.toggle('on',k===i))};

[h,b].forEach(e=>e.addEventListener('input',calc));
$$('.rw-bonus').forEach(x=>x.addEventListener('click',()=>{x.setAttribute('aria-pressed',x.getAttribute('aria-pressed')!=='true');calc();if(!RM){tot.classList.remove('rw-bump');void tot.offsetWidth;tot.classList.add('rw-bump')}}));

/* spend picker: one selected option, description underneath */
$$('.rw-picks').forEach(g=>$$('.rw-pick',g).forEach(p=>p.addEventListener('click',()=>{$$('.rw-pick',g).forEach(x=>x.setAttribute('aria-pressed',x===p));$('#rw-desc').textContent=p.dataset.desc})));

/* professional / business: swap the slider, picks, bonuses and CTAs */
$$('[data-aud-btn]').forEach(bt=>bt.addEventListener('click',()=>{aud=bt.dataset.audBtn;$$('[data-aud-btn]').forEach(x=>x.setAttribute('aria-pressed',x===bt));$$('[data-aud]').forEach(x=>x.hidden=x.dataset.aud!==aud);
 const g=$(`.rw-picks[data-aud=${aud}]`),p=$('.rw-pick[aria-pressed=true]',g);$('#rw-desc').textContent=p.dataset.desc;calc()}));

/* sticky estimate + CTA: visible between the hero and the closing call to action */
const st=$('.rw-sticky'),hero=$('.rw-hero'),end=$('.rw-end');if(st){const upd=()=>{st.hidden=hero.getBoundingClientRect().bottom>0||end.getBoundingClientRect().top<innerHeight};addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd);upd()}
calc();
})();
