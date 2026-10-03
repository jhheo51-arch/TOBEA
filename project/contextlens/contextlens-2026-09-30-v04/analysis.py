"""Transparent, local and deliberately conservative text analysis."""

from collections import Counter, defaultdict
import re

from cx import NOTICE, URL, source_facts, viewer_needs
from language import language_hint


STOPWORDS = {
    "그리고", "그러나", "그런데", "그래서", "하지만", "정말", "그냥", "이렇게", "저렇게",
    "이것", "저것", "그것", "여기", "저기", "거기", "대한", "하는", "있는", "없는",
    "하는데", "있는데", "없는데", "합니다", "했습니다", "입니다", "아니", "아니라",
    "때문", "같은", "같아요", "너무", "조금", "많이", "이런", "저런", "이번", "다시",
    "지금", "오늘", "우리", "제가", "저는", "영상", "기사", "댓글", "사람", "생각",
    "그럼", "이거", "그거", "뭔가", "진짜", "어떻게", "있어요", "없어요", "합니다",
    "the", "and", "for", "that", "this", "with", "from", "have", "you", "are",
    "was", "were", "but", "not", "your", "they", "their", "about", "what", "when",
    "would", "could", "should", "video", "news", "comment", "like", "just", "really",
    "here", "some", "all", "every", "there", "them", "then", "than", "also", "more",
    "most", "very", "much", "many", "these", "those", "been", "being", "only", "into",
    "over", "under", "because", "which", "where", "right", "thing", "things", "people",
    "something", "anything", "someone", "everyone", "now", "today", "time", "still",
    "will", "can", "does", "did", "had", "has", "got", "get", "use", "used",
    "why", "its", "goes", "went", "text", "first", "good", "great", "want",
    "out", "who", "going", "make", "say", "know", "other", "one", "don",
    "하나", "모두", "다들", "좋은", "이게", "이제", "처음", "왓습니다", "왔습니다",
}

TYPE_RULES = {
    "질문형 표현": re.compile(r"[?？]|어떻|왜 |궁금|알려|무슨|어디|어떤|how |why |where ", re.I),
    "불편·문제": re.compile(r"불편|오류|에러|안\s*(돼|되|보여|보이|찾|열|나오)|실패|문제|답답|느리|못\s*(찾|보|하|받|열|쓰겠|써)|찾을 수 없|확인할 수 없|할 수 없|고장|bug|error|fail|broken", re.I),
    "직접 경험": re.compile(r"저는|제가|직접|해[ ]?봤|겪었|사용했|써[ ]?봤|방금|당했|i tried|i used|my experience", re.I),
    "정보 보완": re.compile(r"정정|추가로|정확히|근거|출처|참고로|사실은|according to|source:|correction", re.I),
}

ENGLISH_TYPE_RULES = {
    "질문형 표현": re.compile(r"[?？]|^\s*(?:how|why|where|what|when|who|can|could|would|is|are|do|does)\b", re.I),
    "불편·문제": re.compile(r"\b(?:bug|error|broken|failed?|missing|confusing|unable|cannot|can't|doesn't work|not working|won't load|hard to find)\b", re.I),
    "직접 경험": re.compile(r"\b(?:i tried|i used|i watched|i listened|my experience)\b", re.I),
    "정보 보완": re.compile(r"\b(?:correction|according to|source:|actually|for reference)\b", re.I),
}


PARTICLES = ("에서는", "에게는", "으로는", "까지는", "에서", "에게", "으로", "부터", "까지", "하고", "에는", "에도", "들이", "들을", "들은", "으로", "의", "을", "를", "은", "는", "이", "가", "에", "도", "만")


def tokens(text):
    result = []
    for raw in re.findall(r"[가-힣]{2,}|[a-zA-Z]{3,}", text or ""):
        word = raw.lower()
        if re.fullmatch(r"[가-힣]+", word):
            for suffix in PARTICLES:
                if word.endswith(suffix) and len(word) - len(suffix) >= 2:
                    word = word[:-len(suffix)]
                    break
        if word not in STOPWORDS:
            result.append(word)
    return result


def sentences(text):
    parts = re.split(r"(?<=[.!?。！？])\s+|\n+", text or "")
    result = []
    for part in parts:
        part = re.sub(r"\s+", " ", part).strip()
        if len(part) < 40:
            continue
        if len(part) <= 480:
            result.append(part)
        else:
            for start in range(0, len(part), 300):
                piece = part[start:start + 300].strip()
                if len(piece) >= 40:
                    result.append(piece)
    return result


