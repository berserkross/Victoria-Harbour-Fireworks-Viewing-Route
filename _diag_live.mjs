/** 决定性验收：按页面里真实引用的带哈希链接去取 CSS，确认线上就是深色主题。 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const BASE = 'https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/';
const local = readFileSync('index.html', 'utf8');
const get = async (p) => (await fetch(BASE + p, { cache: 'no-store' })).text();

const live = await get('index.html?cb=' + Date.now());
console.log('本地 index.html sha:', createHash('sha256').update(local).digest('hex').slice(0, 16).toUpperCase());
console.log('线上 index.html sha:', createHash('sha256').update(live).digest('hex').slice(0, 16).toUpperCase());
console.log('');

/* 1. 页面里真实引用的 CSS/JS 链接 */
const links = [...live.matchAll(/(?:href|src)="(assets\/(?:css|js)\/[^"]+)"/g)].map((m) => m[1]);
console.log('页面引用的带版本资源：');
links.forEach((l) => console.log('  ' + l));

/* 2. 逐个按该链接取回，校验内容与本地一致 */
console.log('\n逐个校验（按线上页面的确切 URL 取回）：');
const { readdirSync } = await import('node:fs');
let allOk = true;
for (const link of links) {
  const [path, qs] = link.split('?');
  const localFile = readFileSync(path, 'utf8');
  const localHash = createHash('sha1').update(localFile).digest('hex').slice(0, 8);
  const remote = await get(link);
  const remoteHash = createHash('sha1').update(remote).digest('hex').slice(0, 8);
  const declared = (qs || '').replace('v=', '');
  const same = localHash === remoteHash;
  if (!same) allOk = false;
  console.log(`  ${same ? 'OK ' : 'BAD'}  ${link}`);
  console.log(`        本地 ${localHash} / 线上 ${remoteHash} / 链接声明 ${declared}`);
}

/* 3. 主题是否真的是深色 */
console.log('\n主题判定：');
const baseCss = await get(links.find((l) => l.includes('base.css')));
const vars = {};
for (const k of ['--paper-2', '--paper', '--ink', '--hero-bg-2', '--hero-stroke']) {
  const m = new RegExp(k + ':\\s*([^;]+);').exec(baseCss);
  vars[k] = m ? m[1].trim() : null;
}
console.log('  页面底色 --paper-2 =', vars['--paper-2'], vars['--paper-2'] === '#0a0e16' ? '（深色 ✓）' : '（不是深色 ✗）');
console.log('  卡片面   --paper   =', vars['--paper']);
console.log('  标题字色 --ink     =', vars['--ink']);
console.log('  首屏底色 --hero-bg-2 =', vars['--hero-bg-2']);

/* 4. 烟花脚本是否可取且非空 */
console.log('\n烟花脚本：');
const fwLink = links.find((l) => l.includes('fireworks.js'));
const fw = await get(fwLink);
console.log('  ' + fwLink + '  →  ' + fw.length + ' 字符');
console.log('  含 burst 函数:', fw.includes('function burst'));
console.log('  含 pointerdown 监听:', fw.includes('pointerdown'));
console.log('  含减少动态效果判断:', fw.includes('prefers-reduced-motion'));

console.log('\n' + (allOk && vars['--paper-2'] === '#0a0e16' ? '=== 全部通过：线上就是深色主题 ===' : '=== 仍有问题，需继续排查 ==='));
