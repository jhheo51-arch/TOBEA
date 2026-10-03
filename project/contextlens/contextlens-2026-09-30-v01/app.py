"""ContextLens local-only web app. Run: python app.py"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import urlparse

from analysis import analyze
from extractors import FetchError, extract


ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
MAX_REQUEST = 600_000
FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format_string, *args):
        # Do not put URLs or comment text in local server logs.
        pass

    def send_json(self, status, payload):
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        route = urlparse(self.path).path
        if route not in FILES:
            self.send_error(404)
            return
        filename, content_type = FILES[route]
        data = (STATIC / filename).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path not in {"/api/extract", "/api/analyze"}:
            self.send_json(404, {"error": "요청한 기능을 찾을 수 없습니다."})
            return
        origin = self.headers.get("Origin")
        if origin:
            host = urlparse(origin).hostname
            if host not in {"127.0.0.1", "localhost"}:
                self.send_json(403, {"error": "로컬 화면에서만 요청할 수 있습니다."})
                return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= MAX_REQUEST:
                self.send_json(413, {"error": "입력 자료가 너무 큽니다."})
                return
            request = json.loads(self.rfile.read(size))
            if not isinstance(request, dict):
                raise ValueError("요청 형식이 올바르지 않습니다.")
            if self.path == "/api/extract":
                url = request.get("url", "")
                if not isinstance(url, str) or len(url) > 2048:
                    raise ValueError("링크를 확인해 주세요.")
                result = extract(url)
                self.send_json(200, result)
            else:
                source = request.get("source")
                if not isinstance(source, dict):
                    raise ValueError("분석할 자료가 없습니다.")
                comments = source.get("comments")
                if not isinstance(comments, list) or len(comments) > 100 or len(source.get("body", "")) > 120_000:
                    raise ValueError("분석 가능한 자료 크기를 넘었습니다.")
                self.send_json(200, analyze(source))
        except (FetchError, ValueError, json.JSONDecodeError) as exc:
            self.send_json(400, {"error": str(exc)})
        except Exception:
            self.send_json(500, {"error": "분석 중 오류가 났습니다. 링크 접근 상태를 확인해 주세요."})


if __name__ == "__main__":
    import sys
    import threading
    import webbrowser
    address = ("127.0.0.1", 8765)
    server = ThreadingHTTPServer(address, Handler)
    print(f"ContextLens 실행 중: http://{address[0]}:{address[1]}")
    if "--open" in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(f"http://{address[0]}:{address[1]}")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
