from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String


ROOT = Path(r"C:\Users\Administrator\Documents\ChatGPT\TOBEA")
SOURCE = ROOT / "notes" / "strategic-crm-framework-report.md"
OUTPUT = ROOT / "output" / "pdf" / "strategic-crm-framework-report-2026-09-16-v01.pdf"

PAGE_W, PAGE_H = A4
INK = colors.HexColor("#261F1B")
COFFEE = colors.HexColor("#6F4E37")
COFFEE_DARK = colors.HexColor("#493326")
CREAM = colors.HexColor("#F7F1E8")
SAND = colors.HexColor("#E8D8C5")
TAUPE = colors.HexColor("#A78973")
GREEN = colors.HexColor("#56705B")
LIGHT_GREEN = colors.HexColor("#EAF0EA")
RED = colors.HexColor("#A24D43")
WHITE = colors.white
GRID = colors.HexColor("#D7C8B8")


pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("MalgunBold", r"C:\Windows\Fonts\malgunbd.ttf"))
pdfmetrics.registerFontFamily("Malgun", normal="Malgun", bold="MalgunBold")


def md_inline(text: str) -> str:
    text = html.escape(text, quote=False)
    text = re.sub(
        r"\[([^\]]+)\]\((https?://[^\s\)]+)\)",
        r'<a href="\2" color="#6F4E37"><u>\1</u></a>',
        text,
    )
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r'<font name="Malgun" color="#6F4E37">\1</font>', text)
    text = text.replace("  ", " ")
    return text


styles = getSampleStyleSheet()
BODY = ParagraphStyle(
    "BodyK",
    fontName="Malgun",
    fontSize=9.2,
    leading=15.2,
    textColor=INK,
    spaceAfter=6,
    wordWrap="CJK",
)
H1 = ParagraphStyle(
    "H1K",
    parent=BODY,
    fontName="MalgunBold",
    fontSize=20,
    leading=27,
    textColor=COFFEE_DARK,
    spaceBefore=5,
    spaceAfter=12,
    keepWithNext=True,
)
H2 = ParagraphStyle(
    "H2K",
    parent=BODY,
    fontName="MalgunBold",
    fontSize=15,
    leading=21,
    textColor=COFFEE_DARK,
    spaceBefore=14,
    spaceAfter=8,
    keepWithNext=True,
)
H3 = ParagraphStyle(
    "H3K",
    parent=BODY,
    fontName="MalgunBold",
    fontSize=11.6,
    leading=17,
    textColor=COFFEE,
    spaceBefore=10,
    spaceAfter=5,
    keepWithNext=True,
)
H4 = ParagraphStyle(
    "H4K",
    parent=BODY,
    fontName="MalgunBold",
    fontSize=10,
    leading=15,
    textColor=GREEN,
    spaceBefore=8,
    spaceAfter=4,
    keepWithNext=True,
)
BULLET = ParagraphStyle(
    "BulletK",
    parent=BODY,
    leftIndent=14,
    firstLineIndent=-8,
    bulletIndent=3,
    spaceAfter=3,
)
QUOTE = ParagraphStyle(
    "QuoteK",
    parent=BODY,
    fontName="MalgunBold",
    fontSize=10.2,
    leading=17,
    textColor=COFFEE_DARK,
    backColor=CREAM,
    borderColor=SAND,
    borderWidth=0.8,
    borderPadding=(8, 10, 8, 10),
    leftIndent=8,
    rightIndent=8,
    spaceBefore=5,
    spaceAfter=10,
)
CAPTION = ParagraphStyle(
    "CaptionK",
    parent=BODY,
    fontSize=7.8,
    leading=12,
    textColor=colors.HexColor("#675D56"),
    alignment=TA_CENTER,
    spaceBefore=4,
    spaceAfter=8,
)
TABLE_BODY = ParagraphStyle(
    "TableBodyK",
    parent=BODY,
    fontSize=7.1,
    leading=10.3,
    spaceAfter=0,
)
TABLE_HEAD = ParagraphStyle(
    "TableHeadK",
    parent=TABLE_BODY,
    fontName="MalgunBold",
    textColor=WHITE,
    alignment=TA_CENTER,
)


