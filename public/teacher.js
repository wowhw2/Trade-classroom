const s=io(),app=document.querySelector('#app');let st,meta,previewTeamId=null;
const NN={white:'⚪ 하얀 나라',brown:'🟤 갈색 나라',red:'🔴 빨간 나라',black:'⚫ 검은 나라',blue:'🔵 파란 나라',yellow:'🟡 노란 나라'};
document.querySelector('#new').onclick=async()=>{meta=await fetch('/api/new-room').then(r=>r.json());history.replaceState(null,'',`?room=${meta.code}&token=${meta.token}`);s.emit('join',{code:meta.code,token:meta.token})};
document.querySelector('#sim')?.addEventListener('click',async()=>{meta=await fetch('/api/new-simulation').then(r=>r.json());history.replaceState(null,'',`?room=${meta.code}&token=${meta.token}`);s.emit('join',{code:meta.code,token:meta.token})});
let q=new URLSearchParams(location.search);if(q.get('room')&&q.get('token')){meta={code:q.get('room'),token:q.get('token')};s.emit('join',{code:meta.code,token:meta.token})}
s.on('state',x=>{st=x;render()});s.on('msg',alert);
function name(id){return NN[id]||'-'}function phase(p){return {lobby:'참가',intro:'게임 설명',ready:'라운드 준비',buildIntro:'건설 설명',trade:'🤝 무역',results:'📦 소비 결과',build:'🏗️ 건설',final:'🏁 종료'}[p]||p}
function btn(a,label){return `<button data-a="${a}">${label}</button>`}
function options(t){let used=new Set(st.teams.filter(x=>x.id!==t.id&&x.nation).map(x=>x.nation));return `<option value="">나라 선택</option>`+Object.entries(NN).map(([id,n])=>`<option value="${id}" ${t.nation===id?'selected':''} ${used.has(id)?'disabled':''}>${n}${used.has(id)?' · 배정됨':''}</option>`).join('')}
function bind(){document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>s.emit('teacher',b.dataset.a));document.querySelectorAll('[data-sim]').forEach(b=>b.onclick=()=>s.emit('simPreset',b.dataset.sim));document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>showPreview(b.dataset.preview));document.querySelector('#random')?.addEventListener('click',()=>s.emit('teacherAction',{type:'randomAssign'}));document.querySelector('#toggleJoin')?.addEventListener('click',()=>s.emit('teacherAction',{type:'toggleJoin'}));document.querySelectorAll('.nation-select').forEach(e=>e.onchange=()=>s.emit('teacherAction',{type:'setNation',teamId:e.dataset.team,nation:e.value}));document.querySelectorAll('.kick').forEach(e=>e.onclick=()=>{let t=st.teams.find(x=>x.id===e.dataset.team);if(t&&confirm(`「${t.name}」을 수업방에서 내보낼까요?`))s.emit('teacherAction',{type:'kick',teamId:t.id})})}
function controls(){if(st.phase==='lobby')return btn('start','▶ 게임 시작');if(['intro','ready','buildIntro'].includes(st.phase))return btn('produce','🏭 라운드 생산 시작');if(st.phase==='trade')return btn('consume','📦 무역 종료 · 소비 시작');if(st.phase==='results')return (st.round>=st.settings.buildUnlock?btn('build','🏗️ 건설 단계'):'')+btn('next','다음 라운드');if(st.phase==='build')return btn('next','건설 종료 · 다음 라운드');return ''}
function lobby(){return `<section class=card><div class=row><h2>참가 모둠 ${st.teams.length} / 6</h2><span class=pill>${st.joinOpen?'🟢 참가 가능':'🔒 참가 마감'}</span></div><div class=lobby-actions><button id=random>🎲 무작위 배정</button><button id=toggleJoin class=alt>${st.joinOpen?'🔒 참가 마감':'🔓 참가 다시 열기'}</button></div><div class=team-list>${st.teams.map(t=>`<div class=team-row><strong>${t.name}</strong><select class=nation-select data-team="${t.id}">${options(t)}</select><button class="kick danger" data-team="${t.id}">내보내기</button></div>`).join('')||'<p class=muted>QR로 모둠이 참가하면 여기에 표시됩니다.</p>'}</div><p class=muted>게임 시작 전까지 나라를 직접 바꾸거나 무작위 배정할 수 있습니다.</p></section>`}
function summary(){if(st.phase==='intro')return `<section class=card><h2>🎮 게임 방법</h2><div class=steps><div>🏭 <b>생산</b><br>주력 생산품을 받아요.</div><div>🤝 <b>무역</b><br>직접 협상하고 계약해요.</div><div>📦 <b>소비</b><br>필요 물품을 쓰고 보상을 받아요.</div><div>📦 <b>재고</b><br>종류별 ${st.settings.stockCap}개까지만 보관해요.</div></div></section>`;if(st.phase==='buildIntro')return `<section class=card><h2>🏗️ 건설 기능이 열렸습니다!</h2><p class=big>시설은 생산량이나 소비 보상을 늘립니다.</p><p>최종 총자산 = 💰 남은 자본금 + 🏗️ 시설 가치</p></section>`;if(st.phase==='results')return `<section class=card><h2>📦 소비 결과 요약</h2><div class=grid>${st.teams.map(t=>`<div><b>${name(t.nation)}</b><br>부족 ${t.last?.miss||0} · 보상 +${t.last?.reward||0} · 폐기 ${t.last?.waste||0}</div>`).join('')}</div></section>`;if(st.phase==='final')return `<section class=card><h2>🏁 최종 국가 현황</h2><table><tr><th>나라</th><th>현금</th><th>시설</th><th>총자산</th></tr>${st.teams.map(t=>{let f=t.buildings.reduce((a,b)=>a+b.cost,0);return `<tr><td>${name(t.nation)} · ${t.name}</td><td>${t.cash}</td><td>${f}</td><td><b>${t.cash+f}</b></td></tr>`}).join('')}</table></section>`;return ''}

