type Source = Record<string, any>;
const now = () => new Date().toISOString();

function publicUrl(value: unknown): URL {
  if (typeof value !== "string" || value.length > 2048) throw new Error("공개 링크를 확인해 주세요.");
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("올바른 주소를 입력해 주세요."); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || !url.hostname) throw new Error("공개 http/https 주소를 입력해 주세요.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":") || host === "0.0.0.0") throw new Error("공개 인터넷 주소만 분석할 수 있습니다.");
  return url;
}

async function read(url: string, limit = 3_000_000): Promise<{ text: string; url: string; type: string }> {
  let current = publicUrl(url);
  for (let hop=0; hop<4; hop++) {
    const response = await fetch(current.toString(), { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; ContextLens/1.0)", "accept": "text/html,application/json,text/vtt,*/*;q=0.5" }, signal: AbortSignal.timeout(16000) });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("주소 이동을 확인하지 못했습니다.");
      current = publicUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(response.status === 403 || response.status === 401 ? "이 사이트가 자동 읽기를 허용하지 않습니다. 직접 붙여 넣기를 사용해 주세요." : `페이지를 읽지 못했습니다 (HTTP ${response.status}).`);
    const text = await response.text();
    if (text.length > limit) throw new Error("페이지가 너무 커서 읽기를 중단했습니다.");
    return { text, url: current.toString(), type: response.headers.get("content-type") || "" };
  }
  throw new Error("주소가 여러 번 이동해 읽기를 중단했습니다.");
}

const unescape = (text: string) => text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, x => ({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":"\"","&#39;":"'","&nbsp;":" "})[x] || x);
const plain = (html: string) => unescape(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
function meta(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*(?:property|name)=["']${escaped}["'])[^>]*>`,"i"))?.[0];
  return tag ? unescape(tag.match(/content=["']([^"']*)["']/i)?.[1] || "") : "";
}
function videoId(url: URL) {
  const host = url.hostname.toLowerCase();
  let id = "";
  if (["youtu.be","www.youtu.be"].includes(host)) id = url.pathname.split("/")[1] || "";
  if (["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com"].includes(host)) id = url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1] || "";
  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : "";
}
function findObjects(root: any, key: string, output: any[] = [], depth=0): any[] {
  if (!root || typeof root !== "object" || depth > 80 || output.length > 1000) return output;
  if (Object.prototype.hasOwnProperty.call(root,key)) output.push(root[key]);
  for (const value of Object.values(root)) if (value && typeof value === "object") findObjects(value,key,output,depth+1);
  return output;
}
function jsonAssignment(html: string, marker: string): any {
  const at = html.indexOf(marker);
  if (at<0) return null;
  const start = html.indexOf("{",at);
  if (start<0) return null;
  let depth=0,quoted=false,escaped=false;
  for (let i=start;i<html.length;i++) {
    const char=html[i];
    if (quoted) { if (escaped) escaped=false; else if (char==="\\") escaped=true; else if (char==='"') quoted=false; continue; }
    if (char==='"') { quoted=true; continue; }
    if (char==="{") depth++;
    if (char==="}" && --depth===0) { try { return JSON.parse(html.slice(start,i+1)); } catch { return null; } }
  }
  return null;
}
function textRuns(node: any): string { return node?.runs?.map((r:any)=>r.text || "").join("") || node?.simpleText || ""; }
function parseComments(payload: any, limit=100) {
  const result: any[] = [];
  const seen = new Set<string>();
  const entities = new Map(findObjects(payload,"commentEntityPayload")
    .map((entity:any)=>[String(entity?.properties?.commentId||""),entity]));
  for (const thread of findObjects(payload,"commentThreadRenderer")) {
    const item = thread?.comment?.commentRenderer || thread?.commentViewModel?.commentViewModel;
    if (!item) continue;
    const id = String(item.commentId || item.commentKey || "");
    const entity = entities.get(id) as any;
    const text = textRuns(item.contentText) || textRuns(item.content) || String(entity?.properties?.content?.content || "");
    if (!id || !text || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, text: text.replace(/\s+/g," ").trim().slice(0,2000),
      published_at: textRuns(item.publishedTimeText) || entity?.properties?.publishedTime || null,
      likes: Number(textRuns(item.voteCount)) || null, is_pinned: !!(item.pinnedCommentBadge || item.pinnedText), is_channel_owner: false });
    if (result.length>=limit) break;
  }
  return result;
}

async function youtube(url: URL): Promise<Source> {
  const id = videoId(url);
  if (!id) throw new Error("올바른 유튜브 영상 링크를 입력해 주세요.");
  const canonical = `https://www.youtube.com/watch?v=${id}`;
  const html = (await read(canonical)).text;
  const title = meta(html,"og:title") || plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "") || "제목 미확인";
  const description = meta(html,"og:description").slice(0,3000);
  const warnings: string[] = [];
  let body = "", bodyKind = "자막 없음";
  const player = jsonAssignment(html,"ytInitialPlayerResponse");
  const initialData = jsonAssignment(html,"ytInitialData");
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const caption = tracks.find((t:any)=>String(t.languageCode).startsWith("ko")) || tracks.find((t:any)=>String(t.languageCode).startsWith("en")) || tracks[0];
  if (caption?.baseUrl) {
    try {
      const raw = (await read(caption.baseUrl,1_500_000)).text;
      body = [...raw.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map(m=>plain(m[1])).filter(Boolean).join(" ").slice(0,120000);
      if (body.length>=40) bodyKind = `영상 자막 (${caption.languageCode || "언어 미확인"})`;
      else body = "";
    } catch { /* retain visible limitation */ }
  }
  if (!body) warnings.push("영상 자막을 읽지 못했습니다. 제목·설명만으로 영상 내용을 안다고 판단하지 않습니다.");
  const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || "2.20260930.00.00";
  const comments = new Map<string, any>();
  const samples: Record<string,string[]> = {};
  if (key) {
    try {
      const sorts = findObjects(initialData,"sortFilterSubMenuRenderer").flatMap((x:any)=>x.subMenuItems || []);
      const titleFor=(x:any)=>typeof x.title==="string" ? x.title : textRuns(x.title);
      const tokens = {
        latest: sorts.find((x:any)=>/newest|최신/i.test(titleFor(x)))?.serviceEndpoint?.continuationCommand?.token,
        popular: sorts.find((x:any)=>/top|popular|인기/i.test(titleFor(x)))?.serviceEndpoint?.continuationCommand?.token,
      };
      for (const [sort,firstToken] of Object.entries(tokens)) {
        if (!firstToken) continue;
        const ids: string[] = [];
        let token: string|undefined = firstToken;
        for (let page=0;page<5 && token && ids.length<100;page++) {
          const response = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${encodeURIComponent(key)}`, { method:"POST", headers:{"content-type":"application/json","user-agent":"Mozilla/5.0"}, body:JSON.stringify({ context:{client:{clientName:"WEB",clientVersion}}, continuation:token }), signal:AbortSignal.timeout(16000) });
          if (!response.ok) break;
          const payload = await response.json();
          const parsed = parseComments(payload);
          for (const item of parsed) if (!ids.includes(item.id)) { ids.push(item.id); comments.set(item.id,item); }
          token = findObjects(payload,"continuationItemRenderer").map((x:any)=>x.continuationEndpoint?.continuationCommand?.token).find(Boolean);
        }
        if (ids.length) samples[sort] = ids.slice(0,100);
      }
    } catch { /* source may block public comment access */ }
  }
  if (!comments.size) warnings.push("공개 댓글에 접근하지 못했습니다. 직접 붙여 넣기를 사용해 주세요.");
  return { source_type:"youtube", url:canonical, title, publisher:player?.videoDetails?.author || "채널 미확인", published_at:null,
    description, body, body_kind:bodyKind, comments:[...comments.values()], samples,
    sampling:"공개 페이지에서 접근 가능한 최상위 댓글, 최신순·인기순 각각 최대 100개", reported_comment_count:null,
    warnings, collected_at:now() };
}

async function news(url: URL): Promise<Source> {
  const {text:html,url:final,type} = await read(url.toString());
  if (!type.includes("html") && !/^\s*<!doctype|^\s*<html/i.test(html)) throw new Error("HTML 기사 페이지가 아닙니다.");
  const title = meta(html,"og:title") || plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "") || "제목 미확인";
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>plain(m[1])).filter(s=>s.length>=25);
  const body = paragraphs.join("\n").slice(0,120000);
  const found: any[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { for (const c of findObjects(JSON.parse(m[1]),"@type")) { void c; } const objects:any[]=[]; const visit=(x:any):void=>{ if(!x||typeof x!=="object")return; if(x["@type"]==="Comment"&&typeof x.text==="string")objects.push(x); Object.values(x).forEach(visit); }; visit(JSON.parse(m[1])); objects.forEach(c=>found.push({id:String(c["@id"]||`ld-${found.length+1}`),text:c.text.slice(0,2000),published_at:c.datePublished||null,likes:null})); } catch { /* malformed JSON-LD */ }
  }
  const comments = found.slice(0,100);
  const warnings = [!body ? "기사 본문을 추출하지 못했습니다. 직접 붙여 넣기를 사용해 주세요." : "", !comments.length ? "공개 댓글을 찾지 못했습니다. 별도 로그인이나 스크립트로 불러오는 댓글은 수집되지 않습니다." : ""].filter(Boolean);
  return { source_type:"news", url:final, title, publisher:meta(html,"og:site_name")||url.hostname,
    published_at:meta(html,"article:published_time")||null, description:meta(html,"og:description").slice(0,3000),
    body, body_kind:body?"기사 HTML 본문":"본문 없음", comments, sampling:"HTML 구조화 데이터에 노출된 댓글 최대 100개",
    reported_comment_count:null, warnings, collected_at:now() };
}

export async function extract(value: unknown): Promise<Source> {
  const url = publicUrl(value);
  if (videoId(url)) return youtube(url);
  if (/youtube\.com$|youtu\.be$/.test(url.hostname)) throw new Error("영상 주소 형식을 확인해 주세요.");
  return news(url);
}
