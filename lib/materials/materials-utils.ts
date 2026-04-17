import path from 'path'
import { ACCEPTED_MIME_TYPES, MAX_FILE_BYTES } from './materials-constants'

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `הקובץ גדול מדי. הגודל המרבי הוא ${formatFileSize(MAX_FILE_BYTES)}.`
  }

  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return 'סוג קובץ לא נתמך. אפשר להעלות PDF, Word, PowerPoint או טקסט.'
  }

  return null
}

export function buildStoragePath(userId: string, tutorialId: string, materialId: string, fileName: string): string {
  const ext = path.extname(fileName).toLowerCase() || '.bin'
  return `${userId}/${tutorialId}/${materialId}${ext}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}
