import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/Administrator/Documents/ChatGPT/TOBEA/outputs/career-newsroom-db-20260916-v01";
const outputPath = `${outputDir}/career-newsroom-insight-db-2026-09-16-v01.xlsx`;

const rows = [
  [1,"A","토스","토스 테크","토스","기술·프로덕트 블로그","핀테크","제품 실험, 데이터, 디자인, 개발 문화","PM/PO · BA · 데이터",5,"제품 문제를 수치와 실험으로 푸는 과정을 구체적으로 볼 수 있음","문제 정의→가설→지표→실험→학습이 어떻게 이어졌나?","케이스 스터디, 면접 답변","한국어","활발","2026년 최신 글 확인","https://toss.tech/","2026-09-16","Product 카테고리를 먼저 볼 것"],
  [2,"A","토스","토스 테크 Product","토스","프로덕트 사례 모음","핀테크","성장, UX, 실험, 고객 행동","PM/PO · BA · CRM",5,"비개발 직무가 읽기 좋은 제품 의사결정 사례가 모여 있음","실패한 가설을 어떤 고객 신호로 수정했나?","제품 분석 노트","한국어","활발","2026년 Product 글 확인","https://toss.tech/category/product","2026-09-16","토스 테크의 직무 맞춤 바로가기"],
  [3,"A","토스","토스피드","토스","브랜드 미디어","핀테크","금융 생활, 정책, 고객 문제, 브랜드","CRM · PM/PO · Consultant",5,"어려운 금융 정보를 고객 언어로 바꾸는 방식을 배울 수 있음","고객의 어떤 질문을 콘텐츠 주제로 바꿨나?","콘텐츠·고객여정 분석","한국어","활발","2026년 콘텐츠 확인","https://toss.im/tossfeed","2026-09-16","정책·금융 콘텐츠는 아하루프 참고용"],
  [4,"B","토스","토스 뉴스룸","토스","뉴스룸","핀테크","사업 확장, 제휴, 성과, 조직","BA · Consultant · PM/PO",4,"서비스가 어느 시장과 파트너로 확장되는지 빠르게 파악 가능","보도자료에서 드러나는 다음 사업 우선순위는 무엇인가?","기업 동향 브리프","한국어","활발","2026-08 최신 소식 확인","https://toss.im/newsroom","2026-09-16","월 1회 확인"],
  [5,"A","네이버","NAVER D2","네이버","기술 블로그·컨퍼런스 아카이브","플랫폼·AI","AI, 데이터, 추천, 대규모 서비스, 개발 문화","데이터 · BA · PM/PO",5,"대규모 서비스의 데이터·AI 적용과 운영 문제를 깊게 볼 수 있음","기술 선택이 사용자 경험이나 운영 지표를 어떻게 바꿨나?","기술-비즈니스 번역 노트","한국어","활발","2026-07 최신 글 확인","https://d2.naver.com/","2026-09-16","비개발자는 결론·문제·효과 중심으로 읽기"],
  [6,"B","카카오","kakao tech","카카오","기술 블로그","플랫폼·AI","AI, 데이터, 추천, 클라우드, 개발 문화","데이터 · BA · PM/PO",4,"카카오 서비스의 추천·데이터 품질·AI 사례를 확인 가능","데이터 품질과 거버넌스를 누가 책임지는가?","데이터 운영 사례 정리","한국어","활발","2026-09 최신 글 확인","https://tech.kakao.com/","2026-09-16","데이터·AI 태그 우선"],
  [7,"A","우아한형제들","우아한형제들 기술블로그","우아한형제들","기술·제품 블로그","배달·플랫폼","PM, 데이터, AI, 실험, 조직 학습","PM/PO · BA · 데이터",5,"기술 글 안에서도 문제·실험·운영 맥락을 자세히 설명함","현장의 제약을 어떤 기준으로 우선순위화했나?","STAR 면접 사례","한국어","활발","2026-09 최신 글 확인","https://techblog.woowahan.com/","2026-09-16","PM·Data·GenAI 태그 활용"],
  [8,"B","당근","당근 테크 블로그","당근","기술·데이터 블로그","지역 커뮤니티","지표 정의, 실험, 데이터 신뢰, 추천","데이터 · PM/PO · CRM",4,"신뢰할 수 있는 지표와 지역 기반 서비스 문제를 볼 수 있음","좋은 지표를 만들기 위해 정의·계산·소유권을 어떻게 관리했나?","지표 사전 초안","한국어","아카이브","대표 데이터 글 확인, 최근 활동은 제한적","https://medium.com/daangn","2026-09-16","최신성보다 대표 사례 활용"],
  [9,"A","컬리","컬리 기술 블로그","컬리","기술·프로덕트 블로그","커머스·물류","AI/데이터, 프로덕트, 물류 운영, 자동화","PM/PO · BA · 데이터",5,"주문·입고·배송이라는 실제 운영 흐름과 AI 적용을 함께 볼 수 있음","업무 흐름의 병목을 어떻게 찾아 제품 요구사항으로 바꿨나?","업무 프로세스 개선안","한국어","활발","2026-05 최신 글 확인","https://helloworld.kurly.com/","2026-09-16","프로덕트·AI/데이터 카테고리 우선"],
  [10,"A","무신사","MUSINSA techblog","무신사","기술·데이터 블로그","패션 커머스","추천, 데이터 품질, 물류, AI, QA","데이터 · BA · PM/PO",5,"커머스 데이터와 추천·품질·물류를 연결한 사례가 많음","로그 품질이 고객·사업 의사결정에 어떤 영향을 주었나?","데이터 품질 체크리스트","한국어","활발","2026년 최신 글 확인","https://techblog.musinsa.com/","2026-09-16","데이터·추천·물류 글 우선"],
  [11,"A","뱅크샐러드","뱅크샐러드 기술 블로그","뱅크샐러드","기술·제품 블로그","핀테크·헬스","데이터 정합성, API 운영, 홈 UX, 협업 문서","BA · 데이터 · PM/PO",5,"금융 데이터 연동과 테크스펙 문화가 BA 역할과 직접 연결됨","요구사항과 예외 조건을 문서로 어떻게 합의했나?","요구사항 명세 사례","한국어","활발","2026년 글 확인","https://blog.banksalad.com/tech/","2026-09-16","테크스펙·홈 개편 시리즈 추천"],
  [12,"B","카카오스타일","카카오스타일 기술 블로그","카카오스타일","기술 블로그","패션 커머스","A/B 테스트, 분석, 서버 주도 UI, 비용","PM/PO · BA · 데이터",4,"실험과 화면 유연성을 기술·사업 관점에서 함께 볼 수 있음","빠른 실험을 위해 시스템 구조를 어떻게 바꿨나?","실험 설계 참고","한국어","활발","2026-08 최신 글 확인","https://devblog.kakaostyle.com/ko/","2026-09-16","analytics·data 태그 활용"],
  [13,"B","쏘카","SOCAR Tech Blog","쏘카","기술 블로그","모빌리티","대규모 트래픽, 데이터, 운영 시스템","BA · 데이터 · PM/PO",4,"회원·예약·차량 운영처럼 현실 제약이 큰 서비스 사례를 볼 수 있음","성수기·장애 위험을 어떤 운영 지표로 관리했나?","운영 리스크 분석","한국어","아카이브","2023년 대표 글 확인","https://tech.socarcorp.kr/","2026-09-16","최신성보다 운영 문제 사례 활용"],
  [14,"B","쏘카","쏘카 기업 블로그","쏘카","기업·제품 블로그","모빌리티","서비스 전략, 고객 경험, 사업 확장","PM/PO · Consultant · CRM",4,"기술 블로그보다 사업·고객 관점의 변화를 보기 좋음","새 서비스가 해결하려는 고객 상황과 수익 모델은 무엇인가?","서비스 비교표","한국어","활발","2026-03 최신 기업 글 확인","https://www.socarcorp.kr/blog","2026-09-16","제품 블로그와 함께 비교"],
  [15,"B","여기어때컴퍼니","여기어때 기술블로그","여기어때컴퍼니","기술·제품·문화 블로그","여행·숙박","Product, UX, 데이터, 기술, 조직","PM/PO · BA · CRM",4,"제품·UX 글과 기술 글이 함께 있어 직무 간 협업을 보기 좋음","사용자 여정에서 가장 큰 이탈 지점을 어떻게 찾았나?","여정지도 참고","한국어","현재 접근 가능","공식 기술블로그 페이지 확인","https://techblog.gccompany.co.kr/","2026-09-16","Product·UX 카테고리 우선"],
  [16,"A","리디","RIDI Story","리디","인사이트·테크·문화·뉴스룸","콘텐츠 플랫폼","팬덤, 콘텐츠, AI 업무혁신, 제품·조직","PM/PO · CRM · Consultant",5,"콘텐츠·팬덤 비즈니스와 AI 업무혁신을 함께 볼 수 있음","사용자 취향과 팬덤을 어떤 상품·경험으로 연결했나?","콘텐츠 전략 사례","한국어","활발","2026-09 최신 콘텐츠 확인","https://ridicorp.com/","2026-09-16","Insight와 Tech Blog 필터 활용"],
  [17,"B","에이블리","에이블리 팀","에이블리코퍼레이션","비즈니스·팀·채용 콘텐츠","패션 커머스","데이터 전략, PO, 조직, 성장","PM/PO · 데이터 · BA",4,"리더 Q&A에서 실제 PO·데이터·조직 운영 관점을 확인 가능","프로세스보다 판단 기준을 중시하는 이유는 무엇인가?","문화·직무 비교 노트","한국어","활발","2026-04 리더 콘텐츠 확인","https://ably.team/","2026-09-16","Business·팀 소식 중심"],
  [18,"B","LINE","LINE Careers People","LINE","직무·커리어 인터뷰","메신저·플랫폼","기획, 분석, 비즈니스, 엔지니어링 역할","BA · 데이터 · PM/PO",4,"Planning·Analysis 직무가 실제로 하는 일을 비교하기 좋음","같은 문제를 기획·분석·개발 직무가 어떻게 나누나?","직무 비교표","한국어","현재 운영","직무별 인터뷰 목록 확인","https://careers.linecorp.com/ko/people","2026-09-16","Planning·Analysis 필터 활용"],
  [19,"A","삼성SDS","인사이트 리포트","삼성SDS","비즈니스·기술 인사이트","기업 IT·컨설팅","AX, DX, 업무혁신, 데이터, 산업별 사례","BA · Consultant · 데이터",5,"기업 업무 프로세스와 AI 전환을 구조적으로 학습하기 좋음","기술 도입 전 어떤 업무·데이터·조직 조건을 진단했나?","기업 AX 케이스","한국어","활발","2026-09 최신 리포트 확인","https://www.samsungsds.com/kr/insights/index.html","2026-09-16","업무 혁신·AX·금융 필터 추천"],
  [20,"B","삼성SDS","Samsung SDS Research","삼성SDS","연구·기술 자료","기업 IT·AI","Agentic AI, Physical AI, 보안, SW 품질","데이터 · BA · Consultant",4,"기술 트렌드를 기업 적용 관점으로 연결할 때 유용함","연구 주제가 실제 기업 문제와 어떤 접점을 가지나?","기술 트렌드 브리프","한국어","현재 운영","2026년 연구 분야 페이지 확인","https://www.samsungsds.com/kr/technology-research/research-areas.html","2026-09-16","깊은 기술은 개념·적용 분야 중심으로 읽기"],
  [21,"A","LG CNS","LG CNS 뉴스룸","LG CNS","뉴스룸·사업 사례","기업 IT·컨설팅","AX, 클라우드, 금융, 제조, 공공, 물류","BA · Consultant · 데이터",5,"산업별 AX 프로젝트와 파트너십을 실제 수주·구축 사례로 볼 수 있음","고객 산업의 문제를 어떤 기술·프로세스 조합으로 해결했나?","산업별 AX 사례표","한국어","활발","2026-08 최신 보도자료 확인","https://www.lgcns.com/kr/newsroom/press.html","2026-09-16","예전 DX Lounge는 현재 연결 종료"],
  [22,"A","LG CNS","디지털 AX","LG CNS","서비스 인사이트","기업 IT·컨설팅","업무 재설계, 직원 경험, AI 에이전트","BA · Consultant · PM/PO",5,"AI 도입을 기능이 아니라 업무 흐름 재설계로 보는 관점이 강함","현재 업무 흐름에서 사람이 판단해야 할 지점은 어디인가?","As-is/To-be 프로세스","한국어","현재 운영","공식 서비스 페이지 확인","https://www.lgcns.com/kr/service/biz-process-intelligence/digital-ax","2026-09-16","BA 포트폴리오와 직접 연결"],
  [23,"A","SK AX","SK AX Trend","SK AX","트렌드·뉴스·서비스 인사이트","기업 IT·컨설팅","Agentic AI, 제조, 금융, 데이터, 운영 혁신","BA · Consultant · 데이터",5,"기업 운영 전반을 AI로 바꾸는 관점과 산업 사례를 볼 수 있음","기술이 아니라 운영 체계를 어떻게 바꾸려 하는가?","컨설팅 이슈 트리","한국어","활발","2026-09 최신 Trend·News 확인","https://www.skax.co.kr/","2026-09-16","Trend 메뉴 우선"],
  [24,"B","SK텔레콤·SK ICT","DEVOCEAN","SK ICT 패밀리","기술 블로그·커뮤니티","통신·AI·플랫폼","AI, 데이터, 오픈소스, 커리어, 세미나","데이터 · BA · PM/PO",4,"SK 계열 현업자의 기술·운영 경험과 세미나를 한곳에서 볼 수 있음","기술 선택의 장단점과 운영 학습은 무엇이었나?","세미나 요약 노트","한국어","활발","2026년 콘텐츠 확인","https://devocean.sk.com/","2026-09-16","블로그·전문가·행사 탭 활용"],
  [25,"B","NHN Cloud","NHN Cloud Meetup!","NHN Cloud","기술 블로그","클라우드·AI","AI 인프라, 데이터, 보안, 개발 문화","데이터 · BA · Consultant",4,"기업용 클라우드와 AI 인프라의 실제 운영 문제를 볼 수 있음","성능·보안·비용 사이의 기준을 어떻게 세웠나?","기술 의사결정 기록","한국어","활발","2026-08 최신 글 확인","https://meetup.nhncloud.com/","2026-09-16","AI·데이터·보안 글 우선"],
  [26,"B","카카오","카카오 기술·서비스 소개","카카오","기업 기술 전략 페이지","플랫폼·AI","데이터 메시, 추천, AI, 보안, 개인정보","BA · 데이터 · Consultant",4,"기술 블로그보다 전사 기술 전략과 거버넌스 관점을 빠르게 파악 가능","서비스 조직과 데이터 조직의 책임을 어떻게 나누는가?","데이터 거버넌스 요약","한국어","현재 운영","공식 기술 서비스 페이지 확인","https://www.kakaocorp.com/page/service/tech","2026-09-16","카카오테크와 함께 보기"],
  [27,"B","카카오뱅크","카카오뱅크 서비스","카카오뱅크","제품·서비스 소개","핀테크","AI 금융, 청소년, 사업자, 글로벌 서비스","PM/PO · BA · CRM",4,"고객군별 금융 문제를 제품 묶음으로 어떻게 풀었는지 보기 좋음","고객군을 어떤 기준으로 나누고 어떤 문제를 우선 해결했나?","서비스 포트폴리오 분석","한국어","활발","2026년 서비스 페이지 확인","https://www.kakaobank.com/view/service","2026-09-16","서비스별 대상·문제·가치 정리"],
  [28,"B","AWS","AWS 한국 블로그","Amazon Web Services","기술·고객 사례 블로그","클라우드·AI","신제품, 고객 사례, 아키텍처, AI","BA · 데이터 · Consultant",4,"기업의 클라우드·AI 도입 사례와 기술 선택지를 폭넓게 볼 수 있음","고객의 제약과 성과 지표는 무엇이었나?","고객 사례 요약","한국어","활발","2026-09 최신 글 확인","https://aws.amazon.com/ko/blogs/korea/","2026-09-16","고객 사례와 산업 태그 우선"],
  [29,"C","AWS","AWS Korea Tech Blog","Amazon Web Services Korea","실무 기술 블로그","클라우드·AI","오픈소스, 데이터, 아키텍처, 구현 예제","데이터 · BA",3,"기술팀과 대화할 기본 배경지식을 쌓는 데 유용함","이 기술이 해결하는 운영 문제와 한계는 무엇인가?","기술 용어 노트","한국어","활발","공식 기술 블로그 운영 확인","https://aws.amazon.com/ko/blogs/tech/","2026-09-16","비개발자는 개요·사례·결론 중심"],
  [30,"B","Google","구글코리아 블로그","Google Korea","공식 블로그·뉴스룸","AI·플랫폼","AI 제품, 연구, 한국 협력, 제품 업데이트","PM/PO · Consultant · 데이터",4,"AI 제품 방향과 한국 시장 협력 사례를 빠르게 파악 가능","글로벌 제품을 한국 사용자·산업에 어떻게 맞추나?","AI 시장 동향 노트","한국어","활발","2026년 최신 글 확인","https://blog.google/intl/ko-kr/","2026-09-16","AI·Gemini·Life at Google 필터"],
  [31,"B","Microsoft","한국마이크로소프트 뉴스센터","Microsoft Korea","뉴스룸·고객 사례","기업 AI·클라우드","AI 전환, 고객 사례, 파트너십, 업무 혁신","BA · Consultant · PM/PO",4,"기업 AI 전환 프레임과 국내 고객 사례를 확인 가능","실험 단계에서 전사 확장으로 넘어간 조건은 무엇인가?","AI 도입 단계표","한국어","활발","2026년 보도자료 확인","https://news.microsoft.com/ko-kr/","2026-09-16","고객 사례·AI 전환 기사 우선"],
  [32,"B","IBM","IBM Think 한국어","IBM","인사이트·가이드·뉴스","기업 AI·데이터","AI 에이전트, 데이터 거버넌스, 자동화, 보안","BA · Consultant · 데이터",4,"기업용 AI의 개념·거버넌스·운영 모델을 체계적으로 학습 가능","기술 도입 시 책임·통제·성과 측정은 어떻게 설계하나?","개념·프레임워크 노트","한국어","활발","2026년 최신 콘텐츠 확인","https://www.ibm.com/kr-ko/think","2026-09-16","AI 에이전트·데이터 관리 가이드 추천"],
  [33,"A","Salesforce","세일즈포스 공식 블로그","Salesforce Korea","CRM·비즈니스 인사이트","CRM·SaaS","CRM, 고객 여정, 데이터 통합, 영업·마케팅 AI","CRM · BA · Consultant",5,"CRM 직무와 고객 데이터 활용을 가장 직접적으로 공부할 수 있음","고객 데이터를 어떤 행동·자동화·성과로 연결했나?","CRM 케이스 라이브러리","한국어","활발","2026년 최신 글 확인","https://www.salesforce.com/kr/blog/","2026-09-16","CRM·고객 관계·데이터 분석 카테고리"],
  [34,"A","Salesforce","Salesforce CRM 아카이브","Salesforce Korea","CRM 주제 모음","CRM·SaaS","CRM 기초, 리드, 영업, 고객 경험, AI","CRM · BA · PM/PO",5,"CRM 기본 개념부터 국내외 사례까지 직무별로 모아보기 좋음","세그먼트·여정·접점·다음 행동이 어떻게 연결되나?","CRM 용어·사례 DB","한국어","활발","2026-05 최신 CRM 글 확인","https://www.salesforce.com/kr/blog/category/crm/","2026-09-16","아하루프 퍼널 설계 참고"],
  [35,"A","Deloitte","Deloitte Insights Korea","Deloitte Korea","산업·경영 인사이트","컨설팅","산업 분석, AI, 고객, 전략, 운영","Consultant · BA · 데이터",5,"컨설팅식 문제 구조화와 산업별 핵심 질문을 익히기 좋음","현상→원인→영향→선택지를 어떤 근거로 연결했나?","1페이지 산업 브리프","한국어","활발","2026년 최신 리포트 확인","https://www.deloitte.com/kr/ko/our-thinking/deloitte-insights.html","2026-09-16","관심 산업 하나를 정해 연속 읽기"],
  [36,"A","삼일PwC","삼일PwC Insights","삼일PwC","산업·경영 인사이트","컨설팅·회계","산업, 거시경제, 리스크, AI, 전략","Consultant · BA · 데이터",5,"한국 기업 관점의 산업·경영 이슈를 보고서 형태로 학습 가능","보고서의 주장과 근거 데이터는 어떻게 연결되는가?","리포트 비평 노트","한국어","활발","2026년 최신 자료 확인","https://www.pwc.com/kr/ko/insights.html","2026-09-16","Issue Brief·Industry Focus 우선"],
  [37,"A","EY한영","EY Insights Korea","EY한영","산업·경영 인사이트","컨설팅·회계","AI, 디지털, 고객 성장, 산업, 인재","Consultant · BA · PM/PO",5,"전략 질문 중심으로 기업 변화와 산업 이슈를 볼 수 있음","이 보고서가 경영진에게 요구하는 의사결정은 무엇인가?","경영진 메모","한국어","활발","2026년 최신 인사이트 확인","https://www.ey.com/ko_kr/insights","2026-09-16","AI·디지털·고객 성장 주제 우선"],
  [38,"A","삼정KPMG","삼정KPMG Insights","삼정KPMG","산업·경영 인사이트","컨설팅·회계","산업 분석, AI 수익화, 소비, ESG, 리스크","Consultant · BA · 데이터",5,"산업별 구조와 시장 변화를 한국 기업 관점으로 정리하기 좋음","산업의 가치사슬과 수익 기회가 어떻게 바뀌는가?","산업 가치사슬 분석","한국어","활발","2026년 최신 인사이트 확인","https://kpmg.com/kr/ko/insights.html","2026-09-16","경제연구원 보고서 우선"],
  [39,"B","McKinsey & Company","McKinsey Korea","McKinsey & Company","한국 시장·컨설팅 인사이트","전략 컨설팅","한국 성장, 산업 전략, 조직·운영","Consultant · BA",4,"한국 시장을 글로벌 프레임과 연결한 전략 보고서를 볼 수 있음","어떤 구조적 문제를 몇 개의 축으로 단순화했나?","문제 구조화 연습","한국어·영어","현재 운영","한국 오피스 인사이트 확인","https://www.mckinsey.com/kr","2026-09-16","Featured insights 중심"],
  [40,"B","Boston Consulting Group","BCG Korea","BCG","한국 시장·컨설팅 인사이트","전략 컨설팅","산업 전략, 디지털, AI, 조직","Consultant · BA",4,"전략 컨설팅의 관점과 산업별 변화 프레임을 확장하기 좋음","제안한 변화가 실행되려면 어떤 역량과 순서가 필요한가?","전략 옵션 비교","영어 중심","현재 운영","한국 오피스 공식 페이지 확인","https://www.bcg.com/korea","2026-09-16","한국 관련 출판물과 글로벌 AI 자료 병행"],
];

