"""Local, anonymous usability sessions for the ContextLens evidence task."""

from datetime import datetime
from statistics import median
from uuid import uuid4
import json
import re

from case_store import connect, get_snapshot, now


TASK_SECONDS = 600
VARIANTS = {"before", "after"}
REVIEW_STATES = {"pending", "valid", "invalid"}


def setup(db):
    db.execute("""CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY, variant TEXT NOT NULL, snapshot_id INTEGER NOT NULL,
        started_at TEXT NOT NULL, finished_at TEXT,
        evidence_ids_json TEXT NOT NULL DEFAULT '[]', counterexample_id TEXT NOT NULL DEFAULT '',
        hypothesis TEXT NOT NULL DEFAULT '', review_status TEXT NOT NULL DEFAULT 'pending',
        unsupported_claim INTEGER NOT NULL DEFAULT 0, reviewer_note TEXT NOT NULL DEFAULT ''
    )""")


def valid_id(session_id):
    if not isinstance(session_id, str) or not re.fullmatch(r"[0-9a-f]{32}", session_id):
        raise ValueError("시험 기록 번호가 올바르지 않습니다.")
    return session_id


def row_to_dict(row):
    if row is None:
        return None
    data = dict(row)
    data["evidence_ids"] = json.loads(data.pop("evidence_ids_json"))
    data["unsupported_claim"] = bool(data["unsupported_claim"])
    if data["finished_at"]:
        started = datetime.fromisoformat(data["started_at"])
        finished = datetime.fromisoformat(data["finished_at"])
        data["seconds"] = max(0, round((finished - started).total_seconds()))
    else:
        data["seconds"] = None
    data["task_complete"] = (len(set(data["evidence_ids"])) >= 2
                             and bool(data["counterexample_id"])
                             and data["counterexample_id"] not in data["evidence_ids"]
                             and len(data["hypothesis"].strip()) >= 20)
    data["within_time"] = data["seconds"] is not None and data["seconds"] <= TASK_SECONDS
    data["valid_success"] = (data["review_status"] == "valid" and data["task_complete"]
                             and data["within_time"] and not data["unsupported_claim"])
    return data


def start_session(variant, snapshot_id):
    if variant not in VARIANTS:
        raise ValueError("시험 방식을 확인해 주세요.")
    try:
        snapshot_id = int(snapshot_id)
    except (ValueError, TypeError):
        raise ValueError("시험에 사용할 분석 자료를 선택해 주세요.") from None
    snapshot = get_snapshot(snapshot_id)
    if snapshot is None or len(snapshot["analysis"].get("comments", [])) < 3:
        raise ValueError("댓글이 3개 이상인 분석 자료를 선택해 주세요.")
    session_id = uuid4().hex
    with connect() as db:
        setup(db)
        db.execute("INSERT INTO study_sessions(id,variant,snapshot_id,started_at) VALUES(?,?,?,?)",
                   (session_id, variant, snapshot_id, now()))
    return get_session(session_id)


def get_session(session_id):
    valid_id(session_id)
    with connect() as db:
        setup(db)
        row = db.execute("SELECT * FROM study_sessions WHERE id=?", (session_id,)).fetchone()
    return row_to_dict(row)


def finish_session(session_id, evidence_ids, counterexample_id, hypothesis):
    session = get_session(session_id)
    if session is None:
        raise ValueError("시험 기록을 찾지 못했습니다.")
    if session["finished_at"]:
        raise ValueError("이미 종료한 시험입니다.")
    if (not isinstance(evidence_ids, list) or len(evidence_ids) > 2
            or any(not isinstance(item, str) for item in evidence_ids)
            or not isinstance(counterexample_id, str)
            or not isinstance(hypothesis, str) or len(hypothesis) > 1500):
        raise ValueError("시험 답변 형식을 확인해 주세요.")
    allowed = {str(item["id"]) for item in get_snapshot(session["snapshot_id"])["analysis"]["comments"]}
    if any(item not in allowed for item in evidence_ids) or (counterexample_id and counterexample_id not in allowed):
        raise ValueError("현재 분석 자료의 댓글만 선택할 수 있습니다.")
    with connect() as db:
        setup(db)
        db.execute("""UPDATE study_sessions SET finished_at=?,evidence_ids_json=?,
            counterexample_id=?,hypothesis=? WHERE id=?""",
            (now(), json.dumps(list(dict.fromkeys(evidence_ids)), ensure_ascii=False),
             counterexample_id, hypothesis.strip(), session_id))
    return get_session(session_id)


def review_session(session_id, status, unsupported_claim=False, note=""):
    session = get_session(session_id)
    if session is None or not session["finished_at"]:
        raise ValueError("종료된 시험 기록을 먼저 확인해 주세요.")
    if status not in REVIEW_STATES or not isinstance(unsupported_claim, bool) or not isinstance(note, str) or len(note) > 1500:
        raise ValueError("검토 기록 형식을 확인해 주세요.")
    with connect() as db:
        setup(db)
        db.execute("""UPDATE study_sessions SET review_status=?,unsupported_claim=?,reviewer_note=?
            WHERE id=?""", (status, int(unsupported_claim), note.strip(), session_id))
    return get_session(session_id)


