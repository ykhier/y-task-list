export const MAX_FILE_BYTES = 20_971_520 // 20 MB

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const

export const CHUNK_SIZE = 1000
export const CHUNK_OVERLAP = 150
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const CHAT_MODEL = 'gpt-4o'
export const RESEARCH_MODEL = 'gpt-4o'
