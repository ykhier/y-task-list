import { execFile } from 'child_process'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { promisify } from 'util'
import { inflateRaw } from 'zlib'
import os from 'os'
import path from 'path'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CHUNK_OVERLAP, CHUNK_SIZE, EMBEDDING_MODEL } from './materials-constants'

const inflateRawAsync = promisify(inflateRaw)
const execFileAsync = promisify(execFile)

function readWorkerError(output: string | undefined): string | null {
  if (!output?.trim()) return null

  try {
    const parsed = JSON.parse(output) as { error?: string }
    return parsed.error ?? null
  } catch {
    return output.trim()
  }
}

async function extractPdfText(buf: Buffer, fileName: string): Promise<{
  text: string
  pages?: number
}> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'materials-pdf-'))
  const pdfPath = path.join(tempDir, fileName || 'document.pdf')
  const workerPath = path.join(process.cwd(), 'scripts', 'extract-pdf-text.mjs')

  try {
    await writeFile(pdfPath, buf)

    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [workerPath, pdfPath],
      { cwd: process.cwd(), timeout: 120000, maxBuffer: 10 * 1024 * 1024 },
    )

    const parsed = JSON.parse(stdout) as { text?: string; pages?: number; error?: string }
    if (parsed.error) {
      throw new Error(parsed.error)
    }

    const text = parsed.text?.trim()
    if (!text) {
      throw new Error(stderr?.trim() || `לא ניתן לחלץ טקסט מהקובץ "${fileName}" - ייתכן שהוא סרוק כתמונה`)
    }

    return { text, pages: parsed.pages }
  } catch (error) {
    const workerStdout = typeof error === 'object' && error !== null && 'stdout' in error
      ? readWorkerError(String((error as { stdout?: string }).stdout ?? ''))
      : null
    const message = error instanceof Error ? error.message : 'PDF extraction failed'
    throw new Error(workerStdout ?? message)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

/**
 * Extracts plain text from a .docx buffer using only Node.js built-ins.
 * DOCX = ZIP archive containing word/document.xml (deflate-compressed).
 */
async function extractDocxText(buf: Buffer): Promise<string> {
  let offset = 0
  while (offset < buf.length - 30) {
    if (buf[offset] !== 0x50 || buf[offset + 1] !== 0x4B ||
        buf[offset + 2] !== 0x03 || buf[offset + 3] !== 0x04) {
      offset++
      continue
    }
    const method = buf.readUInt16LE(offset + 8)
    const compressedSize = buf.readUInt32LE(offset + 18)
    const nameLen = buf.readUInt16LE(offset + 26)
    const extraLen = buf.readUInt16LE(offset + 28)
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8')
    const dataStart = offset + 30 + nameLen + extraLen

    if (name === 'word/document.xml') {
      const compressed = buf.subarray(dataStart, dataStart + compressedSize)
      const xml = method === 0
        ? compressed.toString('utf8')
        : (await inflateRawAsync(compressed)).toString('utf8')

      return xml
        .replace(/<w:p[ >][^>]*>/gi, '\n')
        .replace(/<w:br[^>]*\/>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    offset = dataStart + compressedSize
  }

  throw new Error('word/document.xml not found - is this a valid .docx file?')
}

async function extractPptxText(buf: Buffer): Promise<string> {
  const SLIDE_RE = /^ppt\/slides\/slide(\d+)\.xml$/
  const slides: Array<{ num: number; text: string }> = []

  let offset = 0
  while (offset < buf.length - 30) {
    if (
      buf[offset] !== 0x50 || buf[offset + 1] !== 0x4b ||
      buf[offset + 2] !== 0x03 || buf[offset + 3] !== 0x04
    ) {
      offset++
      continue
    }

    const method = buf.readUInt16LE(offset + 8)
    const compressedSize = buf.readUInt32LE(offset + 18)
    const nameLen = buf.readUInt16LE(offset + 26)
    const extraLen = buf.readUInt16LE(offset + 28)
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8')
    const dataStart = offset + 30 + nameLen + extraLen

    const match = SLIDE_RE.exec(name)
    if (match) {
      const slideNum = parseInt(match[1], 10)
      const compressed = buf.subarray(dataStart, dataStart + compressedSize)
      const xml = method === 0
        ? compressed.toString('utf8')
        : (await inflateRawAsync(compressed)).toString('utf8')

      const texts: string[] = []
      const textRe = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g
      let m: RegExpExecArray | null
      while ((m = textRe.exec(xml)) !== null) {
        const val = m[1]
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
          .trim()
        if (val) texts.push(val)
      }

      if (texts.length > 0) {
        slides.push({ num: slideNum, text: texts.join('\n') })
      }
    }

    if (compressedSize === 0 && method !== 0) {
      offset = dataStart + 1
    } else {
      offset = dataStart + compressedSize
    }
  }

  slides.sort((a, b) => a.num - b.num)
  const combined = slides
    .map(s => `Slide ${s.num}\n${s.text}`)
    .join('\n\n')
    .trim()

  if (!combined) {
    throw new Error('לא ניתן לחלץ טקסט מקובץ ה-PowerPoint')
  }

  return combined
}

const MAX_WORDS = 4_000

function truncateToWords(text: string, maxWords = MAX_WORDS): string {
  let count = 0
  let i = 0
  while (i < text.length && count < maxWords) {
    while (i < text.length && /\s/.test(text[i])) i++
    if (i >= text.length) break
    while (i < text.length && !/\s/.test(text[i])) i++
    count++
  }
  return count >= maxWords ? text.slice(0, i) : text
}

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
    const { Document } = await import('@langchain/core/documents')
    const parsed = await extractPdfText(fileBuffer, meta.fileName)
    docs = [new Document({ pageContent: truncateToWords(parsed.text), metadata: { source: meta.fileName, pages: parsed.pages } })]
  } else if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  ) {
    const { Document } = await import('@langchain/core/documents')
    docs = [new Document({ pageContent: truncateToWords(await extractDocxText(fileBuffer)), metadata: { source: meta.fileName } })]
  } else if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    const { Document } = await import('@langchain/core/documents')
    docs = [new Document({ pageContent: truncateToWords(await extractPptxText(fileBuffer)), metadata: { source: meta.fileName } })]
  } else {
    const { Document } = await import('@langchain/core/documents')
    docs = [new Document({ pageContent: truncateToWords(fileBuffer.toString('utf-8')), metadata: {} })]
  }

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP })
  const chunks = await splitter.splitDocuments(docs)

  if (chunks.length === 0) throw new Error('לא ניתן לחלץ טקסט מהקובץ')

  const { error: deleteChunksError } = await serviceClient
    .from('material_chunks')
    .delete()
    .eq('material_id', materialId)

  if (deleteChunksError) {
    throw new Error(`שגיאת ניקוי chunks קודמים: ${deleteChunksError.message}`)
  }

  const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL, apiKey: process.env.OPENAI_API_KEY })
  const vectors = await embeddings.embedDocuments(chunks.map((c) => c.pageContent))

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

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const { error } = await serviceClient
      .from('material_chunks')
      .insert(rows.slice(start, start + BATCH_SIZE))

    if (error) {
      throw new Error(`שגיאת שמירת embeddings: ${error.message}`)
    }
  }

  return { chunksCreated: rows.length }
}
