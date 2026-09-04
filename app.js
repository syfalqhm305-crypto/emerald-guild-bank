/* =========================================================
   EMERALD GUILD BANK — frontend app
   All data comes from the real backend via Api.* (see api.js).
   ========================================================= */

const NAV_ITEMS = [
  {r:'dashboard',    icon:'home',     label:'الرئيسية'},
  {r:'account',      icon:'user',     label:'حسابي'},
  {r:'send',         icon:'send',     label:'إرسال'},
  {r:'receive',      icon:'download', label:'استلام'},
  {r:'transfers',    icon:'shuffle',  label:'التحويلات'},
  {r:'history',      icon:'clock',    label:'سجل العمليات'},
  {r:'members',      icon:'users',    label:'الأعضاء'},
  {r:'store',        icon:'bag',      label:'المتجر'},
  {r:'competitions', icon:'trophy',   label:'المسابقات'},
  {r:'prizes',       icon:'gift',     label:'الجوائز'},
  {r:'cards',        icon:'card',     label:'البطاقات'},
  {r:'settings',     icon:'gear',     label:'الإعدادات'},
  {r:'support',      icon:'headset',  label:'الدعم'},
];
const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

let STATE = null;
let SESSION = null;
let cart = {}; // itemId -> qty

/* ---------- session (local to this browser only — see README re: auth) ---------- */
function loadSessionLocal(){
  try{
    const raw = localStorage.getItem('emerald_session');
    if(raw){ const s = JSON.parse(raw); if(STATE.members.find(m=>m.id===s.memberId)) return s; }
  }catch(e){}
  return {memberId: (STATE.members[0]||{}).id || null};
}
function saveSessionLocal(){ try{ localStorage.setItem('emerald_session', JSON.stringify(SESSION)); }catch(e){} }

/* ---------- data helpers ---------- */
function me(){ return STATE.members.find(m=>m.id===SESSION.memberId) || STATE.members[0]; }
function isOwner(m){ return (m||me()).role==='owner'; }
function isLeader(m){ m=m||me(); return m.role==='owner'||m.role==='leader'; }
function fmt(n){ return Math.round(n).toLocaleString('en-US'); }
function cur(){ return STATE.info.currency; }
function memberTx(id){ return STATE.transactions.filter(t=>t.memberId===id).sort((a,b)=> new Date(b.date)-new Date(a.date)); }
function initials(name){ return (name||'?').trim().slice(0,1).toUpperCase(); }

function formatDate(iso){
  const d = new Date(iso), now = new Date();
  const sd = x => new Date(x.getFullYear(),x.getMonth(),x.getDate());
  const diff = Math.round((sd(now)-sd(d))/86400000);
  const time = d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
  let lbl = diff===0 ? 'اليوم' : diff===1 ? 'أمس' : `${ARABIC_MONTHS[d.getMonth()]} ${d.getDate()}`;
  return {lbl, time};
}
function waLink(phone, text){
  const p = (phone||'').replace(/[^0-9]/g,'');
  return 'https://wa.me/' + p + (text ? ('?text='+encodeURIComponent(text)) : '');
}

/* ---------- toast ---------- */
function toast(msg, isErr){
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 2800);
}
async function withBusy(btn, fn){
  try{ if(btn) btn.setAttribute('disabled','disabled'); await fn(); }
  catch(e){ toast(e.message || 'حدث خطأ', true); }
  finally{ if(btn) btn.removeAttribute('disabled'); }
}

