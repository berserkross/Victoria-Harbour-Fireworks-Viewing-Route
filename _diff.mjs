/** 线上验收：只做必要的几项检查，避免大量请求导致超时。 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const BASE = 'https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/';
const sha = (s) => createHash('sha256').update(s).digest('hex').toUpperCase();

const local = readFileSync('index.html', 'utf8');
const r = await fetch(BASE + '?cb=' + Date.now(), { cache: 'no-store' });
const live = await r.text();

console.log('本地 sha:', sha(local), `(${Buffer.byteLength(local)} B)`);
console.log('线上 sha:', sha(live), `(${Buffer.byteLength(live)} B)`);
console.log(sha(local) === sha(live) ? '✓ 完全一致 —— 线上就是最新版' : '✗ 不一致');

console.log('\n内容抽查：');
const checks = [
  ['首个官方链接（含 %XX 编码）', 'discoverhongkong.com/tc/events/event.id89562'],
  ['链接已渲染成 <a>', 'href="https://www.discoverhongkong.com'],
  ['太平山补充说明', '1 号山顶小巴'],
  ['宝马山补充说明', '976／968'],
  ['支付方式标题改为总结', '>总结</h2>'],
  ['旧标题「一句话」已消失', null],
  ['Klook 活动链接', 'klook.com/zh-CN/activity/96889'],
  ['Trip.com 入口', 'trip.com/'],
];
for (const [label, needle] of checks) {
  const hit = needle === null ? !live.includes('>一句话</h2>') : live.includes(needle);
  console.log(`  ${hit ? '✓' : '✗'} ${label}`);
}

/* 只抽查首屏与 CSS 这几个关键资源 */
console.log('\n关键资源：');
for (const rel of [
  'assets/css/base.css', 'assets/css/sections.css', 'assets/css/components.css',
  'assets/js/toc.js', 'assets/img/brand-hoceania-logo.jpg',
  'assets/img/hero-cover-1600.jpg', 'assets/video/route-to-peak-observatory.mp4',
]) {
  const res = await fetch(new URL(rel, BASE).href, { method: 'HEAD' });
  console.log(`  ${res.status === 200 ? '✓' : '✗'} ${res.status}  ${rel}`);
}
