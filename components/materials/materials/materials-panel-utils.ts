import type { EmbeddingStatus } from "@/types"

/**
 * Extracts { type, courseName } from a Hebrew tutorial/event title.
 * "הרצאת רשתות" → { type: "הרצאה", courseName: "רשתות" }
 * "תרגול – הרצאת רשתות" → { type: "תרגול", courseName: "רשתות" }
 */
export function parseTutorialTitle(title: string): { type: string; courseName: string } {
  const stripLecture = (s: string) =>
    s.replace(/^הרצאת\s+/, '').replace(/^הרצאה\s+(?:ב|על\s+)?(?:נושא\s+)?/, '').replace(/^הרצאה\s*[-–—]\s*/, '').trim()

  const dashMatch = title.match(/^(.+?)\s*[–—-]\s*(.+)$/)
  if (dashMatch) {
    const type = dashMatch[1].trim()
    const courseName = stripLecture(dashMatch[2].trim())
    return { type, courseName: courseName || dashMatch[2].trim() }
  }

  const constructMatch = title.match(/^הרצאת\s+(.+)$/)
  if (constructMatch) return { type: 'הרצאה', courseName: constructMatch[1].trim() }

  const bareType = title.match(/^(הרצאה|תרגול|סמינר|סימנר|סדנה|שיעור)\s+(.+)$/)
  if (bareType) return { type: bareType[1], courseName: bareType[2].trim() }

  return { type: '', courseName: title }
}

export function getStatusBadgeVariant(
  status: EmbeddingStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "done":      return "default"
    case "processing": return "secondary"
    case "pending":   return "outline"
    case "error":     return "destructive"
  }
}