def page_decoration(canvas, doc):
    canvas.saveState()
    page = canvas.getPageNumber()
    canvas.setFillColor(COFFEE)
    canvas.rect(0, PAGE_H - 8 * mm, PAGE_W, 8 * mm, fill=1, stroke=0)
    if page > 1:
        canvas.setFont("MalgunBold", 7.3)
        canvas.setFillColor(COFFEE_DARK)
        canvas.drawString(18 * mm, PAGE_H - 14 * mm, "전략적 CRM 프레임워크 학습 보고서")
        canvas.setFont("Malgun", 7.3)
        canvas.setFillColor(colors.HexColor("#766A61"))
        canvas.drawRightString(PAGE_W - 18 * mm, PAGE_H - 14 * mm, "Payne & Frow (2005)")
        canvas.setStrokeColor(GRID)
        canvas.line(18 * mm, PAGE_H - 17 * mm, PAGE_W - 18 * mm, PAGE_H - 17 * mm)
    canvas.setStrokeColor(GRID)
    canvas.line(18 * mm, 14 * mm, PAGE_W - 18 * mm, 14 * mm)
    canvas.setFont("Malgun", 7.5)
    canvas.setFillColor(colors.HexColor("#766A61"))
    canvas.drawString(18 * mm, 9.5 * mm, "BA · CRM 논문 학습 자료")
    canvas.drawRightString(PAGE_W - 18 * mm, 9.5 * mm, str(page))
    canvas.restoreState()


class ReportDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=21 * mm,
            bottomMargin=18 * mm,
            title="전략적 CRM 프레임워크 학습 보고서",
            author="OpenAI Codex",
            subject="Payne & Frow (2005) 논문 학습 보고서",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="body",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(PageTemplate(id="main", frames=[frame], onPage=page_decoration))


def arrow(d: Drawing, x1, y1, x2, y2, color=COFFEE, width=1.5):
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=width))
    import math

    a = math.atan2(y2 - y1, x2 - x1)
    size = 5
    pts = []
    for offset in (2.7, -2.7):
        ang = a + 3.14159 + offset / size
        pts.extend([x2 + size * math.cos(ang), y2 + size * math.sin(ang)])
    d.add(Polygon([x2, y2, *pts], fillColor=color, strokeColor=color))


def box(d: Drawing, x, y, w, h, title, fill=CREAM, stroke=SAND, fs=8.2):
    d.add(Rect(x, y, w, h, rx=6, ry=6, fillColor=fill, strokeColor=stroke, strokeWidth=1.2))
    lines = title.split("\n")
    line_h = fs + 2
    start_y = y + h / 2 + (len(lines) - 1) * line_h / 2 - fs * 0.35
    for idx, line in enumerate(lines):
        d.add(
            String(
                x + w / 2,
                start_y - idx * line_h,
                line,
                fontName="MalgunBold",
                fontSize=fs,
                fillColor=COFFEE_DARK,
                textAnchor="middle",
            )
        )


def concept_diagram():
    d = Drawing(500, 305)
    box(d, 18, 235, 100, 42, "사업전략", LIGHT_GREEN)
    box(d, 18, 175, 100, 42, "고객전략", LIGHT_GREEN)
    box(d, 150, 205, 105, 48, "전략 개발", SAND)
    box(d, 295, 205, 105, 48, "가치 창출", SAND)
    box(d, 295, 120, 105, 48, "다채널 통합", CREAM)
    box(d, 150, 120, 105, 48, "정보 관리", CREAM)
    box(d, 150, 34, 105, 48, "성과 평가", LIGHT_GREEN)
    box(d, 295, 34, 170, 48, "고객·직원·주주가치\n비용 및 KPI", LIGHT_GREEN, fs=7.8)
    arrow(d, 118, 256, 150, 236)
    arrow(d, 118, 196, 150, 218)
    arrow(d, 255, 229, 295, 229)
    arrow(d, 347, 205, 347, 168)
    arrow(d, 295, 144, 255, 144)
    arrow(d, 202, 120, 202, 82)
    arrow(d, 255, 58, 295, 58)
    arrow(d, 202, 82, 202, 120, TAUPE, 1.0)
    arrow(d, 202, 168, 202, 205, TAUPE, 1.0)
    arrow(d, 202, 205, 295, 229, TAUPE, 1.0)
    arrow(d, 347, 120, 347, 82, TAUPE, 1.0)
    d.add(String(250, 289, "전략에서 성과까지 이어지는 순환형 CRM 운영체계", fontName="MalgunBold", fontSize=10.5, fillColor=COFFEE_DARK, textAnchor="middle"))
    d.add(String(250, 10, "화살표는 학습용 단순화이며 검증된 인과계수가 아닙니다.", fontName="Malgun", fontSize=7.2, fillColor=colors.HexColor("#766A61"), textAnchor="middle"))
    return d


