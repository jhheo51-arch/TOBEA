const $ = (id) => document.getElementById(id);
const state = { source: null, analysis: null, shown: 12, caseRecord: null, snapshotId: null };
const NOTE_IDS = ['note-context', 'note-pattern', 'note-improvement', 'note-test'];
const BRIEF_FIELDS = ['customer', 'journey', 'control', 'question'];
const PLAN_FIELDS = ['hypothesis', 'change', 'metric', 'before', 'after', 'status', 'date', 'outcome'];
const CASE_INDEX = 'contextlens:v02:cases';
const VIEWS = {
  source: '원문에서 확인한 내용과 수집 범위를 먼저 살펴보세요.',
  response: '댓글의 반응을 보고, 표본과 언어별 분석 범위를 눌러 확인하세요.',
  ideas: '댓글 작성자가 원하는 것의 후보를 누르면 근거와 다음 제공물을 볼 수 있습니다.',
  evidence: '정렬과 언어를 고른 뒤 원문 댓글을 직접 읽어 보세요.',
  notes: '관찰한 사실, 해석, 다음 시험을 나눠 기록하세요.',
  verification: '개선 가설과 실제 변경·관찰값을 나눠 기록하고 수집 시점을 비교하세요.',
};
let saveTimer;
let recordTimer;

function setView(view, addHistory = false) {
  if (!Object.hasOwn(VIEWS, view)) view = 'source';
  $('results').dataset.view = view;
  $('view-intro').textContent = VIEWS[view];
  document.querySelectorAll('[data-view-button]').forEach(button => {
    if (button.dataset.viewButton === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const url = `${location.pathname}${location.search}#view-${view}`;
  if (addHistory) history.pushState({view}, '', url);
  else history.replaceState({view}, '', url);
}
document.querySelectorAll('[data-view-button]').forEach(button => button.addEventListener('click', () => {
  setView(button.dataset.viewButton, true);
  document.querySelector('.result-nav').scrollIntoView({behavior:'instant',block:'start'});
}));
window.addEventListener('popstate', () => {
  const view = location.hash.startsWith('#view-') ? location.hash.slice(6) : 'source';
  setView(view, false);
});

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function showError(id, message) {
  const node = $(id); node.textContent = message; node.hidden = !message;
}
async function post(path, payload) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '자료를 확인하지 못했습니다.');
  return data;
}
async function get(path) {
  const response = await fetch(path);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '기록을 읽지 못했습니다.');
  return data;
}
function loading(active, title, detail) {
  $('progress').hidden = !active;
  $('analyze-button').disabled = active;
  $('manual-button').disabled = active;
  if (active) { $('progress-title').textContent = title; $('progress-detail').textContent = detail; }
}

async function runSource(source) {
  await flushRecord();
  loading(true, '원문 맥락과 댓글을 비교하고 있습니다', '자동 분류는 사람이 다시 확인할 수 있도록 근거와 함께 표시합니다.');
  const analysis = await post('/api/analyze', { source });
  const record = await get(`/api/case?key=${analysis._storage.case_key}`);
  state.source = source;
  state.analysis = analysis;
  state.caseRecord = record;
  state.snapshotId = analysis._storage.snapshot_id;
  state.shown = 12;
  $('comment-filter').value = 'all';
  $('language-filter').value = 'all';
  render(source, analysis);
  restoreNotes();
  restoreResearch();
  renderSnapshots();
  renderRecent();
  $('results').hidden = false;
  document.body.classList.add('has-result');
  setView('source');
  $('results').scrollIntoView({ behavior:'instant', block:'start' });
}

$('new-analysis').addEventListener('click', () => {
  document.body.classList.remove('has-result');
  $('url-input').focus();
  document.querySelector('.input-card').scrollIntoView({behavior:'instant',block:'start'});
});

async function analyzeUrl(url) {
  showError('form-error', '');
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('공개 http/https 링크를 넣어 주세요.');
  } catch (error) {
    showError('form-error', '올바른 유튜브 또는 뉴스 주소를 입력해 주세요.');
    $('url-input').focus(); return;
  }
  $('results').hidden = true;
  document.body.classList.remove('has-result');
  loading(true, '공개 원문과 댓글을 가져오고 있습니다', '영상 자막과 댓글이 많은 경우 시간이 걸릴 수 있습니다.');
  try {
    const source = await post('/api/extract', { url });
    await runSource(source);
  } catch (error) {
    showError('form-error', error.message);
  } finally { loading(false); }
}
$('url-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  await analyzeUrl($('url-input').value.trim());
});

