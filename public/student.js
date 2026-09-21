const s=io(),q=new URLSearchParams(location.search),room=q.get('room'),app=document.querySelector('#app'),preview=q.get('previewTeam');let me=preview||localStorage.getItem('trade_'+room),st,notice='';
const I={food:'🍚',wood:'🪵',car:'🚗',oil:'🛢️',textile:'🧵',tech:'💡'},K=Object.keys(I),NM={food:'식량',wood:'목재',car:'자동차',oil:'석유',textile:'섬유',tech:'기술력'};
const ND={white:['⚪ 하얀 나라','food',{food:2,wood:3,car:1,oil:1,textile:3,tech:2}],brown:['🟤 갈색 나라','wood',{food:2,wood:2,car:2,oil:2,textile:2,tech:2}],red:['🔴 빨간 나라','car',{food:2,wood:1,car:3,oil:2,textile:3,tech:1}],black:['⚫ 검은 나라','oil',{food:2,wood:1,car:3,oil:2,textile:1,tech:3}],blue:['🔵 파란 나라','textile',{food:2,wood:2,car:1,oil:3,textile:2,tech:2}],yellow:['🟡 노란 나라','tech',{food:2,wood:3,car:2,oil:2,textile:1,tech:2}]};
function join(n=''){s.emit('join',{code:room,name:n,teamId:me})}document.querySelector('#join')?.addEventListener('click',()=>join(document.querySelector('#name').value));
s.on('joined',id=>{me=id;if(!preview)localStorage.setItem('trade_'+room,id)});s.on('tradeFailed',d=>{notice=d.message||'현재 거래 조건을 충족할 수 없어 거래할 수 없습니다.';render()});s.on('actionAck',d=>{notice=d.message||'처리되었습니다.';render();setTimeout(()=>{notice='';render()},2500)});s.on('msg',alert);s.on('joinDenied',d=>{app.innerHTML=`<section class=card><h1>🔒 참가가 마감되었습니다</h1><p>${d.reason}</p></section>`});s.on('teamRemoved',d=>{if(d.teamId!==me)return;if(preview)return;localStorage.removeItem('trade_'+room);me=null;app.innerHTML=`<section class=card><h1>수업방에서 나왔어요</h1><p>잘못 접속했다면 QR을 다시 찍고 올바른 모둠 이름으로 참가하세요.</p><button id=rejoin>다시 참가하기</button></section>`;document.querySelector('#rejoin').onclick=()=>location.reload()});s.on('state',x=>{st=x;render()});
function pack(p){return [...K.filter(k=>p?.[k]).map(k=>I[k]+NM[k]+' '+p[k]),p?.cash?'💰 '+p.cash:''].filter(Boolean).join(' + ')||'없음'}
function inputs(pre,mode='request',t=null){
 const own=mode==='own';
 const rows=K.map(k=>{
   const max=own?(t?.inv?.[k]||0):99,disabled=own&&max<=0;
   return `<div class="qty-row ${disabled?'disabled-resource':''}">
    <div class="qty-label">${I[k]} <b>${NM[k]}</b>${own?`<small>보유 ${max}</small>`:''}</div>
    <button type="button" class="qty-minus" data-target="${pre}-${k}" ${disabled?'disabled':''}>−</button>
    <input id="${pre}-${k}" class="qty-input" inputmode="numeric" type="number" min="0" max="${max}" value="0" data-${pre}="${k}" ${disabled?'disabled':''}>
    <button type="button" class="qty-plus" data-target="${pre}-${k}" ${disabled?'disabled':''}>＋</button>
   </div>`;
 }).join('');
 const cashMax=own?(t?.cash||0):999,cashDisabled=own&&cashMax<=0;
 return `<div class="resource resource-list">${rows}
 <div class="qty-row ${cashDisabled?'disabled-resource':''}">
  <div class="qty-label">💰 <b>화폐</b>${own?`<small>보유 ${cashMax}</small>`:''}</div>
  <button type="button" class="qty-minus" data-target="${pre}-cash" ${cashDisabled?'disabled':''}>−</button>
  <input id="${pre}-cash" class="qty-input" inputmode="numeric" type="number" min="0" max="${cashMax}" value="0" data-${pre}="cash" ${cashDisabled?'disabled':''}>
  <button type="button" class="qty-plus" data-target="${pre}-cash" ${cashDisabled?'disabled':''}>＋</button>
 </div></div>`;
}
function bindQtyControls(){
 document.querySelectorAll('.qty-plus,.qty-minus').forEach(b=>b.onclick=()=>{
  const el=document.getElementById(b.dataset.target);if(!el||el.disabled)return;
  const min=+(el.min||0),max=+(el.max||999),step=b.classList.contains('qty-plus')?1:-1;
  el.value=Math.max(min,Math.min(max,(+el.value||0)+step));
 });
 document.querySelectorAll('.qty-input').forEach(el=>{
  const clamp=()=>{const min=+(el.min||0),max=+(el.max||999);el.value=Math.max(min,Math.min(max,Math.floor(+el.value||0)))};
  el.addEventListener('input',clamp);el.addEventListener('change',clamp);
 });
}
function values(pre){let o={};document.querySelectorAll(`[data-${pre}]`).forEach(e=>o[e.getAttribute(`data-${pre}`)]=e.disabled?0:Math.max(0,Math.min(+(e.max||999),+e.value||0)));return o}
function autoJoinExisting(){
 if(!room||!me)return;
 if(preview){
   app.innerHTML=`<section class="card"><h1>📱 학생 화면 불러오는 중…</h1><p>선택한 테스트 모둠에 연결하고 있습니다.</p></section>`;
 }
 const go=()=>join();
 if(s.connected) queueMicrotask(go);
 else s.once('connect',go);
}
autoJoinExisting();

