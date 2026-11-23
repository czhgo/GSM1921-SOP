// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/committee-notices.js —— **党委公开通知写口**（批次 537 波次 1 · G2）
//
//  由来：公共门厅（`routes/public-portal.js`）只读「党委已发布、未过期、`publishScope='public'`」
//    的通知，但服务端此前没有创建这类通知的通道——通用 `POST /notices` 已收口为「公开面字段只归党委」，
//    党委也没有第二落点 ⇒ 公共门厅的通知永远为空。
//
//  口径：
//    · 所有端点 `requireRole(db, PARTY_STAFF_ROLE)`（角色集单一源 = gates.js）；
//    · 归属固定 `branchId='pc-gsm'`、`source='committee'`、`audience=['all']`、`kind='announcement'`，
//      客户端传同名字段一律被服务端覆盖；
//    · `publishScope` 只收 `login` / `public`；`public` 必须带未来的 `publishExpiresAt`（否则 422）；
//    · 发布面变化只经 `publication-audit.js::writePublicationAudit` 一条出口留痕
//      （resourceType='notice'，action = publish / unpublish / update-scope）。
//
//  挂载：`semantic-routes.js::registerExtraSemanticRoutes` 末尾（纯追加，不移动既有行号）。
// ════════════════════════════════════════════════════════════════
import { randomUUID } from 'node:crypto';
import { requireRole } from '../auth.js';
import { listTable, getRow, writeRow } from './store.js';
import { PARTY_STAFF_ROLE } from './gates.js';
import { writePublicationAudit } from './publication-audit.js';
import { COMMITTEE_OWNER_ID } from '../../../docs/src/core/domain/constants.js';
import { today as todayLocal } from '../../services/reporting.js';
// R10-D02：语义写口必须推进集合版本，否则别的设备用旧 baseline 整表快照会把这一行删掉。
import { bumpCollectionVersion } from '../../db.js';

/** 党委通知允许的发布范围（支部内部不适用：党委通知只面向登录成员或公开门厅） */
export const COMMITTEE_NOTICE_SCOPES = Object.freeze(['login', 'public']);
/** 编辑白名单（归属 / 来源 / 受众 / 类型 / 时间由服务端维护） */
export const COMMITTEE_NOTICE_PATCH_FIELDS = Object.freeze([
  'title', 'content', 'priority', 'publishScope', 'publishExpiresAt',
]);

/** 发布面快照（留痕 oldValue / newValue 用；缺省范围＝login） */
function publicationSnapshot(row) {
  return {
    publishScope: (row && row.publishScope) || 'login',
    publishExpiresAt: row && row.publishExpiresAt !== undefined ? row.publishExpiresAt : null,
  };
}

/** 发布面校验：范围枚举 + public 须未来有效期（通过 → null） */
function publicationError(row) {
  const scope = (row && row.publishScope) || 'login';
  if (!COMMITTEE_NOTICE_SCOPES.includes(scope)) {
    return `publishScope 须为 ${COMMITTEE_NOTICE_SCOPES.join(' / ')} 之一`;
  }
  if (scope !== 'public') return null;
  const raw = row.publishExpiresAt;
  const ts = typeof raw === 'string' && raw.trim() ? Date.parse(raw) : NaN;
  if (!Number.isFinite(ts) || ts <= Date.now()) {
    return 'public 可见须设置未来的 publishExpiresAt（ISO 时间）';
  }
  return null;
}

/** 发布面变化：无变化 → null；否则给出留痕动作与旧值 / 新值 */
function publicationChange(prev, next) {
  const before = publicationSnapshot(prev);
  const after = publicationSnapshot(next);
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  let action = 'update-scope';
  if (before.publishScope !== 'public' && after.publishScope === 'public') action = 'publish';
  else if (before.publishScope === 'public' && after.publishScope !== 'public') action = 'unpublish';
  return { action, oldValue: before, newValue: after };
}

/** 读取一条党委通知；不存在 → null，非党委通知 → `false`（区分 404 与 403） */
function readCommitteeNotice(db, id) {
  const row = getRow(db, 'notices', String(id));
  if (!row) return null;
  return (row.branchId === COMMITTEE_OWNER_ID && row.source === 'committee') ? row : false;
}

