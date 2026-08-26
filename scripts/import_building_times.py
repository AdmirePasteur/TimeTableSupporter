import json
import re
import sys
from pathlib import Path

from inspect_xlsx import NS, column_number
import zipfile
from xml.etree import ElementTree as ET


def read_first_sheet(path: Path):
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = [
                "".join(node.text or "" for node in item.iterfind(".//m:t", NS))
                for item in root.findall("m:si", NS)
            ]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        first = workbook.find("m:sheets", NS)[0]
        rel_id = first.attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        target = targets[rel_id].lstrip("/")
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        root = ET.fromstring(archive.read(target))
        rows = []
        for row in root.findall(".//m:sheetData/m:row", NS):
            values = {}
            for cell in row.findall("m:c", NS):
                value_node = cell.find("m:v", NS)
                if value_node is None:
                    continue
                value = value_node.text
                if cell.attrib.get("t") == "s":
                    value = shared[int(value)]
                values[column_number(cell.attrib["r"])] = value
            rows.append(values)
        return rows


def duration_minutes(value: str) -> float:
    minutes = re.search(r"(\d+)\s*분", value or "")
    seconds = re.search(r"(\d+)\s*초", value or "")
    return (int(minutes.group(1)) if minutes else 0) + (
        int(seconds.group(1)) / 60 if seconds else 0
    )


def main(source: str, destination: str) -> None:
    rows = read_first_sheet(Path(source))
    pairs = []
    for row in rows[3:]:
        start, end, duration = row.get(1), row.get(2), row.get(5)
        if start and end and duration:
            pairs.append((start.strip().upper(), end.strip().upper(), duration_minutes(duration)))
    buildings = sorted({code for pair in pairs for code in pair[:2]})
    expected = len(buildings) * (len(buildings) - 1) // 2
    if len(pairs) != expected:
        raise ValueError(f"Expected {expected} building pairs, found {len(pairs)}")
    matrix = {building: {building: 0} for building in buildings}
    for start, end, minutes in pairs:
        matrix[start][end] = minutes
        matrix[end][start] = minutes
    lines = [
        "// Generated from 2026-2학기_실제강의건물_이동시간_측정표.xlsx",
        "// Building code rule: first alphabetic character + first digit (A18104 -> A1).",
        "export const buildingTravelMinutes: Record<string, Record<string, number>> = ",
        json.dumps(matrix, ensure_ascii=False, indent=2, sort_keys=True),
        ";",
        "",
        "export function roomBuildingCode(room: string): string | null {",
        "  const match = room.trim().toUpperCase().match(/[A-Z]\\s*(\\d)/);",
        "  return match ? `${match[0][0]}${match[1]}` : null;",
        "}",
        "",
        "export function buildingTravelTime(fromRoom: string, toRoom: string): number | null {",
        "  const from = roomBuildingCode(fromRoom);",
        "  const to = roomBuildingCode(toRoom);",
        "  if (!from || !to) return null;",
        "  return buildingTravelMinutes[from]?.[to] ?? null;",
        "}",
        "",
    ]
    Path(destination).write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {destination}: {len(buildings)} buildings, {len(pairs)} pairs")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