function render(){let t=st?.teams.find(x=>x.id===me);if(!t)return;let n=t.nation&&ND[t.nation];app.innerHTML=`<section class=card><div class=muted>${t.name}</div><h1>${n?n[0]:'나라 배정 대기 중'}</h1><div class=big>💰 ${t.cash}</div></section>${notice?`<section class="card notice"><b>✅ ${notice}</b></section>`:''}`;if(!n){app.innerHTML+=`<section class=card>선생님이 나라를 배정하고 있어요.</section>`;return}app.innerHTML+=`<section class=card><b>ROUND ${st.round}</b><p>주력 생산품 ${I[n[1]]} ${NM[n[1]]}</p><div>${K.map(k=>`<span class=pill>${I[k]} ${NM[k]} ${t.inv[k]} ${t.inv[k]<n[2][k]?'<b class=warn>부족</b>':''}</span>`).join('')}</div></section>`;if(st.phase==='intro')app.innerHTML+=`<section class=card><h2>게임 방법</h2><p>🏭 생산 → 🤝 무역 → 📦 소비 순서로 진행해요.</p><p>친구와 직접 이야기하고 합의하면 iPad에서 계약하세요.</p><p>남는 자원은 종류별 최대 <b>${st.settings.stockCap}개</b>만 보관할 수 있어요.</p></section>`;else if(st.phase==='buildIntro')app.innerHTML+=`<section class=card><h2>🏗️ 건설이 열렸어요!</h2><p>시설은 생산량이나 소비 보상을 높여 줍니다.</p><p>시설에 쓴 돈도 최종 <b>시설 자산</b>으로 계산됩니다.</p></section>`;else if(st.phase==='results'&&t.last)app.innerHTML+=`<section class=card><h2>📦 소비·재고 정리</h2><p>부족 <b>${t.last.miss}</b>개 · 보상 <b class=good>+${t.last.reward}</b> · 폐기 <b class=warn>${t.last.waste}</b>개</p></section>`;else if(st.phase==='trade')trade(t);else if(st.phase==='build')build(t);else if(st.phase==='final')final(t);else app.innerHTML+=`<section class=card><h2>잠시 기다려 주세요</h2><p>선생님이 다음 단계를 시작합니다.</p></section>`}
function trade(t){
 let others=st.teams.filter(x=>x.id!==t.id&&x.nation);
 let ownPosts=st.posts.filter(p=>p.active&&p.teamId===t.id);
 let otherPosts=st.posts.filter(p=>p.active&&p.teamId!==t.id);
 let outgoing=st.contracts.filter(c=>c.from===t.id&&c.status==='pending');
 let incoming=st.contracts.filter(c=>c.to===t.id&&c.status==='pending');

 app.innerHTML+=`<section class=card><h2>🤝 직접 거래 계약</h2>
 <p class=muted>친구와 직접 협상한 뒤 계약 내용을 입력하세요. <b>내가 주는 것은 현재 보유량까지만 선택할 수 있습니다.</b></p>
 <select id=to>${others.map(x=>`<option value=${x.id}>${ND[x.nation][0]} · ${x.name}</option>`).join('')}</select>
 <h3>우리가 줄 것</h3>${inputs('give','own',t)}
 <h3>우리가 받을 것</h3><p class=muted>상대 나라의 보유량은 공개되지 않습니다. 원하는 조건을 제안하세요.</p>${inputs('want','request',t)}
 <button id=send>📨 계약서 보내기</button></section>`;

 if(outgoing.length)app.innerHTML+=`<section class=card><h2>📤 보낸 계약서</h2>
 ${outgoing.map(c=>{let b=st.teams.find(x=>x.id===c.to);return `<div class=trade-item><b>${ND[b.nation][0]} · ${b.name}</b><br>우리가 주기: ${pack(c.offer)}<br>우리가 받기: ${pack(c.want)}<br><span class=muted>⏳ 상대 모둠의 확인을 기다리고 있어요.</span>${c.source==='board'?`<br><button class=cancel-board data-id=${c.id}>↩️ 거래 신청 취소</button>`:''}</div>`}).join('')}</section>`;

 app.innerHTML+=`<section class=card><h2>📢 거래 게시판</h2>
 <p class=muted>직접 협상이 어렵다면 원하는 거래를 게시판에 올릴 수 있어요.</p>
 ${ownPosts.length?`<h3>📌 내가 올린 거래</h3>${ownPosts.map(p=>`<div class="trade-item own-post"><div class="row"><b>${p.lockedBy?'🔒 거래 협의 중':'🟢 거래 가능'}</b><button class="delete-post danger small-btn" data-id="${p.id}">🗑️ 삭제</button></div><br>${pack(p.offer)} ↔ ${pack(p.want)}<br><span class=muted>${p.lockedBy?'한 모둠의 신청을 확인하고 있어요. 거절/취소하면 다시 게시됩니다.':'다른 모둠의 신청을 기다리고 있어요.'}</span></div>`).join('')}`:''}
 <h3>다른 나라의 거래</h3>
 ${otherPosts.map(p=>{let a=st.teams.find(x=>x.id===p.teamId);return `<div class="trade-item ${p.lockedBy?'locked-post':''}"><b>${ND[a.nation][0]} · ${a.name}</b><br>${pack(p.offer)} ↔ ${pack(p.want)}<br>${p.lockedBy?'<span class="muted">🔒 다른 모둠과 거래 협의 중입니다.</span>':`<button class=take data-id=${p.id}>거래 신청</button>`}</div>`}).join('')||'<p>아직 다른 나라가 올린 거래가 없어요.</p>'}
 <details><summary><b>➕ 내 거래 올리기</b></summary><h3>내가 줄 것</h3>${inputs('pg','own',t)}<h3>받고 싶은 것</h3><p class=muted>상대 나라 재고는 확인하지 않습니다.</p>${inputs('pw','request',t)}<button id=post>📢 게시하기</button></details>
 </section>`;

 if(incoming.length){
  const c=incoming[0],a=st.teams.find(x=>x.id===c.from);
  const canGive=K.every(k=>(c.want?.[k]||0)<=t.inv[k])&&(c.want?.cash||0)<=t.cash;
  app.innerHTML+=`<div class="trade-modal-backdrop"><div class="trade-modal" role="dialog" aria-modal="true">
   <div class="modal-icon">📨</div><h2>거래 요청!</h2>
   <p class=big>${ND[a.nation][0]} · ${a.name}</p>
   <div class="modal-exchange"><div><span>내가 주는 것</span><strong>${pack(c.want)}</strong></div><div class=swap>⇅</div><div><span>내가 받는 것</span><strong>${pack(c.offer)}</strong></div></div>
   ${canGive?'<p class="good"><b>거래 조건을 확인해 주세요.</b></p>':'<p class="warn"><b>⚠️ 내가 줄 자원 또는 화폐가 부족합니다.</b><br>현재 상태에서는 이 거래를 수락할 수 없습니다.</p>'}
   <div class="modal-actions"><button class="no alt" data-id="${c.id}">${c.source==='board'?'↩️ 신청 거절 · 게시물 다시 열기':'❌ 거절'}</button><button class="yes" data-id="${c.id}" ${canGive?'':'disabled'}>🤝 거래하기</button></div>
  </div></div>`;
 }

 bindQtyControls();
 document.querySelector('#send').onclick=()=>s.emit('contract',{to:document.querySelector('#to').value,offer:values('give'),want:values('want')});
 document.querySelector('#post').onclick=()=>s.emit('post',{offer:values('pg'),want:values('pw')});
 document.querySelectorAll('.take').forEach(b=>b.onclick=()=>s.emit('take',{id:b.dataset.id}));
 document.querySelectorAll('.delete-post').forEach(b=>b.onclick=()=>{if(confirm('이 거래 게시물을 삭제할까요?'))s.emit('deletePost',{id:b.dataset.id})});
 document.querySelectorAll('.cancel-board').forEach(b=>b.onclick=()=>{if(confirm('거래 신청을 취소할까요? 게시물은 다시 거래 가능 상태가 됩니다.'))s.emit('cancelBoardContract',{id:b.dataset.id})});
 document.querySelectorAll('.yes').forEach(b=>b.onclick=()=>s.emit('answer',{id:b.dataset.id,ok:true}));
 document.querySelectorAll('.no').forEach(b=>b.onclick=()=>s.emit('answer',{id:b.dataset.id,ok:false}));
}
function build(t){app.innerHTML+=`<section class=card><h2>🏗️ 시설 건설</h2><div class=grid>${st.facilities.map(f=>`<div class=card><b>${f.name}</b><p>💰 ${f.cost}</p><p>${f.type==='production'?'🏭 생산량':'🎁 소비 보상'} +${f.value}</p><button class=bld data-id=${f.id} ${t.cash<f.cost||t.buildings.some(x=>x.id===f.id)?'disabled':''}>건설</button></div>`).join('')}</div></section>`;document.querySelectorAll('.bld').forEach(b=>b.onclick=()=>s.emit('build',b.dataset.id))}
function final(t){let fv=t.buildings.reduce((a,b)=>a+b.cost,0);app.innerHTML+=`<section class=card><h2>🏁 우리나라 최종 결과</h2><p>💰 남은 자본 ${t.cash}</p><p>🏗️ 시설 자산 ${fv}</p><p class=big>총자산 ${t.cash+fv}</p><p>🤝 거래 ${t.stats.trades}회 · ✅ 완전충족 ${t.stats.full}회 · ♻️ 폐기 ${t.stats.waste}개</p></section>`}