/**
 * 注册党委公开通知端点。
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 */
export function registerCommitteeNoticeRoutes(router, db) {
  // ── 列表（只列党委通知；可按发布范围过滤；按 publishDate 倒序）──
  router.get('/committee/notices', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    let rows = listTable(db, 'notices').filter((row) => row
      && row.branchId === COMMITTEE_OWNER_ID
      && row.source === 'committee');
    if (req.query.publishScope) {
      rows = rows.filter((row) => ((row.publishScope || 'login') === req.query.publishScope));
    }
    rows.sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || '')));
    res.json(rows);
  });

  // ── 创建（归属 / 受众 / 类型 / 时间 / 创建人由服务端强制；public 须未来有效期）──
  router.post('/committee/notices', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!title) return res.status(422).json({ error: '缺少必要字段：title' });
    if (!content) return res.status(422).json({ error: '缺少必要字段：content' });

    const row = {
      id: `ntc-${randomUUID().slice(0, 8)}`,
      title,
      content,
      priority: body.priority === 'urgent' ? 'urgent' : 'normal',
      publishScope: body.publishScope || 'login',
      publishExpiresAt: body.publishExpiresAt === undefined ? null : body.publishExpiresAt,
    };
    const scopeError = publicationError(row);
    if (scopeError) return res.status(422).json({ error: scopeError });

    row.branchId = COMMITTEE_OWNER_ID;
    row.source = 'committee';
    row.audience = ['all'];
    row.kind = 'announcement';
    row.publishDate = todayLocal();
    row.createdBy = req.actor.id;
    row.createdAt = new Date().toISOString();

    writeRow(db, 'notices', row);
    bumpCollectionVersion(db, 'notices');
    writePublicationAudit(db, {
      resourceType: 'notice',
      resourceId: row.id,
      action: 'publish',
      actor: req.actor,
      oldValue: null,
      newValue: publicationSnapshot(row),
    });
    res.status(201).json(row);
  });

  // ── 编辑（白名单字段；public 校验同上；发布面变化写留痕）──
  router.patch('/committee/notices/:id', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const prev = readCommitteeNotice(db, req.params.id);
    if (prev === null) return res.status(404).json({ error: '通知不存在' });
    if (prev === false) return res.status(403).json({ error: '无权限：只能编辑党委公开通知' });
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const unknown = Object.keys(body).find((key) => !COMMITTEE_NOTICE_PATCH_FIELDS.includes(key));
    if (unknown) return res.status(400).json({ error: `字段 ${unknown} 不在本端点白名单` });

    const next = { ...prev };
    for (const key of Object.keys(body)) next[key] = body[key];
    if (typeof next.title === 'string') next.title = next.title.trim();
    if (!next.title) return res.status(422).json({ error: '标题不得为空' });
    if (typeof next.content === 'string') next.content = next.content.trim();
    if (!next.content) return res.status(422).json({ error: '正文不得为空' });

    const scopeError = publicationError(next);
    if (scopeError) return res.status(422).json({ error: scopeError });

    writeRow(db, 'notices', next);
    bumpCollectionVersion(db, 'notices');
    const change = publicationChange(prev, next);
    if (change) {
      writePublicationAudit(db, {
        resourceType: 'notice',
        resourceId: next.id,
        action: change.action,
        actor: req.actor,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
    res.json(next);
  });

  // ── 撤下公开（置回 login；幂等；实际变化才写 unpublish 留痕）──
  router.post('/committee/notices/:id/withdraw', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const prev = readCommitteeNotice(db, req.params.id);
    if (prev === null) return res.status(404).json({ error: '通知不存在' });
    if (prev === false) return res.status(403).json({ error: '无权限：只能撤下党委公开通知' });
    if ((prev.publishScope || 'login') === 'login') return res.json(prev);

    const next = { ...prev, publishScope: 'login' };
    writeRow(db, 'notices', next);
    bumpCollectionVersion(db, 'notices');
    writePublicationAudit(db, {
      resourceType: 'notice',
      resourceId: next.id,
      action: 'unpublish',
      actor: req.actor,
      oldValue: publicationSnapshot(prev),
      newValue: publicationSnapshot(next),
    });
    res.json(next);
  });
}