$('manual-button').addEventListener('click', async () => {
  showError('manual-error', '');
  const title = $('manual-title').value.trim();
  const body = $('manual-body').value.trim();
  const rows = $('manual-comments').value.split(/\r?\n/).map(row => row.trim()).filter(Boolean);
  if (!title || !body || !rows.length) {
    showError('manual-error', '제목, 본문, 댓글을 각각 입력해 주세요.'); return;
  }
  if (rows.length > 100) { showError('manual-error', '댓글은 한 번에 최대 100개까지 분석합니다.'); return; }
  const source = {
    source_type: 'manual', url: $('url-input').value.trim(), title,
    publisher: '직접 입력', published_at: null, description: '', body: body.slice(0, 120000),
    body_kind: '직접 입력한 본문', comments: rows.map((text, index) => ({ id: `manual-${index + 1}`, text: text.slice(0, 2000) })),
    sampling: '사용자가 직접 입력한 댓글', reported_comment_count: null,
    warnings: ['직접 붙여 넣은 자료입니다. 출처와 수집 기준은 사용자가 확인해야 합니다.'],
    collected_at: new Date().toISOString(),
  };
  try { await runSource(source); } catch (error) { showError('manual-error', error.message); } finally { loading(false); }
});

function render(source, result) {
  $('case-title').textContent = source.title || '제목 미확인';
  $('sampling-panel').open = false;
  document.querySelector('.language-panel').open = false;
  document.querySelector('.reaction-panel .compact-details').open = false;
  $('source-title').textContent = source.title || '제목 미확인';
  const published = /^\d{8}$/.test(String(source.published_at || ''))
    ? `${String(source.published_at).slice(0, 4)}.${String(source.published_at).slice(4, 6)}.${String(source.published_at).slice(6, 8)}`
    : source.published_at;
  $('source-meta').textContent = [source.publisher, published, source.sampling].filter(Boolean).join(' · ');
  $('source-badge').textContent = source.source_type === 'youtube' ? 'YOUTUBE' : source.source_type === 'news' ? 'NEWS' : 'DIRECT INPUT';
  $('source-description').textContent = source.description
    ? `소개글 일부: ${source.description.slice(0, 280)}${source.description.length > 280 ? '…' : ''}`
    : '제공된 소개글이 없습니다.';
  $('source-link').hidden = !source.url || !/^https?:\/\//i.test(source.url);
  if (!$('source-link').hidden) $('source-link').href = source.url;
  $('evidence-body').textContent = result.context.available ? `${source.body_kind} · ${result.context.character_count.toLocaleString()}자` : '미확인';
  $('evidence-comments').textContent = `${result.comment_count.toLocaleString()}개${source.reported_comment_count ? ` / 원본 표시 ${Number(source.reported_comment_count).toLocaleString()}개` : ''}`;
  $('evidence-time').textContent = source.collected_at ? new Date(source.collected_at).toLocaleString('ko-KR') : '미확인';
  $('overview-context').textContent = result.context.available ? '본문 확보' : '본문 미확인';
  $('overview-comments').textContent = `${result.comment_count.toLocaleString()}개`; 
  $('overview-review').textContent = `${result.language_summary.review_needed.toLocaleString()}개`;

  $('context-status').textContent = result.context.available ? '본문 확보' : '본문 미확인';
  $('context-basis').textContent = result.context.available ? `분석 근거: ${result.context.basis}. 아래는 자동 추출한 문장으로, 전체 원문을 대신하지 않습니다.` : '제목·설명만으로 내용의 주장을 추정하지 않았습니다.';
  $('context-empty').hidden = result.context.available;
  clear($('source-facts'));
  for (const fact of result.context.facts || []) $('source-facts').appendChild(el('li', '', fact));
  clear($('context-list'));
  for (const line of result.context.highlights) $('context-list').appendChild(el('li', '', line));
  $('context-excerpts').hidden = !result.context.highlights.length;
  $('context-excerpts').open = false;

  $('reaction-count').textContent = `${result.viewer_comment_count}개 ${source.source_type === 'news' ? '독자' : source.source_type === 'youtube' ? '시청자' : '작성자'} 댓글`;
  clear($('type-bars'));
  const order = ['질문형 표현', '불편·문제', '직접 경험', '정보 보완', '의견·반응', '언어 검토 필요', '공지'];
  for (const label of order) {
    const count = result.type_counts[label] || 0;
    if (!count) continue;
    const row = el('div', 'type-row');
    row.appendChild(el('span', 'type-name', label));
    const track = el('div', 'bar-track'); const fill = el('div', 'bar-fill');
    fill.style.width = `${Math.min(100, count / Math.max(result.comment_count, 1) * 100)}%`;
    track.appendChild(fill); row.appendChild(track); row.appendChild(el('span', 'bar-count', String(count)));
    $('type-bars').appendChild(row);
  }
  if (!result.comment_count) $('type-bars').appendChild(el('p', 'no-data', '분석할 댓글이 없습니다.'));
  clear($('themes'));
  for (const theme of result.themes) {
    const item = el('div', 'theme');
    item.appendChild(el('strong', '', theme.term));
    item.appendChild(el('span', '', `${theme.count}개 댓글 · 자동 분석 대상 ${result.theme_denominator}개 중 ${theme.share_of_sample}%`));
    item.appendChild(el('p', '', theme.interpretation));
    $('themes').appendChild(item);
  }
  if (!result.themes.length) $('themes').appendChild(el('p', 'no-data', '현재 표본에서 두 번 이상 반복된 표현을 찾지 못했습니다.'));

  renderSampling(result);
  renderLanguages(result);
  renderCX(result);
  $('insight-panel').hidden = source.source_type === 'youtube';
  clear($('candidates'));
  const suggestions = result.improvement_candidates.length ? result.improvement_candidates : ['본문과 댓글이 모두 확보되어야 개선할 문제 후보를 제안할 수 있습니다.'];
  suggestions.forEach((text, index) => {
    const card = el('div', 'candidate'); card.appendChild(el('div', 'candidate-number', String(index + 1).padStart(2, '0')));
    card.appendChild(el('div', '', text)); $('candidates').appendChild(card);
  });
  $('comment-filter').disabled = source.source_type !== 'youtube';
  renderComments();
  clear($('limitations'));
  result.limitations.forEach(line => $('limitations').appendChild(el('li', '', line)));
}

