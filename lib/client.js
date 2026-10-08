/**
 * Browser half of dsh-plugin-token-cost.
 *
 * A client bundle is the package's one self-contained browser module, in the
 * loader's lazy-CJS format: running the script only registers the factory, and
 * the factory body (styles included) runs at first materialization. The halves
 * it needs — React, the JSX runtime — are platform seed words, and
 * `useProjection` arrives as a framework-injected standard prop on a
 * Session-scoped slot, so this file requires nothing outside the baseline.
 *
 * @module dsh-plugin-token-cost/client
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-token-cost',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')
    const { jsx, jsxs, Fragment } = require('react/jsx-runtime')

    // ── styles ───────────────────────────────────────────────────────────────
    // The loader removes this tag with the plugin's fiber; `data-plugin` is
    // the id the module system matches on.
    const CSS = [
      '.tc_root{box-sizing:border-box;min-width:0;max-width:100%;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));justify-content:center;gap:12px;display:flex}',
      '.tc_anchor{position:relative;min-width:0;display:inline-flex}',
      // Never use the `font` shorthand in a rule that also sets `font-size`:
      // the shorthand resets size to the browser default, which is exactly how
      // this pill once rendered two steps larger than the token pill beside it.
      '.tc_pill{box-sizing:border-box;max-width:100%;color:var(--dsw-alias-label-tertiary);font-family:inherit;font-weight:inherit;font-style:inherit;font-size:inherit;font-variant-numeric:tabular-nums;line-height:inherit;white-space:nowrap;background:0 0;border:none;border-radius:24px;align-items:center;gap:6px;padding:1px 8px;display:inline-flex}',
      '.tc_pill svg{flex:none;width:14px;height:14px}',
      'button.tc_pill{cursor:pointer}',
      'button.tc_pill:hover,button.tc_pill[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.tc_label{text-overflow:ellipsis;min-width:0;overflow:hidden}',
      '.tc_panel{position:absolute;bottom:calc(100% + 8px);left:0;z-index:100;box-sizing:border-box;width:290px;max-width:min(320px,100vw - 32px);padding:12px 14px;border-radius:14px;background:var(--dsw-specific-menu,var(--dsw-alias-bg-base,Canvas));box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgb(0 0 0 / 18%));color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;display:flex;flex-direction:column;gap:8px}',
      '.tc_panelRight{left:auto;right:0}',
      '.tc_head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}',
      '.tc_title{color:var(--dsw-alias-label-tertiary);font-size:12px}',
      '.tc_total{font-variant-numeric:tabular-nums;font-weight:600;font-size:15px}',
      '.tc_rule{height:1px;background:var(--dsw-alias-separator-primary);margin:0}',
      '.tc_rows{display:flex;flex-direction:column;gap:3px;margin:0}',
      '.tc_row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
      '.tc_rowLabel{color:var(--dsw-alias-label-secondary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.tc_rowValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);white-space:nowrap}',
      '.tc_sub{color:var(--dsw-alias-label-tertiary);font-size:11.5px}',
      '.tc_foot{color:var(--dsw-alias-label-tertiary);font-size:11.5px;display:flex;flex-wrap:wrap;gap:4px 10px}',
      '.tc_modes{display:flex;gap:4px;margin-top:2px}',
      '.tc_mode{font-family:inherit;font-weight:inherit;font-size:11.5px;color:var(--dsw-alias-label-tertiary);background:0 0;border:1px solid var(--dsw-alias-separator-primary);border-radius:10px;padding:1px 8px;cursor:pointer}',
      '.tc_mode[aria-pressed=true]{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}',
    ].join('')
    const TAG_ID = 'dsh-plugin-token-cost'
    if (
      typeof document !== 'undefined' &&
      document.querySelector('style[data-plugin-css=' + JSON.stringify(TAG_ID) + ']') === null
    ) {
      const tag = document.createElement('style')
      tag.dataset.plugin = TAG_ID
      tag.dataset.pluginCss = TAG_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    // ── pricing (the browser's own copy of lib/cost.js) ──────────────────────
    const PEAK_WINDOWS = [
      [1, 4],
      [6, 10],
    ]

    /** Whether one instant is inside the provider's weekly peak window (UTC). */
    function isPeakTime(now) {
      const day = now.getUTCDay()
      if (day === 0 || day === 6) return false
      const hour = now.getUTCHours()
      return PEAK_WINDOWS.some(([from, to]) => hour >= from && hour < to)
    }

    function resolvePrice(prices, route) {
      const model = route?.model
      if (typeof model === 'string') {
        const exact = prices.find((row) => row.model === model && row.provider === route.provider)
        if (exact !== undefined) return exact
        const anyProvider = prices.find((row) => row.model === model && row.provider === undefined)
        if (anyProvider !== undefined) return anyProvider
      }
      return prices.find((row) => row.model === '*')
    }

    function priceOf(price, usage) {
      const cacheReads = usage.cacheReadTokens ?? 0
      const misses = (usage.uncachedInputTokens ?? 0) + (usage.cacheWriteTokens ?? 0)
      return (
        (cacheReads * price.inputCacheHit +
          misses * price.inputCacheMiss +
          (usage.outputTokens ?? 0) * price.output) /
        1e6
      )
    }

    // ── display helpers ─────────────────────────────────────────────────────
    const nf = typeof Intl === 'undefined' ? null : new Intl.NumberFormat()
    /** Display symbol per currency code; an unknown code keeps its name. */
    const SYMBOLS = { CNY: '\u00a5', RMB: '\u00a5', USD: '$', EUR: '\u20ac' }

    /** Grouped integer token count. */
    function tokens(value) {
      return nf === null ? String(value) : nf.format(value)
    }

    /**
     * Display-ready amount.
     *
     * A running total stays tiny for a long time, so a small amount keeps
     * enough decimals to stay honest while a large one stays readable.
     */
    function money(value, currency = 'CNY') {
      const symbol = SYMBOLS[currency] ?? `${currency} `
      if (!(value > 0)) return `${symbol}0`
      if (value < 0.01) return `${symbol}${value.toFixed(5)}`
      if (value < 1) return `${symbol}${value.toFixed(4)}`
      if (value < 100) return `${symbol}${value.toFixed(3)}`
      return `${symbol}${value.toFixed(2)}`
    }

    /** Per-1M-token rate text in the configured currency. */
    function rate(value, currency) {
      return `${money(value, currency)}/M`
    }

    function priceAt(price, peak) {
      const factor = peak ? 1 : 0.5
      return {
        inputCacheHit: price.inputCacheHit * factor,
        inputCacheMiss: price.inputCacheMiss * factor,
        output: price.output * factor,
      }
    }

    // ── component ───────────────────────────────────────────────────────────
    const DICT = {
      zh: {
        title: '本次会话花费',
        pill: '花费 {amount}',
        pillTitle: '本会话累计花费 {amount}',
        running: '生成中',
        notPriced: '未配置该模型价格',
        notPricedHint: '在插件的 models 表里补上 {model} 的价格。',
        cacheMiss: '输入 · 缓存未命中',
        cacheHit: '输入 · 缓存命中',
        cacheWrite: '输入 · 缓存写入',
        output: '输出',
        peak: '高峰时段价',
        offPeak: '低谷时段价',
        approximate: 'Token 数取自服务端上报，按当前模型价格计算',
        exact: 'Token 数取自服务端上报，按当前模型价格计算',
        rates: '按价格表估算 · 低谷 {off} / 高峰 {peak}（当前按 {mode}）',
        ratesUnpriced: '未配置该模型价格',
      },
      en: {
        title: 'Session spend',
        pill: '{amount} spent',
        pillTitle: '{amount} spent in this session',
        running: 'generating',
        notPriced: 'No price configured for this model',
        notPricedHint: 'Add {model} to the plugin\u2019s models table.',
        cacheMiss: 'Input · cache miss',
        cacheHit: 'Input · cache hit',
        cacheWrite: 'Input · cache write',
        output: 'Output',
        peak: 'Peak',
        offPeak: 'Off-peak',
        exact: 'Exact: server-reported token buckets, priced at the current model',
        approximate: 'Exact: server-reported token buckets, priced at the current model',
        rates: 'Estimated from the price table · off-peak {off} / peak {peak} (now: {mode})',
        ratesUnpriced: 'No price configured for this model',
      },
    }

    /** One `label · value` row. */
    function Row({ label, value, detail }) {
      return jsxs('div', {
        className: 'tc_row',
        children: [
          jsx('span', { className: 'tc_rowLabel', children: label }),
          jsxs('span', {
            className: 'tc_rowValue',
            children: [value, detail === undefined ? null : jsx('span', { className: 'tc_sub', children: ` ${detail}` })],
          }),
        ],
      })
    }

    function CostPill({ useProjection, t }) {
      const usage = useProjection('tokenUsage')
      const route = useProjection('modelSelection')
      const cost = useProjection('tokenCost')
      const [open, setOpen] = React.useState(false)
      const [overflow, setOverflow] = React.useState(false)
      const [periodMode, setPeriodMode] = React.useState(null)
      const anchorRef = React.useRef(null)

      const now = Date.now()
      const autoPeak = isPeakTime(new Date(now))
      const configured = cost?.period ?? 'auto'
      const effectivePeak =
        periodMode !== null
          ? periodMode === 'peak'
          : configured === 'peak'
            ? true
            : configured === 'off-peak'
              ? false
              : autoPeak

      const currency = cost?.currency ?? 'CNY'
      const prices = cost?.models ?? []
      const billed = route?.lastUsed ?? route?.next ?? undefined
      const price = prices.length === 0 ? undefined : resolvePrice(prices, billed)
      const row = price === undefined ? undefined : priceAt(price, effectivePeak)

      const cacheReads = usage?.cacheReadTokens ?? 0
      const cacheWrites = usage?.cacheWriteTokens ?? 0
      const misses = (usage?.uncachedInputTokens ?? 0) + cacheWrites
      const outputs = usage?.outputTokens ?? 0
      const total = row === undefined ? 0 : priceOf(row, usage ?? {})
      const hasUsage = usage !== undefined && misses + cacheReads + outputs > 0

      // A popover near the right edge would be clipped; mirror it instead.
      React.useEffect(() => {
        if (!open) return
        const node = anchorRef.current
        if (node !== null) {
          const rect = node.getBoundingClientRect()
          setOverflow(rect.left + 290 > (window.innerWidth ?? 0) - 12)
        }
        const onPointerDown = (event) => {
          if (node !== null && !node.contains(event.target)) setOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [open])

      if (!hasUsage) return null

      const amount = money(total, currency)
      const unpriced = price === undefined
      const label = unpriced ? t('notPriced') : t('pill', { amount })
      const modeText = effectivePeak ? t('peak') : t('offPeak')
      // The headline figure is an estimate from this profile's price table, so
      // the panel states both published tiers and which one the pill used.
      const peakTotal = price === undefined ? 0 : priceOf(priceAt(price, true), usage ?? {})
      const offPeakTotal = price === undefined ? 0 : priceOf(priceAt(price, false), usage ?? {})
      const rateNote = unpriced
        ? t('ratesUnpriced')
        : t('rates', {
            off: money(offPeakTotal, currency),
            peak: money(peakTotal, currency),
            mode: modeText,
          })

      const rows = [
        jsx(Row, { key: 'miss', label: t('cacheMiss'), value: tokens(misses) }, 'miss'),
        jsx(Row, { key: 'hit', label: t('cacheHit'), value: tokens(cacheReads) }, 'hit'),
        jsx(Row, { key: 'write', label: t('cacheWrite'), value: tokens(cacheWrites) }, 'write'),
        jsx(Row, { key: 'out', label: t('output'), value: tokens(outputs) }, 'out'),
      ]

      const breakdown =
        row === undefined
          ? null
          : [
              jsx(
                Row,
                {
                  key: 'cost-miss',
                  label: t('cacheMiss'),
                  value: money((misses * row.inputCacheMiss) / 1e6, currency),
                  detail: rate(row.inputCacheMiss, currency),
                },
                'cost-miss',
              ),
              jsx(
                Row,
                {
                  key: 'cost-hit',
                  label: t('cacheHit'),
                  value: money((cacheReads * row.inputCacheHit) / 1e6, currency),
                  detail: rate(row.inputCacheHit, currency),
                },
                'cost-hit',
              ),
              jsx(
                Row,
                {
                  key: 'cost-out',
                  label: t('output'),
                  value: money((outputs * row.output) / 1e6, currency),
                  detail: rate(row.output, currency),
                },
                'cost-out',
              ),
            ]

      const panel = open
        ? jsxs('div', {
            className: overflow ? 'tc_panel tc_panelRight' : 'tc_panel',
            role: 'dialog',
            'aria-label': t('title'),
            children: [
              jsxs('div', {
                className: 'tc_head',
                children: [
                  jsx('span', { className: 'tc_title', children: t('title') }),
                  jsx('span', { className: 'tc_total', children: amount }),
                ],
              }),
              jsx('div', { className: 'tc_rule' }),
              jsx('div', { className: 'tc_rows', children: breakdown === null ? rows : breakdown }),
              jsx('div', { className: 'tc_rule' }),
              jsx('div', {
                className: 'tc_foot',
                children: [
                  jsx('span', {
                    children: unpriced
                      ? t('notPricedHint', { model: billed?.model ?? '—' })
                      : rateNote,
                  }),
                ],
              }),
              configured === 'auto' && !unpriced
                ? jsxs('div', {
                    className: 'tc_modes',
                    children: [
                      jsx(
                        'button',
                        {
                          type: 'button',
                          className: 'tc_mode',
                          'aria-pressed': effectivePeak,
                          onClick: () => setPeriodMode('peak'),
                          children: t('peak'),
                        },
                        'peak',
                      ),
                      jsx(
                        'button',
                        {
                          type: 'button',
                          className: 'tc_mode',
                          'aria-pressed': !effectivePeak,
                          onClick: () => setPeriodMode('off-peak'),
                          children: t('offPeak'),
                        },
                        'offpeak',
                      ),
                    ],
                  })
                : null,
            ],
          })
        : null

      // The contribution renders a root of its own, exactly like the shipped
      // token pill does: the dock passes its own 16px through, so the 13px
      // status-bar size must be established here and inherited below.
      return jsx('div', {
        className: 'tc_root',
        children: jsxs('span', {
          ref: anchorRef,
          className: 'tc_anchor',
          children: [
            jsxs('button', {
              type: 'button',
              className: 'tc_pill',
              'aria-haspopup': 'dialog',
              'aria-expanded': open,
              'aria-label': t('pillTitle', { amount: unpriced ? label : amount }),
              title: t('pillTitle', { amount: unpriced ? label : amount }),
              onClick: () => setOpen(!open),
              children: [
                jsx('svg', {
                  viewBox: '0 0 16 16',
                  'aria-hidden': true,
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: 1.3,
                  strokeLinecap: 'round',
                  children: [
                    jsx('circle', { cx: 8, cy: 8, r: 6.4 }),
                    jsx('path', { d: 'M9.6 6.1c-.3-.5-.9-.8-1.6-.8-1 0-1.7.5-1.7 1.2 0 .8.8 1.1 1.7 1.3.9.2 1.7.5 1.7 1.3 0 .7-.7 1.2-1.7 1.2-.7 0-1.3-.3-1.6-.8' }),
                    jsx('path', { d: 'M8 4.1v7.8' }),
                  ],
                }),
                jsx('span', { className: 'tc_label', children: label }),
              ],
            }),
            panel,
          ],
        }),
      })
    }

    // ── plugin ──────────────────────────────────────────────────────────────
    /** Services this browser half needs: the slot registry and its dictionaries. */
    const inject = ['slots', 'locale']

    /**
     * Register the locale namespace and the composer-dock contribution.
     * @param ctx - client root context.
     */
    function apply(ctx) {
      ctx.effect(
        () =>
          ctx.locale.register('tokenCost', {
            zh: DICT.zh,
            en: DICT.en,
          }),
        'token-cost: dictionaries',
      )
      // The dock is declared by ui-chat; `inject` waits for that declaration, so
      // the contribution lands whenever Chat is present and never fails load.
      ctx.slots.inject('conversation.composer.dock', () =>
        ctx.slots.register(
          {
            name: 'conversation.composer.dock',
            id: 'token-cost',
            order: 10,
            locale: 'tokenCost',
          },
          CostPill,
        ),
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
