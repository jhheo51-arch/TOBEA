"""Evidence-first viewer need candidates for public YouTube comments."""

import re


URL = re.compile(r"https?://\S+", re.I)
NOTICE = re.compile(r"^\s*\[(?:공지|안내|휴재|이벤트)", re.I)
CHAPTER = re.compile(r"(?m)^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+([^\n]{2,80})")

SIGNALS = (
    {
        "key": "repeat",
        "label": "다시 듣고 일상에서 이어 보기",
        "pattern": re.compile(r"반복|무한|재생|또\s*(?:듣|보|왔|옴)|다시\s*(?:듣|보)|출퇴근|출근길|퇴근길|등산|아침마다|매일|몇\s*번|하루\s*\d+번|들으러|보러\s*왔", re.I),
        "pattern_en": re.compile(r"\b(?:again|repeat(?:ing)?|replay|on loop|on repeat|every (?:day|morning)|daily|commute|listening again|back for more)\b", re.I),
        "offer": "곡별 영상이나 재생목록으로 다시 듣는 경로를 시험해 보세요.",
        "metric": "곡별 이동, 재방문, 시청 지속 시간을 비교합니다.",
    },
    {
        "key": "community",
        "label": "함께 응원하고 성취를 확인하기",
        "pattern": re.compile(r"조회수|\d+\s*만(?:회|뷰)?|1\s*등|1\s*위|출첵|출석|카운트다운|화이팅|응원|팬클럽", re.I),
        "pattern_en": re.compile(r"\b(?:views?|million views|congrats|congratulations|cheering|supporting|fans?|milestone)\b", re.I),
        "offer": "성과 소식과 다음 활동을 짧게 안내하고, 이벤트 참여 댓글과 자발적 응원을 따로 살펴보세요.",
        "metric": "이벤트 전후의 응원 표현과 구체적인 콘텐츠 의견을 비교합니다.",
    },
    {
        "key": "share",
        "label": "가족·지인과 함께 즐기기",
        "pattern": re.compile(r"엄마|어머니|아버지|아빠|부모|할머니|할아버지|가족|손주|초등|\d\s*대가|세대|딸내미|아들|집사람|(?<!녹)아내", re.I),
        "pattern_en": re.compile(r"\b(?:mom|mum|mother|dad|father|grandma|grandpa|family|daughter|son|parents?|shared? (?:this|it) with)\b", re.I),
        "offer": "짧게 공유할 수 있는 곡별 클립을 한 번 시험해 보세요.",
        "metric": "공유 유입과 클립 이후 본편 시청을 확인합니다.",
    },
    {
        "key": "request",
        "label": "다음 콘텐츠에 의견 반영하기",
        "pattern": re.compile(r"(?:^|[\s,.!?])내\s*줘|내주세요|불러\s*줘|불러\s*주|풀\s*버전|앨범|다음\s*(?:곡|메들리|영상)|(?:OST|동요|7080)\s*(?:메들리|해|부)|해\s*주세요|해주\s*세요", re.I),
        "pattern_en": re.compile(r"\b(?:please (?:sing|cover|release|make)|full version|full song|next song|next cover|album|can you (?:sing|cover|make))\b", re.I),
        "offer": "요청된 곡·형식을 후보로 묶어 투표나 짧은 예고 영상으로 비교해 보세요.",
        "metric": "후보 선택과 공개 후 시청 지속 시간을 확인합니다.",
    },
    {
        "key": "performance",
        "label": "노래·선곡·무대의 특정 요소 즐기기",
        "pattern": re.compile(r"음색|선곡|코러스|기교|무대|춤사위|목소리|창법|가창|첫\s*곡|마지막\s*곡|용두산|초혼|빵빵", re.I),
        "pattern_en": re.compile(r"\b(?:voice|vocals?|singing|chorus|choreography|stage|song choice|performance|dance|high note)\b", re.I),
        "offer": "어떤 곡·무대 요소가 다시 보게 만드는지 짧은 후속 질문으로 확인해 보세요.",
        "metric": "곡별 이탈 지점과 구체적 반응을 함께 봅니다.",
    },
    {
        "key": "product",
        "label": "연결된 상품·이벤트 정보 확인하기",
        "pattern": re.compile(r"찹쌀떡|제나빵|떡\s*(?:맛|브랜드|샀|사서)|PPL|포카|경품|이벤트|구매|주문", re.I),
        "pattern_en": re.compile(r"\b(?:product|merch|buy|order|price|giveaway|event|sold out|shipping|taste)\b", re.I),
        "offer": "상품·이벤트의 현재 상태와 참여 종료 여부를 설명에서 명확히 표시해 보세요.",
        "metric": "상태를 묻는 댓글과 안내 링크 이용을 확인합니다.",
    },
)

