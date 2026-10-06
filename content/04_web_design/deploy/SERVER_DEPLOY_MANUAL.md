---
title: "服务器部署操作手册（支书版）"
type: design
role: "[支书]+[运维执行人]"
created: 2026-10-07
last_updated: 2026-10-07
status: active
related_files: [deploy/package.mjs, deploy/install.sh, deploy/doctor.mjs, deploy/smoke.mjs, content/04_web_design/deploy/DEPLOYMENT_GUIDE.md]
---

# 服务器部署操作手册（支书版）

> **这是一份照着做的手册**：从登录堡垒机到同学们能在浏览器里用上系统，共六步，每步都写清「在哪做、点什么、敲什么、看到什么算成功」。**不需要懂 Linux**——每个术语第一次出现都有一句大白话解释。
>
> **对象环境（2026-10-07 已确认）**：服务器 `162.105.205.166`（8核16G，龙蜥系统）· 服务器账号 `S162105205166` · 堡垒机 `https://bl.pku.edu.cn/` · 管理入口 `https://sec.pku.edu.cn/`（防火墙）。**起步形态：空库真用**（首启自动建 1 个党委账号＋空支部，名册等全部在页面里建，绝不手工改文件）。
>
> **深度细节**（为什么这么设计、回滚、日志轮转等）见权威总指南 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)——本手册只负责「做」。

---

## 名词卡片（第一次出现的词，各一句大白话）

| 词 | 大白话 |
| --- | --- |
| **堡垒机** | 学校给的「带锁的走廊」——想碰服务器必须先进它，谁在什么时候做了什么都被记录，出事能查。 |
| **sudo** | 「用一下 root 权力」的口令动作。服务器上有两类身份：普通账号（只能动自己文件夹）和 root（超级管理员，能装软件、开机自启）。普通账号在命令前加 `sudo`，输自己的密码，就能以 root 身份执行这一条命令。**我们的安装脚本需要它**（要建常驻服务）；没有也不怕，本手册有不需要 sudo 的等价路线。 |
| **防火墙策略** | 学校托管网段默认「进出全封」。要开两扇小门：一扇让别人进得来（访问 3000 端口＝看网页），一扇让服务器出得去（下载安装件）。在 `https://sec.pku.edu.cn/` 网页上申请。 |
| **systemd 服务** | 让程序「常驻」的管家：开机自动拉起、程序崩了 3 秒内自动重启，不需要人守着。 |
| **SFTP 上传** | 堡垒机网页里把文件从你电脑拖到服务器的功能（相当于网页版文件快递）。 |
| **冒烟探针** | 装完后的自动体检：程序真的活着、页面真的打得开。 |

---

## 第 0 步 · 拿到发布包（在开发电脑上，已完成）

发布包由开发侧用 `node deploy/package.mjs` 生成，位于开发电脑的 `dist/` 文件夹：

- `gsm1921-sop-v0.1.0-<日期>.tar.gz`（约 4MB；**不含任何成员名单**——打包器有机检，姓名/学号口令 0 泄露才允许出包）
- 同名 `.sha256`（校验码，上传后核对用：`sha256sum 包名` 对得上＝传输没坏）

**如果是你自己打包**：在仓库根跑 `node deploy/package.mjs` 即可（需要装过 Node ≥ 22 的开发环境）。

---

## 第 1 步 · 探机（在堡垒机里开服务器终端，5 分钟）

1. 校外先连 VPN（`https://its.pku.edu.cn/service_1_vpn2.jsp`）；校园网内直接下一步。
2. 浏览器打开 `https://bl.pku.edu.cn/`，用堡垒机账号登录（账号密码见学校开通邮件；**手册不记录任何密码**）。
3. 在堡垒机里选择目标服务器 `162.105.205.166`，开一个 **Web 终端**（网页版命令行）。
4. **逐条**粘贴下面 4 条命令（每条回车后看一行输出即可，全部只读、不改任何东西）：

