import { env } from "cloudflare:workers";

type Obj = Record<string, any>;
const db = () => {
  if (!env.DB) throw new Error("저장소에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  return env.DB;
};
const now = () => new Date().toISOString();
const parse = (text: any, fallback: any = {}) => { try { return JSON.parse(String(text)); } catch { return fallback; } };
const all = async (sql: string, ...args: any[]) => (await db().prepare(sql).bind(...args).all()).results as Obj[];
const first = async (sql: string, ...args: any[]) => await db().prepare(sql).bind(...args).first() as Obj | null;
const run = async (sql: string, ...args: any[]) => await db().prepare(sql).bind(...args).run();
const keyValid = (key: unknown) => typeof key === "string" && /^[0-9a-f]{64}$/.test(key);
export async function keyFor(source: Obj) {
  const identity = String(source.url || `manual:${source.title || ""}`).trim();
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export async function addSnapshot(source: Obj, analysis: Obj) {
  const key = await keyFor(source);
  const captured = source.collected_at || now();
  await run(`INSERT INTO cases(case_key,title,url,source_type,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(case_key) DO UPDATE SET title=excluded.title,url=excluded.url,source_type=excluded.source_type,updated_at=excluded.updated_at`,
    key,String(source.title||"제목 미확인").slice(0,300),String(source.url||"").slice(0,2048),String(source.source_type||"manual").slice(0,30),now());
  const result = await run(`INSERT INTO snapshots(case_key,captured_at,source_json,analysis_json,comment_count,need_keys_json) VALUES(?,?,?,?,?,?)`,
    key,captured,JSON.stringify(source),JSON.stringify(analysis),analysis.comment_count||0,JSON.stringify((analysis.viewer_needs||[]).map((x:Obj)=>x.key)));
  return { case_key:key, snapshot_id:result.meta.last_row_id };
}
export async function listCases() {
  return all(`SELECT c.case_key,c.title,c.url,c.updated_at,COUNT(s.id) AS snapshot_count,MAX(s.id) AS latest_snapshot_id
    FROM cases c LEFT JOIN snapshots s ON s.case_key=c.case_key GROUP BY c.case_key ORDER BY c.updated_at DESC LIMIT 30`);
}
export async function getCase(key: unknown) {
  if (!keyValid(key)) throw new Error("분석 기록 주소가 올바르지 않습니다.");
  const row = await first("SELECT * FROM cases WHERE case_key=?",key);
  if (!row) return null;
  const snaps = await all("SELECT id,captured_at,comment_count,need_keys_json FROM snapshots WHERE case_key=? ORDER BY id DESC",key);
  return { key, title:row.title, url:row.url, source_type:row.source_type, updated_at:row.updated_at,
    brief:parse(row.brief_json), annotations:parse(row.annotations_json), plan:parse(row.plan_json), notes:parse(row.notes_json),
    snapshots:snaps.map(s=>({ id:s.id,captured_at:s.captured_at,comment_count:s.comment_count,need_keys:parse(s.need_keys_json,[]) })) };
}
export async function getSnapshot(id: unknown) {
  const number = Number(id);
  if (!Number.isInteger(number) || number<=0) throw new Error("분석 자료 번호를 확인해 주세요.");
  const row = await first("SELECT * FROM snapshots WHERE id=?",number);
  if (!row) return null;
  return { id:row.id,case_key:row.case_key,captured_at:row.captured_at,source:parse(row.source_json),analysis:parse(row.analysis_json) };
}
export async function saveCase(key: unknown, changes: unknown) {
  if (!keyValid(key) || !changes || typeof changes!=="object" || Array.isArray(changes)) throw new Error("저장할 분석 항목을 확인해 주세요.");
  const entries = Object.entries(changes as Obj);
  if (!entries.length || entries.some(([name,value])=>!["brief","annotations","plan","notes"].includes(name) || !value || typeof value!=="object" || Array.isArray(value) || JSON.stringify(value).length>150000)) throw new Error("저장할 분석 항목을 확인해 주세요.");
  const assignments = entries.map(([name])=>`${name}_json=?`).join(",");
  const result = await run(`UPDATE cases SET ${assignments},updated_at=? WHERE case_key=?`,...entries.map(([,value])=>JSON.stringify(value)),now(),key);
  if (!result.meta.changes) throw new Error("저장할 분석 사례를 찾지 못했습니다.");
  return getCase(key);
}
export async function exportCase(key: unknown) {
  const record = await getCase(key);
  if (!record) return null;
  const ids = await all("SELECT id FROM snapshots WHERE case_key=? ORDER BY id",key);
  const full_snapshots = await Promise.all(ids.map(s=>getSnapshot(s.id)));
  return { ...record, full_snapshots };
}

function formatSession(row: Obj|null): Obj|null {
  if (!row) return null;
  const evidence_ids = parse(row.evidence_ids_json,[]) as string[];
  const seconds = row.finished_at ? Math.max(0,Math.round((Date.parse(row.finished_at)-Date.parse(row.started_at))/1000)) : null;
  const task_complete = new Set(evidence_ids).size>=2 && !!row.counterexample_id && !evidence_ids.includes(row.counterexample_id) && String(row.hypothesis||"").trim().length>=20;
  const within_time = seconds!==null && seconds<=600;
  const unsupported_claim = !!row.unsupported_claim;
  return { ...row,evidence_ids,seconds,task_complete,within_time,unsupported_claim,
    valid_success:row.review_status==="valid" && task_complete && within_time && !unsupported_claim };
}
export async function getSession(id: unknown) {
  if (typeof id!=="string" || !/^[0-9a-f]{32}$/.test(id)) throw new Error("시험 기록 번호가 올바르지 않습니다.");
  return formatSession(await first("SELECT * FROM study_sessions WHERE id=?",id));
}
export async function startSession(variant: unknown, snapshotId: unknown) {
  if (!(["before","after"] as unknown[]).includes(variant)) throw new Error("시험 방식을 확인해 주세요.");
  const snapshot = await getSnapshot(snapshotId);
  if (!snapshot || !Array.isArray(snapshot.analysis.comments) || snapshot.analysis.comments.length<3) throw new Error("댓글이 3개 이상인 분석 자료를 선택해 주세요.");
  const id = crypto.randomUUID().replace(/-/g,"");
  await run("INSERT INTO study_sessions(id,variant,snapshot_id,started_at) VALUES(?,?,?,?)",id,variant,snapshot.id,now());
  return getSession(id);
}
export async function finishSession(id: unknown, evidence: unknown, counter: unknown, hypothesis: unknown) {
  const session = await getSession(id);
  if (!session) throw new Error("시험 기록을 찾지 못했습니다.");
  if (session.finished_at) throw new Error("이미 종료한 시험입니다.");
  if (!Array.isArray(evidence) || evidence.length>2 || evidence.some(x=>typeof x!=="string") || typeof counter!=="string" || typeof hypothesis!=="string" || hypothesis.length>1500) throw new Error("시험 답변 형식을 확인해 주세요.");
  const snapshot = await getSnapshot(session.snapshot_id);
  const allowed = new Set((snapshot?.analysis.comments||[]).map((x:Obj)=>String(x.id)));
  if (evidence.some(x=>!allowed.has(x)) || (counter && !allowed.has(counter))) throw new Error("현재 분석 자료의 댓글만 선택할 수 있습니다.");
  await run("UPDATE study_sessions SET finished_at=?,evidence_ids_json=?,counterexample_id=?,hypothesis=? WHERE id=?",now(),JSON.stringify([...new Set(evidence)]),counter,hypothesis.trim(),id);
  return getSession(id);
}
export async function reviewSession(id: unknown, status: unknown, unsupported: unknown, note: unknown) {
  const session = await getSession(id);
  if (!session || !session.finished_at) throw new Error("종료된 시험 기록을 먼저 확인해 주세요.");
  if (!["pending","valid","invalid"].includes(String(status)) || typeof unsupported!=="boolean" || typeof note!=="string" || note.length>1500) throw new Error("검토 기록 형식을 확인해 주세요.");
  await run("UPDATE study_sessions SET review_status=?,unsupported_claim=?,reviewer_note=? WHERE id=?",status,unsupported?1:0,note.trim(),id);
  return getSession(id);
}
function summary(rows: Obj[]) {
  const cohorts: Obj = {};
  for (const variant of ["before","after"]) {
    const group = rows.filter(r=>r.variant===variant);
    const reviewed = group.filter(r=>r.finished_at && r.review_status!=="pending");
    const durations = reviewed.map(r=>r.seconds).filter((x:number|null)=>x!==null).sort((a:number,b:number)=>a-b);
    const mid = Math.floor(durations.length/2);
    cohorts[variant] = { started:group.length,finished:group.filter(r=>r.finished_at).length,reviewed:reviewed.length,
      success:reviewed.filter(r=>r.valid_success).length,unsupported_claims:reviewed.filter(r=>r.unsupported_claim).length,
      median_seconds:durations.length ? (durations[mid]+durations[Math.floor((durations.length-1)/2)])/2 : null };
  }
  return cohorts;
}
export async function dashboard(snapshotId?: unknown) {
  const id = snapshotId===undefined || snapshotId===null || snapshotId==="" ? null : Number(snapshotId);
  if (id!==null && (!Number.isInteger(id) || id<=0)) throw new Error("비교할 분석 자료를 선택해 주세요.");
  const raw = id===null ? await all("SELECT * FROM study_sessions ORDER BY started_at DESC LIMIT 200") : await all("SELECT * FROM study_sessions WHERE snapshot_id=? ORDER BY started_at DESC LIMIT 200",id);
  const sessions = (raw.map(formatSession).filter(Boolean) as Obj[]);
  for (const row of sessions) {
    const snapshot = await getSnapshot(row.snapshot_id);
    row.source_title = snapshot?.source.title || "자료 미확인";
    const comments = new Map((snapshot?.analysis.comments||[]).map((c:Obj)=>[String(c.id),String(c.text)]));
    row.selected_comments = [...row.evidence_ids,...(row.counterexample_id?[row.counterexample_id]:[])].map((x:string)=>({id:x,text:String(comments.get(x)||"원문 미확인").slice(0,450)}));
  }
  return { sessions,cohorts:summary(sessions),target_per_cohort:5,task_seconds:600,snapshot_id:id,
    task:"10분 안에 댓글 근거 2개와 반례 1개를 골라 20자 이상의 개선 가설을 작성하기",
    change:"제안 카드에서 해당 근거 댓글로 바로 이동하는 버튼" };
}
export async function reportMarkdown(snapshotId?: unknown) {
  const data = await dashboard(snapshotId);
  const source = data.sessions[0]?.source_title || "선택한 자료에 아직 시험 기록 없음";
  const lines = ["# ContextLens 사용성 개선 사례","","## 문제와 변경","",`- 분석 자료: ${source}`,`- 과제: ${data.task}`,`- 변경: ${data.change}`,
    "- 비교 조건: 같은 저장된 분석 자료를 사용하고, 기존 방식은 근거 댓글 바로 이동 버튼을 숨김.","","## 측정 정의","",
    "- 완료: 서로 다른 근거 댓글 2개, 별도 반례 댓글 1개, 20자 이상 개선 가설을 10분 안에 제출하고 검토자가 타당하다고 판정.",
    "- 보조 지표: 종료까지 걸린 시간의 중앙값.","- 품질 점검: 근거 없는 주장을 별도로 표시.","","## 관찰 결과",""];
  for (const [name,group] of [["변경 전",data.cohorts.before],["변경 후",data.cohorts.after]] as const) {
    const rate = group.reviewed ? `${group.success}/${group.started} (시작 기준)` : "아직 없음";
    lines.push(`- ${name}: 시작 ${group.started}명, 완료 ${group.finished}명, 검토 ${group.reviewed}명, 성공 ${rate}, 중앙 소요 시간 ${group.median_seconds===null?"아직 없음":`${group.median_seconds}초`}, 근거 없는 주장 ${group.unsupported_claims}건.`);
  }
  lines.push("","## 참가자 관찰 메모","");
  const notes = data.sessions.filter(r=>r.finished_at && r.reviewer_note);
  if (notes.length) notes.forEach(r=>lines.push(`- ${r.variant==="before"?"변경 전":"변경 후"} · 익명 기록 ${r.id.slice(0,8)}: ${r.reviewer_note}`));
  else lines.push("- 아직 기록된 관찰 메모가 없습니다.");
  lines.push("","## 해석의 한계","","- 검토자가 답변의 타당성을 판단하며, 자동 선택 건수만으로 성공을 확정하지 않는다.",
    "- 각 방식에서 최소 5명씩 검토되기 전에는 비교를 잠정 관찰로만 다룬다.","- 작은 비무작위 표본은 개선 효과의 인과관계를 입증하지 않는다.",
    "- 참가자 이름·연락처는 저장하지 않는다.","");
  return lines.join("\n");
}
