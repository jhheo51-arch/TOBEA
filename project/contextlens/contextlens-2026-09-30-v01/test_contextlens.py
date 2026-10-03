import unittest
from unittest.mock import patch

from analysis import analyze
from extractors import FetchError, clean_caption, get_news, validate_public_url, youtube_id


class ContextLensTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
