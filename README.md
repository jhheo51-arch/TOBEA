# TOBEA · 최종 프로젝트

## 제품 개선 실험실 / Product Lab

기획·데이터 분석을 위한 웹서비스입니다. 사용자 행동의 단계별 이탈을 계산하고, AI가 개선 가설을 제안·검토한 뒤 사람이 개선안과 실험 기준을 정합니다.

- [프로젝트 설명과 실행 방법](<final project/product-lab-2026-10-01-v03/README.md>)
- [AI 에이전트 유형과 제작 과정](<final project/product-lab-2026-10-01-v03/AGENT_DESIGN.md>)
- [API 키 설정 안내](<final project/product-lab-2026-10-01-v03/API_KEY_SETUP.md>)
- [검증 범위와 제출 안내](<final project/product-lab-2026-10-01-v03/SUBMISSION.md>)

Node.js 24 이상에서 해당 프로젝트 폴더의 터미널에 `npm start`를 입력하면 http://127.0.0.1:4197/ 에서 사용할 수 있습니다. `npm test`로 자동 검증 22개를 실행합니다. 별도 패키지 설치는 필요하지 않습니다.

로컬 실습에서는 `final project/.env`에 API 키를 보관합니다. 처음 복제했다면 프로젝트의 `.env.example`을 `final project/.env`로 복사한 뒤 키를 입력합니다. 키 파일은 GitHub에서 제외됩니다.

가상 자료로 실제 OpenAI 제안·검토·기획 반영을 확인했습니다. 가상 자료와 기능 시험을 실제 사용자 조사나 개선 성과로 해석하지 않습니다.
