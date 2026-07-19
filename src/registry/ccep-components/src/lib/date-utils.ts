import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezonePlugin from 'dayjs/plugin/timezone'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/de'
import 'dayjs/locale/en'

dayjs.extend(utc)
dayjs.extend(timezonePlugin)
dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)

export { dayjs }

export type DateFormat = 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'MM/DD/YYYY' | 'MM-DD-YYYY'

// export const DEFAULT_DATE_FORMAT: DateFormat = 'MM-DD-YYYY'
export const DEFAULT_DATE_FORMAT: DateFormat = 'DD/MM/YYYY'

/**
 * Returns the current moment as a UTC Date.
 * Use instead of `new Date()` everywhere in the codebase.
 */
export function nowUtc(): Date {
  return dayjs.utc().toDate()
}

/**
 * Formats a DB date using the user's preferred date format.
 * Pass includeTime=true to append HH:mm.
 * Always use this instead of calling dayjs.utc(x).format(...) directly.
 */
export function formatDate(
  date: Date | string | null | undefined,
  dateFormat: DateFormat,
  includeTime = false,
): string {
  if (!date) return ''
  const activeFormat = dateFormat || DEFAULT_DATE_FORMAT
  const fmt = includeTime ? `${activeFormat} HH:mm` : activeFormat
  return dayjs.utc(date).format(fmt)
}

/**
 * Serializes a picked date for the API — sends the value exactly as picked,
 * with no browser timezone offset applied.
 *
 * Future: when user.timezone is available, pass it here so that
 * "14:00 in user's timezone" is correctly converted to UTC before sending.
 */
export function toApiDate(date: Date, userTimezone?: string): string {
  if (userTimezone) {
    return dayjs.tz(dayjs.utc(date).format('YYYY-MM-DDTHH:mm:ss'), userTimezone).utc().toISOString()
  }
  return dayjs.utc(date).toISOString()
}
