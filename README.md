# dsh-plugin-token-cost

English | [中文](#中文)

Live token spend for the current DSH session, shown beside the composer.

- **Token counts are exact** — the four buckets the server reports (`tokenUsage`: cache-hit input, cache-miss input, cache write, output), not a local character estimate.
- **Money is computed** — buckets × your profile's price table. Click the pill to expand: per-bucket tokens, unit price, charge, and **both the peak and off-peak rate** (the one in force is marked), so you can check it against a bill.
- Sits next to the built-in `38.4M tok · 缓存命中 99.6%` stats line, same size and height.
<img width="1882" height="224" alt="image" src="https://github.com/user-attachments/assets/51335545-fa37-4794-965a-1676a5ce3305" />

- Peak/off-peak can be pinned; by default it follows UTC time (Mon–Fri 01:00–04:00 and 06:00–10:00 are peak).
<img width="1830" height="480" alt="image" src="https://github.com/user-attachments/assets/cb640ec6-1579-4d6a-aac1-583bb07b4957" />



## Install

```sh
# from GitHub
dsh plugin --profile web add github:jessicacui99/dsh-plugin-token-cost

# or from a checkout you already have
dsh plugin --profile web add /absolute/path/to/dsh-plugin-token-cost
```

The host half mounts under `patchReload: live`; the browser half needs **one page refresh**.
There is no build step — `lib/client.js` is a hand-written bundle depending only on React and
`react/jsx-runtime`, and the host half imports nothing.

## Prices

The bundled table is in **yuan per 1,000,000 tokens**, at the provider's **peak** rate.
Defaults: `deepseek-flash` ¥0.04 hit / ¥2 miss / ¥8 output; `deepseek-v4-pro` ¥0.30 / ¥9 / ¥27.
Off-peak is half of peak on every row. Models with no price show a hint instead of an amount —
never a silent ¥0.

Check the numbers against your own bill and, if they differ, override the row in your profile's
`cordis.patch.yml`. **A patch replaces the whole `config`, so restate every field you keep:**

```yaml
- id: token-cost
  config:
    currency: CNY          # display symbol only (¥ / $ / €)
    period: auto           # peak | off-peak | auto
    models:
      - model: deepseek-flash
        provider: deepseek-official
        inputCacheHit: 0.04     # yuan / 1M tokens, PEAK rate
        inputCacheMiss: 2
        output: 8
      - model: deepseek-v4-pro
        provider: deepseek-official
        inputCacheHit: 0.3
        inputCacheMiss: 9
        output: 27
```

Bad config (negative numbers, a missing `model`, a misspelled `period`) fails at load rather than
running with wrong prices.

## Limits

- The amount is a **reference, not a bill**: cache writes are charged at the miss rate, peak/off-peak
  follows the UTC rule, and an official price change or rule change means updating the table.
- Every request resends the whole context, so prompt tokens grow with turn count on a long session
  (cache hits are the bulk of it). That is the billing model, not double counting — duplicate records
  for the same turn/step are replaced, not added.
- Subagent spend is **not** in the parent's number; each is its own session.
- After switching models mid-session, the accumulated tokens are all priced at
  `modelSelection.lastUsed` — `tokenUsage` is a whole-log total and does not split by model.
- Current session only: switching sessions resets the number.

## License

MIT

---

## 中文

在 DSH Web 界面的输入框旁边实时显示**当前会话已经花了多少钱**（默认人民币）。

- **token 数是精确的**：来自服务端上报的 `tokenUsage` 投影（未命中缓存的输入 / 命中缓存的输入 / 缓存写入 / 输出四个分桶），不是本地按字符估算。
- **金额是算出来的**：分桶 token 数 × 本 profile 的价格表。点一下价格胶囊展开明细：每一档的 token 数、单价与金额，并**同时列出高峰与空闲两个价格**（当前按哪个计价会标出来），方便和账单核对。
- 位置就在内置的 `38.4M tok · 缓存命中 99.6%` 统计条旁边，同字号同高。
<img width="1882" height="224" alt="image" src="https://github.com/user-attachments/assets/0493fae6-f61c-4a92-8fbf-35844dc3d8fb" />
- 高峰 / 低谷可以手动切换，默认按当前 UTC 时间自动判断（周一至周五 01:00–04:00、06:00–10:00 为高峰）。
<img width="1830" height="480" alt="image" src="https://github.com/user-attachments/assets/cb640ec6-1579-4d6a-aac1-583bb07b4957" />



### 安装

```sh
dsh plugin --profile web add github:jessicacui99/dsh-plugin-token-cost
```

profile 开启 `patchReload: live` 时宿主半边会自动挂载；浏览器半边需要**刷新一次页面**。
没有构建步骤：`lib/client.js` 是手写 bundle，只依赖 React 与 `react/jsx-runtime`；宿主半边不 import 任何第三方包。

### 价格

内置表单位为**元 / 百万 token**，写的是**高峰价**，空闲价按官方规则（空闲 = 高峰的一半）在显示时折算。
默认值：`deepseek-flash` ¥0.04 / ¥2 / ¥8，`deepseek-v4-pro` ¥0.30 / ¥9 / ¥27（命中 / 未命中 / 输出）。
未配置价格的模型会显示提示而不是金额，不会静默算成 0。

和账单对不上时，在 `~/.dsh/profiles/<profile>/cordis.patch.yml` 里覆盖 `token-cost` 这一行。
一个 patch 会替换整行的 `config`，所以要把想保留的字段全部写出来——完整示例见上方英文小节。

### 已知边界

- 金额是**参考值**，不是账单：缓存写入按「未命中」价计，高峰/空闲按 UTC 规则判断，官方调价或改规则时需要更新价格表。
- 每个请求都会把整段上下文重新发一遍，所以长会话的 prompt token 会随轮次快速膨胀（缓存命中占绝大多数）；这是计费口径，不是插件重复计数——同 turn/step 的重复记录会被替换而不是累加。
- 子会话（subagent）的花费不在父会话的数字里，它属于各自独立的会话。
- 中途换过模型时，累计 token 会整体按 `modelSelection.lastUsed`（当前模型）计价。
- 只显示当前会话：换会话后数字归零重算。