# Rules are suggestions tied to the source type. A match is never treated as a
# confirmed customer need; the reader must inspect the original comments.
GENERAL_VIDEO_SIGNALS = (
    {"key": "revisit", "label": "다시 찾거나 필요한 구간으로 이동하기",
     "pattern": re.compile(r"다시\s*(?:보|찾)|반복|재생|타임스탬프|챕터|몇\s*분|구간|저장|북마크", re.I),
     "pattern_en": re.compile(r"\b(?:rewatch|watch again|replay|timestamp|chapter|bookmark|which minute)\b", re.I),
     "offer": "설명란의 구간 안내나 핵심 장면 목록을 시험해 보세요.",
     "metric": "구간 링크 이용과 재방문을 확인합니다."},
    {"key": "clarify", "label": "내용의 배경과 뜻 이해하기",
     "pattern": re.compile(r"왜\s|어떻게|무슨\s|무슨뜻|설명|이해가\s*안|모르겠|출처|근거", re.I),
     "pattern_en": re.compile(r"\b(?:why|how|what does|explain|confusing|source|evidence)\b", re.I),
     "offer": "반복 질문의 답과 근거 링크를 설명란에 추가해 보세요.",
     "metric": "같은 질문의 재등장과 답변 링크 이용을 확인합니다."},
    {"key": "followup", "label": "후속 내용 이어 보기",
     "pattern": re.compile(r"다음\s*(?:편|영상|주제)|후속|2\s*편|시리즈|더\s*보고|계속\s*해", re.I),
     "pattern_en": re.compile(r"\b(?:part 2|next video|follow.?up|more episodes|series|make another)\b", re.I),
     "offer": "후속 주제 후보를 짧게 묻고 관련 자료로 이동할 길을 제공해 보세요.",
     "metric": "후속 주제 선택과 관련 콘텐츠 이동을 확인합니다."},
    {"key": "access", "label": "시청·이해를 방해하는 문제 해소하기",
     "pattern": re.compile(r"자막|번역|음질|안\s*보여|안\s*들려|오타|오류|끊겨|링크\s*안", re.I),
     "pattern_en": re.compile(r"\b(?:subtitle|caption|translation|can't hear|cannot hear|audio issue|broken link|typo)\b", re.I),
     "offer": "문제가 난 구간을 확인해 자막·설명·링크를 수정해 보세요.",
     "metric": "같은 문제 제기 감소와 수정 안내 확인을 살펴봅니다."},
)

