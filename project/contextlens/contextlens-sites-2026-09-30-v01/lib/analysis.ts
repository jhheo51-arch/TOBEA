type Source = Record<string, any>;
type Comment = Record<string, any>;

const labels: Record<string, string> = { ko: "한국어 단서", en: "영어 단서", ko_en: "한국어·영어 혼합", ja: "일본어 문자", han: "한자 문자·언어 미확인", latin: "라틴 문자·언어 미확인", other: "기타 문자·검토 필요", und: "문자 단서 부족" };
const english = new Set("i you we my your our the this that with for from and but is are was were it so love like amazing awesome beautiful great good nice wow best thank thanks please again repeat replay song songs voice album family mom dad listen listening watch watching performance video views congrats congratulations cheering supporting milestone singing vocals chorus dance daughter father mother grandma grandpa merch giveaway why how source evidence explain confusing".split(" "));
const stopwords = new Set("그리고 그러나 그런데 그래서 하지만 정말 그냥 이렇게 저렇게 이것 저것 그것 여기 저기 거기 대한 하는 있는 없는 합니다 했습니다 입니다 아니 때문에 같은 같아요 너무 조금 많이 이런 저런 이번 다시 지금 오늘 우리 제가 저는 영상 기사 댓글 사람 생각 그럼 이거 그거 뭔가 진짜 어떻게 있어요 없어요 the and for that this with from have you are was were but not your they their about what when would could should video news comment like just really here some all every there them then than also more most very much many these those been being only into over under because which where right thing things people something anything someone everyone now today time still will can does did had has got get use used why its goes went text first good great want out who going make say know other one".split(" "));
const cleanUrl = (value: string) => value.replace(/https?:\/\/\S+/gi, "");
const words = (value: string) => [...new Set((value.toLowerCase().match(/[가-힣]{2,}|[a-z]{2,}/g) || []).filter(w => !stopwords.has(w)))];
function languageHint(text: string) {
  const clean = cleanUrl(text);
  const latinWords = (clean.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).map(w => w.toLowerCase());
  const hasEnglish = latinWords.some(w => english.has(w));
  const hangul = (clean.match(/[가-힣]/g) || []).length;
  const latin = (clean.match(/[A-Za-z]/g) || []).length;
  let code = "und";
  if (/[\u0400-\u052f\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f]/u.test(clean)) code = "other";
  else if (/[\u3040-\u30ff]/u.test(clean)) code = "ja";
  else if (/[\u4e00-\u9fff]/u.test(clean) && !hangul) code = "han";
  else if (hangul) code = hasEnglish && latin >= 8 ? "ko_en" : "ko";
  else if (latin) code = hasEnglish ? "en" : "latin";
  return { code, label: labels[code], supported: ["ko", "en", "ko_en"].includes(code) };
}

