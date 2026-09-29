// role: [工程师]+[AI]
// 能力声明：专班运行（支部自创制度源）
// 自注册模式：import 本模块即触发注册（副作用导入），消费点经注册表 getCapabilities({scope:'block'}) 发现。
//
// 由来（`.ctx/REVIEW_QUEUE.md` H-10，2026-09-29 批次 268 按推荐档 ① 落）：
//   契约 `content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md §二` 要求
//   「blockId 与 capability / scenario id 一一对应，注册表缺失即契约失效」；而 S1 试点块
//   （`workflow/blocks/manifests.js::TASKFORCE_RUN_MANIFEST`）的 `capabilityId: 'taskforce'`
//   当时**不在能力注册表**里 ⇒ 只能挂在 `server/test/block-manifest.test.mjs::S5` 的
//   **显式例外台账** `REGISTRY_EXCEPTIONS` 上。本件把 `taskforce` 落成**真能力**，
//   同批把该块的 `blockId` 由 `taskforce-run` 改准为 `taskforce`（与 capabilityId 同名）
//   ⇒ 两条例外**同时可撤**，契约 §二 恢复「唯一口径」。
//
// 注意：专班是**支部自创制度尝试**（`provenance: 'branch-custom'`），
// 其制度来源与通用/自创的对照另由 `manifests.js::CAPABILITY_PROVENANCE` 登记（两处不可谎报）。
import { registerCapability } from '../core/boot/registry.js?v=20260929w';

registerCapability({
  id: 'taskforce',
  name: '专班运行',
  version: '20260929a',
  scope: ['block'],
  requiredRoles: null,
  env: null,
  deps: [],
});
