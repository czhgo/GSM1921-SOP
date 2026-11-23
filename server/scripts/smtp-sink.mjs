// server/scripts/smtp-sink.mjs —— 本地最小 SMTP 收信端（仅演练用，不参与生产）
// 用途：批次 607 `L-02`/`SMTP` 外部门演练——让真实 `services/mailer.js`（nodemailer）
//   走一次完整 SMTP 会话（EHLO / AUTH LOGIN / MAIL / RCPT / DATA），把收到的邮件落盘。
// 边界：只在 127.0.0.1 监听；口令由调用方传入；不实现 STARTTLS / 队列 / 转发。
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {{ user?: string, pass?: string, outDir?: string, port?: number }} [opts]
 * @returns {Promise<{ port:number, messages:{from:string,to:string[],raw:string}[], close:()=>Promise<void> }>}
 */
export function startSink(opts = {}) {
  const user = opts.user ?? 'ci';
  const pass = opts.pass ?? 'ci-pass';
  const outDir = opts.outDir ?? path.join(process.cwd(), '.tmp', 'smtp-sink');
  fs.mkdirSync(outDir, { recursive: true });
  const messages = [];

  const server = net.createServer((socket) => {
    let buffer = '';
    let inData = false;
    let authStage = null;
    let authUser = '';
    let awaiting = null;
    let envelope = { from: '', to: [], raw: '' };
    const write = (line) => socket.write(`${line}\r\n`);

    write('220 smtp-sink ready');
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index;
      while ((index = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            const message = { ...envelope };
            messages.push(message);
            fs.writeFileSync(path.join(outDir, `mail-${Date.now()}-${messages.length}.eml`), message.raw);
            envelope = { from: '', to: [], raw: '' };
            write('250 OK queued');
          } else {
            envelope.raw += `${line === '..' ? '.' : line}\r\n`;
          }
          continue;
        }
        if (authStage === 'user') {
          authUser = Buffer.from(line, 'base64').toString('utf8');
          authStage = 'pass';
          write('334 UGFzc3dvcmQ6');
          continue;
        }
        if (authStage === 'pass') {
          const given = Buffer.from(line, 'base64').toString('utf8');
          authStage = null;
          awaiting = null;
          if (authUser === user && given === pass) write('235 Authentication successful');
          else write('535 Authentication failed');
          continue;
        }
        const upper = line.toUpperCase();
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          write('250-smtp-sink');
          write('250 AUTH LOGIN');
        } else if (upper.startsWith('AUTH LOGIN')) {
          authStage = 'user';
          write('334 VXNlcm5hbWU6');
        } else if (upper.startsWith('MAIL FROM')) {
          envelope.from = line.replace(/^MAIL FROM:\s*/i, '').replace(/[<>]/g, '');
          write('250 OK');
        } else if (upper.startsWith('RCPT TO')) {
          envelope.to.push(line.replace(/^RCPT TO:\s*/i, '').replace(/[<>]/g, ''));
          write('250 OK');
        } else if (upper === 'DATA') {
          inData = true;
          write('354 End data with <CR><LF>.<CR><LF>');
        } else if (upper === 'QUIT') {
          write('221 Bye');
          socket.end();
        } else if (upper === 'RSET' || upper === 'NOOP') {
          write('250 OK');
        } else if (!awaiting) {
          write('502 Command not implemented');
        }
      }
    });
    socket.on('error', () => {});
  });

  return new Promise((resolve) => {
    server.listen(opts.port ?? 0, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        messages,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

if (process.argv[1] && process.argv[1].endsWith('smtp-sink.mjs')) {
  const sink = await startSink({ port: Number(process.env.SINK_PORT || 0) });
  console.log(`[smtp-sink] listening 127.0.0.1:${sink.port}`);
}
