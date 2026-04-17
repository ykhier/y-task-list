import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


SLIDE_RE = re.compile(r"^ppt/slides/slide(\d+)\.xml$")


def main() -> None:
    if len(sys.argv) < 2:
        raise RuntimeError("Missing PPTX path")

    pptx_path = Path(sys.argv[1])
    slides: list[tuple[int, str]] = []

    with zipfile.ZipFile(pptx_path) as archive:
        for name in archive.namelist():
            match = SLIDE_RE.match(name)
            if not match:
                continue

            slide_number = int(match.group(1))
            xml_data = archive.read(name)
            root = ET.fromstring(xml_data)

            texts: list[str] = []
            for node in root.iter():
                if node.tag.endswith("}t") and node.text:
                    value = node.text.strip()
                    if value:
                        texts.append(value)

            if texts:
                slides.append((slide_number, "\n".join(texts)))

    slides.sort(key=lambda item: item[0])
    combined = "\n\n".join(
        f"Slide {slide_number}\n{text}" for slide_number, text in slides if text.strip()
    ).strip()

    print(json.dumps({"text": combined, "pages": len(slides)}))


if __name__ == "__main__":
    try:
      main()
    except Exception as exc:
      print(json.dumps({"error": str(exc)}))
      sys.exit(1)