const headers = ["ID","우선순위","기업","사이트명","운영 주체","사이트 유형","산업","주요 주제","추천 직무","적합도(5)","왜 볼지","읽을 때 질문","추천 산출물","언어","업데이트 상태","최근 확인 근거","공식 URL","확인일","메모"];

const workbook = Workbook.create();
const db = workbook.worksheets.add("커리어 DB");
const guide = workbook.worksheets.add("읽기 가이드");
db.showGridLines = false;
guide.showGridLines = false;
db.tabColor = "#173B57";
guide.tabColor = "#4F7C87";

db.getRange("A2:S2").merge();
db.getRange("A2").values = [["기업 공식 뉴스룸·인사이트 커리어 데이터베이스"]];
db.getRange("A3:S3").merge();
db.getRange("A3").values = [["관심 직무: BA, CRM·데이터 활용, Consultant, PM/PO  |  공식 운영 주체와 현재 접근 여부를 2026-09-16에 확인"]];
db.getRange("A5:B5").merge(); db.getRange("A5").values = [["전체 사이트"]];
db.getRange("C5:D5").merge(); db.getRange("C5").values = [["A 우선순위"]];
db.getRange("E5:F5").merge(); db.getRange("E5").values = [["적합도 5"]];
db.getRange("G5:H5").merge(); db.getRange("G5").values = [["한국어 중심"]];
db.getRange("A6:B6").merge(); db.getRange("A6").formulas = [["=COUNTA(C9:C48)"]];
db.getRange("C6:D6").merge(); db.getRange("C6").formulas = [["=COUNTIF(B9:B48,\"A\")"]];
db.getRange("E6:F6").merge(); db.getRange("E6").formulas = [["=COUNTIF(J9:J48,5)"]];
db.getRange("G6:H6").merge(); db.getRange("G6").formulas = [["=COUNTIF(N9:N48,\"한국어\")+COUNTIF(N9:N48,\"한국어·영어\")"]];
db.getRange("A8:S8").values = [headers];
db.getRange("A9:S48").values = rows;
const table = db.tables.add("A8:S48", true, "CareerSitesTable");
table.style = "TableStyleMedium2";
table.showBandedRows = true;
table.showFilterButton = true;

