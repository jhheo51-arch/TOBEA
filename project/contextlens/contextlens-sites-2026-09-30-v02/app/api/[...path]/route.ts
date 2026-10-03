import { analyze } from "@/lib/analysis";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { extract } from "@/lib/extract";
import { addSnapshot, abandonSession, dashboard, exportCase, exportProject, finishSession, getCase, getProject, getSession, getSnapshot, listCases, projectHistory, reportMarkdown, reviewSession, saveCase, saveProject, startSession } from "@/lib/store";

export const runtime = "edge";

const answer = (data: unknown, status=200) => Response.json(data, {status,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
const pathFor = (request: Request) => new URL(request.url).pathname.slice(5);
const error = (cause: unknown) => answer({error:cause instanceof Error ? cause.message : "자료를 처리하지 못했습니다. 다시 시도해 주세요."},400);

export async function GET(request: Request) {
  if (!await getChatGPTUser()) return answer({error:"비공개 사이트에 로그인해 주세요."},401);
  const url = new URL(request.url);
  const path = pathFor(request);
  try {
    let data: any;
    if (path==="cases") data = {cases:await listCases()};
    else if (path==="case") data = await getCase(url.searchParams.get("key"));
    else if (path==="snapshot") data = await getSnapshot(url.searchParams.get("id"));
    else if (path==="case/export") data = await exportCase(url.searchParams.get("key"));
    else if (path==="study/session") data = await getSession(url.searchParams.get("id"));
    else if (path==="study/dashboard") data = await dashboard(url.searchParams.get("snapshot_id"));
    else if (path==="study/report") data = {markdown:await reportMarkdown(url.searchParams.get("snapshot_id"))};
    else if (path==="project") data = await getProject(url.searchParams.get("key"));
    else if (path==="project/history") data = {history:await projectHistory(url.searchParams.get("key"))};
    else if (path==="project/report") data = await exportProject(url.searchParams.get("key"));
    else return answer({error:"요청한 기능을 찾지 못했습니다."},404);
    return data===null ? answer({error:"분석 기록을 찾지 못했습니다."},404) : answer(data);
  } catch (cause) { return error(cause); }
}

export async function POST(request: Request) {
  if (!await getChatGPTUser()) return answer({error:"비공개 사이트에 로그인해 주세요."},401);
  const path = pathFor(request);
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return answer({error:"현재 사이트에서만 저장할 수 있습니다."},403);
  if (Number(request.headers.get("content-length")||0)>2_500_000) return answer({error:"입력 자료가 너무 큽니다."},413);
  try {
    const input: Record<string, any> = await request.json();
    if (!input || typeof input!=="object" || Array.isArray(input)) throw new Error("요청 형식을 확인해 주세요.");
    let data: any;
    if (path==="extract") data = await extract(input.url);
    else if (path==="analyze") {
      const source = input.source;
      if (!source || typeof source!=="object" || !Array.isArray(source.comments) || source.comments.length>220 || String(source.body||"").length>120000) throw new Error("분석 가능한 자료 크기를 넘었습니다.");
      data = analyze(source);
      data._storage = await addSnapshot(source,data);
    } else if (path==="case/save") data = await saveCase(input.key,input.changes);
    else if (path==="project/save") data = await saveProject(input.key,input.project,input.revision);
    else if (path==="study/start") data = await startSession(input.variant,input.snapshot_id,input);
    else if (path==="study/finish") data = await finishSession(input.id,input.evidence_ids,input.counterexample_id,input.hypothesis,input.ease_rating);
    else if (path==="study/abandon") data = await abandonSession(input.id,input.observation??'');
    else if (path==="study/review") data = await reviewSession(input.id,input.status,input.unsupported_claim??false,input.note??"");
    else return answer({error:"요청한 기능을 찾지 못했습니다."},404);
    return answer(data);
  } catch (cause) { return error(cause); }
}
