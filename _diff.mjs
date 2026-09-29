/** 一次性比对本地与线上 index.html，并打印第一处差异。 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const BASE = 'https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/';
const sha = (s) => createHash('sha256').update(s).digest('hex').toUpperCase();

const localHtml = readFileSync('index.html', 'utf8');
const liveHtml = await (await fetch(BASE + '?cb=' + Date.now(), { cache: 'no-store' })).text();

console.log('本地 sha:', sha(localHtml), ' 字节:', Buffer.byteLength(localHtml));
console.log('线上 sha:', sha(liveHtml), ' 字节:', Buffer.byteLength(liveHtml));

if (sha(localHtml) === sha(liveHtml)) {
  console.log('✓ 完全一致');
} else {
  const n = Math.min(localHtml.length, liveHtml.length);
  let i = 0;
  while (i < n && localHtml[i] === liveHtml[i]) i += 1;
  console.log('\n第一处差异在字符', i, '/', n);
  console.log('  本地:', JSON.stringify(localHtml.slice(Math.max(0, i - 50), i + 60)));
  console.log('  线上:', JSON.stringify(liveHtml.slice(Math.max(0, i - 50), i + 60)));
  const cr = (s) => (s.match(/\r\n/g) || []).length;
  console.log('\n  CRLF 数  本地:', cr(localHtml), ' 线上:', cr(liveHtml));
  const norm = (s) => s.replace(/\r\n/g, '\n');
  console.log('  忽略换行后:', norm(localHtml) === norm(liveHtml) ? '一致（仅换行差异）' : '仍不同（内容确已变化）');
  console.log('  本地长度差:', localHtml.length - liveHtml.length);
}

console.log('\n关键标记：');
for (const k of ['hero__bg', 'hero__wordmark', 'hero__cloud', 'hero__cover', 'class="stats"', 'class="outro"']) {
  console.log(`  ${k.padEnd(28)} 本地 ${localHtml.includes(k) ? '有' : '无'}   线上 ${liveHtml.includes(k) ? '有' : '无'}`);
}

/* 列出所有 callout，用于人工过一遍语气 */
console.log('\n全部提示框文案：');
[...localHtml.matchAll(/<aside class="callout">([\s\S]*?)<\/aside>/g)].forEach((m, i) => {
  const t = m[1].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  console.log(`  ${String(i + 1).padStart(2)}. ${t}`);
});

/* 线上资源逐个 HEAD 检查 */
console.log('\n线上资源检查：');
const refs = [...localHtml.matchAll(/(?:src|srcset|href|poster)="([^"]+)"/g)]
  .flatMap((m) => m[1].split(','))
  .map((u) => u.trim().replace(/\s+\d+w$/, ''))
  .filter((u) => u && !/^(https?:|mailto:|#)/.test(u));
const uniq = [...new Set(refs)];
let ok = 0;
const bad = [];
for (const rel of uniq) {
  const r = await fetch(new URL(rel, BASE).href, { method: 'GET' });
  if (r.status === 200) ok += 1; else bad.push(`${r.status} ${rel}`);
}
console.log(`  ${ok}/${uniq.length} 返回 200`);
bad.forEach((b) => console.log('  失败 ' + b));

