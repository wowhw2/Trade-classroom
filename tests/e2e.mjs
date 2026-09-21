import { io } from 'socket.io-client';

const BASE=(process.env.BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const TIMEOUT=8000;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function once(socket,event,pred=()=>true,timeout=TIMEOUT){return new Promise((resolve,reject)=>{const t=setTimeout(()=>{socket.off(event,h);reject(new Error(`timeout: ${event}`))},timeout);function h(v){if(!pred(v))return;clearTimeout(t);socket.off(event,h);resolve(v)}socket.on(event,h)})}
async function emitState(socket,event,data,pred){const p=once(socket,'state',pred);socket.emit(event,data);return await p}
function client(){return io(BASE,{transports:['websocket','polling'],reconnection:false,timeout:TIMEOUT})}
function assert(c,m){if(!c)throw new Error(m)}
function team(st,id){return st.teams.find(t=>t.id===id)}

const sockets=[]; let pass=0;
async function test(name,fn){try{await fn();console.log(`PASS ${name}`);pass++}catch(e){console.error(`FAIL ${name}: ${e.message}`);throw e}}
try{
  await test('health/version',async()=>{const r=await fetch(`${BASE}/health`);assert(r.ok,'health HTTP 실패');const j=await r.json();assert(j.ok,'health ok=false');assert(/^0\.[34]/.test(j.version||''),`예상 버전 아님: ${j.version}`)});
  const meta=await (await fetch(`${BASE}/api/new-room`)).json();
  assert(meta.code&&meta.token,'방 생성 응답 불완전');
  const teacher=client(); sockets.push(teacher); await once(teacher,'connect');
  let stateP=once(teacher,'state'); teacher.emit('join',{code:meta.code,token:meta.token}); let state=await stateP;
  await test('teacher room join',async()=>assert(state.phase==='lobby','로비 아님'));

  const students=[];
  async function addStudent(name){const c=client();sockets.push(c);await once(c,'connect');const jp=once(c,'joined');const sp=once(teacher,'state',x=>x.teams.some(t=>t.name===name));c.emit('join',{code:meta.code,name});const id=await jp;state=await sp;students.push({c,id,name});return students.at(-1)}
  for(let i=1;i<=6;i++) await addStudent(`모둠${i}`);
  await test('6 teams join',async()=>assert(state.teams.length===6,`teams=${state.teams.length}`));

  // extra team -> kick -> rejoin
  const extra=await addStudent('잘못접속');
  await test('teacher kick',async()=>{state=await emitState(teacher,'teacherAction',{type:'kick',teamId:extra.id},x=>!x.teams.some(t=>t.id===extra.id));assert(state.teams.length===6,'kick 후 6개 아님')});
  await test('kicked device can rejoin',async()=>{const jp=once(extra.c,'joined');const sp=once(teacher,'state',x=>x.teams.some(t=>t.name==='재참가'));extra.c.emit('join',{code:meta.code,name:'재참가'});const newId=await jp;state=await sp;assert(newId!==extra.id,'새 ID가 아님');state=await emitState(teacher,'teacherAction',{type:'kick',teamId:newId},x=>!x.teams.some(t=>t.id===newId))});

  // close joining and ensure denial
  await test('join lock',async()=>{state=await emitState(teacher,'teacherAction',{type:'toggleJoin'},x=>x.joinOpen===false);const c=client();sockets.push(c);await once(c,'connect');const denied=once(c,'joinDenied');c.emit('join',{code:meta.code,name:'차단시험'});const d=await denied;assert(d.reason,'거부 이유 없음');state=await emitState(teacher,'teacherAction',{type:'toggleJoin'},x=>x.joinOpen===true)});

  const nationIds=['white','brown','red','black','blue','yellow'];
  await test('manual nation assignment',async()=>{for(let i=0;i<6;i++){state=await emitState(teacher,'teacherAction',{type:'setNation',teamId:students[i].id,nation:nationIds[i]},x=>team(x,students[i].id)?.nation===nationIds[i])}assert(new Set(state.teams.map(t=>t.nation)).size===6,'중복 나라')});
  await test('duplicate nation blocked',async()=>{const msg=once(teacher,'msg',m=>String(m).includes('이미 다른'));teacher.emit('teacherAction',{type:'setNation',teamId:students[1].id,nation:'white'});await msg;await sleep(100);assert(team(state,students[1].id).nation==='brown','중복 배정됨')});

  state=await emitState(teacher,'teacher','start',x=>x.phase==='intro');
  await test('game starts',async()=>assert(state.round===1,'round 1 아님'));
  state=await emitState(teacher,'teacher','produce',x=>x.phase==='trade');
  await test('automatic production',async()=>{assert(team(state,students[0].id).inv.food===12,'white food !=12');assert(team(state,students[1].id).inv.wood===12,'brown wood !=12')});

  await test('direct resource contract',async()=>{
    const white=students[0],brown=students[1];
    state=await emitState(white.c,'contract',{to:brown.id,offer:{food:3},want:{wood:3}},x=>x.contracts.some(c=>c.from===white.id&&c.to===brown.id&&c.status==='pending'));
    const c=state.contracts.find(c=>c.from===white.id&&c.to===brown.id&&c.status==='pending');
    state=await emitState(brown.c,'answer',{id:c.id,ok:true},x=>x.contracts.find(z=>z.id===c.id)?.status==='done');
    assert(team(state,white.id).inv.food===9&&team(state,white.id).inv.wood===3,'white 재고 오류');
    assert(team(state,brown.id).inv.food===3&&team(state,brown.id).inv.wood===9,'brown 재고 오류');
  });

  await test('money-resource contract',async()=>{
    const red=students[2],black=students[3];
    state=await emitState(red.c,'contract',{to:black.id,offer:{cash:2},want:{oil:1}},x=>x.contracts.some(c=>c.from===red.id&&c.to===black.id&&c.status==='pending'));
    const c=state.contracts.find(c=>c.from===red.id&&c.to===black.id&&c.status==='pending');
    state=await emitState(black.c,'answer',{id:c.id,ok:true},x=>x.contracts.find(z=>z.id===c.id)?.status==='done');
    assert(team(state,red.id).cash===18&&team(state,red.id).inv.oil===1,'red 화폐거래 오류');
    assert(team(state,black.id).cash===22&&team(state,black.id).inv.oil===11,'black 화폐거래 오류');
  });

  await test('board post owner delete',async()=>{
    const blue=students[4];
    state=await emitState(blue.c,'post',{offer:{textile:1},want:{tech:1}},x=>x.posts.some(p=>p.teamId===blue.id&&p.active&&p.offer.textile===1));
    const post=state.posts.find(p=>p.teamId===blue.id&&p.active&&p.offer.textile===1);
    state=await emitState(blue.c,'deletePost',{id:post.id},x=>x.posts.find(p=>p.id===post.id)?.active===false);
    assert(!state.posts.find(p=>p.id===post.id)?.active,'게시물이 삭제되지 않음');
  });

  await test('board trade',async()=>{
    const blue=students[4],yellow=students[5];
    state=await emitState(blue.c,'post',{offer:{textile:2},want:{tech:1}},x=>x.posts.some(p=>p.teamId===blue.id&&p.active));
    const p=state.posts.find(p=>p.teamId===blue.id&&p.active);
    state=await emitState(yellow.c,'take',{id:p.id},x=>x.contracts.some(c=>c.postId===p.id&&c.status==='pending'));
    const c=state.contracts.find(c=>c.postId===p.id&&c.status==='pending');
    state=await emitState(blue.c,'answer',{id:c.id,ok:true},x=>x.contracts.find(z=>z.id===c.id)?.status==='done');
    assert(team(state,blue.id).inv.tech===1,'blue tech 미수령');
    assert(team(state,yellow.id).inv.textile===2,'yellow textile 미수령');
  });

  state=await emitState(students[4].c,'post',{offer:{textile:1},want:{tech:1}},x=>x.posts.some(p=>p.teamId===students[4].id&&p.active));
  const cleanupPost=state.posts.find(p=>p.teamId===students[4].id&&p.active);
  state=await emitState(students[5].c,'take',{id:cleanupPost.id},x=>x.contracts.some(c=>c.postId===cleanupPost.id&&c.status==='pending'));
  state=await emitState(teacher,'teacher','consume',x=>x.phase==='results');
  await test('trade board cleared at consume',async()=>{assert(state.posts.length===0,`posts remain=${state.posts.length}`);assert(!state.contracts.some(c=>c.status==='pending'),'pending contract remains')});
  await test('consume/reward/stock cap',async()=>{for(const t of state.teams){assert(t.last,'last 없음');assert(t.last.reward>=0,'음수 보상');for(const v of Object.values(t.inv))assert(v<=5,'재고 상한 초과')}});

  // Advance to round 3 build, then construct road for first team.
  state=await emitState(teacher,'teacher','next',x=>x.round===2&&x.phase==='ready');
  state=await emitState(teacher,'teacher','produce',x=>x.round===2&&x.phase==='trade');
  state=await emitState(teacher,'teacher','consume',x=>x.round===2&&x.phase==='results');
  state=await emitState(teacher,'teacher','next',x=>x.round===3&&x.phase==='buildIntro');
  await test('round 3 build intro',async()=>assert(state.phase==='buildIntro','buildIntro 아님'));
  state=await emitState(teacher,'teacher','produce',x=>x.round===3&&x.phase==='trade');
  state=await emitState(teacher,'teacher','consume',x=>x.round===3&&x.phase==='results');
  state=await emitState(teacher,'teacher','build',x=>x.phase==='build');
  await test('facility construction',async()=>{const t0=team(state,students[0].id);assert(t0.cash>=14,`현금 부족 ${t0.cash}`);const before=t0.cash;state=await emitState(students[0].c,'build','road',x=>team(x,students[0].id).buildings.some(b=>b.id==='road'));assert(team(state,students[0].id).cash===before-14,'건설비 차감 오류')});
  state=await emitState(teacher,'teacher','next',x=>x.round===4&&x.phase==='ready');
  state=await emitState(teacher,'teacher','produce',x=>x.round===4&&x.phase==='trade');
  await test('production facility applies next round',async()=>{const t0=team(state,students[0].id);assert(t0.lastProduction.qty===13,`생산량 ${t0.lastProduction.qty}`)});

  // Finish rounds 4-6
  for(let rd=4;rd<=6;rd++){
    if(state.phase==='trade') state=await emitState(teacher,'teacher','consume',x=>x.round===rd&&x.phase==='results');
    if(rd>=3){state=await emitState(teacher,'teacher','build',x=>x.round===rd&&x.phase==='build');}
    state=await emitState(teacher,'teacher','next',x=>rd===6?x.phase==='final':x.round===rd+1);
    if(rd<6) state=await emitState(teacher,'teacher','produce',x=>x.round===rd+1&&x.phase==='trade');
  }
  await test('6 rounds final',async()=>{assert(state.phase==='final','final 아님');for(const t of state.teams){const fv=t.buildings.reduce((a,b)=>a+b.cost,0);assert(Number.isFinite(t.cash+fv),'총자산 오류')}});

  console.log(`\nE2E PASS ${pass} tests against ${BASE}`);
} finally { for(const x of sockets) try{x.disconnect()}catch{} }
