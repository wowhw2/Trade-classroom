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
]
bad=[n for n,ok in tests if not ok]
for n,ok in tests: print(("PASS" if ok else "FAIL"),n)
sys.exit(1 if bad else 0)
