export const ACTIVITIES = [
  // ════════════════════════════════════════════════════════════════════
  //  2026-09-06 演示数据基线刷新（支书口径）：
  //  原 3–6 月旧批 20 场（act-1~act-20，含 act-20/act-18 等散序编号）按原日期升序
  //  k=0..19 整体重排至 2026-07-01 ~ 2026-07-24（新日期 = 07-01 + floor(k×1.25) 天，
  //  保留相对顺序、间隔等比压缩），id 全部不变；标题月份词随窗口改「7月」。
  //  基线「今天」= 2026-09-05：≤09-05 已发生、≥09-06 为草稿/计划（见 act-31）。
  //  7 月既有（act-21~25）、8 月（act-26~30）、9 月（act-31）数据保留不删。
  // ════════════════════════════════════════════════════════════════════

  // ── 原 3 月批次（重排 → 7/1~7/4）──────────────────────────────
  { id: 'act-1', title: '7月党小组会', date: '2026-07-01', type: '党小组会', organizer: 'p3', direction: 'bottom-up', location: '光华1号楼203会议室', status: 'completed', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: 'p3', role: 'organizer' }] },
  { id: 'act-2', title: '7月支委会', date: '2026-07-02', type: '支委会', organizer: 'p11', direction: 'top-down', location: '光华1号楼305会议室', status: 'completed', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: 'p11', role: 'organizer' }] },
  { id: 'act-3', title: '7月主题党日：学习两会精神', date: '2026-07-03', type: '主题党日', organizer: 'p3', direction: 'bottom-up', location: '光华1号楼101报告厅', status: 'completed', isBrand: true, brandName: '学习两会精神', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: 'p3', role: 'organizer' }, { personId: 'p8', role: 'deep' }] },
  { id: 'act-20', title: '7月理论学习小组（已取消）', date: '2026-07-04', type: '党小组会', organizer: 'p2', direction: 'bottom-up', location: '光华1号楼203会议室', status: 'cancelled', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: 'p2', role: 'organizer' }] },

  // ── 原 4 月批次（重排 → 7/6~7/9）──────────────────────────────
  { id: 'act-4', title: '7月党小组会', date: '2026-07-06', type: '党小组会', organizer: 'p1', direction: 'bottom-up', location: '光华1号楼203会议室', status: 'completed', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: 'p1', role: 'organizer' }] },
  { id: 'act-5', title: '7月支委会', date: '2026-07-07', type: '支委会', organizer: 'p11', direction: 'top-down', location: '光华1号楼305会议室', status: 'completed', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: 'p11', role: 'organizer' }] },
  { id: 'act-7', title: '7月主题党日：红色基地参访', date: '2026-07-08', type: '主题党日', organizer: 'p3', direction: 'bottom-up', location: '北大校史馆', status: 'completed', scenarioId: 'theme-party', domain: 'party-building', carriers: ['实践参访'], isOutdoor: true, assignments: [{ personId: 'p3', role: 'organizer' }, { personId: 'p9', role: 'deep' }] },
  { id: 'act-6', title: '7月党课：新时代青年担当', date: '2026-07-09', type: '党课', organizer: 'p13', direction: 'top-down', location: '光华1号楼101报告厅', status: 'completed', scenarioId: 'party-lecture', domain: 'party-building', assignments: [{ personId: 'p13', role: 'organizer' }, { personId: 'p12', role: 'deep' }], agenda: [{ item: '主题讲授：新时代青年担当', host: '支书' }] },

  // ── 原 5 月批次（重排 → 7/11~7/19）────────────────────────────
  { id: 'act-8', title: '7月支部党员大会', date: '2026-07-11', type: '支部党员大会', organizer: 'p11', direction: 'top-down', location: '光华1号楼101报告厅', status: 'completed', scenarioId: 'branch-party-meeting', domain: 'party-building', assignments: [{ personId: 'p11', role: 'organizer' }], agenda: [{ item: '通报 6 月支部工作情况', host: '支书' }, { item: '审议 7 月发展对象名单', host: '组织委员' }, { item: '民主评议党员', host: '支书' }] },
  // 批次 47-R（2026-09-16，支书裁定「过渡态种子都补」）：act-9 增补 p5（普通成员 宋佳宁，演示账号 2400012349）
  //   为 `deep`。**为什么必须补**：成员台「我的复盘」按定义只在「**本人在某活动中挂了复盘责任**」时出行卡
  //   （`visitor/review-tab.js:42` 的 `['organizer','deep'].includes(role)`），而原种子中 p5 未挂在任何活动上
  //   ⇒ 该 tab 恒为两空列，「请填写复盘总结」这处校验点在真机上**永远够不到**（批 47-M 实测 `.visitor-review-item` 计数 0）。
  //   ⚠ **选 act-9 而非随手挑一个**：行卡归「待复盘」还是「已复盘」取决于**该活动有没有复盘记录**
  //     （`review-tab.js:64` 的分桶）——**必须挑一个 `mock/review.js` 里没有复盘记录的活动**，
  //     否则行卡落进「已复盘」列、渲染的是只读详情，**没有复盘表单**（本批首跑就踩了这个坑：
  //     原选 act-3，而 act-3 在 `mock/review.js:47` 已有 rev3）。**「有归属」还不够，状态分支也要落在要测的那一支。**
  //   ⚠ 只加在本文件（活动的内容单一源）即可覆盖两形态：mock 直读本模块、api 由 `server/seed.js` 读同一份落库。
  { id: 'act-9', title: '7月党小组会', date: '2026-07-12', type: '党小组会', organizer: 'p1', direction: 'bottom-up', location: '光华1号楼203会议室', status: 'completed', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: 'p1', role: 'organizer' }, { personId: 'p5', role: 'deep' }] },
  // act-10 状态为 ongoing（2026-08-27 T-283 生命周期审计修正：原为 completed 字面值，
  // 但关联任务 tsk-007/tsk-008 未完成，执行态派生为 ongoing——存储字面值须与派生态自洽，
  // 且 DATA_MODEL §2.1 决策「已完成」不再作为活动状态字面值出现）
  { id: 'act-10', title: '7月主题党日：五四精神传承', date: '2026-07-13', type: '主题党日', organizer: 'p3', direction: 'bottom-up', location: '光华1号楼101报告厅', status: 'ongoing', isBrand: true, brandName: '五四精神传承', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: 'p3', role: 'organizer' }, { personId: 'p8', role: 'deep' }, { personId: 'p9', role: 'deep' }] },
  { id: 'act-11', title: '7月支委会', date: '2026-07-14', type: '支委会', organizer: 'p11', direction: 'top-down', location: '光华1号楼305会议室', status: 'completed', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: 'p11', role: 'organizer' }] },
  { id: 'act-12', title: '校企共建座谈：光华 x 中信证券', date: '2026-07-16', type: '主题党日', organizer: 'p11', direction: 'top-down', location: '光华1号楼401会议室', status: 'completed', isBrand: true, brandName: '校企共建', scenarioId: 'theme-party', domain: 'party-building', carriers: ['交流座谈'], isJoint: true, assignments: [{ personId: 'p11', role: 'organizer' }, { personId: 'p10', role: 'deep' }] },
  { id: 'act-18', title: '积极分子座谈会', date: '2026-07-17', type: '主题党日', organizer: 'p11', direction: 'top-down', location: '光华1号楼305会议室', status: 'completed', scenarioId: 'theme-party', domain: 'party-building', carriers: ['交流座谈'], assignments: [{ personId: 'p11', role: 'organizer' }] },
  { id: 'act-13', title: '7月党课：宏观经济形势分析', date: '2026-07-18', type: '党课', organizer: 'p13', direction: 'top-down', location: '光华1号楼101报告厅', status: 'completed', scenarioId: 'party-lecture', domain: 'party-building', assignments: [{ personId: 'p13', role: 'organizer' }] },
  { id: 'act-19', title: '7月组织生活会', date: '2026-07-19', type: '党小组会', organizer: 'p4', direction: 'top-down', location: '光华1号楼203会议室', status: 'completed', scenarioId: 'org-life', domain: 'party-building', assignments: [{ personId: 'p4', role: 'organizer' }, { personId: 'p1', role: 'deep' }, { personId: 'p2', role: 'deep' }, { personId: 'p3', role: 'deep' }] },

  // ── 原 6 月批次（重排 → 7/21~7/24）────────────────────────────
  { id: 'act-14', title: '7月参访：中关村科技企业', date: '2026-07-21', type: '主题党日', organizer: 'p3', direction: 'bottom-up', location: '中关村软件园', status: 'completed', scenarioId: 'theme-party', domain: 'party-building', carriers: ['实践参访'], isOutdoor: true, assignments: [{ personId: 'p3', role: 'organizer' }] },
  { id: 'act-15', title: '7月共建：光华 x 人大商学院', date: '2026-07-22', type: '主题党日', organizer: 'p11', direction: 'top-down', location: '中国人民大学商学院', status: 'published', scenarioId: 'theme-party', domain: 'party-building', isJoint: true, assignments: [{ personId: 'p11', role: 'organizer' }] },
  { id: 'act-16', title: '7月主题党日：建党105周年', date: '2026-07-23', type: '主题党日', organizer: 'p1', direction: 'bottom-up', location: '光华1号楼101报告厅', status: 'ongoing', isBrand: true, brandName: '建党105周年', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: 'p1', role: 'organizer' }, { personId: 'p3', role: 'deep' }] },
  { id: 'act-17', title: '7月党小组会', date: '2026-07-24', type: '党小组会', organizer: 'p1', direction: 'bottom-up', location: '光华1号楼203会议室', status: 'completed', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: 'p1', role: 'organizer' }] },

  // ── 7 月活动（与 notices.js 保持数据协调）──────────────────────
  { id: 'act-25', title: '七一建党105周年活动', date: '2026-07-01', type: '主题党日', organizer: 'p11', direction: 'top-down', location: '光华1号楼101报告厅', status: 'completed', isBrand: true, brandName: '建党105周年', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: 'p11', role: 'organizer' }, { personId: 'p1', role: 'deep' }, { personId: 'p3', role: 'deep' }] },
  { id: 'act-24', title: '7月支委会', date: '2026-07-08', type: '支委会', organizer: 'p11', direction: 'top-down', location: '光华1号楼305会议室', status: 'completed', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: 'p11', role: 'organizer' }] },
  { id: 'act-23', title: '7月党小组会', date: '2026-07-10', type: '党小组会', organizer: 'p1', direction: 'bottom-up', location: '光华1号楼203会议室', status: 'completed', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: 'p1', role: 'organizer' }] },
  { id: 'act-21', title: '7月主题党日：深化改革', date: '2026-07-25', type: '主题党日', organizer: 'p1', direction: 'bottom-up', location: '光华1号楼101报告厅', status: 'published', isBrand: true, brandName: '深化改革', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: 'p1', role: 'organizer' }, { personId: 'p3', role: 'deep' }] },
  { id: 'act-22', title: '7月积极分子座谈会', date: '2026-07-28', type: '主题党日', organizer: 'p11', direction: 'top-down', location: '光华1号楼305会议室', status: 'published', scenarioId: 'theme-party', domain: 'party-building', carriers: ['交流座谈'], assignments: [{ personId: 'p11', role: 'organizer' }] },

  // ── 8 月活动（暑期特色，与 notices.js 保持数据协调）────────────
  // 2026-08-05 支书裁决：已生成考勤的活动日期须已发生（≤ 8/5），
  // act-28「谈话考察」违背「删除考察活动类型」（5b2e4ea）已彻底删除。
  { id: 'act-26', title: '8月党小组会（暑期线上）', date: '2026-08-01', type: '党小组会', organizer: 'p1', direction: 'bottom-up', hostGroup: '第一党小组', location: '线上·腾讯会议', status: 'completed', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: 'p1', role: 'organizer' }] },
  // R-21（2026-09-13）：补第二/第三党小组小组会——此前小组会种子只覆盖第一党小组，
  // 「组长上传位＝本组」收紧后 p2/p4 的考勤/考察上传下拉为空（演示不完整）。
  // hostGroup 显式固化 = 组长写入同一语义，服务层 _activityPartyGroup 直接取用。
  { id: 'act-32', title: '8月党小组会：第二党小组理论学习', date: '2026-08-04', type: '党小组会', organizer: 'p2', direction: 'bottom-up', hostGroup: '第二党小组', location: '光华1号楼205会议室', status: 'completed', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: 'p2', role: 'organizer' }] },
  { id: 'act-33', title: '8月党小组会：第三党小组理论学习', date: '2026-08-05', type: '党小组会', organizer: 'p4', direction: 'bottom-up', hostGroup: '第三党小组', location: '光华1号楼207会议室', status: 'completed', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: 'p4', role: 'organizer' }] },
  { id: 'act-27', title: '8月支委会：新学期筹备', date: '2026-08-03', type: '支委会', organizer: 'p11', direction: 'top-down', location: '光华1号楼305会议室', status: 'published', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: 'p11', role: 'organizer' }], agenda: [{ item: '新学期支部工作计划', host: '支书' }, { item: '迎新工作分工', host: '组织委员' }, { item: '九月主题党日策划', host: '宣传委员' }] },
  { id: 'act-29', title: '暑期实践总结分享', date: '2026-08-04', type: '主题党日', organizer: 'p1', direction: 'bottom-up', location: '光华1号楼101报告厅', status: 'published', isBrand: true, brandName: '暑期实践', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: 'p1', role: 'organizer' }, { personId: 'p8', role: 'deep' }, { personId: 'p5', role: 'participant' }] },
  // act-30 秋季学期工作部署会（published、无考勤，日期 8/28 保留——演示「已发布未生成考勤」路径）
  // 存量决策活动 voteConfig 迁移结论（2026-09-02，T-2026-09-006）：act-30 为普通工作部署会、无表决语义，
  //   不加 voteConfig（服务端无 voteConfig 回退 deliberative+支委白名单仅在其议程触发表决时生效，
  //   部署会无此场景）；线上表决演示由 act-31 承担，无 voteConfig 回退路径已有服务端测试覆盖。
  { id: 'act-30', title: '秋季学期工作部署会', date: '2026-08-28', type: '支部党员大会', organizer: 'p11', direction: 'top-down', location: '光华1号楼101报告厅', status: 'published', scenarioId: 'branch-party-meeting', domain: 'party-building', assignments: [{ personId: 'p11', role: 'organizer' }, { personId: 'p8', role: 'participant' }, { personId: 'p15', role: 'participant' }] },
  // act-31 线上异步表决样例（AV4.5 演示）：支部党员大会 voteConfig formal-only 固化应到名单，
  // voterIds = 正式党员（p1-p5、p8-p14，均非 u_*），
  // 预备党员/积极分子不在名单 → activity.html 只读提示「仅应到表决人可表态」
  // ── 历史快照语义（支书 2026-09-06 ②批 voterIds 与 roster 联动）──
  //   voteConfig.voterIds = 活动创建时固化的名单快照，此后成员「在校/滞留」状态变更
  //   不回改历史活动（本快照固化于滞留剔除口径落地前，故仍含 p5/p9）；
  //   新创建活动的默认 voterIds 由 services/vote-config.js resolveVoterIds 现时生成
  //   （范围 + 剔除滞留，roster 口径单一源 = policy-defaults attendance.roster），本数据保持原值。
  { id: 'act-31', title: '9月支部党员大会（线上异步表决）', date: '2026-09-10', type: '支部党员大会', organizer: 'p11', direction: 'top-down', location: '线上（异步表决）', status: 'published', scenarioId: 'branch-party-meeting', domain: 'party-building', voteConfig: { mode: 'async', optionSet: 'formal', voterScope: 'formal-only', voterIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14'], quorumCheck: true }, assignments: [{ personId: 'p11', role: 'organizer' }, { personId: 'p5', role: 'participant' }, { personId: 'p8', role: 'participant' }], agenda: [{ id: 'ag-mtg-1', item: '审议 2026 年秋季学期支部工作计划', host: '支书' }, { id: 'ag-mtg-2', item: '审议发展对象接收为预备党员的决议', host: '组织委员' }] },

  // 批次 47-W（2026-09-16，支书裁定「过渡态种子都补」同口径）：为「决议落实」
  //   （`resolution-followup-manager.js` 三处必填：待落实事项 / 责任人 / 落实时限）造一条**可达且自洽**的种子。
  // **为什么必须新造、而不是给既有活动挂 `result`**：
  //   ① 「决议落实」区**只在存在 `result:'passed'` 的议程项时挂载**，而原种子**没有任何活动带 `result`**
  //      ⇒ 该区在真机上**恒不渲染**，三处校验点结构性不可达（批 47-M 真机实测 `.fu-add` 计数 0，已如实登记）；
  //   ② 最省事的做法是给 act-31 的议程项直接写 `result:'passed'`——**但那是假种子**：act-31 是**线上异步表决**
  //      样例（`voteConfig.quorumCheck: true`），其 `result` 由「记录会议结果」写入且**必经硬校验**
  //      （出席 ≥ ceil(应到/2)=6 且赞成 > 应到/2=6，见 `agenda-follow-up.js::quorumBlockMessage`），
  //      而它的真机现状是「已表态 0/12」⇒ 「0 票却已通过」**在真机上永远不可能出现**。
  //   **本例为何自洽**：支委会（**无 `voteConfig`**）走**线下议事**——主持人记录决议不经表决硬校验
  //      （硬校验只约束正式表决），故「线下支委会的议程项已通过」是**真机可达成**的状态，
  //      并带上 `recordedBy/recordedAt`（与 `recordAgendaResult` 的落库形状一致）。
  //   **日期为何定在 8 月（不进 9 月日历）**：支书台「活动管理」默认展示当月，9 月当前只有 act-31 一条，
  //      而 `secretary-inspector-vote` / `secretary-inspector-activity-edit` 两条既有流程都点「日历第一条」
  //      ⇒ 放进 8 月可**完全不扰动既有流程**（本批另把这两条流程的入口**显式改成 `[data-act-id]`**，
  //      使其不再依赖「当月恰好只有一条」这个偶然事实）。
  { id: 'act-35', title: '8月支委会：发展党员工作阶段审议', date: '2026-08-12', type: '支委会', organizer: 'p11', direction: 'top-down', location: '光华1号楼305会议室', status: 'completed', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: 'p11', role: 'organizer' }], agenda: [{ id: 'ag-35-1', item: '审议 2026 年秋季学期发展党员阶段名单', host: '组织委员', result: 'passed', recordedBy: 'p1', recordedAt: '2026-08-12T15:30:00+08:00' }] },
];