function renderSampling(result) {
  const youtube = state.source.source_type === 'youtube';
  $('sampling-panel').hidden = !youtube;
  if (!youtube) return;
  const s = result.sampling_summary;
  clear($('sampling-stats'));
  for (const [name, count] of [['최신순', s.latest], ['인기순', s.popular], ['두 정렬에 모두', s.overlap], ['고유 댓글', s.unique], ['공지·운영자', result.notice_count]]) {
    const box = el('div', 'sample-stat');
    box.appendChild(el('strong', '', `${count}개`));
    box.appendChild(el('span', '', name));
    $('sampling-stats').appendChild(box);
  }
}

function renderLanguages(result) {
  const summary = result.language_summary;
  const labels = {ko:'한국어 단서', en:'영어 단서', ko_en:'한국어·영어 혼합', ja:'일본어 문자', han:'한자 문자·언어 미확인', latin:'라틴 문자·언어 미확인', other:'기타 문자', und:'문자 단서 부족'};
  clear($('language-stats'));
  for (const [code, count] of Object.entries(summary.counts)) {
    const item = el('div', 'language-stat');
    item.appendChild(el('strong', '', `${count}개`));
    item.appendChild(el('span', '', labels[code] || code));
    $('language-stats').appendChild(item);
  }
  if (!summary.viewer_total) $('language-stats').appendChild(el('p', 'no-data', '댓글이 없습니다.'));
  $('language-scope').textContent = `공지 제외 ${summary.viewer_total}개 중 자동 분류 대상 ${summary.covered}개, 직접 검토 필요 ${summary.review_needed}개입니다. 욕구 카드와 반복 표현의 건수는 자동 분류 대상에서만 계산했습니다.`;
  $('language-summary-short').textContent = `자동 분류 ${summary.covered}개 · 직접 검토 ${summary.review_needed}개`;
}

