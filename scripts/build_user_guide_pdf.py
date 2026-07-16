from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "gebruikershandleiding-profo-aankoopbeheer.md"
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT = OUTPUT_DIR / "PROFO_Aankoopbeheer_gebruikershandleiding.pdf"
LOGO = ROOT / "public" / "assets" / "profo-logo.png"

PROFO_RED = colors.HexColor("#B61917")
PROFO_RED_DARK = colors.HexColor("#891811")
PROFO_RED_SOFT = colors.HexColor("#F5DEDD")
PROFO_ACCENT = colors.HexColor("#CE5F5A")
TEXT = colors.HexColor("#2F2929")
MUTED = colors.HexColor("#675F5F")
PAGE_BG = colors.HexColor("#F9F9F9")
LINE = colors.HexColor("#E6D2D1")


def escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def inline_markup(text: str) -> str:
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r"<font name='Helvetica-Oblique'>\1</font>", text)
    url_pattern = r"(https?://[^\s<]+)"
    text = re.sub(url_pattern, r"<font color='#891811'><u>\1</u></font>", text)
    return text


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=30,
            textColor=PROFO_RED,
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=MUTED,
            spaceAfter=18,
        ),
        "h2": ParagraphStyle(
            "Heading2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=PROFO_RED_DARK,
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=1,
        ),
        "h3": ParagraphStyle(
            "Heading3",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=PROFO_RED_DARK,
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=1,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.9,
            leading=12.4,
            textColor=TEXT,
            spaceAfter=4.5,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.4,
            leading=11.5,
            textColor=MUTED,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=12.2,
            textColor=TEXT,
            leftIndent=0,
        ),
        "cover_box": ParagraphStyle(
            "CoverBox",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=PROFO_RED_DARK,
            alignment=TA_CENTER,
        ),
    }


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(18 * mm, 17 * mm, width - 18 * mm, 17 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 11 * mm, "PROFO Aankoopbeheer - gebruikershandleiding")
    canvas.drawRightString(width - 18 * mm, 11 * mm, f"Pagina {doc.page}")
    canvas.restoreState()


def make_cover(styles):
    logo = Image(str(LOGO), width=58 * mm, height=23 * mm)
    title = Paragraph("PROFO Aankoopbeheer", styles["title"])
    subtitle = Paragraph("Gebruikershandleiding voor medewerkers", styles["subtitle"])
    link = Paragraph(
        "Startadres: <font color='#891811'><u>https://aankoopbeheer-profo.vercel.app/</u></font>",
        styles["cover_box"],
    )
    table = Table(
        [[logo], [Spacer(1, 12)], [title], [subtitle], [link]],
        colWidths=[160 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 4), (0, 4), PROFO_RED_SOFT),
                ("BOX", (0, 4), (0, 4), 0.8, LINE),
                ("TOPPADDING", (0, 4), (0, 4), 12),
                ("BOTTOMPADDING", (0, 4), (0, 4), 12),
                ("LEFTPADDING", (0, 4), (0, 4), 16),
                ("RIGHTPADDING", (0, 4), (0, 4), 16),
            ]
        )
    )
    return [
        Spacer(1, 45 * mm),
        table,
        Spacer(1, 22 * mm),
        Paragraph(
            "Deze handleiding is bedoeld als korte, praktische startgids. "
            "Ze legt uit hoe je een account aanmaakt, de app installeert en een bestelling opvolgt.",
            styles["body"],
        ),
        Paragraph("Laatste bijwerking: 16/07/2026", styles["small"]),
        PageBreak(),
    ]


def parse_markdown(styles):
    content = SOURCE.read_text(encoding="utf-8").splitlines()
    story = []
    paragraph = []
    list_items = []
    list_kind = None

    def flush_paragraph():
        nonlocal paragraph
        if paragraph:
            story.append(Paragraph(inline_markup(" ".join(paragraph)), styles["body"]))
            paragraph = []

    def flush_list():
        nonlocal list_items, list_kind
        if list_items:
            flowables = [
                ListItem(Paragraph(inline_markup(item), styles["bullet"]), leftIndent=8)
                for item in list_items
            ]
            story.append(
                ListFlowable(
                    flowables,
                    bulletType="1" if list_kind == "ordered" else "bullet",
                    leftIndent=14,
                    bulletFontName="Helvetica",
                    bulletFontSize=8,
                    bulletColor=PROFO_RED_DARK,
                    spaceAfter=6,
                )
            )
            list_items = []
            list_kind = None

    for line in content:
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            flush_list()
            continue
        if stripped.startswith("# "):
            continue
        if stripped.startswith("Laatste bijwerking"):
            continue
        if stripped.startswith("## "):
            flush_paragraph()
            flush_list()
            story.append(Paragraph(inline_markup(stripped[3:]), styles["h2"]))
            continue
        if stripped.startswith("### "):
            flush_paragraph()
            flush_list()
            story.append(Paragraph(inline_markup(stripped[4:]), styles["h3"]))
            continue
        ordered = re.match(r"^\d+\.\s+(.+)$", stripped)
        unordered = re.match(r"^-\s+(.+)$", stripped)
        if ordered or unordered:
            flush_paragraph()
            kind = "ordered" if ordered else "bullet"
            if list_kind and list_kind != kind:
                flush_list()
            list_kind = kind
            list_items.append((ordered or unordered).group(1))
            continue
        flush_list()
        paragraph.append(stripped)

    flush_paragraph()
    flush_list()
    return story


def build_pdf():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=21 * mm,
        title="PROFO Aankoopbeheer - gebruikershandleiding",
        author="PROFO vzw",
    )
    story = make_cover(styles) + parse_markdown(styles)
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
