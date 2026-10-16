const s=io(),q=new URLSearchParams(location.search),room=q.get('room'),app=document.querySelector('#app'),preview=q.get('previewTeam');
let me=preview||localStorage.getItem('trade_'+room),st,notice='',noticeKind='ok',tradeReceipt=null,lastResumeSocketId='';
const I={food:'🍚',wood:'🪵',car:'🚗',oil:'🛢️',textile:'🧵',tech:'💡'},K=Object.keys(I),NM={food:'식량',wood:'목재',car:'자동차',oil:'석유',textile:'섬유',tech:'기술력'};
const ND={white:['⚪ 하얀 나라','food',{food:2,wood:3,car:1,oil:1,textile:3,tech:2}],brown:['🟤 갈색 나라','wood',{food:2,wood:2,car:2,oil:2,textile:2,tech:2}],red:['🔴 빨간 나라','car',{food:2,wood:1,car:3,oil:2,textile:3,tech:1}],black:['⚫ 검은 나라','oil',{food:2,wood:1,car:3,oil:2,textile:1,tech:3}],blue:['🔵 파란 나라','textile',{food:2,wood:2,car:1,oil:3,textile:2,tech:2}],yellow:['🟡 노란 나라','tech',{food:2,wood:3,car:2,oil:2,textile:1,tech:2}]};
const FI={road:'🛣️',port:'⚓',airport:'✈️',hospital:'🏥',school:'🏫',park:'🌳',subway:'🚇',access:'♿',shelter:'🐾'};

const blankPack=()=>Object.fromEntries([...K,'cash'].map(k=>[k,0]));
let tradeDraft={to:'',give:blankPack(),want:blankPack(),pg:blankPack(),pw:blankPack(),postOpen:false,scrollY:0,focusId:'',selStart:null,selEnd:null};
let audioCtx=null;

function resetTradeDraft(){tradeDraft={to:'',give:blankPack(),want:blankPack(),pg:blankPack(),pw:blankPack(),postOpen:false,scrollY:0,focusId:'',selStart:null,selEnd:null}}
function syncTradeDraft(){
 if(!st||st.phase!=='trade')return;
 const to=document.querySelector('#to');if(to)tradeDraft.to=to.value||'';
 ['give','want','pg','pw'].forEach(pre=>document.querySelectorAll(`[data-${pre}]`).forEach(e=>{tradeDraft[pre][e.getAttribute(`data-${pre}`)]=Math.max(0,+e.value||0)}));
 const details=document.querySelector('#postComposer');if(details)tradeDraft.postOpen=details.open;
 tradeDraft.scrollY=window.scrollY||0;
 const active=document.activeElement;
 tradeDraft.focusId=active?.id||'';
 if(active&&typeof active.selectionStart==='number'){tradeDraft.selStart=active.selectionStart;tradeDraft.selEnd=active.selectionEnd}else{tradeDraft.selStart=tradeDraft.selEnd=null}
}
function restoreTradeUi(){
 requestAnimationFrame(()=>{
  const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);window.scrollTo(0,Math.min(tradeDraft.scrollY||0,max));
  if(tradeDraft.focusId){const el=document.getElementById(tradeDraft.focusId);if(el&&!el.disabled){el.focus({preventScroll:true});if(typeof el.setSelectionRange==='function'&&tradeDraft.selStart!=null)try{el.setSelectionRange(tradeDraft.selStart,tradeDraft.selEnd)}catch{}}}
 })
}
function initAudio(){
 const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
 if(!audioCtx)audioCtx=new C();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx
}
function tone(freq,start,dur,vol=.055,type='sine'){
 const a=initAudio();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,a.currentTime+start);g.gain.exponentialRampToValueAtTime(vol,a.currentTime+start+.008);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+start+dur);o.connect(g);g.connect(a.destination);o.start(a.currentTime+start);o.stop(a.currentTime+start+dur+.02)
}
function playSound(type){
 try{if(type==='trade'){tone(660,0,.09);tone(880,.09,.14)}else if(type==='build'){tone(392,0,.08);tone(523,.08,.09);tone(659,.17,.15)}else if(type==='consume'){tone(523,0,.08);tone(392,.09,.14)}else{tone(740,0,.1)}}catch{}
}
document.addEventListener('pointerdown',()=>initAudio(),{passive:true});

