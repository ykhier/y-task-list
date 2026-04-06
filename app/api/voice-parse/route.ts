import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { wrapOpenAI } from 'langsmith/wrappers'
import { traceable } from 'langsmith/traceable'
import { createClient } from '@/lib/supabase/server'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export async function POST(req: NextRequest) {
  const openai = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }))
  const cookieStore = await cookies()
  const supabase = createClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options)
      })
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email ?? 'unknown'

  const formData = await req.formData()
  const audio = formData.get('audio') as Blob | null

  if (!audio) {
    return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
  }

  const today = new Date()
  const todayDayIndex = today.getDay()
  const tomorrowDayIndex = (todayDayIndex + 1) % 7

  const systemPrompt =
    `You are a Hebrew voice input parser for a weekly planner. The user may record multiple times — both to fill in fields for the first time AND to update/correct existing values.\n` +
    `Recognize update commands: "שנה ל-", "עדכן ל-", "תעדכן", "במקום", "תהיה", "הזז ל-", "תשנה" — extract the NEW value only and set all other fields to null.\n` +
    `Extract ONLY the fields the user explicitly mentioned. Set every other field to null.\n` +
    `Title rules:\n` +
    `  - Include category words like "הרצאה"/"שיעור"/"תרגיל" in the title when spoken together with a subject name (e.g. "הרצאת מתמטיקה" → title="הרצאת מתמטיקה").\n` +
    `  - If only a generic word like "הרצאה" is said without a specific subject name, set title=null (preserve existing title).\n\n` +
    `Return ONLY a JSON object (no markdown) with these fields — null if not mentioned:\n` +
    `- "title": string | null\n` +
    `- "description": string | null  (free-text details spoken after words like "תיאור"/"בנושא"/"עם הערה"/"הערה"; null if not mentioned)\n` +
    `- "dayIndex": 0-6 | null  (0=ראשון/Sun,1=שני/Mon,2=שלישי/Tue,3=רביעי/Wed,4=חמישי/Thu,5=שישי/Fri,6=שבת/Sat)\n` +
    `- "startTime": "HH:MM" | null\n` +
    `- "endTime": "HH:MM" | null  (compute from startTime + spoken duration; null if neither start nor duration given)\n` +
    `- "isRecurring": boolean | null  (true="קבוע"/"כל שבוע"/"שבועי", false="לא קבוע"; null if not mentioned)\n` +
    `- "color": "blue"|"green"|"orange"|"purple"|"red" | null  (כחול=blue,ירוק=green,כתום=orange,סגול=purple,אדום=red; null if not mentioned)\n` +
    `- "tutorial": { "dayIndex", "startTime", "endTime", "isRecurring" } | null  (only if "תרגול"/"תרגיל" mentioned; inner fields also null if not given)\n` +
    `- "feedback": string  (ALWAYS present — a concise Hebrew sentence about what you understood:\n` +
    `    • If ALL planner fields are null (nothing relevant detected): start with "לא הבנתי , " then briefly explain what was said is not relevant, and give a short example e.g. "לא הבנתי , נסה למשל ׳הרצאת מתמטיקה ביום שני 10:00׳"\n` +
    `    • If fields were extracted (new entry): summarize what was captured, e.g. "זיהיתי: הרצאת מתמטיקה · יום שני · 10:00–11:00"\n` +
    `    • If it was an update command: confirm the change, e.g. "עדכנתי שעה ל-16:00" or "עדכנתי יום לרביעי"\n` +
    `    • Keep it under 60 chars. No punctuation at the end.)\n\n` +
    `IMPORTANT scoping rule: "קבוע"/"כל שבוע" that appears in the tutorial part of the sentence → tutorial.isRecurring=true (NOT top-level isRecurring). "קבוע" in the lecture part → top-level isRecurring=true.\n\n` +
    `Today=${DAY_NAMES[todayDayIndex]}(${todayDayIndex}). היום=${todayDayIndex}, מחר=${tomorrowDayIndex}.\n` +
    `Durations: שעה=60m, שעה וחצי=90m, שעתיים=120m, רבע שעה=15m.\n\n` +
    `Examples:\n` +
    `"שנה שעה ל-16:00" → {"title":null,"dayIndex":null,"startTime":"16:00","endTime":null,"isRecurring":null,"color":null,"tutorial":null,"feedback":"עדכנתי שעת התחלה ל-16:00"}\n` +
    `"הרצאת מתמטיקה ביום שני 10:00 שעה" → {"title":"הרצאת מתמטיקה","dayIndex":1,"startTime":"10:00","endTime":"11:00","isRecurring":null,"color":null,"tutorial":null,"feedback":"זיהיתי: הרצאת מתמטיקה · יום שני · 10:00–11:00"}\n` +
    `"מה השעה עכשיו?" → {"title":null,"description":null,"dayIndex":null,"startTime":null,"endTime":null,"isRecurring":null,"color":null,"tutorial":null,"feedback":"לא הבנתי, נסה למשל ׳הרצאת מתמטיקה ביום שני 10:00׳"}\n` +
    `"אוקיי תודה" → {"title":null,"description":null,"dayIndex":null,"startTime":null,"endTime":null,"isRecurring":null,"color":null,"tutorial":null,"feedback":"לא הבנתי, נסה למשל ׳פגישה ביום רביעי 14:00׳"}\n` +
    `"תרגול ביום שלישי 14:00 שעה וחצי קבוע" → {"title":null,"dayIndex":null,"startTime":null,"endTime":null,"isRecurring":null,"color":null,"tutorial":{"dayIndex":2,"startTime":"14:00","endTime":"15:30","isRecurring":true},"feedback":"זיהיתי תרגול: יום שלישי · 14:00–15:30 · קבוע"}\n` +
    `"הרצאת פיזיקה ביום שני 10:00 שעה, תרגול ביום חמישי 17:00 שעתיים קבוע" → {"title":"הרצאת פיזיקה","dayIndex":1,"startTime":"10:00","endTime":"11:00","isRecurring":null,"color":null,"tutorial":{"dayIndex":4,"startTime":"17:00","endTime":"19:00","isRecurring":true},"feedback":"זיהיתי: הרצאת פיזיקה · שני 10:00 + תרגול חמישי 17:00"}\n` +
    `"הרצאת פיזיקה קבועה ביום שני 10:00 שעה, תרגול ביום חמישי 17:00 שעתיים" → {"title":"הרצאת פיזיקה","dayIndex":1,"startTime":"10:00","endTime":"11:00","isRecurring":true,"color":null,"tutorial":{"dayIndex":4,"startTime":"17:00","endTime":"19:00","isRecurring":null},"feedback":"זיהיתי: הרצאת פיזיקה קבועה · שני 10:00 + תרגול חמישי 17:00"}\n` +
    `"שנה יום לרביעי" → {"title":null,"dayIndex":3,"startTime":null,"endTime":null,"isRecurring":null,"color":null,"tutorial":null,"feedback":"עדכנתי יום לרביעי"}\n` +
    `"עדכן שעת סיום ל-18:00" → {"title":null,"dayIndex":null,"startTime":null,"endTime":"18:00","isRecurring":null,"color":null,"tutorial":null,"feedback":"עדכנתי שעת סיום ל-18:00"}\n` +
    `"שנה כותרת ל-הרצאת כימיה" → {"title":"הרצאת כימיה","dayIndex":null,"startTime":null,"endTime":null,"isRecurring":null,"color":null,"tutorial":null,"feedback":"עדכנתי כותרת ל׳הרצאת כימיה׳"}\n` +
    `"הרצאת רשתות ביום שני 10:00 שעה" → {"title":"הרצאת רשתות","dayIndex":1,"startTime":"10:00","endTime":"11:00","isRecurring":null,"color":null,"tutorial":null,"feedback":"זיהיתי: הרצאת רשתות · יום שני · 10:00–11:00"}\n` +
    `"הרצאה ביום שני 10:00 שעה" → {"title":null,"dayIndex":1,"startTime":"10:00","endTime":"11:00","isRecurring":null,"color":null,"tutorial":null,"feedback":"זיהיתי: יום שני · 10:00–11:00"}\n` +
    `"תרגול ביום שישי" → {"title":null,"description":null,"dayIndex":null,"startTime":null,"endTime":null,"isRecurring":null,"color":null,"tutorial":{"dayIndex":5,"startTime":null,"endTime":null,"isRecurring":null},"feedback":"זיהיתי תרגול: יום שישי"}\n` +
    `"ללמוד מתמטיקה ביום שני 10:00 שעה תיאור פרק 3 גבולות" → {"title":"ללמוד מתמטיקה","description":"פרק 3 גבולות","dayIndex":1,"startTime":"10:00","endTime":"11:00","isRecurring":null,"color":null,"tutorial":null,"feedback":"זיהיתי: ללמוד מתמטיקה · יום שני · 10:00–11:00"}\n` +
    `"פגישה עם דן ביום רביעי 14:00 עם הערה להביא מסמכים" → {"title":"פגישה עם דן","description":"להביא מסמכים","dayIndex":3,"startTime":"14:00","endTime":null,"isRecurring":null,"color":null,"tutorial":null,"feedback":"זיהיתי: פגישה עם דן · יום רביעי · 14:00"}`

  const parseVoice = traceable(
    async () => {
      // Try fast single-call path (gpt-4o-audio-preview)
      try {
        const arrayBuffer = await audio!.arrayBuffer()
        const base64Audio = Buffer.from(arrayBuffer).toString('base64')

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-audio-preview',
          modalities: ['text'],
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content: [{ type: 'input_audio', input_audio: { data: base64Audio, format: 'webm' } }] as any,
            },
          ],
        })

        const raw = completion.choices[0].message.content ?? '{}'
        const jsonText = raw.replace(/^```(?:json)?\n?|\n?```$/g, '').trim()
        return JSON.parse(jsonText)
      } catch {
        // Fall back to Whisper + GPT-4o-mini
      }

      // Fallback: Whisper transcription → GPT parse
      const file = new File([audio!], 'recording.webm', { type: 'audio/webm' })
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'he',
      })

      const fallbackPrompt = systemPrompt.replace('Listen to the Hebrew audio and', 'Parse this Hebrew text and')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: fallbackPrompt },
          { role: 'user', content: transcription.text },
        ],
      })

      return JSON.parse(completion.choices[0].message.content ?? '{}')
    },
    { name: 'voice-parse', metadata: { user: userEmail } },
  )

  try {
    const result = await parseVoice()
    const { feedback, ...parsed } = result
    return NextResponse.json({ parsed, feedback: feedback ?? null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה בעיבוד הקול'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
