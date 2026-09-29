/** 验收彩蛋区的三处图片与文案改动。 */
const BASE = 'https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/';
const g = async (p) => (await fetch(BASE + p + '?cb=' + Date.now(), { cache: 'no-store' })).text();

const html = await g('index.html');
const css = await g('assets/css/sections.css');

console.log('应当存在：');
for (const [label, needle] of [
  ['鲸鱼娘改用 PNG', 'egg-deepseek.png'],
  ['收款码改用 PNG', 'egg-pay-qr.png'],
  ['斜体文案（带弯引号与 emoji）', '“喜欢的话，可以投喂我 token 小蛋糕😘”'],
  ['斜体样式规则', 'font-style: italic'],
  ['鲸鱼娘已去底色', 'background: none'],
]) {
  console.log(`  ${html.includes(needle) || css.includes(needle) ? 'ok  ' : 'MISS'}  ${label}`);
}

console.log('\n应当已清除：');
for (const [label, needle] of [
  ['旧的 jpg 引用', 'egg-deepseek.jpg'],
  ['旧的收款码 jpg', 'egg-pay-qr.jpg'],
  ['重复的店名文字标签', 'egg__pay-label'],
  ['旧的喂食文案', '喂我吃 token'],
]) {
  console.log(`  ${html.includes(needle) || css.includes(needle) ? 'STILL THERE' : 'ok  '}  ${label}`);
}

console.log('\n线上图片：');
for (const u of ['assets/img/egg-deepseek.png', 'assets/img/egg-pay-qr.png']) {
  const r = await fetch(BASE + u, { method: 'HEAD' });
  console.log(`  ${r.status}  ${(r.headers.get('content-length') || '?')} B  ${u}`);
}

console.log('\n彩蛋区 HTML 片段：');
const m = /<div class="egg__feed">[\s\S]*?<\/div>/.exec(html);
console.log(m ? m[0] : '  未找到');
