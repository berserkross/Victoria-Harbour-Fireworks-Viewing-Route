#!/usr/bin/env node
/**
 * check.mjs —— 上传前的网页体检
 *
 * 用法（在 _build_site 目录下）：node check.mjs
 *
 * 检查：
 *   1. index.html 标签是否配平
 *   2. 目录里的 #锚点 是否都有对应 id（防止死链——手改 HTML 最容易踩的坑）
 *   3. 是否有重复 id
 *   4. 引用的本地资源是否都存在
 *   5. 体积是否超预算（含 GitHub 单文件 100 MB 硬上限）
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HTML = 'index.html';
if (!existsSync(HTML)) {
  console.error('✗ 找不到 index.html，请在 _build_site 目录下运行。');
  process.exit(1);
}
const html = readFileSync(HTML, 'utf8');
let problems = 0;
const fail = (m) => { problems += 1; console.log('  ✗ ' + m); };
const pass = (m) => console.log('  ✓ ' + m);
const mb = (n) => (n / 1048576).toFixed(2) + ' MB';

/* 1. 标签配平 */
console.log('\n[1] 标签配平');
const VOID = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'source', 'area',
                      'base', 'col', 'embed', 'param', 'track', 'wbr']);
const stack = [];
const mismatch = [];
for (const t of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*?(\/?)>/g)) {
  const name = t[1].toLowerCase();
  if (VOID.has(name) || t[2] === '/') continue;
  if (t[0].startsWith('</')) {
    if (!stack.length) mismatch.push(`多余的 </${name}>`);
    else if (stack.at(-1) !== name) { mismatch.push(`</${name}> 与 <${stack.at(-1)}> 不匹配`); stack.pop(); }
    else stack.pop();
  } else stack.push(name);
}
if (mismatch.length || stack.length) {
  mismatch.slice(0, 8).forEach(fail);
  if (stack.length) fail('未闭合: ' + stack.join(', '));
} else pass('全部配平');

/* 2. 锚点死链 —— 手改 HTML 最常见的事故 */
console.log('\n[2] 锚点链接');
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const hrefs = [...new Set([...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))];
const dead = hrefs.filter((h) => !ids.has(h));
if (dead.length) {
  dead.forEach((d) => {
    fail(`#${d} 找不到对应 id —— 点了不会跳转`);
    const near = [...ids].filter((i) => i.includes(d.slice(0, 2))).slice(0, 4);
    if (near.length) console.log('      页面上相近的 id: ' + near.map((n) => '#' + n).join('  '));
  });
} else pass(`${hrefs.length} 个锚点全部有效`);

/* 3. 重复 id */
console.log('\n[3] id 唯一性');
const allIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dup = [...new Set(allIds.filter((v, i) => allIds.indexOf(v) !== i))];
if (dup.length) dup.forEach((d) => fail(`id="${d}" 出现多次，锚点会跳错位置`));
else pass('无重复 id');

/* 4. 本地资源 */
console.log('\n[4] 本地资源');
const refs = [...html.matchAll(/(?:src|srcset|href|poster)="([^"]+)"/g)]
  .flatMap((m) => m[1].split(','))
  .map((u) => u.trim().replace(/\s+\d+w$/, ''))
  .map((u) => u.split('?')[0].split('#')[0])          // 去掉 ?v= 缓存串与锚点
  .filter((u) => u && !/^(https?:|mailto:|#|data:)/.test(u));
const uniq = [...new Set(refs)];
const missing = uniq.filter((r) => !existsSync(join('.', r.replace(/\//g, '\\'))));
if (missing.length) missing.forEach((m) => fail(`文件不存在: ${m}`));
else pass(`${uniq.length} 个资源全部存在`);

/* 5. 体积 */
console.log('\n[5] 体积');
const hs = statSync(HTML).size;
hs < 200 * 1024 ? pass(`index.html ${(hs / 1024).toFixed(1)} KB`) : fail(`index.html ${(hs / 1024).toFixed(1)} KB，偏大`);
let assets = 0;
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p); else assets += statSync(p).size;
  }
};
walk('assets');
console.log(`  · assets 合计 ${mb(assets)}`);
const vid = 'assets/video/route-to-peak-observatory.mp4';
if (existsSync(vid)) {
  const s = statSync(vid).size;
  s > 100 * 1024 * 1024
    ? fail(`${vid} ${mb(s)} —— 超过 GitHub 单文件 100 MB 硬上限！`)
    : pass(`视频 ${mb(s)}（限 100 MB）`);
}

console.log('\n' + '─'.repeat(48));
if (problems) {
  console.log(`发现 ${problems} 个问题，建议先修再上传。`);
  process.exit(1);
}
console.log('体检通过，可以上传。');
