# TOBEA · 프로젝트 모음

## 제품 개선 실험실 / Product Lab

기획·데이터 분석을 위한 웹서비스입니다. 사용자 행동의 단계별 이탈을 계산하고, AI가 개선 가설을 제안·검토한 뒤 사람이 개선안과 실험 기준을 정합니다.

- [프로젝트 설명과 실행 방법](<project/product-lab/product-lab-2026-10-01-v03/README.md>)
- [AI 에이전트 유형과 제작 과정](<project/product-lab/product-lab-2026-10-01-v03/AGENT_DESIGN.md>)
- [API 키 설정 안내](<project/product-lab/product-lab-2026-10-01-v03/API_KEY_SETUP.md>)
- [검증 범위와 제출 안내](<project/product-lab/product-lab-2026-10-01-v03/SUBMISSION.md>)

Node.js 24 이상에서 해당 프로젝트 폴더의 터미널에 `npm start`를 입력하면 http://127.0.0.1:4197/ 에서 사용할 수 있습니다. `npm test`로 자동 검증 22개를 실행합니다. 별도 패키지 설치는 필요하지 않습니다.

로컬 실습에서는 `project/product-lab/.env`에 API 키를 보관합니다. 처음 복제했다면 프로젝트의 `.env.example`을 `project/product-lab/.env`로 복사한 뒤 키를 입력합니다. 키 파일은 GitHub에서 제외됩니다.

가상 자료로 실제 OpenAI 제안·검토·기획 반영을 확인했습니다. 가상 자료와 기능 시험을 실제 사용자 조사나 개선 성과로 해석하지 않습니다.

## 함께 보관한 프로젝트

| 프로젝트 | 코드와 설명 | 원본 기준 |
|---|---|---|
| 아하루프 | [ahaloop/](project/ahaloop/) | sta3-github-test main |
| 메모이브 | [memoive/](project/memoive/) | sta3-github-test main · v14 |
| Proofline | [proofline/](project/proofline/) | 로컬 최신 v11 · 원본 저장소에 PR 제출 |
| 제품 개선 실험실 | [project/product-lab/](<project/product-lab/product-lab-2026-10-01-v03/>) | 기존 통합 코드 보존 |

아하루프와 메모이브는 원본 저장소의 공개 소스를 복사했습니다. 기존 저장소와 운영 사이트는 삭제하거나 배포를 변경하지 않았습니다. API 키·개인 사용 기록·로컬 이전 버전은 공개 대상에서 제외했습니다.

GitHub에서는 코드 검증만 실행합니다. 기존 사이트 예약 감시와 자동 복구 설정은 새 저장소에 복제하지 않았습니다.

## 현재 폴더 안내 (2026-10-02)

모든 프로젝트는 최상위 `project/` 아래에 프로젝트별로 모았습니다. 앞으로도 `project/프로젝트명/`에 저장합니다.

| 폴더 | 보관 내용 |
|---|---|
| [proofline](project/proofline/) | 기존 코드, v01~v14, 개인 기획과 결과물 |
| [ahaloop](project/ahaloop/) | 기존 코드, Sites 작업본, InsightFlow-CRM 보관본, 결과물 |
| [memoive](project/memoive/) | 기존 코드와 legacy-MEMOIVE 이전 자료·버전 |
| [fanbridge](project/fanbridge/) | 기획, 구현, 팬 안내 시험 자료 |
| [contextlens](project/contextlens/) | 버전별 기획·구현과 결과물 |
| [ai-workflow](project/ai-workflow/) | AI 작업 흐름 실습과 결과물 |
| [jh-planning](project/jh-planning/) | JH 기획 서비스와 이전 버전 |
| [product-lab](project/product-lab/) | 제품 개선 실험실 v01~v03와 공통 로컬 설정 |
| [career-newsroom](project/career-newsroom/) | 기존 커리어 뉴스 결과물 |
| [pdf](project/pdf/) | 기존 PDF 결과물 |
| [sta3-github-test](project/sta3-github-test/) | 여러 프로젝트가 포함된 통합 저장소 보관본; 내부 구조 유지 |
| [_legacy-tobe](project/_legacy-tobe/) | 이전 폴더 안내와 공통 패키지 보관 |

기존 파일은 삭제하거나 합쳐 덮어쓰지 않았습니다. 기존 작업일지에 적힌 경로는 당시 기록입니다. 폴더를 이동했으므로 예전에 저장한 로컬 실행 경로는 새 위치로 지정해야 합니다. 사이트 배포나 외부 저장소 업로드는 이 정리 작업에 포함하지 않았습니다.

## GitHub 반영 범위 (2026-10-03)

위 설명은 10월 2일의 로컬 폴더 정리 기록입니다. 10월 3일에는 공개 가능한 소스·기획·결과물과 이전 버전을 `project/` 구조로 GitHub에 반영했습니다. FANBRIDGE와 뭐라카노의 기존 PR도 main에 병합했습니다. 보관본 내부의 디렉터리 구조는 유지하며, 각 보관본의 Git 관리 정보는 포함하지 않습니다.

- [뭐라카노 최신 v08](project/mworakano/mworakano-2026-10-03-v08/README.md): 점수 없는 영어 코칭과 재도전 비교.
- [Whatif 기획](project/Whatif/PRD-2026-10-03-v02.md), [구자욱 편](project/Whatif/gu-jawook-2026-10-03-v01/analysis.md).
- [ContextLens v08](project/contextlens/contextlens-2026-09-30-v08/README.md), [JH 기획 실행 파일](project/jh-planning/jh-planning-sites-2026-10-03-v04/), [Proofline v14](project/proofline/proofline-2026-10-01-v14/).

개인 면접 준비·개인 기획 기록·최상위 작업일지·인증키·녹음·사용 기록·로컬 데이터베이스·설치 패키지·임시 배포 압축파일은 로컬에 보존하며 업로드하지 않습니다. 위 폴더 안내는 로컬 작업 공간 기준이므로 빈 폴더나 개인 자료만 있는 폴더는 GitHub에 나타나지 않을 수 있습니다. 이미 공개 저장소에 있던 아하루프 작업일지는 기존 내용 그대로 경로만 옮겨 보존합니다.

아하루프의 이전 체크아웃 두 개는 현재 앱의 정적 코드 검사 대상에서 제외합니다. 현재 앱의 기존 검사·빌드는 유지합니다. 이번 저장소 통합은 운영 사이트 재배포를 수행하지 않습니다.