function renderCX(result) {
  const audience = state.source.source_type === 'news' ? '독자' : state.source.source_type === 'youtube' ? '시청자' : '댓글 작성자';
  $('cx-title').textContent = `${audience}가 원하는 것과 다음에 제공할 것`;
  $('cx-intro').textContent = `수집한 댓글에서 ${audience}의 욕구 후보를 찾았습니다. 제안은 실험 가설이며, 원문에서 확인한 사실과 구분해 주세요.`;
  $('cx-language-warning').hidden = !result.language_summary.priority_review_needed;
  clear($('cx-needs'));
  if (!result.viewer_needs.length) {
    $('cx-needs').appendChild(el('p', 'no-data', '반복된 욕구 후보를 찾지 못했습니다. 댓글 원문을 직접 확인해 주세요.'));
    return;
  }
  for (const need of result.viewer_needs) {
    const card = el('details', 'need-card');
    const summary = el('summary', 'need-summary');
    summary.appendChild(el('span', 'need-title', need.label));
    const countText = state.source.source_type === 'youtube'
      ? `관련 표현 ${need.count}개 · 최신순 ${need.latest_count}개 · 인기순 ${need.popular_count}개`
      : `수집 댓글에서 관련 표현 ${need.count}개`;
    summary.appendChild(el('span', 'need-count', countText));
    card.appendChild(summary);
    const columns = el('div', 'need-columns');
    const want = el('div');
    want.appendChild(el('strong', '', `${audience}가 원하는 것 · 해석 후보`));
    want.appendChild(el('p', '', need.possible_need));
    const offer = el('div');
    offer.appendChild(el('strong', '', '다음에 제공할 것 · 실험 제안'));
    offer.appendChild(el('p', '', need.offer));
    columns.append(want, offer); card.appendChild(columns);
    card.appendChild(el('p', 'need-metric', `확인 방법: ${need.metric}`));
    if (need.caveat) card.appendChild(el('p', 'need-caveat', need.caveat));
    const examples = el('details', 'need-examples');
    examples.appendChild(el('summary', '', `근거 댓글 ${need.example_ids.length}개 보기`));
    for (const id of need.example_ids) {
      const comment = result.comments.find(item => item.id === id);
      if (comment) examples.appendChild(el('p', '', comment.text.slice(0, 220) + (comment.text.length > 220 ? '…' : '')));
    }
    card.appendChild(examples);
    const planButton = el('button', 'secondary-button need-plan-button', '검증 계획에 담기');
    planButton.type = 'button';
    planButton.addEventListener('click', () => {
      if (!$('plan-hypothesis').value.trim()) $('plan-hypothesis').value = need.possible_need;
      if (!$('plan-change').value.trim()) $('plan-change').value = need.offer;
      if (!$('plan-metric').value.trim()) $('plan-metric').value = need.metric;
      scheduleRecordSave();
      setView('verification', true);
      document.querySelector('.result-nav').scrollIntoView({behavior:'instant',block:'start'});
    });
    card.appendChild(planButton);
    $('cx-needs').appendChild(card);
  }
}