```bash
cat /etc/os-release | head -2      # 看：PRETTY_NAME=… Anolis …（确认是龙蜥）
node -v 2>/dev/null || echo 无node  # 看：有版本号吗？需要 ≥ 22（v22.x.x）
sudo -n true 2>/dev/null && echo 有sudo || echo 需密码或无sudo   # sudo -v 实测更准
curl -m 5 -sI https://registry.npmjs.org >/dev/null && echo 出网通 || echo 出网不通
```

5. 把四行输出记下来（拍照即可）——第 4 步选路线、第 2 步防火墙要不要「出方向」都取决于它：
   - `无node` 或版本 < 22 → 第 4 步先装 Node（手册已备命令）；
   - `出网不通` → 第 2 步防火墙申请**必须加出方向 443**；若最终批不下来，联系开发侧走「离线包」预案；
   - `有sudo` / `需密码` → 走 **A 路线（推荐）**；确认无 sudo → 走 **B 路线**。

---

## 第 2 步 · 防火墙申请（在 sec.pku.edu.cn，网页点选）

登录 `https://sec.pku.edu.cn/` → 左侧「安全服务」→「防火墙策略开通」，按需填写提交。**建议一次提两条**：

| 栏目 | 第 1 条（必须） | 第 2 条（安装期需要） |
| --- | --- | --- |
| 用途 | 党支部管理系统 Web 服务访问 | 服务器安装依赖（npm/nodejs.org 下载） |
| 方向 | 入 | 出 |
| 协议/端口 | TCP / 3000 | TCP / 443 |
| 源地址 | 校园网网段（按科里老师给的校园网段填；不确定就先问吴老师 62753007） | registry.npmjs.org、nodejs.org |
| 目的地址 | 162.105.205.166 | 互联网 |

> 提交后等审核通过（一般有短信/邮件通知）。**第 1 条没批之前，别人打不开网页；第 2 条没批，第 4 步的依赖装不上**。

---

## 第 3 步 · 上传发布包（堡垒机 SFTP）

1. 在堡垒机里对该服务器开 **文件传输 / SFTP** 会话；
2. 把开发电脑 `dist/` 里的 `gsm1921-sop-v0.1.0-<日期>.tar.gz` 上传到服务器你的家目录（`/home/S162105205166/`）；
3. 回到 Web 终端，核对传输完整性（输出应与 `.sha256` 文件里那串完全一致）：

```bash
cd ~ && sha256sum gsm1921-sop-v0.1.0-*.tar.gz
```

---

## 第 4 步 · 安装（按探机结果选 A 或 B 路线）

### 4.0 若探机显示无 Node / 版本 < 22：先装 Node（两条路线都要）

```bash
cd ~ && curl -fLO https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz
sudo mkdir -p /opt/node && sudo tar -xJf node-v22.11.0-linux-x64.tar.xz -C /opt/node --strip-components=1
echo 'export PATH=/opt/node/bin:$PATH' >> ~/.bashrc && source ~/.bashrc
node -v     # 看到 v22.11.0 即成功
```

> 出网不通且防火墙出方向没批：让开发侧在本地下载同一文件随包一起 SFTP 上传，第一条 `curl` 换成 `mv ~/node-v22.11.0-linux-x64.tar.xz .` 即可。

### 4.A 路线（有 sudo · 推荐）：一键安装

```bash
cd ~ && mkdir -p gsm-tmp && tar -xzf gsm1921-sop-v0.1.0-*.tar.gz -C gsm-tmp
cd gsm-tmp && sudo bash deploy/install.sh
```

脚本会自动完成 7 件事并在屏幕上逐条打勾：预检 → 建服务账号/目录 → 装依赖 → 生成配置模板 → 装 systemd 常驻服务 → 装每日 03:30 自动备份 → 冒烟。**它故意不替你设口令**——配置文件里口令留空时系统拒绝启动，这是安全设计（防止「裸奔上线」）。

### 4.B 路线（无 sudo · 等价降级）

