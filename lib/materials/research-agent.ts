/**
 * Deterministic research pipeline — no LLM URL generation.
 *
 * Flow:
 *  1. translateToEnglish(topic)          — get English equivalent for English/paid/paper searches
 *  2. All 7 searches run in parallel     — YouTube (validated), paid courses, papers
 *  3. generateDescriptions(...)          — GPT-4o-mini writes one clean sentence per item
 *  4. buildOutput(...)                   — fixed Markdown template
 *
 * Output:
 *   ## סרטוני YouTube → ### עברית (2) + ### אנגלית (2)
 *   ## קורסים מקוונים → ### עברית (free playlist + paid) + ### אנגלית (free playlist + paid)
 *   ## מאמרים אקדמיים → 2 papers (arXiv / Semantic Scholar / IEEE)
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'

// ─── Tavily ────────────────────────────────────────────────────────────────────

async function tavilySearch(
  query: string,
  maxResults = 8,
): Promise<{ title: string; url: string; content: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
      }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      results?: { title: string; url: string; content: string }[]
    }
    return data.results ?? []
  } catch {
    return []
  }
}

// ─── YouTube validation ────────────────────────────────────────────────────────

async function readBody(res: Response, maxBytes = 80_000): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder()
  let body = ''
  let bytes = 0
  while (bytes < maxBytes) {
    const { done, value } = await reader.read()
    if (done) break
    body += decoder.decode(value, { stream: true })
    bytes += value?.byteLength ?? 0
  }
  reader.cancel()
  return body
}

/**
 * Two-step YouTube validation:
 *  1. oEmbed — catches deleted / private / age-restricted (401/404)
 *  2. Page fetch — catches region-restricted videos (playabilityStatus)
 * Returns { title, channel } on success, null if unavailable.
 */
async function validateYouTube(url: string): Promise<{ title: string; channel: string } | null> {
  const isPlaylist = url.includes('youtube.com/playlist?list=')

  try {
    const oRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(7_000) },
    )
    if (!oRes.ok) return null
    const od = (await oRes.json()) as { title?: string; author_name?: string }
    const title = od.title ?? ''
    const channel = od.author_name ?? ''

    // Playlists don't expose playabilityStatus — oEmbed is sufficient
    if (isPlaylist) return { title, channel }

    // Page check: catch region-restricted videos that oEmbed passes
    try {
      const pageRes = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      if (!pageRes.ok) return null
      const body = await readBody(pageRes)
      const m = body.match(/"playabilityStatus"\s*:\s*\{[^{]*?"status"\s*:\s*"(\w+)"/)
      if (m) {
        const status = m[1]
        if (status === 'UNPLAYABLE' || status === 'ERROR' || status === 'CONTENT_CHECK_REQUIRED') {
          return null
        }
      }
    } catch {
      // oEmbed passed — trust it
    }

    return { title, channel }
  } catch {
    return null
  }
}

// ─── Topic translation ─────────────────────────────────────────────────────────

function containsHebrew(text: string): boolean {
  return /[\u05D0-\u05EA]/.test(text)
}

/**
 * Translates a Hebrew topic to its English equivalent using GPT-4o-mini.
 * Used so that English/paid-course/paper searches use precise English terms.
 * Falls back to the original topic on failure.
 */
async function translateToEnglish(topic: string): Promise<string> {
  if (!containsHebrew(topic)) return topic
  try {
    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY,
    })
    const res = await llm.invoke([
      new HumanMessage(
        `Translate this Hebrew academic/technical topic to English. ` +
        `Reply with 1–4 words only, no explanation, no punctuation:\n"${topic}"`,
      ),
    ])
    const translated = (res.content as string).trim().replace(/["""'.]/g, '')
    return translated || topic
  } catch {
    return topic
  }
}

// ─── Doc topic detection ───────────────────────────────────────────────────────

/** Returns a 2–4 word Hebrew description of what the uploaded document covers. */
async function detectDocTopic(docContext: string): Promise<string> {
  try {
    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY,
    })
    const res = await llm.invoke([
      new HumanMessage(
        `בשתיים עד ארבע מילים בעברית, תאר את הנושא העיקרי של הטקסט הבא. ` +
        `ענה במילים בלבד, ללא פיסוק:\n\n${docContext.slice(0, 1_500)}`,
      ),
    ])
    return (res.content as string).trim().replace(/[."""]/g, '') || ''
  } catch {
    return ''
  }
}

