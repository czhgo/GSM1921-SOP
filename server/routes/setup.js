// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/setup.js —— **部署与对接自检端点**（2026-09-29 批次 273 新增）
//
//  由来（支书 2026-09-29）：「能不能用一个 wizard 界面，让我可以配置需要改变的内容！」
//  档位 = **A（只读状态 ＋ 可复制配置）**——本端点是它的数据源：给党委台「部署与对接」面板用。
//
//  ⚠ **安全底线（本件的核心约束）**：**只回答「有没有」，绝不回值**——
//    不回 `LOGIN_PASSWORD`、不回 `appID`、不回 `SMTP_PASS`……只回布尔与计数；
//    唯一稍微"泄一点"的是 `LOGIN_PASSWORD_IS_DEFAULT`（是否仍是缺省演示口令），
//    它不泄值、但是**最该被提醒的一条**，故保留（判断依据 = 与 `'123456'` 比较）。
//    测试 `server/test/setup-status.test.mjs` 会**断言响应里不出现任何密钥实值**。
//
//  门：**仅 `party-staff`**（运维信息；与党委台其他面板一致）。其余角色一律 403。
//
//  返回形状（前端面板只做渲染、不做判断 ⇒ 判断都在这里，口径单一源）：
//    { deploy:{mode,appEnv,node}, env:{…布尔}, db:{…计数}, checklist:[{id,ok,label,howto}] }
// ════════════════════════════════════════════════════════════════
import express from 'express';
import { requireAuth } from './auth.js';
import { PARTY_STAFF_ROLE } from '../../docs/src/core/domain/constants.js';

const has = (k) => !!(process.env[k] && String(process.env[k]).trim());
const isProd = () => process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';

