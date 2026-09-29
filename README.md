# 国庆维港烟花路线 · 网页版

> **线上地址**：https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/
> **仓库地址**：https://github.com/berserkross/Victoria-Harbour-Fireworks-Viewing-Route
> **出品**：香港中文大学（深圳）· 祥波书院 · 海洋影像厂 HOCEANIA

一份可以**长期维护**的静态攻略站点。所有内容都在 `content/` 里用 Markdown 写，改完运行一条命令就会更新网页。

> 本页内容依据海洋影像厂原始攻略《国庆维港烟花路线》（Markdown / XMind / PDF）整理排版，图源同源。

---

## 一、目录结构

```
.
├── index.html              ← 生成物，请勿手改（每次构建都会覆盖）
├── build.mjs               ← 构建脚本：Markdown + 模板 → index.html（零依赖）
├── upload.mjs              ← 上传脚本：走 GitHub REST API 推送
├── site.config.json        ← ★ 站点与品牌设置：标题、导航、数据条、署名、CTA、页脚
├── content/                ← ★ 日常改文案只改这里
│   ├── 00-intro.md              写在前面
│   ├── 05-prep.md               行前须知（口岸一览 / 校巴地铁 / 香港上网 / 小巴怎么坐）
│   ├── 10-routes.md             四条路线
│   ├── 15-route1-5-paid.md      路线一点五 · 付费赏烟花
│   ├── 20-route3-peak.md        具体路线 · 太平山
│   ├── 30-route4-braemar.md     具体路线 · 宝马山
│   ├── 40-payment.md            关于支付方式
│   ├── 50-octopus.md            关于八达通
│   └── 60-checklist.md          出发前检查清单
├── src/
│   ├── template.html       ← 页面骨架（含首屏云海、数据条、关于我们、页脚）
│   ├── css/
│   │   ├── base.css              配色变量 + 排版
│   │   ├── layout.css            顶栏 / 目录 / 栅格 / 响应式
│   │   ├── components.css        按钮 / 卡片 / 步骤 / 清单 / 视频 / 灯箱
│   │   └── sections.css          首屏 / 数据条 / 章节 / 关于我们 / 页脚
│   └── js/
│       ├── toc.js                目录高亮 + 阅读进度 + 手机抽屉
│       ├── lightbox.js           点击图片放大
│       └── checklist.js          清单勾选 + 本地保存
├── assets/                 ← 网页实际引用的资源（构建时从 src/ 同步 css/js）
│   ├── img/                      27 张步骤图 + 官方 Logo + 封面多尺寸，单张 ≤ 300 KB
│   │   ├── hero-cover*.jpg             首屏封面（2400/1600/900 三档）
│   │   ├── brand-hoceania-logo.jpg     HOCEANIA 官方 Logo
│   │   └── og-cover.jpg                社交分享缩略图（og:image）
│   ├── video/route-to-peak-observatory.mp4   720p，约 14.5 MB
│   └── manifest.json             资源清单：每张图的来源与体积
├── source/                 ← 原始攻略存档（只读参考）
├── 预览网页.bat             ← 双击即可在浏览器查看网页
├── 发布到GitHub.bat         ← 双击即可把网页上传到 GitHub
└── .nojekyll               ← 让 Pages 按原样发布，不做 Jekyll 处理
```

---

## 二、视觉与文案基调

**当前主题：夜空（深色）**，契合夜空与烟花。

| 元素 | 做法 |
| --- | --- |
| 首屏 | 深蓝底 + 细白几何线稿（圆／虚线圆／圆角方框），呼应祥波书院八周年主视图；下方一条横穿全幅的白线两端各一个白点 |
| 品牌落款 | 首屏「海洋影像厂 HOCEANIA」+ 官方 Logo，压在深蓝底上 |
| 色彩 | 深蓝底 `#0a0e16`，正文提亮版海蓝 `#6ba9e8`；暖色只用于提示与"买票"标签 |
| 标题 | 七彩烟花渐变 + 7 秒循环流动 + 描边（描边色跟随主题） |
| 字体 | 标题用宋体系（`--font-serif`）体现刊物感；英文标签用等宽大写＋宽字距 |
| 数据条 | 8 / 4 / 2 / 27 四个数字，杂志式信息前置 |
| 交互 | **鼠标点击处绽放烟花**（`fireworks.js`，纯 Canvas） |

### 换主题（含换回浅色）

**所有主题变量都集中在 `src/css/base.css` 的 `:root`，别处不用动。**

- 当前生效：夜空主题
- 完整备份：`src/css/themes/theme-light.css.bak`（浅色「云海纸刊」主题）
- 取值速查：`base.css` 末尾有一段注释，直接列出了浅色主题的全部变量值

换回浅色：把 `base.css` 末尾注释里的那组值，覆盖到开头 `:root` 的对应变量上，再 `node build.mjs`。

> 首屏另有一组 `--hero-*` 变量（底色、字色、线稿、描边、Logo 底）。
> 两套主题取值不同：浅色是「天蓝底 + 白字」，夜空是「深蓝底 + 暖金描边字」。

