import { readFile } from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  const pdfPath = process.argv[2];

  if (!pdfPath) {
    throw new Error('Missing PDF path');
  }

  const buffer = await readFile(pdfPath);
  const standardFontDataUrl = pathToFileURL(
    path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts'),
  ).toString().replace(/\/?$/, '/');

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  });

  const doc = await loadingTask.promise;

  try {
    const pageTexts = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);

      try {
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (text) {
          pageTexts.push(text);
        }
      } finally {
        page.cleanup();
      }
    }

    process.stdout.write(JSON.stringify({
      text: pageTexts.join('\n\n').trim(),
      pages: doc.numPages,
    }));
  } finally {
    await doc.destroy();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'PDF extraction failed';
  process.stdout.write(JSON.stringify({ error: message }));
  process.exitCode = 1;
});