/* ---------- logo (original SVG crest, no text) ---------- */
function logoSVG(size){
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gemFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#bffbe0"/>
        <stop offset="45%" stop-color="#34d9a0"/>
        <stop offset="100%" stop-color="#0d4a3a"/>
      </linearGradient>
      <linearGradient id="wingFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1c6e56"/>
        <stop offset="100%" stop-color="#04140f"/>
      </linearGradient>
    </defs>
    <g opacity="0.9">
      <path d="M18,46 L2,24 L10,40 L0,52 L12,58 L4,68 L20,64 Z" fill="url(#wingFill)" stroke="#2dd9a0" stroke-width="0.6" stroke-opacity="0.5"/>
      <path d="M82,46 L98,24 L90,40 L100,52 L88,58 L96,68 L80,64 Z" fill="url(#wingFill)" stroke="#2dd9a0" stroke-width="0.6" stroke-opacity="0.5"/>
    </g>
    <polygon points="50,8 70,29 83,43 50,93 17,43 30,29" fill="url(#gemFill)" stroke="#08251c" stroke-width="1.4"/>
    <g stroke="#08251c" stroke-width="1" stroke-opacity="0.55" fill="none">
      <line x1="50" y1="8" x2="50" y2="93"/>
      <line x1="17" y1="43" x2="83" y2="43"/>
      <line x1="30" y1="29" x2="50" y2="93"/>
      <line x1="70" y1="29" x2="50" y2="93"/>
      <line x1="50" y1="8" x2="17" y2="43"/>
      <line x1="50" y1="8" x2="83" y2="43"/>
    </g>
    <g fill="#f4fffb">
      <path d="M67,20 l2.2,5 5,2.2 -5,2.2 -2.2,5 -2.2,-5 -5,-2.2 5,-2.2 Z" opacity="0.95"/>
      <path d="M34,54 l1.4,3.2 3.2,1.4 -3.2,1.4 -1.4,3.2 -1.4,-3.2 -3.2,-1.4 3.2,-1.4 Z" opacity="0.8"/>
    </g>
  </svg>`;
}

/* ---------- boot / router ---------- */
async function boot(){
  try{
    STATE = await Api.getState();
  }catch(e){
    document.getElementById('boot-loading').innerHTML =
      'تعذر الاتصال بالخادم.<br>تأكد أن السيرفر يعمل (شغّل: <b>npm start</b> داخل مجلد server) وأن API_BASE في js/api.js صحيح.<br><br><span class="muted">' + e.message + '</span>';
    return;
  }
  document.getElementById('boot-loading').style.display = 'none';
  SESSION = loadSessionLocal();
  document.title = STATE.info.bankName || 'بنك النقابة';
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', ()=>{
    const h = (location.hash||'').replace('#/','') || 'dashboard';
    if(document.getElementById('view-app').style.display!=='none') renderRightPanel(h);
  });
  route();
}

async function refresh(){ STATE = await Api.getState(); }

function route(){
  const h = (location.hash||'').replace('#/','') || '';
  if(!h || h==='landing') showLanding();
  else showApp(h);
}
function enterApp(r){ location.hash = '#/'+r; }
function go(r){ location.hash = '#/'+r; }
function backToLanding(){ location.hash = '#/landing'; }

function showLanding(){
  document.getElementById('view-landing').style.display='flex';
  document.getElementById('view-app').style.display='none';
  renderLanding();
}
function showApp(r){
  document.getElementById('view-landing').style.display='none';
  document.getElementById('view-app').style.display='block';
  renderSidebar(r);
  renderTopbar();
  renderBottomnav(r);
  renderPage(r);
  renderRightPanel(r);
}

/* ---------- landing render ---------- */
function renderLanding(){
  if(!STATE) return;
  document.getElementById('landing-logo').innerHTML = logoSVG(110);
  document.getElementById('landing-guild-name').textContent = STATE.info.guildName;
  document.getElementById('landing-tagline').textContent = STATE.info.tagline;
  document.getElementById('landing-admin').innerHTML = `
    <div class="contact-row">
      <div><div class="contact-name">${STATE.info.adminName}</div><div class="contact-role">مسؤول البنك العام</div></div>
      <a class="wa-btn" href="${waLink(STATE.info.adminPhone,'مرحباً، أحتاج مساعدة بخصوص بنك النقابة')}" target="_blank">${ic('chat',16)}</a>
    </div>`;
  document.getElementById('landing-leaders').innerHTML = STATE.leaders.length ? STATE.leaders.map(l=>`
    <div class="contact-row">
      <div><div class="contact-name">${l.name}</div><div class="contact-role">${l.role}</div></div>
      <a class="wa-btn" href="${waLink(l.phone,'مرحباً '+l.name)}" target="_blank">${ic('chat',16)}</a>
    </div>`).join('') : `<div class="empty">لا يوجد قادة مضافين بعد</div>`;
  document.getElementById('landing-foot').textContent = STATE.info.bankName + ' · ' + STATE.info.tagline;
}

/* ---------- sidebar / topbar / bottomnav ---------- */
function renderSidebar(active){
  const el = document.getElementById('sidebar');
  el.innerHTML = `
    <div class="brand" onclick="backToLanding()">
      <div style="width:34px">${logoSVG(34)}</div>
      <div class="brand-text"><b>${STATE.info.bankName}</b><span>${STATE.info.tagline}</span></div>
    </div>
    ${NAV_ITEMS.map(n=>`<a class="nav-item ${n.r===active?'active':''}" onclick="go('${n.r}')"><span class="ic">${ic(n.icon,17)}</span>${n.label}</a>`).join('')}
    <div class="sidebar-guild">
      <div class="g-ic">${ic('shield',22)}</div>
      <b>${STATE.info.guildName}</b>
      <span>القوة في اتحادنا</span>
      <button class="btn btn-ghost btn-sm btn-block" onclick="go('members')">استكشف المزيد</button>
    </div>`;
}
function renderTopbar(){
  const m = me();
  document.getElementById('search-ic-holder').insertAdjacentHTML('afterbegin', ic('search',15));
  document.getElementById('bell-holder').insertAdjacentHTML('afterbegin', ic('bell',15));
  document.getElementById('mail-holder').innerHTML = ic('mail',15);
  document.getElementById('notif-count').textContent = Math.min(9, STATE.transactions.length);
  document.getElementById('profile-chip').innerHTML = `
    <div class="avatar" style="background:${m.color||'#34d9a0'}">${initials(m.name)}</div>
    <div><b>${m.name}</b><span>${m.title||''}</span></div>
    <span class="chev">${ic('chevdown',13)}</span>`;
}
function renderBottomnav(active){
  document.getElementById('bn-logo').innerHTML = logoSVG(26);
  const map = {dashboard:['home','الرئيسية'], members:['users','الأعضاء'], prizes:['gift','الجوائز']};
  document.querySelectorAll('.bn-item[data-r]').forEach(it=>{
    const [i,l] = map[it.dataset.r];
    it.innerHTML = `<span class="ic">${ic(i,18)}</span>${l}`;
    it.classList.toggle('active', it.dataset.r===active);
  });
  document.querySelector('.bottomnav .bn-item:last-child').innerHTML = `<span class="ic">${ic('gear',18)}</span>المزيد`;
}
function onSearch(q){
  q = (q||'').trim().toLowerCase();
  if(!q) return;
  const hit = STATE.members.find(m=>m.name.toLowerCase().includes(q));
  if(hit) toast('عضو: '+hit.name+' — رصيده '+fmt(hit.balance)+' '+cur());
}

/* ---------- right panel ---------- */
function renderRightPanel(route){
  const el = document.getElementById('rightpanel');
  const inline = document.getElementById('rightpanel-inline');
  const html = route==='store' ? cartPanelHTML() : levelAndLeaderboardHTML();
  el.innerHTML = html;
  inline.innerHTML = window.innerWidth<=900 ? html : '';
}
function levelAndLeaderboardHTML(){
  const m = me();
  const pct = Math.min(100, Math.round((m.levelProgress/m.levelTarget)*100));
  const sorted = [...STATE.members].sort((a,b)=>b.balance-a.balance);
  return `
    <div class="card level-card">
      <div class="muted" style="font-size:11.5px; font-weight:700;">مستواك الحالي</div>
      <div class="logo-holder" style="width:64px; margin-top:10px;">${logoSVG(64)}</div>
      <b>${m.title||'عضو'}</b>
      <div class="progress-bar"><div style="width:${pct}%"></div></div>
      <div class="progress-lbl">${fmt(m.levelProgress)} / ${fmt(m.levelTarget)} للمستوى التالي</div>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-head"><h3>الأعضاء الأعلى رصيداً</h3><a class="link-all" onclick="go('members')">عرض الكل</a></div>
      ${sorted.slice(0,5).map((mm,i)=>`
        <div class="lb-row">
          <div class="lb-rank ${i===0?'top':''}">${i+1}</div>
          <div class="avatar" style="width:26px;height:26px;font-size:11px;background:${mm.color||'#34d9a0'}">${initials(mm.name)}</div>
          <div class="lb-name"><b>${mm.name}</b></div>
          <div class="lb-amt">${fmt(mm.balance)} ${cur()}</div>
        </div>`).join('')}
    </div>`;
}
function cartPanelHTML(){
  const items = Object.keys(cart).map(id=>{ const it=STATE.store.find(s=>s.id===id); return it?{...it, qty:cart[id]}:null; }).filter(Boolean);
  const total = items.reduce((s,i)=>s+i.price*i.qty,0);
  const m = me();
  return `
    <div class="card">
      <div class="card-head"><h3>${ic('cart',16)} سلة الشراء</h3></div>
      ${items.length ? items.map(i=>`
        <div class="cart-row">
          <div class="s-ic" style="width:34px;height:34px;border-radius:9px;">${i.icon}</div>
          <div class="cart-info">
            <div style="font-size:12.5px; font-weight:700;">${i.name}</div>
            <div style="font-size:11px; color:var(--text-dim);">${fmt(i.price)} ${cur()}</div>
          </div>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="cartAdd('${i.id}',-1)">−</button>
            <span style="font-size:12px; font-weight:800; min-width:14px; text-align:center;">${i.qty}</span>
            <button class="qty-btn" onclick="cartAdd('${i.id}',1)">+</button>
          </div>
        </div>`).join('') : `<div class="empty">السلة فارغة، أضف منتجات من المتجر</div>`}
      ${items.length ? `
        <div class="cart-total"><span>الإجمالي</span><span>${fmt(total)} ${cur()}</span></div>
        <div class="muted" style="font-size:11px; margin-top:8px;">رصيدك الحالي: ${fmt(m.balance)} ${cur()}</div>
        <button class="btn btn-primary btn-block" style="margin-top:12px;" onclick="checkout(this)">إتمام الشراء</button>
      ` : ''}
    </div>`;
}

/* ---------- pages ---------- */
function renderPage(route){
  const fns = {
    dashboard: pageDashboard, account: pageAccount, send: pageSend, receive: pageReceive,
    transfers: pageTransfers, history: pageHistory, members: pageMembers, store: pageStore,
    competitions: pageCompetitions, prizes: pagePrizes, cards: pageCards, settings: pageSettings,
    support: pageSupport
  };
  const fn = fns[route] || pageDashboard;
  document.getElementById('page-content').innerHTML = fn();
  if(route==='dashboard') drawChart();
}

function pageDashboard(){
  const m = me();
  const monthGain = STATE.transactions.filter(t=>t.memberId===m.id && t.type==='in').slice(0,3).reduce((s,t)=>s+t.amount,0);
  const recent = memberTx(m.id).slice(0,4);
  return `
    <div class="page-title">مرحباً بعودتك، ${m.name}</div>
    <div class="page-sub">${STATE.info.guildName} ليست اسماً فقط، إنها أسلوب حياة</div>

    <div class="balance-card">
      <div class="logo-holder" style="width:86px;">${logoSVG(86)}</div>
      <div class="balance-text">
        <div class="balance-label">${ic('crown',14)} EMERALD BALANCE — الرصيد المتاح</div>
        <div class="balance-num">${fmt(m.balance)}<small>${cur()}</small></div>
        <div class="balance-delta">${ic('trending',13)} +${fmt(monthGain)} ${cur()} هذا الشهر</div>
        <div class="balance-actions">
          <button class="btn btn-primary" onclick="go('send')">${ic('send',14)} إرسال</button>
          <button class="btn btn-ghost" onclick="go('receive')">${ic('download',14)} استلام</button>
          <button class="btn btn-ghost" onclick="go('history')">${ic('clock',14)} سجل العمليات</button>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="card stat-card"><div class="stat-ic">${ic('diamond',20)}</div><div class="stat-num">${fmt(m.balance)}</div><div class="stat-lbl">الرصيد الإجمالي</div></div>
      <div class="stat-card card"><div class="stat-ic">${ic('trending',20)}</div><div class="stat-num">+${fmt(m.totalEarnings)}</div><div class="stat-lbl">إجمالي الأرباح</div></div>
      <div class="stat-card card"><div class="stat-ic">${ic('gift',20)}</div><div class="stat-num">${m.prizes}</div><div class="stat-lbl">الجوائز</div></div>
      <div class="stat-card card"><div class="stat-ic">${ic('sparkle',20)}</div><div class="stat-num">${fmt(m.points)}</div><div class="stat-lbl">النقاط</div></div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-head"><h3>نظرة عامة على الرصيد</h3><span class="muted" style="font-size:11.5px;">هذا الشهر</span></div>
        <div id="chart-holder"></div>
        <div class="chart-x" id="chart-x-labels"></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>آخر العمليات</h3><a class="link-all" onclick="go('history')">عرض الكل</a></div>
        ${recent.length ? recent.map(txRowHTML).join('') : `<div class="empty">لا توجد عمليات بعد</div>`}
      </div>
    </div>`;
}
function txRowHTML(t){
  const {lbl,time} = formatDate(t.date);
  const iconName = t.type==='in' ? ((t.label.includes('جائزة')||t.label.includes('مكافأة')) ? 'gift' : (t.label.includes('تحويل')?'shuffle':'diamond')) : 'diamond';
  return `
    <div class="tx-row">
      <div class="tx-ic ${t.type}">${ic(iconName,17)}</div>
      <div class="tx-mid"><b>${t.type==='in'?'+':'-'}${fmt(t.amount)} ${cur()}</b><span>${t.label}</span></div>
      <div class="tx-date"><div>${lbl}</div><div>${time}</div></div>
    </div>`;
}
function drawChart(){
  const m = me();
  const tx = memberTx(m.id).slice().reverse();
  let running = m.balance - tx.reduce((s,t)=> s + (t.type==='in'?t.amount:-t.amount), 0);
  const points = [running]; const labels = ['البداية'];
  tx.forEach(t=>{ running += (t.type==='in'?t.amount:-t.amount); points.push(running); labels.push(formatDate(t.date).lbl); });
  if(points.length<2){ points.push(m.balance); labels.push('اليوم'); }
  const holder = document.getElementById('chart-holder');
  if(!holder) return;
  holder.innerHTML = sparklineSVG(points);
  const xl = document.getElementById('chart-x-labels');
  const shown = labels.length<=5 ? labels : [labels[0], labels[Math.floor(labels.length/2)], labels[labels.length-1]];
  xl.innerHTML = shown.map(s=>`<span>${s}</span>`).join('');
}
function sparklineSVG(points){
  const w=600,h=190,pad=14;
  const max = Math.max(...points, 1), min = Math.min(...points, 0);
  const range = (max-min) || 1;
  const stepX = points.length>1 ? (w-2*pad)/(points.length-1) : 0;
  const coords = points.map((v,i)=>[pad+i*stepX, h-pad-((v-min)/range)*(h-2*pad)]);
  const path = coords.map((c,i)=>(i===0?'M':'L')+c[0].toFixed(1)+','+c[1].toFixed(1)).join(' ');
  const last = coords[coords.length-1];
  const area = path + ` L${last[0].toFixed(1)},${h-pad} L${coords[0][0].toFixed(1)},${h-pad} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="chart-svg">
    <defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#34d9a0" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#34d9a0" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#cf)" stroke="none"/>
    <path d="${path}" fill="none" stroke="#34d9a0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5" fill="#eafdf5" stroke="#34d9a0" stroke-width="2"/>
  </svg>`;
}

function pageAccount(){
  const m = me();
  const pct = Math.min(100, Math.round((m.levelProgress/m.levelTarget)*100));
  return `
    <div class="page-title">حسابي</div>
    <div class="page-sub">ملفك الشخصي في ${STATE.info.guildName}</div>
    <div class="card" style="text-align:center; padding:30px 20px;">
      <div class="avatar" style="width:64px;height:64px;font-size:24px;margin:0 auto 12px;background:${m.color}">${initials(m.name)}</div>
      <div style="font-size:18px; font-weight:900;">${m.name}</div>
      <span class="badge role-${m.role}">${m.role==='owner'?'مالك':m.role==='leader'?'قائد':'عضو'} · ${m.title||''}</span>
      <div class="progress-bar" style="max-width:320px;margin:18px auto 6px;"><div style="width:${pct}%"></div></div>
      <div class="progress-lbl">${fmt(m.levelProgress)} / ${fmt(m.levelTarget)} للمستوى التالي</div>
    </div>
    <div class="stats-grid" style="margin-top:16px;">
      <div class="card stat-card"><div class="stat-ic">${ic('diamond',20)}</div><div class="stat-num">${fmt(m.balance)}</div><div class="stat-lbl">الرصيد</div></div>
      <div class="card stat-card"><div class="stat-ic">${ic('trending',20)}</div><div class="stat-num">+${fmt(m.totalEarnings)}</div><div class="stat-lbl">الأرباح</div></div>
      <div class="card stat-card"><div class="stat-ic">${ic('gift',20)}</div><div class="stat-num">${m.prizes}</div><div class="stat-lbl">الجوائز</div></div>
      <div class="card stat-card"><div class="stat-ic">${ic('sparkle',20)}</div><div class="stat-num">${fmt(m.points)}</div><div class="stat-lbl">النقاط</div></div>
    </div>`;
}

function pageSend(){
  const m = me();
  const others = STATE.members.filter(x=>x.id!==m.id);
  return `
    <div class="page-title">إرسال ${cur()}</div>
    <div class="page-sub">رصيدك الحالي: ${fmt(m.balance)} ${cur()}</div>
    <div class="card" style="max-width:440px;">
      <div class="field"><label>إلى</label><select id="send-to">${others.map(o=>`<option value="${o.id}">${o.name}</option>`).join('')}</select></div>
      <div class="field"><label>المبلغ (${cur()})</label><input id="send-amt" type="number" min="1" placeholder="0"></div>
      <div class="field"><label>ملاحظة (اختياري)</label><input id="send-note" placeholder="مثال: مساعدة، سداد.."></div>
      <button class="btn btn-primary btn-block" onclick="doSend(this)">إرسال الآن</button>
    </div>`;
}
async function doSend(btn){
  await withBusy(btn, async ()=>{
    const m = me();
    const toId = document.getElementById('send-to').value;
    const amt = Number(document.getElementById('send-amt').value);
    const note = document.getElementById('send-note').value.trim();
    const to = STATE.members.find(x=>x.id===toId);
    if(!amt || amt<=0) throw new Error('أدخل مبلغاً صحيحاً');
    STATE = await Api.transfer(m.id, toId, amt, note);
    toast('تم إرسال '+fmt(amt)+' '+cur()+' إلى '+to.name);
    go('history');
  });
}

function pageReceive(){
  const m = me();
  return `
    <div class="page-title">استلام ${cur()}</div>
    <div class="page-sub">شارك معرفك مع الأعضاء ليتمكنوا من إرسال ${cur()} إليك</div>
    <div class="card" style="max-width:440px; text-align:center; padding:30px;">
      <div class="avatar" style="width:64px;height:64px;font-size:24px;margin:0 auto 12px;background:${m.color}">${initials(m.name)}</div>
      <div style="font-size:17px; font-weight:900;">${m.name}</div>
      <div class="muted" style="font-size:12px; margin-top:4px;">معرف العضو: ${m.id}</div>
      <button class="btn btn-ghost btn-block" style="margin-top:16px;" onclick="copyId('${m.id}')">نسخ المعرّف</button>
    </div>
    <div class="card" style="max-width:440px; margin-top:14px;">
      <div class="card-head"><h3>آخر عمليات الاستلام</h3></div>
      ${memberTx(m.id).filter(t=>t.type==='in').slice(0,5).map(txRowHTML).join('') || '<div class="empty">لا توجد عمليات استلام بعد</div>'}
    </div>`;
}
function copyId(id){
  try{ navigator.clipboard.writeText(id); toast('تم نسخ المعرّف'); }
  catch(e){ toast('انسخه يدوياً: '+id); }
}

function pageTransfers(){
  const m = me();
  const list = memberTx(m.id).filter(t=>t.label.includes('تحويل'));
  return `
    <div class="page-title">التحويلات</div>
    <div class="page-sub">جميع عمليات الإرسال والاستلام بينك وبين الأعضاء</div>
    <div class="card">${list.length? list.map(txRowHTML).join('') : '<div class="empty">لا توجد تحويلات بعد</div>'}</div>`;
}

function pageHistory(){
  const m = me();
  const canSeeAll = isOwner(m);
  const list = canSeeAll ? [...STATE.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)) : memberTx(m.id);
  return `
    <div class="page-title">سجل العمليات</div>
    <div class="page-sub">${canSeeAll?'كل عمليات النقابة':'عملياتك الشخصية'}</div>
    <div class="card">
      ${list.length ? list.map(t=>{
        const owner = STATE.members.find(x=>x.id===t.memberId);
        const iconName = t.type==='in' ? 'gift' : 'diamond';
        return `<div class="tx-row">
          <div class="tx-ic ${t.type}">${ic(iconName,17)}</div>
          <div class="tx-mid"><b>${t.type==='in'?'+':'-'}${fmt(t.amount)} ${cur()}${canSeeAll&&owner?' · '+owner.name:''}</b><span>${t.label}</span></div>
          <div class="tx-date">${(()=>{const {lbl,time}=formatDate(t.date);return `<div>${lbl}</div><div>${time}</div>`;})()}</div>
        </div>`;
      }).join('') : '<div class="empty">لا توجد عمليات بعد</div>'}
    </div>`;
}

function pageMembers(){
  const sorted = [...STATE.members].sort((a,b)=>b.balance-a.balance);
  const owner = isOwner();
  return `
    <div class="page-title">الأعضاء</div>
    <div class="page-sub">${STATE.members.length} عضو في ${STATE.info.guildName}</div>
    <div class="card">
      ${sorted.map(m=>`
        <div class="member-row">
          <div class="avatar" style="background:${m.color}">${initials(m.name)}</div>
          <div class="member-mid"><b>${m.name}</b><span>${m.title||''} · <span class="badge role-${m.role}">${m.role==='owner'?'مالك':m.role==='leader'?'قائد':'عضو'}</span></span></div>
          <div class="member-bal">${fmt(m.balance)} ${cur()}</div>
          ${owner ? `<button class="btn btn-ghost btn-sm" onclick="openAdjustBalance('${m.id}')">تعديل</button>` : ''}
        </div>`).join('')}
    </div>`;
}
function openAdjustBalance(memberId){
  const m = STATE.members.find(x=>x.id===memberId);
  openModal('تعديل رصيد '+m.name, `
    <div class="field"><label>النوع</label><select id="adj-type"><option value="in">إضافة رصيد</option><option value="out">خصم رصيد</option></select></div>
    <div class="field"><label>المبلغ</label><input id="adj-amt" type="number" min="1" placeholder="0"></div>
    <div class="field"><label>السبب</label><input id="adj-reason" placeholder="مثال: مكافأة إدارية"></div>
    <button class="btn btn-primary btn-block" id="adj-btn" onclick="submitAdjust('${memberId}', this)">تأكيد</button>
  `);
}
async function submitAdjust(memberId, btn){
  await withBusy(btn, async ()=>{
    const type = document.getElementById('adj-type').value;
    const amount = Number(document.getElementById('adj-amt').value);
    const reason = document.getElementById('adj-reason').value.trim() || 'تعديل إداري';
    if(!amount || amount<=0) throw new Error('أدخل مبلغاً صحيحاً');
    STATE = await Api.adjustMember(memberId, {type, amount, reason});
    closeModal(); toast('تم تحديث الرصيد'); renderPage('members'); renderRightPanel('members');
  });
}

/* ---- store ---- */
function pageStore(){
  const owner = isLeader();
  return `
    <div class="page-title">متجر النقابة</div>
    <div class="page-sub">اشترِ مكافآت ورتباً — تُخصم قيمتها تلقائياً من رصيدك</div>
    ${owner ? `<button class="btn btn-ghost btn-sm" style="margin-bottom:14px;" onclick="openAddProduct()">${ic('plus',13)} إضافة منتج</button>` : ''}
    <div class="store-grid">
      ${STATE.store.map(it=>`
        <div class="card store-item">
          <div class="s-top">
            <div class="s-ic">${it.icon}</div>
            <div><h4>${it.name}</h4><p>${it.desc||''}</p></div>
          </div>
          <div class="s-bottom">
            <span class="price-tag">${fmt(it.price)} ${cur()}</span>
            <div style="display:flex; gap:6px;">
              ${owner?`<button class="btn btn-danger btn-sm" onclick="removeProduct('${it.id}')">حذف</button>`:''}
              <button class="btn btn-primary btn-sm" onclick="cartAdd('${it.id}',1); toast('أُضيف للسلة')">أضف للسلة</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}
function cartAdd(id, delta){
  cart[id] = (cart[id]||0) + delta;
  if(cart[id]<=0) delete cart[id];
  renderRightPanel('store');
}
async function checkout(btn){
  await withBusy(btn, async ()=>{
    const m = me();
    const items = Object.keys(cart).map(id=>({id, qty:cart[id]}));
    if(!items.length) return;
    STATE = await Api.purchase(m.id, items);
    cart = {};
    toast('تم الشراء بنجاح');
    renderTopbar(); renderRightPanel('store'); renderPage('store');
  });
}
function openAddProduct(){
  openModal('إضافة منتج جديد', `
    <div class="field"><label>الاسم</label><input id="p-name" placeholder="اسم المنتج"></div>
    <div class="field"><label>السعر (${cur()})</label><input id="p-price" type="number" min="1" placeholder="0"></div>
    <div class="field"><label>أيقونة (إيموجي)</label><input id="p-icon" placeholder="🎁" value="🎁"></div>
    <div class="field"><label>الوصف</label><input id="p-desc" placeholder="وصف مختصر"></div>
    <button class="btn btn-primary btn-block" id="p-btn" onclick="submitAddProduct(this)">إضافة</button>
  `);
}
async function submitAddProduct(btn){
  await withBusy(btn, async ()=>{
    const name = document.getElementById('p-name').value.trim();
    const price = Number(document.getElementById('p-price').value);
    const icon = document.getElementById('p-icon').value.trim() || '🎁';
    const desc = document.getElementById('p-desc').value.trim();
    if(!name || !price) throw new Error('أدخل بيانات صحيحة');
    STATE = await Api.addStoreItem({name, price, icon, desc});
    closeModal(); toast('تمت إضافة المنتج'); renderPage('store');
  });
}
async function removeProduct(id){
  try{ STATE = await Api.removeStoreItem(id); toast('تم حذف المنتج'); renderPage('store'); }
  catch(e){ toast(e.message, true); }
}

function pageCompetitions(){
  const owner = isLeader();
  const list = STATE.transactions.filter(t=>t.label.includes('جائزة مسابقة')).slice(0,12);
  return `
    <div class="page-title">المسابقات</div>
    <div class="page-sub">جوائز المسابقات الممنوحة داخل النقابة</div>
    ${owner ? `<div class="card" style="max-width:460px; margin-bottom:16px;">
      <div class="card-head"><h3>منح جائزة مسابقة</h3></div>
      <div class="field"><label>العضو الفائز</label><select id="comp-member">${STATE.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
      <div class="field"><label>اسم المسابقة</label><input id="comp-name" placeholder="مثال: بطولة الأسبوع"></div>
      <div class="field"><label>قيمة الجائزة (${cur()})</label><input id="comp-amt" type="number" min="1" placeholder="0"></div>
      <button class="btn btn-primary btn-block" id="comp-btn" onclick="grantCompetitionPrize(this)">منح الجائزة</button>
    </div>` : ''}
    <div class="card">${list.length? list.map(t=>{
      const owner2 = STATE.members.find(x=>x.id===t.memberId);
      return `<div class="tx-row"><div class="tx-ic in">${ic('trophy',17)}</div>
        <div class="tx-mid"><b>${owner2?owner2.name:'—'}</b><span>${t.label}</span></div>
        <div class="tx-amt in" style="color:var(--emerald-bright);font-weight:900;">+${fmt(t.amount)} ${cur()}</div></div>`;
    }).join('') : '<div class="empty">لا توجد جوائز مسابقات بعد</div>'}</div>`;
}
async function grantCompetitionPrize(btn){
  await withBusy(btn, async ()=>{
    const memberId = document.getElementById('comp-member').value;
    const label = document.getElementById('comp-name').value.trim() || 'مسابقة';
    const amount = Number(document.getElementById('comp-amt').value);
    if(!amount||amount<=0) throw new Error('أدخل قيمة صحيحة');
    STATE = await Api.grantPrize(memberId, label, amount);
    toast('تم منح الجائزة'); renderPage('competitions');
  });
}

function pagePrizes(){
  const m = me();
  const list = memberTx(m.id).filter(t=>t.type==='in' && (t.label.includes('جائزة')||t.label.includes('مكافأة')));
  return `
    <div class="page-title">الجوائز</div>
    <div class="page-sub">لديك ${m.prizes} جائزة حتى الآن</div>
    <div class="card">${list.length? list.map(txRowHTML).join('') : '<div class="empty">لا توجد جوائز بعد</div>'}</div>`;
}

function pageCards(){
  const m = me();
  return `
    <div class="page-title">البطاقات</div>
    <div class="page-sub">بطاقة عضويتك في ${STATE.info.guildName}</div>
    <div class="mship-card">
      <div class="mship-top">
        <div style="width:38px;">${logoSVG(38)}</div>
        <span class="badge role-${m.role}">${m.role==='owner'?'مالك':m.role==='leader'?'قائد':'عضو'}</span>
      </div>
      <div class="mship-id">${m.id.toUpperCase()}</div>
      <div class="mship-name">${m.name}</div>
      <div class="mship-title">${m.title||''}</div>
      <div class="mship-bal">${fmt(m.balance)} ${cur()}</div>
    </div>`;
}

function pageSettings(){
  const m = me();
  const owner = isOwner(m);
  return `
    <div class="page-title">الإعدادات</div>
    <div class="page-sub">إدارة حسابك${owner?' وإعدادات النقابة':''}</div>

    <div class="card" style="max-width:520px; margin-bottom:14px;">
      <div class="card-head"><h3>تسجيل الدخول كـ</h3></div>
      <div class="field"><label>اختر عضواً لعرض التطبيق من حسابه</label>
        <select id="switch-member" onchange="switchMember(this.value)">
          ${STATE.members.map(mm=>`<option value="${mm.id}" ${mm.id===m.id?'selected':''}>${mm.name}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openAddMember()">${ic('plus',13)} إضافة عضو جديد</button>
    </div>

    ${owner ? `
    <div class="card" style="max-width:520px; margin-bottom:14px;">
      <div class="card-head"><h3>بيانات النقابة والبنك</h3></div>
      <div class="field"><label>اسم النقابة</label><input id="s-guild" value="${STATE.info.guildName}"></div>
      <div class="field"><label>اسم البنك (يظهر في الواجهة)</label><input id="s-bank" value="${STATE.info.bankName}"></div>
      <div class="field"><label>الشعار الفرعي</label><input id="s-tagline" value="${STATE.info.tagline}"></div>
      <div class="field"><label>رمز العملة</label><input id="s-currency" value="${STATE.info.currency}"></div>
      <div class="field"><label>اسم مسؤول البنك</label><input id="s-admin-name" value="${STATE.info.adminName}"></div>
      <div class="field"><label>رقم مسؤول البنك (واتساب)</label><input id="s-admin-phone" value="${STATE.info.adminPhone}"></div>
      <button class="btn btn-primary btn-block" id="s-btn" onclick="saveGuildInfo(this)">حفظ التغييرات</button>
    </div>

    <div class="card" style="max-width:520px; margin-bottom:14px;">
      <div class="card-head"><h3>القادة</h3><button class="btn btn-ghost btn-sm" onclick="openAddLeader()">${ic('plus',13)} إضافة قائد</button></div>
      ${STATE.leaders.map(l=>`
        <div class="contact-row">
          <div><div class="contact-name">${l.name}</div><div class="contact-role">${l.role} · ${l.phone}</div></div>
          <button class="btn btn-danger btn-sm" onclick="removeLeader('${l.id}')">حذف</button>
        </div>`).join('') || '<div class="empty">لا يوجد قادة</div>'}
    </div>

    <div class="card" style="max-width:520px;">
      <div class="card-head"><h3>خيارات متقدمة</h3></div>
      <button class="btn btn-danger btn-block" onclick="resetData()">إعادة تعيين كل بيانات النقابة</button>
    </div>` : ''}`;
}
async function switchMember(id){ SESSION.memberId=id; saveSessionLocal(); showApp('settings'); toast('تم التبديل'); }
function openAddMember(){
  openModal('إضافة عضو جديد', `
    <div class="field"><label>الاسم</label><input id="nm-name" placeholder="اسم العضو"></div>
    <button class="btn btn-primary btn-block" id="nm-btn" onclick="submitAddMember(this)">إضافة</button>
  `);
}
async function submitAddMember(btn){
  await withBusy(btn, async ()=>{
    const name = document.getElementById('nm-name').value.trim();
    if(!name) throw new Error('أدخل اسماً');
    STATE = await Api.addMember({name});
    closeModal(); toast('تمت إضافة العضو'); renderPage('settings');
  });
}
async function saveGuildInfo(btn){
  await withBusy(btn, async ()=>{
    const info = {
      guildName: document.getElementById('s-guild').value.trim(),
      bankName: document.getElementById('s-bank').value.trim(),
      tagline: document.getElementById('s-tagline').value.trim(),
      currency: document.getElementById('s-currency').value.trim(),
      adminName: document.getElementById('s-admin-name').value.trim(),
      adminPhone: document.getElementById('s-admin-phone').value.trim(),
    };
    STATE = await Api.updateInfo(info);
    document.title = STATE.info.bankName;
    toast('تم حفظ إعدادات النقابة'); renderSidebar('settings');
  });
}
function openAddLeader(){
  openModal('إضافة قائد', `
    <div class="field"><label>الاسم</label><input id="ld-name"></div>
    <div class="field"><label>المنصب</label><input id="ld-role" placeholder="مثال: نائب القائد"></div>
    <div class="field"><label>رقم الواتساب</label><input id="ld-phone" placeholder="+9665xxxxxxxx"></div>
    <button class="btn btn-primary btn-block" id="ld-btn" onclick="submitAddLeader(this)">إضافة</button>
  `);
}
async function submitAddLeader(btn){
  await withBusy(btn, async ()=>{
    const name = document.getElementById('ld-name').value.trim();
    const role = document.getElementById('ld-role').value.trim() || 'قائد';
    const phone = document.getElementById('ld-phone').value.trim();
    if(!name||!phone) throw new Error('أكمل البيانات');
    STATE = await Api.addLeader({name, role, phone});
    closeModal(); toast('تمت الإضافة'); renderPage('settings');
  });
}
async function removeLeader(id){
  try{ STATE = await Api.removeLeader(id); toast('تم الحذف'); renderPage('settings'); }
  catch(e){ toast(e.message, true); }
}
function resetData(){
  openModal('تأكيد إعادة التعيين', `
    <p class="muted" style="font-size:13px; line-height:1.8;">سيتم حذف كل بيانات النقابة الحالية (الأعضاء، القادة، المتجر، العمليات) واستبدالها بالبيانات الافتراضية. هذا الإجراء لا يمكن التراجع عنه.</p>
    <button class="btn btn-danger btn-block" style="margin-top:14px;" id="reset-btn" onclick="confirmReset(this)">نعم، إعادة التعيين</button>
  `);
}
async function confirmReset(btn){
  await withBusy(btn, async ()=>{
    STATE = await Api.resetData();
    SESSION = {memberId: STATE.members[0].id};
    saveSessionLocal();
    closeModal(); toast('تمت إعادة التعيين'); showApp('dashboard');
  });
}

function pageSupport(){
  return `
    <div class="page-title">الدعم</div>
    <div class="page-sub">تواصل مباشرة مع مسؤول البنك أو القادة عبر واتساب</div>
    <div class="landing-grid">
      <div class="card">
        <h3>مسؤول البنك</h3>
        <div class="contact-row">
          <div><div class="contact-name">${STATE.info.adminName}</div><div class="contact-role">مسؤول البنك العام</div></div>
          <a class="wa-btn" href="${waLink(STATE.info.adminPhone,'مرحباً، أحتاج مساعدة بخصوص بنك النقابة')}" target="_blank">${ic('chat',16)}</a>
        </div>
      </div>
      <div class="card">
        <h3>القادة</h3>
        ${STATE.leaders.map(l=>`
          <div class="contact-row">
            <div><div class="contact-name">${l.name}</div><div class="contact-role">${l.role}</div></div>
            <a class="wa-btn" href="${waLink(l.phone,'مرحباً '+l.name)}" target="_blank">${ic('chat',16)}</a>
          </div>`).join('') || '<div class="empty">لا يوجد قادة</div>'}
      </div>
    </div>`;
}

/* ---------- modal ---------- */
function openModal(title, bodyHTML){
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-back" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <div class="sheet-head"><h3>${title}</h3><div class="x-close" onclick="closeModal()">${ic('close',14)}</div></div>
        ${bodyHTML}
      </div>
    </div>`;
}
function closeModal(){ document.getElementById('modal-root').innerHTML=''; }
function openMemberSwitch(){ go('settings'); }
function openMore(){
  const shown = new Set(['dashboard','members','store','prizes']);
  const rest = NAV_ITEMS.filter(n=>!shown.has(n.r));
  openModal('المزيد', `
    <div>
      ${rest.map(n=>`<a class="nav-item" style="display:flex" onclick="closeModal(); go('${n.r}')"><span class="ic">${ic(n.icon,17)}</span>${n.label}</a>`).join('')}
      <hr class="divider">
      <a class="nav-item" style="display:flex" onclick="closeModal(); backToLanding()"><span class="ic">${ic('home',17)}</span>الرجوع للواجهة الرئيسية</a>
    </div>`);
}

boot();
