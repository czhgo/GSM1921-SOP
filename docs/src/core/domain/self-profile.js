// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/domain/self-profile.js —— 成员「**自我描述**」字段模型（**零依赖叶子**，前后端同引一处）
//
//  · 来源：支书 2026-10-05 提供**问卷导出字段清单**（~24 列；`D-788` / `V-10b`）并圈定
//    **落点＝扩 `people.js`**（成员档案加一组字段）、**录入主体＝本人可填 ＋ 支委层代录**。
//  · 为什么单独一件：字段表与净化口径是**前后端单一源**（前端表单 / 导入链与服务端写口白名单同引一处），
//    且本件**零依赖**（不 import 任何件）⇒ 服务端可直接 import，不成环、双端可载。
//  · 形态：一个 `selfProfile` 对象挂在成员档案上（`person.selfProfile`），字段分三类——
//      `text`（单行文本）· `bool`（是 / 否）· `multi`（多值数组）· `list`（**子表**：多行 × 固定列）。
//  · **不重复存**已有档案字段：姓名 / 学号 / 发展阶段（政治面貌）在档案本体上，本对象**不含**。
// ════════════════════════════════════════════════════════════════

/** 字段定义表（**顺序＝表单与展示顺序**；单一源） */
export const SELF_PROFILE_FIELDS = [
  { key: 'phone', label: '手机号', type: 'text' },
  { key: 'grade', label: '所属年级', type: 'text' },
  { key: 'major', label: '专业', type: 'text' },
  { key: 'hasStudentWork', label: '承担学生工作或担任班干部', type: 'bool' },
  {
    key: 'studentWorks', label: '担任的学生工作', type: 'list',
    itemFields: [
      { key: 'category', label: '类别' },
      { key: 'dept', label: '所任部门 / 班级' },
      { key: 'title', label: '职务' },
    ],
  },
  { key: 'familiarWorks', label: '比较熟悉的学生工作', type: 'multi' },
  { key: 'familiarWorksOther', label: '比较熟悉的学生工作 · 其他补充', type: 'text' },
  { key: 'volunteered', label: '参加过志愿服务', type: 'bool' },
  { key: 'volunteerHours', label: '累计志愿服务时长（大致）', type: 'text' },
  { key: 'ledProject', label: '独立负责过较大型活动或项目', type: 'bool' },
  {
    key: 'keyProjects', label: '负责过的重要活动或项目', type: 'list',
    itemFields: [
      { key: 'name', label: '活动名称' },
      { key: 'work', label: '工作内容' },
    ],
  },
  { key: 'futureDirections', label: '未来发展方向', type: 'multi' },
  { key: 'futureDirectionsOther', label: '未来发展方向 · 其他补充', type: 'text' },
  {
    key: 'honors', label: '奖项或荣誉', type: 'list',
    itemFields: [
      { key: 'level', label: '级别' },
      { key: 'levelOther', label: '级别 · 补充' },
      { key: 'name', label: '奖项 / 荣誉名称' },
    ],
  },
  { key: 'extraNote', label: '其他希望支部了解的经历或特长', type: 'text' },
];

/** 字段键集（白名单；写入与净化都按它过滤） */
export const SELF_PROFILE_KEYS = SELF_PROFILE_FIELDS.map((f) => f.key);

/** 单值 / 多值文本的**长度上限**（净化用；防超长串灌入台账） */
export const SELF_PROFILE_TEXT_MAX = 500;
/** 子表最大行数（净化用；防无界增长） */
export const SELF_PROFILE_LIST_MAX = 20;

/** 空表单（表单初值 / 无自我描述时的占位）；每次返回新对象，避免共享引用 */
export function emptySelfProfile() {
  const out = {};
  for (const f of SELF_PROFILE_FIELDS) {
    out[f.key] = f.type === 'bool' ? null
      : f.type === 'multi' ? []
        : f.type === 'list' ? []
          : '';
  }
  return out;
}

const _str = (v, max = SELF_PROFILE_TEXT_MAX) => String(v == null ? '' : v).trim().slice(0, max);

/** 是否「空自我描述」（所有字段皆空 ⇒ 视为未填，写口可据此不落该字段） */
export function isSelfProfileEmpty(sp) {
  if (!sp || typeof sp !== 'object') return true;
  for (const f of SELF_PROFILE_FIELDS) {
    const v = sp[f.key];
    if (f.type === 'bool') { if (v === true || v === false) return false; continue; }
    if (f.type === 'multi') { if (Array.isArray(v) && v.some((x) => _str(x))) return false; continue; }
    if (f.type === 'list') {
      if (Array.isArray(v) && v.some((row) => row && Object.values(row).some((x) => _str(x)))) return false;
      continue;
    }
    if (_str(v)) return false;
  }
  return true;
}

/**
 * 净化：只留白名单键、按 `type` 归一（`bool` → true/false/null；`multi` → 去空去重有限长数组；
 * `list` → 去空行、子表只留 `itemFields` 声明列并有限长；`text` → trim 截断）。
 * 非对象输入 ⇒ 返回 `emptySelfProfile()`。**不抛错**（同 `sanitizeBranchRoster` 的契约：坏输入净化、不崩）。
 * @returns {Object} 净化后的 `selfProfile`
 */
export function sanitizeSelfProfile(input) {
  const src = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};
  const out = {};
  for (const f of SELF_PROFILE_FIELDS) {
    const v = src[f.key];
    if (f.type === 'bool') {
      out[f.key] = v === true || v === 'true' || v === '是' ? true
        : v === false || v === 'false' || v === '否' ? false : null;
    } else if (f.type === 'multi') {
      const arr = Array.isArray(v) ? v : (v == null || v === '' ? [] : String(v).split(/[|;；,，、]/));
      const seen = new Set();
      out[f.key] = arr.map((x) => _str(x)).filter((x) => x && !seen.has(x) && seen.add(x)).slice(0, SELF_PROFILE_LIST_MAX);
    } else if (f.type === 'list') {
      const rows = Array.isArray(v) ? v : [];
      out[f.key] = rows
        .filter((r) => r && typeof r === 'object' && !Array.isArray(r))
        .map((r) => {
          const o = {};
          for (const it of f.itemFields || []) o[it.key] = _str(r[it.key]);
          return o;
        })
        .filter((o) => Object.values(o).some((x) => x))
        .slice(0, SELF_PROFILE_LIST_MAX);
    } else {
      out[f.key] = _str(v);
    }
  }
  return out;
}
