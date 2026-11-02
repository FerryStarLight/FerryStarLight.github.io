# 个人导航

一个零依赖、零构建的静态个人导航主页：所有站点集中在一个配置文件里，改完刷新即可；打开速度快，也方便长期维护。

***整个项目主要由AI完成, 包括这个README.md.***

## 特性

- **配置驱动**：站点、分组、社交链接全部写在 `data/site.config.js`，不碰渲染代码。
- **即时搜索**：`/` 或 `Ctrl/⌘ + K` 聚焦，实时过滤并高亮命中文字，`Enter` 直接打开第一个结果。
- **深浅双主题**：默认跟随系统，可手动切换并记住选择；没有白屏闪烁。
- **一个变量换主题色**：修改 `meta.accent`，卡片、光晕、图标与 favicon 自动跟随。
- **矢量头像**：`meta.avatar` 支持 SVG —— 同源图标会内联进页面，可跟随 CSS 变量、任意缩放不糊；取不到源码时自动退回 `<img>`。
- **纯静态**：CSS、JS、数据全部本地加载，无 CDN、无外部字体、无追踪；双击 `index.html` 就能用。
- **细节完整**：响应式栅格、键盘可达、跳过导航、`prefers-reduced-motion`、无 JS 提示、搜索无结果状态。
- **不到 50 KB**：未压缩的 HTML + CSS + JS + 配置，无任何运行时依赖。

## 快速开始

直接双击 `index.html` 即可预览。也可以起一个本地静态服务器：

```bash
npx serve .
# 或
python -m http.server 8000
```

## 目录结构

```text
homepage/
├── index.html            # 页面骨架（结构语义化，内容由 JS 渲染）
├── assets/
│   ├── style.css         # 设计变量、布局、组件样式
│   └── app.js            # 渲染、搜索、主题、快捷键
├── data/
│   ├── site.config.js    # ← 日常只需要改这个文件
│   ├── avatar.svg        # 头像（SVG 会内联进页面）
│   └── avataricon.png    # 头像原始位图，avatar.svg 由它拟合而来
└── README.md
```

## 日常维护

### 1. 改个人信息

```js
meta: {
  name: "九歌",
  tagline: "在代码与文字之间，留一点光。",
  description: "九歌的个人导航。",
  avatar: "./data/avatar.svg", // 留空显示名字首字；SVG 会内联，其它格式按普通图片显示
  accent: "#4f6ef7",       // 任意 HEX 颜色
  footer: "© {year} 九歌", // {year} 会自动替换为当前年份
  greeting: true,          // 名字上方的问候与日期
}
```

#### 头像支持 SVG

`meta.avatar` 有四种写法，按优先级从高到低：

| 写法 | 行为 |
| --- | --- |
| `avatar: "<svg …>…</svg>"` | 直接内联这段 SVG 源码 |
| `avatar: "./data/avatar.svg"` | 同源 SVG 先取回源码再内联（可跟随主题色、缩放不糊），取不到源码时退回 `<img>` |
| `avatar: "./data/avataricon.png"` | 普通图片，加载失败回退首字 |
| `avatar: ""` | 显示名字首字 |

内联的 SVG 会去掉 `<script>`、事件属性、外链引用，并给 `id` 加 `avatar-svg-` 前缀，避免和别的元素撞名；因此手写图标里用 `mask` / `clipPath` / `id` 都是安全的。双击 `index.html`（`file://`）时 `fetch` 不可用，会自动走 `<img>` 分支，显示效果一致。

### 2. 增删站点

在对应分组里加一行即可，顺序就是页面顺序：

```js
{
  name: "Figma",
  url: "https://www.figma.com/",
  desc: "界面设计与原型",   // 选填，参与搜索
  icon: "",                // 选填，见下方“图标”
}
```

### 3. 新增分组

```js
sections: [
  // ...
  {
    title: "阅读",
    links: [
      { name: "少数派", url: "https://sspai.com/", desc: "效率与数码生活" },
    ],
  },
]
```

空分组会被自动忽略；没有配置任何链接时，页面会显示引导提示。

### 4. 图标

按优先级：

