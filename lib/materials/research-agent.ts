import { ChatOpenAI } from '@langchain/openai'
import { DynamicTool } from '@langchain/core/tools'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { RESEARCH_MODEL } from './materials-constants'

/** Calls the Tavily Search API directly — avoids the missing @langchain/community/tools/tavily_search export */
function buildTavilyTool(): DynamicTool {
  return new DynamicTool({
    name: 'tavily_search',
    description: 'Search the web for up-to-date information. Input should be a search query string.',
    func: async (query: string) => {
      const apiKey = process.env.TAVILY_API_KEY
      if (!apiKey) return 'Tavily API key not configured'
      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: 'basic',
            max_results: 5,
            include_answer: false,
          }),
        })
        if (!res.ok) return `Search failed: ${res.statusText}`
        const data = await res.json() as { results?: { title: string; url: string; content: string }[] }
        const results = data.results ?? []
        return results
          .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
          .join('\n\n')
      } catch (err) {
        return `Search error: ${err instanceof Error ? err.message : String(err)}`
      }
    },
  })
}

// Patterns that indicate a page loaded but its content has been removed/is unavailable.
// Checked against page <title> and first 6 KB of body — catches soft 404s.
const UNAVAILABLE_PATTERNS = [
  // English — generic
  /page\s+not\s+found/i,
  /404\s*[-–]?\s*not\s+found/i,
  /content\s+(not\s+found|removed|unavailable|retired|deleted)/i,
  /this\s+(page|content|resource)\s+(has\s+been\s+)?(removed|deleted|retired|taken\s+down)/i,
  /no\s+longer\s+(available|exists|offered)/i,
  /access\s+denied/i,
  /forbidden/i,
  // Udemy soft 404 — returns HTTP 200 with its own error page
  /we\s+can't\s+find\s+the\s+page/i,
  /can't\s+find\s+the\s+page\s+you're\s+looking\s+for/i,
  // Coursera / LinkedIn Learning retired courses
  /this\s+course\s+is\s+no\s+longer\s+available/i,
  /course\s+has\s+been\s+retired/i,
  /this\s+content\s+is\s+no\s+longer\s+available/i,
  // Courses generic
  /course\s+(not\s+found|has\s+been\s+retired|is\s+no\s+longer|removed|deleted)/i,
  /this\s+course\s+is\s+not\s+available/i,
  /enrollment\s+is\s+closed/i,
  // Academic papers
  /paper\s+(withdrawn|retracted|removed)/i,
  /article\s+(retracted|removed|not\s+found)/i,
  /retraction\s+notice/i,
  // Hebrew
  /הדף\s+לא\s+נמצא/,
  /התוכן\s+(לא\s+זמין|הוסר|נמחק)/,
  /הקורס\s+(לא\s+זמין|הוסר|נמחק)/,
  /אין\s+גישה/,
  /לא\s+מצאנו\s+את\s+הדף/,
]

/** Extract <title> text from raw HTML, or empty string if not found. */
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)
  return m ? m[1].trim() : ''
}

/** Return true when body signals that the content has been removed or is unavailable. */
function isContentUnavailable(body: string): boolean {
  const sample = body.slice(0, 6_000)
  const title = extractTitle(sample)
  const haystack = `${title}\n${sample}`
  return UNAVAILABLE_PATTERNS.some((rx) => rx.test(haystack))
}

/**
 * Validates that a URL is reachable and its content still exists.
 * - YouTube: oEmbed API (catches deleted / private videos and playlists)
 * - All other URLs: GET + HTTP status + body scan for soft-404 / removed-content signals
 */