// ─── Description generation ────────────────────────────────────────────────────

interface RawItem {
  url: string
  title: string
  snippet: string
  /** 'he' = write description in Hebrew; 'en' = write in English */
  lang: 'he' | 'en'
}

/**
 * One GPT-4o-mini call to generate a clean 1-sentence description for every
 * found resource. Falls back to a truncated snippet on failure.
 */
async function generateDescriptions(
  topic: string,
  items: RawItem[],
): Promise<Map<string, string>> {
  if (items.length === 0) return new Map()

  const fallback = new Map(
    items.map((item) => [item.url, truncateSnippet(item.snippet)]),
  )

  try {
    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      apiKey: process.env.OPENAI_API_KEY,
    })

    const list = items
      .map(
        (item, i) =>
          `${i + 1}. [${item.lang === 'he' ? 'תוכן עברי' : 'English content'}] Title: "${item.title}"\nSnippet: ${item.snippet.slice(0, 250)}`,
      )
      .join('\n\n')

    const res = await llm.invoke([
      new HumanMessage(
        `You write concise resource descriptions for a learning platform. Topic: "${topic}".\n\n` +
        `Rules:\n` +
        `- "תוכן עברי" → write description in Hebrew (1 sentence, max 100 chars)\n` +
        `- "English content" → write description in English (1 sentence, max 120 chars)\n` +
        `- Be specific about what the resource teaches — not generic ("great course", "highly recommended")\n` +
        `- Do NOT include the URL or the word "this"\n\n` +
        `Resources:\n${list}\n\n` +
        `Return ONLY valid JSON: {"1": "...", "2": "...", ...}`,
      ),
    ])

    const raw = (res.content as string).replace(/```json\n?|```\n?/g, '').trim()
    const json = JSON.parse(raw) as Record<string, string>

    const result = new Map<string, string>()
    items.forEach((item, i) => {
      const desc = json[String(i + 1)]
      result.set(item.url, desc?.trim() || fallback.get(item.url) || '')
    })
    return result
  } catch {
    return fallback
  }
}

function truncateSnippet(content: string, maxLen = 160): string {
  const cleaned = content
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[[\]{}|<>]/g, '')
    .trim()
  if (cleaned.length <= maxLen) return cleaned
  const cut = cleaned.lastIndexOf(' ', maxLen)
  return (cut > 60 ? cleaned.slice(0, cut) : cleaned.slice(0, maxLen)) + '…'
}

// ─── Research item ─────────────────────────────────────────────────────────────

interface ResearchItem {
  title: string
  url: string
  snippet: string // raw Tavily content — replaced by GPT description later
  lang: 'he' | 'en'
}

// ─── Search helpers ────────────────────────────────────────────────────────────

async function findYouTubeVideos(queries: string[], limit: number, lang: 'he' | 'en'): Promise<ResearchItem[]> {
  const found: ResearchItem[] = []
  const seen = new Set<string>()

  for (const query of queries) {
    if (found.length >= limit) break
    const raw = await tavilySearch(`site:youtube.com ${query}`, 12)
    const videos = raw.filter(
      (r) =>
        (r.url.includes('youtube.com/watch?v=') || r.url.includes('youtu.be/')) &&
        !seen.has(r.url),
    )

    const validated = await Promise.all(
      videos.slice(0, 6).map(async (r) => {
        if (seen.has(r.url)) return null
        const info = await validateYouTube(r.url)
        if (!info) return null
        return { title: info.title || r.title, url: r.url, snippet: r.content, lang } satisfies ResearchItem
      }),
    )

    for (const item of validated) {
      if (item && found.length < limit && !seen.has(item.url)) {
        seen.add(item.url)
        found.push(item)
      }
    }
  }

  return found
}