function join(n=''){s.emit('join',{code:room,name:n,teamId:me})}
document.querySelector('#join')?.addEventListener('click',()=>join(document.querySelector('#name').value));
s.on('joined',id=>{me=id;if(!preview)localStorage.setItem('trade_'+room,id)});
s.on('eventSound',d=>playSound(d?.type));
s.on('tradeComplete',d=>{tradeReceipt=d;notice='';noticeKind='ok';render(true)});
s.on('tradeFailed',d=>{syncTradeDraft();noticeKind='warn';notice=d.message||'현재 거래 조건을 충족할 수 없어 거래할 수 없습니다.';render(true)});
s.on('tradeBusy',d=>{syncTradeDraft();noticeKind='busy';notice=d?.message||'다른 나라와 거래 중입니다. 거래가 끝난 뒤 다시 시도해 주세요.';render(true);setTimeout(()=>{notice='';noticeKind='ok';render(true)},3200)});
s.on('actionAck',d=>{
 syncTradeDraft();
 if(d.type==='contract'){tradeDraft.to='';tradeDraft.give=blankPack();tradeDraft.want=blankPack();tradeDraft.focusId=''}
 if(d.type==='post'){tradeDraft.pg=blankPack();tradeDraft.pw=blankPack();tradeDraft.postOpen=false;tradeDraft.focusId=''}
 noticeKind='ok';notice=d.message||'처리되었습니다.';render(true);setTimeout(()=>{notice='';render(true)},2500)
});
s.on('msg',alert);
s.on('joinDenied',d=>{app.innerHTML=`<section class=card><h1>🔒 참가가 마감되었습니다</h1><p>${d.reason}</p></section>`});
s.on('teamRemoved',d=>{if(d.teamId!==me)return;if(preview)return;localStorage.removeItem('trade_'+room);me=null;app.innerHTML=`<section class=card><h1>수업방에서 나왔어요</h1><p>잘못 접속했다면 QR을 다시 찍고 올바른 모둠 이름으로 참가하세요.</p><button id=rejoin>다시 참가하기</button></section>`;document.querySelector('#rejoin').onclick=()=>location.reload()});
s.on('roomReset',d=>{resetTradeDraft();tradeReceipt=null;noticeKind='ok';notice=d?.message||'선생님이 게임을 처음 상태로 초기화했어요.';app.innerHTML=`<section class=card><h1>♻️ 게임을 다시 시작해요</h1><p>${notice}</p><p class=muted>모둠과 나라 배정은 그대로 유지됩니다.</p></section>`});
s.on('state',x=>{const wasTrade=st?.phase==='trade';if(wasTrade)syncTradeDraft();if(wasTrade&&x.phase!=='trade'){resetTradeDraft();tradeReceipt=null}if(!wasTrade&&x.phase==='trade')resetTradeDraft();st=x;render(x.phase==='trade')});

