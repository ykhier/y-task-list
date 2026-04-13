import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { ChatOpenAI } from '@langchain/openai'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables'
import { CHAT_MODEL } from './materials-constants'

const SUMMARY_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `אתה עוזר אקדמי המסכם חומרי לימוד בעברית. צור סיכום מובנה ומקצועי מהקטעים שסופקו.
הסיכום חייב להכיל את הסעיפים הבאים בדיוק:
## מבוא
## נושאים מרכזיים
## הגדרות חשובות
## סיכום

כתוב בעברית, בצורה ברורה ומתומצתת. התמקד בתוכן החינוכי. אל תוסיף מידע שאינו בחומרים.`,
  ],
  [
    'human',
    `הנושא: {title}

קטעים מהחומרים:
{context}

כתוב סיכום מובנה.`,
  ],
])

function formatDocs(docs: { pageContent: string }[]): string {
  return docs.map((d, i) => `[קטע ${i + 1}]\n${d.pageContent}`).join('\n\n')
}

export function buildSummarizeChain(
  vectorStore: SupabaseVectorStore,
  tutorialTitle: string,
  tutorialId: string,
): RunnableSequence {
  const retriever = vectorStore.asRetriever({
    k: 20,
    filter: { tutorialId },
  })

  const llm = new ChatOpenAI({
    model: CHAT_MODEL,
    streaming: true,
    apiKey: process.env.OPENAI_API_KEY,
  })

  return RunnableSequence.from([
    RunnablePassthrough.assign({
      context: async () => {
        const docs = await retriever.invoke(tutorialTitle)
        return formatDocs(docs)
      },
      title: () => tutorialTitle,
    }),
    SUMMARY_PROMPT,
    llm,
    new StringOutputParser(),
  ])
}