```bash
cd ~ && mkdir -p gsm-tmp && tar -xzf gsm1921-sop-v0.1.0-*.tar.gz -C gsm-tmp
mkdir -p ~/gsm1921 && cp -a gsm-tmp/. ~/gsm1921/
cd ~/gsm1921/server && npm ci --omit=dev
cat > ~/gsm1921.env <<EOF
APP_ENV=production
PORT=3000
LOGIN_PASSWORD=
DB_PATH=$HOME/gsm1921/server/data.db
UPLOAD_DIR=$HOME/gsm1921/server/uploads
SEED_FALLBACK=0
EOF
mkdir -p ~/.config/systemd/user && cat > ~/.config/systemd/user/gsm1921.service <<EOF
[Unit]
Description=光华党支部管理引擎
[Service]
WorkingDirectory=$HOME/gsm1921/server
EnvironmentFile=$HOME/gsm1921.env
ExecStart=/usr/bin/env node server.js
Restart=always
RestartSec=3
[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload && systemctl --user enable --now gsm1921
# 每日备份（用户级 cron）：crontab -e 加一行（把 $HOME 换成实际路径）：
# 30 3 * * * cd $HOME/gsm1921/server && node scripts/backup.mjs --out $HOME/gsm1921/server/backups
```

> B 路线注意：服务器若重启，用户级服务需 `loginctl enable-linger S162105205166`（找管理员一句话的事）才能自动拉起。

---

## 第 5 步 · 设口令、启动、体检（1 分钟）

1. 编辑配置文件（A 路线：`sudo vi /etc/gsm1921.env`；B 路线：`vi ~/gsm1921.env`），把 `LOGIN_PASSWORD=` 后面填上**全站登录口令**（同学们登录用的那个，想好再填，别用生日）；
2. 重启并看状态：

```bash
sudo systemctl restart gsm1921 && systemctl status gsm1921 | head -5   # A 路线
systemctl --user restart gsm1921 && systemctl --user status gsm1921   # B 路线
```

看到 `active (running)` 即常驻成功。3. 在**你自己的电脑**浏览器打开 `http://162.105.205.166:3000`——出现登录页＝防火墙第 1 条已生效、部署成功。

---

## 第 6 步 · 空库起步，数据全走页面（5 分钟）

1. 首次启动会自动建立**最小组织基线**：1 个党委账号＋空支部「光华管理学院本科生党支部」，**零成员名单**；
2. 用党委账号登录（初始账号规则见启动日志：`journalctl -u gsm1921 | grep 自检`〔A 路线〕或 `systemctl --user status gsm1921` 的输出〔B 路线〕；也可在配置里用 `BASELINE_PARTY_STAFF_ID` 指定学号）；
3. 之后一律在**页面**里完成：支部管理 → 导入成员名册 → 建组织架构 → 指定支委/组长 → 开始使用。**任何时候都不要手工改服务器上的数据库文件**。

---

## 日常三招（运维速查）

| 想做什么 | A 路线（sudo） | B 路线（用户级） |
| --- | --- | --- |
| 看运行日志 | `journalctl -u gsm1921 -n 50` | `journalctl --user -u gsm1921 -n 50` |
| 重启服务 | `sudo systemctl restart gsm1921` | `systemctl --user restart gsm1921` |
| 备份在哪 | `server/backups/`（每日 03:30 自动，留 14 份） | 同左（cron 已装则同效） |

**换新版本**：开发侧重新打包 → 上传 → `bash deploy/update.sh <新包解包目录>`（数据/备份不覆盖）。

## 出错对照表

| 症状 | 先查 |
| --- | --- |
| 浏览器打不开页面 | 防火墙第 1 条批了没（sec 网站查进度）；`systemctl status gsm1921` 是否 running |
| 安装时依赖装不上 | 出方向 443 批了没；`curl -m5 -sI https://registry.npmjs.org` 通不通 |
| 服务起不来 | `journalctl -u gsm1921 -n 50`：多半是 `LOGIN_PASSWORD` 没填（拒绝启动是故意的） |
| 上传后校验码对不上 | 重新上传一次（SFTP 偶发断流） |

## 安全两件事

1. **改堡垒机密码**：任何在聊天/邮件里出现过的密码都应视为「见过光的」，部署完成后到堡垒机个人设置里改一次；
2. **口令只进配置文件**：`LOGIN_PASSWORD` 只写在服务器的 env 文件里（该文件权限 600，仅 root 可读），不进代码、不进聊天、不进本仓库。
