const form = document.querySelector('#brandForm');
const fields = ['name', 'role', 'audience', 'problem', 'method', 'evidence', 'change', 'format'];
const storageKey = 'proofline-draft-v2';
const demo = {
  name: '김하나', role: '조직문화 기획자', audience: '처음 팀장이 된 사람',
  problem: '팀원과 1:1 대화를 시작하는 일', method: '실제 대화 장면 분석과 질문 설계',
  evidence: '가상 예시: 신임 팀장 12명의 1:1 미팅 준비를 도왔습니다. 실제 개선 효과는 추가 확인이 필요합니다.',
  change: '다음 1:1에 쓸 질문 준비', format: 'session'
};
const formats = {
  session: { title: '첫 1:1 진단 세션', description: '현재 상황을 듣고, 한 번의 대화에서 바로 써볼 수 있는 실행안을 함께 만듭니다.', items: ['사전 질문', '60분 대화', '실행안 1장'] },
  workshop: { title: '소규모 실습 워크숍', description: '같은 문제를 겪는 사람들이 각자의 사례를 가져와 함께 연습합니다.', items: ['사례 수집', '90분 실습', '개인별 다음 행동'] },
  report: { title: '맞춤 진단 리포트', description: '현재 상황과 사례를 검토해 우선 해결할 문제와 실행 순서를 문서로 제안합니다.', items: ['자료 검토', '진단 문서', '설명 미팅'] }
};

function readForm() {
  return Object.fromEntries(fields.map(key => [key, form.elements[key].value.trim()]));
}
function fillForm(values) {
  fields.forEach(key => { form.elements[key].value = values[key] ?? (key === 'format' ? 'session' : ''); });
}
function setText(id, value) { document.getElementById(id).textContent = value; }
function particle(word, kind) {
  const last = word.charCodeAt(word.length - 1);
  const tail = last >= 0xac00 && last <= 0xd7a3 ? (last - 0xac00) % 28 : 0;
  if (kind === 'object') return tail ? '을' : '를';
  return tail && tail !== 8 ? '으로' : '로';
}
function makeBrief(data) {
  const audience = data.audience || '[돕고 싶은 사람]';
  const problem = data.problem || '[그 사람의 문제]';
  const method = data.method || '[나의 해결 방식]';
  const change = data.change || '[기대하는 변화]';
  const offer = formats[data.format] || formats.session;
  const missing = ['audience', 'problem', 'method', 'evidence', 'change'].filter(key => !data[key]);
  return {
    name: data.name || '이름 미입력',
    positioning: `${audience}${particle(audience, 'object')} 위한 ${data.role || '전문가'}: “${problem}”에서 “${change}”까지, ${method}${particle(method, 'instrument')} 돕습니다.`,
    proof: data.evidence || '근거 보강 필요: 실제로 도운 사례, 확인 가능한 결과, 받은 피드백을 적어주세요.',
    offerTitle: `${audience}${particle(audience, 'object')} 위한 ${offer.title}`,
    offerDescription: `${problem}에 초점을 맞춥니다. ${offer.description}`,
    deliverables: offer.items,
    validation: `‘${audience}’ 조건에 맞는 사람 3명에게 “${problem}${particle(problem, 'object')} 지금은 어떻게 해결하시나요?”라고 물어보세요. 답을 듣고 서비스 범위와 비용 지불 의사를 확인해 보세요.`,
    missing
  };
}
function render(brief) {
  setText('previewName', brief.name);
  for (const key of ['positioning', 'proof', 'offerTitle', 'offerDescription', 'validation']) setText(key, brief[key]);
  const list = document.querySelector('#deliverables');
  list.replaceChildren(...brief.deliverables.map(item => {
    const span = document.createElement('span');
    span.textContent = item;
    return span;
  }));
  setText('caution', brief.missing.length
    ? `초안입니다. 빈칸 ${brief.missing.length}개를 채우고, 특히 실제 사례와 기대 변화를 확인해 주세요. 대괄호는 미입력 항목입니다.`
    : '초안입니다. 실제 성과나 구매 의사는 고객 인터뷰로 확인한 뒤 사용해 주세요.');
  setText('status', brief.missing.length ? '보완할 항목 있음' : '초안 완성');
  document.querySelector('#emptyState').hidden = true;
  document.querySelector('#outputContent').hidden = false;
  document.querySelector('#feedback').textContent = '';
  return brief;
}
function asText(brief) {
  return [
    `PROOFLINE | ${brief.name} 브랜드 초안`, '',
    '01. 브랜드 한 문장', brief.positioning, '',
    '02. 믿을 만한 이유', brief.proof, '',
    '03. 첫 서비스 제안', brief.offerTitle, brief.offerDescription,
    `구성: ${brief.deliverables.join(' / ')}`, '',
    '04. 먼저 확인할 질문', brief.validation, '',
    '※ 이 문서는 검토용 초안입니다. 실제 사례와 고객 수요를 확인해 주세요.'
  ].join('\n');
}
let currentBrief = null;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved && typeof saved === 'object') fillForm(saved);
} catch { /* 저장된 값이 손상되었으면 빈 양식으로 시작합니다. */ }

