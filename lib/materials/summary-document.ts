function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(text: string): string {
  const escaped = escapeHtml(text)
  return escaped
    .replace(/`([^`]+)`/g, '<code dir="ltr">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

function isOrderedListLine(line: string): boolean {
  return /^\d+\.\s/.test(line.trim())
}

function isBlockquoteLine(line: string): boolean {
  return line.trim().startsWith('> ')
}

function isHorizontalRule(line: string): boolean {
  return /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())
}

function isBoldLabel(line: string): boolean {
  return /^\*\*[^*]+:\*\*/.test(line.trim())
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')
}

function isSeparatorRow(line: string): boolean {
  return /^\|(?:\s*:?-{3,}:?\s*\|)+$/.test(line.trim())
}

function splitTableCells(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
}

function buildToc(summary: string): { toc: string; sectionIds: Map<string, string> } {
  const lines = summary.replace(/\r\n/g, '\n').split('\n')
  const headings: { text: string; id: string }[] = []
  let counter = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3)
      headings.push({ text, id: `section-${counter++}` })
    }
  }

  if (headings.length === 0) return { toc: '', sectionIds: new Map() }

  const sectionIds = new Map(headings.map(({ text, id }) => [text, id]))

  const items = headings
    .map(({ text, id }) => `<li><a href="#${id}">${escapeHtml(text)}</a></li>`)
    .join('')

  const toc = `<nav class="toc"><h2 class="toc-title">תוכן עניינים</h2><ol>${items}</ol></nav>`
  return { toc, sectionIds }
}

export function renderSummaryBodyHtml(summary: string): string {
  const lines = summary.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let index = 0
  const { toc, sectionIds } = buildToc(summary)
  let h2Counter = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index++
      continue
    }

    if (trimmed.startsWith('# ')) {
      blocks.push(`<h1>${renderInline(trimmed.slice(2))}</h1>`)
      if (toc && blocks.length === 1) blocks.push(toc)
      index++
      continue
    }

    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3)
      const id = sectionIds.get(text) ?? `section-${h2Counter}`
      h2Counter++
      blocks.push(`<h2 id="${id}">${renderInline(text)}</h2>`)
      index++
      continue
    }

    if (trimmed.startsWith('### ')) {
      blocks.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`)
      index++
      continue
    }

    if (isTableLine(trimmed)) {
      const tableLines: string[] = []
      while (index < lines.length && isTableLine(lines[index].trim())) {
        tableLines.push(lines[index].trim())
        index++
      }

      const rows = tableLines
        .filter((row) => !isSeparatorRow(row))
        .map(splitTableCells)

      if (rows.length > 0) {
        const [header, ...body] = rows
        blocks.push([
          '<div class="table-wrap"><table><thead><tr>',
          header.map((cell) => `<th>${renderInline(cell)}</th>`).join(''),
          '</tr></thead><tbody>',
          body.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join(''),
          '</tbody></table></div>',
        ].join(''))
      }
      continue
    }

    if (isHorizontalRule(trimmed)) {
      blocks.push('<hr />')
      index++
      continue
    }

    if (isBlockquoteLine(line)) {
      const bqLines: string[] = []
      while (index < lines.length && isBlockquoteLine(lines[index])) {
        bqLines.push(lines[index].trim().slice(2))
        index++
      }
      blocks.push(`<blockquote>${bqLines.map((l) => renderInline(l)).join('<br />')}</blockquote>`)
      continue
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('- ')) {
        items.push(lines[index].trim().slice(2))
        index++
      }
      blocks.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`)
      continue
    }

    if (isOrderedListLine(trimmed)) {
      const items: string[] = []
      while (index < lines.length && isOrderedListLine(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s/, ''))
        index++
      }
      blocks.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ol>`)
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length) {
      const current = lines[index].trim()
      if (
        !current ||
        current.startsWith('#') ||
        current.startsWith('- ') ||
        current.startsWith('> ') ||
        isOrderedListLine(current) ||
        isTableLine(current) ||
        isHorizontalRule(current)
      ) {
        break
      }
      // each bold-label line (e.g. **שאלה:** / **תשובה:**) starts its own paragraph
      if (paragraph.length > 0 && isBoldLabel(current)) {
        break
      }
      paragraph.push(lines[index])
      index++
    }

    if (paragraph.length > 0) {
      const html = renderInline(paragraph.join(' '))
      // bold-label paragraphs get a distinct class for spacing
      const cls = isBoldLabel(paragraph[0].trim()) ? ' class="bold-label"' : ''
      blocks.push(`<p${cls}>${html}</p>`)
      continue
    }

    index++
  }

  return blocks.join('\n')
}