function pack(p){return [...K.filter(k=>p?.[k]).map(k=>I[k]+NM[k]+' '+p[k]),p?.cash?'💰 '+p.cash:''].filter(Boolean).join(' + ')||'없음'}
function canGivePack(t,p){return K.every(k=>(p?.[k]||0)<=t.inv[k])&&(p?.cash||0)<=t.cash}
function shortagePack(t,p){const a=K.filter(k=>(p?.[k]||0)>t.inv[k]).map(k=>`${I[k]} ${NM[k]} ${p[k]-t.inv[k]}개`);if((p?.cash||0)>t.cash)a.push(`💰 자본 ${(p.cash||0)-t.cash}`);return a.join(' · ')}
function facilityValue(t){return (t.buildings||[]).reduce((a,b)=>a+b.cost,0)}
function totalAssets(t){return t.cash+facilityValue(t)}
function receiptResourceGrid(r,n){return `<div class=receipt-resource-grid>${K.map(k=>{const have=r?.after?.inv?.[k]||0,need=n?.[2]?.[k]||0,short=have<need;return `<div class=receipt-resource-item><span>${I[k]} ${NM[k]}</span><b class="${short?'warn':''}">${have}</b>${n?`<small>필요 ${need}</small>`:''}</div>`}).join('')}<div class=receipt-resource-item><span>💰 자본</span><b>${r?.after?.cash||0}</b><small>거래 후</small></div></div>`}
function tradeReceiptModal(t,n){if(!tradeReceipt)return '';return `<div class="trade-modal-backdrop trade-success-backdrop"><div class="trade-modal trade-success-modal" role=dialog aria-modal=true aria-labelledby=tradeSuccessTitle><div class=modal-icon>🤝</div><h2 id=tradeSuccessTitle>거래가 성사되었습니다!</h2><p class=muted>${tradeReceipt.partnerNation}${tradeReceipt.partnerTeam?` · ${tradeReceipt.partnerTeam}`:''}와 거래를 완료했어요.</p><div class=receipt-exchange><div><span>📤 우리가 준 것</span><strong>${pack(tradeReceipt.given)}</strong></div><div><span>📥 우리가 받은 것</span><strong>${pack(tradeReceipt.received)}</strong></div></div><h3>거래 후 우리 나라 자원 현황</h3>${receiptResourceGrid(tradeReceipt,n)}<button id=closeTradeReceipt class=receipt-confirm>확인</button></div></div>`}
function needStrip(n){return K.map(k=>`<span>${I[k]} ${n[2][k]}</span>`).join('')}
function buildingBadges(t){return (t.buildings||[]).length?(t.buildings||[]).map(b=>`<span class="facility-pill">${FI[b.id]||'🏗️'} ${b.name}</span>`).join(''):'<span class="muted">아직 건설한 시설이 없어요.</span>'}
function buildingBonuses(t){let p=(t.buildings||[]).filter(x=>x.type==='production').reduce((a,b)=>a+b.value,0),r=(t.buildings||[]).filter(x=>x.type==='reward').reduce((a,b)=>a+b.value,0);return `<div class="bonus-line"><span>🏭 생산 보너스 <b>+${p}</b></span><span>🎁 소비 보너스 <b>+${r}</b></span></div>`}
function overview(t,n){return `<section class="card country-overview"><div class="team-need-row"><div class="team-name">${t.name}</div>${n?`<div class="need-inline"><b>📦 소비할 물건</b>${needStrip(n)}</div>`:''}</div><h1>${n?n[0]:'나라 배정 대기 중'}</h1><div class="asset-grid"><div class="stat-card"><span>💰 현재 자본</span><b>${t.cash}</b></div><div class="stat-card"><span>🏗️ 시설 자산</span><b>${facilityValue(t)}</b></div><div class="stat-card accent"><span>🌟 국가 총자산</span><b>${totalAssets(t)}</b></div></div>${n?`<div class="buildings-box"><b>건설한 시설</b><div class="facility-list">${buildingBadges(t)}</div>${buildingBonuses(t)}</div>`:''}</section>`}
function draftVal(pre,k,max){return Math.max(0,Math.min(max,+tradeDraft[pre]?.[k]||0))}
function inputs(pre,mode='request',t=null){
 const own=mode==='own';
 const rows=K.map(k=>{const max=own?(t?.inv?.[k]||0):99,disabled=own&&max<=0,value=draftVal(pre,k,max);return `<div class="qty-row ${disabled?'disabled-resource':''}"><div class="qty-label">${I[k]} <b>${NM[k]}</b>${own?`<small>보유 ${max}</small>`:''}</div><button type="button" class="qty-minus" data-target="${pre}-${k}" ${disabled?'disabled':''}>−</button><input id="${pre}-${k}" class="qty-input" inputmode="numeric" type="number" min="0" max="${max}" value="${value}" data-${pre}="${k}" ${disabled?'disabled':''}><button type="button" class="qty-plus" data-target="${pre}-${k}" ${disabled?'disabled':''}>＋</button></div>`}).join('');
 const cashMax=own?(t?.cash||0):999,cashDisabled=own&&cashMax<=0,cashValue=draftVal(pre,'cash',cashMax);
 return `<div class="resource resource-list">${rows}<div class="qty-row ${cashDisabled?'disabled-resource':''}"><div class="qty-label">💰 <b>화폐</b>${own?`<small>보유 ${cashMax}</small>`:''}</div><button type="button" class="qty-minus" data-target="${pre}-cash" ${cashDisabled?'disabled':''}>−</button><input id="${pre}-cash" class="qty-input" inputmode="numeric" type="number" min="0" max="${cashMax}" value="${cashValue}" data-${pre}="cash" ${cashDisabled?'disabled':''}><button type="button" class="qty-plus" data-target="${pre}-cash" ${cashDisabled?'disabled':''}>＋</button></div></div>`
}
function bindQtyControls(){
 document.querySelectorAll('.qty-plus,.qty-minus').forEach(b=>b.onclick=()=>{const el=document.getElementById(b.dataset.target);if(!el||el.disabled)return;const min=+(el.min||0),max=+(el.max||999),step=b.classList.contains('qty-plus')?1:-1;el.value=Math.max(min,Math.min(max,(+el.value||0)+step));el.dispatchEvent(new Event('input',{bubbles:true}))});
 document.querySelectorAll('.qty-input').forEach(el=>{const clamp=()=>{const min=+(el.min||0),max=+(el.max||999);el.value=Math.max(min,Math.min(max,Math.floor(+el.value||0)));syncTradeDraft()};el.addEventListener('input',clamp);el.addEventListener('change',clamp)})
}
function values(pre){let o={};document.querySelectorAll(`[data-${pre}]`).forEach(e=>o[e.getAttribute(`data-${pre}`)]=e.disabled?0:Math.max(0,Math.min(+(e.max||999),+e.value||0)));return o}
function resumeExisting(){if(!room||!me||!s.connected)return;if(lastResumeSocketId===s.id)return;lastResumeSocketId=s.id;if(preview)app.innerHTML=`<section class="card"><h1>📱 학생 화면 불러오는 중…</h1><p>선택한 테스트 모둠에 연결하고 있습니다.</p></section>`;else if(st)app.innerHTML=`<section class="card"><h1>🔄 수업에 다시 연결하는 중…</h1><p>기존 모둠 상태를 이어서 불러오고 있어요.</p></section>`;join()}
s.on('connect',resumeExisting);queueMicrotask(resumeExisting);

