const form = document.querySelector('#brandForm');
const fields = ['name', 'role', 'audience', 'problem', 'method', 'evidence', 'change', 'format'];
const storageKey = 'proofline-draft-v1';
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
