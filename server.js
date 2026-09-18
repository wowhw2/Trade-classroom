const express=require('express'),http=require('http');
const {Server}=require('socket.io'); const QRCode=require('qrcode');
const app=express(); app.set('trust proxy',true); const server=http.createServer(app),io=new Server(server,{pingTimeout:20000,pingInterval:10000});
app.use(express.static('public'));
const R=['food','wood','car','oil','textile','tech'];
const nations=[
 ['white','하얀 나라','food',[2,3,1,1,3,2]],['brown','갈색 나라','wood',[2,2,2,2,2,2]],['red','빨간 나라','car',[2,1,3,2,3,1]],
 ['black','검은 나라','oil',[2,1,3,2,1,3]],['blue','파란 나라','textile',[2,2,1,3,2,2]],['yellow','노란 나라','tech',[2,3,2,2,1,2]]
].map(x=>({id:x[0],name:x[1],special:x[2],need:Object.fromEntries(R.map((r,i)=>[r,x[3][i]]))}));
// 1차 시뮬레이션용 기본값. 숫자는 코드와 분리해 쉽게 조정 가능.
const facilities=[
 ['road','고속도로',14,'production',1],['port','항구',22,'production',2],['airport','공항',22,'production',2],
 ['hospital','병원',14,'reward',1],['school','학교',22,'reward',2],['park','공원',14,'reward',1],
 ['subway','지하철',16,'production',1],['access','장애인 편의시설',14,'reward',1],['shelter','유기동물 보호시설',14,'reward',1]
].map(x=>({id:x[0],name:x[1],cost:x[2],type:x[3],value:x[4]}));
let rooms={}; const rid=()=>String(Math.floor(100000+Math.random()*900000));
function newRoom(){let code=rid();while(rooms[code])code=rid();return rooms[code]={code,createdAt:Date.now(),round:0,maxRounds:6,phase:'lobby',teams:[],posts:[],contracts:[],settings:{baseProduction:12,initialCash:20,baseReward:10,shortagePenalty:1,stockCap:5,buildUnlock:3},facilities,token:Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)}}
const T=(r,id)=>r.teams.find(x=>x.id===id),N=id=>nations.find(x=>x.id===id),pub=r=>({...r,token:undefined}),emit=r=>io.to(r.code).emit('state',pub(r));
function publicBase(req){if(process.env.PUBLIC_BASE_URL)return process.env.PUBLIC_BASE_URL.replace(/\/$/,'');return `${req.protocol}://${req.get('host')}`}
function cleanPack(p={}){let o={cash:Math.max(0,Math.min(999,Math.floor(+p.cash||0)))};R.forEach(k=>o[k]=Math.max(0,Math.min(99,Math.floor(+p[k]||0))));return o}
function nonEmpty(p){return (p.cash||0)>0||R.some(k=>(p[k]||0)>0)}
app.get('/health',(req,res)=>res.json({ok:true}));
app.get('/api/qr/:code',async(req,res)=>{let r=rooms[req.params.code];if(!r)return res.status(404).end();let url=`${publicBase(req)}/?room=${r.code}`;res.type('png');res.send(await QRCode.toBuffer(url,{width:800,margin:2,errorCorrectionLevel:'M'}))});
app.get('/api/new-room',async(req,res)=>{let r=newRoom(),url=`${publicBase(req)}/?room=${r.code}`;res.json({code:r.code,token:r.token,url,qr:await QRCode.toDataURL(url,{width:800,margin:2})})});
setInterval(()=>{let cutoff=Date.now()-12*60*60*1000;Object.keys(rooms).forEach(k=>{if(rooms[k].createdAt<cutoff)delete rooms[k]})},60*60*1000).unref();
io.on('connection',s=>{
 s.on('join',d=>{let r=rooms[String(d.code||'')];if(!r)return s.emit('msg','방을 찾을 수 없습니다. QR을 다시 확인해 주세요.');s.join(r.code);s.data.code=r.code;if(d.token===r.token){s.data.teacher=true;return emit(r)}let t=d.teamId&&T(r,d.teamId);if(!t){if(r.phase!=='lobby')return s.emit('msg','참가가 마감되었습니다. 선생님께 알려 주세요.');let name=String(d.name||'').trim().slice(0,20);if(!name)return s.emit('msg','모둠 이름을 입력해 주세요.');t={id:Math.random().toString(36).slice(2),name,nation:null,cash:r.settings.initialCash,inv:Object.fromEntries(R.map(k=>[k,0])),buildings:[],stats:{trades:0,waste:0,full:0},last:null};r.teams.push(t)}s.data.teamId=t.id;s.emit('joined',t.id);emit(r)});
 s.on('teacher',(a)=>{let r=rooms[s.data.code];if(!r||!s.data.teacher)return;
  if(a==='assign'){r.teams.forEach((t,i)=>t.nation=nations[i%nations.length].id)}
  if(a==='start'){if(!r.teams.length)return s.emit('msg','참가한 모둠이 없습니다.');if(r.teams.some(t=>!t.nation))return s.emit('msg','나라 배정이 필요합니다.');r.round=1;r.phase='intro'}
  if(a==='produce'&&(r.phase==='intro'||r.phase==='ready'||r.phase==='buildIntro')){r.phase='trade';r.posts=[];r.contracts=r.contracts.filter(c=>c.status==='done');r.teams.forEach(t=>{let b=t.buildings.filter(x=>x.type==='production').reduce((z,x)=>z+x.value,0);let qty=r.settings.baseProduction+b;t.inv[N(t.nation).special]+=qty;t.lastProduction={qty,bonus:b}})}
  if(a==='consume'&&r.phase==='trade'){r.phase='results';r.posts.forEach(p=>p.active=false);r.contracts.filter(c=>c.status==='pending').forEach(c=>c.status='expired');r.teams.forEach(t=>{let before={...t.inv},miss=0,n=N(t.nation),used={};R.forEach(k=>{let u=Math.min(t.inv[k],n.need[k]);used[k]=u;miss+=n.need[k]-u;t.inv[k]-=u});let b=t.buildings.filter(x=>x.type==='reward').reduce((z,x)=>z+x.value,0),reward=Math.max(0,r.settings.baseReward+b-r.settings.shortagePenalty*miss);let cashBefore=t.cash;t.cash+=reward;if(!miss)t.stats.full++;let waste=0,wasted={};R.forEach(k=>{wasted[k]=Math.max(0,t.inv[k]-r.settings.stockCap);waste+=wasted[k];t.inv[k]=Math.min(t.inv[k],r.settings.stockCap)});t.stats.waste+=waste;t.last={miss,reward,waste,before,used,wasted,after:{...t.inv},cashBefore,cashAfter:t.cash,rewardBonus:b}})}
  if(a==='build'&&r.phase==='results'&&r.round>=r.settings.buildUnlock)r.phase='build';
  if(a==='next'&&(r.phase==='results'||r.phase==='build')){if(r.round>=r.maxRounds)r.phase='final';else{r.round++;r.phase=r.round===r.settings.buildUnlock?'buildIntro':'ready'}} emit(r)});
 s.on('contract',d=>{let r=rooms[s.data.code],a=r&&T(r,s.data.teamId),b=r&&T(r,d.to);if(!a||!b||r.phase!=='trade'||a.id===b.id)return;let offer=cleanPack(d.offer),want=cleanPack(d.want);if(!nonEmpty(offer)||!nonEmpty(want))return s.emit('msg','주고받을 내용을 하나 이상 넣어 주세요.');r.contracts.push({id:Math.random().toString(36).slice(2),from:a.id,to:b.id,offer,want,status:'pending',source:'direct'});emit(r)});
 s.on('answer',d=>{let r=rooms[s.data.code],c=r&&r.contracts.find(x=>x.id===d.id);if(!c||c.to!==s.data.teamId||c.status!=='pending'||r.phase!=='trade')return;if(!d.ok){c.status='rejected';return emit(r)}let a=T(r,c.from),b=T(r,c.to),enough=(t,p)=>R.every(k=>(p[k]||0)<=t.inv[k])&&(p.cash||0)<=t.cash;if(!enough(a,c.offer)||!enough(b,c.want)){c.status='failed';s.emit('msg','거래에 필요한 자원이나 화폐가 부족해 계약할 수 없습니다.');return emit(r)}let move=(x,y,p)=>{R.forEach(k=>{let q=p[k]||0;x.inv[k]-=q;y.inv[k]+=q});let q=p.cash||0;x.cash-=q;y.cash+=q};move(a,b,c.offer);move(b,a,c.want);a.stats.trades++;b.stats.trades++;c.status='done';if(c.postId){let p=r.posts.find(x=>x.id===c.postId);if(p)p.active=false}emit(r)});
 s.on('post',d=>{let r=rooms[s.data.code],t=r&&T(r,s.data.teamId);if(t&&r.phase==='trade'){let offer=cleanPack(d.offer),want=cleanPack(d.want);if(!nonEmpty(offer)||!nonEmpty(want))return s.emit('msg','줄 것과 받을 것을 넣어 주세요.');r.posts.push({id:Math.random().toString(36).slice(2),teamId:t.id,offer,want,active:true});emit(r)}});
 s.on('take',d=>{let r=rooms[s.data.code],p=r&&r.posts.find(x=>x.id===d.id&&x.active),t=r&&T(r,s.data.teamId);if(!p||!t||p.teamId===t.id||r.phase!=='trade')return;let owner=T(r,p.teamId);r.contracts.push({id:Math.random().toString(36).slice(2),from:t.id,to:owner.id,offer:p.want,want:p.offer,status:'pending',source:'board',postId:p.id});emit(r)});
 s.on('build',id=>{let r=rooms[s.data.code],t=r&&T(r,s.data.teamId),f=r&&r.facilities.find(x=>x.id===id);if(t&&f&&r.phase==='build'&&t.cash>=f.cost&&!t.buildings.some(x=>x.id===id)){t.cash-=f.cost;t.buildings.push({...f,builtRound:r.round});emit(r)}})
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Trade classroom server ready on port '+(process.env.PORT||3000)));
