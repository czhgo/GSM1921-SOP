export const ACTIVITIES = [
  // ════════════════════════════════════════════════════════════════════
  //  Task 5（2026-10-26，spec restore-capsule-and-harden-data-truth）：
  //  **演示窗口统一为 2026-08-01 ~ 2026-11-30**（单一源 `data/mock/demo-window.js`）。
  //  原 7 月 25 场按原日期升序整体重排到 8/9/10 月（保留 id 与相对先后、状态语义不变）：
  //    · 07-01~07-10 → 08-06~08-17（跳过 08-12，避开既有 act-35）
  //    · 07-11~07-20 → 09-01~09-09（既有 act-31 09-10 保持在其后）
  //    · 07-21~07-31 → 10-01~10-07（既有 act-36 10-15 / act-37 10-22 保持在其后）
  //  8 月既有（act-26/27/29/32/33/35/30）、9 月（act-31）、10 月（act-36/37）日期不变；
  //  11 月新增 act-38/39/40 三场**计划态**活动（2 published + 1 draft，不生成考勤/复盘）。
  //  「今天」锚点仍是 2026-10-26：≤10-26 的活动由派生器落 completed，11 月保持 published/draft。
  // ════════════════════════════════════════════════════════════════════

  // ── 原 3 月批次（重排 → 8/06~8/10）──────────────────────────────
  { id: 'act-1', title: '8月党小组会', date: '2026-08-07', type: '党小组会', organizer: '2400012347', direction: 'bottom-up', location: '光华1号楼203会议室', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012347', role: 'organizer' }] },
  { id: 'act-2', title: '8月支委会', date: '2026-08-08', type: '支委会', organizer: '2400012355', direction: 'top-down', location: '光华1号楼305会议室', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: '2400012355', role: 'organizer' }] },
  { id: 'act-3', title: '8月主题党日：学习两会精神', date: '2026-08-09', type: '主题党日', organizer: '2400012347', direction: 'bottom-up', location: '光华1号楼101报告厅', isBrand: true, brandName: '学习两会精神', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: '2400012347', role: 'organizer' }, { personId: '2400012352', role: 'deep' }] },
  { id: 'act-20', title: '8月理论学习小组（已取消）', date: '2026-08-10', type: '党小组会', organizer: '2400012346', direction: 'bottom-up', location: '光华1号楼203会议室', cancelled: true, scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012346', role: 'organizer' }] },

  // ── 原 4 月批次（重排 → 8/11~8/16）──────────────────────────────
  { id: 'act-4', title: '8月党小组会', date: '2026-08-11', type: '党小组会', organizer: '2400012345', direction: 'bottom-up', location: '光华1号楼203会议室', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012345', role: 'organizer' }] },
  { id: 'act-5', title: '8月支委会', date: '2026-08-13', type: '支委会', organizer: '2400012355', direction: 'top-down', location: '光华1号楼305会议室', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: '2400012355', role: 'organizer' }] },
  { id: 'act-7', title: '8月主题党日：红色基地参访', date: '2026-08-14', type: '主题党日', organizer: '2400012347', direction: 'bottom-up', location: '北大校史馆', scenarioId: 'theme-party', domain: 'party-building', carriers: ['实践参访'], isOutdoor: true, assignments: [{ personId: '2400012347', role: 'organizer' }, { personId: '2400012353', role: 'deep' }] },
  { id: 'act-6', title: '8月党课：新时代青年担当', date: '2026-08-16', type: '党课', organizer: '2300010001', direction: 'top-down', location: '光华1号楼101报告厅', scenarioId: 'party-lecture', domain: 'party-building', assignments: [{ personId: '2300010001', role: 'organizer' }, { personId: '2400012356', role: 'deep' }], agenda: [{ item: '主题讲授：新时代青年担当', host: '支书' }] },

  // ── 原 5 月批次（重排 → 9/01~9/09）─────────────────────────────
  { id: 'act-8', title: '9月支部党员大会', date: '2026-09-01', type: '支部党员大会', organizer: '2400012355', direction: 'top-down', location: '光华1号楼101报告厅', scenarioId: 'branch-party-meeting', domain: 'party-building', assignments: [{ personId: '2400012355', role: 'organizer' }], agenda: [{ item: '通报 6 月支部工作情况', host: '支书' }, { item: '审议 7 月发展对象名单', host: '组织委员' }, { item: '民主评议党员', host: '支书' }] },
  // 批次 47-R（2026-09-16，支书裁定「过渡态种子都补」）：act-9 增补 2400012349（普通成员 宋佳宁，演示账号 2400012349）
  //   为 `deep`。**为什么必须补**：成员台「我的复盘」按定义只在「**本人在某活动中挂了复盘责任**」时出行卡
  //   （`visitor/review-tab.js:42` 的 `['organizer','deep'].includes(role)`），而原种子中 2400012349 未挂在任何活动上
  //   ⇒ 该 tab 恒为两空列，「请填写复盘总结」这处校验点在真机上**永远够不到**（批 47-M 实测 `.visitor-review-item` 计数 0）。
  //   ⚠ **选 act-9 而非随手挑一个**：行卡归「待复盘」还是「已复盘」取决于**该活动有没有复盘记录**
  //     （`review-tab.js:64` 的分桶）——**必须挑一个 `data/mock/review.js` 里没有复盘记录的活动**，
  //     否则行卡落进「已复盘」列、渲染的是只读详情，**没有复盘表单**（本批首跑就踩了这个坑：
  //     原选 act-3，而 act-3 在 `data/mock/review.js:47` 已有 rev3）。**「有归属」还不够，状态分支也要落在要测的那一支。**
  //   ⚠ 只加在本文件（活动的内容单一源）即可覆盖两形态：mock 直读本模块、api 由 `server/seed.js` 读同一份落库。
  { id: 'act-9', title: '9月党小组会', date: '2026-09-02', type: '党小组会', organizer: '2400012345', direction: 'bottom-up', location: '光华1号楼203会议室', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012345', role: 'organizer' }, { personId: '2400012349', role: 'deep' }] },
  // act-10 状态由派生器按日期落 completed；挂在其上的任务/分工同为 completed
  // （mock-integrity M2 的生命周期判据：完成态活动不得挂未完成任务）。
  { id: 'act-10', galleryFeatured: true, title: '9月主题党日：五四精神传承', date: '2026-09-03', type: '主题党日', organizer: '2400012347', direction: 'bottom-up', location: '光华1号楼101报告厅', isBrand: true, brandName: '五四精神传承', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: '2400012347', role: 'organizer' }, { personId: '2400012352', role: 'deep' }, { personId: '2400012353', role: 'deep' }] },
  { id: 'act-11', title: '9月支委会', date: '2026-09-04', type: '支委会', organizer: '2400012355', direction: 'top-down', location: '光华1号楼305会议室', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: '2400012355', role: 'organizer' }] },
  { id: 'act-12', title: '校企共建座谈：光华 x 中信证券', date: '2026-09-05', type: '主题党日', organizer: '2400012355', direction: 'top-down', location: '光华1号楼401会议室', isBrand: true, brandName: '校企共建', scenarioId: 'theme-party', domain: 'party-building', carriers: ['交流座谈'], isJoint: true, assignments: [{ personId: '2400012355', role: 'organizer' }, { personId: '2400012354', role: 'deep' }] },
  { id: 'act-18', title: '积极分子座谈会', date: '2026-09-07', type: '主题党日', organizer: '2400012355', direction: 'top-down', location: '光华1号楼305会议室', scenarioId: 'theme-party', domain: 'party-building', carriers: ['交流座谈'], assignments: [{ personId: '2400012355', role: 'organizer' }] },
  { id: 'act-13', title: '9月党课：宏观经济形势分析', date: '2026-09-08', type: '党课', organizer: '2300010001', direction: 'top-down', location: '光华1号楼101报告厅', scenarioId: 'party-lecture', domain: 'party-building', assignments: [{ personId: '2300010001', role: 'organizer' }] },
  { id: 'act-19', title: '9月组织生活会', date: '2026-09-09', type: '党小组会', organizer: '2400012348', direction: 'top-down', location: '光华1号楼203会议室', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012348', role: 'organizer' }, { personId: '2400012345', role: 'deep' }, { personId: '2400012346', role: 'deep' }, { personId: '2400012347', role: 'deep' }] },

  // ── 原 6 月批次（重排 → 10/01~10/07）───────────────────────────
  { id: 'act-14', title: '10月参访：中关村科技企业', date: '2026-10-01', type: '主题党日', organizer: '2400012347', direction: 'bottom-up', location: '中关村软件园', scenarioId: 'theme-party', domain: 'party-building', carriers: ['实践参访'], isOutdoor: true, assignments: [{ personId: '2400012347', role: 'organizer' }] },
  { id: 'act-15', title: '10月共建：光华 x 人大商学院', date: '2026-10-02', type: '主题党日', organizer: '2400012355', direction: 'top-down', location: '中国人民大学商学院', scenarioId: 'theme-party', domain: 'party-building', isJoint: true, assignments: [{ personId: '2400012355', role: 'organizer' }] },
  { id: 'act-16', galleryFeatured: true, galleryPinned: true, title: '10月主题党日：建党105周年', date: '2026-10-03', type: '主题党日', organizer: '2400012345', direction: 'bottom-up', location: '光华1号楼101报告厅', isBrand: true, brandName: '建党105周年', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: '2400012345', role: 'organizer' }, { personId: '2400012347', role: 'deep' }] },
  { id: 'act-17', title: '10月党小组会', date: '2026-10-05', type: '党小组会', organizer: '2400012345', direction: 'bottom-up', location: '光华1号楼203会议室', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012345', role: 'organizer' }] },

  // ── 原 7 月既有批次（重排 → 8/06~10/07，与 notices.js 保持数据协调）──
  { id: 'act-25', title: '暑期主题党日：纪念建党105周年', date: '2026-08-06', type: '主题党日', organizer: '2400012355', direction: 'top-down', location: '光华1号楼101报告厅', isBrand: true, brandName: '建党105周年', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: '2400012355', role: 'organizer' }, { personId: '2400012345', role: 'deep' }, { personId: '2400012347', role: 'deep' }] },
  { id: 'act-24', title: '8月支委会', date: '2026-08-15', type: '支委会', organizer: '2400012355', direction: 'top-down', location: '光华1号楼305会议室', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: '2400012355', role: 'organizer' }] },
  { id: 'act-23', title: '8月党小组会', date: '2026-08-17', type: '党小组会', organizer: '2400012345', direction: 'bottom-up', location: '光华1号楼203会议室', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012345', role: 'organizer' }] },
  { id: 'act-21', galleryFeatured: true, title: '10月主题党日：深化改革', date: '2026-10-06', type: '主题党日', organizer: '2400012345', direction: 'bottom-up', location: '光华1号楼101报告厅', isBrand: true, brandName: '深化改革', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: '2400012345', role: 'organizer' }, { personId: '2400012347', role: 'deep' }] },
  { id: 'act-22', title: '10月积极分子座谈会', date: '2026-10-07', type: '主题党日', organizer: '2400012355', direction: 'top-down', location: '光华1号楼305会议室', scenarioId: 'theme-party', domain: 'party-building', carriers: ['交流座谈'], assignments: [{ personId: '2400012355', role: 'organizer' }] },

  // ── 8 月活动（暑期特色，与 notices.js 保持数据协调）────────────
  // 2026-08-05 支书裁决：已生成考勤的活动日期须已发生（≤ 8/5），
  // act-28「谈话考察」违背「删除考察活动类型」（5b2e4ea）已彻底删除。
  { id: 'act-26', title: '8月党小组会（暑期线上）', date: '2026-08-01', type: '党小组会', organizer: '2400012345', direction: 'bottom-up', hostGroup: '第一党小组', location: '线上·腾讯会议', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012345', role: 'organizer' }] },
  // R-21（2026-09-13）：补第二/第三党小组小组会——此前小组会种子只覆盖第一党小组，
  // 「上传位＝本组」收紧后 2400012346/2400012348 的考勤/考察上传下拉为空（演示不完整）。
  // hostGroup 显式固化 = 组长写入同一语义，服务层 _activityPartyGroup 直接取用。
  { id: 'act-32', title: '8月党小组会：第二党小组理论学习', date: '2026-08-04', type: '党小组会', organizer: '2400012346', direction: 'bottom-up', hostGroup: '第二党小组', location: '光华1号楼205会议室', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012346', role: 'organizer' }] },
  { id: 'act-33', galleryFeatured: true, title: '8月党小组会：第三党小组理论学习', date: '2026-08-05', type: '党小组会', organizer: '2400012348', direction: 'bottom-up', hostGroup: '第三党小组', location: '光华1号楼207会议室', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012348', role: 'organizer' }] },
  { id: 'act-27', title: '8月支委会：新学期筹备', date: '2026-08-03', type: '支委会', organizer: '2400012355', direction: 'top-down', location: '光华1号楼305会议室', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: '2400012355', role: 'organizer' }], agenda: [{ item: '新学期支部工作计划', host: '支书' }, { item: '迎新工作分工', host: '组织委员' }, { item: '九月主题党日策划', host: '宣传委员' }] },
  { id: 'act-29', galleryFeatured: true, title: '暑期实践总结分享', date: '2026-08-04', type: '主题党日', organizer: '2400012345', direction: 'bottom-up', location: '光华1号楼101报告厅', isBrand: true, brandName: '暑期实践', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: '2400012345', role: 'organizer' }, { personId: '2400012352', role: 'deep' }, { personId: '2400012349', role: 'participant' }] },
  // act-30 秋季学期工作部署会（completed、无考勤，日期 8/28——演示「已结束未生成考勤」路径）
  // 存量决策活动 voteConfig 迁移结论（2026-09-02，T-2026-09-006）：act-30 为普通工作部署会、无表决语义，
  //   不加 voteConfig（服务端无 voteConfig 回退 deliberative+支委白名单仅在其议程触发表决时生效，
  //   部署会无此场景）；线上表决演示由 act-31 承担，无 voteConfig 回退路径已有服务端测试覆盖。
  { id: 'act-30', title: '秋季学期工作部署会', date: '2026-08-28', type: '支部党员大会', organizer: '2400012355', direction: 'top-down', location: '光华1号楼101报告厅', scenarioId: 'branch-party-meeting', domain: 'party-building', assignments: [{ personId: '2400012355', role: 'organizer' }, { personId: '2400012352', role: 'participant' }, { personId: '2500010001', role: 'participant' }] },
  // act-31 线上异步表决样例（AV4.5 演示）：支部党员大会 voteConfig formal-only 固化应到名单，
  // voterIds = 正式党员（2400012345–2400012349、2400012352–2300010002，均非 u_*），
  // 预备党员/积极分子不在名单 → activity.html 只读提示「仅应到表决人可表态」
  // ── 历史快照语义（支书 2026-09-06 ②批 voterIds 与 roster 联动）──
  //   voteConfig.voterIds = 活动创建时固化的名单快照，此后成员「在校/滞留」状态变更
  //   不回改历史活动（本快照固化于滞留剔除口径落地前，故仍含 2400012349/2400012353）；
  //   新创建活动的默认 voterIds 由 services/activity/vote-config.js resolveVoterIds 现时生成
  //   （范围 + 剔除滞留，roster 口径单一源 = policy-defaults attendance.roster），本数据保持原值。
  // voteConfig 是历史快照，不随状态回改，详情页仍按 voteConfig 渲染已固化的应到名单。
  { id: 'act-31', title: '9月支部党员大会（线上异步表决）', date: '2026-09-10', type: '支部党员大会', organizer: '2400012355', direction: 'top-down', location: '线上（异步表决）', scenarioId: 'branch-party-meeting', domain: 'party-building', voteConfig: { mode: 'async', optionSet: 'formal', voterScope: 'formal-only', voterIds: ['2400012345', '2400012346', '2400012347', '2400012348', '2400012349', '2400012352', '2400012353', '2400012354', '2400012355', '2400012356', '2300010001', '2300010002'], quorumCheck: true }, assignments: [{ personId: '2400012355', role: 'organizer' }, { personId: '2400012349', role: 'participant' }, { personId: '2400012352', role: 'participant' }], agenda: [{ id: 'ag-mtg-1', item: '审议 2026 年秋季学期支部工作计划', host: '支书' }, { id: 'ag-mtg-2', item: '审议发展对象接收为预备党员的决议', host: '组织委员' }] },

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
  //   **日期为何保留在 8 月**：这是「决议落实」演示的稳定锚点，且不依赖「当月恰好只有一条」的偶然事实。
  { id: 'act-35', galleryFeatured: true, title: '8月支委会：发展党员工作阶段审议', date: '2026-08-12', type: '支委会', organizer: '2400012355', direction: 'top-down', location: '光华1号楼305会议室', scenarioId: 'branch-committee', domain: 'party-building', assignments: [{ personId: '2400012355', role: 'organizer' }], agenda: [{ id: 'ag-35-1', item: '审议 2026 年秋季学期发展党员阶段名单', host: '组织委员', result: 'passed', recordedBy: '2400012345', recordedAt: '2026-08-12T15:30:00+08:00' }] },

  // ════════════════════════════════════════════════════════════════════
  //  2026-10 宣传基线（支书令「十月份显示一些活动 —— 党建思想学习 与
  //  红色徒步去香山（纪念长征胜利 90 周年）」）：act-36 党课、act-37 红色徒步主题党日。
  //  两条均为非表决类，不加 voteConfig；SEED_TASKS 未引用二者（无未完成任务挂靠）。
  // ════════════════════════════════════════════════════════════════════
  { id: 'act-36', title: '党建思想学习会', date: '2026-10-15', type: '党课', organizer: '2300010001', direction: 'top-down', location: '光华1号楼101报告厅', scenarioId: 'party-lecture', domain: 'party-building', assignments: [{ personId: '2300010001', role: 'organizer' }], agenda: [{ item: '主题讲授：深入学习党的创新理论', host: '支书' }] },
  { id: 'act-37', title: '红色徒步·香山行（纪念长征胜利 90 周年）', date: '2026-10-22', type: '主题党日', organizer: '2400012347', direction: 'bottom-up', location: '香山公园', isBrand: true, brandName: '红色徒步', scenarioId: 'theme-party', domain: 'party-building', carriers: ['实践参访'], isOutdoor: true, assignments: [{ personId: '2400012347', role: 'organizer' }] },

  // ── 11 月计划态活动（Task 5）：只 draft/published（由派生器按日期/draft 事实给出），不生成考勤/复盘/归档 ──
  { id: 'act-38', title: '11月主题党日：学习贯彻党的二十届四中全会精神', date: '2026-11-12', type: '主题党日', organizer: '2400012347', direction: 'bottom-up', location: '光华1号楼101报告厅', isBrand: true, brandName: '学习贯彻二十届四中全会精神', scenarioId: 'theme-party', domain: 'party-building', assignments: [{ personId: '2400012347', role: 'organizer' }, { personId: '2400012352', role: 'deep' }] },
  { id: 'act-39', title: '11月党小组会：第三党小组理论学习', date: '2026-11-19', type: '党小组会', organizer: '2400012348', direction: 'bottom-up', hostGroup: '第三党小组', location: '光华1号楼207会议室', scenarioId: 'party-group-meeting', domain: 'party-building', assignments: [{ personId: '2400012348', role: 'organizer' }] },
  { id: 'act-40', title: '11月支委会：发展党员工作专题', date: '2026-11-25', type: '支委会', organizer: '2400012355', direction: 'top-down', location: '光华1号楼305会议室', scenarioId: 'branch-committee', domain: 'party-building', draft: true, assignments: [{ personId: '2400012355', role: 'organizer' }] },
];
