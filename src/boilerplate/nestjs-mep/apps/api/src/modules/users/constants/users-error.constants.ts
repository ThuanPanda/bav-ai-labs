/**
 * Module error keys. The value is a namespaced key `'<MODULE>.<REASON>'` — never a sentence.
 * Throw with a NestJS HTTP exception carrying one of these keys; the client resolves the
 * display text (i18n) on its side.
 */
export const USERS_ERRORS = {
  USER_NOT_FOUND: 'USERS.USER_NOT_FOUND',
} as const;
