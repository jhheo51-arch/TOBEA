"""Fetch public source material only. All source text is treated as data."""

from bs4 import BeautifulSoup
from datetime import datetime, timezone
import html
import ipaddress
import json
import re
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener


MAX_HTML_BYTES = 3_000_000
MAX_CAPTION_BYTES = 1_500_000
USER_AGENT = "ContextLens/0.1 (+local research tool)"


class FetchError(Exception):
    pass


def validate_public_url(value):
    try:
        parsed = urlparse(value.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
            raise FetchError("http/https 공개 주소를 입력해 주세요.")
        host = parsed.hostname.lower()
        if host in {"localhost", "localhost.localdomain"} or host.endswith((".local", ".internal")):
            raise FetchError("로컬 네트워크 주소는 분석할 수 없습니다.")
        for item in socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM):
            address = ipaddress.ip_address(item[4][0])
            if not address.is_global:
                raise FetchError("공개 인터넷 주소만 분석할 수 있습니다.")
        return parsed.geturl()
    except socket.gaierror as exc:
        raise FetchError("주소의 서버를 찾을 수 없습니다.") from exc
    except ValueError as exc:
        raise FetchError("올바른 주소를 입력해 주세요.") from exc


class CheckedRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_public_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


OPENER = build_opener(CheckedRedirect)


def read_public_url(url, limit=MAX_HTML_BYTES):
    checked = validate_public_url(url)
    request = Request(checked, headers={"User-Agent": USER_AGENT, "Accept": "text/html,text/vtt,application/json,*/*;q=0.5"})
    try:
        with OPENER.open(request, timeout=16) as response:
            content_type = response.headers.get("Content-Type", "")
            data = response.read(limit + 1)
            if len(data) > limit:
                raise FetchError("페이지가 너무 커서 안전하게 읽기를 중단했습니다.")
            charset = response.headers.get_content_charset() or "utf-8"
            return data.decode(charset, errors="replace"), content_type, response.url
    except HTTPError as exc:
        if exc.code in {401, 403}:
            raise FetchError("이 사이트가 자동 읽기를 허용하지 않습니다. 아래 직접 붙여 넣기를 사용해 주세요.") from exc
        raise FetchError(f"페이지를 읽지 못했습니다 (HTTP {exc.code}).") from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise FetchError(f"공개 페이지를 읽지 못했습니다: {type(exc).__name__}") from exc


def youtube_id(url):
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host in {"youtu.be", "www.youtu.be"}:
        candidate = parsed.path.strip("/").split("/")[0]
    elif host in {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}:
        candidate = parse_qs(parsed.query).get("v", [""])[0]
        if not candidate and parsed.path.startswith(("/shorts/", "/live/", "/embed/")):
            candidate = parsed.path.split("/")[2]
    else:
        return None
    return candidate if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate) else None


def clean_caption(payload, extension):
    if extension == "json3":
        try:
            document = json.loads(payload)
            pieces = ["".join(seg.get("utf8", "") for seg in event.get("segs", []))
                      for event in document.get("events", [])]
        except json.JSONDecodeError:
            return ""
    else:
        pieces = []
        for line in payload.splitlines():
            line = line.strip()
            if not line or line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE", "STYLE")):
                continue
            if re.match(r"^\d+$|^\d\d:\d\d", line) or "-->" in line:
                continue
            line = re.sub(r"<[^>]+>", "", line)
            line = html.unescape(line)
            if line:
                pieces.append(line)
    seen = set()
    cleaned = []
    for piece in pieces:
        piece = re.sub(r"\s+", " ", piece).strip()
        if piece and piece not in seen:
            cleaned.append(piece)
            seen.add(piece)
    return " ".join(cleaned)[:120_000]


def choose_caption(info):
    for key, kind in (("subtitles", "제공 자막"), ("automatic_captions", "자동 자막")):
        tracks = info.get(key) or {}
        languages = sorted(tracks, key=lambda lang: (0 if lang.startswith("ko") else 1 if lang.startswith("en") else 2, lang))
        for language in languages:
            if language == "live_chat":
                continue
            formats = tracks[language]
            for ext in ("vtt", "json3", "srv3", "ttml", "srt"):
                selected = next((item for item in formats if item.get("ext") == ext and item.get("url")), None)
                if not selected:
                    continue
                try:
                    payload, _, _ = read_public_url(selected["url"], MAX_CAPTION_BYTES)
                    content = clean_caption(payload, ext)
                    if len(content) >= 40:
                        return content, f"{kind} ({language})"
                except FetchError:
                    continue
    return "", "자막 없음"


