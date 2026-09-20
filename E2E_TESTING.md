# 자동 E2E 검증

## 무엇을 검사하나
`tests/e2e.mjs`는 실제 Socket.IO 클라이언트를 여러 개 생성해 교사 1명 + 학생 모둠들을 흉내냅니다.

자동 검사 항목:
- 방 생성 / 교사 접속
- 6모둠 참가
- 잘못 참가한 모둠 내보내기 및 재참가
- 참가 마감
- 나라 수동 배정 및 중복 차단
- 1라운드 자동 생산
- 자원↔자원 계약
- 화폐↔자원 계약
- 거래 게시판 신청/승인
- 자동 소비 / 보상 / 재고상한
- 3라운드 건설 개방
- 시설 건설비 차감
- 다음 라운드 생산시설 효과
- 6라운드 종료 / 최종자산 계산 가능 여부

## GitHub Actions
`.github/workflows/e2e.yml`이 main 브랜치 push 때마다 로컬 서버를 띄우고 자동 E2E 테스트를 실행합니다.

GitHub 저장소의 **Actions → Trade Classroom E2E**에서 PASS/FAIL을 확인할 수 있습니다.

## 실제 Render 서버 검사
Actions에서 `Trade Classroom E2E` → `Run workflow`를 누르고 `base_url`에
`https://trade-classroom.onrender.com`을 입력하면 배포된 서버 자체를 대상으로 같은 테스트를 실행합니다.

주의: 이 테스트는 별도의 임시 게임방을 생성하며 실제 수업방을 건드리지 않습니다.
