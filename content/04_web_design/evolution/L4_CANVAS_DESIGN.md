---
title: "L4 工作流块画布编辑器设计稿 v1（部署期可视化编排）"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-03"
status: draft-pending-confirm
related_files: [BLOCK_MANIFEST_CONTRACT.md, ARCHITECTURE_EVOLUTION.md, MODULARIZATION_ASSESSMENT.md, PARTY_COMMITTEE_DESIGN.md]
---

# L4 工作流块画布编辑器设计稿 v1

> **定位**：根 README 愿景 L1→L5 第 4 层的**编辑器形态设计稿**（不编码，先与书记对齐交互与视觉）。把「把工作流块排成本支部的流程组合」从"代码级能力勾选"升级为"画布可视化编排"，产物仍是既有 `config.blocks.workflowBlocks`（拖拽 = 排序/启停的编辑器，不是新执行通道）。
> **受众**：[工程师]+[AI]（党委台支部配置面的维护者）+ 书记（视觉与交互裁决人）
> **关联**：[BLOCK_MANIFEST_CONTRACT.md](BLOCK_MANIFEST_CONTRACT.md)（L3 块 manifest 与 config 数据）、[ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md) §8（愿景）、[PARTY_COMMITTEE_DESIGN.md](PARTY_COMMITTEE_DESIGN.md)（两级治理）。

---

## 一、先直面两次教训（本设计稿的边界前提）

1. **工作台配置 v2 回炉（2026-09-03 书记裁定）**：原书记台「工作台配置」含双画布拖拽被否——UI 过重 + 定位错误（配置属党委/部署期职责）。→ **L4 画布只出现在党委台「支部配置」内（部署工具语义），绝不出现在书记/支委日常工作台**；且**开关 chips 保持默认呈现**（最快路径），画布是"整体编排"的补充形态而非替代。
2. **表单/交互美学纪律**：书记反感 壳大字小、粘稠感动画、环形箭头、竖向条纹、嵌套边线。→ 画布视觉 = 极简白卡 + 轻量动效（位移≤150ms 缓动），不引第三方拖拽库，不用装饰性连线。

**一句话定位**：`支部配置` 页里，把「工作流块」区从一行 chips 扩展为**可展开的编排画布**——默认收起（保持 v2 简洁），需要排顺序时展开；拖拽只做排序，点卡做启停，恢复默认一键回注册顺序。

---

## 二、交互规格（v1 最小闭环）

### 2.1 入口与状态
- 位置：党委台「支部配置 · 选中支部」卡内，「工作流块」区右上角一枚文字按钮 **「编排」**（开关 chips 保持为默认主形态，画布为扩展视图）。
- 展开后：原 chips 区切换为画布区（可再点「收起」返回 chips，状态不丢失——编辑集合并行保留）。

### 2.2 画布布局（两泳道，横向为主）

```
┌─ 本支部运行流程（按序）───────────────────────────────┐
│  [主题党日组织块]    [专班运行块]          [+ 添加块 ▾]  │
│   通用制度 · 3 字段    自创制度 · 4 字段                │
└────────────────────────────────────────────────────┘
┌─ 已停用（拖回即恢复）─────────────────────────────────┐
│  （空态提示：拖右侧停用块回上区，或点卡停用）              │
└────────────────────────────────────────────────────┘
```

- **主泳道**：按当前配置顺序排列的块卡（manifest 名称 + 制度来源小标 + 字段数）。
- **停用区**：被 hidden 的块（缺省为空，提示文案引导）。
- 块卡支持 HTML5 拖拽（原生 DnD，无第三方库）：拖到主泳道 = 启用；拖入停用区 = 停用；主泳道内拖动 = 排序。
- 卡片右下角小按钮「停用」= 同效动作（键盘/触屏可达，不依赖拖拽）。