### 关掉烟花特效

删掉 `src/template.html` 里这一行，再 `node build.mjs`：

```html
<script src="assets/js/fireworks.js" defer></script>
```

或者只改行为：`src/js/fireworks.js` 里 `HUES` 是配色、`n` 是粒子数、`decay` 是持续时间。
系统开启「减少动态效果」时，该脚本整体不启动。

### 换配色速查

只改 `src/css/base.css` 顶部 `:root`：

```css
--paper-2: #0a0e16;   /* 页面底色（夜空） */
--paper:   #131a29;   /* 卡片面 */
--ink:     #f2f5fa;   /* 标题字色 */
--ocean:   #6ba9e8;   /* 品牌海蓝（深色底下需提亮） */
--blue:    #004080;   /* 实心按钮用（按钮上是白字） */
```

### 换品牌信息 / 署名 / CTA

全部集中在 `site.config.json` 的 `brand` 与 `hero` 两节，改完运行 `node build.mjs` 即可，**不需要动 HTML**。

---

## 三、怎么改内容

### 1. 改文字

直接编辑 `content/*.md`，保存后运行：

```bash
node build.mjs
```

然后刷新 `index.html` 即可。（需要 Node.js 18 或更高版本。）

### 2. 改站点标题 / 导航 / 页脚

编辑 `site.config.json`：

- `site.*`：标题、副标题、SEO 描述、仓库地址
- `hero.*`：首屏大标题与标签
- `nav[]`：目录里的章节顺序。**增删章节**就是增删这个数组里的项，`file` 指向 `content/` 下的文件名，`id` 是锚点。
- `footer.*`：页脚署名与免责声明

### 3. 改配色

只改 `src/css/base.css` 顶部 `:root` 里的变量：

```css
--gold: #ffc861;   /* 主题金 */
--red:  #ff5f6d;   /* 汇演红 */
--bg:   #070a12;   /* 页面底色 */
```

改完运行 `node build.mjs` 会把 `src/css` 同步到 `assets/css`。

### 4. 换图

1. 把新图放进 `assets/img/`，建议命名沿用 `route3-01-xxx.jpg` / `route4-01-xxx.jpg` 的规律；
2. 在对应的 `content/*.md` 里改路径。

图片是**按文件名引用**的，所以直接覆盖同名文件即可原地换图。

### 5. 换视频

替换 `assets/video/route-to-peak-observatory.mp4`（建议 H.264 + AAC，720p，加 `-movflags +faststart`）。

---

## 四、Markdown 扩展语法

`content/*.md` 用的是 Markdown，另外加了几个站点专用的代码块。下面的示例都**真实可用**，可以直接复制去改。

### 步骤时间线

````markdown
```steps
- n: "1"
  title: 步骤标题
  img: assets/img/route3-01-c1-exit-sign.jpg
  cap: 图片说明
  note: 可选的补充提示（支持 **加粗**）
```
````

- `n` 可省略，会自动从 1 开始编号；
- `img: null` 表示这一步没有配图；
- 同一段连续的 `steps` 块共用一条时间轴，所以**步骤不要被别的块打断**。
- 摄影署名**不写在 `steps` 里**，统一放在 `site.config.json` 的 `brand.photoCredit`，只显示一次（页脚）。

### 作品图（带图注的整幅图片）

图片独占一行时，会自动渲染成带图注的作品图——第三个参数就是图注：

```markdown
![Klook 购票页面](assets/img/route1-klook-ticket.jpg "2026 国庆烟花汇演｜海港城 · 购票页面")
```

### 口岸表

````markdown
```ports
- name: 福田口岸
  hk: 落马洲支线管制站
  hours: "06:30 – 22:30"
  access: 深圳地铁 4 / 10 号线「福田口岸」站
  rec: yes          # yes 会加星标并高亮整行
  note: 从学校出发的首选之一，换乘最快
```
````

### 路线标签

````markdown
```meta
tone: paid        # paid（金）| warn（红）| free（绿）| 留空
tag: 买票入场
summary: 最简单便捷，但开销最大
```
````

### 速览卡片

````markdown
```cards
- badge: 路线一
  title: 海运大厦露天停车场观景台
  sub: 买票入场 · 最简单便捷
  tone: paid
  best: 无需提前占位、正面视角
  worst: 开销最大
```
````

### 醒目提示

```markdown
!!! 这里写需要强调的内容，支持 **加粗** 和 [链接](https://example.com)。
```

### 视频

````markdown
```video
src: assets/video/route-to-peak-observatory.mp4
poster: assets/img/route3-05-short-corridor.jpg
title: Route to Victoria Peak Observatory
desc: 从山顶巴士总站步行前往太平山观景台的全程记录
```
````

### 可勾选清单

````markdown
```checklist
group: 证件与钱
- 港澳通行证 + 有效签注
- 八达通（实体卡或手机电子版）| 竖线后面是灰色小注
```
````

勾选状态保存在浏览器 `localStorage`（键名 `vic-fireworks-checklist-v1`），不会上传。

