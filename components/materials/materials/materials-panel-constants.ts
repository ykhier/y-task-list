import type { EmbeddingStatus } from "@/types"

export const STATUS_LABELS: Record<EmbeddingStatus, string> = {
  pending: "ממתין",
  processing: "מעבד...",
  done: "מוכן",
  error: "שגיאה",
}

export const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.pptx,.txt"
export const MAX_SIZE_LABEL = "50 MB"
