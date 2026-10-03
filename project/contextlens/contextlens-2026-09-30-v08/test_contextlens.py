import unittest
from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory

from analysis import analyze
from case_store import add_snapshot, export_case, get_case, list_cases, update_case
from extractors import FetchError, clean_caption, get_news, validate_public_url, youtube_id
from language import language_hint
from study_store import cohort_summary, dashboard, finish_session, get_session, report_markdown, review_session, start_session


class ContextLensTests(unittest.TestCase):
    def test_anonymous_usability_session_requires_human_review(self):
        with TemporaryDirectory() as directory, patch("case_store.DB_PATH", Path(directory) / "cases.sqlite3"):
            source = {"source_type": "manual", "url": "", "title": "사용성 과제",
                      "body": "사용법과 안내를 설명합니다.", "body_kind": "직접 입력", "warnings": [],
                      "comments": [{"id": "a", "text": "설명이 이해돼요"},
                                   {"id": "b", "text": "안내가 도움이 됐어요"},
                                   {"id": "c", "text": "하지만 링크가 안 열려요"}]}
            snapshot = add_snapshot(source, analyze(source))["snapshot_id"]
            session = start_session("before", snapshot)
            self.assertEqual(session["review_status"], "pending")
            finished = finish_session(session["id"], ["a", "b"], "c",
                                      "설명은 도움이 되지만 링크 문제를 먼저 고쳐야 합니다.")
            self.assertTrue(finished["task_complete"])
            self.assertFalse(finished["valid_success"])
            reviewed = review_session(session["id"], "valid", False, "근거와 반례가 구분됨")
            self.assertTrue(reviewed["valid_success"])
            self.assertEqual(cohort_summary([reviewed])["before"]["success"], 1)
            another = dict(source, title="다른 자료", body="다른 본문")
            other_snapshot = add_snapshot(another, analyze(another))["snapshot_id"]
            start_session("after", other_snapshot)
            self.assertEqual(dashboard(snapshot)["cohorts"]["after"]["started"], 0)
            self.assertEqual(dashboard(other_snapshot)["cohorts"]["before"]["started"], 0)
            self.assertIn("근거와 반례가 구분됨", report_markdown(snapshot))
            self.assertNotIn("다른 자료", report_markdown(snapshot))
            with self.assertRaises(ValueError):
                finish_session(session["id"], ["a"], "b", "다시 제출")

    def test_news_needs_use_article_specific_actions(self):
        source = {"source_type": "news", "url": "https://example.com/article", "title": "기사",
                  "body": "기사의 주장과 배경을 다룹니다.", "body_kind": "기사 본문", "warnings": [],
                  "comments": [{"id": "1", "text": "이 통계 출처는 어디인가요?"},
                               {"id": "2", "text": "출처와 원자료를 보고 싶어요."}]}
        needs = analyze(source)["viewer_needs"]
        self.assertTrue(any(item["key"] == "source" for item in needs))
        self.assertFalse(any(item["key"] == "repeat" for item in needs))

    def test_general_video_needs_do_not_recommend_songs(self):
        source = {"source_type": "youtube", "url": "https://youtu.be/abc12345678", "title": "사용법 안내",
                  "body": "제품 사용법과 자주 묻는 질문을 안내합니다.", "body_kind": "자동 자막", "warnings": [],
                  "comments": [{"id": "1", "text": "자막이 안 보여요"}, {"id": "2", "text": "자막 오류를 고쳐주세요"}]}
        needs = analyze(source)["viewer_needs"]
        self.assertTrue(any(item["key"] == "access" for item in needs))
        self.assertFalse(any("곡별" in item["offer"] for item in needs))

    def test_case_snapshots_and_review_persist(self):
        with TemporaryDirectory() as directory, patch("case_store.DB_PATH", Path(directory) / "cases.sqlite3"):
            source = {"source_type": "manual", "url": "", "title": "검증 사례", "body": "본문을 읽습니다.",
                      "body_kind": "직접 입력", "comments": [{"id": "a", "text": "왜 그런가요?"}], "warnings": []}
            analysis = analyze(source)
            first = add_snapshot(source, analysis)
            add_snapshot(source, analysis)
            update_case(first["case_key"], {"brief": {"customer": "처음 읽는 사람"},
                       "annotations": {"a": {"verdict": "counterexample"}},
                       "plan": {"status": "planned"}, "notes": {"note-context": "직접 읽음"}})
            record = get_case(first["case_key"])
            self.assertEqual(len(record["snapshots"]), 2)
            self.assertEqual(record["brief"]["customer"], "처음 읽는 사람")
            self.assertEqual(record["annotations"]["a"]["verdict"], "counterexample")
            self.assertEqual(len(export_case(first["case_key"])["full_snapshots"]), 2)
            self.assertEqual(list_cases()[0]["snapshot_count"], 2)

    def test_youtube_links_and_private_addresses(self):
        self.assertEqual(youtube_id("https://youtu.be/wtLJPvx7-ys"), "wtLJPvx7-ys")
        self.assertEqual(youtube_id("https://www.youtube.com/shorts/wtLJPvx7-ys"), "wtLJPvx7-ys")
        with self.assertRaises(FetchError):
            validate_public_url("http://127.0.0.1/private")

    def test_caption_lines_join_into_readable_sentences(self):
        vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nThis is the first line.\n\n00:00:02.000 --> 00:00:04.000\nThis is the second line."
        self.assertEqual(clean_caption(vtt, "vtt"), "This is the first line. This is the second line.")

    @patch("extractors.read_public_url")
    def test_article_and_embedded_comment_are_separated(self, read_url):
        page = '''<html><head><meta property="og:title" content="Test article"></head><body>
        <article><p>The article explains how a new online help flow guides people from a failed payment to a clear next step and status page.</p>
        <p>The service team says it will test whether the explanation helps people finish the task without additional support.</p></article>
        <div class="comments"><div class="comment-item" data-comment-id="a1"><p class="comment-text">I still cannot find the status page after my payment fails.</p></div></div>
        </body></html>'''
        read_url.return_value = (page, "text/html", "https://example.com/article")
        source = get_news("https://example.com/article")
        self.assertIn("online help flow", source["body"])
        self.assertNotIn("I still cannot", source["body"])
        self.assertEqual(len(source["comments"]), 1)

    def test_missing_body_does_not_produce_context_claim(self):
        source = {"title": "A video", "body": "", "body_kind": "자막 없음", "comments": [{"id": "1", "text": "Why did this fail?"}], "warnings": []}
        result = analyze(source)
        self.assertFalse(result["context"]["available"])
        self.assertEqual(result["comments"][0]["context_link"], "본문 미확인")
        self.assertFalse(result["improvement_candidates"])

    def test_korean_case_particle_and_cannot_find_signal(self):
        source = {
            "title": "처리 상태 안내", "body": "고객은 처리 상태를 화면에서 확인할 수 있습니다.",
            "body_kind": "직접 입력", "warnings": [],
            "comments": [
                {"id": "a", "text": "처리 상태 화면을 못 찾겠어요."},
                {"id": "b", "text": "저도 상태를 확인할 수 없어요."},
            ],
        }
        result = analyze(source)
        self.assertEqual(result["type_counts"]["불편·문제"], 2)
        self.assertTrue(any(theme["term"] == "상태" and theme["count"] == 2 for theme in result["themes"]))

    def test_short_context_and_unavailable_screen_signal(self):
        source = {
            "title": "신청 안내", "body": "신청 상태를 화면에서 확인합니다. 고객센터에 문의할 수도 있습니다.",
            "body_kind": "직접 입력", "warnings": [],
            "comments": [{"id": "a", "text": "신청 상태가 안 보여요."}],
        }
        result = analyze(source)
        self.assertTrue(result["context"]["highlights"])
        self.assertEqual(result["type_counts"]["불편·문제"], 1)

    def test_two_sorts_deduplicate_and_exclude_notices_from_needs(self):
        source = {
            "source_type": "youtube", "title": "트로트 메들리", "description": "댓글 이벤트 참여 기간 안내",
            "body": "노래를 부릅니다.", "body_kind": "자동 자막", "warnings": [],
            "samples": {"latest": ["a", "b", "notice"], "popular": ["b", "c", "notice"]},
            "comments": [
                {"id": "a", "text": "오늘도 다시 들으러 왔어요"},
                {"id": "b", "text": "매일 반복 재생 중입니다"},
                {"id": "c", "text": "다시 듣기 좋아요"},
                {"id": "notice", "text": "[공지] 매일 반복 재생하세요", "is_pinned": True},
            ],
        }
        result = analyze(source)
        self.assertEqual(result["sampling_summary"]["overlap"], 2)
        self.assertEqual(result["sampling_summary"]["unique"], 4)
        self.assertEqual(result["notice_count"], 1)
        repeat = next(item for item in result["viewer_needs"] if item["key"] == "repeat")
        self.assertEqual((repeat["count"], repeat["latest_count"], repeat["popular_count"]), (3, 2, 2))

    def test_urls_and_incidental_phrases_do_not_imply_questions_or_requests(self):
        source = {
            "source_type": "youtube", "title": "노래 메들리", "description": "", "body": "노래 가사",
            "body_kind": "자동 자막", "warnings": [], "samples": {"latest": ["a", "b", "c"]},
            "comments": [
                {"id": "a", "text": "https://example.com/watch?code=123 노래 좋아요"},
                {"id": "b", "text": "용두산에 가보고 싶어요"},
                {"id": "c", "text": "이 무대 끝내주네요"},
            ],
        }
        result = analyze(source)
        self.assertNotIn("질문형 표현", result["comments"][0]["labels"])
        self.assertFalse(any(item["key"] == "request" for item in result["viewer_needs"]))

    def test_language_hints_are_conservative(self):
        self.assertEqual(language_hint("이 노래 좋아요")["code"], "ko")
        self.assertEqual(language_hint("I love this song")["code"], "en")
        self.assertEqual(language_hint("노래 amazing performance")["code"], "ko_en")
        self.assertEqual(language_hint("素晴らしい歌です")["code"], "ja")
        self.assertEqual(language_hint("太好听了")["code"], "han")
        self.assertEqual(language_hint("Me encanta esta canción")["code"], "latin")
        self.assertEqual(language_hint("Прекрасная песня")["code"], "other")
        self.assertEqual(language_hint("https://example.com/a?b=1 ❤❤")["code"], "und")

    def test_english_needs_and_other_languages_remain_visible(self):
        rows = [
            ("a", "I listen again every morning"),
            ("b", "On repeat, love this song"),
            ("c", "この曲が大好きです"),
            ("d", "Me encanta esta canción"),
            ("e", "太好听了"),
            ("f", "Why is the full song missing?"),
        ]
        source = {
            "source_type": "youtube", "title": "Music song", "description": "", "body": "A music song",
            "body_kind": "제공 자막", "warnings": [],
            "samples": {"latest": [item[0] for item in rows]},
            "comments": [{"id": key, "text": value} for key, value in rows],
        }
        result = analyze(source)
        self.assertEqual(result["language_summary"]["covered"], 3)
        self.assertEqual(result["language_summary"]["review_needed"], 3)
        self.assertTrue(result["language_summary"]["priority_review_needed"])
        self.assertEqual(result["theme_denominator"], 3)
        self.assertEqual(next(item for item in result["viewer_needs"] if item["key"] == "repeat")["count"], 2)
        self.assertIn("질문형 표현", result["comments"][-1]["labels"])
        self.assertEqual(result["comments"][2]["text"], "この曲が大好きです")
        self.assertEqual(result["comments"][2]["labels"], ["언어 검토 필요"])


if __name__ == "__main__":
    unittest.main()