const font = "Arial";
db.getRange("A2:S48").format.font = { name: font, size: 10, color: "#1F2937" };
db.getRange("A2").format.font = { name: font, size: 16, bold: true, color: "#173B57" };
db.getRange("A3").format.font = { name: font, size: 10, italic: true, color: "#5B6770" };
db.getRange("A2:S2").format.rowHeight = 28;
db.getRange("A3:S3").format.rowHeight = 22;
db.getRange("A5:H5").format = { fill: "#E8F0F4", font: { name: font, bold: true, color: "#173B57" }, horizontalAlignment: "center", verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: "#A9BCC7" } };
db.getRange("A6:H6").format = { fill: "#F7FAFC", font: { name: font, size: 14, bold: true, color: "#173B57" }, horizontalAlignment: "center", verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: "#A9BCC7" } };
db.getRange("A5:H6").format.rowHeight = 24;
db.getRange("A8:S8").format = { fill: "#173B57", font: { name: font, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { insideVertical: { style: "thin", color: "#FFFFFF" }, bottom: { style: "medium", color: "#173B57" } } };
db.getRange("A9:S48").format.verticalAlignment = "top";
db.getRange("A9:S48").format.wrapText = true;
db.getRange("A9:B48").format.horizontalAlignment = "center";
db.getRange("J9:J48").format.horizontalAlignment = "center";
db.getRange("R9:R48").format.horizontalAlignment = "center";
db.getRange("A9:S48").format.rowHeight = 54;
db.getRange("A:A").format.columnWidth = 5;
db.getRange("B:B").format.columnWidth = 8;
db.getRange("C:C").format.columnWidth = 15;
db.getRange("D:D").format.columnWidth = 24;
db.getRange("E:E").format.columnWidth = 19;
db.getRange("F:F").format.columnWidth = 22;
db.getRange("G:G").format.columnWidth = 18;
db.getRange("H:H").format.columnWidth = 32;
db.getRange("I:I").format.columnWidth = 21;
db.getRange("J:J").format.columnWidth = 9;
db.getRange("K:K").format.columnWidth = 38;
db.getRange("L:L").format.columnWidth = 40;
db.getRange("M:M").format.columnWidth = 24;
db.getRange("N:N").format.columnWidth = 13;
db.getRange("O:O").format.columnWidth = 15;
db.getRange("P:P").format.columnWidth = 27;
db.getRange("Q:Q").format.columnWidth = 46;
db.getRange("R:R").format.columnWidth = 13;
db.getRange("S:S").format.columnWidth = 28;
db.getRange("B9:B48").conditionalFormats.add("containsText", { text: "A", format: { fill: "#D9F2E6", font: { bold: true, color: "#176B4D" } } });
db.getRange("B9:B48").conditionalFormats.add("containsText", { text: "B", format: { fill: "#E8F0FA", font: { bold: true, color: "#245A8D" } } });
db.getRange("B9:B48").conditionalFormats.add("containsText", { text: "C", format: { fill: "#F3F4F6", font: { color: "#5B6770" } } });
db.getRange("J9:J48").conditionalFormats.add("cellIs", { operator: "equal", formula: 5, format: { fill: "#FFF0C2", font: { bold: true, color: "#7A4B00" } } });
db.freezePanes.freezeRows(8);
db.freezePanes.freezeColumns(4);

guide.getRange("A2:H2").merge();
guide.getRange("A2").values = [["커리어 뉴스룸 DB 읽기 가이드"]];
guide.getRange("A3:H3").merge();
guide.getRange("A3").values = [["한꺼번에 다 읽기보다, 한 주에 2곳을 골라 ‘문제–근거–결정–결과’ 네 줄로 남기세요."]];
guide.getRange("A5:D5").values = [["이번 주 추천 순서","목적","먼저 볼 사이트","남길 결과"]];
guide.getRange("A6:D10").values = [
  [1,"제품 문제와 실험 방식 익히기","토스 테크 Product · 우아한형제들 기술블로그","제품 사례 1개를 문제–가설–지표로 요약"],
  [2,"BA 요구사항·예외 처리 익히기","뱅크샐러드 기술 블로그 · LG CNS 디지털 AX","현재 업무와 바뀐 업무를 As-is/To-be로 정리"],
  [3,"CRM·고객 데이터 익히기","Salesforce CRM · 토스피드","세그먼트–여정–다음 행동 표 작성"],
  [4,"데이터·운영 문제 익히기","컬리 · 무신사 · NAVER D2","지표 정의와 데이터 품질 위험 3개 기록"],
  [5,"컨설팅식 산업 분석 익히기","삼성SDS · Deloitte · PwC · EY · KPMG","산업 이슈를 현상–원인–선택지로 1쪽 요약"],
];
guide.getRange("A13:H13").values = [["읽기 기록 템플릿","기업","글 제목","해결한 문제","사용한 근거·데이터","내린 결정","결과·한계","내 프로젝트에 적용할 점"]];
guide.getRange("A14:H18").values = Array.from({length:5}, () => ["", "", "", "", "", "", "", ""]);
guide.getRange("A21:D21").values = [["우선순위","뜻","권장 주기","선정 기준"]];
guide.getRange("A22:D24").values = [
  ["A","집중 구독","주 1회","현재 목표 직무와 직접 연결되고 사례가 구체적"],
  ["B","필요할 때 탐색","월 1회","산업·기술 배경을 넓히는 데 유용"],
  ["C","용어·기술 보충","필요 시","비개발자가 협업을 위해 배경지식을 보충할 때 사용"],
];
guide.getRange("A2:H24").format.font = { name: font, size: 10, color: "#1F2937" };
guide.getRange("A2").format.font = { name: font, size: 16, bold: true, color: "#173B57" };
guide.getRange("A3").format.font = { name: font, size: 10, italic: true, color: "#5B6770" };
for (const r of ["A5:D5","A13:H13","A21:D21"]) {
  guide.getRange(r).format = { fill: "#173B57", font: { name: font, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { insideVertical: { style: "thin", color: "#FFFFFF" } } };
}
guide.getRange("A6:D10").format = { verticalAlignment: "top", wrapText: true, borders: { bottom: { style: "thin", color: "#D7E0E5" } } };
guide.getRange("A14:H18").format = { fill: "#FFF8E6", verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: "#E4D7B9" } };
guide.getRange("A22:D24").format = { verticalAlignment: "top", wrapText: true, borders: { bottom: { style: "thin", color: "#D7E0E5" } } };
guide.getRange("A:A").format.columnWidth = 18;
guide.getRange("B:B").format.columnWidth = 22;
guide.getRange("C:C").format.columnWidth = 32;
guide.getRange("D:D").format.columnWidth = 38;
guide.getRange("E:E").format.columnWidth = 25;
guide.getRange("F:F").format.columnWidth = 24;
guide.getRange("G:G").format.columnWidth = 24;
guide.getRange("H:H").format.columnWidth = 28;
guide.getRange("A6:D10").format.rowHeight = 42;
guide.getRange("A14:H18").format.rowHeight = 38;
guide.getRange("A22:D24").format.rowHeight = 34;
guide.freezePanes.freezeRows(5);

workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "커리어 DB!A2:S15", include: "values,formulas", tableMaxRows: 15, tableMaxCols: 19, maxChars: 12000 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const dbPreview = await workbook.render({ sheetName: "커리어 DB", range: "A1:S18", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/career-db-preview.png`, new Uint8Array(await dbPreview.arrayBuffer()));
const guidePreview = await workbook.render({ sheetName: "읽기 가이드", range: "A1:H24", scale: 1.2, format: "png" });
await fs.writeFile(`${outputDir}/career-guide-preview.png`, new Uint8Array(await guidePreview.arrayBuffer()));
await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`SAVED ${outputPath}`);
