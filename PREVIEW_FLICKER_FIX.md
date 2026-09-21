# v0.5.3 미리보기 깜빡임 수정

원인:
교사 화면은 Socket.IO state를 받을 때마다 전체 UI를 다시 렌더링합니다.
v0.5.2에서는 그때마다 학생 미리보기 iframe도 삭제 후 새로 만들었기 때문에
iframe의 학생 페이지가 반복 재로드되어 깜빡였습니다.

수정:
- state 갱신 전에 현재 preview DOM을 잠시 분리(detach)
- 교사 UI만 다시 렌더링
- 기존 preview DOM/iframe을 그대로 다시 부착
- 같은 모둠 미리보기에서는 iframe을 재생성하지 않음
- 다른 모둠을 선택할 때만 새 iframe 생성

따라서 학생 미리보기의 Socket.IO 연결과 스크롤 상태가 유지됩니다.
