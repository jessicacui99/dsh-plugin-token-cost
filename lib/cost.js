/**
 * Pure, deployment-independent money and token-number helpers shared by the
 * host half (config normalization) and the browser half (display formatting).
 *
 * Everything here is a plain function over plain JSON so the same code can run
 * in either world; the browser bundle inlines its own copy of the formatting
 * half because a client bundle is one self-contained module.
 *
 * @module dsh-plugin-token-cost/cost
 */

/** Peak hours are 01:00-04:00 and 06:00-10:00 UTC, Monday through Friday. */
const PEAK_WINDOWS = [
  [1, 4],
  [6, 10],
]

/**
 * Whether one instant falls in the provider's published peak window.
 * @param {Date} [now] - instant to test.
 * @returns {boolean} true inside a peak window.
 */
export function isPeakTime(now = new Date()) {
  const day = now.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = now.getUTCHours()
  return PEAK_WINDOWS.some(([from, to]) => hour >= from && hour < to)
}

/**
 * Normalize one price-table entry.
 * @param {object} entry - raw entry from plugin config.
 * @returns {object} entry with numbers and an optional provider.
 */
export function normalizePrice(entry) {
  return {
    model: String(entry.model),
    ...(entry.provider === undefined ? {} : { provider: String(entry.provider) }),
    inputCacheHit: Number(entry.inputCacheHit) || 0,
    inputCacheMiss: Number(entry.inputCacheMiss) || 0,
    output: Number(entry.output) || 0,
  }
}

/**
 * Normalize a whole price table.
 * @param {readonly object[]} entries - raw entries from plugin config.
 * @returns {object[]} normalized entries.
 */
export function normalizePrices(entries) {
  return entries.map(normalizePrice)
}

/**
 * Resolve the price row that bills one route.
 *
 * An exact provider match wins, then a provider-agnostic row for the same
 * model, then the bare model id, then a row whose model is `*`.
 * @param {readonly object[]} prices - normalized price table.
 * @param {{ provider?: string, model?: string } | undefined} route - billed route.
 * @returns {object | undefined} matching row, or undefined when unpriced.
 */
export function resolvePrice(prices, route) {
  const model = route?.model
  const provider = route?.provider
  if (typeof model === 'string') {
    const exact = prices.find((row) => row.model === model && row.provider === provider)
    if (exact !== undefined) return exact
    const anyProvider = prices.find((row) => row.model === model && row.provider === undefined)
    if (anyProvider !== undefined) return anyProvider
  }
  return prices.find((row) => row.model === '*')
}

/**
 * Cost in `currency`-major units of one token breakdown.
 *
 * The four buckets are disjoint, and `cacheWriteTokens` is billed at the
 * uncached prompt price — the provider's published cache write costs no more
 * than a miss on every route this plugin knows about.
 * @param {{ inputCacheHit: number, inputCacheMiss: number, output: number }} price - price per 1M tokens in the configured currency.
 * @param {{ uncachedInputTokens?: number, cacheReadTokens?: number, cacheWriteTokens?: number, outputTokens?: number }} usage - exact token buckets.
 * @returns {number} price of those tokens.
 */
export function priceOf(price, usage) {
  const cacheReads = usage.cacheReadTokens ?? 0
  const cacheWrites = usage.cacheWriteTokens ?? 0
  const misses = (usage.uncachedInputTokens ?? 0) + cacheWrites
  const outputs = usage.outputTokens ?? 0
  return (cacheReads * price.inputCacheHit + misses * price.inputCacheMiss + outputs * price.output) / 1e6
}

/** Display symbol per currency code; an unknown code keeps its name. */
const SYMBOLS = { CNY: '\u00a5', RMB: '\u00a5', USD: '$', EUR: '\u20ac' }

/**
 * Display-ready amount.
 *
 * A running total is small for a long time, so an exact small amount keeps
 * enough decimals to stay honest while a large one stays readable.
 * @param {number} value - amount in major units.
 * @param {string} currency - currency code, e.g. `CNY`.
 * @returns {string} formatted amount.
 */
export function formatMoney(value, currency = 'CNY') {
  const symbol = SYMBOLS[currency] ?? `${currency} `
  if (!(value > 0)) return `${symbol}0`
  if (value < 0.01) return `${symbol}${value.toFixed(5)}`
  if (value < 1) return `${symbol}${value.toFixed(4)}`
  if (value < 100) return `${symbol}${value.toFixed(3)}`
  return `${symbol}${value.toFixed(2)}`
}

/**
 * Display-ready per-1M-token rate, with the currency's unit suffix.
 * @param {number} value - rate per 1,000,000 tokens.
 * @param {string} currency - currency code.
 * @returns {string} formatted rate.
 */
export function formatRate(value, currency = 'CNY') {
  return `${formatMoney(value, currency)}/M`
}
