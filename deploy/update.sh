#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  deploy/update.sh —— **更新**（换版本）：把《部署与对外对接》附录 A.2.1 的手工步骤变成一条命令
#
#    sudo bash deploy/update.sh /path/to/新包解包目录
#
#  顺序（与 A.2 / A.2.1 一致，**先备份再动**）：
#    ① 预检新包 → ② **备份**（db.backup 在线快照 + uploads/）→ ③ 停服
#    → ④ 替换 docs/ 与 server/ 的**代码**（**保留** data.db / uploads / backups / .env）
#    → ⑤ 装依赖 → ⑥ 起服 → ⑦ 冒烟（不通过则回滚提示）
#
#  ⚠ **不回退库结构**：迁移机制只向前应用（`user_version` 不回退）——见 A.2.1。
#  ⚠ **诚实声明**：本脚本**未在真机执行过**（2026-09-29 批次 269，只做静态审读）；
#    第一次务必在测试机跑，并**先手动确认备份产物存在**。
# ════════════════════════════════════════════════════════════════
set -euo pipefail
NEW_PKG="${1:-}"
APP_USER="${APP_USER:-gsm1921}"
APP_DIR="${APP_DIR:-/opt/gsm1921}"
SVC_NAME="${SVC_NAME:-gsm1921}"

die() { printf '\033[31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

[ -n "$NEW_PKG" ] || die "用法：bash deploy/update.sh <新包解包目录>"
[ -f "$NEW_PKG/server/server.js" ] || die "新包不完整（找不到 $NEW_PKG/server/server.js）"
say "① 新包：$NEW_PKG"

say "② 备份（先备份再动，A.2 第 6 条）"
BK="$APP_DIR/server/backups/pre-update-$(date +%Y%m%d-%H%M%S)"
( cd "$APP_DIR/server" && node scripts/backup.mjs --out "$BK" ) || die "备份失败 ⇒ **中止本次更新**（不要继续）"
ls -1 "$BK" | head -5
echo "  备份就位：$BK"

say "③ 停服"
systemctl stop "$SVC_NAME" || true

say "④ 替换代码（保留 data.db / uploads / backups）"
rsync -a --delete \
  --exclude 'node_modules' --exclude 'data.db*' --exclude 'uploads/' --exclude 'backups/' --exclude '.browsers' --exclude 'test/' \
  "$NEW_PKG/docs/" "$APP_DIR/docs/"
rsync -a --delete \
  --exclude 'node_modules' --exclude 'data.db*' --exclude 'uploads/' --exclude 'backups/' --exclude '.browsers' \
  "$NEW_PKG/server/" "$APP_DIR/server/"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
echo "  docs/ 与 server/ 已替换"

say "⑤ 依赖"
( cd "$APP_DIR/server" && npm ci --omit=dev ) || die "依赖安装失败（服务仍处于停止状态；修好后 systemctl start $SVC_NAME）"

say "⑥ 起服"
systemctl start "$SVC_NAME"
sleep 2

say "⑦ 冒烟"
if ( cd "$APP_DIR" && node deploy/smoke.mjs ); then
  echo "  ✅ 更新完成"
else
  cat <<EOF
  ⛔ 冒烟未通过。回滚（代码回滚，**库不回滚**）：
     systemctl stop $SVC_NAME
     rsync -a --delete --exclude 'node_modules' --exclude 'data.db*' --exclude 'uploads/' --exclude 'backups/' \\
       <上一版解包目录>/docs/ $APP_DIR/docs/
     rsync -a --delete --exclude 'node_modules' --exclude 'data.db*' --exclude 'uploads/' --exclude 'backups/' \\
       <上一版解包目录>/server/ $APP_DIR/server/
     systemctl start $SVC_NAME
     仍需修库时：停服 → 用 $BK/data.db 覆盖（并删同目录 data.db-wal / data.db-shm）→ 起服
  另：`git checkout <上一个可用 tag> -- docs/ server/` 亦可（见 A.2.1；**不要再跑 bump-version.mjs**）
EOF
  exit 1
fi
