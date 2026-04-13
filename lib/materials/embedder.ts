import { promisify } from 'util'
import { inflateRaw } from 'zlib'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CHUNK_OVERLAP, CHUNK_SIZE, EMBEDDING_MODEL } from './materials-constants'

const inflateRawAsync = promisify(inflateRaw)

/**
 * Extracts plain text from a .docx buffer using only Node.js built-ins.
 * DOCX = ZIP archive containing word/document.xml (deflate-compressed).
 */
async function extractDocxText(buf: Buffer): Promise<string> {
  let offset = 0
  while (offset < buf.length - 30) {
    // ZIP local file header signature: PK\x03\x04
    if (buf[offset] !== 0x50 || buf[offset + 1] !== 0x4B ||
        buf[offset + 2] !== 0x03 || buf[offset + 3] !== 0x04) {
      offset++
      continue
    }
    const method         = buf.readUInt16LE(offset + 8)
    const compressedSize = buf.readUInt32LE(offset + 18)
    const nameLen        = buf.readUInt16LE(offset + 26)
    const extraLen       = buf.readUInt16LE(offset + 28)
    const name           = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8')
    const dataStart      = offset + 30 + nameLen + extraLen

    if (name === 'word/document.xml') {
      const compressed = buf.subarray(dataStart, dataStart + compressedSize)
      const xml = method === 0
        ? compressed.toString('utf8')
        : (await inflateRawAsync(compressed)).toString('utf8')

      return xml
        .replace(/<w:p[ >][^>]*>/gi, '\n')   // paragraph → newline
        .replace(/<w:br[^>]*\/>/gi, '\n')     // line break → newline
        .replace(/<[^>]+>/g, '')              // strip all tags
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    offset = dataStart + compressedSize
  }
  throw new Error('word/document.xml not found — is this a valid .docx file?')
}

/** Used by the summarize route for RAG retrieval only (not for insertion). */
export function buildVectorStore(serviceClient: SupabaseClient): SupabaseVectorStore {
  const embeddings = new OpenAIEmbeddings({
    model: EMBEDDING_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
  })
  return new SupabaseVectorStore(embeddings, {
    client: serviceClient,
    tableName: 'material_chunks',
    queryName: 'match_material_chunks',
  })
}

const BATCH_SIZE = 50

export async function runEmbeddingPipeline(
  materialId: string,
  fileBuffer: Buffer,
  meta: { tutorialId: string; userId: string; fileName: string; mimeType?: string },
  serviceClient: SupabaseClient,
): Promise<{ chunksCreated: number }> {
  const mime = meta.mimeType ?? 'application/pdf'

  let docs: import('@langchain/core/documents').Document[]

  if (mime === 'application/pdf') {
    const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf')
    docs = await new PDFLoader(new Blob([fileBuffer], { type: 'application/pdf' })).load()
  } else if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  ) {
    const { Document } = await import('@langchain/core/documents')
    const text = await extractDocxText(fileBuffer)
    docs = [new Document({ pageContent: text, metadata: { source: meta.fileName } })]
  } else {
    const { Document } = await import('@langchain/core/documents')
    docs = [new Document({ pageContent: fileBuffer.toString('utf-8'), metadata: {} })]
  }

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP })
  const chunks = await splitter.splitDocuments(docs)

  if (chunks.length === 0) throw new Error('לא ניתן לחלץ טקסט מהקובץ')

  // Embed all chunks via OpenAI
  const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL, apiKey: process.env.OPENAI_API_KEY })
  const vectors = await embeddings.embedDocuments(chunks.map((c) => c.pageContent))

  // Build rows with ALL required columns (SupabaseVectorStore.addDocuments only writes content/embedding/metadata)
  const rows = chunks.map((chunk, i) => ({
    user_id: meta.userId,
    material_id: materialId,
    tutorial_id: meta.tutorialId,
    content: chunk.pageContent,
    metadata: {
      ...chunk.metadata,
      materialId,
      tutorialId: meta.tutorialId,
      fileName: meta.fileName,
      chunkIndex: i,
    },
    embedding: vectors[i],
    chunk_index: i,
  }))

  // Batch insert to avoid hitting Supabase's request size limit
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const { error } = await serviceClient
      .from('material_chunks')
      .insert(rows.slice(start, start + BATCH_SIZE))
    if (error) throw new Error(`שגיאת שמירת embeddings: ${error.message}`)
  }

  return { chunksCreated: rows.length }
}