export function createSetupRouter(db) {
  const router = express.Router();

  router.get('/setup-status', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!actor || !PARTY_STAFF_ROLE.includes(actor.role)) {
      return res.status(403).json({ error: '无权限：仅党委组织员可查看部署与对接状态' });
    }

    // ── 环境变量（**只回布尔**）──
    const env = {
      APP_ENV: isProd(),
      LOGIN_PASSWORD: has('LOGIN_PASSWORD'),
      LOGIN_PASSWORD_IS_DEFAULT: process.env.LOGIN_PASSWORD === '123456',
      DB_PATH: has('DB_PATH'),
      UPLOAD_DIR: has('UPLOAD_DIR'),
      SEED_FALLBACK_OFF: process.env.SEED_FALLBACK === '0',
      MAIL_ENABLED: process.env.MAIL_ENABLED === 'true',
      IAAA_APP_ID: has('IAAA_APP_ID'),
      IAAA_REDIRECT_URI: has('IAAA_REDIRECT_URI'),
      IAAA_MOCK: process.env.IAAA_MOCK === '1',
    };

    // ── 库内实况（**计数**，不列人名）──
    const users = db.prepare('SELECT data FROM users').all().map((r) => JSON.parse(r.data));
    // 「演示名册成员」的**包无关**判据：演示人的 id 形如 `p1`…`p50`（短 `p`＋数字）——
    //   ⚠ 不能用「id ∈ PEOPLE」：发布包里 `docs/src/data/mock/people.js` 已被**空壳化**（`PEOPLE = []`），
    //   那样判据会**恒真**（等于没检）。而基线党委账号是 `p_pc`、IAAA 自建号是 `p_<uuid12>` ⇒ 都不会被误判。
    const demoAccounts = users.filter((u) => /^p\d{1,3}$/.test(String(u.id))).length;
    const dbStat = {
      partyStaff: users.filter((u) => u.role === 'party-staff').length,
      branches: db.prepare('SELECT COUNT(*) c FROM branches').get().c,
      members: users.filter((u) => u.branchId).length,                                  // 已归属支部的人
      unassigned: users.filter((u) => !u.branchId && u.role !== 'party-staff').length,   // 已建号、**待支部确认归属**
      demoAccounts,                                                                     // 演示名册残留（应为 0）
      users: users.length,
      schemaVersion: db.pragma('user_version', { simple: true }),
    };

    // ── 「还需要改什么」清单（**口径单一源**：面板不再自己判断）──
    const checklist = [
      { id: 'app-env', ok: env.APP_ENV, label: '生产形态开关 APP_ENV=production',
        howto: '未设 ⇒ 口令与播种的保护都不生效。在环境变量文件里设 APP_ENV=production' },
      { id: 'password', ok: env.LOGIN_PASSWORD && !env.LOGIN_PASSWORD_IS_DEFAULT,
        label: '全站统一口令 LOGIN_PASSWORD 已改（且不是缺省的 123456）',
        howto: env.LOGIN_PASSWORD_IS_DEFAULT ? '⚠ 现在还是缺省口令 123456 —— **必须改**' : '生产未设该变量时服务会拒绝启动；请设一个强口令',
      },
      { id: 'db-path', ok: env.DB_PATH, label: '库文件路径 DB_PATH（建议显式指定）',
        howto: '缺省会用 server/data.db；生产建议写绝对路径并纳入备份' },
      { id: 'upload-dir', ok: env.UPLOAD_DIR, label: '附件目录 UPLOAD_DIR（建议显式指定）',
        howto: '附件只在磁盘上：丢库可重建、丢文件不可恢复 ⇒ 必须与库一并备份' },
      { id: 'seed-fallback', ok: env.SEED_FALLBACK_OFF, label: '关断前端三域演示回退 SEED_FALLBACK=0',
        howto: '不关的话，考勤/考察/待办空表会注入演示数据' },
      { id: 'baseline', ok: dbStat.partyStaff >= 1 && dbStat.branches >= 1,
        label: '组织基线已建立（党委账号 ≥1 ＋ 支部 ≥1）',
        howto: '空库首启会自动建立（党委 1 ＋ 支部「光华管理学院本科生党支部」）；若为 0，检查启动日志' },
      { id: 'no-demo', ok: dbStat.demoAccounts === 0,
        label: '库内没有演示名册残留（演示种子账号 = 0）',
        howto: '看启动日志「自检 · 演示种子账号=…」，应为 0；>0 说明库是从演示库来的 ⇒ 用空库重新起步（先备份再迁真人数据）' },
      { id: 'iaaa', ok: (env.IAAA_APP_ID && env.IAAA_REDIRECT_URI) || env.IAAA_MOCK,
        label: 'IAAA 统一身份认证已配置（或本地联调模式）',
        howto: '备案：校内信息门户 →「办事大厅」→ 搜「统一身份认证应用备案申请」→ 在线提交'
          + '（线上办、无需纸质、无需跑计算中心；⚠ 该服务仅面向在校职工）→ 审批后计算中心发《技术文档》，'
          + '把 appID 填 IAAA_APP_ID、把备案登记的回调地址填 IAAA_REDIRECT_URI（两端必须逐字一致）' },
      { id: 'schema', ok: dbStat.schemaVersion >= 1, label: '库结构版本已应用（迁移机制在跑）',
        howto: '若为 0，说明建表/迁移未完成，查看启动日志 [db] schema vN' },
    ];

    // 可复制的 env 片段（**只有键名与占位，不含任何真实值**）⇒ 面板「复制」按钮直接给这段
    const envTemplate = [
      '# 光华党支部管理引擎 · 生产环境（把 <…> 换成你的值）',
      'APP_ENV=production',
      'LOGIN_PASSWORD=<强口令>',
      'DB_PATH=/opt/gsm1921/server/data.db',
      'UPLOAD_DIR=/opt/gsm1921/server/uploads',
      'SEED_FALLBACK=0',
      '',
      '# 北大 IAAA（备案审批后从《技术文档》取 appID；回调地址必须与备案登记逐字一致）',
      'IAAA_APP_ID=<计算中心给的 appID>',
      'IAAA_REDIRECT_URI=https://<你的域名>/api/v1/auth/iaaa/callback',
    ].join('\n');

    // 状态清单用的**短标签**（2026-09-29 批次 274：面板原先把 `label` 在「状态清单」与「还需改这些」里各说一遍
    //   ⇒ 被真机普查守卫 `copy-screen-guard::M1` 判「同屏复述 7 处」＋「文案÷控件 43.2（>20 必须改造）」。
    //   修法＝状态清单只出**短标签**（<15 字，不进复述判据），长句只出现一次且收进 `<details>` 折叠。）
    const SHORT_LABEL = {
      'app-env': '生产形态', password: '统一口令', 'db-path': '库文件路径', 'upload-dir': '附件目录',
      'seed-fallback': '演示回退', baseline: '组织基线', 'no-demo': '无演示残留', iaaa: 'IAAA', schema: '库表版本',
    };

    res.json({
      deploy: { mode: 'server', appEnv: isProd() ? 'production' : 'development', node: process.version },
      env,
      db: dbStat,
      checklist: checklist.map((c) => ({ ...c, short: SHORT_LABEL[c.id] || c.label })),
      envTemplate,
      // 只给「要改哪两处」的位置提示（不放代码内容）
      codeHint: '若《技术文档》的校验接口/字段名与本系统不同：只改 server/routes/iaaa.js 开头 5 行，'
        + '以及 _verifyWithIaaa() 里标了「← 可能要改」的两行',
    });
  });

  return router;
}