function render(restore=false){
 let t=st?.teams.find(x=>x.id===me);if(!t)return;let n=t.nation&&ND[t.nation];
 app.innerHTML=`${overview(t,n)}${notice?`<section class="card notice ${noticeKind==='busy'?'busy-notice':noticeKind==='warn'?'warn-notice':''}"><b>${noticeKind==='busy'?'🔒':noticeKind==='warn'?'⚠️':'✅'} ${notice}</b></section>`:''}`;
 if(!n){app.innerHTML+=`<section class=card>선생님이 나라를 배정하고 있어요.</section>`;return}
 app.innerHTML+=`<section class=card><div class=row><b>ROUND ${st.round}</b><span class=pill>주력 생산품 ${I[n[1]]} ${NM[n[1]]}</span></div><div>${K.map(k=>`<span class=pill>${I[k]} ${NM[k]} ${t.inv[k]} ${t.inv[k]<n[2][k]?'<b class=warn>부족</b>':''}</span>`).join('')}</div></section>`;
 if(st.phase==='intro')app.innerHTML+=`<section class=card><h2>게임 방법</h2><p>처음에 💰 <b>${st.settings.initialCash}</b>과 주력 생산품 <b>${st.settings.initialGoods}개</b>를 받아요.</p><p>매 라운드 🏭 주력 생산품 <b>${st.settings.baseProduction}개</b> 생산 → 🤝 무역 → 📦 소비 순서로 진행해요.</p><p>필요 물품을 모두 채우면 기본 소비 보상은 💰 <b>${st.settings.baseReward}</b>예요. 부족 1개당 보상 1이 줄어요.</p><p>친구와 직접 이야기하고 합의하면 iPad에서 계약하세요.</p><p>남는 자원은 종류별 최대 <b>${st.settings.stockCap}개</b>만 보관할 수 있어요.</p></section>`;
 else if(st.phase==='buildIntro')app.innerHTML+=`<section class=card><h2>🏗️ 건설이 열렸어요!</h2><p>시설은 생산량이나 소비 보상을 높여 줍니다.</p><p>시설에 쓴 돈도 최종 <b>시설 자산</b>으로 계산됩니다.</p></section>`;
 else if(st.phase==='results'&&t.last)app.innerHTML+=`<section class=card><h2>📦 소비·재고 정리</h2><p>부족 <b>${t.last.miss}</b>개 · 보상 <b class=good>+${t.last.reward}</b> · 폐기 <b class=warn>${t.last.waste}</b>개</p></section>`;
 else if(st.phase==='trade')trade(t);
 else if(st.phase==='build')build(t);
 else if(st.phase==='final')final(t);
 else app.innerHTML+=`<section class=card><h2>잠시 기다려 주세요</h2><p>선생님이 다음 단계를 시작합니다.</p></section>`;
 if(tradeReceipt&&st.phase==='trade')app.innerHTML+=tradeReceiptModal(t,n);
 document.querySelector('#closeTradeReceipt')?.addEventListener('click',()=>{tradeReceipt=null;render(true)});
 if(restore&&st.phase==='trade'&&!tradeReceipt)restoreTradeUi()
}

