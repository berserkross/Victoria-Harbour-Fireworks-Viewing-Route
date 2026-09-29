#!/usr/bin/env node
/**
 * build.mjs — 把 content/*.md + src/template.html 生成为仓库根目录的 index.html
 *
 * 用法：
 *     node build.mjs
 *
 * 无任何第三方依赖，只需要 Node.js 18+。GitHub Actions 会在每次 push 后自动执行它。
 * 日常改文案请只改 content/*.md；改结构请改 src/template.html。
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const P = (...p) => join(ROOT, ...p);

/**
 * 给 css/js 链接加内容哈希，例如 assets/css/base.css?v=ab12cd34
 *
 * 为什么必须这么做：GitHub Pages 对所有静态资源发 Cache-Control: max-age=600，
 * 浏览器会把 CSS/JS 缓存 10 分钟。没有这个查询串，改完样式后访客会继续用旧文件，
 * 表现为「页面完全没变化」。加了哈希，文件一改链接就变，浏览器必然重新拉取。
 */
function versioned(relPath, n = 8) {
  const full = P(relPath);
  if (!existsSync(full)) return relPath;
  const h = createHash('sha1').update(readFileSync(full)).digest('hex').slice(0, n);
  return `${relPath}?v=${h}`;
}

/* ------------------------------------------------------------------ 工具 */

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 只允许 http(s)、mailto、站内相对路径与锚点，防止误注入 javascript: */
function safeUrl(u) {
  const s = String(u ?? '').trim();
  if (/^(javascript|data|vbscript):/i.test(s)) return '#';
  if (/^https?:/i.test(s) || /^mailto:/i.test(s) || /^#/.test(s) || /^\.{0,2}\//.test(s) || /^[\w\u4e00-\u9fa5][^:]*$/.test(s)) {
    return s;
  }
  return '#';
}

/** 标题 -> 稳定、可读的锚点 id */
function slug(text, used) {
  let base = String(text)
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  if (!base) base = 'sec';
  let id = base;
  if (used.has(id)) {
    id = `${base}-${createHash('sha1').update(String(text)).digest('hex').slice(0, 4)}`;
  }
  used.add(id);
  return id;
}

/** 行内 Markdown：`code` **bold** *em* [text](url) <url> ![alt](src "cap") */
function inline(src) {
  let s = String(src ?? '');
  const stash = [];
  const keep = (html) => {
    stash.push(html);
    return `\u0000${stash.length - 1}\u0000`;
  };

  // 图片先占位，避免其中的 * _ 被后续规则改写
  s = s.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g, (_, alt, src2, cap) =>
    keep(
      `<img class="inline-img" src="${escapeHtml(safeUrl(src2))}" alt="${escapeHtml(alt)}"` +
        (cap ? ` title="${escapeHtml(cap)}"` : '') +
        ` loading="lazy" decoding="async">`
    )
  );

  s = escapeHtml(s);

  s = s.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${c}</code>`));
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/\[([^\]]+)\]\(\s*([^)\s]+)\s*\)/g, (_, t, u) => `<a href="${escapeHtml(safeUrl(u))}" target="_blank" rel="noopener">${t}</a>`);
  // 自动链接：<https://…>
  // 注意字符类不能用 [^&\s]：URL 里常有 %XX（如维基／官网的中文路径），
  // 排除 & 会误伤含 % 的链接，导致整条链接渲染不出来。这里只排除空白与 >。
  s = s.replace(/&lt;(https?:\/\/[^\s>]+)&gt;/g, (_, u) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${u}</a>`);

  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);
}

/* --------------------------------------------------- 自定义块（```lang） */

