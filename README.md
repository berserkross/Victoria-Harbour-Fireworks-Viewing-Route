# 国庆维港烟花路线 · 网页版

> **线上地址** <https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/>
> **仓库地址** <https://github.com/berserkross/Victoria-Harbour-Fireworks-Viewing-Route>
> **出品** 香港中文大学（深圳）· 祥波书院 · 海洋影像厂 HOCEANIA

一个可以长期维护的静态攻略站。正文全部用 Markdown 写在 `content/` 里，改完跑一条命令就能更新网页。

---

## 目录

- [一、五分钟上手](#一五分钟上手)
- [二、目录结构](#二目录结构)
- [三、日常维护](#三日常维护)
- [四、Markdown 扩展语法](#四markdown-扩展语法)
- [五、本地预览](#五本地预览)
- [六、发布到 GitHub Pages](#六发布到-github-pages)
- [七、素材与版权](#七素材与版权)

---

## 一、五分钟上手

| 你想做什么 | 怎么做 |
| --- | --- |
| **改文案** | 编辑 `content/*.md` → `node build.mjs` |
| **改标题／导航／署名／CTA** | 编辑 `site.config.json` → `node build.mjs` |
| **改配色／换主题** | 编辑 `src/css/base.css` 的 `:root` → `node build.mjs` |
| **看效果** | 双击 `预览网页.bat` |
| **发到网上** | 双击 `发布到GitHub.bat`（会自动先体检，再上传） |
| **确认线上更新了** | `node verify.mjs` |

**只需要 Node.js 18 或更高版本**，没有任何第三方依赖要装。

> ⚠️ `index.html` 是**生成物**，每次构建都会整个覆盖。
> 要改文字请改 `content/*.md`，别直接改 `index.html`。

---

## 二、目录结构

```
.
├── index.html              ← 生成物，请勿手改
├── build.mjs               ← 构建：content/ + src/ → index.html（零依赖）
├── check.mjs               ← 上传【前】体检：锚点 / 标签 / 资源 / 体积
├── upload.mjs              ← 上传：走 GitHub REST API 推送
├── verify.mjs              ← 上传【后】验收：本地与线上逐字节比对
├── site.config.json        ← ★ 站点与品牌设置
├── 预览网页.bat             ← 双击在浏览器里看
├── 发布到GitHub.bat         ← 双击体检 + 上传
├── .nojekyll               ← 让 Pages 按原样发布，不做 Jekyll 处理
│
├── content/                ← ★ 日常改文案只改这里
│   ├── 00-intro.md              写在前面
│   ├── 05-prep.md               行前须知（口岸一览 / 校巴地铁 / 香港上网 / 小巴怎么坐）
│   ├── 10-routes.md             四条路线（含路线二的付费选项）
│   ├── 20-route3-peak.md        具体路线 · 太平山
│   ├── 30-route4-braemar.md     具体路线 · 宝马山
│   ├── 40-payment.md            关于支付方式
│   ├── 50-octopus.md            关于八达通
│   └── 60-checklist.md          出发前检查清单
│
├── src/                    ← 源文件（构建时会同步 css/js 到 assets/）
│   ├── template.html            页面骨架
│   ├── css/
│   │   ├── base.css                    ★ 主题变量 + 排版（换肤改这里）
│   │   ├── layout.css                  顶栏 / 目录 / 栅格 / 响应式
│   │   ├── components.css              按钮 / 卡片 / 步骤 / 提示 / 清单 / 灯箱 / 口岸表
│   │   ├── sections.css                首屏 / 数据条 / 章节 / 社群 / 彩蛋 / 页脚
│   │   └── themes/
│   │       └── theme-light.css.bak     浅色主题完整备份
│   └── js/
│       ├── toc.js                      目录高亮 + 阅读进度 + 手机抽屉
│       ├── lightbox.js                 点击图片放大
│       ├── checklist.js                清单勾选 + 本地保存
│       └── fireworks.js                鼠标点击处绽放烟花
│
├── assets/                 ← 网页实际引用的资源
│   ├── img/                    约 40 张：步骤图 / 品牌 / 封面 / 二维码 / 背景
│   ├── video/                  太平山下车步行视频（720p，约 14.5 MB）
│   └── manifest.json           资源清单：每张图的来源与体积
│
├── source/                 ← 原始攻略存档（只读参考）
└── .github/workflows/      ← 自动重建工作流（当前未推上去，见第六节）
```

---

## 三、日常维护

### 1. 改文字

编辑 `content/*.md`，然后：

```bash
node build.mjs
```

### 2. 改站点标题 / 导航 / 页脚

都在 `site.config.json`：

| 字段 | 管什么 |
| --- | --- |
| `site.*` | 标题、副标题、SEO 描述与关键词、仓库地址 |
| `hero.*` | 首屏大标题、导语、CTA 按钮 |
| `stats[]` | 首屏下方那条数字（8 个口岸 / 4 条路线 / …） |
| `nav[]` | 目录章节顺序。**增删章节就是增删这个数组**，`file` 指向 `content/` 下的文件，`id` 是锚点 |
| `brand.*` | 组织名、品牌主张、Logo、**页脚署名**、CTA 链接 |
| `group.*` | 页尾的社群宣传（见下） |
| `egg.*` | 页尾彩蛋（见下） |
| `footer.*` | 页脚免责声明 |

### 3. 改配色 / 换主题

**所有主题变量都集中在 `src/css/base.css` 的 `:root`，别处不用动。**

当前生效的是**夜空主题**（深色）。常用变量：

```css
--paper-2: #0a0e16;   /* 页面底色 */
--paper:   #131a29;   /* 卡片面（不透明，压住背景照片） */
--ink:     #f2f5fa;   /* 标题字色 */
--ocean:   #6ba9e8;   /* 品牌海蓝（深色底下需提亮） */
--blue:    #004080;   /* 实心按钮用（按钮上是白字） */
--warn:    #ffd633;   /* 提示块的黄色 */
```

**换回浅色主题**有两条路：

- 完整备份：`src/css/themes/theme-light.css.bak`
- 取值速查：`base.css` **末尾的注释**里直接列出了浅色主题的全部变量值，复制覆盖到开头 `:root` 即可

> 首屏另有一组 `--hero-*` 变量（底色、字色、线稿、描边、Logo 底）。
> 两套主题取值不同：浅色是「天蓝底 + 白字」，夜空是「深蓝底 + 暖金描边字」。

### 4. 页面背景（烟花实拍）

背景是**三层叠出来的**，三个参数都在 `base.css`：

```css
--bg-image:     url("../img/bg-fireworks.jpg");  /* 照片，窄屏自动换 1000px 小图 */
--bg-scrim:     rgba(6, 10, 18, .80);            /* 压暗。改小=照片更明显 */
--bg-grid:      rgba(255, 255, 255, .05);        /* 格栅线。改大=更明显 */
--bg-grid-size: 46px;                            /* 格栅密度 */
```

正文卡片用不透明色，所以**照片不参与阅读**，只做氛围。想彻底撤掉照片，删掉 `--bg-image` 那一行即可。

### 5. 关掉烟花特效

删掉 `src/template.html` 里这一行，再 `node build.mjs`：

```html
<script src="assets/js/fireworks.js" defer></script>
```

或者只调行为：`src/js/fireworks.js` 里 `HUES` 是配色、粒子数看 `n`、持续时间看 `decay`。
点链接和按钮不会触发（避免干扰点按），触屏也不点火（省电）。
系统开启「减少动态效果」时，脚本整体不启动。

### 6. 换图 / 换视频

图片是**按文件名引用**的，所以**直接覆盖同名文件即可原地换图**。

- 新图放进 `assets/img/`，建议沿用 `route3-01-xxx.jpg` / `route4-01-xxx.jpg` 的命名规律；
- 视频替换 `assets/video/route-to-peak-observatory.mp4`（建议 H.264 + AAC、720p、加 `-movflags +faststart`）。

### 7. 页尾的社群宣传与彩蛋

两者都在 `site.config.json`，都带 `enabled` 开关。

**`group` 节 —— 社群宣传**（二维码 + 宣传语）

```json
"group": {
  "enabled": true,                              // false 即整块隐藏
  "qr": "assets/img/group-qr.jpg",              // 换码：同名覆盖即可
  "qrLabel": "扫码加入群聊",
  "headline": "✨ 我在龙大按快门 📷",
  "lines": ["欢迎加入群聊！", "……"]
}
```

> ⚠️ **微信群二维码只有 7 天有效期。** 过期后换掉 `assets/img/group-qr.jpg`，
> 或把 `enabled` 设为 `false` 整块拿掉。

**`egg` 节 —— 页尾彩蛋**（折叠，点击才展开）

展开后依次是：祝贺语 → 署名行 → 鲸鱼娘 + 投喂文案 → 经营收款码 → 联系方式。

```json
"egg": {
  "enabled": true,                    // false 则整块（含署名）都不渲染
  "hint": "Click here!",              // 折叠条上的花体提示
  "congrats": "🥰 恭喜你发现彩蛋 🎉",
  "mascot": "assets/img/egg-deepseek.png",
  "feed": "“喜欢的话，可以投喂我 token 小蛋糕😘”",
  "payQr": "assets/img/egg-pay-qr.png",
  "contact": "关于网站有任何意见…… 📫 tianruiyang@link.cuhk.edu.cn"
}
```

> 署名（策划 / 摄影 / 编辑）目前**只出现在彩蛋里**，页脚不常驻显示。
> 若想让它回到页脚明面，把 `build.mjs` 里的 `<details class="egg">` 改成
> `<div class="egg egg--open">` 并挪出 `<details>` 即可。

---

## 四、Markdown 扩展语法

`content/*.md` 就是普通 Markdown，另外加了几个站点专用的代码块。下面示例都**真实可用**，直接复制去改。

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

### 作品图（带图注的整幅图片）

图片独占一行时，自动渲染成带图注的作品图，第三个参数就是图注：

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
tone: paid        # paid（暖）| warn（红）| free（绿）| 留空
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

### 醒目提示（黄色块）

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
group: 证件和钱
- 港澳通行证 + 有效签注
- 八达通（实体卡或手机电子版）| 竖线后面是灰色小注
- 查好返程末班车 | 注解 | assets/img/app-citybus.jpg##城巴 Citybus::assets/img/app-1933.jpg##1933
```
````

- 第二段是灰色小注，可省略；
- 可选的第三段用来挂小图标，格式是 `图路径##显示名`，多个用 `::` 分隔。
- 勾选状态保存在浏览器 `localStorage`（键名 `vic-fireworks-checklist-v1`），不上传。

### 普通 Markdown

标题 `#`～`####`、`**加粗**`、`*斜体*`、`` `行内代码` ``、`[链接](url)`、`![图](path "说明")`、
`- 列表`（缩进两格成子列表）、`> 引用`、`| 表格 |`、`---` 分隔线，以及 `<https://…>` 形式的自动链接都支持。

---

## 五、本地预览

**最快的办法：双击根目录的 `预览网页.bat`。**

它只是替你打开 `index.html`。因为站内引用全是相对路径，**不搭服务器也能正常显示**。

想更接近线上环境的话：

```bash
npx serve .
# 或者
python -m http.server 8000
```

---

## 六、发布到 GitHub Pages

> **当前状态：已上线**
> <https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/>
>
> Pages 的 Source 是 **Deploy from a branch → main / (root)**，也就是直接发布仓库根目录里的
> `index.html`。所以**改完内容要先在本地 `node build.mjs`，再上传**，线上才会更新。

### 双击 `发布到GitHub.bat`

它依次做两件事。

**① 自动体检**（跑 `check.mjs`）

| 检查 | 能抓出什么 |
| --- | --- |
| 标签配平 | 手改 HTML 时删多了或漏了闭合标签 |
| **锚点死链** | 改了标题文字、却没跟着改目录里的 `#链接`（会提示页面上相近的 id） |
| 重复 id | 锚点会跳错位置 |
| 本地资源 | 图片／视频路径写错，或文件被移走 |
| 体积 | 页面过大，或视频超过 GitHub 单文件 100 MB 硬上限 |

体检不通过会停下来问你：

```
  仍然要上传吗？[Y=上传 / N=停下修改]
```

按 `N` 取消，什么都没改；按 `Y` 才继续。想单独体检：`node check.mjs`（有问题时退出码为 1）。

**② 自动选上传方式**

| 情况 | 走哪条路 |
| --- | --- |
| 找到令牌文件（`E:\dsh-token.txt` 或本目录 `.token.txt`） | **方式 A**：GitHub API，调 `upload.mjs` |
| 没找到令牌 | **方式 B**：`git push`，弹浏览器让你登录授权 |

### 手动上传（等价于方式 A）

```bash
node check.mjs                     # 1. 体检，有问题会以退出码 1 结束
node build.mjs                     # 2. content/*.md 编译成 index.html
node upload.mjs --dry-run          # 3. 看看会传哪些文件
node upload.mjs                    # 4. 上传
node verify.mjs                    # 5. 验收：本地与线上是否逐字节一致
```

`upload.mjs` 用 Node 自带的 `fetch` 直连 GitHub REST API（Git Data API：blob → tree → commit → 更新分支），
**不需要 git**，任何 Node 18+ 的环境都能跑。

### 关于缓存（重要）

GitHub Pages 给所有静态资源发 `Cache-Control: max-age=600`，浏览器会缓存 10 分钟。

**所以 `build.mjs` 会给每个 CSS/JS 链接自动追加内容哈希**，例如：

```
assets/css/base.css?v=f573888f
assets/js/fireworks.js?v=bb283b6a
```

文件一改哈希就变，链接随之改变，浏览器必然重新拉取 —— **访客不用清缓存**。

唯一例外是 `index.html` 自身。如果你刚上传完发现页面没变，用 `Ctrl + Shift + R` 强制刷新一次即可。

### 令牌权限说明

细粒度令牌需要 **Contents: Read and write**：

| 权限 | 加不加的差别 |
| --- | --- |
| **Contents: Read and write** | **必须**。没有它完全无法上传 |
| **Workflows: Read and write** | 可选。加了才能提交 `.github/workflows/` 下的文件。没加时 `upload.mjs` 会自动跳过该目录并提示，**不影响网页发布** |
| **Pages: Read and write** | 可选。只在想用脚本自动开关 Pages 时需要 |

令牌存放位置：`E:\dsh-token.txt`（一行，只放令牌本身）。该路径已列在 `.gitignore`，不会被提交。

### 关于「push 后自动重建」

仓库里带了 `.github/workflows/pages.yml`，但因为当前令牌没有 **Workflows** 权限，
这个文件**还没被推上去**。想让「改完 md 直接 push、线上自动重建」生效，二选一：

- **方案一**：给令牌补上 **Workflows: Read and write**，重新运行 `node upload.mjs`；
- **方案二**：在 GitHub 网页上手动新建 `.github/workflows/pages.yml`，把本地内容粘进去。

推上去之后，还要到 **Settings → Pages** 把 Source 从 `Deploy from a branch` 改成 **GitHub Actions**。

不加也完全没问题 —— 只是每次改完内容，记得**本地先 `node build.mjs` 再上传**。

---

## 七、素材与版权

- **正文照片**：来自原始攻略《国庆维港烟花路线》的 XMind 内嵌资源，与 PDF 中嵌入的是同一批图。
  `assets/manifest.json` 记录了每张图的来源文件与体积。
- **图片规格**：统一压缩到最长边 1920px、单张 ≤ 300 KB。
- **视频**：从 79 MB 的 HEVC 转码为约 14.5 MB 的 H.264 720p，并开启 `faststart`（可边下边播）。
- **品牌素材**：HOCEANIA 官方 Logo 取自组织设计物料。
- **应用图标**：城巴与 1933-KMB·LWB 的图标版权归各自公司所有，此处仅作指认用途。
- **出品**：祥波书院 · 海洋影像厂。

### 关于 `source/`

`source/` 存放原始攻略文件备查，详见 `source/README.md`。
原始 PDF（148.8 MB）与 XMind（146.9 MB）都超过 GitHub 单文件 100 MB 的硬上限，因此没有入库。
