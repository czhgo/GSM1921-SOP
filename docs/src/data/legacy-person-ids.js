// ════════════════════════════════════════════════════════════════
//  docs/src/data/legacy-person-ids.js — 旧 p* 人员 id → 学号/工号
//  @deprecated 仅用于迁移历史 localStorage（迁移完成即可删除）。
// ════════════════════════════════════════════════════════════════
//  ⚠ 只允许 `data-adapter.js` / `mock-adapter.js` 的迁移路径引用；
//    业务代码（页面、组件、服务层）禁止引用本文件。
//
//  与 `server/migrations/legacy-person-ids.js` 同一张表（快照来源＝迁移前的
//  `data/mock/people.js` 的 `id → studentId`）。两侧各自保留一份，避免前端
//  构建包引用服务端目录。
// ════════════════════════════════════════════════════════════════

export const LEGACY_PERSON_ID_MAP = Object.freeze({
  p1: '2400012345',
  p2: '2400012346',
  p3: '2400012347',
  p4: '2400012348',
  p5: '2400012349',
  p6: '2400012350',
  p7: '2400012351',
  p8: '2400012352',
  p9: '2400012353',
  p10: '2400012354',
  p11: '2400012355',
  p12: '2400012356',
  p13: '2300010001',
  p14: '2300010002',
  p15: '2500010001',
  p16: '2500010002',
  p17: '2500010003',
  p18: '2500010004',
  p19: '2500010005',
  p20: '2500010006',
  p21: '2500010007',
  p22: '2500010008',
  p23: '2500010009',
  p24: '2500010010',
  p25: '2500010011',
  p26: '2500010012',
  p27: '2500010013',
  p28: '2500010014',
  p29: '2500010015',
  p30: '2500010016',
  p31: '2500010017',
  p32: '2500010018',
  p33: '2500010019',
  p34: '2500010020',
  p35: '2500010021',
  p36: '2500010022',
  p37: '2500010023',
  p38: '2500010024',
  p39: '2500010025',
  p40: '2500010026',
  p41: '2500010027',
  p42: '2500010028',
  p43: '2500010029',
  p44: '2500010030',
  p45: '2500010031',
  p46: '2500010032',
  p47: '2500010033',
  p48: '2500010034',
  p49: '2500010035',
  p50: '2500010036',
  p_pc: '9000000001',
});

/** 旧 id 形态判定（p + 数字，或党委组织员 p_pc） */
export function isLegacyPersonId(id) {
  return typeof id === 'string' && /^p(?:\d+|_pc)$/.test(id);
}

/**
 * 旧 id → 学号/工号（已是学号/工号原样返回；未知旧 id 返回 null）。
 * @param {string} id
 * @returns {string|null}
 */
export function mapPersonId(id) {
  if (id == null) return id;
  const key = String(id);
  if (isLegacyPersonId(key)) return LEGACY_PERSON_ID_MAP[key] ?? null;
  return key;
}

/**
 * 复合 id 串（`p11:issue-002` / `wgg-seed-tf-001-p5`）里的旧 id 换成学号；其余文本原样返回。
 * @param {string} value
 * @returns {string|null} 含未知旧 id ⇒ null
 */
export function mapLegacyIdInString(value) {
  if (typeof value !== 'string') return value;
  let unresolved = null;
  const next = value.replace(/(^|[-:])p(?:_pc|\d+)(?=$|[-:])/g, (match, prefix) => {
    const token = match.slice(prefix.length);
    const mapped = LEGACY_PERSON_ID_MAP[token];
    if (!mapped) { unresolved = token; return match; }
    return prefix + mapped;
  });
  return unresolved ? null : next;
}
