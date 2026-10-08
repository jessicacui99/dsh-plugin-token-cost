/**
 * Host half of dsh-plugin-token-cost.
 *
 * The browser cannot see API prices: a Session's `tokenUsage` projection
 * carries the four provider-reported buckets and nothing else, and no LLM
 * adapter declares money. So this half registers one more Session projection,
 * `tokenCost`, whose value is this profile's pricing table as plain JSON. The
 * browser half multiplies the buckets by it and renders the running total.
 *
 * The projection has no fold: prices are a deployment constant, not something
 * derived from the durable Session log, so `apply` returns its state unchanged
 * for every event and the value is published once per Host generation.
 *
 * This half imports nothing. A plugin installed beside a profile resolves its
 * own bare imports from its own directory, not from the profile, so staying
 * dependency-free is what keeps the plugin installable wherever the profile
 * lives; the two tiny schema adapters below are the only validation it needs.
 *
 * @module dsh-plugin-token-cost
 */

import { normalizePrices } from './cost.js'

/**
 * Default price table, in yuan per 1,000,000 tokens, from the provider's
 * Chinese price list for the `deepseek-flash` and `deepseek-v4-pro` routes.
 * These are the published PEAK rates; off-peak is half of peak on every row,
 * which `period: auto` applies at display time.
 */
const DEFAULT_PRICES = [
  {
    model: 'deepseek-flash',
    provider: 'deepseek-official',
    inputCacheHit: 0.04,
    inputCacheMiss: 2,
    output: 8,
  },
  {
    model: 'deepseek-v4-pro',
    provider: 'deepseek-official',
    inputCacheHit: 0.3,
    inputCacheMiss: 9,
    output: 27,
  },
]

const PERIODS = ['peak', 'off-peak', 'auto']

/**
 * A parse-only schema: the projection registry stores whatever the cache row
 * held and needs one validator per fold state and wire value. The return shape
 * is the subset of the registry's schema contract it actually calls.
 * @param {(value: unknown) => string | null} check - returns an error, or null when valid.
 * @param {() => unknown} [empty] - default for a missing value.
 * @returns {{ parse: (value: unknown) => unknown, safeParse: (value: unknown) => object }} schema.
 */
function schema(check, empty) {
  const parse = (value) => {
    const actual = value === undefined && empty !== undefined ? empty() : value
    const problem = check(actual)
    if (problem !== null) throw new Error(`dsh-plugin-token-cost: ${problem}`)
    return actual
  }
  return {
    parse,
    safeParse(value) {
      try {
        return { success: true, data: parse(value) }
      } catch (error) {
        return { success: false, error }
      }
    },
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validate one normalized price row. */
function checkPrice(row) {
  if (!isPlainObject(row)) return 'each models entry must be an object'
  if (typeof row.model !== 'string' || row.model.length === 0) return 'models[].model must be a non-empty string'
  if (row.provider !== undefined && typeof row.provider !== 'string') return 'models[].provider must be a string'
  for (const key of ['inputCacheHit', 'inputCacheMiss', 'output']) {
    if (typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] < 0) {
      return `models[].${key} must be a non-negative number`
    }
  }
  return null
}

/** Validate the projection value the browser prices against. */
function checkValue(value) {
  if (!isPlainObject(value)) return 'the tokenCost value must be an object'
  if (typeof value.currency !== 'string') return 'currency must be a string'
  if (!PERIODS.includes(value.period)) return `period must be one of ${PERIODS.join(', ')}`
  if (!Array.isArray(value.models)) return 'models must be an array'
  for (const row of value.models) {
    const problem = checkPrice(row)
    if (problem !== null) return problem
  }
  return null
}

const valueSchema = schema(checkValue)

/**
 * Validate one row's raw configuration, pushing a Standard Schema issue per
 * problem.
 * @param {unknown} value - configuration as the Loader hands it over.
 * @param {object[]} issues - issue sink.
 * @returns {string | null} the first problem, or null when the shape is usable.
 */
function checkConfigInput(value, issues) {
  const fail = (message, path) => {
    issues.push({ message, path })
    return message
  }
  if (!isPlainObject(value)) return fail('config must be a mapping', [])
  if (value.currency !== undefined && typeof value.currency !== 'string') {
    return fail('currency must be a string', ['currency'])
  }
  if (value.period !== undefined && !PERIODS.includes(value.period)) {
    return fail(`period must be one of ${PERIODS.join(', ')}`, ['period'])
  }
  if (value.models === undefined) return null
  if (!Array.isArray(value.models) || value.models.length === 0) {
    return fail('models must be a non-empty array of price entries', ['models'])
  }
  for (const [index, entry] of value.models.entries()) {
    if (!isPlainObject(entry)) return fail('each models entry must be a mapping', ['models', index])
    if (typeof entry.model !== 'string' || entry.model.length === 0) {
      return fail('models[].model is required', ['models', index, 'model'])
    }
    if (entry.provider !== undefined && typeof entry.provider !== 'string') {
      return fail('models[].provider must be a string', ['models', index, 'provider'])
    }
    for (const key of ['inputCacheHit', 'inputCacheMiss', 'output']) {
      const rate = entry[key]
      if (rate === undefined || rate === null) continue
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0) {
        return fail(`models[].${key} must be a non-negative number`, ['models', index, key])
      }
    }
  }
  return null
}