def get_youtube(url):
    video_id = youtube_id(url)
    if not video_id:
        raise FetchError("올바른 유튜브 영상 링크를 입력해 주세요.")
    try:
        import yt_dlp
    except ImportError as exc:
        raise FetchError("유튜브 수집 도구가 설치되지 않았습니다. requirements.txt를 설치해 주세요.") from exc
    canonical = f"https://www.youtube.com/watch?v={video_id}"
    samples = {}
    comments_by_id = {}
    info = None
    warnings = []
    for label, sort_arg in (("latest", "new"), ("popular", "top")):
        options = {
            "quiet": True, "no_warnings": True, "skip_download": True,
            "ignoreerrors": False, "noplaylist": True, "getcomments": True,
            "extractor_args": {"youtube": {"max_comments": ["100", "100", "0", "0"],
                                            "comment_sort": [sort_arg]}},
            "socket_timeout": 16, "retries": 1, "extractor_retries": 1,
        }
        try:
            with yt_dlp.YoutubeDL(options) as downloader:
                fetched = downloader.extract_info(canonical, download=False)
        except Exception as exc:
            warnings.append(f"{('최신순' if label == 'latest' else '인기순')} 댓글 접근 실패: {str(exc)[:120]}")
            continue
        if not isinstance(fetched, dict):
            warnings.append(f"{('최신순' if label == 'latest' else '인기순')} 자료를 확인하지 못했습니다.")
            continue
        info = info or fetched
        ids = []
        for index, item in enumerate(fetched.get("comments") or []):
            if item.get("parent") not in {None, "root"}:
                continue
            content = re.sub(r"\s+", " ", item.get("text") or "").strip()
            if not content:
                continue
            comment_id = str(item.get("id") or f"{label}-{index+1}")
            if comment_id in ids:
                continue
            ids.append(comment_id)
            comments_by_id.setdefault(comment_id, {
                "id": comment_id, "text": content[:2000],
                "published_at": item.get("_time_text") or item.get("timestamp"),
                "likes": item.get("like_count"),
                "is_pinned": bool(item.get("is_pinned")),
                "is_channel_owner": bool(item.get("author_is_uploader")),
            })
            if len(ids) >= 100:
                break
        samples[label] = ids
    if not info:
        raise FetchError("유튜브 공개 자료를 가져오지 못했습니다. 영상 접근 상태를 확인해 주세요.")
    captions, caption_kind = choose_caption(info)
    comments = list(comments_by_id.values())
    if not captions:
        warnings.append("영상 자막을 읽지 못했습니다. 제목·설명만으로 영상 내용을 안다고 판단하지 않습니다.")
    elif len(captions) >= 120_000:
        warnings.append("긴 영상의 자막은 앞부분 12만 자까지만 분석했습니다. 영상 전체를 대표하지 않을 수 있습니다.")
    if not comments:
        warnings.append("댓글이 비활성화됐거나 공개 추출에 실패했을 수 있습니다.")
    return {
        "source_type": "youtube", "url": canonical, "title": info.get("title") or "제목 미확인",
        "publisher": info.get("channel") or info.get("uploader") or "채널 미확인",
        "published_at": info.get("upload_date"), "description": (info.get("description") or "")[:3000],
        "body": captions, "body_kind": caption_kind, "comments": comments,
        "samples": samples,
        "sampling": "yt-dlp 최신순·인기순 각각 최대 100개, 최상위 댓글 기준, ID 중복 제거",
        "reported_comment_count": None,
        "warnings": warnings, "collected_at": datetime.now(timezone.utc).isoformat(),
    }


def metadata(soup, *keys):
    for key in keys:
        tag = soup.find("meta", attrs={"property": key}) or soup.find("meta", attrs={"name": key})
        if tag and tag.get("content"):
            return tag["content"].strip()
    return ""


def jsonld_comments(soup):
    found = []
    def visit(node):
        if isinstance(node, list):
            for child in node:
                visit(child)
        elif isinstance(node, dict):
            kind = node.get("@type")
            kinds = kind if isinstance(kind, list) else [kind]
            if "Comment" in kinds and isinstance(node.get("text"), str):
                found.append({"id": str(node.get("@id") or f"ld-{len(found)+1}"), "text": node["text"][:2000],
                              "published_at": node.get("datePublished"), "likes": None})
            for value in node.values():
                if isinstance(value, (list, dict)):
                    visit(value)
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            visit(json.loads(script.string or script.get_text()))
        except (ValueError, TypeError):
            continue
    return found


