# ContextLens Sites v02

기존 비공개 ContextLens 사이트에 개선 프로젝트·실제 참가자 검증·지원서용 사례 문서를 추가한 버전입니다. v01 작업 폴더는 보존했습니다. 같은 Sites 프로젝트와 데이터베이스를 사용합니다.

- `/contextlens`: 링크 분석과 원문·표본 검토. 결과에서 ‘개선 프로젝트’로 이동합니다.
- `/projects`: 자료별 개선 사례. ‘ContextLens 개선안으로 시작’은 빈 항목에 실제 구현 내용과 시험할 가설을 넣습니다. 실제 관찰값·협업 응답은 자동으로 채우지 않습니다.
- `/study.html`: 같은 저장 시점으로 실제 참가자 과제. 대면·화면 공유로 소유자의 화면에서 진행합니다. 기능 확인은 시험용으로 지정합니다.
- 제출 문서: 프로젝트 저장 후 문서를 생성하고 Markdown·인쇄용 HTML로 저장합니다. HTML을 열어 PDF로 저장할 수 있습니다.

기획서는 `PRD_CONTEXTLENS_SITES_2026-09-30-v02.md`, 진행 안내문은 `public/CX_STUDY_PROTOCOL.md`, 현재 구현 사실만 담은 사례 초안은 `portfolio/ContextLens_CX_case_2026-09-30-v01.md`입니다. 실제 조사 성과가 확보되기 전에는 제출 문서의 미측정 상태를 성과로 바꾸지 않습니다.

## 검증

`node --experimental-strip-types --test tests/project.test.mjs`로 측정·사례 문서의 핵심 판단을 확인합니다. `npx tsc --noEmit`과 `npm run build`로 게시용 코드를 확인합니다.

`tests/integration.py`는 127.0.0.1:8770의 로컬 Worker와 격리 데이터베이스에서만 실행합니다. 합성 데이터를 사용하며 실제 고객 성과가 아닙니다. `tests/preview-proxy.mjs`는 로컬 브라우저 검증 전용이고 배포 Worker에 포함되지 않습니다.

## 저장과 접근

기존 사례·수집 시점은 보존하고 새 프로젝트·변경 이력과 참가자 구분 항목을 추가합니다. 이전 참가자 기록은 미분류 상태로 보존하며 실제 성과 집계에서 제외합니다. 사이트는 계속 소유자만 접근 가능합니다. 공개 댓글·사용성 과제로 상담 문의 감소·SLA·CSAT 성과나 실제 조직 협업 경력을 주장하지 않습니다.