def operating_diagram():
    d = Drawing(500, 535)
    labels = [
        "1. 사업 비전·시장·경쟁환경 확인",
        "2. 핵심 고객과 세분화 수준 결정",
        "3. 고객 가치제안 설계",
        "4. 획득·유지 경제성과 CLV 검토",
        "5. 고객 접점과 채널 조합 설계",
        "6. 고객 데이터·시스템·분석 연결",
        "7. KPI와 고객·직원·주주 결과 측정",
        "8. 성과를 바탕으로 전략과 실행 개선",
    ]
    ys = [470, 410, 350, 290, 230, 170, 110, 50]
    for i, (label, y) in enumerate(zip(labels, ys)):
        fill = LIGHT_GREEN if i in (0, 6, 7) else CREAM
        box(d, 80, y, 340, 38, label, fill=fill, fs=8.5)
        if i < len(labels) - 1:
            arrow(d, 250, y, 250, ys[i + 1] + 38)
    d.add(Line(420, 69, 463, 69, strokeColor=TAUPE, strokeWidth=1.2))
    d.add(Line(463, 69, 463, 429, strokeColor=TAUPE, strokeWidth=1.2))
    arrow(d, 463, 429, 420, 429, TAUPE, 1.2)
    d.add(String(472, 250, "피드백", fontName="MalgunBold", fontSize=8, fillColor=TAUPE, textAnchor="middle"))
    d.add(String(250, 518, "기업 적용을 위한 학습용 흐름", fontName="MalgunBold", fontSize=11, fillColor=COFFEE_DARK, textAnchor="middle"))
    return d


def research_diagram():
    d = Drawing(500, 270)
    coords = [
        (18, 180, "CRM·관계마케팅\n문헌 종합"),
        (145, 180, "선정 기준 4개"),
        (272, 180, "후보 프로세스\n7개"),
        (399, 180, "패널 평가와\n토론"),
        (399, 80, "핵심 프로세스\n5개"),
        (240, 80, "임원 인터뷰·\n워크숍·파일럿"),
        (80, 80, "반복 수정"),
    ]
    for idx, (x, y, label) in enumerate(coords):
        box(d, x, y, 95, 46, label, fill=LIGHT_GREEN if idx in (0, 4, 6) else CREAM, fs=7.4)
    arrow(d, 113, 203, 145, 203)
    arrow(d, 240, 203, 272, 203)
    arrow(d, 367, 203, 399, 203)
    arrow(d, 446, 180, 446, 126)
    arrow(d, 399, 103, 335, 103)
    arrow(d, 240, 103, 175, 103)
    box(d, 18, 238, 170, 28, "전문가 패널 34명: 기준 2개 추가", fill=SAND, fs=7.2)
    arrow(d, 188, 252, 272, 215, TAUPE, 1.1)
    d.add(String(250, 32, "최종 산출물: Figure 2의 개념 프레임워크", fontName="MalgunBold", fontSize=10, fillColor=COFFEE_DARK, textAnchor="middle"))
    arrow(d, 128, 80, 206, 46, TAUPE, 1.2)
    return d


def build_table(raw_rows, avail_width):
    rows = []
    for ridx, row in enumerate(raw_rows):
        style = TABLE_HEAD if ridx == 0 else TABLE_BODY
        rows.append([Paragraph(md_inline(cell.strip()), style) for cell in row])
    cols = len(rows[0])
    if cols == 2:
        widths = [avail_width * 0.28, avail_width * 0.72]
    elif cols == 4:
        widths = [avail_width * 0.18, avail_width * 0.43, avail_width * 0.18, avail_width * 0.21]
    elif cols == 5:
        widths = [avail_width * 0.17, avail_width * 0.31, avail_width * 0.16, avail_width * 0.14, avail_width * 0.22]
    else:
        widths = [avail_width / cols] * cols
    tbl = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), COFFEE),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("FONTNAME", (0, 0), (-1, 0), "MalgunBold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.45, GRID),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
            ]
        )
    )
    return tbl


