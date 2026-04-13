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

export type ResearchAgentEvent =
  | { type: 'step'; tool: string; input: string }
  | { type: 'chunk'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

const SYSTEM_PROMPT = `אתה עוזר מחקר אקדמי המחפש מקורות לימוד איכותיים.
עבור הנושא שיינתן לך, חפש מקורות ואז הצג את התוצאות מחולקות לקטגוריות הבאות:
- סרטוני YouTube (חובה: לפחות 2 סרטונים בעברית ולפחות 2 סרטונים באנגלית — חפש גם אם לא מצאת בחיפוש הראשון)
- קורסים מקוונים (חובה: קורס אחד חינם ואחד בתשלום בעברית + קורס אחד חינם ואחד בתשלום באנגלית — פלייליסטים של YouTube נחשבים קורסים לגיטימיים וחינמיים; כלול אותם כאן אם הם פלייליסט/סדרת סרטונים שלמה ולא סרטון בודד — חובה: הקורס חייב להיות קורס עצמאי ללמידה עצמית ולא קורס אקדמי שהוא חלק מתוכנית לימודים לתואר; אל תכלול קורסים מאתרי אוניברסיטאות/מכללות שמחייבים רישום לתואר או שייכים לקטלוג קורסי החוג)
- מאמרים אקדמיים ומחקרים (חפש ב-Google Scholar, IEEE Xplore, arXiv, ResearchGate, ACM Digital Library בלבד — לא בלוגים, לא ויקיפדיה, לא תיעוד; הקישור חייב להיות ישירות למאמר/לדף המאמר — לא לפרופיל מחבר)

כלל חובה: הצג מקורות בעברית ואנגלית בלבד. אל תכלול שפות אחרות.
חובה לסרטוני YouTube: חפש בנפרד "סרטוני YouTube בעברית על [נושא]" ו-"YouTube videos in English about [topic]" כדי לוודא שיש 2 לפחות לכל שפה.
חובה לקורסים: חפש בנפרד "פלייליסט YouTube [נושא] בעברית" (לקורס החינמי בעברית) + "קורס [נושא] בתשלום בעברית site:udemy.com OR site:coursera.org OR site:idigital.co.il OR site:techmaster.co.il" (לקורס בתשלום בעברית) + "YouTube playlist [topic] full course" (לקורס החינמי באנגלית) + "[topic] course site:udemy.com OR site:coursera.org OR site:linkedin.com/learning" (לקורס בתשלום באנגלית). אל תחפש קורסים באתרי אוניברסיטאות (openu.ac.il, technion.ac.il, tau.ac.il, huji.ac.il, bgu.ac.il וכדומה).
מאמרים — חלוקה לפי שפת התוכן של המאמר (לא לפי שפת המחבר): מאמר שכתוב באנגלית → אנגלית; מאמר שכתוב בעברית → עברית. רוב המאמרים האקדמיים נכתבים באנגלית.
לקטגוריות אחרות: אם לא נמצא מקור בשפה מסוימת, דלג על אותה שפה.

בקטגוריית "קורסים מקוונים", לאחר כל כותרת ציין בסוגריים את פרטי המחיר — זה קריטי לדיוק:
- פלייליסט YouTube: (חינם - YouTube)
- אם חינם לגמרי: (חינם)
- אם יש תקופת ניסיון חינם ולאחר מכן בתשלום: (ניסיון חינם ל-X ימים/חודשים, לאחר מכן בתשלום) — נחשב כקורס בתשלום
- אם קיים מחיר בתוצאות החיפוש שמגיע מדף הקורס הרשמי: רשום את המחיר המדויק במטבע המקורי — דולר → $X, שקל → ₪X, אירו → €X וכו'. דוגמאות: (בתשלום - $59.90/קורס), (בתשלום - ₪490/קורס), (מנוי מ-$39/חודש)
- אם יש גם מחיר קורס בודד וגם מחיר מנוי (כמו Udemy): ציין את מחיר הקורס הבודד — (בתשלום - $X/קורס)
- אם המחיר לא מופיע בשום תוצאת חיפוש מהאתר הרשמי: (בתשלום - יש לפנות לפרטים) — אל תמציא מחיר
- אם יש מסלול חינם ומסלול בתשלום ומחיר ידוע: (חינם חלקי / תעודה מ-$X)
- אם יש מסלול חינם ומסלול בתשלום ומחיר לא ידוע: (חינם חלקי / בתשלום - יש לפנות לפרטים)
כלל ברזל: מחיר שמופיע בדף הקורס הרשמי → רשום אותו. מחיר שלא מופיע שם → אל תמציא.

השתמש בפורמט הבא בדיוק:

## סרטוני YouTube

### עברית
[כותרת סרטון 1](URL)
תיאור קצר של 1-2 משפטים בעברית

[כותרת סרטון 2](URL)
תיאור קצר של 1-2 משפטים בעברית

### אנגלית
[Video Title 1](URL)
Short description in 1-2 sentences

[Video Title 2](URL)
Short description in 1-2 sentences

## קורסים מקוונים

### עברית
[כותרת קורס חינמי](URL) (חינם - YouTube / חינם)
תיאור קצר

[כותרת קורס בתשלום](URL) (בתשלום - X $/קורס / ניסיון חינם ל-X ימים, לאחר מכן X $/חודש)
תיאור קצר

### אנגלית
[Free Course Title](URL) (Free - YouTube / Free)
Short description

[Paid Course Title](URL) (Paid - $X/course / Free trial X days, then $X/month)
Short description

## מאמרים אקדמיים

### עברית
[כותרת המאמר](URL)
תיאור קצר

### אנגלית
[Article Title](URL)
Short description

חשוב: הכותרת כקישור בשורה אחת, התיאור בשורה נפרדת. בין מקור למקור שורה ריקה.`

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
      ? `\n\nתוכן המסמך שהועלה (השתמש בו להבנת הנושא ולוודא שהמקורות רלוונטיים אליו):\n---\n${docContext.slice(0, 4000)}\n---`
      : ''

    const agent = createReactAgent({
      llm,
      tools: [buildTavilyTool()],
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
