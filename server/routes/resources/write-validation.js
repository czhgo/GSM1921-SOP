// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/write-validation.js —— **通用资源写口字段校验**（T12 · 2026-11-16）
//
//  为什么：通用 POST / PATCH 过去只判角色与归属，字段值形状不判 ⇒ `status:'乱码'`、超长 title
//    也能落库。本文件只做「最小但真实」的字段校验：失败由 `index.js` 返回 **422** 且不落库。
//  边界：只覆盖**通用资源写口**（`RESOURCE_TABLES` 的通用 CRUD）；语义端点的既有校验一字不动；
//    **不放宽任何权限门**（校验在写门之后执行，只多拦不合法字段，不新增放行路径）。
//
//  单一源（不另造枚举）：
//   · 活动类型 = `constants.js::ACTIVITY_SUBTYPES` ＋ 大类名 `ACTIVITY_CLASSIFICATION['three-meetings'].label`
//     （`三会一课` 为历史合法大类值；`'大类·子类'` 先经 `normalizeActivityType` 归一）
//   · 任务状态 = `constants.js::TASK_STATUS_TONE` 的键（pending / in_progress / completed，任务三态单一源）
//   · 考勤状态 = `domain.js::AttendanceStatus`
//   · 标题类字段名按各表实际字段取（`title` / `name`）；`thoughtReports.title` 按 DATA_MODEL §2.25 可缺省
//   · 日期统一 `YYYY-MM-DD` 且可解析（活动 date / 补课 absentDate·deadline / 成员流动 date / 文件空间 archiveDate）
//
//  豁免（不做字段校验；每条都写理由，守卫 `resource-write-validation-guard` 要求
//  `RESOURCE_TABLES` 每个资源要么在校验表、要么在豁免表）：
//   · 纯内嵌快照域 / 聚合根子记录：`actSubRecords`、`tfSubRecords`（`__root__` 单行，行由
//     `aggregateWriteDeny` / `aggregateSubRecordWriteDeny` 复算，不按键取值）；
//   · 走专属净化或专属 guard 的域：`branches`（config 走语义端点 + config-clean）、
//     `users`（PATCH 字段白名单 + 名册语义端点）、`signups`（signup-write-guard）；
//   · 状态由派生器从动作复算的域：`inspections`（`deriveInspectionStatus`，写口已禁自带确认态）；
//   · 由归档 / 上传 / 外发动作写入、字段名不是 title 的域：`archiveRecords`、`imageRecords`、
//     `fileSpaceRecords`（后者的日期已校验，但标题类是 `fileName` 由上传口生成）、`externalDispatches`、
//     `appointmentRecords`（走 `/branches/:id/appointments` 语义端点）；
//   · 由其它写口派生、通用口仅兼容存量的域：`assignments`、`activityReviews`、`taskforceReviews`、
//     `propTasks`、`periodicArchives`。
// ════════════════════════════════════════════════════════════════
import {
  ACTIVITY_SUBTYPES, ACTIVITY_CLASSIFICATION, TASK_STATUS_TONE, normalizeActivityType,
} from '../../../docs/src/core/domain/constants.js';
import { AttendanceStatus } from '../../../docs/src/core/domain/domain.js';
import { writeJsonLine } from '../../services/logger.js';

/** 列表读口未显式分页时的硬上限（超过不静默截断：响应头 `X-Total-Count` / `X-Has-More` 给出信号） */
export const LIST_PAGE_ROW_LIMIT = 2000;

/** 快照请求体 gzip **解压后**上限（B-552-4；与上传上限同量级，超限 ⇒ 413） */
export const SNAPSHOT_GUNZIP_MAX_BYTES = 20 * 1024 * 1024;

/** 水合整集合读口标记：`?hydrate=1` 或请求头 `X-Hydrate: 1`（**仅登录后有效**；只供客户端 `init()` 全量灌库） */
export const HYDRATE_MARKER = 'hydrate';
export const HYDRATE_HEADER = 'x-hydrate';

/** 水合规模告警线：某集合超过此行数即写一条结构化日志（提示该集合需要分页），不阻断返回 */
export const HYDRATE_WARN_ROWS = 5000;

