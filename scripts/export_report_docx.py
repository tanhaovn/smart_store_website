import re
from pathlib import Path

from docx import Document
from docx.shared import Pt, Inches
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def clean_inline_markdown(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    return text.strip()


def is_table_line(line: str) -> bool:
    return "|" in line and line.strip().startswith("|") and line.strip().endswith("|")


def parse_table_rows(lines):
    rows = []
    for line in lines:
        parts = [cell.strip() for cell in line.strip().strip("|").split("|")]
        rows.append(parts)
    return rows


def is_separator_row(cells):
    return all(re.fullmatch(r":?-{3,}:?", cell or "") is not None for cell in cells)


def markdown_to_docx(md_path: Path, docx_path: Path):
    lines = md_path.read_text(encoding="utf-8").splitlines()

    doc = Document()
    # Set page margins
    section = doc.sections[0]
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)

    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(12)

    def set_paragraph_spacing(paragraph):
        pf = paragraph.paragraph_format
        pf.line_spacing = 1.5
        pf.space_after = Pt(6)

    i = 0
    # --- Cover page (English academic template) ---
    cover = doc.add_paragraph()
    cover.alignment = 1  # center
    run = cover.add_run("SmartVision Shop\n")
    run.bold = True
    run.font.size = Pt(20)
    run.font.name = "Times New Roman"

    p2 = doc.add_paragraph()
    p2.alignment = 1
    run = p2.add_run("Software Measurement & Analysis (CMU-CS 462)\n")
    run.font.size = Pt(14)
    run.font.name = "Times New Roman"

    p3 = doc.add_paragraph()
    p3.alignment = 1
    run = p3.add_run("Project: Software Measurement and Effort Estimation\n\n")
    run.font.size = Pt(12)
    run.font.name = "Times New Roman"

    info = doc.add_paragraph()
    info.alignment = 1
    run = info.add_run("Course: CMU-CS 462\nInstructor: ____________\nGroup: ____________\nMembers: ____________\nDate: 27/04/2026")
    run.font.size = Pt(12)
    run.font.name = "Times New Roman"

    doc.add_page_break()

    # Insert Table of Contents field (Word will populate when opened)
    toc_para = doc.add_paragraph()
    run = toc_para.add_run()
    fld = OxmlElement('w:fldSimple')
    fld.set(qn('w:instr'), 'TOC \\o "1-3" \\h \\z \\u')
    run._r.append(fld)
    doc.add_page_break()
    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()

        if not stripped:
            doc.add_paragraph("")
            i += 1
            continue

        if stripped == "---":
            i += 1
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading_match:
            level = len(heading_match.group(1))
            text = clean_inline_markdown(heading_match.group(2))
            h = doc.add_heading(text, level=min(level, 4))
            set_paragraph_spacing(h)
            i += 1
            continue

        if is_table_line(stripped):
            table_block = []
            while i < len(lines) and is_table_line(lines[i].strip()):
                table_block.append(lines[i].strip())
                i += 1

            raw_rows = parse_table_rows(table_block)
            if len(raw_rows) >= 2 and is_separator_row(raw_rows[1]):
                data_rows = [raw_rows[0]] + raw_rows[2:]
            else:
                data_rows = raw_rows

            col_count = max(len(r) for r in data_rows)
            table = doc.add_table(rows=0, cols=col_count)
            table.style = "Table Grid"

            for row_data in data_rows:
                row_cells = table.add_row().cells
                for idx in range(col_count):
                    value = row_data[idx] if idx < len(row_data) else ""
                    row_cells[idx].text = clean_inline_markdown(value)
                # set small spacing for table rows
            doc.add_paragraph("")
            continue

        bullet_match = re.match(r"^[-*]\s+(.*)$", stripped)
        if bullet_match:
            p = doc.add_paragraph(clean_inline_markdown(bullet_match.group(1)), style="List Bullet")
            set_paragraph_spacing(p)
            i += 1
            continue

        number_match = re.match(r"^\d+\.\s+(.*)$", stripped)
        if number_match:
            p = doc.add_paragraph(clean_inline_markdown(number_match.group(1)), style="List Number")
            set_paragraph_spacing(p)
            i += 1
            continue

        p = doc.add_paragraph(clean_inline_markdown(stripped))
        set_paragraph_spacing(p)
        i += 1

    doc.save(docx_path)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    # Prefer English markdown source if available
    md_en = root / "BAO_CAO_CHUC_NANG_SMARTVISION_SHOP_EN.md"
    md_vn = root / "BAO_CAO_CHUC_NANG_SMARTVISION_SHOP.md"
    if md_en.exists():
        md_file = md_en
        docx_file = root / "BAO_CAO_CHUC_NANG_SMARTVISION_SHOP_EN.docx"
    else:
        md_file = md_vn
        docx_file = root / "BAO_CAO_CHUC_NANG_SMARTVISION_SHOP.docx"

    if not md_file.exists():
        raise FileNotFoundError(f"Missing source markdown: {md_file}")

    markdown_to_docx(md_file, docx_file)
    print(f"Generated: {docx_file}")
