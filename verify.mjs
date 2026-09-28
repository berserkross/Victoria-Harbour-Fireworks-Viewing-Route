#!/usr/bin/env node
/** 线上验收：检查页面引用的每个资源在 GitHub Pages 上是否都返回 200。 */
const BASE = 'https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/';

const html = await (await fetch(BASE)).text();
const refs = [...html.matchAll(/(?:src|href|poster)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !/^(https?:|mailto:|#)/.test(u))
  .filter((u, i, a) => a.indexOf(u) === i);

console.log(`页面引用本地资源 ${refs.length} 个，逐个检查…\n`);

let ok = 0;
const bad = [];
for (const rel of refs) {
  const url = new URL(rel, BASE).href;
  try {
    const r = await fetch(url, { method: 'GET' });
    const n = Number(r.headers.get('content-length') || 0);
    const ct = r.headers.get('content-type') || '';
    if (r.status === 200) {
      ok += 1;
      console.log(`  200  ${String(n).padStart(9)}  ${ct.split(';')[0].padEnd(24)}  ${rel}`);
    } else {
      bad.push(rel);
      console.log(`  ${r.status}  ${''.padStart(9)}  ${''.padEnd(24)}  ${rel}`);
    }
  } catch (e) {
    bad.push(rel);
    console.log(`  ERR  ${e.message}  ${rel}`);
  }
}

console.log(`\n结果：${ok}/${refs.length} 正常${bad.length ? '，失败：' + bad.join(', ') : ''}`);

// 顺便确认几处内容特征
console.log('\n页面内容抽查：');
for (const [label, re] of [
  ['太平山步骤（城巴 15 路）', /城巴 15 路/],
  ['宝马山步骤（金督馳馬徑）', /金督馳馬徑/],
  ['支付方式（微信乘车码）', /pay-wechat-ridecode/],
  ['八达通章节', /八达通/],
  ['检查清单', /data-check=/],
  ['出品方署名', /海洋影像厂/],
  ['路线一购票链接', /s\.klook\.cn/],
]) {
  console.log(`  ${re.test(html) ? '✓' : '✗'} ${label}`);
}