NEWS_SIGNALS = (
    {"key": "source", "label": "기사의 근거와 출처 확인하기",
     "pattern": re.compile(r"출처|근거|자료|데이터|통계|팩트|원문|증거", re.I),
     "pattern_en": re.compile(r"\b(?:source|evidence|data|statistics|citation|proof|original report)\b", re.I),
     "offer": "핵심 수치와 주장 옆에 원자료·취재 근거 링크를 붙이는 방안을 검토해 보세요.",
     "metric": "출처를 묻는 후속 댓글과 근거 링크 이용을 확인합니다."},
    {"key": "background", "label": "사건의 배경과 영향을 이해하기",
     "pattern": re.compile(r"왜\s|어떻게|배경|원인|영향|무슨\s*뜻|설명|이해가\s*안", re.I),
     "pattern_en": re.compile(r"\b(?:why|how|background|cause|impact|what does this mean|explain)\b", re.I),
     "offer": "사건의 전후 관계와 영향을 짧은 설명이나 문답으로 보완해 보세요.",
     "metric": "같은 배경 질문의 재등장과 설명 이용을 확인합니다."},
    {"key": "update", "label": "이후 변화를 계속 확인하기",
     "pattern": re.compile(r"이후|진행\s*상황|업데이트|후속|그\s*다음|결과는|지금은", re.I),
     "pattern_en": re.compile(r"\b(?:update|follow.?up|what happened next|now what|outcome|latest)\b", re.I),
     "offer": "새 사실이 확인되는 시점에 기사 상단에서 변경 내용을 알려 보세요.",
     "metric": "후속 기사 이동과 같은 상태 질문의 변화를 확인합니다."},
    {"key": "disagreement", "label": "서로 다른 해석의 쟁점 구분하기",
     "pattern": re.compile(r"반박|반대|동의\s*못|다른\s*의견|하지만|논쟁|틀렸", re.I),
     "pattern_en": re.compile(r"\b(?:disagree|counterargument|however|but the|wrong|debate)\b", re.I),
     "offer": "검증된 사실과 해석이 갈리는 지점을 분리해 안내해 보세요.",
     "metric": "사실 확인 요청과 쟁점 설명에 대한 반응을 확인합니다."},
    {"key": "reading", "label": "기사를 읽는 과정의 불편 줄이기",
     "pattern": re.compile(r"광고|팝업|유료|구독벽|오타|안\s*열려|링크\s*안|읽기\s*힘", re.I),
     "pattern_en": re.compile(r"\b(?:ads?|popup|paywall|typo|broken link|can't open|hard to read)\b", re.I),
     "offer": "해당 페이지의 읽기 방해 요소와 링크·표기를 직접 점검해 보세요.",
     "metric": "같은 불편 신고와 기사 읽기 완료를 확인합니다."},
)


def source_facts(source):
    if source.get("source_type") != "youtube":
        return []
    description = source.get("description") or ""
    chapters = CHAPTER.findall(description)
    facts = []
    if chapters:
        preview = ", ".join(f"{time} {name.strip()}" for time, name in chapters[:8])
        facts.append(f"영상 설명의 시간표: {preview}")
    if re.search(r"댓글\s*이벤트|참여\s*기간|경품", description):
        facts.append("영상 설명에 댓글 이벤트 또는 경품 안내가 있습니다. 요청 댓글의 동기에 영향을 줄 수 있습니다.")
    if re.search(r"PPL|특가|주문|구매", description, re.I):
        facts.append("영상 설명에 상품·판매 관련 안내가 있습니다.")
    return facts


def viewer_needs(source, comments, samples):
    source_type = source.get("source_type")
    descriptions = source.get("description") or ""
    music = bool(re.search(r"트로트|트롯|메들리|노래|음악|cover|song", source.get("title", "") + descriptions, re.I))
    signals = NEWS_SIGNALS if source_type == "news" else (SIGNALS if source_type == "youtube" and music else GENERAL_VIDEO_SIGNALS)
    ids_by_sort = {key: set(values) for key, values in samples.items()}
    needs = []
    for signal in signals:
        matched = []
        for comment in comments:
            if comment.get("is_notice") or not comment.get("language_supported", True):
                continue
            clean = URL.sub("", comment.get("text", ""))
            code = comment.get("language_code", "ko")
            if ((code in {"ko", "ko_en"} and signal["pattern"].search(clean))
                    or (code in {"en", "ko_en"} and signal["pattern_en"].search(clean))):
                matched.append(comment)
        if len(matched) < 2:
            continue
        ids = {item["id"] for item in matched}
        needs.append({
            "key": signal["key"], "label": signal["label"],
            "count": len(ids),
            "latest_count": len(ids & ids_by_sort.get("latest", set())),
            "popular_count": len(ids & ids_by_sort.get("popular", set())),
            "example_ids": [item["id"] for item in matched[:3]],
            "observation": f"수집한 고유 댓글 {len(ids)}개에서 관련 표현을 찾았습니다.",
            "possible_need": signal["label"],
            "offer": signal["offer"], "metric": signal["metric"],
            "caveat": ("영상 설명의 댓글 이벤트가 요청 표현에 영향을 줬을 수 있습니다."
                       if signal["key"] == "request" and re.search(r"댓글\s*이벤트|참여\s*방법", descriptions) else ""),
        })
    return sorted(needs, key=lambda row: (-row["count"], row["key"]))[:6]