async function findYouTubePlaylist(queries: string[], lang: 'he' | 'en'): Promise<ResearchItem | null> {
  for (const query of queries) {
    const raw = await tavilySearch(`site:youtube.com playlist ${query}`, 10)
    const playlists = raw.filter((r) => r.url.includes('youtube.com/playlist?list='))

    for (const r of playlists) {
      const info = await validateYouTube(r.url)
      if (info) {
        return { title: info.title || r.title, url: r.url, snippet: r.content, lang }
      }
    }
  }
  return null
}

async function findPaidCourse(
  queries: string[],
  targetDomains: string[],
  lang: 'he' | 'en',
): Promise<ResearchItem | null> {
  for (const query of queries) {
    const raw = await tavilySearch(query, 8)
    const match = raw.find((r) => targetDomains.some((d) => r.url.includes(d)))
    if (match) {
      return { title: match.title, url: match.url, snippet: match.content, lang }
    }
  }
  return null
}

const PAPER_DOMAINS = ['arxiv.org', 'semanticscholar.org', 'ieeexplore.ieee.org', 'dl.acm.org']

async function findAcademicPapers(englishTopic: string): Promise<ResearchItem[]> {
  const papers: ResearchItem[] = []
  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()

  const queries = [
    `${englishTopic} survey paper site:arxiv.org`,
    `${englishTopic} research paper site:semanticscholar.org`,
    `${englishTopic} paper site:ieeexplore.ieee.org`,
    `${englishTopic} academic paper arxiv semanticscholar`,
  ]

  for (const q of queries) {
    if (papers.length >= 2) break
    const raw = await tavilySearch(q, 6)
    for (const r of raw) {
      if (papers.length >= 2) break
      const titleKey = r.title.slice(0, 50).toLowerCase()
      if (
        PAPER_DOMAINS.some((d) => r.url.includes(d)) &&
        !seenUrls.has(r.url) &&
        !seenTitles.has(titleKey)
      ) {
        seenUrls.add(r.url)
        seenTitles.add(titleKey)
        papers.push({ title: r.title, url: r.url, snippet: r.content, lang: 'en' })
      }
    }
  }

  return papers
}

// ─── Doc relevance check ───────────────────────────────────────────────────────

/**
 * Checks if the topic is related to the uploaded document.
 * Accepts both the original (possibly Hebrew) topic and its English equivalent,
 * because the document content may be in English even when the topic is in Hebrew.
 */
function isTopicRelatedToDoc(
  topic: string,
  docContext: string,
  englishEquivalent: string,
): boolean {
  const STOPWORDS = new Set([
    'של', 'על', 'את', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'זה', 'זו',
    'that', 'this', 'with', 'from', 'have', 'for', 'and', 'the', 'are', 'was',
  ])
  const docLower = docContext.slice(0, 4_000).toLowerCase()
  // Combine Hebrew topic and English equivalent — match against either
  const combined = `${topic} ${englishEquivalent}`
  const words = combined
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  if (words.length === 0) return true
  const matches = words.filter((w) => docLower.includes(w))
  // At least 25% of combined keywords must appear — lenient enough for cross-language docs
  return matches.length / words.length >= 0.25
}

// ─── Output builder ────────────────────────────────────────────────────────────