def html_comments(soup):
    candidates = soup.select('[itemprop="comment"], [data-comment-id], li.comment, .comment-item, .comment_item')
    found = []
    seen = set()
    for node in candidates:
        if node.find_parent(attrs={"itemprop": "comment"}) or node.find_parent(class_=re.compile(r"comment[-_]item")):
            continue
        body = node.select_one('[itemprop="text"], .comment-text, .comment_text, .content') or node
        content = re.sub(r"\s+", " ", body.get_text(" ", strip=True))
        if not 10 <= len(content) <= 2000 or content in seen:
            continue
        seen.add(content)
        found.append({"id": str(node.get("data-comment-id") or f"html-{len(found)+1}"),
                      "text": content, "published_at": None, "likes": None})
        if len(found) >= 100:
            break
    return found


def guardian_comments(page, final_url):
    host = (urlparse(final_url).hostname or "").lower()
    if host not in {"theguardian.com", "www.theguardian.com"}:
        return [], None
    match = re.search(r"/p/([a-z0-9]{4,10})", page)
    if not match:
        return [], None
    api_url = ("https://discussion.theguardian.com/discussion-api/discussion//p/"
               f"{match.group(1)}?orderBy=newest&page=1&pageSize=100")
    try:
        payload, _, _ = read_public_url(api_url)
        discussion = json.loads(payload).get("discussion", {})
    except (FetchError, ValueError):
        return [], None
    found = []
    for item in discussion.get("comments", [])[:100]:
        content = BeautifulSoup(item.get("body") or "", "html.parser").get_text(" ", strip=True)
        content = re.sub(r"\s+", " ", content)
        if content:
            found.append({"id": str(item.get("id") or f"guardian-{len(found)+1}"),
                          "text": content[:2000], "published_at": item.get("isoDateTime"),
                          "likes": item.get("numRecommends")})
    return found, discussion.get("topLevelCommentCount")


def article_body(soup):
    selectors = ['[itemprop="articleBody"]', 'article', 'main', '#articleBody', '.article-body', '.article_body']
    choices = []
    for selector in selectors:
        for node in soup.select(selector)[:5]:
            paragraphs = [p.get_text(" ", strip=True) for p in node.select("p")]
            meaningful = [p for p in paragraphs if len(p) >= 25]
            content = "\n".join(meaningful)
            if len(content) >= 100:
                choices.append((len(content), content))
    if not choices:
        paragraphs = [p.get_text(" ", strip=True) for p in soup.select("p")]
        content = "\n".join(p for p in paragraphs if len(p) >= 35)
        if len(content) >= 100:
            choices.append((len(content), content))
    return max(choices, default=(0, ""))[1][:120_000]


def get_news(url):
    page, content_type, final_url = read_public_url(url)
    if "html" not in content_type.lower() and not page.lstrip().lower().startswith(("<!doctype", "<html")):
        raise FetchError("HTML 기사 페이지가 아닙니다.")
    soup = BeautifulSoup(page, "html.parser")
    discussion_comments, discussion_count = guardian_comments(page, final_url)
    comments = discussion_comments or (jsonld_comments(soup) + html_comments(soup))
    dedup = {}
    for item in comments:
        key = re.sub(r"\s+", " ", item["text"]).strip()
        dedup.setdefault(key, item)
    comments = list(dedup.values())[:100]
    for node in soup.select("script,style,nav,footer,aside,form,header,[itemprop=comment],.comments,.comment-list,#comments"):
        node.decompose()
    title = metadata(soup, "og:title", "twitter:title") or (soup.title.get_text(" ", strip=True) if soup.title else "제목 미확인")
    body = article_body(soup)
    warnings = []
    if not body:
        warnings.append("기사 본문을 추출하지 못했습니다. 유료·동적 페이지이거나 구조가 달라서일 수 있습니다.")
    if not comments:
        warnings.append("공개 댓글을 찾지 못했습니다. 별도 로그인·스크립트로 불러오는 댓글은 수집되지 않습니다.")
    return {
        "source_type": "news", "url": final_url, "title": title,
        "publisher": metadata(soup, "og:site_name") or urlparse(final_url).hostname,
        "published_at": metadata(soup, "article:published_time", "datePublished"),
        "description": metadata(soup, "og:description", "description")[:3000],
        "body": body, "body_kind": "기사 HTML 본문" if body else "본문 없음",
        "comments": comments, "sampling": ("Guardian Discussion API 최신순 최상위 댓글 최대 100개"
                                      if discussion_comments else "HTML/구조화 데이터에 노출된 댓글 최대 100개"),
        "reported_comment_count": discussion_count, "warnings": warnings,
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }


def extract(url):
    checked = validate_public_url(url)
    if youtube_id(checked):
        return get_youtube(checked)
    host = (urlparse(checked).hostname or "").lower()
    if host.endswith("youtube.com") or host.endswith("youtu.be"):
        raise FetchError("영상 주소 형식을 확인해 주세요.")
    return get_news(checked)
