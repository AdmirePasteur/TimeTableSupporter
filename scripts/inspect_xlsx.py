import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def column_number(cell_ref: str) -> int:
    letters = re.match(r"[A-Z]+", cell_ref).group(0)
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - 64
    return value


def main(path: str) -> None:
    with zipfile.ZipFile(Path(path)) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", NS):
                shared.append("".join(node.text or "" for node in item.iterfind(".//m:t", NS)))

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_targets = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels
        }
        sheets = []
        for sheet in workbook.find("m:sheets", NS):
            rel_id = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = rel_targets[rel_id].lstrip("/")
            if not target.startswith("xl/"):
                target = f"xl/{target}"
            sheets.append((sheet.attrib["name"], target))

        output = []
        for sheet_name, target in sheets:
            root = ET.fromstring(archive.read(target))
            rows = []
            for row in root.findall(".//m:sheetData/m:row", NS):
                values = {}
                for cell in row.findall("m:c", NS):
                    value_node = cell.find("m:v", NS)
                    inline = cell.find("m:is", NS)
                    value = None
                    if value_node is not None:
                        value = value_node.text
                        if cell.attrib.get("t") == "s" and value is not None:
                            value = shared[int(value)]
                    elif inline is not None:
                        value = "".join(node.text or "" for node in inline.iterfind(".//m:t", NS))
                    if value not in (None, ""):
                        values[column_number(cell.attrib["r"])] = value
                if values:
                    max_col = max(values)
                    rows.append([values.get(col) for col in range(1, max_col + 1)])
            output.append({"sheet": sheet_name, "rows": rows})
        print(json.dumps(output, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main(sys.argv[1])