function trade(t){
 let others=st.teams.filter(x=>x.id!==t.id&&x.nation),ownPosts=st.posts.filter(p=>p.active&&p.teamId===t.id),otherPosts=st.posts.filter(p=>p.active&&p.teamId!==t.id),outgoing=st.contracts.filter(c=>c.from===t.id&&c.status==='pending'),incoming=st.contracts.filter(c=>c.to===t.id&&c.status==='pending');
 const pending=st.contracts.filter(c=>c.status==='pending'),busyTeam=id=>pending.some(c=>c.from===id||c.to===id),myPending=pending.find(c=>c.from===t.id||c.to===t.id),validTo=others.some(x=>x.id===tradeDraft.to),targetBusy=tradeDraft.to&&busyTeam(tradeDraft.to);if(!validTo)tradeDraft.to='';
 const chooser=others.map(x=>{const busy=busyTeam(x.id);return `<option value="${x.id}" ${tradeDraft.to===x.id?'selected':''} ${busy&&tradeDraft.to!==x.id?'disabled':''}>${ND[x.nation][0]} · ${x.name}${busy?' · 다른 나라와 거래 중':''}</option>`}).join('');
 app.innerHTML+=`<section class=card><h2>🤝 직접 거래 계약</h2><p class=muted>한 모둠은 한 번에 한 나라와만 거래할 수 있어요.</p>${myPending?`<div class="busy-hint">🔒 현재 다른 나라와 거래 중입니다. 이 거래를 먼저 마치면 새 계약서를 보낼 수 있어요.</div>`:`<label class="select-label" for="to">거래할 나라</label><select id=to><option value="">나라를 선택하세요</option>${chooser}</select>${tradeDraft.to?`${targetBusy?`<div class="busy-hint">🔒 선택한 모둠은 다른 나라와 거래 중입니다. 거래가 끝나면 이 계약서를 보낼 수 있어요.</div>`:''}<p class="muted contract-note">상대 나라의 보유량은 공개되지 않습니다. 직접 이야기해 정한 조건을 입력하세요.</p><div class="contract-columns"><div class="contract-pane"><h3>📤 우리가 줄 것</h3>${inputs('give','own',t)}</div><div class="contract-pane"><h3>📥 우리가 받을 것</h3>${inputs('want','request',t)}</div></div><button id=send class="send-contract" ${targetBusy?'disabled':''}>📨 계약서 보내기</button>`:`<div class="choose-country-hint">👆 거래할 나라를 선택하면 계약서가 열려요.</div>`}`}</section>`;
 if(outgoing.length)app.innerHTML+=`<section class=card><h2>📤 보낸 계약서</h2>${outgoing.map(c=>{let b=st.teams.find(x=>x.id===c.to);return `<div class=trade-item><b>${ND[b.nation][0]} · ${b.name}</b><br>우리가 주기: ${pack(c.offer)}<br>우리가 받기: ${pack(c.want)}<br><span class=muted>⏳ 상대 모둠의 확인을 기다리고 있어요.</span>${c.source==='board'?`<br><button class=cancel-board data-id=${c.id}>↩️ 거래 신청 취소</button>`:''}</div>`}).join('')}</section>`;
 app.innerHTML+=`<section class=card><h2>📢 거래 게시판</h2><p class=muted>직접 협상이 어렵다면 원하는 거래를 게시판에 올릴 수 있어요.</p>${ownPosts.length?`<h3>📌 내가 올린 거래</h3>${ownPosts.map(p=>`<div class="trade-item own-post"><div class=row><b>${p.lockedBy?'🔒 거래 협의 중':'🟢 거래 가능'}</b><button class="delete-post danger small-btn" data-id="${p.id}">🗑️ 삭제</button></div><br>${pack(p.offer)} ↔ ${pack(p.want)}<br><span class=muted>${p.lockedBy?'한 모둠의 신청을 확인하고 있어요. 거절/취소하면 다시 게시됩니다.':'다른 모둠의 신청을 기다리고 있어요.'}</span></div>`).join('')}`:''}<h3>다른 나라의 거래</h3>${otherPosts.map(p=>{let a=st.teams.find(x=>x.id===p.teamId),ownerBusy=busyTeam(p.teamId),canMeet=canGivePack(t,p.want),short=canMeet?'':shortagePack(t,p.want);return `<div class="trade-item ${p.lockedBy||ownerBusy||!canMeet?'locked-post':''}"><b>${ND[a.nation][0]} · ${a.name}</b><br>${pack(p.offer)} ↔ ${pack(p.want)}<br>${p.lockedBy||ownerBusy?'<span class="muted">🔒 다른 나라와 거래 중입니다.</span>':myPending?'<span class="muted">🔒 우리 모둠이 현재 거래 중이라 신청할 수 없습니다.</span>':!canMeet?`<span class="warn">⚠️ 상대가 요구한 물건이나 자본이 부족해 신청할 수 없습니다.${short?`<br><small>부족: ${short}</small>`:''}</span>`:`<button class=take data-id=${p.id}>거래 신청</button>`}</div>`}).join('')||'<p>아직 다른 나라가 올린 거래가 없어요.</p>'}<details id=postComposer ${tradeDraft.postOpen?'open':''}><summary><b>➕ 내 거래 올리기</b></summary><p class="muted contract-note">상대 나라의 보유량은 공개되지 않습니다. 원하는 조건을 적어 게시하세요.</p><div class="contract-columns board-columns"><div class="contract-pane"><h3>📤 내가 줄 것</h3>${inputs('pg','own',t)}</div><div class="contract-pane"><h3>📥 받고 싶은 것</h3>${inputs('pw','request',t)}</div></div><button id=post>📢 게시하기</button></details></section>`;
 if(incoming.length){const c=incoming[0],a=st.teams.find(x=>x.id===c.from),canGive=K.every(k=>(c.want?.[k]||0)<=t.inv[k])&&(c.want?.cash||0)<=t.cash;app.innerHTML+=`<div class="trade-modal-backdrop"><div class="trade-modal" role=dialog aria-modal=true><div class=modal-icon>📨</div><h2>거래 요청!</h2><p class=big>${ND[a.nation][0]} · ${a.name}</p><div class=modal-exchange><div><span>내가 주는 것</span><strong>${pack(c.want)}</strong></div><div class=swap>⇅</div><div><span>내가 받는 것</span><strong>${pack(c.offer)}</strong></div></div>${canGive?'<p class=good><b>거래 조건을 확인해 주세요.</b></p>':'<p class=warn><b>⚠️ 내가 줄 자원 또는 화폐가 부족합니다.</b><br>현재 상태에서는 이 거래를 수락할 수 없습니다.</p>'}<div class=modal-actions><button class="no alt" data-id="${c.id}">${c.source==='board'?'↩️ 신청 거절 · 게시물 다시 열기':'❌ 거절'}</button><button class=yes data-id="${c.id}" ${canGive?'':'disabled'}>🤝 거래하기</button></div></div></div>`}
 bindQtyControls();
 document.querySelector('#to')?.addEventListener('change',e=>{syncTradeDraft();tradeDraft.to=e.target.value;tradeDraft.focusId='';render(true)});
 document.querySelector('#postComposer')?.addEventListener('toggle',e=>{tradeDraft.postOpen=e.currentTarget.open});
 document.querySelector('#send')?.addEventListener('click',()=>{syncTradeDraft();if(!tradeDraft.to)return;s.emit('contract',{to:tradeDraft.to,offer:values('give'),want:values('want')})});
 document.querySelector('#post')?.addEventListener('click',()=>{syncTradeDraft();s.emit('post',{offer:values('pg'),want:values('pw')})});
 document.querySelectorAll('.take').forEach(b=>b.onclick=()=>s.emit('take',{id:b.dataset.id}));
 document.querySelectorAll('.delete-post').forEach(b=>b.onclick=()=>{if(confirm('이 거래 게시물을 삭제할까요?'))s.emit('deletePost',{id:b.dataset.id})});
 document.querySelectorAll('.cancel-board').forEach(b=>b.onclick=()=>{if(confirm('거래 신청을 취소할까요? 게시물은 다시 거래 가능 상태가 됩니다.'))s.emit('cancelBoardContract',{id:b.dataset.id})});
 document.querySelectorAll('.yes').forEach(b=>b.onclick=()=>s.emit('answer',{id:b.dataset.id,ok:true}));
 document.querySelectorAll('.no').forEach(b=>b.onclick=()=>s.emit('answer',{id:b.dataset.id,ok:false}))
}

