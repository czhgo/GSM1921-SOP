// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/external-dispatch.js — 文件流「外发确认」闭环服务
//  书记 2026-08-10 裁定（文件流内控）：任务/材料需通过微信外发给对方确认时，
//  发送方在系统中标记「已通过微信发送给 XX」→ 接收方在工作台「确认收到」→
//  形成可审计闭环（系统内记录 谁 / 何时 / 发给谁 / 何时确认）。
//  书记目标：未来做成小程序/服务号后与微信原生功能协同——本记录模型可低成本迁移
//  （"标记已发送" 演进为 "发送到对方微信"，"确认收到" 保持同构）。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260901n';
import { persist } from '../core/data-adapter.js?v=20260901n';
import { NoticeStore } from './notice.js?v=20260901n';

/** 读取外发确认记录（mockDB 持久化） */
export function loadExternalDispatches() {
  return Array.isArray(mockDB.externalDispatches) ? mockDB.externalDispatches : [];
}

/**
 * 发送方标记「已通过微信外发」
 * @param {Object} rec
 * @param {string} rec.refType    — 来源类型（publicity 宣传材料 / inspection 考察表单 / activity 活动材料…）
 * @param {string} rec.refLabel   — 外发内容描述（如「上传宣传材料：七一主题党日新闻稿」）
 * @param {string} rec.senderId   — 发送方 personId
 * @param {string} rec.senderName — 发送方姓名/角色
 * @param {string} rec.receiverRole — 接收方角色（secretary / disc-commissioner / org-commissioner / leader / prop-commissioner / participant）
 * @param {string} [rec.note]     — 备注（如「新闻稿已微信发给书记审核」）
 */
export function addExternalDispatch({ refType, refLabel, senderId, senderName, receiverRole, note }) {
  const rec = {
    id: 'ed_' + Date.now(),
    refType: refType || 'file',
    refLabel,
    senderId,
    senderName,
    receiverRole,
    note: note || '',
    sentAt: new Date().toISOString(),
    confirmedAt: null,
  };
  mockDB.externalDispatches = [...loadExternalDispatches(), rec];
  persist();
  // 自动广播（混合模式落地·场景3）：标记外发后通知接收方——请前往微信群查收/发送
  try {
    NoticeStore.add({
      title: '材料外发待确认',
      content: `${rec.senderName} 已标记通过微信外发「${rec.refLabel || '材料'}」${rec.receiverRole ? `给${rec.receiverRole}` : ''}。请前往微信群完成交接，收到后回系统确认。`,
      priority: 'normal',
      targetUrl: 'workspace/visitor.html',
    });
  } catch (e) {
    console.warn('[external-dispatch] 外发广播失败（不影响外发记录）：', e);
  }
  return rec;
}

/** 接收方确认收到 */
export function confirmExternalDispatch(id) {
  const list = loadExternalDispatches();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], confirmedAt: new Date().toISOString() };
  mockDB.externalDispatches = list;
  persist();
  return true;
}

/** 某角色待确认收到的外发记录（闭环：已发送未确认） */
export function listPendingByReceiver(receiverRole) {
  return loadExternalDispatches().filter(r => r.receiverRole === receiverRole && !r.confirmedAt);
}
