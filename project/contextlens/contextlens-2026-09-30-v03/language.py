"""Conservative script and English-signal hints, without external translation."""

import re


URL = re.compile(r"https?://\S+", re.I)
LATIN_WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
ENGLISH_MARKERS = {
    "i", "you", "we", "my", "your", "our", "the", "this", "that", "with",
    "for", "from", "and", "but", "is", "are", "was", "were", "it", "so",
    "love", "like", "amazing", "awesome", "beautiful", "great", "good",
    "nice", "wow", "best", "thank", "thanks", "please", "again", "repeat",
    "replay", "song", "songs", "voice", "album", "family", "mom", "dad",
    "listen", "listening", "watch", "watching", "performance", "video",
    "views", "congrats", "congratulations", "cheering", "supporting",
    "milestone", "singing", "vocals", "chorus", "dance", "daughter",
    "father", "mother", "grandma", "grandpa", "merch", "giveaway",
}

LABELS = {
    "ko": "한국어 단서",
    "en": "영어 단서",
    "ko_en": "한국어·영어 혼합",
    "ja": "일본어 문자",
    "han": "한자 문자·언어 미확인",
    "latin": "라틴 문자·언어 미확인",
    "other": "기타 문자·검토 필요",
    "und": "문자 단서 부족",
}


def language_hint(text):
    """Return a transparent hint, not a claim of reliable language detection."""
    cleaned = URL.sub("", text or "")
    words = {word.lower() for word in LATIN_WORD.findall(cleaned)}
    english = bool(words & ENGLISH_MARKERS)
    hangul = len(re.findall(r"[가-힣]", cleaned))
    kana = bool(re.search(r"[\u3040-\u30ff]", cleaned))
    han = bool(re.search(r"[\u4e00-\u9fff]", cleaned))
    latin = len(re.findall(r"[A-Za-z]", cleaned))
    other = bool(re.search(r"[\u0400-\u052f\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f]", cleaned))

    if other or (kana and hangul):
        code = "other"
    elif kana:
        code = "ja"
    elif han and not hangul:
        code = "han"
    elif hangul:
        code = "ko_en" if english and latin >= 8 else "ko"
    elif latin:
        code = "en" if english else "latin"
    else:
        code = "und"
    return {"code": code, "label": LABELS[code], "supported": code in {"ko", "en", "ko_en"}}
