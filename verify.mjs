#!/usr/bin/env node
/**
 * verify.mjs — 线上验收
 *
 * 上传【后】运行：把本地 index.html 与线上逐字节比对，并抽查关键内容与资源，
 * 用来确认「线上真的就是最新版」，以及有没有被缓存卡住。
 *
 * 用法：node verify.mjs
 *
 * 与 check.mjs 的分工：
 *   check.mjs   上传【前】体检本地产物（锚点、标签、资源、体积）
 *   verify.mjs  上传【后】核对线上与本地是否一致
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const OWNER = 'berserkross';
const REPO = 'Victoria-Harbour-Fireworks-Viewing-Route';
const BASE = `https://${OWNER.toLowerCase()}.github.io/${REPO}/`;
const sha = (s) => createHash('sha256').update(s).digest('hex').toUpperCase();

if (!existsSync('index.html')) {
  console.error('x 找不到 index.html，请在 _build_site 目录下运行。');
  process.exit(1);
}

const local = readFileSync('index.html', 'utf8');
const localSha = sha(local);
console.log(`本地 index.html : ${localSha}  (${Buffer.byteLength(local)} B)`);

let live = '';
let liveSha = '';
let waited = 0;
for (let i = 0; i < 24; i += 1) {
  live = await (await fetch(BASE + '?cb=' + Date.now(), { cache: 'no-store' })).text();
  liveSha = sha(live);
  if (liveSha === localSha) break;
  waited += 10;
  process.stdout.write(`  等待 Pages 构建… ${waited}s\r`);
  await new Promise((res) => setTimeout(res, 10000));
}
process.stdout.write(' '.repeat(40) + '\r');

console.log(`线上 index.html : ${liveSha}  (${Buffer.byteLength(live)} B)`);
if (liveSha === localSha) {
  console.log(`OK 一致 —— 线上就是最新版${waited ? `（等了 ${waited}s）` : ''}`);
} else {
  console.log(`x 等了 ${waited}s 仍不一致`);
  const n = Math.min(local.length, live.length);
  let i = 0;
  while (i < n && local[i] === live[i]) i += 1;
  console.log(`  第一处差异在第 ${i} 个字符`);
  console.log(`  本地: ${JSON.stringify(local.slice(Math.max(0, i - 40), i + 60))}`);
  console.log(`  线上: ${JSON.stringify(live.slice(Math.max(0, i - 40), i + 60))}`);
}

console.log('\n内容抽查：');
for (const [label, needle] of [
  ['烟花背景图', 'bg-fireworks'],
  ['黄色提示块变量', '--warn'],
  ['页脚花体彩蛋', 'Click here!'],
  ['彩蛋联系方式', 'cuhk.edu.cn'],
  ['社群二维码', '扫码加入群聊'],
  ['烟花交互脚本', 'fireworks.js'],
]) {
  console.log(`  ${live.includes(needle) ? 'ok  ' : 'MISS'}  ${label}`);
}

const refs = [...live.matchAll(/(?:src|href|poster)="([^"]+)"/g)]
  .map((m) => m[1].split('?')[0])
  .filter((u) => u && !/^(https?:|mailto:|#)/.test(u));
const uniq = [...new Set(refs)];
let ok = 0;
const bad = [];
for (const rel of uniq) {
  const r = await fetch(new URL(rel, BASE).href, { method: 'GET' });
  if (r.status === 200) ok += 1;
  else bad.push(`${r.status}  ${rel}`);
}
console.log(`\n线上资源：${ok}/${uniq.length} 返回 200`);
bad.forEach((b) => console.log('  失败 ' + b));