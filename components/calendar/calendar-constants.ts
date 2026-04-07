export const HOUR_HEIGHT = 60
export const GRID_START_HOUR = 8
export const GRID_END_HOUR = 31
export const EARLY_START_HOUR = 6
export const GRID_VISIBLE_HOURS = GRID_END_HOUR - GRID_START_HOUR + 1

export const HOURS = Array.from(
  { length: GRID_VISIBLE_HOURS },
  (_, i) => i + GRID_START_HOUR
)

export function getGridEndHour(startHour: number = GRID_START_HOUR): number {
  return startHour + GRID_VISIBLE_HOURS - 1
}

export function buildHours(
  startHour: number = GRID_START_HOUR,
  endHour: number = getGridEndHour(startHour)
): number[] {
  return Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => i + startHour
  )
}