/** 去掉包裹标量的成对引号："1" / '1' -> 1 */
function unquote(s) {
  const t = String(s ?? '').trim();
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/**
 * 解析块内的"字段: 值"行。
 *     tone: paid            ← 无缩进或带缩进都行
 *     - src: xxx.mp4        ← 前面带 "- " 也行
 * 后续缩进更深的行会接到上一个字段后面（便于写长句）。
 */
function parsePairs(lines) {
  const out = {};
  let key = null;
  for (const raw of lines) {
    const m = /^\s*(?:-\s+)?([\w-]+)\s*:\s*(.*)$/.exec(raw);
    if (m) {
      key = m[1];
      out[key] = unquote(m[2]);
    } else if (key && raw.trim()) {
      out[key] += ' ' + raw.trim();
    }
  }
  return out;
}

/**
 * 解析数组块：每一项由"无缩进的 `- ` 开头"，其后缩进的行是该项目的字段。
 * 兼容两种写法：
 *     - text             （第一项的内容直接跟在短横线后）
 *       img: xxx.jpg
 *     - title: 标题       （第一项直接以字段开始）
 *       img: xxx.jpg
 */
function parseItems(lines) {
  const items = [];
  let cur = null;
  for (const raw of lines) {
    if (/^\s*$/.test(raw)) continue;
    const startNew = /^-\s+\S/.test(raw);
    if (startNew) {
      cur = [];
      items.push(cur);
      const m = /^-\s+([\w-]+)\s*:\s*(.*)$/.exec(raw);
      if (m) cur.push(`${m[1]}: ${m[2]}`);
      else cur.push(`text: ${raw.replace(/^-\s+/, '')}`);
      continue;
    }
    if (cur) cur.push(raw);
  }
  return items.map(parsePairs);
}

function renderMeta(p) {
  const tone = ['paid', 'warn', 'free', ''].includes((p.tone ?? '').trim()) ? (p.tone ?? '').trim() : '';
  return `<aside class="meta${tone ? ' meta--' + tone : ''}">
${p.tag ? `<p class="meta__tag">${inline(p.tag)}</p>` : ''}
${p.summary ? `<p class="meta__summary">${inline(p.summary)}</p>` : ''}
</aside>`;
}

function renderCards(lines) {
  const items = parseItems(lines);
  const html = items.map((p) => {
    const tone = ['paid', 'warn', 'free'].includes((p.tone ?? '').trim()) ? ` card--${p.tone.trim()}` : '';
    const rows = [
      ['best', '优势', p.best],
      ['worst', '代价', p.worst],
    ]
      .filter(([, , v]) => v)
      .map(([k, label, v]) => `<div class="card__row card__row--${k}"><dt>${label}</dt><dd>${inline(v)}</dd></div>`)
      .join('\n');
    return `<article class="card${tone}">
${p.badge ? `<p class="card__badge">${inline(p.badge)}</p>` : ''}
<h3 class="card__title">${inline(p.title)}</h3>
${p.sub ? `<p class="card__sub">${inline(p.sub)}</p>` : ''}
${rows ? `<dl class="card__rows">\n${rows}\n</dl>` : ''}
</article>`;
  });
  return `<div class="cards">\n${html.join('\n')}\n</div>`;
}

function renderSteps(lines) {
  const all = parseItems(lines);
  // 块首的 `- credit: ...` 是整组图的摄影署名，不是一步
  const photoCredit = (all.find((x) => x.credit && !x.title) ?? {}).credit ?? '';
  const items = all.filter((x) => x.title);
  let counter = 0;
  const html = items.map((p) => {
    counter += 1;
    const n = p.n ?? String(counter);
    const img = p.img && p.img.trim() && p.img.trim() !== 'null'
      ? `<figure class="step__figure">
<img src="${escapeHtml(safeUrl(p.img))}" alt="${escapeHtml(p.cap || p.title || '')}" loading="lazy" decoding="async">
${p.cap ? `<figcaption>${inline(p.cap)}</figcaption>` : ''}
</figure>`
      : '';
    const note = p.note ? `<p class="step__note">${inline(p.note)}</p>` : '';
    return `<li class="step"${p.img ? ' data-has-img="1"' : ''}>
<span class="step__n" aria-hidden="true">${escapeHtml(n)}</span>
<div class="step__body">
<p class="step__title">${inline(p.title)}</p>
${note}
${img}
</div>
</li>`;
  });
  const credit = photoCredit ? `<p class="steps__credit">${inline(photoCredit)}</p>` : '';
  return `<ol class="steps">\n${html.join('\n')}\n</ol>${credit}`;
}

function renderVideo(p) {
  return `<figure class="video">
<video controls preload="metadata" playsinline${p.poster ? ` poster="${escapeHtml(safeUrl(p.poster))}"` : ''}>
<source src="${escapeHtml(safeUrl(p.src))}" type="video/mp4">
你的浏览器不支持 HTML5 视频，请<a href="${escapeHtml(safeUrl(p.src))}">点此下载视频</a>。
</video>
${p.title || p.desc ? `<figcaption>${p.title ? `<strong>${inline(p.title)}</strong>` : ''}${p.title && p.desc ? ' — ' : ''}${p.desc ? inline(p.desc) : ''}</figcaption>` : ''}
</figure>`;
}

/** 口岸表：- name / hk / hours / access / rec(yes|no) / note */
function renderPorts(lines) {
  const items = parseItems(lines);
  const rows = items
    .map((p) => {
      const rec = String(p.rec ?? '').toLowerCase() === 'yes';
      return `<tr${rec ? ' class="is-rec"' : ''}>
<td class="ports__name">
${rec ? '<span class="ports__star" title="推荐" aria-label="推荐">★</span>' : ''}<strong>${inline(p.name)}</strong>
${p.hk ? `<span class="ports__hk">港方：${inline(p.hk)}</span>` : ''}
</td>
<td class="ports__hours">${inline(p.hours)}</td>
<td class="ports__access">${inline(p.access)}${p.note ? `<span class="ports__note">${inline(p.note)}</span>` : ''}</td>
</tr>`;
    })
    .join('\n');
  return `<div class="tablewrap ports">
<table>
<thead><tr><th>口岸（深圳一侧）</th><th>开放时间</th><th>怎么到 / 说明</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>`;
}

function renderChecklist(lines) {
  let group = '';
  let gi = 0;
  const groups = [];
  for (const raw of lines) {
    const g = /^\s*group\s*:\s*(.+)$/.exec(raw);
    if (g) {
      group = unquote(g[1]);
      gi += 1;
      groups.push({ id: 'g' + gi, label: group, items: [] });
      continue;
    }
    const it = /^-\s+(.+)$/.exec(raw);
    if (it) {
      // 一行三段的写法：  正文 | 小字注解 | 图标1::图标2
      const parts = it[1].split('|').map((x) => x.trim());
      const [text, note, iconsRaw] = parts;
      const icons = (iconsRaw ?? '')
        .split('::')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const [src, alt] = pair.split('##').map((s) => (s ?? '').trim());
          return { src, alt: alt || '' };
        })
        .filter((i) => i.src);
      if (!groups.length) {
        gi += 1;
        groups.push({ id: 'g' + gi, label: '', items: [] });
      }
      groups[gi - 1].items.push({ text, note: note || '', icons });
    }
  }
  const body = groups
    .map((grp) => {
      const lis = grp.items
        .map((it, i) => {
          const id = `${grp.id}-i${i + 1}`;
          const icons = (it.icons ?? []).length
            ? `<span class="check__apps">${it.icons
                .map((ic) => `<span class="check__app"><img src="${escapeHtml(safeUrl(ic.src))}" alt="" width="18" height="18" loading="lazy" decoding="async">${escapeHtml(ic.alt)}</span>`)
                .join('')}</span>`
            : '';
          const note = it.note || icons
            ? `<span class="check__note">${it.note ? inline(it.note) : ''}${icons}</span>`
            : '';
          return `<li class="check">
<input type="checkbox" id="${id}" data-check="${id}">
<label for="${id}">
<span class="check__text">${inline(it.text)}</span>
${note}
</label>
</li>`;
        })
        .join('\n');
      return `<div class="checkgroup">
${grp.label ? `<h3 class="checkgroup__title">${inline(grp.label)}</h3>` : ''}
<ul class="checklist">
${lis}
</ul>
</div>`;
    })
    .join('\n');

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return `<div class="checklist-widget" data-checklist>
<div class="checklist-widget__bar">
<span class="checklist-widget__count" data-check-count>0 / ${total}</span>
<button type="button" class="btn btn--ghost" data-check-reset>全部清空</button>
</div>
${body}
</div>`;
}