1. `icon: "https://…/icon.png"` —— 图片地址，加载失败自动回退为首字；
2. `icon: "🎧"` —— emoji；
3. 不填 —— 自动取名称首字，并根据名称生成稳定的低饱和配色。

## 配置字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `meta.name` | ✓ | 站点名 / 你的名字 |
| `meta.tagline` |  | 一句话简介 |
| `meta.description` |  | 页面 `<meta description>` |
| `meta.title` |  | 浏览器标题，默认「名字 · 导航」 |
| `meta.avatar` |  | 头像：SVG 源码 / SVG 地址（内联）/ 图片地址；留空则用首字 |
| `meta.accent` |  | 主题色，HEX 格式 |
| `meta.footer` |  | 页脚文字，支持 `{year}` |
| `meta.greeting` |  | 设为 `false` 可隐藏问候语 |
| `social[].label` | ✓ | 社交入口文字 |
| `social[].url` | ✓ | 链接 |
| `social[].icon` |  | emoji |
| `sections[].title` | ✓ | 分组标题 |
| `sections[].links[].name` | ✓ | 站点名称 |
| `sections[].links[].url` | ✓ | `http(s)`、`mailto:`、`tel:` 或相对路径 |
| `sections[].links[].desc` |  | 一句话描述 |
| `sections[].links[].icon` |  | emoji 或图片地址 |

> 为保证安全，只识别 `http(s)`、`mailto:`、`tel:` 与相对路径，其余协议会被忽略。
> 站外 `http(s)` 链接在新标签页打开，相对路径与 `mailto:` 在当前页打开。

## 主题与视觉定制

- **换主题色**：只改 `meta.accent`。派生色写在 `style.css` 的 `@supports (color: color-mix(...))` 中，深浅模式各不相同。
- **换字体**：`--font` 变量；默认使用系统字体栈，中文依次回退到苹方 / 微软雅黑 / Noto Sans SC。
- **调布局**：`--radius-*`、`--shadow-*`、`.shell` 的 `max-width`、`.grid` 的 `minmax(220px, 1fr)`。
- **改深色配色**：`style.css` 第 1 节的 `[data-theme="dark"]`。

## 快捷键

| 按键 | 行为 |
| --- | --- |
| `/` | 聚焦搜索框 |
| `Ctrl / ⌘ + K` | 聚焦搜索框 |
| `Esc` | 清空搜索，或退出输入框 |
| `Enter` | 打开当前搜索结果的第一个站点 |

## 部署

纯静态文件，无需构建：

- **GitHub Pages**：把整个目录推到仓库，Settings → Pages 选择分支根目录。
- **Vercel / Netlify / Cloudflare Pages**：直接拖入目录，或连接仓库，无需构建命令。
- **任意静态托管 / 对象存储**：上传目录即可；资源全部使用相对路径，放在子路径下也能正常工作。

## 设计说明与扩展

**为什么不用框架？** 一个导航页的交互只有渲染、搜索、主题三类，原生 JS 加注释不到 750 行就足够；没有构建步骤，就不会过期，也不会为了升级依赖而返工。

**为什么数据是 JS 而不是 JSON？** 用 `<script>` 加载可以同时支持 `file://` 直接打开和任何静态托管，避免 `fetch` 的跨域限制。想换成 JSON/接口时，只需把 `renderSections()` 的数据来源改成异步，其余渲染逻辑不用动。

**可以继续加什么？**

- 分组折叠、置顶 / 拖拽排序（配合 `localStorage`）；
- 通过 `fetch` 从书签服务、Notion 或 API 动态读取数据；
- 多语言（把界面文案抽成字典）；
- 添加 `manifest.webmanifest`，变成可安装的 PWA；
- 用 favicon 服务批量生成图标（会引入外部请求，按需取舍）：在 `icon` 中填 `https://www.google.com/s2/favicons?domain=github.com&sz=64`。

**兼容性**：在 Chromium / Edge / Safari / Firefox 的现代版本中正常。`color-mix` 不可用时自动退回内置的强调色，功能不受影响。

> 欢迎fork本项目. Fork后请将 `data/site.config.js` 里的联系方式替换成自己的内容再发布. 