form.addEventListener('input', () => {
  try { localStorage.setItem(storageKey, JSON.stringify(readForm())); } catch { /* 저장이 차단되어도 화면은 사용 가능합니다. */ }
});
form.addEventListener('change', () => {
  try { localStorage.setItem(storageKey, JSON.stringify(readForm())); } catch { /* 위와 같습니다. */ }
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = readForm();
  if (!fields.some(key => key !== 'format' && data[key])) {
    document.querySelector('#feedback').textContent = '먼저 질문 하나 이상에 답하거나 예시 채우기를 눌러주세요.';
    document.querySelector('#outputContent').hidden = false;
    document.querySelector('#emptyState').hidden = true;
    document.querySelector('#outputContent .preview-paper').hidden = true;
    document.querySelector('#outputContent .output-actions').hidden = true;
    return;
  }
  document.querySelector('#outputContent .preview-paper').hidden = false;
  document.querySelector('#outputContent .output-actions').hidden = false;
  currentBrief = render(makeBrief(data));
  if (window.matchMedia('(max-width: 760px)').matches) document.querySelector('#output-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.querySelector('#demoButton').addEventListener('click', () => {
  fillForm(demo);
  form.dispatchEvent(new Event('input'));
  form.requestSubmit();
});
document.querySelector('#resetButton').addEventListener('click', () => {
  fillForm({});
  try { localStorage.removeItem(storageKey); } catch { /* 로컬 저장이 비활성화될 수 있습니다. */ }
  currentBrief = null;
  document.querySelector('#outputContent').hidden = true;
  document.querySelector('#emptyState').hidden = false;
  setText('status', '입력을 기다리는 중');
});
document.querySelector('#copyButton').addEventListener('click', async () => {
  if (!currentBrief) return;
  try {
    await navigator.clipboard.writeText(asText(currentBrief));
    setText('feedback', '내용을 복사했습니다.');
  } catch { setText('feedback', '복사할 수 없습니다. 텍스트 파일 저장을 이용해 주세요.'); }
});
document.querySelector('#downloadButton').addEventListener('click', () => {
  if (!currentBrief) return;
  const blob = new Blob(['\uFEFF', asText(currentBrief)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `proofline-brand-brief-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setText('feedback', '텍스트 파일을 저장했습니다.');
});

const routes = {
  brand: {
    title: '5일 오퍼 설계',
    reason: '기획과 설명 능력을 직접 상품으로 만들 수 있습니다. 실행 인력 없이도 범위를 정해 납품할 수 있어 첫 유료 검증에 적합하다는 가설입니다.',
    items: ['60분 발견 인터뷰 1회', '고객 문제·브랜드 문장 1장', '첫 상품 소개서 1장', '수정 1회'],
    boundary: '로고 제작·광고 집행·매출 보장은 포함하지 않습니다.',
    test: '잠재 고객 5명에게 초안을 보여주고, 2명 이상이 유료 제안을 요청하는지 확인합니다.',
    pitch: '지금까지 해온 일을 고객이 이해하는 첫 서비스로 정리해드립니다. 한 번의 진단 대화 뒤 5일 안에 고객 대상, 소개 문장, 납품 범위를 제안서로 드립니다. 시작 전에 결과물과 수정 범위를 함께 정합니다.'
  },
  marketing: {
    title: '2주 콘텐츠 실험',
    reason: '브랜드 제안이 검증된 고객에게만 짧은 실행을 제안합니다. 매월 대행을 바로 약속하기보다 한 채널과 한 행동을 먼저 확인합니다.',
    items: ['목표 행동 1개 정의', '채널 1개 선택', '콘텐츠 기획 4개', '결과 회고 1회'],
    boundary: '광고비와 제작비는 별도입니다. 조회수나 문의 증가를 보장하지 않습니다.',
    test: '고객과 문의·예약 등 측정할 행동을 먼저 합의하고, 실험 후 재계약 의사를 확인합니다.',
    pitch: '먼저 고객이 실제로 하길 원하는 행동 하나를 정하겠습니다. 한 채널에서 2주 동안 콘텐츠를 시험하고, 무엇이 작동했는지 함께 검토하겠습니다. 광고비와 제작비는 별도로 합의합니다.'
  },
  brokerage: {
    title: '제작 기획·연계',
    reason: '디자인·개발을 직접 수행하기보다 요구사항 정리와 검수에 집중합니다. 신뢰할 파트너와 견적 기준이 생긴 뒤에 판매합니다.',
    items: ['요구사항 문서 1장', '파트너 견적 비교', '일정·수정 범위 합의', '납품 검수 1회'],
    boundary: '제작자, 책임 범위, 지식재산권, 수정·환불 조건을 서면으로 정한 뒤 착수합니다.',
    test: '파트너 2명에게 같은 요구사항으로 견적을 받아 품질·일정·직접비 차이를 확인합니다.',
    pitch: '원하시는 화면이나 디자인을 바로 발주하기 전에 필요한 기능과 우선순위를 한 장으로 정리하겠습니다. 그 기준으로 적합한 제작자와 견적을 비교하고, 일정과 검수 기준을 합의하겠습니다.'
  },
  education: {
    title: '90분 오퍼 설계 워크숍',
    reason: '설명과 상담 역량을 여러 사람에게 한 번에 전달할 수 있습니다. 먼저 개인 상담에서 반복되는 질문을 모아 교육 주제를 좁힙니다.',
    items: ['사전 질문지', '90분 실습', '개인별 오퍼 초안', '후속 질문 1회'],
    boundary: '전문 자격이 필요한 법률·의료·투자 판단은 다루지 않습니다.',
    test: '유료 소규모 1회를 모집해 참석률, 완성한 초안 수, 후속 상담 요청을 확인합니다.',
    pitch: '막연한 브랜딩 강의 대신, 90분 동안 각자의 경험으로 팔 수 있는 서비스 초안을 직접 만듭니다. 끝날 때 고객 대상, 해결할 문제, 첫 상품 범위를 한 장으로 가져가실 수 있습니다.'
  }
};
function showRoute(key) {
  const route = routes[key];
  if (!route) return;
  setText('routeTitle', route.title);
  setText('routeReason', route.reason);
  setText('routeBoundary', route.boundary);
  setText('routeTest', route.test);
  setText('routePitch', route.pitch);
  setText('pitchFeedback', '');
  const list = document.querySelector('#routeItems');
  list.replaceChildren(...route.items.map(item => {
    const li = document.createElement('li');
    li.textContent = item;
    return li;
  }));
  document.querySelectorAll('.route-button').forEach(button => {
    const active = button.dataset.route === key;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
document.querySelectorAll('.route-button').forEach(button => button.addEventListener('click', () => showRoute(button.dataset.route)));
showRoute('brand');
document.querySelector('#copyPitch').addEventListener('click', async () => {
  const content = document.querySelector('#routePitch').textContent;
  try {
    await navigator.clipboard.writeText(content);
    setText('pitchFeedback', '제안 문구를 복사했습니다.');
  } catch { setText('pitchFeedback', '복사할 수 없습니다. 문장을 직접 선택해 복사해 주세요.'); }
});

const cashIds = ['price', 'deposit', 'cost', 'days', 'lag', 'hours'];
function won(value) { return `${Number.isInteger(value) ? value : value.toFixed(1)}만 원`; }
function updateCash() {
  const [price, deposit, cost, days, lag, hours] = cashIds.map(id => Number(document.getElementById(id).value));
  if (cashIds.some(id => document.getElementById(id).value === '') || [price, deposit, cost, days, lag, hours].some(value => !Number.isFinite(value) || value < 0) || deposit > 100 || cost > 100000 || price > 100000 || days > 365 || lag > 365 || hours < 1 || hours > 1000) {
    for (const id of ['depositAmount', 'initialCash', 'contribution', 'collectionDays', 'perHour']) setText(id, '—');
    setText('cashNote', '숫자를 모두 입력해 주세요. 선수금은 0~100%, 대표자 시간은 1시간 이상이어야 합니다.');
    return;
  }
  const paidFirst = price * deposit / 100;
  const initial = paidFirst - cost;
  setText('depositAmount', won(paidFirst));
  setText('initialCash', won(initial));
  setText('contribution', won(price - cost));
  setText('collectionDays', `${days + lag}일`);
  setText('perHour', `${won((price - cost) / hours)}/시간`);
  setText('cashNote', initial < 0 ? '착수 전에 받는 돈보다 먼저 쓰는 돈이 큽니다. 선수금·범위·직접비를 다시 확인해 보세요.' : '착수 전 직접비는 충당됩니다. 실제 현금 잔액은 다른 비용과 지급 일정도 함께 확인해야 합니다.');
}
cashIds.forEach(id => document.getElementById(id).addEventListener('input', updateCash));
updateCash();