export function buildSummaryDocumentHtml(title: string, summary: string): string {
  const content = renderSummaryBodyHtml(summary)
  const brandedTitle = title.trim() ? `${title} | WeekFlow` : 'WeekFlow'

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(brandedTitle)}</title>
    <style>
      :root {
        --ink: #0f172a;
        --muted: #475569;
        --line: #dbe4f0;
        --soft: #f8fafc;
        --brand: #1d4ed8;
        --brand-soft: #dbeafe;
        --accent: #2563eb;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Arial, sans-serif;
        color: var(--ink);
        background: linear-gradient(180deg, #eef6ff 0%, #ffffff 22%);
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 18mm 16mm 20mm;
        background: white;
      }
      .hero {
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 18px 20px;
        background:
          radial-gradient(circle at top right, rgba(29, 78, 216, 0.08), transparent 32%),
          linear-gradient(135deg, #f8fffe 0%, #f8fbff 100%);
        margin-bottom: 18px;
      }
      .eyebrow {
        display: block;
        width: fit-content;
        margin-right: auto;
        margin-left: 0;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--brand-soft);
        color: var(--brand);
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .title {
        margin: 0;
        font-size: 32px;
        line-height: 1.2;
        font-weight: 900;
        letter-spacing: -0.02em;
      }
      .content {
        border: 1px solid #edf2f7;
        border-radius: 24px;
        padding: 32px 22px 22px;
        background: white;
      }
      .toc {
        margin: 0 0 24px;
        padding: 16px 18px;
        background: #f0f6ff;
        border: 1px solid #bfdbfe;
        border-radius: 16px;
      }
      .toc-title {
        margin: 0 0 10px !important;
        font-size: 16px !important;
        font-weight: 800 !important;
        color: var(--brand) !important;
        border-top: none !important;
        padding-top: 0 !important;
      }
      .toc ol {
        margin: 0;
        padding-right: 18px;
        counter-reset: toc-counter;
      }
      .toc li {
        margin: 4px 0;
        font-size: 13px;
        color: var(--ink);
      }
      .toc a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }
      .toc a:hover {
        text-decoration: underline;
      }
      h1, h2, h3 {
        break-after: avoid;
      }
      h1 {
        margin: 0 0 16px;
        font-size: 30px;
        line-height: 1.2;
        font-weight: 900;
      }
      h2 {
        margin: 28px 0 12px;
        padding-top: 10px;
        border-top: 1px solid #e8eef6;
        font-size: 22px;
        line-height: 1.35;
        font-weight: 850;
        color: var(--brand);
      }
      h3 {
        margin: 18px 0 8px;
        font-size: 17px;
        line-height: 1.5;
        font-weight: 800;
        color: var(--accent);
      }
      p, li, td, th {
        font-size: 14px;
        line-height: 1.9;
      }
      p {
        margin: 0 0 10px;
        color: #1f2937;
      }
      ul, ol {
        margin: 8px 0 14px;
        padding: 0 22px 0 0;
      }
      ol {
        list-style-type: decimal;
        list-style-position: inside;
        padding-right: 8px;
      }
      ol li {
        padding-right: 4px;
      }
      li {
        margin: 0 0 8px;
        color: #1f2937;
      }
      blockquote {
        margin: 0 0 14px;
        padding: 10px 14px;
        border-right: 3px solid var(--brand);
        background: var(--brand-soft);
        border-radius: 0 8px 8px 0;
        color: var(--brand);
        font-size: 13px;
        font-weight: 600;
      }
      hr {
        border: none;
        border-top: 1px solid var(--line);
        margin: 18px 0;
      }
      em {
        font-style: italic;
      }
      code {
        font-family: "Consolas", "Courier New", monospace;
        font-size: 13px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 1px 5px;
        color: #1e40af;
        unicode-bidi: embed;
      }
      strong {
        color: #020617;
        font-weight: 800;
      }
      .bold-label {
        margin-top: 10px;
        margin-bottom: 4px;
      }
      .table-wrap {
        margin: 16px 0 18px;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 18px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      thead {
        background: #eff6ff;
      }
      th, td {
        border-bottom: 1px solid var(--line);
        padding: 10px 12px;
        text-align: right;
        vertical-align: top;
      }
      tbody tr:nth-child(even) {
        background: #fcfdff;
      }
      .footer {
        margin-top: 16px;
        color: var(--brand);
        font-size: 12px;
        text-align: center;
        font-weight: 700;
      }
      @page {
        margin: 0;
      }
      @media print {
        body {
          background: white;
        }
        .page {
          width: auto;
          min-height: auto;
          margin: 0;
          padding: 12mm;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="eyebrow">WeekFlow</div>
        <h1 class="title">${escapeHtml(title)}</h1>
      </section>
      <section class="content">
        ${content}
      </section>
      <div class="footer">WeekFlow</div>
    </main>
  </body>
</html>`
}