function renderComments() {
  const result = state.analysis;
  if (!result) return;
  const filter = $('comment-filter').value;
  const language = $('language-filter').value;
  const selected = result.comments.filter(comment =>
    (filter === 'all' || comment.sorts.includes(filter)) &&
    (language === 'all' || (language === 'review' ? !comment.language_supported && !comment.is_notice : comment.language_code === language))
  );
  clear($('comments-list'));
  const shown = selected.slice(0, state.shown);
  $('comments-shown').textContent = selected.length ? `${shown.length} / ${selected.length}개 표시` : '자료 없음';
  shown.forEach((comment, index) => {
    const annotation = state.caseRecord?.annotations?.[comment.id] || {};
    const card = el('article', 'comment'); const head = el('div', 'comment-head');
    head.appendChild(el('span', 'comment-id', `#${String(index + 1).padStart(2, '0')}`));
    for (const sort of comment.sorts) head.appendChild(el('span', 'comment-sort', sort === 'latest' ? '최신순' : '인기순'));
    head.appendChild(el('span', `language-badge ${comment.language_supported ? '' : 'needs-review'}`, comment.language_label));
    comment.labels.forEach(label => head.appendChild(el('span', 'comment-label', label)));
    if (annotation.verdict && annotation.verdict !== 'none') head.appendChild(el('span', 'review-badge', {evidence:'근거',counterexample:'반례',irrelevant:'관련 낮음'}[annotation.verdict]));
    if (annotation.category && annotation.category !== 'auto') head.appendChild(el('span', 'review-badge', `수정: ${annotation.category}`));
    card.appendChild(head); card.appendChild(el('p', '', comment.text));
    card.appendChild(el('small', '', `원문 공통 단어: ${comment.context_terms.length ? comment.context_terms.join(', ') : '없음'} · 의미 연결 여부는 직접 확인`));
    const review = el('details', 'comment-review');
    review.appendChild(el('summary', '', '직접 검토·분류 수정'));
    const form = el('div', 'comment-review-fields');
    const verdictLabel = el('label', '', '이 댓글의 역할');
    const verdict = el('select');
    [['none','아직 판단 안 함'],['evidence','가설의 근거'],['counterexample','가설의 반례'],['irrelevant','관련 낮음']].forEach(([value,label]) => { const option = el('option','',label); option.value=value; verdict.appendChild(option); });
    verdict.value = annotation.verdict || 'none'; verdictLabel.appendChild(verdict);
    const categoryLabel = el('label', '', '자동 분류를 수정');
    const category = el('select');
    const categories = ['auto','질문형 표현','불편·문제','직접 경험','정보 보완','의견·반응','언어 검토 필요','공지','기타'];
    categories.forEach(value => { const option=el('option','',value==='auto'?'자동 분류 유지':value); option.value=value; category.appendChild(option); });
    category.value = annotation.category || 'auto'; categoryLabel.appendChild(category);
    const reasonLabel = el('label', '', '판단 근거');
    const reason = el('textarea'); reason.rows=2; reason.maxLength=1000; reason.placeholder='어떤 맥락 때문에 이렇게 판단했나요?'; reason.value=annotation.reason || ''; reasonLabel.appendChild(reason);
    const update = () => {
      if (!state.caseRecord) return;
      const value = {verdict:verdict.value,category:category.value,reason:reason.value.trim()};
      if (value.verdict==='none' && value.category==='auto' && !value.reason) delete state.caseRecord.annotations[comment.id];
      else state.caseRecord.annotations[comment.id]=value;
      scheduleRecordSave(); updateReviewSummary();
      head.querySelectorAll('.review-badge').forEach(node => node.remove());
      if (value.verdict!=='none') head.appendChild(el('span','review-badge',{evidence:'근거',counterexample:'반례',irrelevant:'관련 낮음'}[value.verdict]));
      if (value.category!=='auto') head.appendChild(el('span','review-badge',`수정: ${value.category}`));
    };
    verdict.addEventListener('change',update); category.addEventListener('change',update); reason.addEventListener('input',update);
    form.append(verdictLabel,categoryLabel,reasonLabel); review.appendChild(form); card.appendChild(review);
    $('comments-list').appendChild(card);
  });
  updateReviewSummary();
  if (!shown.length) $('comments-list').appendChild(el('p', 'no-data', '가져온 댓글이 없습니다.'));
  const remaining = Math.min(12, selected.length - shown.length);
  $('more-comments').textContent = `댓글 ${remaining}개 더 보기`;
  $('more-comments').hidden = !remaining;
}
function updateReviewSummary() {
  const values = Object.values(state.caseRecord?.annotations || {});
  const evidence = values.filter(item=>item.verdict==='evidence').length;
  const counter = values.filter(item=>item.verdict==='counterexample').length;
  const corrected = values.filter(item=>item.category && item.category!=='auto').length;
  $('review-summary').textContent = values.length ? `직접 검토 ${values.length}개 · 근거 ${evidence}개 · 반례 ${counter}개 · 분류 수정 ${corrected}개` : '아직 검토 표시가 없습니다.';
}
$('comment-filter').addEventListener('change', () => { state.shown = 12; renderComments(); });
$('language-filter').addEventListener('change', () => { state.shown = 12; renderComments(); });
$('more-comments').addEventListener('click', () => { state.shown += 12; renderComments(); });

function saveFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function baseName() {
  const when = new Date().toISOString().slice(0, 10);
  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(11, 17);
  return `contextlens-${when}-${stamp}`;
}
function reviewNotes() {
  return {
    confirmed_context: $('note-context').value.trim(),
    patterns_and_counterexamples: $('note-pattern').value.trim(),
    improvement_hypothesis: $('note-improvement').value.trim(),
    next_validation: $('note-test').value.trim(),
  };
}
function noteKey() {
  if (!state.source) return '';
  return `contextlens:v02:note:${encodeURIComponent(state.source.url || `manual:${state.source.title}`)}`;
}
function restoreNotes() {
  for (const id of NOTE_IDS) $(id).value = '';
  if (state.caseRecord?.notes && Object.values(state.caseRecord.notes).some(Boolean)) {
    for (const id of NOTE_IDS) $(id).value = state.caseRecord.notes[id] || '';
    $('note-status').textContent = '기록 불러옴';
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(noteKey()) || 'null');
    if (saved?.notes) {
      for (const id of NOTE_IDS) $(id).value = saved.notes[id] || '';
      $('note-status').textContent = '이전 메모 불러옴 · 통합 저장 중';
      scheduleRecordSave();
    } else $('note-status').textContent = '메모를 입력해 주세요';
  } catch { $('note-status').textContent = '브라우저 저장을 사용할 수 없습니다'; }
}
async function renderRecent() {
  try {
    const data = await get('/api/cases');
    clear($('recent-list'));
    for (const item of data.cases.slice(0, 8)) {
      const button = el('button', 'recent-button', item.title || item.url);
      button.type = 'button';
      button.title = `${item.snapshot_count}회 수집 · ${new Date(item.updated_at).toLocaleString('ko-KR')}`;
      button.addEventListener('click', () => openSnapshot(item.latest_snapshot_id));
      $('recent-list').appendChild(button);
    }
    $('recent-cases').hidden = !$('recent-list').children.length;
  } catch { $('recent-cases').hidden = true; }
}
function saveNotesLocal() {
  if (!state.source) return;
  try {
    const notes = Object.fromEntries(NOTE_IDS.map(id => [id, $(id).value]));
    const item = { title: state.source.title, url: state.source.url, updated_at: new Date().toISOString(), notes };
    localStorage.setItem(noteKey(), JSON.stringify(item));
    const old = JSON.parse(localStorage.getItem(CASE_INDEX) || '[]');
    const cases = [item, ...old.filter(previous => previous.url !== item.url)].slice(0, 20)
      .map(({ title, url, updated_at }) => ({ title, url, updated_at }));
    localStorage.setItem(CASE_INDEX, JSON.stringify(cases));
    $('note-status').textContent = `브라우저에 저장됨 · ${new Date().toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'})}`;
    renderRecent();
  } catch { $('note-status').textContent = '저장 실패 · 자료 저장을 이용해 주세요'; }
}
for (const id of NOTE_IDS) $(id).addEventListener('input', () => {
  $('note-status').textContent = '저장 중';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNotesLocal, 350);
  scheduleRecordSave();
});
function fieldValues(prefix, names) { return Object.fromEntries(names.map(name => [name, $(`${prefix}-${name}`).value.trim()])); }
function restoreResearch() {
  for (const name of BRIEF_FIELDS) $(`brief-${name}`).value = state.caseRecord?.brief?.[name] || '';
  for (const name of PLAN_FIELDS) $(`plan-${name}`).value = state.caseRecord?.plan?.[name] || (name==='status'?'not_started':'');
  $('case-save-status').textContent = '기록 준비됨';
}
function scheduleRecordSave() {
  if (!state.caseRecord) return;
  $('case-save-status').textContent = '저장 중';
  clearTimeout(recordTimer);
  recordTimer = setTimeout(() => { flushRecord(); }, 550);
}
async function flushRecord() {
  clearTimeout(recordTimer); recordTimer = null;
  clearTimeout(saveTimer); saveTimer = null;
  if (!state.caseRecord) return;
  const key = state.caseRecord.key;
  const changes = {
    brief: fieldValues('brief',BRIEF_FIELDS),
    plan: fieldValues('plan',PLAN_FIELDS),
    annotations: state.caseRecord.annotations || {},
    notes: Object.fromEntries(NOTE_IDS.map(id=>[id,$(id).value])),
  };
  try {
    await post('/api/case/save',{key,changes});
    if (state.caseRecord?.key===key) {
      Object.assign(state.caseRecord,changes);
      $('case-save-status').textContent = '기록 저장됨';
      $('note-status').textContent = '기록 저장됨';
    }
  } catch (error) { $('case-save-status').textContent = `저장 실패: ${error.message}`; }
}
for (const name of BRIEF_FIELDS) $(`brief-${name}`).addEventListener('input',scheduleRecordSave);
for (const name of PLAN_FIELDS) $(`plan-${name}`).addEventListener(name==='status'||name==='date'?'change':'input',scheduleRecordSave);
async function openSnapshot(id) {
  try {
    await flushRecord();
    const snapshot = await get(`/api/snapshot?id=${id}`);
    const record = await get(`/api/case?key=${snapshot.case_key}`);
    state.source=snapshot.source; state.analysis=snapshot.analysis;
    state.caseRecord=record; state.snapshotId=snapshot.id; state.shown=12;
    $('comment-filter').value='all'; $('language-filter').value='all';
    render(state.source,state.analysis); restoreNotes(); restoreResearch(); renderSnapshots();
    $('results').hidden=false; document.body.classList.add('has-result'); setView('source');
    $('results').scrollIntoView({behavior:'instant',block:'start'});
  } catch (error) { showError('form-error',error.message); document.body.classList.remove('has-result'); }
}
function renderSnapshots() {
  const snapshots=state.caseRecord?.snapshots || [];
  const select=$('compare-snapshot'); clear(select);
  const other=snapshots.filter(item=>item.id!==state.snapshotId);
  const empty=el('option','',other.length?'수집 시점 선택':'비교할 다른 시점 없음'); empty.value=''; select.appendChild(empty);
  other.forEach(item=>{ const option=el('option','',`${new Date(item.captured_at).toLocaleString('ko-KR')} · 댓글 ${item.comment_count}개`); option.value=item.id; select.appendChild(option); });
  clear($('snapshot-list'));
  for (const item of snapshots) {
    const button=el('button','snapshot-button',`${item.id===state.snapshotId?'현재 · ':''}${new Date(item.captured_at).toLocaleString('ko-KR')} · 댓글 ${item.comment_count}개`);
    button.type='button'; button.disabled=item.id===state.snapshotId; button.addEventListener('click',()=>openSnapshot(item.id)); $('snapshot-list').appendChild(button);
  }
  $('compare-summary').textContent=other.length?'비교할 이전 수집 시점을 고르세요.':'같은 링크를 다시 분석하면 두 시점의 표본을 비교할 수 있습니다.';
}
$('compare-snapshot').addEventListener('change',async()=>{
  const id=$('compare-snapshot').value; if (!id) return;
  try {
    const older=await get(`/api/snapshot?id=${id}`);
    const current=state.analysis;
    const currentIds=new Set(current.comments.map(item=>item.id));
    const overlap=older.analysis.comments.filter(item=>currentIds.has(item.id)).length;
    const before=new Set(older.analysis.viewer_needs.map(item=>item.key));
    const after=new Set(current.viewer_needs.map(item=>item.key));
    const shared=[...after].filter(key=>before.has(key)).length;
    $('compare-summary').textContent=`선택 시점 댓글 ${older.analysis.comment_count}개 → 현재 ${current.comment_count}개 · 같은 댓글 ${overlap}개 · 양쪽에 나타난 욕구 후보 ${shared}개. 수집 표본이 달라진 결과일 수 있으므로 개선 효과로 단정할 수 없습니다.`;
  } catch(error) { $('compare-summary').textContent=error.message; }
});
renderRecent();
$('download-json').addEventListener('click', async () => {
  if (!state.source || !state.analysis) return;
  await flushRecord();
  try {
    const bundle=await get(`/api/case/export?key=${state.caseRecord.key}`);
    saveFile(`${baseName()}.json`, 'application/json;charset=utf-8', JSON.stringify(bundle,null,2));
  } catch(error) { $('case-save-status').textContent=`자료 저장 실패: ${error.message}`; }
});
$('download-md').addEventListener('click', async () => {
  if (!state.source || !state.analysis) return;
  await flushRecord();
  const s = state.source, a = state.analysis;
  const notes = reviewNotes();
  const lines = [
    `# ${s.title}`, '', `- 출처: ${s.url || '직접 입력'}`, `- 수집 시각: ${s.collected_at}`,
    `- 본문: ${a.context.available ? s.body_kind : '미확인'}`, `- 분석 댓글: ${a.comment_count}개`,
    `- 수집 기준: ${s.sampling}`, '', '## 원문에서 확인한 단서', '',
    ...(a.context.facts.length ? a.context.facts.map(line => `- ${line}`) : ['- 별도 구조 단서 없음']),
    '', '## 원문 맥락에서 추출한 문장', '',
    ...(a.context.highlights.length ? a.context.highlights.map(line => `- ${line}`) : ['- 확인 불가']),
    '', '## 반복 표현', '',
    ...(a.themes.length ? a.themes.map(t => `- ${t.term}: ${t.count}/${a.comment_count}개 댓글 (${t.share_of_sample}%). 같은 문제인지는 수동 검토 필요.`) : ['- 확인된 반복 표현 없음']),
    '', '## 수집 표본', '',
    `- 최신순 ${a.sampling_summary.latest}개 · 인기순 ${a.sampling_summary.popular}개 · 겹침 ${a.sampling_summary.overlap}개 · 고유 댓글 ${a.sampling_summary.unique}개 · 공지 ${a.notice_count}개`,
    '', '## 댓글 언어 단서와 분석 범위', '',
    `- 자동 분류 대상 ${a.language_summary.covered}개 / 공지 제외 ${a.language_summary.viewer_total}개 · 직접 검토 필요 ${a.language_summary.review_needed}개`,
    ...Object.entries(a.language_summary.counts).map(([code, count]) => `- ${code}: ${count}개`),
    '', '## 댓글 작성자가 원하는 것과 다음에 제공할 것', '',
    ...(a.viewer_needs.length ? a.viewer_needs.map(n => `- **${n.possible_need}**: 관련 댓글 ${n.count}개 (최신순 ${n.latest_count}, 인기순 ${n.popular_count}). 제안: ${n.offer} 확인: ${n.metric}${n.caveat ? ` 주의: ${n.caveat}` : ''}`) : ['- 반복된 욕구 후보 없음']),
    ...(a.improvement_candidates.length ? ['', '## 개선할 문제 후보', '', ...a.improvement_candidates.map(line => `- ${line}`)] : []),
    '', '## 분석의 출발점', '', ...BRIEF_FIELDS.map(name=>`- ${name}: ${state.caseRecord?.brief?.[name] || '미작성'}`),
    '', '## 직접 검토한 댓글', '', ...Object.entries(state.caseRecord?.annotations || {}).map(([id,value])=>`- ${id}: ${value.verdict || '미정'} / ${value.category || '자동 분류'} / ${value.reason || '근거 미작성'}`),
    '', '## 내 판단', '',
    `- 원문에서 확인한 핵심: ${notes.confirmed_context || '미작성'}`,
    `- 반복 문제와 반례: ${notes.patterns_and_counterexamples || '미작성'}`,
    `- 개선 가설: ${notes.improvement_hypothesis || '미작성'}`,
    `- 다음 확인 방법: ${notes.next_validation || '미작성'}`,
    '', '## 개선 검증 기록', '', ...PLAN_FIELDS.map(name=>`- ${name}: ${state.caseRecord?.plan?.[name] || '미작성'}`),
    '', '## 수집 시점', '', ...(state.caseRecord?.snapshots || []).map(item=>`- ${item.captured_at}: 댓글 ${item.comment_count}개`),
    '', '## 해석의 한계', '', ...a.limitations.map(line => `- ${line}`), '',
  ];
  saveFile(`${baseName()}.md`, 'text/markdown;charset=utf-8', lines.join('\n'));
});
