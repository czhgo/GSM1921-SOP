# D-873 复核：三处页签顶层块重测（2026-11-14 批次 550）

## 结论

`10 / 14 / 9` 是探针误报，**不改 `TAB_BLOCK_BASELINE`**；L-22 以「探针误报」关闭。

## 根因

`server/scripts/audit/dom-probe.mjs::collectDom` 的 `expandBlocks` 把「无子元素的行内节点」也 push 成顶层块：
`span` / `svg`（`line` / `rect` / `circle`）/ `p` 被逐个计成块。与探针自身声明口径
（「块 = 语义容器；纯 div 包装层递归透明化」）不符。

2026-11-10 审计证据里的块签名逐条对应：

| 页签 | 旧实测 | 构成 | 真实块 |
|---|---|---|---|
| `secretary.calendar` | 10 | 9 个图例行内 `span`（3 组 × 3）+ 1 张 `div.card` | 2（工具行 + 卡） |
| `secretary.report-up` | 14 | 3 张 `div.card` + 1 个 `.disclosure-host` + 10 个列表行内 `span`/`p` | 4 |
| `visitor.activities` | 9 | 8 个 SVG 节点（`line`/`rect`/`circle`）+ 1 张 `div.card` | 2（工具行 + 卡） |

## 修法

`expandBlocks` 改为：
① 子树里只要出现语义容器，就只认语义容器；② 一个语义容器都没有时，把该容器整体算 1 块。

## 重测（修后）

```text
secretary.calendar blocks=2
   - div flex flex-wrap items-center
   - div card rounded-xl p-5
secretary.report-up blocks=4
   - div card rounded-xl p-3
   - div card rounded-xl p-3
   - div card rounded-xl p-3
   - div rounded-lg border border-gray-200
visitor.activities blocks=2
   - div flex flex-wrap items-center
   - div card rounded-xl p-5
```

对照登记基线 3 / 4 / 3：差额 1 落在表头口径（`TAB_BLOCK_BASELINE` 历史口径含页头，探针排除页头），
且三处均 ≤ `TAB_BLOCK_LIMIT`（4），不构成密度风险。按 `D-838`「F1 以基线登记为准，DOM measured 只复核」保持基线不改。

## 复跑方式

需起服务（`DISABLE_PASSWORD_CHECK=1`）后，用修后的 `buildCollectDomProbe` 对
`secretary`（2300010001）/`visitor`（2400012347）登录后逐页量测；`audit-tabs.mjs` 的 F 维度复用同一探针。