/**
 * Validate and fill one row configuration.
 * @param {object} [raw] - configuration as the Loader hands it over.
 * @returns {{ currency: string, period: string, models: object[] }} effective config.
 */
export function resolveConfig(raw = {}) {
  const config = isPlainObject(raw) ? raw : {}
  const currency = typeof config.currency === 'string' && config.currency.length > 0 ? config.currency : 'CNY'
  const period = PERIODS.includes(config.period) ? config.period : 'auto'
  const entries = Array.isArray(config.models) && config.models.length > 0 ? config.models : DEFAULT_PRICES
  const models = normalizePrices(entries)
  const problem = checkValue({ currency, period, models })
  if (problem !== null) throw new Error(`dsh-plugin-token-cost: invalid configuration — ${problem}`)
  return { currency, period, models }
}

/**
 * The plugin's configuration schema, in the Standard Schema shape Cordis
 * validates a row's `config` with. Validation is also where defaults are
 * materialized, so `apply` only ever sees a complete, normalized config and a
 * typo in the patch fails loudly at load instead of rendering a wrong price.
 */
export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-plugin-token-cost',
    validate(value) {
      const issues = []
      const problem = checkConfigInput(value === undefined ? {} : value, issues)
      if (problem !== null) return { issues }
      return { value: resolveConfig(value === undefined ? {} : value) }
    },
  },
  /** Convenience alias mirroring the schemastery/zod surface used elsewhere. */
  parse(value) {
    const result = Config['~standard'].validate(value)
    if (result.issues !== undefined) {
      throw new Error(`dsh-plugin-token-cost: ${result.issues.map((issue) => issue.message).join('; ')}`)
    }
    return result.value
  },
}

/** Session projections this row feeds; the browser half reads the value back. */
export const inject = ['sessionProjections']

/**
 * Register the `tokenCost` Session projection.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context.
 * @param {object} [rawConfig] - row configuration from the profile patch.
 */
export function apply(ctx, rawConfig = {}) {
  const value = Config.parse(rawConfig)

  ctx.sessionProjections.register({
    key: 'tokenCost',
    stateSchema: valueSchema,
    // Prices never depend on the Session, so every Session folds to the same
    // constant state and `apply` is the identity.
    init: () => value,
    apply: (state) => state,
    wire: {
      viewSchema: valueSchema,
      view: (state) => state,
    },
    stateVersion: 1,
  })
}