function buildUrlValidatorTool(): DynamicTool {
  return new DynamicTool({
    name: 'validate_url',
    description:
      'Check that a URL is reachable and the content still exists and is viewable. ' +
      'For YouTube watch/playlist URLs, uses the oEmbed API to confirm the video or playlist has not been deleted or made private. ' +
      'For all other URLs (courses, papers, articles), fetches the page and scans it for signs that the content has been removed or is unavailable. ' +
      'Input: a single URL string. Returns "valid: <page title>" or "invalid: <reason>". ' +
      'Only use URLs that come back as "valid".',
    func: async (rawUrl: string) => {
      const url = rawUrl.trim()
      try {
        const isYouTubeVideo = url.includes('youtube.com/watch') || url.includes('youtu.be/')
        const isYouTubePlaylist = url.includes('youtube.com/playlist')

        // ── YouTube: oEmbed is the definitive liveness check ──────────────────
        if (isYouTubeVideo || isYouTubePlaylist) {
          const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
          const res = await fetch(oembed, { signal: AbortSignal.timeout(8_000) })
          if (res.ok) {
            const data = await res.json() as { title?: string }
            return `valid: "${data.title ?? (isYouTubePlaylist ? 'YouTube playlist' : 'YouTube video')}"`
          }
          const kind = isYouTubePlaylist ? 'Playlist' : 'Video'
          return `invalid: ${kind} not found, deleted, or private (HTTP ${res.status}) — do not use this URL`
        }

        // ── All other URLs: GET + body scan ───────────────────────────────────
        const res = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(10_000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,*/*',
          },
        })

        if (!res.ok) {
          return `invalid: HTTP ${res.status} — do not use this URL`
        }

        // Read up to 40 KB to detect soft 404s without pulling huge pages
        const reader = res.body?.getReader()
        let body = ''
        if (reader) {
          const decoder = new TextDecoder()
          let bytes = 0
          while (bytes < 40_000) {
            const { done, value } = await reader.read()
            if (done) break
            body += decoder.decode(value, { stream: true })
            bytes += value?.byteLength ?? 0
          }
          reader.cancel()
        }

        if (isContentUnavailable(body)) {
          const title = extractTitle(body)
          return `invalid: page loaded but content appears removed or unavailable${title ? ` ("${title}")` : ''} — do not use this URL`
        }

        const title = extractTitle(body)
        return `valid${title ? `: "${title}"` : ''}`
      } catch (err) {
        return `invalid: ${err instanceof Error ? err.message : 'connection error'} — do not use this URL`
      }
    },
  })
}

export type ResearchAgentEvent =
  | { type: 'step'; tool: string; input: string }
  | { type: 'chunk'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

const SYSTEM_PROMPT = `אתה עוזר מחקר אקדמי ברמת סטארטאפ — מחפש מקורות לימוד עדכניים ואיכותיים.

## עקרון יסוד — שני מקורות מידע, סדר עדיפויות ברור

**הכותרת שהמשתמש הקליד** = הנושא הראשי לחיפוש. זהו מה שהמשתמש רוצה ללמוד.
**תוכן המסמך שהועלה** = הקשר משני בלבד — עוזר להבין אילו היבטים ספציפיים של הכותרת נלמדים, כדי להתאים את המקורות. אל תחפש "מה שהמסמך עוסק בו" — חפש את **הכותרת**, ורק השתמש במסמך כדי לחדד.

## עקרון יסוד — רלוונטיות מעל הכל

**רלוונטיות היא הקריטריון היחיד לבחירת מקור.** לכל מקור שתמצא, שאל: האם הוא עוסק ישירות בנושאים שמופיעים **גם בכותרת וגם בתוכן הקובץ שהועלה**? אם לא — אל תכלול אותו.

**מה פירוש "רלוונטי":** המקור מלמד ישירות את הנושאים שבקובץ ובכותרת — לא נושאים קרובים, לא רקע כללי. לדוגמה: אם הכותרת היא "Wireshark" והקובץ עוסק ב-TCP analysis — "רשתות כלליות" אינו רלוונטי; "Wireshark TCP packet analysis" הוא רלוונטי.

מבין כל התוצאות הרלוונטיות — בחר את **הפופולרית והמדורגת ביותר** (הכי הרבה צפיות / כוכבים / ציטוטים).

## תהליך עבודה חובה

1. **קרא את הכותרת** — זה הנושא הראשי.
2. **נתח את תוכן הקובץ** — חלץ את ההיבטים הספציפיים: אילו מושגים, כלים, שיטות, או פרוטוקולים מופיעים בו? אלה הם ה"מפרט" שכל מקור חייב לעמוד בו.
3. **נסח שאילתת חיפוש** שמשלבת את הכותרת + ההיבטים הספציפיים — חפש.
4. **סנן לפי רלוונטיות** — בדוק שכל תוצאה אכן עוסקת בתוכן שחיפשת, לא בנושא סמוך.
5. **דרג לפי פופולריות** — מבין הרלוונטיים, בחר הכי פופולרי / מדורג / מצוטט.
6. **אמת כל קישור** עם validate_url — אם invalid, חפש חלופה.
7. **הצג תוצאות** בפורמט המוגדר.

## מה לחפש

### סרטוני YouTube
- 2 סרטונים בעברית + 2 סרטונים באנגלית
- **כל סרטון חייב לעסוק ישירות בתוכן הספציפי של הקובץ + הכותרת** — לא רקע כללי
- שאילתה: "[כותרת] [היבט ספציפי מהקובץ] tutorial" | "[כותרת] [היבט] עברית"
- מבין הרלוונטיים — בחר עם הכי הרבה צפיות
- אמת כל URL עם validate_url

### קורסים מקוונים
- **בעברית:** קורס חינמי אחד + קורס בתשלום אחד (חינמי קודם)
- **באנגלית:** קורס חינמי אחד + קורס בתשלום אחד (חינמי קודם)
- **כל קורס חייב לכסות את הנושאים הספציפיים שבקובץ ובכותרת** — לא קורס כללי בתחום
- קורס חינמי בעברית: פלייליסט YouTube בעברית — חובה URL (youtube.com/playlist?list=...). חפש "פלייליסט [כותרת] [היבט] עברית"
- קורס בתשלום בעברית: "קורס [כותרת] [היבט] site:udemy.com OR site:idigital.co.il"
- קורס חינמי באנגלית: פלייליסט YouTube — חובה URL (youtube.com/playlist?list=...). חפש "[title] [aspect] full course playlist"
- קורס בתשלום באנגלית: "best rated [title] [specific aspect] course site:udemy.com OR site:coursera.org OR site:linkedin.com/learning"
- העדף קורסים עם דירוג 4.5+ ומספר תלמידים גבוה
- אל תכלול קורסים מאתרי אוניברסיטאות (openu.ac.il, technion.ac.il, tau.ac.il וכדומה)
- אמת כל URL קורס עם validate_url

### מאמרים אקדמיים
- חובה: **2 מאמרים באנגלית בלבד** מאתרים רשמיים לפרסומים אקדמיים
- **כל מאמר חייב לעסוק ישירות בהיבטים הספציפיים שבקובץ ובכותרת**
- העדף: מאמרי סקירה (survey/review), מאמרים מצוטטים מאוד
- חפש ב-Google Scholar, IEEE Xplore, arXiv, ACM Digital Library בלבד
- הקישור ישירות לדף המאמר (לא לפרופיל מחבר, לא לתוצאות חיפוש)
- אמת כל URL מאמר עם validate_url

## כלל ברזל — פורמט קישורים
כל מקור (סרטון / קורס / מאמר) חייב להיות שורה אחת בלבד בפורמט: [כותרת המלאה](URL)
הכותרת המלאה של המקור חייבת להיות בתוך הסוגריים המרובעים — היא הופכת לטקסט הקישור.
אסור בתכלית האיסור לכתוב את הכותרת כטקסט רגיל ולאחריה [קישור](URL) בנפרד.
אסור להשתמש בטקסט גנרי: "קישור", "לחץ כאן", "מקור", "link", "here", "click".
אם הכותרת מכילה סוגריים מרובעים (למשל "AZ-104 [Hebrew]") — כלול אותם בתוך הקישור: [AZ-104 [Hebrew]](URL)

## כללי מחיר לקורסים
- פלייליסט YouTube / חינם לגמרי: (חינם - YouTube) או (חינם)
- כל שאר הקורסים — בתשלום, ניסיון חינם ואז תשלום, או מנוי: (בתשלום)
- אל תציין מחירים, סכומים, מטבעות או תנאי תשלום — רק "חינם" או "בתשלום"

## פורמט תוצאות

## סרטוני YouTube

### עברית
[כותרת המלאה של הסרטון בעברית](URL)
תיאור קצר של 1-2 משפטים המסביר מה הסרטון מלמד ומדוע הוא רלוונטי

[כותרת המלאה של הסרטון בעברית](URL)
תיאור קצר

### אנגלית
[Full Title of the English Video](URL)
Short description explaining what the video teaches and why it's relevant

[Full Title of the English Video](URL)
Short description

## קורסים מקוונים

### עברית
[כותרת המלאה של הקורס החינמי](URL) (חינם - YouTube)
תיאור קצר

[כותרת המלאה של הקורס בתשלום](URL) (בתשלום)
תיאור קצר

### אנגלית
[Full Title of the Free Course](URL) (Free - YouTube)
Short description

[Full Title of the Paid Course](URL) (Paid)
Short description

## מאמרים אקדמיים

[Full Title of the First Academic Paper](URL)
Short description

[Full Title of the Second Academic Paper](URL)
Short description

חשוב: הכותרת כקישור בשורה אחת, התיאור בשורה נפרדת. בין מקור למקור שורה ריקה. הצג רק קישורים שאומתו כ-valid.`

export async function* streamResearchAgent(
  topic: string,
  userEmail: string,
  docContext: string | null = null,
): AsyncGenerator<ResearchAgentEvent> {
  try {
    const llm = new ChatOpenAI({
      model: RESEARCH_MODEL,
      streaming: true,
      apiKey: process.env.OPENAI_API_KEY,
    })

    const docSection = docContext
      ? `\n\nתוכן המסמך שהועלה (הקשר משני — משמש לזיהוי ההיבטים הספציפיים של הכותרת שנלמדים, לא להחלפת הכותרת כנושא החיפוש):\n---\n${docContext.slice(0, 12000)}\n---`
      : ''

    const agent = createReactAgent({
      llm,
      tools: [buildTavilyTool(), buildUrlValidatorTool()],
      prompt: new SystemMessage(SYSTEM_PROMPT),
    })

    const stream = agent.streamEvents(
      {
        messages: [
          new HumanMessage(`מצא מקורות לימוד איכותיים עבור הנושא: "${topic}"${docSection}`),
        ],
      },
      {
        version: 'v2',
        configurable: {},
        metadata: { user: userEmail, topic },
        runName: 'research-agent',
      },
    )

    for await (const event of stream) {
      if (event.event === 'on_tool_end') {
        yield {
          type: 'step',
          tool: event.name ?? 'search',
          input: typeof event.data?.input === 'string'
            ? event.data.input
            : JSON.stringify(event.data?.input ?? ''),
        }
      } else if (event.event === 'on_chat_model_stream') {
        const chunk = event.data?.chunk
        const text = chunk?.message?.content ?? chunk?.content ?? ''
        if (text) {
          yield { type: 'chunk', content: text }
        }
      }
    }

    yield { type: 'done' }
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : 'שגיאה לא ידועה' }
  }
}