const needRules = {
  music: [
    ["repeat", "다시 듣고 일상에서 이어 보기", /반복|무한|재생|다시\s*(?:듣|보)|출퇴근|출근길|퇴근길|매일|몇\s*번|하루\s*\d+번|들으러|보러\s*왔|\b(?:again|repeat|replay|on loop|daily|commute)\b/i, "곡별 영상이나 재생목록으로 다시 듣는 경로를 시험해 보세요.", "곡별 이동, 재방문, 시청 지속 시간을 비교합니다."],
    ["community", "함께 응원하고 성취를 확인하기", /조회수|\d+\s*만(?:회|뷰)?|1\s*등|1\s*위|출첵|출석|화이팅|응원|팬클럽|\b(?:views|congrats|cheering|supporting|fans|milestone)\b/i, "성과 소식과 다음 활동을 짧게 안내해 보세요.", "응원 표현과 구체적인 콘텐츠 의견을 비교합니다."],
    ["share", "가족·지인과 함께 즐기기", /엄마|어머니|아버지|아빠|부모|할머니|가족|손주|딸내미|\b(?:mom|mother|dad|family|daughter|son|grandma)\b/i, "짧게 공유할 수 있는 곡별 클립을 시험해 보세요.", "공유 유입과 본편 시청을 확인합니다."],
    ["request", "다음 콘텐츠에 의견 반영하기", /내주세요|불러\s*줘|풀\s*버전|앨범|다음\s*(?:곡|메들리|영상)|해주세요|해주\s*세요|\b(?:please sing|full version|next song|album|can you sing)\b/i, "요청된 곡·형식을 묶어 투표나 짧은 예고로 비교해 보세요.", "후보 선택과 공개 후 시청 지속 시간을 확인합니다."],
    ["performance", "노래·선곡·무대의 특정 요소 즐기기", /음색|선곡|코러스|기교|무대|목소리|창법|가창|\b(?:voice|vocals|singing|chorus|stage|performance|dance)\b/i, "어떤 곡·무대 요소가 다시 보게 만드는지 확인해 보세요.", "곡별 이탈 지점과 구체적 반응을 함께 봅니다."],
    ["product", "연결된 상품·이벤트 정보 확인하기", /PPL|포카|경품|이벤트|구매|주문|\b(?:product|merch|buy|order|price|giveaway|event)\b/i, "상품·이벤트의 현재 상태와 참여 종료 여부를 명확히 표시해 보세요.", "상태를 묻는 댓글과 안내 링크 이용을 확인합니다."],
  ],
  video: [
    ["revisit", "다시 찾거나 필요한 구간으로 이동하기", /다시\s*(?:보|찾)|반복|재생|타임스탬프|챕터|몇\s*분|구간|북마크|\b(?:rewatch|replay|timestamp|chapter|bookmark)\b/i, "설명란의 구간 안내나 핵심 장면 목록을 시험해 보세요.", "구간 링크 이용과 재방문을 확인합니다."],
    ["clarify", "내용의 배경과 뜻 이해하기", /왜\s|어떻게|무슨\s|무슨뜻|설명|이해가\s*안|모르겠|출처|근거|\b(?:why|how|what does|explain|confusing|source|evidence)\b/i, "반복 질문의 답과 근거 링크를 설명란에 추가해 보세요.", "같은 질문의 재등장과 답변 링크 이용을 확인합니다."],
    ["followup", "후속 내용 이어 보기", /다음\s*(?:편|영상|주제)|후속|2\s*편|시리즈|더\s*보고|\b(?:part 2|next video|follow.?up|series|make another)\b/i, "후속 주제 후보를 묻고 관련 자료로 이동할 길을 제공해 보세요.", "후속 주제 선택과 관련 콘텐츠 이동을 확인합니다."],
    ["access", "시청·이해를 방해하는 문제 해소하기", /자막|번역|음질|안\s*보여|안\s*들려|오타|오류|끊겨|링크\s*안|\b(?:subtitle|caption|translation|audio issue|broken link|typo)\b/i, "문제가 난 구간을 확인해 자막·설명·링크를 수정해 보세요.", "같은 문제 제기 감소와 수정 안내 확인을 살펴봅니다."],
  ],
  news: [
    ["source", "기사의 근거와 출처 확인하기", /출처|근거|자료|데이터|통계|팩트|원문|증거|\b(?:source|evidence|data|statistics|citation|proof)\b/i, "핵심 주장 옆에 원자료·취재 근거 링크를 붙여 보세요.", "출처 질문과 근거 링크 이용을 확인합니다."],
    ["background", "사건의 배경과 영향을 이해하기", /왜\s|어떻게|배경|원인|영향|무슨\s*뜻|설명|이해가\s*안|\b(?:why|how|background|cause|impact|explain)\b/i, "전후 관계와 영향을 짧은 설명으로 보완해 보세요.", "같은 배경 질문의 재등장을 확인합니다."],
    ["update", "이후 변화를 계속 확인하기", /이후|진행\s*상황|업데이트|후속|그\s*다음|결과는|지금은|\b(?:update|follow.?up|outcome|latest)\b/i, "새 사실이 확인되는 시점에 기사 상단에서 변경 내용을 알려 보세요.", "후속 기사 이동을 확인합니다."],
    ["disagreement", "서로 다른 해석의 쟁점 구분하기", /반박|반대|동의\s*못|다른\s*의견|하지만|논쟁|틀렸|\b(?:disagree|counterargument|however|debate)\b/i, "검증된 사실과 해석이 갈리는 지점을 분리해 안내해 보세요.", "사실 확인 요청을 확인합니다."],
    ["reading", "기사를 읽는 과정의 불편 줄이기", /광고|팝업|유료|구독벽|오타|안\s*열려|링크\s*안|읽기\s*힘|\b(?:ads|popup|paywall|typo|broken link)\b/i, "읽기 방해 요소와 링크·표기를 직접 점검해 보세요.", "같은 불편 신고를 확인합니다."],
  ],
} as const;