function build(t){
 app.innerHTML+=`<section class=card><div class=row><h2>🏗️ 시설 건설</h2><div class=muted>💰 자본 ${t.cash} · 🏗️ 시설 ${facilityValue(t)} · 🌟 총자산 ${totalAssets(t)}</div></div><div class=grid>${st.facilities.map(f=>{const built=t.buildings.some(x=>x.id===f.id);return `<div class="card facility-card ${built?'built':''}"><div class=facility-title><span class=facility-icon>${FI[f.id]||'🏗️'}</span><b>${f.name}</b></div><p>💰 비용 <b>${f.cost}</b></p><p>${f.type==='production'?'🏭 생산량':'🎁 소비 보상'} <b>+${f.value}</b></p><button class=bld data-id="${f.id}" ${t.cash<f.cost||built?'disabled':''}>${built?'✅ 건설 완료':'건설'}</button></div>`}).join('')}</div></section>`;
 document.querySelectorAll('.bld').forEach(b=>b.onclick=()=>s.emit('build',b.dataset.id))
}
function final(t){let fv=facilityValue(t);app.innerHTML+=`<section class=card><h2>🏁 우리나라 최종 결과</h2><div class=asset-grid><div class=stat-card><span>💰 남은 자본</span><b>${t.cash}</b></div><div class=stat-card><span>🏗️ 시설 자산</span><b>${fv}</b></div><div class="stat-card accent"><span>🌟 국가 총자산</span><b>${t.cash+fv}</b></div></div><div class=buildings-box><b>건설한 시설</b><div class=facility-list>${buildingBadges(t)}</div></div><p>🤝 거래 ${t.stats.trades}회 · ✅ 완전충족 ${t.stats.full}회 · ♻️ 폐기 ${t.stats.waste}개</p></section>`}