/* ------------------------------------------------------ Markdown 块解析 */

function renderList(lines) {
  const items = [];
  let cur = null;
  for (const raw of lines) {
    const top = /^[-*]\s+(.*)$/.exec(raw);
    const sub = /^\s+[-*]\s+(.*)$/.exec(raw);
    if (sub && cur) {
      cur.sub.push(sub[1]);
    } else if (top) {
      cur = { text: top[1], sub: [] };
      items.push(cur);
    } else if (cur && raw.trim()) {
      const t = raw.trim();
      // 缩进的纯链接行（或 <https://…>）拼到上一条上，否则会被丢掉
      if (/^<?https?:\/\/\S+>?$/.test(t) || /^\[[^\]]+\]\(\S+\)$/.test(t)) {
        cur.text = cur.text.trimEnd() + ' ' + t;
      } else if (cur.sub.length) {
        cur.sub.push(t);
      } else {
        cur.text = cur.text.trimEnd() + ' ' + t;
      }
    }
  }
  const html = items
    .map((it) => {
      const sub = it.sub.length
        ? `\n<ul class="list list--sub">\n${it.sub.map((s) => `<li>${inline(Array.isArray(s) ? s.join(' ') : s)}</li>`).join('\n')}\n</ul>`
        : '';
      return `<li>${inline(it.text)}${sub}</li>`;
    })
    .join('\n');
  return `<ul class="list">\n${html}\n</ul>`;
}

