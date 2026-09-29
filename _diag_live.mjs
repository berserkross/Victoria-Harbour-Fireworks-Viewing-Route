/** 直接检查线上实际服务的 CSS 与 HTML，不猜。 */
const BASE = 'https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/';

const grab = async (p) => {
  const r = await fetch(BASE + p + '?cb=' + Date.now(), { cache: 'no-store' });
  return { status: r.status, text: await r.text() };
};

const base = await grab('assets/css/base.css');
const layout = await grab('assets/css/layout.css');
const comp = await grab('assets/css/components.css');
const sect = await grab('assets/css/sections.css');
const html = await grab('index.html');

console.log('=== 线上文件状态 ===');
for (const [n, f] of [['base.css', base], ['layout.css', layout], ['components.css', comp], ['sections.css', sect], ['index.html', html]]) {
  console.log(`  ${f.status}  ${String(f.text.length).padStart(6)} B  ${n}`);
}

console.log('\n=== base.css 里 :root 的主色（决定整站底色）===');
for (const key of ['--paper-2', '--paper', '--ink', '--ocean', '--hero-bg-2', '--hero-stroke', '--field', '--chip']) {
  const m = new RegExp(key.replace(/[-]/g, '\\-') + ':\\s*([^;]+);').exec(base.text);
  console.log(`  ${key.padEnd(14)} = ${m ? m[1].trim() : '(未找到)'}`);
}

console.log('\n=== body 背景用的是哪个变量 ===');
const bodyRule = /body\s*\{[^}]*\}/.exec(base.text);
console.log('  ' + (bodyRule ? bodyRule[0].replace(/\s+/g, ' ').slice(0, 200) : '未找到 body 规则'));

console.log('\n=== 线上 CSS 里还剩多少浅色硬编码 ===');
console.log('  base.css  #ffffff / #f7f8fa 出现次数:', (base.text.match(/#ffffff|#f7f8fa/g) || []).length);
console.log('  layout.css 中 background: #fff  :', (layout.text.match(/background:\s*#fff\b/g) || []).length);
console.log('  components.css 中 background: #fff :', (comp.text.match(/background:\s*#fff\b/g) || []).length);

console.log('\n=== 烟花脚本 ===');
const fw = await fetch(BASE + 'assets/js/fireworks.js', { method: 'HEAD' });
console.log('  HTTP', fw.status, ' type=', fw.headers.get('content-type'));
console.log('  index.html 里引用了 fireworks.js:', html.text.includes('fireworks.js'));
console.log('  index.html 里 <link> 的 CSS 顺序:');
for (const m of html.text.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) console.log('    ' + m[1]);

console.log('\n=== style 属性/内联样式是否覆盖了主题 ===');
const inline = [...html.text.matchAll(/style="[^"]*background[^"]*"/g)].map((m) => m[0]);
console.log('  内联 background 声明数量:', inline.length);
inline.slice(0, 5).forEach((s) => console.log('    ' + s.slice(0, 90)));

console.log('\n=== <html>/<body> 上有没有 class 影响主题 ===');
console.log('  ' + (/<html[^>]*>/.exec(html.text) || [''])[0]);
console.log('  ' + (/<body[^>]*>/.exec(html.text) || [''])[0]);
