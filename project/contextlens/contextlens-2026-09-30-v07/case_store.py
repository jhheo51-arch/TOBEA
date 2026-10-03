"""Local SQLite research cases and dated analysis snapshots."""

from datetime import datetime, timezone
from contextlib import contextmanager
from hashlib import sha256
import json
from pathlib import Path
import re
import sqlite3


DB_PATH = Path(__file__).resolve().parent.parent / "contextlens-data" / "cases.sqlite3"
FIELDS = {"brief", "annotations", "plan", "notes"}


def now():
    return datetime.now(timezone.utc).isoformat()


def key_for(source):
    identity = source.get("url") or f"manual:{source.get('title', '')}"
    return sha256(identity.strip().encode("utf-8")).hexdigest()


def validate_key(key):
    if not isinstance(key, str) or not re.fullmatch(r"[0-9a-f]{64}", key):
        raise ValueError("분석 기록 주소가 올바르지 않습니다.")
    return key


@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS cases (
            case_key TEXT PRIMARY KEY, title TEXT NOT NULL, url TEXT NOT NULL,
            source_type TEXT NOT NULL, brief_json TEXT NOT NULL DEFAULT '{}',
            annotations_json TEXT NOT NULL DEFAULT '{}', plan_json TEXT NOT NULL DEFAULT '{}',
            notes_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT, case_key TEXT NOT NULL,
            captured_at TEXT NOT NULL, source_json TEXT NOT NULL, analysis_json TEXT NOT NULL,
            comment_count INTEGER NOT NULL, need_keys_json TEXT NOT NULL,
            FOREIGN KEY(case_key) REFERENCES cases(case_key)
        );
        CREATE INDEX IF NOT EXISTS snapshots_case_date ON snapshots(case_key, id DESC);
    """)
    try:
        with db:
            yield db
    finally:
        db.close()


def add_snapshot(source, analysis):
    key = key_for(source)
    captured = source.get("collected_at") or now()
    with connect() as db:
        db.execute("""INSERT INTO cases(case_key,title,url,source_type,updated_at)
            VALUES(?,?,?,?,?) ON CONFLICT(case_key) DO UPDATE SET
            title=excluded.title,url=excluded.url,source_type=excluded.source_type,
            updated_at=excluded.updated_at""",
            (key, str(source.get("title") or "제목 미확인")[:300],
             str(source.get("url") or "")[:2048], str(source.get("source_type") or "manual")[:30], now()))
        cursor = db.execute("""INSERT INTO snapshots
            (case_key,captured_at,source_json,analysis_json,comment_count,need_keys_json)
            VALUES(?,?,?,?,?,?)""",
            (key, captured, json.dumps(source, ensure_ascii=False),
             json.dumps(analysis, ensure_ascii=False), analysis.get("comment_count", 0),
             json.dumps([item["key"] for item in analysis.get("viewer_needs", [])], ensure_ascii=False)))
        return {"case_key": key, "snapshot_id": cursor.lastrowid}


def get_case(key):
    validate_key(key)
    with connect() as db:
        row = db.execute("SELECT * FROM cases WHERE case_key=?", (key,)).fetchone()
        if row is None:
            return None
        snapshots = db.execute("""SELECT id,captured_at,comment_count,need_keys_json
            FROM snapshots WHERE case_key=? ORDER BY id DESC""", (key,)).fetchall()
    return {
        "key": key, "title": row["title"], "url": row["url"],
        "source_type": row["source_type"], "updated_at": row["updated_at"],
        "brief": json.loads(row["brief_json"]),
        "annotations": json.loads(row["annotations_json"]),
        "plan": json.loads(row["plan_json"]),
        "notes": json.loads(row["notes_json"]),
        "snapshots": [{"id": snap["id"], "captured_at": snap["captured_at"],
                       "comment_count": snap["comment_count"],
                       "need_keys": json.loads(snap["need_keys_json"])} for snap in snapshots],
    }


def list_cases():
    with connect() as db:
        rows = db.execute("""SELECT c.case_key,c.title,c.url,c.updated_at,
            COUNT(s.id) AS snapshot_count,MAX(s.id) AS latest_snapshot_id
            FROM cases c LEFT JOIN snapshots s ON s.case_key=c.case_key
            GROUP BY c.case_key ORDER BY c.updated_at DESC LIMIT 30""").fetchall()
    return [dict(row) for row in rows]


def get_snapshot(snapshot_id):
    with connect() as db:
        row = db.execute("SELECT * FROM snapshots WHERE id=?", (int(snapshot_id),)).fetchone()
    if row is None:
        return None
    return {"id": row["id"], "case_key": row["case_key"],
            "captured_at": row["captured_at"],
            "source": json.loads(row["source_json"]),
            "analysis": json.loads(row["analysis_json"])}


def update_case(key, changes):
    validate_key(key)
    if not isinstance(changes, dict) or not changes or set(changes) - FIELDS:
        raise ValueError("저장할 분석 항목을 확인해 주세요.")
    if any(not isinstance(value, dict) or len(json.dumps(value, ensure_ascii=False)) > 150_000
           for value in changes.values()):
        raise ValueError("분석 기록이 너무 큽니다.")
    assignments = ", ".join(f"{field}_json=?" for field in changes)
    values = [json.dumps(value, ensure_ascii=False) for value in changes.values()]
    with connect() as db:
        cursor = db.execute(f"UPDATE cases SET {assignments}, updated_at=? WHERE case_key=?",
                            (*values, now(), key))
        if not cursor.rowcount:
            raise ValueError("저장할 분석 사례를 찾지 못했습니다.")
    return get_case(key)


def export_case(key):
    record = get_case(key)
    if record is None:
        return None
    with connect() as db:
        rows = db.execute("SELECT id FROM snapshots WHERE case_key=? ORDER BY id", (key,)).fetchall()
    record["full_snapshots"] = [get_snapshot(row["id"]) for row in rows]
    return record
