﻿// role: [工程师]+[AI]
// login-entry.js — 登录页入口（重构版）
// 支持: 账号密码 Mock 校验 + 开发模式直接选身份

import { AuthStore } from '../services/auth.js?v=20260808g';
import { mockLogin } from '../mock/accounts.js?v=20260808g';
import { getAccentColors } from '../core/constants.js?v=20260808g';

// 已登录则直接跳转
const user = AuthStore.getCurrentUser();
if (user) {
  window.location.href = './index.html';
}

// ── 开发模式卡片数据 ──────────────────────────────
const DEV_CARDS = [
  { role: 'secretary',         label: '党支部书记',   desc: '组织统筹决策' },
  { role: 'deputy-secretary',  label: '党支部副书记', desc: '协助书记工作' },
  { role: 'org-commissioner',  label: '组织委员',     desc: '发展数据' },
  { role: 'prop-commissioner', label: '宣传委员',     desc: '宣传档案' },
  { role: 'disc-commissioner', label: '纪检委员',     desc: '考勤考察' },
  { role: 'leader',            label: '党小组组长',   desc: '活动统筹' },
  { role: 'participant',       label: '普通参与者',   desc: '查看信息' },
];

// ── 渲染开发模式卡片 ──────────────────────────────
function _renderDevCards() {
  const container = document.getElementById('dev-cards');
  if (!container) return;

  container.innerHTML = DEV_CARDS.map(card => {
    const { accent } = getAccentColors(card.role);
    return `
      <div class="login-card bg-white rounded-xl p-3 border border-gray-200 cursor-pointer" data-role="${card.role}">
        <div class="flex items-center gap-2 mb-2">
          <div style="width:8px;height:8px;border-radius:50%;background:${accent};"></div>
          <span class="font-medium text-sm text-gray-800">${card.label}</span>
        </div>
        <p class="text-xs text-gray-400 mb-2">${card.desc}</p>
        <button class="login-btn w-full text-sm px-4 py-[7px] rounded-lg text-white font-medium" style="background:${accent};">登录</button>
      </div>
    `;
  }).join('');

  // 绑定点击
  container.querySelectorAll('[data-role]').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      AuthStore.devLogin(role);
      window.location.href = './index.html';
    });
  });
}

// ── 开发模式开关 ──────────────────────────────────
const devToggle = document.getElementById('dev-toggle');
const devSection = document.getElementById('login-dev');
const defaultSection = document.getElementById('login-default');

if (devToggle) {
  devToggle.addEventListener('change', () => {
    if (devToggle.checked) {
      devSection.classList.add('visible');
      defaultSection.style.display = 'none';
      _renderDevCards();
    } else {
      devSection.classList.remove('visible');
      defaultSection.style.display = 'block';
    }
  });
}

// ── 账号密码登录 ──────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('student-id').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('login-error');

    const result = mockLogin(studentId, password);
    if (!result.ok) {
      errorEl.classList.remove('hidden');
      return;
    }

    errorEl.classList.add('hidden');
    // 等待登录完成（含后端 token 获取）后再跳转，确保 API 模式在导航前已生效
    AuthStore.login(result.personId).then(() => {
      window.location.href = './index.html';
    });
  });
}
