/**
 * `@app/common` is the home for cross-cutting shared code (utils, validators, config schemas).
 * A tiny example util lives here to demonstrate the library; add your own alongside it.
 */

/** Collapse runs of whitespace and trim — handy for normalizing user-entered names. */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