/**
 * 把一段 Markdown 渲染成 HTML。
 * 返回 { html, headings: [{ level, text, id }] }
 */
function renderMarkdown(src, opts = {}) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const used = opts.used ?? new Set();
  const offsetLevel = opts.headingOffset ?? 0;
  const headings = [];
  const out = [];
  let i = 0;

  const flushParagraph = (buf) => {
    if (!buf.length) return;
    out.push(`<p>${inline(buf.join(' '))}</p>`);
    buf.length = 0;
  };
  const para = [];

  while (i < lines.length) {
    const line = lines[i];

    // ---- 围栏块 ----
    const fence = /^```(\w+)\s*$/.exec(line);
    if (fence) {
      flushParagraph(para);
      const lang = fence[1];
      const body = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // 跳过收尾的 ```
      if (lang === 'meta') out.push(renderMeta(parsePairs(body)));
      else if (lang === 'cards') out.push(renderCards(body));
      else if (lang === 'steps') out.push(renderSteps(body));
      else if (lang === 'video') out.push(renderVideo(parsePairs(body)));
      else if (lang === 'checklist') out.push(renderChecklist(body));
      else if (lang === 'ports') out.push(renderPorts(body));
      else out.push(`<pre class="code"><code>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    // ---- 标题 ----
    const h = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (h) {
      flushParagraph(para);
      const srcLevel = h[1].length;
      const text = h[2];
      // headingOffset=1 时：Markdown 的 h1 是章节标题（交给模板渲染），
      // h2 仍输出为 h2，以此类推 —— 即正文层级不变，只是把 h1 抽走。
      const level = srcLevel;
      if (srcLevel <= offsetLevel) {
        i += 1;
        continue; // 章节标题由模板渲染，跳过
      }
      const id = slug(text, used);
      // headings 里记录「源码层级」，供调用方识别 h1；输出时才应用下移
      headings.push({ level: srcLevel, text, id });
      out.push(`<h${level} id="${id}"><a class="anchor" href="#${id}" aria-label="本节链接">#</a>${inline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    // ---- 分隔线 ----
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph(para);
      out.push('<hr>');
      i += 1;
      continue;
    }

    // ---- 列表 ----
    if (/^[-*]\s+\S/.test(line) || /^\s+[-*]\s+\S/.test(line)) {
      flushParagraph(para);
      const buf = [];
      while (i < lines.length && (/^[-*]\s+\S/.test(lines[i]) || /^\s+[-*]\s+\S/.test(lines[i]) || /^\s+\S/.test(lines[i]))) {
        buf.push(lines[i]);
        i += 1;
      }
      out.push(renderList(buf));
      continue;
    }

    // ---- 引用 ----
    if (/^>\s?/.test(line)) {
      flushParagraph(para);
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote class="quote">${renderMarkdown(buf.join('\n'), { used, headingOffset: offsetLevel }).html}</blockquote>`);
      continue;
    }

    // ---- 提示块 !!! ----
    if (/^!!!\s?/.test(line)) {
      flushParagraph(para);
      const buf = [line.replace(/^!!!\s?/, '')];
      i += 1;
      while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
        buf.push(lines[i].trim());
        i += 1;
      }
      out.push(`<aside class="callout"><span class="callout__icon" aria-hidden="true">!</span><p>${inline(buf.join(' '))}</p></aside>`);
      continue;
    }

    // ---- 表格 ----
    if (/^\|/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      flushParagraph(para);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(cells(lines[i]));
        i += 1;
      }
      out.push(`<div class="tablewrap"><table>
<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>
</table></div>`);
      continue;
    }

    // ---- 图片独占一行 → 带图注的作品图 ----
    const imgLine = /^!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)$/.exec(line.trim());
    if (imgLine) {
      flushParagraph(para);
      const [, alt, src2, cap] = imgLine;
      out.push(`<figure class="work">
<img src="${escapeHtml(safeUrl(src2))}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">
${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}
</figure>`);
      i += 1;
      continue;
    }

    // ---- 空行 ----
    if (!line.trim()) {
      flushParagraph(para);
      i += 1;
      continue;
    }

    // ---- 段落 ----
    para.push(line.trim());
    i += 1;
  }
  flushParagraph(para);

  return { html: out.join('\n'), headings };
}

/* ---------------------------------------------------------------- 装配 */

function main() {
  const cfg = JSON.parse(readFileSync(P('site.config.json'), 'utf8'));
  const template = readFileSync(P('src', 'template.html'), 'utf8');
  const usedIds = new Set();

  const sections = [];
  const toc = [];

  for (const item of cfg.nav) {
    const file = P('content', item.file);
    if (!existsSync(file)) {
      console.warn(`! content/${item.file} 不存在，已跳过`);
      continue;
    }
    const raw = readFileSync(file, 'utf8');
    // 把 Markdown 的 h1 当作章节标题（由模板渲染），正文里的 h2/h3 下移一级，
    // 保证最终页面只有一个 h1，标题层级连续。
    const { html, headings } = renderMarkdown(raw, { used: usedIds, headingOffset: 1 });

    const h1 = headings.find((h) => h.level === 1);
    const title = h1 ? h1.text : item.label;
    const id = item.id;

    const children = headings.filter((h) => h.level >= 2 && h.level <= 3);

    toc.push({
      id,
      num: item.num ?? '',
      label: item.label,
      en: item.en ?? '',
      children: children.map((h) => ({ id: h.id, text: h.text, level: h.level })),
    });

    sections.push(`<section class="section" id="${id}" data-section="${id}">
<header class="section__head">
<span class="section__num">${escapeHtml(item.num ?? '')}</span>
<div class="section__titles">
${item.en ? `<p class="section__en">${escapeHtml(item.en)}</p>` : ''}
<h1 class="section__title" id="${id}-title">${inline(title)}</h1>
</div>
</header>
<div class="section__body">
${html}
</div>
</section>`);
  }

  // ---- 目录 ----
  const tocHtml = toc
    .map((t) => {
      const kids = t.children.length
        ? `\n<ol class="toc__sub">\n${t.children
            .map((c) => `<li class="toc__subitem toc__subitem--h${c.level}"><a href="#${c.id}"><span class="toc__dot"></span>${escapeHtml(c.text)}</a></li>`)
            .join('\n')}\n</ol>`
        : '';
      return `<li class="toc__item">
<a class="toc__link" href="#${t.id}"${t.children.length ? ' data-has-sub="1"' : ''}>
${t.num ? `<span class="toc__num">${escapeHtml(t.num)}</span>` : ''}<span class="toc__label">${escapeHtml(t.label)}</span>${t.en ? `<span class="toc__en">${escapeHtml(t.en)}</span>` : ''}
</a>${kids}
</li>`;
    })
    .join('\n');

  const topnavHtml = toc
    .map((t) => `<a href="#${t.id}"><i>${escapeHtml(t.num ?? '')}</i>${escapeHtml(t.label)}</a>`)
    .join('');

  // ---- 数据条 ----
  const statsHtml = (cfg.stats ?? [])
    .map((s) => `<div class="stat">
<span class="stat__num">${escapeHtml(s.num)}<i>${escapeHtml(s.unit ?? '')}</i></span>
<span class="stat__label">${escapeHtml(s.label)}</span>
</div>`)
    .join('\n');

  // ---- 社群宣传（group.enabled 设为 false 即整块隐藏）----
  const g = cfg.group ?? {};
  const groupHtml = g.enabled === false || !g.qr ? '' : `<section class="group" id="join">
<header class="group__head">
${g.en ? `<p class="group__en">${escapeHtml(g.en)}</p>` : ''}
<h2 class="group__title">${escapeHtml(g.title ?? '加入我们')}</h2>
${g.lead ? `<p class="group__lead">${inline(g.lead)}</p>` : ''}
</header>
<div class="group__body">
<div class="group__text">
<ul class="group__list">
${(g.items ?? []).map((it) => `<li><strong>${inline(it.title)}</strong><span>${inline(it.desc)}</span></li>`).join('\n')}
</ul>
${g.note ? `<p class="group__note">${inline(g.note)}</p>` : ''}
</div>
<figure class="group__qr">
<img src="${escapeHtml(safeUrl(g.qr))}" alt="${escapeHtml(g.qrAlt ?? '')}" width="200" height="200" loading="lazy" decoding="async">
<figcaption>
<span class="group__qr-label">${escapeHtml(g.qrLabel ?? '扫码入群')}</span>
${g.expiry ? `<span class="group__qr-expiry">${inline(g.expiry)}</span>` : ''}
</figcaption>
</figure>
</div>
</section>`;

  const now = new Date();
  const buildDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const b = cfg.brand ?? {};
  const h = cfg.hero ?? {};
  const link = b.links ?? {};

  const vars = {
    LANG: cfg.site.lang ?? 'zh-CN',
    TITLE: cfg.site.title,
    SUBTITLE: cfg.site.subtitle,
    DESCRIPTION: cfg.site.description,
    KEYWORDS: (cfg.site.keywords ?? []).join(','),
    AUTHOR: cfg.site.author,
    REPO: cfg.site.repo,

    // 品牌
    BRAND_ORG: b.org ?? '',
    BRAND_ORG_EN: b.orgEn ?? '',
    BRAND_PARENT: b.parent ?? '',
    BRAND_PARENTS: (b.parents ?? []).map((x) => `<span>${escapeHtml(x)}</span>`).join('<i aria-hidden="true">·</i>'),
    BRAND_FOUNDED: b.founded ?? '',
    BRAND_TAGLINE: b.tagline ?? '',
    BRAND_PRODUCED_BY: b.producedBy ?? '',
    BRAND_CREDIT: b.credit ?? '',
    BRAND_CREDIT_EN: b.creditEn ?? '',
    BRAND_PHOTO_CREDIT: b.photoCredit ?? '',
    BRAND_LOGO: b.logo ?? '',
    LINK_COLLEGE: link.college ?? '#',
    LINK_ORG: link.org ?? '#',

    // 首屏
    HERO_KICKER: h.kicker ?? '',
    HERO_KICKER_EN: h.kickerEn ?? '',
    HERO_TITLE: h.title ?? cfg.site.title,
    HERO_LEAD: h.lead ?? '',
    HERO_COVER: h.cover ?? '',
    HERO_COVER_1600: h.cover1600 ?? h.cover ?? '',
    HERO_COVER_900: h.cover900 ?? h.cover ?? '',
    HERO_COVER_ALT: h.coverAlt ?? '',
    HERO_COVER_CREDIT: h.coverCredit ?? '',
    CTA_PRIMARY_LABEL: h.ctaPrimary?.label ?? '',
    CTA_PRIMARY_HREF: h.ctaPrimary?.href ?? '#',
    CTA_SECONDARY_LABEL: h.ctaSecondary?.label ?? '',
    CTA_SECONDARY_HREF: h.ctaSecondary?.href ?? '#',
    OG_IMAGE: cfg.ogImage ?? 'assets/img/og-cover.jpg',

    STATS: statsHtml,
    TOC: tocHtml,
    TOPNAV: topnavHtml,
    SECTIONS: sections.join('\n\n'),
    GROUP: groupHtml,

    FOOTER_NOTE: cfg.footer.note,
    FOOTER_DISCLAIMER: cfg.footer.disclaimer,
    BUILD_DATE: buildDate,
  };

  let html = template;
  for (const [k, v] of Object.entries(vars)) {
    html = html.split(`{{${k}}}`).join(v);
  }
  const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover) throw new Error('模板里还有未替换的占位符：' + [...new Set(leftover)].join(', '));

  // assets/src → 根目录，保证 index.html 直接可用
  mkdirSync(P('assets'), { recursive: true });
  cpSync(P('src', 'css'), P('assets', 'css'), { recursive: true });
  cpSync(P('src', 'js'), P('assets', 'js'), { recursive: true });

  // 给所有 CSS/JS 引用加内容哈希，绕开 GitHub Pages 的 10 分钟缓存。
  // 必须放在 cpSync 之后，读到的才是最终产物。
  let stamped = 0;
  html = html.replace(
    /(href|src)="(assets\/(?:css|js)\/[^"?]+\.(?:css|js))"/g,
    (whole, attr, rel) => {
      const v = versioned(rel);
      if (v === rel) return whole;
      stamped += 1;
      return `${attr}="${v}"`;
    }
  );

  writeFileSync(P('index.html'), html, 'utf8');

  console.log(`✓ index.html  (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
  console.log(`✓ 章节 ${toc.length} 个，目录条目 ${toc.reduce((n, t) => n + t.children.length, 0)} 条`);
  console.log(`✓ assets/css, assets/js 已同步`);
  console.log(`✓ 已给 ${stamped} 个 CSS/JS 链接加上内容哈希（破除缓存）`);
}

main();
