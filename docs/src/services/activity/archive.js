// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  archive.js — 档案材料（archiveRecords）服务层写口
// ════════════════════════════════════════════════════════════════
// 为什么要有这一层（R2-40，2026-10-20）：
//   宣传台上传材料原先在 api 形态只写 `fileSpaceRecords` + 内存 `archiveRecords.push`，
//   没有调用 `archiveRecords.create` ⇒ 刷新后归档记录消失（服务端表其实一直存在
//   `archive_records`，api-adapter 也有 `/api/v1/archiveRecords`）。
//   本模块把「写归档记录」收敛成一个服务层入口：
//     · api 形态 → `POST /api/v1/archiveRecords`（落库，刷新后可读）；
//     · mock 形态 → MockAdapter 写 localStorage（同样刷新后可读）。
//   调用点只依赖 ArchiveStore，不再直接 push `mockDB.archiveRecords`（避免两形态两套写法）。
import { getAdapter } from '../../data/data-adapter.js?v=20261020h';
import { mockDB } from '../../core/domain/domain.js?v=20261020h';

/** 用服务端/适配器返回行替换内存同 id 行；不存在则追加（mock 形态适配器已追加，此处幂等） */
function _syncMemory(record) {
  if (!record || !record.id) return;
  const rows = Array.isArray(mockDB.archiveRecords) ? mockDB.archiveRecords : [];
  const idx = rows.findIndex((row) => row && row.id === record.id);
  mockDB.archiveRecords = idx >= 0
    ? [...rows.slice(0, idx), { ...rows[idx], ...record }, ...rows.slice(idx + 1)]
    : [...rows, record];
}

export const ArchiveStore = {
  /**
   * 新增一条归档材料记录（文件本体已由调用方上传/读取完成后调用）。
   * @param {Object} data 归档行（activityId/activityName/category/fileName/fileSize/filePath|fileData/
   *   uploadedBy/archiveDate/status）
   * @returns {Promise<Object>} 落库后的行
   */
  async createMaterial(data) {
    const record = await getAdapter().archiveRecords.create(data);
    _syncMemory(record);
    return record;
  },

  /**
   * 删除一条归档材料记录（服务端/本地同源删除）；文件空间元数据由调用方按其 filePath 另行删除。
   * @param {string} id
   * @returns {Promise<{id:string}>}
   */
  async removeMaterial(id) {
    if (!id) return { id };
    const res = await getAdapter().archiveRecords.delete(id);
    mockDB.archiveRecords = (mockDB.archiveRecords || []).filter((row) => row.id !== id);
    return res;
  },
};
