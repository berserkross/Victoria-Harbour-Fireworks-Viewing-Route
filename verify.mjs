#!/usr/bin/env node
/**
 * verify.mjs - 线上验收
 *
 * 上传【后】运行：把本地 index.html 与线上逐字节比对，并抽查关键内容与资源，
 * 用来确认「线上真的就是最新版」。
 *
 * 用法：
 *   node verify.mjs              先查一次；不一致才轮询等待 Pages 构建
 *   node verify.mjs --no-wait    只查一次，立刻返回
 *   node verify.mjs --full       额外逐个探活页面引用的全部资源（较慢）
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
const args = new Set(process.argv.slice(2));

if (!existsSync('index.html')) {
  console.error('x 找不到 index.html，请在 _build_site 目录下运行。');
  process.exit(1);
}

/* 带超时的 fetch，避免网络抽风时整个脚本卡死 */
async function get(url, ms = 15000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { cache: 'no-store', signal: ac.signal });
    return r;
  } finally {
    clearTimeout(t);
  }
}

const local = readFileSync('index.html', 'utf8');
const localSha = sha(local);
console.log(`本地 index.html : ${localSha}  (${Buffer.byteLength(local)} B)`);

let live = '';
let liveSha = '';
let tries = 0;
const maxTries = args.has('--no-wait') ? 1 : 12;   // 最多约 2 分钟

for (let i = 0; i < maxTries; i += 1) {
  try {
    live = await (await get(BASE + '?cb=' + Date.now())).text();
    liveSha = sha(live);
    if (liveSha === localSha) break;
  } catch (e) {
    console.log(`  第 ${i + 1} 次请求失败：${e.name === 'AbortError' ? '超时' : e.message}`);
  }
  tries += 1;
  if (i < maxTries - 1) {
    process.stdout.write(`  还没更新，10s 后重试… (${i + 1}/${maxTries})\r`);
    await new Promise((r) => setTimeout(r, 10000));
  }
}
process.stdout.write(' '.repeat(44) + '\r');

console.log(`线上 index.html : ${liveSha}  (${Buffer.byteLength(live)} B)`);
if (liveSha === localSha) {
  console.log(`OK 一致 - 线上就是最新版${tries ? `（等了约 ${tries * 10}s）` : ''}`);
} else if (!liveSha) {
  console.log('x 拿不到线上页面，检查网络或 Pages 是否正常。');
} else {
  console.log(`x 不等了，当前不一致（已重试 ${tries} 次）`);
  const n = Math.min(local.length, live.length);
  let i = 0;
  while (i < n && local[i] === live[i]) i += 1;
  console.log(`  第一处差异在第 ${i} 个字符`);
  console.log(`  本地: ${JSON.stringify(local.slice(Math.max(0, i - 40), i + 60))}`);
  console.log(`  线上: ${JSON.stringify(live.slice(Math.max(0, i - 40), i + 60))}`);
  console.log('  提示：index.html 自身有 10 分钟缓存，浏览器端按 Ctrl+Shift+R 强制刷新。');
}

/* 有些标记在 CSS 里而不是 HTML 里，所以把首页引用的 CSS 一并抓下来查 */
let cssText = '';
try {
  const cssLinks = [...live.matchAll(/href="(assets\/css\/[^"]+)"/g)].map((m) => m[1]);
  for (const l of cssLinks) {
    cssText += await (await get(new URL(l, BASE).href, 12000)).text();
  }
} catch { /* 抓不到就只查 HTML */ }
const hay = live + '\n' + cssText;

console.log('\n内容抽查：');
for (const [label, needle] of [
  ['烟花背景图', 'bg-fireworks'],
  ['黄色提示块变量', '--warn'],
  ['页脚花体彩蛋', 'Click here!'],
  ['彩蛋联系方式', 'cuhk.edu.cn'],
  ['社群二维码', '扫码加入群聊'],
  ['烟花交互脚本', 'fireworks.js'],
  ['CSS 缓存哈希', '.css?v='],
]) {
  console.log(`  ${hay.includes(needle) ? 'ok  ' : 'MISS'}  ${label}`);
}

/* 默认只探活几张关键图，避免请求过多拖慢 */
const refs = [...live.matchAll(/(?:src|href|poster)="([^"]+)"/g)]
  .map((m) => m[1].split('?')[0])
  .filter((u) => u && !/^(https?:|mailto:|#)/.test(u));
const uniq = [...new Set(refs)];
const sample = args.has('--full')
  ? uniq
  : uniq.filter((u) => /logo|group-qr|egg-|bg-fireworks|base\.css|fireworks\.js/.test(u)).slice(0, 8);

console.log(`\n线上资源探活（${args.has('--full') ? '全部' : '关键'} ${sample.length} / 共 ${uniq.length}）：`);
let ok = 0;
const bad = [];
for (const rel of sample) {
  try {
    const r = await get(new URL(rel, BASE).href, 12000);
    if (r.status === 200) ok += 1; else bad.push(`${r.status}  ${rel}`);
  } catch (e) {
    bad.push(`${e.name === 'AbortError' ? '超时' : e.message}  ${rel}`);
  }
}
console.log(`  ${ok}/${sample.length} 返回 200`);
bad.forEach((b) => console.log('  失败 ' + b));