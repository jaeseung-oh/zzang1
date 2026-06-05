# 수료증 발급 테스트 체크리스트

- 5강 미만 수강 시 `/certificate`에서 "총 5강을 모두 수강해야 수료증을 발급받을 수 있습니다." 안내가 표시되는지 확인
- 5강 전체 수강 완료 시 강의실에 "수료증 발급 및 보기" 버튼이 표시되는지 확인
- 생년월일이 없는 사용자는 `/certificate`에서 생년월일 입력을 요구하는지 확인
- 생년월일은 `YYYY-MM-DD` 형식, 실제 존재하는 날짜, 미래 날짜 불가 조건으로 검증되는지 확인
- 생년월일 저장 후 수료증 발급 시 `users.birthDate`와 `users.dateOfBirth`가 저장되는지 확인
- 수료증에 성명, 생년월일, 이메일이 발급 당시 값으로 표시되는지 확인
- 발급번호가 `CERT-DUI-YYYYMMDD-XXXXXX` 형식인지 확인
- `/certificate`를 다시 열어도 기존 발급번호가 유지되는지 확인
- `certificates/{uid}_dui-prevention-basic`에 발급 스냅샷이 저장되는지 확인
- `enrollments/{uid}_dui-prevention-basic.certificateIssued`가 `true`로 변경되는지 확인
- `purchases` 문서에도 `certificateIssued`, `certificateId`, `certificateNo`가 저장되는지 확인
- 환불 계산에서 `certificateIssued=true`이면 "수료증이 발급된 과정은 환불이 불가합니다."가 적용되는지 확인
- 수료증 페이지에서 "수료증 인쇄하기" 클릭 시 브라우저 인쇄창이 열리는지 확인
- 인쇄 미리보기에서 버튼, 안내문, 네비게이션이 숨겨지고 A4 세로형 수료증만 표시되는지 확인
- 다른 사용자의 `certificateId`를 URL에 입력하면 조회가 차단되는지 확인
- 관리자 결제 화면에서 사용자명, 이메일, 생년월일, 진행률, 수료일, 발급번호, 수료증 보기 링크가 표시되는지 확인
- 관리자 키가 없거나 틀린 경우 관리자 결제 화면 조회가 실패하는지 확인
- 수강기간 만료 후 신규 수료증 발급이 제한되는지 확인