function buildOutput(
  topic: string,
  hebrewVideos: ResearchItem[],
  englishVideos: ResearchItem[],
  hebrewFreePlaylist: ResearchItem | null,
  hebrewPaidCourse: ResearchItem | null,
  englishFreePlaylist: ResearchItem | null,
  englishPaidCourse: ResearchItem | null,
  papers: ResearchItem[],
  descriptions: Map<string, string>,
  docNote: string | null,
): string {
  const desc = (item: ResearchItem) =>
    descriptions.get(item.url) || truncateSnippet(item.snippet)

  const lines: string[] = []

  if (docNote) lines.push(`> ${docNote}`, '')

  // YouTube videos
  lines.push('## סרטוני YouTube', '')

  lines.push('### עברית', '')
  if (hebrewVideos.length > 0) {
    for (const v of hebrewVideos) {
      lines.push(`[${v.title}](${v.url})`)
      lines.push(desc(v))
      lines.push('')
    }
  } else {
    lines.push('לא נמצאו סרטוני הסבר בעברית עבור נושא זה.', '')
  }

  lines.push('### אנגלית', '')
  if (englishVideos.length > 0) {
    for (const v of englishVideos) {
      lines.push(`[${v.title}](${v.url})`)
      lines.push(desc(v))
      lines.push('')
    }
  } else {
    lines.push('No English explanation videos found for this topic.', '')
  }

  // Courses
  lines.push('## קורסים מקוונים', '')

  lines.push('### עברית', '')
  if (hebrewFreePlaylist) {
    lines.push(`[${hebrewFreePlaylist.title}](${hebrewFreePlaylist.url}) (חינם - YouTube)`)
    lines.push(desc(hebrewFreePlaylist))
    lines.push('')
  } else {
    lines.push('לא נמצא קורס חינמי בעברית עבור נושא זה.', '')
  }
  if (hebrewPaidCourse) {
    lines.push(`[${hebrewPaidCourse.title}](${hebrewPaidCourse.url}) (בתשלום)`)
    lines.push(desc(hebrewPaidCourse))
    lines.push('')
  } else {
    lines.push('לא נמצא קורס בתשלום בעברית עבור נושא זה.', '')
  }

  lines.push('### אנגלית', '')
  if (englishFreePlaylist) {
    lines.push(`[${englishFreePlaylist.title}](${englishFreePlaylist.url}) (Free - YouTube)`)
    lines.push(desc(englishFreePlaylist))
    lines.push('')
  } else {
    lines.push('No free English course found for this topic.', '')
  }
  if (englishPaidCourse) {
    lines.push(`[${englishPaidCourse.title}](${englishPaidCourse.url}) (Paid)`)
    lines.push(desc(englishPaidCourse))
    lines.push('')
  } else {
    lines.push('No paid English course found for this topic.', '')
  }

  // Papers
  lines.push('## מאמרים אקדמיים', '')
  if (papers.length > 0) {
    for (const p of papers) {
      lines.push(`[${p.title}](${p.url})`)
      lines.push(desc(p))
      lines.push('')
    }
  } else {
    lines.push(`No academic papers found for "${topic}".`, '')
  }

  return lines.join('\n')
}

// ─── Public API ────────────────────────────────────────────────────────────────