### 普通 Markdown

标题 `#`～`####`、`**加粗**`、`*斜体*`、`` `行内代码` ``、`[链接](url)`、`![图](path "说明")`、`- 列表`（缩进两格成子列表）、`> 引用`、`| 表格 |`、`---` 分隔线都支持。

---

## 五、本地预览

**最快的方式**：直接双击仓库根目录的 **`预览网页.bat`**，浏览器就会打开网页。
（它只是替你双击 `index.html`——因为引用的是站内相对路径，不搭服务器也能正常显示。）

也可以手动双击 `index.html`，或者用更接近线上环境的方式：

```bash
npx serve .
# 或者
python -m http.server 8000
```

---

## 六、发布到 GitHub Pages

> **当前状态：已上线。**
> 网页地址：https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/
>
> Pages 的 Source 是 **Deploy from a branch → main / (root)**，即直接发布仓库根目录里的
> `index.html`。因此**改完内容后，先在本地跑一次 `node build.mjs`，再上传**，线上才会更新。

### 上传：双击 `发布到GitHub.bat`

双击后依次做两件事。

**① 自动体检**（跑 `check.mjs`）

| 检查 | 能抓出什么 |
| --- | --- |
| 标签配平 | 手改 HTML 时删多了或漏了闭合标签 |
| **锚点死链** | 改了标题文字、却没跟着改目录里的 `#链接`（并提示页面上相近的 id） |
| 重复 id | 锚点会跳错位置 |
| 本地资源 | 图片／视频路径写错，或文件被移走 |
| 体积 | 页面过大，或视频超过 GitHub 单文件 100 MB 硬上限 |

**体检不通过会停下来问你**：

```
  仍然要上传吗？[Y=上传 / N=停下修改]
```

按 `N` 就取消，什么都没改；按 `Y` 才继续。想单独体检一次：`node check.mjs`（有问题时退出码为 1）。

**② 自动选择上传方式**

| 情况 | 走哪条路 | 会做什么 |
| --- | --- | --- |
| 找到令牌文件（`E:\dsh-token.txt` 或本目录 `.token.txt`） | **方式 A**：GitHub API | 调用 `upload.mjs` 上传 |
| 没找到令牌 | **方式 B**：`git push` | 弹出浏览器让你登录 GitHub 授权后推送 |

### 手动上传（等价于方式 A）

```bash
node check.mjs                     # 1. 体检，有问题会以退出码 1 结束
node build.mjs                     # 2. 把 content/*.md 编译成 index.html
node upload.mjs --dry-run          # 3. 看看会传哪些文件
node upload.mjs                    # 4. 上传
```

`upload.mjs` 用 Node 自带的 `fetch` 直连 GitHub REST API（Git Data API：blob → tree → commit → 更新分支），
**不需要 git**。任何 Node 18+ 的环境都能跑。

### 令牌权限说明（重要）

细粒度令牌需要 **Contents: Read and write**。另外有两个可选项：

| 权限 | 加不加的差别 |
| --- | --- |
| **Contents: Read and write** | **必须**。没有它完全无法上传。 |
| **Workflows: Read and write** | 可选。加了才能提交 `.github/workflows/` 下的文件。没加时 `upload.mjs` 会自动跳过该目录并提示，**不影响网页发布**。 |
| **Pages: Read and write** | 可选。只在你想用本脚本自动开关 Pages 时需要；Pages 已配置好，平时用不到。 |

令牌存放位置：`E:\dsh-token.txt`（一行，只放令牌本身）。该路径已列在 `.gitignore` 中，不会被提交。

### 关于「push 后自动重建」

仓库里带了 `.github/workflows/pages.yml`。但因为当前令牌没有 **Workflows** 权限，
这个文件**还没有被推上去**。想让「改完 md 直接 push，线上自动重建」生效，需要二选一：

- **方案一**：给令牌补上 **Workflows: Read and write**，然后重新运行 `node upload.mjs`；
- **方案二**：在 GitHub 网页上手动新建 `.github/workflows/pages.yml`，把本地的内容粘进去。

推上去之后，还要到 **Settings → Pages** 把 Source 从 `Deploy from a branch` 改成 **GitHub Actions**。

不加也完全没问题——只是每次改完内容，记得**本地先 `node build.mjs` 再上传**。

---

## 七、素材与版权

- 图片来源：原始攻略《国庆维港烟花路线》的 XMind 内嵌资源，与 PDF 中嵌入的为同一批图；`assets/manifest.json` 记录了每张图对应的原始文件名与体积。
- 网页图片统一压缩到最长边 1920px、单张 ≤ 300 KB；视频从 79 MB 的 HEVC 转码为 15 MB 的 H.264 720p 并开启 `faststart`。
- 出品：**祥波书院 · 海洋影像厂**。

### 关于 `source/`

`source/` 用于存放原始攻略文件备查，详见 `source/README.md`。原始 PDF（148.8 MB）与 XMind（146.9 MB）都超过 GitHub 单文件 100 MB 的硬上限，因此没有入库。
