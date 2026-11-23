---
title: "页签审计 D/C 维度复跑读数（批次 606）"
type: evidence
role: "[工程师]+[AI]"
last_updated: 2026-11-23
status: active
---

# 页签审计 D/C 维度复跑（批次 606）

- 命令：`cd server; node scripts/audit-tabs.mjs --all --only D,C`
- 读数：**P0 0 / P1 0 / P2 0** · exception 12（46 页签；D2 5 pass / C2 37 pass 未变）
- 边界：截图与 `findings.json` 当场删除（`D-905` / `H26.3a`）；本文件只留可复核的读数行。

用途：`B-605-2` 收口批的复跑读数（与批次 605 同值，用于确认本次改动未触达审计面）。
