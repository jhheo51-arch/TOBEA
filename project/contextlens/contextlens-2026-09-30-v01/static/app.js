const $ = (id) => document.getElementById(id);
const state = { source: null, analysis: null };

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
function loading(active, title, detail) {
  $('progress').hidden = !active;
  $('analyze-button').disabled = active;
  $('manual-button').disabled = active;
  if (active) { $('progress-title').textContent = title; $('progress-detail').textContent = detail; }
}

async function runSource(source) {
  state.source = source;
  for (const id of ['note-context', 'note-pattern', 'note-improvement', 'note-test']) $(id).value = '';
  loading(true, '원문 맥락과 댓글을 비교하고 있습니다', '자동 분류는 사람이 다시 확인할 수 있도록 근거와 함께 표시합니다.');
  const analysis = await post('/api/analyze', { source });
  state.analysis = analysis;
  render(source, analysis);
  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}

$('url-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('form-error', '');
  const url = $('url-input').value.trim();
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('공개 http/https 링크를 넣어 주세요.');
  } catch (error) {
    showError('form-error', '올바른 유튜브 또는 뉴스 주소를 입력해 주세요.');
    $('url-input').focus(); return;
  }
  $('results').hidden = true;
  loading(true, '공개 원문과 댓글을 가져오고 있습니다', '영상 자막과 댓글이 많은 경우 시간이 걸릴 수 있습니다.');
  try {
    const source = await post('/api/extract', { url });
    await runSource(source);
  } catch (error) {
    showError('form-error', error.message);
  } finally { loading(false); }
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

  $('context-status').textContent = result.context.available ? '본문 확보' : '본문 미확인';
  $('context-basis').textContent = result.context.available ? `분석 근거: ${result.context.basis}. 아래는 자동 추출한 문장으로, 전체 원문을 대신하지 않습니다.` : '제목·설명만으로 내용의 주장을 추정하지 않았습니다.';
  $('context-empty').hidden = result.context.available;
  clear($('context-list'));
  for (const line of result.context.highlights) $('context-list').appendChild(el('li', '', line));

  $('reaction-count').textContent = `${result.comment_count}개 검토`;
  clear($('type-bars'));
  const order = ['질문', '불편·문제', '직접 경험', '정보 보완', '의견·반응'];
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
    item.appendChild(el('span', '', `${theme.count}개 댓글 · 수집 댓글의 ${theme.share_of_sample}%`));
    item.appendChild(el('p', '', theme.interpretation));
    $('themes').appendChild(item);
  }
  if (!result.themes.length) $('themes').appendChild(el('p', 'no-data', '현재 표본에서 두 번 이상 반복된 표현을 찾지 못했습니다.'));

  clear($('candidates'));
  const suggestions = result.improvement_candidates.length ? result.improvement_candidates : ['본문과 댓글이 모두 확보되어야 개선할 문제 후보를 제안할 수 있습니다.'];
  suggestions.forEach((text, index) => {
    const card = el('div', 'candidate'); card.appendChild(el('div', 'candidate-number', String(index + 1).padStart(2, '0')));
    card.appendChild(el('div', '', text)); $('candidates').appendChild(card);
  });
  clear($('comments-list'));
  const shown = result.comments.slice(0, 40);
  $('comments-shown').textContent = result.comment_count ? `${shown.length} / ${result.comment_count}개 표시` : '자료 없음';
  shown.forEach((comment, index) => {
    const card = el('article', 'comment'); const head = el('div', 'comment-head');
    head.appendChild(el('span', 'comment-id', `#${String(index + 1).padStart(2, '0')}`));
    comment.labels.forEach(label => head.appendChild(el('span', 'comment-label', label)));
    card.appendChild(head); card.appendChild(el('p', '', comment.text));
    card.appendChild(el('small', '', `원문 연결: ${comment.context_link}${comment.context_terms.length ? ` · 겹친 표현 ${comment.context_terms.join(', ')}` : ''}`));
    $('comments-list').appendChild(card);
  });
  if (!shown.length) $('comments-list').appendChild(el('p', 'no-data', '가져온 댓글이 없습니다.'));
  clear($('limitations'));
  result.limitations.forEach(line => $('limitations').appendChild(el('li', '', line)));
}

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
$('download-json').addEventListener('click', () => {
  if (!state.source || !state.analysis) return;
  saveFile(`${baseName()}.json`, 'application/json;charset=utf-8', JSON.stringify({ source: state.source, analysis: state.analysis, review_notes: reviewNotes() }, null, 2));
});
$('download-md').addEventListener('click', () => {
  if (!state.source || !state.analysis) return;
  const s = state.source, a = state.analysis;
  const notes = reviewNotes();
  const lines = [
    `# ${s.title}`, '', `- 출처: ${s.url || '직접 입력'}`, `- 수집 시각: ${s.collected_at}`,
    `- 본문: ${a.context.available ? s.body_kind : '미확인'}`, `- 분석 댓글: ${a.comment_count}개`,
    `- 수집 기준: ${s.sampling}`, '', '## 원문 맥락에서 추출한 문장', '',
    ...(a.context.highlights.length ? a.context.highlights.map(line => `- ${line}`) : ['- 확인 불가']),
    '', '## 반복 표현', '',
    ...(a.themes.length ? a.themes.map(t => `- ${t.term}: ${t.count}/${a.comment_count}개 댓글 (${t.share_of_sample}%). 같은 문제인지는 수동 검토 필요.`) : ['- 확인된 반복 표현 없음']),
    '', '## 개선할 문제 후보', '',
    ...(a.improvement_candidates.length ? a.improvement_candidates.map(line => `- ${line}`) : ['- 본문과 댓글 자료 부족']),
    '', '## 내 판단', '',
    `- 원문에서 확인한 핵심: ${notes.confirmed_context || '미작성'}`,
    `- 반복 문제와 반례: ${notes.patterns_and_counterexamples || '미작성'}`,
    `- 개선 가설: ${notes.improvement_hypothesis || '미작성'}`,
    `- 다음 확인 방법: ${notes.next_validation || '미작성'}`,
    '', '## 해석의 한계', '', ...a.limitations.map(line => `- ${line}`), '',
  ];
  saveFile(`${baseName()}.md`, 'text/markdown;charset=utf-8', lines.join('\n'));
});
