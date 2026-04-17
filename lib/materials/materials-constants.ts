export const MAX_FILE_BYTES = 52_428_800 // 50 MB

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
] as const

export const CHUNK_SIZE = 2000
export const CHUNK_OVERLAP = 300
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const CHAT_MODEL = 'gpt-4o'
export const RESEARCH_MODEL = 'gpt-4o'
