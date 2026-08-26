import json
import re
from pathlib import Path

from lxml import etree


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "hwp.xml"
TARGET = ROOT / "src" / "generatedCourses.ts"
CODE = re.compile(r"^[A-Z]{2,4}\d{3,5}$")
GRADE = re.compile(r"^[1-4](?:\s*[,~·/]\s*[1-4])*$")


def expanded_rows(table):
    active = {}
    for row in table.iter("TableRow"):
        values = {column: text for column, (_, text) in active.items()}
        active = {
            column: (remaining - 1, text)
            for column, (remaining, text) in active.items()
            if remaining > 1
        }
        for cell in row.findall("TableCell"):
            column = int(cell.get("col", "0"))
            colspan = int(cell.get("colspan", "1"))
            rowspan = int(cell.get("rowspan", "1"))
            value = " ".join("".join(cell.itertext()).replace("\r", " ").split())
            for offset in range(colspan):
                values[column + offset] = value
                if rowspan > 1:
                    active[column + offset] = (rowspan - 1, value)
        if values:
            yield [values.get(column, "") for column in range(max(values) + 1)]


grades = {}
tree = etree.parse(str(SOURCE))
for table in tree.iter("TableControl"):
    for cells in expanded_rows(table):
        code_index = next((i for i, value in enumerate(cells) if CODE.match(value)), None)
        if code_index is None or len(cells) <= code_index + 2:
            continue
        grade = next((value for value in cells[:code_index] if GRADE.fullmatch(value)), "")
        if not grade:
            continue
        section = cells[code_index + 2] or "0"
        grades[f"{cells[code_index]}-{section}"] = re.sub(r"\s+", "", grade)

prefix = "import { Course } from './types'\n\nexport const generatedCourses: Course[] = "
text = TARGET.read_text(encoding="utf-8")
courses = json.loads(text.removeprefix(prefix).strip())
matched = 0
for course in courses:
    if course.get("category") != "전공":
        continue
    grade = grades.get(course["code"])
    if grade:
        course["grade"] = grade
        matched += 1

# 원본 표에서 별도로 보완한 두 과목
manual_grades = {"EE2004-00": "3", "ST2012-00": "4"}
for course in courses:
    if course["code"] in manual_grades:
        course["grade"] = manual_grades[course["code"]]

TARGET.write_text(
    prefix + json.dumps(courses, ensure_ascii=False, separators=(",", ":")) + "\n",
    encoding="utf-8",
)
print(f"Added grades to {matched + len(manual_grades)} major courses")