def cover_story():
    title = ParagraphStyle("CoverTitle", parent=H1, fontSize=26, leading=34, alignment=TA_LEFT, spaceAfter=12)
    subtitle = ParagraphStyle("CoverSub", parent=BODY, fontSize=12, leading=19, textColor=COFFEE, spaceAfter=16)
    kicker = ParagraphStyle("Kicker", parent=BODY, fontName="MalgunBold", fontSize=9, textColor=GREEN, spaceAfter=10)
    takeaway = ParagraphStyle("Takeaway", parent=QUOTE, fontSize=11, leading=19)
    items = [
        Spacer(1, 25 * mm),
        Paragraph("PAPER LEARNING REPORT · BA / CRM", kicker),
        Paragraph("전략적 CRM 프레임워크<br/>학습 보고서", title),
        Paragraph("Payne &amp; Frow (2005) 논문을 구조·선수 개념·근거 검증의 세 관점으로 읽기", subtitle),
        Spacer(1, 6 * mm),
    ]
    cards = [[
        Paragraph("<b>전략 개발</b>", TABLE_HEAD),
        Paragraph("<b>가치 창출</b>", TABLE_HEAD),
        Paragraph("<b>다채널 통합</b>", TABLE_HEAD),
        Paragraph("<b>정보 관리</b>", TABLE_HEAD),
        Paragraph("<b>성과 평가</b>", TABLE_HEAD),
    ]]
    card_table = Table(cards, colWidths=[33 * mm] * 5, rowHeights=[18 * mm])
    card_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COFFEE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 1, WHITE),
    ]))
    items.extend([
        card_table,
        Spacer(1, 14 * mm),
        Paragraph("CRM 요구사항은 기능 목록이 아니라, 사업전략과 고객전략을 가치·접점·데이터·성과로 연결하는 일에서 시작합니다.", takeaway),
        Spacer(1, 10 * mm),
        Paragraph("작성일 2026-09-16 · 원문 기준 Journal of Marketing 69(4), pp.167-176", CAPTION),
        PageBreak(),
    ])
    return items


def parse_markdown(text, avail_width):
    story = []
    lines = text.splitlines()
    i = 0
    diagram_index = 0
    paragraph_buffer = []

    def flush_paragraph():
        nonlocal paragraph_buffer
        if paragraph_buffer:
            joined = " ".join(x.strip() for x in paragraph_buffer).strip()
            if joined:
                story.append(Paragraph(md_inline(joined), BODY))
            paragraph_buffer = []

    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()

        if stripped.startswith("# "):
            i += 1
            continue

        if stripped.startswith("```mermaid"):
            flush_paragraph()
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                i += 1
            diagram_index += 1
            diagram = [concept_diagram(), operating_diagram(), research_diagram()][diagram_index - 1]
            story.extend([Spacer(1, 4), diagram, Spacer(1, 8)])
            i += 1
            continue

        if stripped == "---":
            flush_paragraph()
            story.append(Spacer(1, 3))
            i += 1
            continue

        if stripped.startswith("|"):
            flush_paragraph()
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            rows = []
            for idx, raw in enumerate(table_lines):
                cells = [c.strip() for c in raw.strip("|").split("|")]
                if idx == 1 and all(re.fullmatch(r":?-{3,}:?", c) for c in cells):
                    continue
                rows.append(cells)
            if rows:
                story.extend([build_table(rows, avail_width), Spacer(1, 8)])
            continue

        heading_match = re.match(r"^(#{2,4})\s+(.+)$", stripped)
        if heading_match:
            flush_paragraph()
            level = len(heading_match.group(1))
            style = {2: H2, 3: H3, 4: H4}[level]
            heading_text = heading_match.group(2)
            if (
                heading_text.startswith("4. Concept Map")
                or heading_text.startswith("5. Method Diagram")
                or heading_text.startswith("저자들이 프레임워크를 만든 연구 흐름")
            ):
                story.append(PageBreak())
            story.append(Paragraph(md_inline(heading_text), style))
            i += 1
            continue

        if stripped.startswith(">"):
            flush_paragraph()
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip().lstrip(">").strip())
                i += 1
            story.append(Paragraph(md_inline(" ".join(quote_lines)), QUOTE))
            continue

        bullet_match = re.match(r"^[-*]\s+(.+)$", stripped)
        number_match = re.match(r"^(\d+)\.\s+(.+)$", stripped)
        if bullet_match or number_match:
            flush_paragraph()
            if bullet_match:
                prefix, content = "•", bullet_match.group(1)
            else:
                prefix, content = number_match.group(1) + ".", number_match.group(2)
            story.append(Paragraph(f"{prefix} {md_inline(content)}", BULLET))
            i += 1
            continue

        if not stripped:
            flush_paragraph()
            i += 1
            continue

        paragraph_buffer.append(stripped)
        i += 1

    flush_paragraph()
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    source = SOURCE.read_text(encoding="utf-8")
    doc = ReportDoc(str(OUTPUT))
    story = cover_story()
    story += parse_markdown(source, doc.width)
    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    main()