### 2.3 数据写回（与 L3 config 完全同构，零新概念）
- 画布排序 → `config.blocks.workflowBlocks.blockOrder`（**L4 新增字段**，与 outputBlocks.blockOrder 同构；缺省=注册顺序）。
- 停用/启用 → `config.blocks.workflowBlocks.hiddenBlockIds`（L3 已有）。
- 保存仍走 `PATCH /branches/:id/config`（party-staff/书记），权限不变；「恢复默认」= blocks.workflowBlocks 置 null（全开 + 注册序）。
- 编辑器不产生任何新数据通道——产物与 chips 保存完全一致（双向同步：展开画布即读当前 config 呈现，保存后 chips 态随之更新）。

### 2.4 动效与无障碍
- 拖拽中卡片半透明 + 浅金描边（支部党建金，非红色——区分"正在编排"与"党建主操作"）。
- 落位位移动画 ≤150ms ease-out（克制，无粘稠）。
- 全部动作（拖/按钮）等价可达；`aria-label`：块卡="块名，可拖动排序"；停用按钮="停用 块名"。

---

## 三、视觉规格（对齐既有美学体系）

| 元素 | 规格 |
|---|---|
| 卡片 | 白底圆角（--radius-sm 体系）、灰描边；主泳道卡与停用区卡同尺寸 |
| 制度来源 | 小圆点 + 文字：通用制度=党建红、支部自创=金（与 chips 区一致，不引入新色） |
| 字体 | 块名 text-sm font-medium；元数据 text-[11px] text-gray-400；按钮 text-xs（无 text-xs+py-2 壳大字小） |
| 背景 | 白卡内浅灰 50 槽（仅画布容器），无嵌套边线、无条纹 |
| 空态/提示 | 停用区空态与「未启用任何块」提示均为一句话灰字，无插画 |

---

## 四、数据模型小扩（唯一的新增）

```js
// config.blocks.workflowBlocks —— v1 无 order → v1.1 增加 blockOrder（可选）
{
  workflowBlocks: {
    hiddenBlockIds: ['theme-party-day'],   // L3 已有
    blockOrder: ['taskforce-run', 'theme-party-day'], // L4 新增；缺省=注册顺序
  }
}
```

- branch.js `getWorkflowBlockPolicy/applyWorkflowBlockPolicy` 扩 order 解析（与 outputBlocks 同款纯逻辑）；`_sanitizeBlocks` 双字段净化。
- server config 校验对应放行 `workflowBlocks.blockOrder`（cleanStr ≤50）。
- 消费侧（calendar-tab 入口守卫只查 hidden，不受 order 影响）；`workflowBlocks` 排序主要用于"画布预览与未来整链展示"。

---

## 五、范围边界（YAGNI 明确不做）

- ❌ 块间条件连线/分支（图形化流程引擎）——架构锚点：画布是编辑器不是执行器。
- ❌ 块导出/块市场（L5）。
- ❌ 字段级收拢的画布化（字段仍走 chips，不进画布）。
- ❌ 多支部同屏编辑、画布多版本回滚。
- ❌ 任何新的执行/持久化通道（保存 = 既有 config PATCH）。

**验收闭环（编码后）**：支部配置 →「编排」→ 拖专班到首位/停用主题党日 → 保存 → 重进画布保持 → 收起 chips 态同步 → 「恢复默认」回注册序全开；书记工作台主题党日入口守卫随停用即时生效（复用 S4 E2E 语义）。

---

## 六、待书记裁决

1. 「编排」按钮入口 + 默认收起（chips 为主）——是否认同（避免重蹈 v0"配置页过重"覆辙）？
2. 拖拽交互用**原生 HTML5 DnD**（轻、无依赖）还是**仅排序箭头 + 停用按钮**（无拖拽、最克制）？
3. 停用区泳道 vs 仅主泳道 + 卡上停用态（简化为一泳道）？

> 设计稿 v1 经书记确认后，编码将按「branch/server 数据扩展 → party-config 画布区 → E2E 闭环」拆分推进。
