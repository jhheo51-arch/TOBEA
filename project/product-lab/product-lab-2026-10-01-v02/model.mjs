export const stages = ['방문', '강의 상세 보기', '신청 시작', '신청 완료'];
export const sample = [
  {name: '모바일', counts: [840, 504, 126, 63]},
  {name: '데스크톱', counts: [360, 252, 126, 81]}
];
export function validate(rows) {
  if (!Array.isArray(rows) || !rows.length) throw Error('분석할 집단이 필요합니다.');
  for (const row of rows) {
    if (!row || typeof row.name !== 'string' || !row.name.trim() || !Array.isArray(row.counts) || row.counts.length !== 4) throw Error('집단 이름과 네 단계의 인원을 입력해 주세요.');
    row.counts.forEach((n, i) => {
      if (!Number.isSafeInteger(n) || n < 0 || n > 1000000000) throw Error('인원은 0부터 10억까지의 정수로 입력해 주세요.');
      if (i && n > row.counts[i - 1]) throw Error('다음 단계의 인원이 이전 단계보다 클 수 없습니다. 같은 집단의 순서대로 진행한 인원을 입력해 주세요.');
    });
  }
  return rows;
}
export const rate = (a, b) => b ? a / b : null;
export function analyze(rows) {
  validate(rows);
  const counts = stages.map((_, i) => rows.reduce((sum, row) => sum + row.counts[i], 0));
  const transitions = counts.slice(1).map((n, i) => ({from: i, to: i + 1, lost: counts[i] - n, lossRate: rate(counts[i] - n, counts[i]), passRate: rate(n, counts[i])}));
  const largest = transitions.filter(t => t.lossRate !== null).sort((a, b) => b.lost - a.lost)[0] ?? null;
  return {counts, transitions, largest, conversion: rate(counts[3], counts[0])};
}
export function simulate(analysis, step, points) {
  if (!Number.isInteger(step) || step < 0 || step > 2 || !Number.isFinite(points) || points < 0 || points > 100) throw Error('올바른 단계와 증가폭을 선택해 주세요.');
  const transition = analysis.transitions[step];
  if (transition.passRate === null) return null;
  const nextRate = Math.min(1, transition.passRate + points / 100);
  let completed = analysis.counts[step] * nextRate;
  for (let i = step + 1; i < 3; i++) {
    if (analysis.transitions[i].passRate === null) return null;
    completed *= analysis.transitions[i].passRate;
  }
  return {completed, added: completed - analysis.counts[3], nextRate};
}
export function score(impact, confidence, effort) {
  if (![impact, confidence, effort].every(n => Number.isInteger(n) && n >= 1 && n <= 5)) throw Error('평가는 1~5 사이로 입력해 주세요.');
  return impact * confidence / effort;
}