/**
 * 水合读口判定（单一落点）：`?hydrate=1` / `X-Hydrate: 1`。
 * - 未带标记 ⇒ `'none'`（普通读口：`LIST_PAGE_ROW_LIMIT` 上限 + `X-Has-More`）；
 * - 带标记但未登录 ⇒ `'deny'`（调用方返回 403；公共归档只读口也不因该标记返回整集合）；
 * - 带标记且已登录 ⇒ `'allow'`（整集合不截断）；行数超过 `HYDRATE_WARN_ROWS` 时写一条告警日志，不阻断。
 * @param {import('express').Request} req
 * @param {string} name 资源名
 * @param {number} rowCount 授权后的行数
 * @returns {'none'|'deny'|'allow'}
 */
export function hydrateReadMode(req, name, rowCount) {
  const raw = String(req?.query?.[HYDRATE_MARKER] ?? req?.get?.(HYDRATE_HEADER) ?? '').toLowerCase();
  if (raw !== '1' && raw !== 'true') return 'none';
  if (!req?.actor) return 'deny';
  if (Number(rowCount) > HYDRATE_WARN_ROWS) {
    writeJsonLine({
      ts: new Date().toISOString(),
      level: 'warn',
      event: 'hydrate-large-collection',
      collection: name,
      rows: Number(rowCount),
      hint: `集合 ${name} 超过 ${HYDRATE_WARN_ROWS} 行：该集合需要分页读口，水合只作全量灌库兜底`,
    });
  }
  return 'allow';
}

/** 标题类字段长度上限（按字符计，先 trim） */
export const TITLE_MAX_LENGTH = 200;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 活动类型合法值：四子会 + 主题党日 + 组织生活会 ＋ 历史大类名「三会一课」 */
const ACTIVITY_TYPE_VALUES = Object.freeze([
  ...ACTIVITY_SUBTYPES,
  ACTIVITY_CLASSIFICATION['three-meetings'].label,
]);

/** 通用任务三态（键即状态值；`TASK_STATUS_TONE` 是 constants.js 的任务状态单一源） */
const TASK_STATUS_VALUES = Object.freeze(Object.keys(TASK_STATUS_TONE));

/** 考勤状态全集（domain.js 单一源） */
const ATTENDANCE_STATUS_VALUES = Object.freeze(Object.values(AttendanceStatus));

/**
 * 资源 → 字段校验声明。
 * - `title`：标题类字段名；只校验**请求体显式携带**的值（缺省＝局部更新 / 历史兼容，不强制必填）。
 * - `status` / `type`：`{ values, normalize? }`；只校验「请求体显式携带」的值。
 * - `dates`：需 `YYYY-MM-DD` 的字段名数组。
 */
export const RESOURCE_WRITE_VALIDATION = Object.freeze({
  activities: Object.freeze({
    title: 'title',
    type: Object.freeze({ values: ACTIVITY_TYPE_VALUES, normalize: normalizeActivityType }),
    dates: Object.freeze(['date']),
  }),
  tasks: Object.freeze({
    title: 'title',
    status: Object.freeze({ values: TASK_STATUS_VALUES }),
  }),
  notices: Object.freeze({ title: 'title' }),
  todos: Object.freeze({ title: 'title' }),
  reviewRequests: Object.freeze({ title: 'title' }),
  taskforces: Object.freeze({ title: 'name' }),
  partyGroups: Object.freeze({ title: 'name' }),
  experienceDeposits: Object.freeze({ title: 'title' }),
  branchDocs: Object.freeze({ title: 'title' }),
  thoughtReports: Object.freeze({ title: 'title' }),
  attendances: Object.freeze({ status: Object.freeze({ values: ATTENDANCE_STATUS_VALUES }) }),
  makeupTasks: Object.freeze({ dates: Object.freeze(['absentDate', 'deadline']) }),
  memberFlows: Object.freeze({ dates: Object.freeze(['date']) }),
  fileSpaceRecords: Object.freeze({ dates: Object.freeze(['archiveDate']) }),
});

