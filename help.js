/* v11 help center: live article search (index) and "Was this helpful?" (articles). Loads help-data.js on demand. */
(()=>{const $=(s,r=document)=>r.querySelector(s);
const need=()=>window.TC_HELP?Promise.resolve():new Promise(r=>{const s=document.createElement('script');s.src='help-data.js?v=11';s.onload=r;document.head.append(s)});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const q=$('#hc-q'),res=$('#hc-res');if(q&&res){need().then(()=>{
 const run=()=>{const v=q.value.trim();if(!v){res.hidden=true;return}const r=window.TC_HELP_SEARCH(v,6);
  res.innerHTML=r.length?r.map(({a})=>`<a href="help/${a.slug}.html" role="option"><b>${esc(a.title)}</b><span>${esc(a.summary)}</span></a>`).join(''):'<p>No articles match yet. Try different words, or <a href="contact.html#chat">ask in chat</a>.</p>';res.hidden=false};
 q.addEventListener('input',run);q.addEventListener('focus',run);
 q.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){const f=res.querySelector('a');if(f){e.preventDefault();f.focus()}}if(e.key==='Enter'){const f=res.querySelector('a');if(f)location.href=f.href}if(e.key==='Escape'){res.hidden=true}});
 res.addEventListener('keydown',e=>{const a=document.activeElement;if(e.key==='ArrowDown'&&a.nextElementSibling){e.preventDefault();a.nextElementSibling.focus()}if(e.key==='ArrowUp'){e.preventDefault();(a.previousElementSibling||q).focus()}});
 document.addEventListener('click',e=>{if(!e.target.closest('.hc-search'))res.hidden=true});
 const p=new URLSearchParams(location.search).get('q');if(p){q.value=p;run()}})}

const fb=$('[data-fb]');if(fb)fb.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;
 fb.innerHTML=b.dataset.v==='yes'?'<span class="ok">Thanks for letting us know.</span>':'<span class="ok">Sorry about that. A real person can help:</span> <a class="tc-chip" href="sms:+12145222008">Text us</a><button type="button" class="tc-chip" data-chat-open>Open chat</button>'});
})();
