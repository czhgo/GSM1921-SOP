// participation.js — 兼容性重导出
// 考察记录已统一至 inspection.js，本文件仅保留向后兼容的重新导出
// 新代码应直接使用 inspection.js 的 INSPECTION_RECORDS + inspectionToDisplay
// — Source: D-198

export { INSPECTION_RECORDS as PARTICIPATION_RECORDS, inspectionToDisplay as participationToDisplay } from './inspection.js';
