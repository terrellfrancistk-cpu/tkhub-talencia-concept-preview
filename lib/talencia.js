/* Talencia app layer: one interface for auth and data, two providers.
   window.Talencia = { mode, auth, data }
   - auth: signIn, verifyMfa, signUp, magicLink, oauth, resetPassword, current, signOut
   - data: load(role) -> view model for the portal dashboard; act(name, payload) -> perform an action
   Demo provider: sessionStorage session + data/demo/<role>.json. Live provider: Supabase JS v2 (loaded on demand).
   Roles are 'practices' (client accounts) and 'professionals' (talent accounts), matching the portal tabs. */
(()=>{
const C=window.TALENCIA_CONFIG||{mode:'demo',supabase:{}};
const ROLES=['practices','professionals'];
const DB_ROLE={practices:'practice',professionals:'professional'}, UI_ROLE={practice:'practices',professional:'professionals'};

/* ---------- mode: config, overridable per session with ?env=live|demo; live needs a URL and anon key ---------- */
const pickMode=()=>{let m=C.mode;try{const q=new URLSearchParams(location.search).get('env');if(q==='live'||q==='demo')sessionStorage.setItem('tl-env',q);m=sessionStorage.getItem('tl-env')||m}catch(e){}
 if(m==='live'&&!(C.supabase&&C.supabase.url&&C.supabase.anonKey)){console.warn('[Talencia] live mode needs supabase.url and supabase.anonKey in config.js; using demo mode.');return{mode:'demo',fellBack:true}}
 return{mode:m==='live'?'live':'demo',fellBack:false}};
const {mode,fellBack}=pickMode();

/* absolute URL of the portal for a role, used as the email/OAuth redirect target */
const portalUrl=role=>new URL('portal/?tab='+role,document.baseURI).href;

/* ---------- demo provider ---------- */
const demoStore={get(){try{return JSON.parse(sessionStorage.getItem('tl-demo-session')||'null')}catch(e){return null}},set(v){try{v?sessionStorage.setItem('tl-demo-session',JSON.stringify(v)):sessionStorage.removeItem('tl-demo-session')}catch(e){}}};
const demoAuth={
 async signIn(email,_pw,role){demoStore.set({role,email});return{ok:true,role}},
 async verifyMfa(){return{ok:true}},
 async signUp({email,role,name,org}){demoStore.set({role,email,name,org});return{ok:true,role,confirm:false}},
 async magicLink(email,role){return{ok:true,sent:true,demo:true,role,email}},
 async oauth(provider,role){demoStore.set({role,email:'',provider});return{ok:true,role,redirected:false}},
 async resetPassword(){return{ok:true,demo:true}},
 async current(){const s=demoStore.get();return s?{role:s.role,email:s.email,name:s.name||''}:null},
 async signOut(){demoStore.set(null);return{ok:true}},
 enterDemo(role){demoStore.set({role,email:''})}
};
const demoData={
 cache:{},
 async load(role){if(!this.cache[role]){const r=await fetch(new URL('data/demo/'+role+'.json',document.baseURI));if(!r.ok)throw new Error('demo data '+r.status);this.cache[role]=await r.json()}return this.cache[role]},
 async act(name){return{ok:true,demo:true,message:{createRequest:'Demo: request #DEMO-118 created. Nothing was sent.',approveTimesheet:'Approved ✓',claimShift:'Claimed ✓',clock:'Demo: time recorded locally.'}[name]||'Demo: nothing was sent.'}}
};

/* ---------- live provider (Supabase) ---------- */
let sbP;
const sb=()=>sbP||(sbP=new Promise((res,rej)=>{if(window.supabase&&window.supabase.createClient)return res(make());const s=document.createElement('script');s.src=C.supabaseJs;s.onload=()=>res(make());s.onerror=()=>rej(new Error('Could not load Supabase'));document.head.append(s)}));
const make=()=>window.supabase.createClient(C.supabase.url,C.supabase.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
const err=e=>({ok:false,error:(e&&e.message)||String(e)});
const PROVIDER={apple:'apple',google:'google',linkedin:'linkedin_oidc'};

const liveAuth={
 async signIn(email,password){const c=await sb();const{error}=await c.auth.signInWithPassword({email,password});if(error)return err(error);
  /* multi-factor: if the account has a verified TOTP factor, ask for the code before continuing */
  const{data:al}=await c.auth.mfa.getAuthenticatorAssuranceLevel();
  if(al&&al.nextLevel==='aal2'&&al.currentLevel!=='aal2'){const{data:f}=await c.auth.mfa.listFactors();const t=f&&f.totp&&f.totp.find(x=>x.status==='verified');if(t)return{ok:true,mfaRequired:true,factorId:t.id}}
  const me=await this.current();return{ok:true,role:me&&me.role}},
 async verifyMfa(factorId,code){const c=await sb();const{error}=await c.auth.mfa.challengeAndVerify({factorId,code});if(error)return err(error);const me=await this.current();return{ok:true,role:me&&me.role}},
 async signUp({email,password,role,name,org}){const c=await sb();const{data,error}=await c.auth.signUp({email,password,options:{emailRedirectTo:portalUrl(role),data:{role:DB_ROLE[role],full_name:name||null,org_name:org||null}}});
  if(error)return err(error);return{ok:true,role,confirm:!data.session}},
 async magicLink(email,role,create){const c=await sb();const{error}=await c.auth.signInWithOtp({email,options:{emailRedirectTo:portalUrl(role),shouldCreateUser:!!create,data:create?{role:DB_ROLE[role]}:undefined}});
  return error?err(error):{ok:true,sent:true,role,email}},
 async oauth(provider,role){const c=await sb();try{localStorage.setItem('tl-intended-role',role)}catch(e){}
  const{error}=await c.auth.signInWithOAuth({provider:PROVIDER[provider],options:{redirectTo:portalUrl(role)}});return error?err(error):{ok:true,redirected:true}},
 async resetPassword(email,role){const c=await sb();const{error}=await c.auth.resetPasswordForEmail(email,{redirectTo:portalUrl(role)+'&reset=1'});return error?err(error):{ok:true}},
 /* signed-in user + role from profiles; first OAuth sign-in claims the role chosen before the redirect */
 async current(){const c=await sb();const{data:{session}}=await c.auth.getSession();if(!session)return null;
  const uid=session.user.id;let{data:p}=await c.from('profiles').select('role,full_name').eq('id',uid).maybeSingle();
  if(p&&!p.role){let want=null;try{want=localStorage.getItem('tl-intended-role')}catch(e){}
   if(want&&DB_ROLE[want]){const{error}=await c.rpc('claim_role',{p_role:DB_ROLE[want]});if(!error)p.role=DB_ROLE[want]}}
  try{localStorage.removeItem('tl-intended-role')}catch(e){}
  return{role:p&&UI_ROLE[p.role]||null,email:session.user.email,name:(p&&p.full_name)||''}},
 async signOut(){const c=await sb();await c.auth.signOut();return{ok:true}}
};

/* live queries map database rows to the same view model the demo JSON uses, so the dashboard has one renderer */
const money=c=>'$'+(c/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const day=d=>d?new Date(d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'';
const time=d=>d?new Date(d).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
const TONE={open:'w',matching:'w',pending:'w',in_review:'w',interviewing:'n',filled:'',approved:'',paid:'',verified:'',confirmed:'',expired:'n',missing:'n',disputed:'n'};
const label=s=>String(s||'').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
const liveData={
 async load(role){const c=await sb();const{data:{session}}=await c.auth.getSession();if(!session)throw new Error('Not signed in');const uid=session.user.id;
  const q=async p=>{const{data,error}=await p;if(error){console.warn('[Talencia]',error.message);return[]}return data||[]};
  const{data:prof}=await c.from('profiles').select('full_name,org_id,organizations(name,city,state,id)').eq('id',uid).maybeSingle();
  if(role==='practices'){const org=prof&&prof.organizations||{};
   const[reqs,shifts,ts,inv,team,pts]=await Promise.all([
    q(c.from('shift_requests').select('id,role_title,engagement,starts_at,ends_at,status').order('starts_at',{ascending:true}).limit(20)),
    q(c.from('shifts').select('id,starts_at,status,professional:profiles!shifts_professional_id_fkey(full_name)').eq('status','filled').order('starts_at',{ascending:false}).limit(10)),
    q(c.from('timesheets').select('id,clock_in,clock_out,break_minutes,status,professional:profiles(full_name)').eq('status','submitted').limit(20)),
    q(c.from('invoices').select('id,number,period_start,period_end,total_cents,status,due_on,paid_at').order('period_end',{ascending:false}).limit(12)),
    q(c.from('profiles').select('full_name,org_role').eq('org_id',prof&&prof.org_id)),
    q(c.from('rewards_ledger').select('points').eq('org_id',prof&&prof.org_id))]);
   const open=reqs.filter(r=>r.status!=='filled'&&r.status!=='cancelled'),total=pts.reduce((a,r)=>a+r.points,0);
   return{live:true,account:{name:org.name||'Your practice',meta:[org.city,org.state].filter(Boolean).join(', ')},
    kpis:[[String(open.length),'Open requests'],[String(shifts.length),'Recently filled'],[String(inv.filter(i=>i.status==='open').length),'Open invoices'],[total.toLocaleString('en-US'),'Reward points']],
    requests:open.map(r=>({title:`${r.role_title} · ${day(r.starts_at)}`,meta:`${time(r.starts_at)}–${time(r.ends_at)} · ${label(r.engagement)}`,status:label(r.status),tone:TONE[r.status]||''})),
    filled:shifts.map(s=>({title:`${(s.professional&&s.professional.full_name)||'Professional'} · ${day(s.starts_at)}`,meta:'',status:'Filled',tone:''})),
    calendar:null,workers:[],
    timesheets:ts.map(t=>({id:t.id,who:`${(t.professional&&t.professional.full_name)||'Professional'} · ${day(t.clock_in)}`,detail:`${time(t.clock_in)}–${time(t.clock_out)}${t.break_minutes?` · ${t.break_minutes} min break`:''}`})),
    invoices:{list:inv.map(i=>({title:`${i.number} · ${day(i.period_start)}–${day(i.period_end)}`,meta:i.paid_at?`Paid ${day(i.paid_at)}`:`Due ${day(i.due_on)} · ${money(i.total_cents)}`,status:label(i.status),tone:TONE[i.status]||''})),breakdown:null},
    rewards:{kpis:[[total.toLocaleString('en-US'),'Office points']],items:[]},
    team:team.map(t=>({name:t.full_name||'Team member',meta:'',role:label(t.org_role),tone:''})),
    recruiter:'',messages:[],tickets:[],faq:[]}}
  const[open,mine,ts,creds,apps,led]=await Promise.all([
   q(c.from('shifts').select('id,starts_at,ends_at,rate_cents,organization:organizations(name)').eq('status','open').order('starts_at').limit(20)),
   q(c.from('shifts').select('id,starts_at,ends_at,status,organization:organizations(name)').eq('professional_id',uid).gte('starts_at',new Date().toISOString()).order('starts_at').limit(20)),
   q(c.from('timesheets').select('id,clock_in,clock_out,status').eq('professional_id',uid).order('clock_in',{ascending:false}).limit(10)),
   q(c.from('credentials').select('kind,number,expires_on,status').eq('professional_id',uid)),
   q(c.from('applications').select('title,applied_at,status').eq('professional_id',uid).order('applied_at',{ascending:false})),
   q(c.from('rewards_ledger').select('points,reason,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(20))]);
  const pts=led.reduce((a,r)=>a+r.points,0);
  return{live:true,account:{name:(prof&&prof.full_name||'').split(' ')[0]||'there',meta:''},
   shifts:open.map(s=>({id:s.id,title:(s.organization&&s.organization.name)||'Open shift',meta:`${day(s.starts_at)} · ${time(s.starts_at)}–${time(s.ends_at)}`,rate:s.rate_cents?money(s.rate_cents)+'/hr':''})),
   schedule:mine.map(s=>({title:`${day(s.starts_at)} · ${(s.organization&&s.organization.name)||''}`,meta:`${time(s.starts_at)}–${time(s.ends_at)}`,status:label(s.status),tone:TONE[s.status]||''})),
   pay:null,
   timesheet:{today:null,rows:ts.map(t=>({title:`${day(t.clock_in)} · ${time(t.clock_in)}–${time(t.clock_out)}`,meta:'',status:label(t.status),tone:TONE[t.status]||''}))},
   wallet:{kpis:[['$'+pts.toLocaleString('en-US'),'Reward dollars']],rows:led.map(r=>({title:r.reason,meta:day(r.created_at),status:(r.points>0?'+':'')+'$'+r.points,tone:''}))},
   apps:apps.map(a=>({title:a.title,meta:`Applied ${day(a.applied_at)}`,status:label(a.status),tone:TONE[a.status]||''})),
   creds:creds.map(x=>({title:label(x.kind),meta:[x.number,x.expires_on&&'expires '+day(x.expires_on)].filter(Boolean).join(' · '),status:label(x.status),tone:TONE[x.status]||''})),
   recruiter:'',messages:[],tickets:[],faq:[]}},
 async act(name,p){const c=await sb();const{data:{session}}=await c.auth.getSession();if(!session)return err('Not signed in');let r;
  if(name==='createRequest')r=await c.from('shift_requests').insert({role_title:p.role,engagement:p.engagement,starts_at:p.startsAt||null,notes:p.notes||null});
  else if(name==='approveTimesheet')r=await c.from('timesheets').update({status:'approved'}).eq('id',p.id);
  else if(name==='claimShift')r=await c.rpc('claim_shift',{p_shift_id:p.id});
  else if(name==='clock')r=await c.rpc(p.out?'clock_out':'clock_in',{p_shift_id:p.id||null});
  else return err('Not available yet');
  return r.error?err(r.error):{ok:true,message:{createRequest:'Request sent. A recruiter will follow up today.',approveTimesheet:'Approved ✓',claimShift:'Claimed ✓',clock:'Time recorded.'}[name]}}
};

window.Talencia={mode,fellBack,roles:ROLES,portalUrl,auth:mode==='live'?liveAuth:demoAuth,data:mode==='live'?liveData:demoData,demo:demoAuth};
})();
