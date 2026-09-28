# 国庆维港烟花路线 · 网页版

> **线上地址**：https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/
> **仓库地址**：https://github.com/berserkross/Victoria-Harbour-Fireworks-Viewing-Route

一份可以**长期维护**的静态攻略站点。所有内容都在 `content/` 里用 Markdown 写，改完运行一条命令就会更新网页。

> 本页内容依据原始攻略《国庆维港烟花路线》（Markdown / XMind / PDF）整理排版，图源同源。

---

## 一、目录结构

```
.
├── index.html              ← 生成物，请勿手改（每次构建都会覆盖）
├── build.mjs               ← 构建脚本：Markdown + 模板 → index.html（零依赖）
├── upload.mjs              ← 上传脚本：走 GitHub REST API 推送并开启 Pages
├── site.config.json        ← 站点设置：标题、导航、页脚、仓库地址
├── content/                ← ★ 日常改文案只改这里
│   ├── 00-intro.md              写在前面
│   ├── 10-routes.md             四条路线
│   ├── 20-route3-peak.md        具体路线 · 太平山
│   ├── 30-route4-braemar.md     具体路线 · 宝马山
│   ├── 40-payment.md            关于支付方式
│   ├── 50-octopus.md            关于八达通
│   └── 60-checklist.md          出发前检查清单
├── src/
│   ├── template.html       ← 页面骨架（HTML 结构）
│   ├── css/
│   │   ├── base.css              配色变量 + 基础排版
│   │   ├── layout.css            顶栏 / 目录 / 栅格 / 响应式
│   │   ├── components.css        卡片 / 步骤 / 提示 / 清单 / 视频 / 灯箱
│   │   └── sections.css          首屏 / 章节 / 页脚
│   └── js/
│       ├── toc.js                目录高亮 + 阅读进度 + 手机抽屉
│       ├── lightbox.js           点击图片放大
│       └── checklist.js          清单勾选 + 本地保存
├── assets/                 ← 网页实际引用的资源（构建时从 src/ 同步 css/js）
│   ├── img/                      27 张图 + 1 个 Logo，最长边 1920px，单张 ≤ 300 KB
│   ├── video/route-to-peak-observatory.mp4   720p，约 14.5 MB
│   └── manifest.json             资源清单：每张图的来源文件与体积
├── source/                 ← 原始攻略存档（只读参考）
├── 预览网页.bat             ← 双击即可在浏览器查看网页
├── 发布到GitHub.bat         ← 双击即可把网页上传到 GitHub
├── .github/workflows/pages.yml   push 后自动构建并发布到 GitHub Pages
└── .nojekyll               ← 让 Pages 按原样发布，不做 Jekyll 处理
```

---

## 二、怎么改内容

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

## 三、Markdown 扩展语法

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

## 四、本地预览

**最快的方式**：直接双击仓库根目录的 **`预览网页.bat`**，浏览器就会打开网页。
（它只是替你双击 `index.html`——因为引用的是站内相对路径，不搭服务器也能正常显示。）

也可以手动双击 `index.html`，或者用更接近线上环境的方式：

```bash
npx serve .
# 或者
python -m http.server 8000
```

---

## 五、发布到 GitHub Pages

> **当前状态：已上线。**
> 网页地址：https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/
>
> Pages 的 Source 是 **Deploy from a branch → main / (root)**，即直接发布仓库根目录里的
> `index.html`。因此**改完内容后，先在本地跑一次 `node build.mjs`，再上传**，线上才会更新。

### 上传：双击 `发布到GitHub.bat`

双击后会**自动选择**上传方式：

| 情况 | 走哪条路 | 会做什么 |
| --- | --- | --- |
| 找到令牌文件（`E:\dsh-token.txt` 或本目录 `.token.txt`） | **方式 A**：GitHub API | 调用 `upload.mjs` 上传 |
| 没找到令牌 | **方式 B**：`git push` | 弹出浏览器让你登录 GitHub 授权后推送 |

### 手动上传（等价于方式 A）

```bash
node build.mjs                     # 1. 先把 content/*.md 编译成 index.html
node upload.mjs --dry-run          # 2. 看看会传哪些文件
node upload.mjs                    # 3. 上传
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

## 六、素材与版权

- 图片来源：原始攻略《国庆维港烟花路线》的 XMind 内嵌资源，与 PDF 中嵌入的为同一批图；`assets/manifest.json` 记录了每张图对应的原始文件名与体积。
- 网页图片统一压缩到最长边 1920px、单张 ≤ 300 KB；视频从 79 MB 的 HEVC 转码为 15 MB 的 H.264 720p 并开启 `faststart`。
- 出品：**祥波书院 · 海洋影像厂**。

### 关于 `source/`

`source/` 用于存放原始攻略文件备查，详见 `source/README.md`。原始 PDF（148.8 MB）与 XMind（146.9 MB）都超过 GitHub 单文件 100 MB 的硬上限，因此没有入库。