def context_highlights(body, title="", limit=5):
    lines = sentences(body)
    if not lines:
        compact = re.sub(r"\s+", " ", body or "").strip()
        return [compact[:420]] if len(compact) >= 20 else []
    weights = Counter(tokens(body))
    title_words = set(tokens(title))
    picked = []
    # Pick one informative sentence from each part of the source so a long video
    # is not represented by a single repeated segment.
    for section in range(min(limit, len(lines))):
        start = int(section * len(lines) / min(limit, len(lines)))
        end = int((section + 1) * len(lines) / min(limit, len(lines)))
        scored = []
        for index in range(start, max(start + 1, end)):
            line = lines[index]
            words = set(tokens(line))
            if not words:
                continue
            informative = sum(1 / (1 + weights[w] ** 0.5) for w in words)
            score = informative / (len(words) ** 0.35) + 2 * len(words & title_words)
            scored.append((score, index, line[:420]))
        if scored:
            picked.append(max(scored))
    picked.sort(key=lambda row: row[1])
    if not picked:
        compact = re.sub(r"\s+", " ", body or "").strip()
        return [compact[:420]] if compact else []
    return [line for _, _, line in picked]


def classify_comment(text, is_notice=False, language_code=None):
    if is_notice:
        return ["공지"]
    language_code = language_code or language_hint(text)["code"]
    if language_code not in {"ko", "en", "ko_en"}:
        return ["언어 검토 필요"]
    cleaned = URL.sub("", text or "")
    rules = []
    if language_code in {"ko", "ko_en"}:
        rules.extend(TYPE_RULES.items())
    if language_code in {"en", "ko_en"}:
        rules.extend(ENGLISH_TYPE_RULES.items())
    labels = list(dict.fromkeys(label for label, rule in rules if rule.search(cleaned)))
    return labels or ["의견·반응"]