export type ResearchAgentEvent =
  | { type: 'step'; tool: string; input: string }
  | { type: 'chunk'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export async function* streamResearchAgent(
  topic: string,
  _userEmail: string,
  docContext: string | null = null,
): AsyncGenerator<ResearchAgentEvent> {
  try {
    // Step 0 — translate first (needed for both relevance check and English searches)
    yield { type: 'step', tool: 'translate', input: `מתרגם נושא לאנגלית — ${topic}` }
    const englishTopic = await translateToEnglish(topic)

    // Doc relevance note — check both Hebrew topic and English equivalent against the doc
    let docNote: string | null = null
    if (docContext && !isTopicRelatedToDoc(topic, docContext, englishTopic)) {
      const docTopic = await detectDocTopic(docContext)
      const docPart = docTopic ? `עוסק ב**${docTopic}**` : 'עוסק בנושא אחר'
      docNote = `הקובץ שהועלה ${docPart} ואינו קשור לכותרת שהזנת. מחפש מקורות לפי הכותרת: **${topic}**`
    }

    // Announce the parallel search batches
    yield { type: 'step', tool: 'search_youtube_videos', input: `סרטוני הסבר בעברית — ${topic}` }
    yield { type: 'step', tool: 'search_youtube_videos', input: `explanation videos — ${englishTopic}` }
    yield { type: 'step', tool: 'search_youtube_videos', input: `קורסים מלאים (פלייליסטים) — ${topic} / ${englishTopic}` }
    yield { type: 'step', tool: 'tavily_search', input: `קורסים בתשלום ומאמרים — ${englishTopic}` }

    // Run all 7 searches in parallel
    const [
      hebrewVideos,
      englishVideos,
      hebrewFreePlaylist,
      englishFreePlaylist,
      hebrewPaidCourse,
      englishPaidCourse,
      papers,
    ] = await Promise.all([
      // 2 Hebrew explanation videos
      findYouTubeVideos(
        [
          `${topic} הדרכה עברית`,
          `${topic} הסבר בעברית`,
          `${englishTopic} עברית tutorial`,
          `${englishTopic} Hebrew tutorial`,
        ],
        2,
        'he',
      ),
      // 2 English explanation videos — always use English term
      findYouTubeVideos(
        [
          `${englishTopic} tutorial explained`,
          `${englishTopic} beginner guide`,
          `${englishTopic} full tutorial`,
          `${englishTopic} introduction course`,
        ],
        2,
        'en',
      ),
      // Free Hebrew course — YouTube playlist
      findYouTubePlaylist(
        [
          `${topic} קורס מלא`,
          `${englishTopic} Hebrew course playlist`,
          `${topic} קורס חינמי`,
          `${englishTopic} full course עברית`,
        ],
        'he',
      ),
      // Free English course — YouTube playlist
      findYouTubePlaylist(
        [
          `${englishTopic} complete course playlist`,
          `${englishTopic} full tutorial playlist`,
          `${englishTopic} free course`,
        ],
        'en',
      ),
      // Paid Hebrew course — Udemy (English content) or iDigital (Hebrew)
      findPaidCourse(
        [
          `${englishTopic} course site:udemy.com`,
          `${topic} קורס site:idigital.co.il`,
          `${englishTopic} udemy course`,
        ],
        ['udemy.com', 'idigital.co.il'],
        'he',
      ),
      // Paid English course — Udemy / Coursera
      findPaidCourse(
        [
          `${englishTopic} course site:udemy.com`,
          `${englishTopic} course site:coursera.org`,
          `${englishTopic} online course`,
        ],
        ['udemy.com', 'coursera.org'],
        'en',
      ),
      // 2 academic papers — always English query
      findAcademicPapers(englishTopic),
    ])

    // Generate clean descriptions in one GPT-4o-mini call
    yield { type: 'step', tool: 'generate_descriptions', input: 'כותב תיאורים מקצועיים…' }

    const allItems: RawItem[] = [
      ...hebrewVideos,
      ...englishVideos,
      ...(hebrewFreePlaylist ? [hebrewFreePlaylist] : []),
      ...(hebrewPaidCourse ? [hebrewPaidCourse] : []),
      ...(englishFreePlaylist ? [englishFreePlaylist] : []),
      ...(englishPaidCourse ? [englishPaidCourse] : []),
      ...papers,
    ]

    const descriptions = await generateDescriptions(topic, allItems)

    const output = buildOutput(
      topic,
      hebrewVideos,
      englishVideos,
      hebrewFreePlaylist,
      hebrewPaidCourse,
      englishFreePlaylist,
      englishPaidCourse,
      papers,
      descriptions,
      docNote,
    )

    yield { type: 'chunk', content: output }
    yield { type: 'done' }
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : 'שגיאה לא ידועה' }
  }
}
