#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  deploy/install.sh —— Linux 一键安装（在**解包后的仓库根**执行）
#
#    sudo bash deploy/install.sh
#
#  它把《部署与对外对接》附录 A.2 里那串手工步骤变成一条命令：
#    ① 预检（node 版本 / 端口 / 目录可写）→ ② 建服务账号与数据目录
#    → ③ 装依赖（npm ci --omit=dev）→ ④ 写生产环境变量文件（已存在则**不动**）
#    → ⑤ 装 systemd 单元并开机自启 → ⑥ 装每日备份 cron → ⑦ 冒烟（health）
#
#  ⚠ **诚实声明（2026-09-29 批次 269）**：本脚本**未在真机执行过**——本批只做了
#    静态审读与逐条对齐 `DEPLOYMENT_GUIDE` 附录 A.2 / A.2.2。**第一次务必在测试机上跑**，
#    并逐条核对输出；装完后按 A.2 第 1 / 5 条确认「库内只有真人」「口令已换」。
#  ⚠ 生产形态三硬约束由 `server/server.js` 自己把关（未设 LOGIN_PASSWORD 即拒启动）；
#    本脚本只负责把变量写进 `/etc/gsm1921.env`，**口令默认留空**、需你手填。
# ════════════════════════════════════════════════════════════════
set -euo pipefail

APP_USER="${APP_USER:-gsm1921}"
APP_DIR="${APP_DIR:-/opt/gsm1921}"
ENV_FILE="${ENV_FILE:-/etc/gsm1921.env}"
SVC_NAME="${SVC_NAME:-gsm1921}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\033[31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

say "① 预检"
command -v node >/dev/null || die "未找到 node（要求 ≥ 22，见 DEPLOYMENT_GUIDE §2.1）"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || die "Node 版本过低：$(node -v)（better-sqlite3@12 要求 20.x/22.x+，实测 18 不可用）"
command -v npm >/dev/null || die "未找到 npm"
[ -f "$HERE/server/server.js" ] || die "未在仓库根执行（找不到 server/server.js）——请先解包，再 cd 到仓库根"
echo "  node $(node -v) · npm $(npm -v) · 仓库根 $HERE"

say "② 服务账号与目录"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER" || die "建账号失败（需要 root）"
  echo "  已建系统账号 $APP_USER"
else
  echo "  账号 $APP_USER 已存在，复用"
fi
mkdir -p "$APP_DIR" "$APP_DIR/server/uploads" "$APP_DIR/server/backups"
rsync -a --delete --exclude 'node_modules' --exclude 'data.db*' --exclude 'uploads/' --exclude '.browsers' "$HERE"/ "$APP_DIR"/ 2>/dev/null \
  || cp -a "$HERE"/. "$APP_DIR"/
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
echo "  代码就位：$APP_DIR（**未覆盖** data.db / uploads / backups）"

say "③ 依赖安装（npm ci --omit=dev）"
( cd "$APP_DIR/server" && npm ci --omit=dev ) || die "依赖安装失败（目标机需可访问 npm 源；无外网请用 --with-deps 打的包）"
echo "  依赖就位"

say "④ 生产环境变量（$ENV_FILE）"
if [ -f "$ENV_FILE" ]; then
  echo "  已存在，**不改**（避免覆盖你填过的口令）"
else
  cat > "$ENV_FILE" <<EOF
# 光华党支部管理引擎 · 生产环境（由 deploy/install.sh 生成）
# ⚠ 必改：LOGIN_PASSWORD（全站账号共用口令；**生产未设 ⇒ 启动即拒**）
APP_ENV=production
PORT=3000
LOGIN_PASSWORD=            # ← 改成强口令后再启动
DB_PATH=$APP_DIR/server/data.db
UPLOAD_DIR=$APP_DIR/server/uploads
SEED_FALLBACK=0            # 关断前端三域演示回退
EOF
  chmod 600 "$ENV_FILE"
  echo "  已生成模板（**口令留空** ⇒ 现在启动会被 server.js 拒绝，这是故意的）"
fi

say "⑤ systemd 单元"
cat > "/etc/systemd/system/${SVC_NAME}.service" <<EOF
[Unit]
Description=光华党支部管理引擎（Node + better-sqlite3）
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/server
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/env node server.js
Restart=always
RestartSec=3
# SIGTERM（systemd 默认停止信号）会走 server.js 的优雅关闭：停接新连接 → 等在途 ≤5s → 关库
KillSignal=SIGTERM
TimeoutStopSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now "${SVC_NAME}" || die "启动失败：journalctl -u ${SVC_NAME} -n 50"
echo "  已 enable --now：${SVC_NAME}"

say "⑥ 每日备份（cron）"
cat > "/etc/cron.d/${SVC_NAME}-backup" <<EOF
# 每日 03:30 备份（库走 SQLite 在线快照 db.backup()，含 WAL；含 uploads/）；保留最近 14 份
30 3 * * * ${APP_USER} cd ${APP_DIR}/server && /usr/bin/env node scripts/backup.mjs --out ${APP_DIR}/server/backups >> ${APP_DIR}/server/backups/backup.log 2>&1
EOF
chmod 644 "/etc/cron.d/${SVC_NAME}-backup"
echo "  已装 /etc/cron.d/${SVC_NAME}-backup（⚠ 记得核对日志轮转与磁盘）"

say "⑦ 冒烟"
if node "$APP_DIR/deploy/smoke.mjs" 2>/dev/null || ( cd "$APP_DIR" && node deploy/smoke.mjs ); then
  echo "  存活探针通过"
else
  echo "  ⚠ 冒烟未通过——多半是 LOGIN_PASSWORD 尚未填（server.js 拒绝启动）。填好后：systemctl restart ${SVC_NAME}"
fi

cat <<EOF

════════════════════════════════════════════════════════════════
✅ 安装流程结束。**接下来必须人工做的三件事**（A.2 第 1 / 5 / 10 条）：

 1. **填口令**：编辑 $ENV_FILE 的 LOGIN_PASSWORD，然后 systemctl restart ${SVC_NAME}
 2. **确认库内只有真人**：journalctl -u ${SVC_NAME} | grep 自检
    （应看到「演示种子账号=0」；>0 说明库是从演示库来的，按 A.2 第 1 条用空库起步）
 3. **接反代**：按 deploy/nginx.sample.conf 起 nginx（⚠ 其中
    `location = /src/config/deploy.js` 必须**单独放行到 Node**，否则「关于」门面与部署形态判定会错）

 更新（以后每次换版本）：bash deploy/update.sh <新包解包目录>
 排错：journalctl -u ${SVC_NAME} -f
════════════════════════════════════════════════════════════════
EOF