def all_sessions():
    with connect() as db:
        setup(db)
        rows = db.execute("SELECT * FROM study_sessions ORDER BY started_at DESC LIMIT 200").fetchall()
    return [row_to_dict(row) for row in rows]


def cohort_summary(rows):
    result = {}
    for variant in ("before", "after"):
        group = [row for row in rows if row["variant"] == variant]
        reviewed = [row for row in group if row["finished_at"] and row["review_status"] != "pending"]
        durations = [row["seconds"] for row in reviewed]
        result[variant] = {
            "started": len(group), "finished": sum(bool(row["finished_at"]) for row in group),
            "reviewed": len(reviewed), "success": sum(row["valid_success"] for row in reviewed),
            "unsupported_claims": sum(row["unsupported_claim"] for row in reviewed),
            "median_seconds": median(durations) if durations else None,
        }
    return result


def dashboard(snapshot_id=None):
    if snapshot_id is not None:
        try:
            snapshot_id = int(snapshot_id)
        except (ValueError, TypeError):
            raise ValueError("비교할 분석 자료를 선택해 주세요.") from None
    rows = [row for row in all_sessions() if snapshot_id is None or row["snapshot_id"] == snapshot_id]
    snapshots = {}
    for row in rows:
        snap_id = row["snapshot_id"]
        if snap_id not in snapshots:
            snapshots[snap_id] = get_snapshot(snap_id)
        snap = snapshots[snap_id]
        row["source_title"] = snap["source"].get("title", "제목 미확인") if snap else "자료 미확인"
        comments = {str(item["id"]): item["text"] for item in snap["analysis"].get("comments", [])} if snap else {}
        selected = list(row["evidence_ids"]) + ([row["counterexample_id"]] if row["counterexample_id"] else [])
        row["selected_comments"] = [{"id": item, "text": comments.get(item, "원문 미확인")[:450]}
                                    for item in selected]
    return {"sessions": rows, "cohorts": cohort_summary(rows), "target_per_cohort": 5,
            "snapshot_id": snapshot_id,
            "task_seconds": TASK_SECONDS,
            "task": "10분 안에 댓글 근거 2개와 반례 1개를 골라 20자 이상의 개선 가설을 작성하기",
            "change": "제안 카드에서 해당 근거 댓글로 바로 이동하는 버튼"}


def report_markdown(snapshot_id=None):
    data = dashboard(snapshot_id)
    before, after = data["cohorts"]["before"], data["cohorts"]["after"]
    source = data["sessions"][0]["source_title"] if data["sessions"] else "선택한 자료에 아직 시험 기록 없음"
    lines = ["# ContextLens 사용성 개선 사례", "", "## 문제와 변경", "",
             f"- 분석 자료: {source}",
             f"- 과제: {data['task']}", f"- 변경: {data['change']}",
             "- 비교 조건: 같은 저장된 분석 자료를 사용하고, 기존 방식은 근거 댓글 바로 이동 버튼을 숨김.",
             "", "## 측정 정의", "",
             "- 완료: 서로 다른 근거 댓글 2개, 별도 반례 댓글 1개, 20자 이상 개선 가설을 10분 안에 제출하고 검토자가 타당하다고 판정.",
             "- 보조 지표: 종료까지 걸린 시간의 중앙값.",
             "- 품질 점검: 표본의 댓글 수를 전체 고객 비율로 일반화하는 등 근거 없는 주장을 별도로 표시.",
             "", "## 관찰 결과", ""]
    for name, group in (("변경 전", before), ("변경 후", after)):
        rate = f"{group['success']}/{group['started']} (시작 기준)" if group["reviewed"] else "아직 없음"
        duration = f"{group['median_seconds']}초" if group["median_seconds"] is not None else "아직 없음"
        lines.append(f"- {name}: 시작 {group['started']}명, 완료 {group['finished']}명, 검토 {group['reviewed']}명, 성공 {rate}, 중앙 소요 시간 {duration}, 근거 없는 주장 {group['unsupported_claims']}건.")
    lines += ["", "## 참가자 관찰 메모", ""]
    notes = [row for row in data["sessions"] if row["finished_at"] and row["reviewer_note"]]
    if notes:
        for row in notes:
            variant = "변경 전" if row["variant"] == "before" else "변경 후"
            lines.append(f"- {variant} · 익명 기록 {row['id'][:8]}: {row['reviewer_note']}")
    else:
        lines.append("- 아직 기록된 관찰 메모가 없습니다.")
    lines += ["", "## 해석의 한계", "",
              "- 참가자별 답변 타당성은 검토자가 판단하며, 자동 선택 건수만으로 성공을 확정하지 않는다.",
              "- 각 방식에서 최소 5명씩 검토되기 전에는 비교를 잠정 관찰로만 다룬다.",
              "- 작은 비무작위 표본은 개선 효과의 인과관계를 입증하지 않는다. 참가자 구성과 과제 숙련도 차이를 함께 살핀다.",
              "- 참가자 이름·연락처는 저장하지 않으며, 모든 기록은 이 컴퓨터에만 보관한다.", ""]
    return "\n".join(lines)
