export const HOUR_HEIGHT = 60
export const GRID_START_HOUR = 8    // default start (moves earlier if early events exist)
export const GRID_END_HOUR = 31     // always ends at 07:00 next morning (24 + 7)
export const EARLY_START_HOUR = 6   // earliest possible start when early events exist

/** Full hours array for the default grid: 08:00 – 07:00 next day */
export const HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
  (_, i) => i + GRID_START_HOUR,
) // [8..31]

/** Build a hours array from startHour up to GRID_END_HOUR. */
export function buildHours(startHour: number = GRID_START_HOUR): number[] {
  return Array.from(
    { length: GRID_END_HOUR - startHour + 1 },
    (_, i) => i + startHour,
  )
}
