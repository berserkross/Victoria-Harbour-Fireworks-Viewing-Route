/** 确认线上 CSS 里的主题变量值与提示块配色。 */
const BASE = 'https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/';
const css = await (await fetch(BASE + 'assets/css/base.css?cb=' + Date.now(), { cache: 'no-store' })).text();

const want = ['--warn', '--warn-soft', '--warn-ink', '--bg-image', '--bg-scrim', '--bg-grid', '--bg-grid-size'];
for (const v of want) {
  const i = css.indexOf(v + ':');
  if (i < 0) { console.log('  MISS  ' + v); continue; }
  const val = css.slice(i + v.length + 1).split(';')[0].trim();
  console.log('  ok    ' + v.padEnd(15) + ' = ' + val);
}

console.log('\n提示块配色（components.css）：');
const comp = await (await fetch(BASE + 'assets/css/components.css?cb=' + Date.now(), { cache: 'no-store' })).text();
const checks = [
  ['左边框用 --warn', 'border-left: 3px solid var(--warn)'],
  ['图标底色用 --warn', 'background: var(--warn)'],
  ['正文色用 --warn-ink', 'color: var(--warn-ink)'],
  ['黄底 #ffd633', '#ffd633'],
];
for (const [label, needle] of checks) {
  console.log(`  ${comp.includes(needle) ? 'ok  ' : 'MISS'}  ${label}`);
}

console.log('\n背景规则（base.css）：');
for (const [label, needle] of [
  ['body::before 铺照片', 'body::before'],
  ['body::after 格栅+压暗', 'body::after'],
  ['竖向阳影 mask', 'mask-image: linear-gradient(180deg'],
  ['窄屏换小图', 'bg-fireworks-1000.jpg'],
]) {
  console.log(`  ${css.includes(needle) ? 'ok  ' : 'MISS'}  ${label}`);
}
