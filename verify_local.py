from pathlib import Path
import re, sys
root=Path(__file__).resolve().parent
server=(root/"server.js").read_text(encoding="utf-8")
teacher=(root/"public/teacher.js").read_text(encoding="utf-8")
student=(root/"public/student.js").read_text(encoding="utf-8")
tests=[
("kick server","d.type==='kick'" in server),
("kick client","teamRemoved" in student and "localStorage.removeItem" in student),
("manual nation","d.type==='setNation'" in server and "nation-select" in teacher),
("duplicate nation guard","이미 다른 모둠에 배정된 나라입니다." in server),
("random nation","d.type==='randomAssign'" in server),
("join lock","d.type==='toggleJoin'" in server and "joinOpen" in server),
("trade","s.on('contract'" in server and "s.on('answer'" in server),
("board","s.on('post'" in server and "s.on('take'" in server),
("consume","a==='consume'" in server),
("stock cap","stockCap:5" in server),
("build unlock","buildUnlock:3" in server),
("final assets","t.cash+f" in teacher and "t.cash+fv" in student),
("trade draft survives rerender","syncTradeDraft" in student and "postOpen" in student and "tradeDraft.to" in student),
("direct trade two-column","contract-columns" in student),
("needs always visible","소비할 물건" in student and "need-inline" in student),
("facility icons","const FI=" in student and "facility-pill" in student),
("sound events","eventSound" in server and "playSound" in student),
("double tap zoom guard","user-scalable=no" in (root/"public/index.html").read_text(encoding="utf-8")),
("single pending trade lock","pendingContract" in server and "tradeBusy" in server and "busyTeam" in student),
("board requirement balance guard","!enough(t,p.want)" in server and "canGivePack(t,p.want)" in student and "shortagePack(t,p.want)" in student),
("trade completion receipt","tradeComplete" in server and "거래가 성사되었습니다!" in student and "거래 후 우리 나라 자원 현황" in student),
("teacher full game reset","resetRoomForReplay" in server and "d.type==='resetGame'" in server and "roomReset" in student and "게임 초기화" in teacher),
("student automatic resume","resumeExisting" in student and "s.on('connect',resumeExisting)" in student and "localStorage.getItem('trade_'+room)" in student),
("teacher automatic resume","joinTeacher" in teacher and "s.on('connect',()=>joinTeacher())" in teacher),
("production progress and receipt","생산 중입니다" in student and "생산 완료!" in student and "lastProduction={round" in server),
("consumption progress and receipt","소비 중입니다" in student and "소비가 끝났어요!" in student and "사용한 물건" in student),
("construction progress and receipt","건설 중입니다" in student and "buildComplete" in server and "건설되었습니다" in student),
("next round briefing","ROUND ${p.round} 준비" in student and "현재 보유 자원" in student and "건설 현황" in student),
("visual game guide popup","gameGuideModal" in student and "무역놀이 한눈에 보기" in student and "guide-flow" in student and "게임 방법 다시 보기" in student),
]
bad=[n for n,ok in tests if not ok]
for n,ok in tests: print(("PASS" if ok else "FAIL"),n)
sys.exit(1 if bad else 0)