function simulationTools(){
 if(!st.simulation)return '';
 return `<section class="card sim-tools"><h2>🧪 수업 시뮬레이션</h2>
 <p class="muted">실제 학생 기기 없이 PC 한 대에서 화면과 수업 흐름을 확인합니다. 이 방은 실제 수업방과 분리되어 있습니다.</p>
 <div class="lobby-actions">
  <button data-sim="intro">게임 설명</button><button data-sim="trade">1R 무역</button>
  <button data-sim="results">소비 결과</button><button data-sim="buildIntro">3R 건설 설명</button>
  <button data-sim="build">건설 화면</button><button data-sim="final">6R 최종 결과</button>
 </div>
 <h3>학생 iPad 화면 미리보기</h3>
 <div class="preview-buttons">${st.teams.map(t=>`<button class="alt" data-preview="${t.id}">${name(t.nation)} · ${t.name}</button>`).join('')}</div>
 </section>`;
}
function showPreview(teamId){
 previewTeamId=teamId;
 renderPreview();
}
function renderPreview(){
 const host=document.querySelector('#previewHost');
 if(!host)return;
 if(!previewTeamId||!st?.simulation){host.innerHTML='';return}
 const team=st.teams.find(x=>x.id===previewTeamId);
 if(!team){previewTeamId=null;host.innerHTML='';return}

 let panel=host.querySelector('#previewPanel');
 const current=panel?.dataset.teamId;
 if(panel&&current===team.id){
   const label=panel.querySelector('[data-preview-label]');
   if(label)label.textContent=`${name(team.nation)} · ${team.name}`;
   return;
 }
 host.innerHTML='';
 panel=document.createElement('section');
 panel.id='previewPanel';
 panel.dataset.teamId=team.id;
 panel.className='card preview-panel';
 panel.innerHTML=`<div class="row preview-head">
   <div><h2>📱 학생 iPad 화면 미리보기</h2><p class="muted" data-preview-label>${name(team.nation)} · ${team.name}</p></div>
   <button id="closePreview" class="alt">미리보기 닫기</button>
 </div>
 <p class="muted">이 프레임은 교사 화면 갱신과 분리되어 있어 다시 로드되지 않습니다.</p>
 <div class="ipad-stage"><div class="ipad-shell">
   <iframe title="학생 iPad 화면" src="/?room=${encodeURIComponent(st.code)}&previewTeam=${encodeURIComponent(team.id)}"></iframe>
 </div></div>`;
 host.appendChild(panel);
 panel.querySelector('#closePreview').onclick=()=>{previewTeamId=null;host.innerHTML=''};
}
function render(){if(!st)return;app.innerHTML=`<section class=card><h1>🌏 무역놀이 · ROUND ${st.round}</h1><p>현재 단계 <b>${phase(st.phase)}</b> · 방 번호 <b>${st.code}</b></p>${st.phase==='lobby'?`<img class=qr src="/api/qr/${st.code}" alt="학생 접속 QR"><p class=big>iPad 카메라로 QR을 찍으세요.</p>`:''}<div>${controls()}</div></section>${st.phase==='lobby'?lobby():''}${summary()}${simulationTools()}`;bind();renderPreview()}