export function analyze(source: Source) {
  const body = String(source.body || "");
  const raw = Array.isArray(source.comments) ? source.comments : [];
  const samples = source.samples || {};
  const sampleSets = Object.fromEntries(Object.entries(samples).map(([k,v]) => [k, new Set(Array.isArray(v) ? v.map(String) : [])])) as Record<string, Set<string>>;
  const contextWords = new Set(words(`${body} ${source.description || ""} ${source.title || ""}`));
  const counts: Record<string, number> = {};
  const groups: Record<string, string[]> = {};
  const typeCounts: Record<string, number> = {};
  const langCounts: Record<string, number> = {};
  const comments: Comment[] = [];
  let noticeCount = 0, covered = 0;
  for (const item of raw) {
    const text = String(item.text || "").replace(/\s+/g," ").trim();
    if (!text) continue;
    const id = String(item.id || comments.length + 1);
    const notice = !!(item.is_pinned || item.is_channel_owner || /^\s*\[(?:공지|안내|휴재|이벤트)/i.test(text));
    const lang = languageHint(text);
    if (notice) noticeCount++; else { langCounts[lang.code] = (langCounts[lang.code] || 0) + 1; if (lang.supported) covered++; }
    const tokens = lang.supported ? words(cleanUrl(text)) : [];
    const common = tokens.filter(w => contextWords.has(w)).sort((a,b) => b.length-a.length).slice(0,6);
    const type = notice ? ["공지"] : !lang.supported ? ["언어 검토 필요"] : [
      /[?？]|왜\s|어떻게|무엇|궁금|\b(?:why|how|what|where|when)\b/i.test(text) ? "질문형 표현" : "",
      /안\s*되|못하|어려|불편|오류|문제|\b(?:problem|broken|issue|difficult)\b/i.test(text) ? "불편·문제" : "",
      /써봤|사용했|겪었|직접|\b(?:i used|i tried|my experience)\b/i.test(text) ? "직접 경험" : "",
    ].filter(Boolean);
    if (!type.length) type.push("의견·반응");
    type.forEach(label => { typeCounts[label] = (typeCounts[label] || 0) + 1; });
    if (!notice) tokens.forEach(w => { counts[w]=(counts[w]||0)+1; (groups[w] ||= []).push(id); });
    comments.push({ id, text: text.slice(0,1200), published_at: item.published_at ?? null, likes: item.likes ?? null,
      sorts: Object.keys(sampleSets).filter(k => sampleSets[k].has(id)), is_notice: notice,
      language_code: lang.code, language_label: lang.label, language_supported: lang.supported,
      labels: type, context_terms: common, context_link: common.length && body ? "표현 겹침" : body ? "연결 단서 적음" : "본문 미확인" });
  }
  const min = comments.length < 40 ? 2 : 3;
  const themes = Object.entries(counts).filter(([w,c]) => w.length >= 2 && c >= min)
    .sort((a,b) => b[1]-a[1] || b[0].length-a[0].length || a[0].localeCompare(b[0])).slice(0,6)
    .map(([term,count]) => ({ term, count, share_of_sample: covered ? Math.round(count/covered*1000)/10 : 0,
      example_ids: groups[term].slice(0,2), examples: comments.filter(c => groups[term].includes(c.id)).slice(0,2).map(c => c.text.slice(0,180)),
      interpretation: "같은 표현을 쓴 댓글 묶음입니다. 같은 문제인지 원문을 확인해 주세요." }));
  const category = source.source_type === "news" ? "news" : /트로트|트롯|메들리|노래|음악|cover|song/i.test(`${source.title || ""} ${source.description || ""}`) ? "music" : "video";
  const needs = needRules[category].flatMap(([key,label,pattern,offer,metric]) => {
    const matched = comments.filter(c => !c.is_notice && c.language_supported && pattern.test(cleanUrl(c.text)));
    if (matched.length < 2) return [];
    const ids = new Set(matched.map(c=>c.id));
    return [{ key, label, count: ids.size, latest_count: [...ids].filter(id=>sampleSets.latest?.has(id)).length,
      popular_count: [...ids].filter(id=>sampleSets.popular?.has(id)).length, example_ids: matched.slice(0,3).map(c=>c.id),
      observation: `수집한 고유 댓글 ${ids.size}개에서 관련 표현을 찾았습니다.`, possible_need: label, offer, metric, caveat: "" }];
  }).sort((a,b)=>b.count-a.count).slice(0,6);
  const viewer = comments.length-noticeCount;
  const reviewNeeded = viewer-covered;
  const limitations = [
    !body ? "자막 또는 기사 본문을 확보하지 못해 원문 맥락을 확인할 수 없습니다." : "",
    !comments.length ? "공개 댓글을 확보하지 못해 댓글 패턴을 분석하지 않았습니다." : comments.length < 10 ? "분석한 댓글이 10개 미만이어서 반복 여부를 판단하기 어렵습니다." : "",
    "댓글 비중은 수집한 댓글 안에서의 비중이며 전체 시청자·독자 비율이 아닙니다.",
    reviewNeeded ? `댓글 ${reviewNeeded}개는 언어 규칙 범위 밖이어서 자동 주제·욕구 계산에서 제외했습니다.` : "",
    "언어 표시는 문자·영어 단어 단서에 따른 추정이며 번역이나 정확한 언어 판별이 아닙니다.",
    source.source_type === "youtube" ? "영상 파일의 화면·음성을 직접 분석하지 않았습니다. 인기순은 무작위 표본이 아닙니다." : "",
    "유형과 원문 연결은 단순 규칙·표현 겹침에 따른 후보이며 사람이 검토해야 합니다.",
    ...(Array.isArray(source.warnings) ? source.warnings : []),
  ].filter(Boolean);
  const highlights = body.split(/[\n.!?。]+/).map(s=>s.trim()).filter(s=>s.length>=25).slice(0,8);
  const facts: string[] = [];
  if (source.source_type === "youtube") {
    const chapters = String(source.description || "").split("\n").filter(s=>/^\s*\d{1,2}:\d{2}/.test(s)).slice(0,8);
    if (chapters.length) facts.push(`영상 설명의 시간표: ${chapters.join(", ")}`);
    if (/댓글\s*이벤트|참여\s*기간|경품/.test(source.description || "")) facts.push("영상 설명에 댓글 이벤트 또는 경품 안내가 있습니다.");
  }
  return { context: { available: !!body.trim(), basis: body.trim() ? source.body_kind || "원문" : "본문 없음", highlights, facts, character_count: body.length },
    comments, comment_count: comments.length, viewer_comment_count: viewer, notice_count: noticeCount,
    language_summary: { counts: langCounts, covered, review_needed: reviewNeeded, viewer_total: viewer,
      coverage_percent: viewer ? Math.round(covered/viewer*1000)/10 : 0, priority_review_needed: !!(viewer && reviewNeeded/viewer>=0.2) },
    theme_denominator: covered, sampling_summary: { latest: sampleSets.latest?.size || 0, popular: sampleSets.popular?.size || 0,
      overlap: [...(sampleSets.latest || [])].filter(id=>sampleSets.popular?.has(id)).length, unique: comments.length, available_sorts: Object.keys(sampleSets) },
    type_counts: typeCounts, themes, viewer_needs: needs, improvement_candidates: body && covered && source.source_type !== "youtube" ? ["반복 질문과 불편 표현이 실제 이용 문제인지 원문과 반례를 함께 확인해 보세요."] : [], limitations };
}