/** 豁免表：每个未加字段校验的通用资源必须在此登记理由（守卫双向比对） */
export const RESOURCE_WRITE_VALIDATION_EXEMPTIONS = Object.freeze({
  users: '写字段白名单在 PATCH handler（R4-B03 / R4-B04）；新增成员走 /members 语义端点',
  branches: '创建走 POST /branches 语义端点；config 走 /branches/:id/config + config-clean 净化',
  signups: 'signup-write-guard.js::signupCreateDeny / normalizeSignupPatch 已有专属校验',
  inspections: 'status 由 deriveInspectionStatus 从确认动作派生；写口已禁自带确认态（handler 403）',
  assignments: '分工由活动编排入口写入，字段在前端表单校验；通用口仅兼容存量',
  activityReviews: '复盘由复盘写口 / 活动收尾流程产生；通用口仅兼容存量',
  taskforceReviews: '专班复盘由收尾流程产生；通用口仅兼容存量',
  propTasks: '宣传任务由前端任务域派生，字段名为 summary 等，尚未纳入本表（待专项核对）',
  periodicArchives: '周期归档由归档语义流产生，status 由服务端冻结快照锁定',
  archiveRecords: '归档记录由归档动作派生（activityName/title 由活动标题派生或材料自带），通用口仅补录',
  imageRecords: '图片记录的标题类字段是 fileName（由上传口生成，非人工录入）',
  externalDispatches: '外发确认由外发动作写入，无人工标题字段',
  appointmentRecords: '支部任期记录走 /branches/:id/appointments 语义端点',
  actSubRecords: '聚合 __root__ 单行快照域：行由 aggregateWriteDeny / aggregateSubRecordWriteDeny 复算',
  tfSubRecords: '同 actSubRecords（聚合 __root__ 单行快照域）',
});

/** 判定一个「标题类」字段值；返回错误文案或 null */
function checkTitle(field, value) {
  if (typeof value !== 'string') return `${field} 须为字符串`;
  const trimmed = value.trim();
  if (!trimmed) return `${field} 去空白后不得为空`;
  if (trimmed.length > TITLE_MAX_LENGTH) return `${field} 长度不得超过 ${TITLE_MAX_LENGTH} 字`;
  return null;
}

/** 判定枚举字段（`status` / `type`）；返回错误文案或 null */
function checkEnum(field, value, spec) {
  if (typeof value !== 'string') return `${field} 须为字符串`;
  const normalized = spec.normalize ? spec.normalize(value) : value;
  if (!spec.values.includes(normalized)) {
    return `${field} 不在允许取值内（允许：${spec.values.join(' / ')}）`;
  }
  return null;
}

/** 判定 `YYYY-MM-DD` 日期字段；返回错误文案或 null（导出：上报窗口 / 归档日期同用一条判据） */
export function checkDate(field, value) {
  if (typeof value !== 'string' || !DATE_RE.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))) {
    return `${field} 须为 YYYY-MM-DD 且可解析`;
  }
  return null;
}

/**
 * 校验通用资源写口请求体。
 * @param {string} name 资源名（`RESOURCE_TABLES` 键）
 * @param {Object} body 请求体（POST 单条对象 / PATCH 局部 patch）
 * @param {'post'|'patch'} method
 * @returns {string|null} 错误文案（多条用「；」连接）；合法返回 null
 */
export function validateResourceWrite(name, body, method = 'post') {
  const spec = RESOURCE_WRITE_VALIDATION[name];
  if (!spec || !body || typeof body !== 'object' || Array.isArray(body)) return null;
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if (spec.title && has(spec.title)) {
    const error = checkTitle(spec.title, body[spec.title]);
    if (error) errors.push(error);
  }

  if (spec.status && has('status')) {
    const error = checkEnum('status', body.status, spec.status);
    if (error) errors.push(error);
  }

  if (spec.type && has('type')) {
    const error = checkEnum('type', body.type, spec.type);
    if (error) errors.push(error);
  }

  for (const field of spec.dates || []) {
    if (!has(field) || body[field] === null || body[field] === '') continue;
    const error = checkDate(field, body[field]);
    if (error) errors.push(error);
  }

  return errors.length ? errors.join('；') : null;
}