def analyze(source):
    body = source.get("body") or ""
    comments = source.get("comments") or []
    samples = source.get("samples") or {}
    sample_sets = {key: set(ids) for key, ids in samples.items()}
    context_ok = bool(body.strip())
    context_words = set(tokens(body + " " + (source.get("description") or "") + " " + (source.get("title") or "")))
    df = Counter()
    groups = defaultdict(list)
    label_counts = Counter()
    analyzed = []
    notice_count = 0
    language_counts = Counter()
    covered_total = 0

    for comment in comments:
        content = re.sub(r"\s+", " ", comment.get("text", "")).strip()
        if not content:
            continue
        comment_id = str(comment.get("id", ""))
        is_notice = bool(comment.get("is_pinned") or comment.get("is_channel_owner") or NOTICE.search(content))
        notice_count += int(is_notice)
        language = language_hint(content)
        if not is_notice:
            language_counts[language["code"]] += 1
            covered_total += int(language["supported"])
        words = set(tokens(URL.sub("", content))) if language["supported"] else set()
        labels = classify_comment(content, is_notice, language["code"])
        for label in labels:
            label_counts[label] += 1
        if not is_notice:
            for word in words:
                df[word] += 1
                groups[word].append(comment_id)
        shared = sorted(words & context_words, key=lambda word: -len(word))
        analyzed.append({
            "id": comment_id,
            "text": content[:1200],
            "published_at": comment.get("published_at"),
            "likes": comment.get("likes"),
            "sorts": [key for key, ids in sample_sets.items() if comment_id in ids],
            "is_notice": is_notice,
            "language_code": language["code"],
            "language_label": language["label"],
            "language_supported": language["supported"],
            "labels": labels,
            "context_terms": shared[:6],
            "context_link": "표현 겹침" if shared and context_ok else ("연결 단서 적음" if context_ok else "본문 미확인"),
        })

    total = len(analyzed)
    viewer_total = total - notice_count
    # One term is counted at most once per comment. Exclude overly generic words.
    min_count = 2 if total < 40 else 3
    common = [(term, count) for term, count in df.items()
              if count >= min_count and len(term) >= 2]
    common.sort(key=lambda row: (-row[1], -len(row[0]), row[0]))
    themes = []
    used = set()
    for term, count in common:
        ids = set(groups[term])
        if any(len(ids & previous) / max(len(ids | previous), 1) >= 0.8 for previous in used):
            continue
        examples = [c for c in analyzed if c["id"] in ids][:2]
        themes.append({
            "term": term,
            "count": count,
            "share_of_sample": round(count / covered_total * 100, 1) if covered_total else 0,
            "example_ids": [c["id"] for c in examples],
            "examples": [c["text"][:180] for c in examples],
            "interpretation": "같은 표현을 쓴 댓글 묶음입니다. 같은 문제인지 원문을 확인해 주세요.",
        })
        used.add(frozenset(ids))
        if len(themes) >= 6:
            break

    quality = []
    if not context_ok:
        quality.append("자막 또는 기사 본문을 확보하지 못해 원문 맥락을 확인할 수 없습니다.")
    if not total:
        quality.append("공개 댓글을 확보하지 못해 댓글 패턴을 분석하지 않았습니다.")
    elif total < 10:
        quality.append("분석한 댓글이 10개 미만이어서 반복 여부를 판단하기 어렵습니다.")
    quality.append("댓글 비중은 수집한 댓글 안에서의 비중이며 전체 시청자·독자 비율이 아닙니다.")
    review_count = viewer_total - covered_total
    if review_count:
        quality.append(f"댓글 {review_count}개는 언어를 확정하기 어렵거나 한국어·영어 규칙 범위 밖이어서 자동 주제·욕구 계산에서 제외했습니다. 원문은 근거 댓글에서 확인할 수 있습니다.")
    if viewer_total and review_count / viewer_total >= 0.2:
        quality.append("직접 검토가 필요한 댓글이 20% 이상입니다. 해당 언어 댓글을 읽기 전에는 욕구 카드의 우선순위를 확정하지 마세요.")
    quality.append("언어 표시는 문자·영어 단어 단서에 따른 추정이며 번역이나 정확한 언어 판별이 아닙니다.")
    if source.get("source_type") == "youtube":
        quality.append("영상 파일의 화면·음성을 직접 분석하지 않았습니다. 자동 자막은 가사·고유명사를 잘못 인식할 수 있습니다.")
        quality.append("인기순은 플랫폼 정렬 결과이며 좋아요순 또는 무작위 표본이 아닙니다.")
    quality.append("유형과 원문 연결은 단순 규칙·표현 겹침에 따른 후보이며 사람이 검토해야 합니다.")

    candidates = []
    if context_ok and covered_total and source.get("source_type") != "youtube":
        problem_count = label_counts.get("불편·문제", 0)
        question_count = label_counts.get("질문형 표현", 0)
        if problem_count:
            candidates.append(f"불편·문제 표현이 {problem_count}개 댓글에서 관찰됐습니다. 실제 이용 경험인지, 원문 주장에 대한 비판인지 구분해 보세요.")
        if question_count:
            candidates.append(f"질문형 표현이 {question_count}개 댓글에서 관찰됐습니다. 실제 질문과 수사적 표현을 나누고 원문에서 다룬 내용을 확인해 보세요.")
        if not candidates:
            candidates.append("명확한 질문·불편 신호가 적습니다. 반복 표현과 반대 사례를 직접 검토해 보세요.")

    overlap = len(sample_sets.get("latest", set()) & sample_sets.get("popular", set()))
    return {
        "context": {
            "available": context_ok,
            "basis": source.get("body_kind") if context_ok else "본문 없음",
            "highlights": context_highlights(body, source.get("title", "")),
            "facts": source_facts(source),
            "character_count": len(body),
        },
        "comments": analyzed,
        "comment_count": total,
        "viewer_comment_count": viewer_total,
        "notice_count": notice_count,
        "language_summary": {
            "counts": dict(language_counts),
            "covered": covered_total,
            "review_needed": review_count,
            "viewer_total": viewer_total,
            "coverage_percent": round(covered_total / viewer_total * 100, 1) if viewer_total else 0,
            "priority_review_needed": bool(viewer_total and review_count / viewer_total >= 0.2),
        },
        "theme_denominator": covered_total,
        "sampling_summary": {
            "latest": len(sample_sets.get("latest", set())),
            "popular": len(sample_sets.get("popular", set())),
            "overlap": overlap,
            "unique": total,
            "available_sorts": list(samples),
        },
        "type_counts": dict(label_counts),
        "themes": themes,
        "viewer_needs": viewer_needs(source, analyzed, samples),
        "improvement_candidates": candidates,
        "limitations": quality + source.get("warnings", []),
    }
