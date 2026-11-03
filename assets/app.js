/**
 * 个人导航页 · 交互逻辑
 * ---------------------------------------------------------------------------
 * 无依赖、无构建，浏览器直接运行。
 *
 * 阅读顺序：
 *   0. 常量与状态
 *   1. 通用工具（DOM / URL / 颜色 / 安全）
 *   2. 主题（深浅色切换 + 跟随系统 + 主题色派生）
 *   3. 渲染（头部 / 分区 / 卡片 / 页脚）
 *   4. 搜索过滤与高亮
 *   5. 快捷键与吸顶细节
 *   6. 启动
 *
 * 内容全部来自 data/site.config.js，这里只负责“怎么显示”。
 * 用户数据一律通过 textContent 写入，innerHTML 只用于本文件内的图标常量。
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------------ *
   * 0. 常量与状态
   * ------------------------------------------------------------------------ */
  const CONFIG = window.SITE || {};
  const META = CONFIG.meta || {};
  const THEME_KEY = "nav-theme";
  const FALLBACK_ACCENT = "#4f6ef7";

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);

  const ICONS = {
    sun:
      '<svg viewBox="0 0 24 24" class="is-line" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4.2"/>' +
      '<path d="M12 2.6v2.2M12 19.2v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>' +
      "</svg>",
    moon:
      '<svg viewBox="0 0 24 24" class="is-line" aria-hidden="true">' +
      '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/>' +
      "</svg>",
    arrow:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M7 17 17 7M8.5 7H17v8.5"/>' +
      "</svg>",
    // GitHub 标志是实心路径，用 .is-solid 让它走填充而不是描边
    github:
      '<svg viewBox="0 0 16 16" class="is-solid" aria-hidden="true">' +
      '<path d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" transform="scale(0.166667)" />' +
      "</svg>",
  };

  const state = {
    sections: [], // { el, countEl, cards: [{ el, nameEl, descEl, name, desc, search }] }
  };

  let themeButton = null;
  let searchInput = null;
  let searchClear = null;
  let emptyBox = null;
  let emptyHint = null;
  let emptyReset = null;
  let searchStatus = null;
  let statusTimer = 0;

  /* ------------------------------------------------------------------------ *
   * 1. 通用工具
   * ------------------------------------------------------------------------ */

  /** 轻量 DOM 构造器：text 走 textContent，html 仅用于可信的 SVG 常量。 */
  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === "text") node.textContent = String(value);
      else if (key === "html") node.innerHTML = value;
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value === true ? "" : String(value));
    });
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  /** 只放行 http(s)、mailto、tel 与同站相对路径，挡住 javascript: 等协议。 */
  function safeUrl(raw) {
    if (typeof raw !== "string") return "";
    const url = raw.trim();
    if (!url) return "";
    if (/^(?:#|\/(?!\/)|\.{1,2}\/)/.test(url)) return url;
    try {
      const parsed = new URL(url, window.location.href);
      if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) return parsed.href;
    } catch (error) {
      /* 非法 URL，忽略 */
    }
    return "";
  }

  /** 绝对 http(s) 链接才算外链，其余（相对路径、mailto）在当前页打开。 */
  function isExternal(url) {
    if (!/^https?:/i.test(url)) return false;
    try {
      return new URL(url).origin !== window.location.origin;
    } catch (error) {
      return true;
    }
  }

  /** 允许 http(s)、协议相对、站点相对路径与 data:image 作为图标。 */
  function isImageUrl(value) {
    return (
      /^(?:https?:)?\/\//i.test(value) ||
      /^(?:\.{1,2}\/|\/(?!\/))/i.test(value) ||
      /^data:image\//i.test(value)
    );
  }

  /** 头像允许内联的 SVG 体积上限，避免误把超大文件塞进 DOM。 */
  const AVATAR_SVG_LIMIT = 128 * 1024;

  /** `meta.avatar` 直接写成 <svg>…</svg> 源码时走内联分支。 */
  function isSvgMarkup(value) {
    return /^\s*<svg[\s>]/i.test(String(value || ""));
  }

  /** 以 .svg 结尾的图片地址（允许带 ?query 或 #fragment）。 */
  function isSvgUrl(url) {
    return /\.svg(?:[?#]|$)/i.test(String(url || ""));
  }

  /**
   * 清洗 SVG 源码，返回可以内联的节点。
   * 去掉脚本类元素、事件属性、外链引用，并给 id 加前缀避免同页重复；
   * 解析失败返回 null，调用方退回 <img> 或名字首字。
   */
  function sanitizeSvg(markup, prefix = "avatar-svg-") {
    if (typeof markup !== "string" || markup.length > AVATAR_SVG_LIMIT) return null;
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    if (!doc || doc.getElementsByTagName("parsererror").length) return null;

    const svg = doc.documentElement;
    if (!svg || svg.tagName.toLowerCase() !== "svg") return null;

    const FORBIDDEN = new Set([
      "script", "foreignobject", "iframe", "object", "embed", "audio", "video", "canvas", "link",
    ]);
    const REMOTE = /url\(\s*['"]?(?:https?:|\/\/|javascript:)/i;
    const nodes = [svg, ...svg.querySelectorAll("*")];

    nodes.forEach((node) => {
      if (FORBIDDEN.has(node.tagName.toLowerCase())) {
        node.remove();
        return;
      }
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;
        if (name.startsWith("on")) {
          node.removeAttribute(attribute.name);
        } else if (name === "href" || name === "xlink:href" || name === "src") {
          // 只认同文档锚点与 data:image，外部文件引用会被浏览器再请求一次
          if (!value.trim().startsWith("#") && !/^data:image\//i.test(value)) {
            node.removeAttribute(attribute.name);
          }
        } else if (name === "style") {
          if (/expression\(|@import|url\(\s*['"]?(?:https?:|\/\/|javascript:)/i.test(value)) {
            node.removeAttribute(attribute.name);
          }
        } else if (REMOTE.test(value)) {
          node.removeAttribute(attribute.name);
        }
      });
    });

    // id 加前缀，避免与页面其它元素（或另一份内联图标）撞名
    const renamed = new Map();
    nodes.forEach((node) => {
      const id = node.getAttribute("id");
      if (!id) return;
      renamed.set(id, prefix + id);
      node.setAttribute("id", prefix + id);
    });
    if (renamed.size) {
      const swap = (text) =>
        text.replace(/#([\w:.-]+)/g, (match, id) => (renamed.has(id) ? "#" + renamed.get(id) : match));
      const REF = [
        "href", "xlink:href", "fill", "stroke", "filter", "mask", "clip-path",
        "marker-start", "marker-mid", "marker-end", "style",
      ];
      nodes.forEach((node) => {
        REF.forEach((name) => {
          const value = node.getAttribute(name);
          if (!value || value.indexOf("#") === -1) return;
          const next = swap(value);
          if (next !== value) node.setAttribute(name, next);
        });
      });
      svg.querySelectorAll("style").forEach((style) => {
        const text = style.textContent || "";
        const next = swap(text);
        if (next !== text) style.textContent = next;
      });
    }


    if (!svg.getAttribute("viewBox")) {
      const w = parseFloat(svg.getAttribute("width"));
      const h2 = parseFloat(svg.getAttribute("height"));
      if (w > 0 && h2 > 0) svg.setAttribute("viewBox", `0 0 ${w} ${h2}`);
    }

    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    return document.importNode(svg, true);
  }

  /** 取回同源 SVG 源码再内联；file:// 与跨域取不到源码时返回 null。 */
  async function fetchSvg(url) {
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) return null;
      const type = response.headers.get("content-type") || "";
      if (type && !/svg/i.test(type)) return null;
      return sanitizeSvg(await response.text());
    } catch (error) {
      return null;
    }
  }

  function hostOf(url) {
    if (!/^(?:https?:|mailto:|tel:)/i.test(url)) return "";
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.protocol === "mailto:" || parsed.protocol === "tel:") return parsed.pathname;
      return parsed.hostname.replace(/^www\./i, "");
    } catch (error) {
      return "";
    }
  }

  /** 名字首字，用于头像与图标；中文取第一个汉字，英文取大写首字母。 */
  function initialOf(name) {
    const chars = Array.from(String(name || "").trim());
    return (chars[0] || "N").toUpperCase();
  }

  /** 由名字稳定推导色相，让每个卡片的图标有细微色差。 */
  function hueOf(name) {
    let hash = 0;
    const text = String(name || "");
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash % 360;
  }

  function normalizeHex(input) {
    if (typeof input !== "string") return "";
    let hex = input.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    return /^[0-9a-f]{6}$/i.test(hex) ? "#" + hex.toLowerCase() : "";
  }

  function hexToRgb(hex) {
    const match = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    if (!match) return null;
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    };
  }

  function rgbToHsl(r, g, b) {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;
    let hue = 0;
    let saturation = 0;

    if (max !== min) {
      const delta = max - min;
      saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      switch (max) {
        case red:
          hue = (green - blue) / delta + (green < blue ? 6 : 0);
          break;
        case green:
          hue = (blue - red) / delta + 2;
          break;
        default:
          hue = (red - green) / delta + 4;
      }
      hue *= 60;
    }
    return { h: hue, s: saturation * 100, l: lightness * 100 };
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /* ------------------------------------------------------------------------ *
   * 2. 主题与主题色
   * ------------------------------------------------------------------------ */
  function storedTheme() {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === "light" || value === "dark" ? value : "";
    } catch (error) {
      return "";
    }
  }

  function currentTheme() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  function updateThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", currentTheme() === "dark" ? "#0a0e17" : "#f6f7fb");
  }

  function syncThemeButton() {
    if (!themeButton) return;
    const dark = currentTheme() === "dark";
    const label = dark ? "切换到浅色模式" : "切换到深色模式";
    themeButton.innerHTML = dark ? ICONS.sun : ICONS.moon;
    themeButton.setAttribute("aria-label", label);
    themeButton.title = label;
  }

  function setTheme(theme, persist) {
    root.dataset.theme = theme === "dark" ? "dark" : "light";
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, root.dataset.theme);
      } catch (error) {
        /* 隐私模式无法保存，忽略 */
      }
    }
    updateThemeColor();
    syncThemeButton();
  }

  function toggleTheme() {
    setTheme(currentTheme() === "dark" ? "light" : "dark", true);
  }

  function watchSystemTheme() {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => {
      // 用户手动选过主题就不再跟随系统
      if (!storedTheme()) setTheme(event.matches ? "dark" : "light", false);
    };
    if (typeof media.addEventListener === "function") media.addEventListener("change", onChange);
    else if (typeof media.addListener === "function") media.addListener(onChange);
  }

  /** 写入 --accent / --accent-deep，其余颜色由 CSS 的 color-mix 派生。 */
  function applyAccent(value) {
    const hex = normalizeHex(value) || FALLBACK_ACCENT;
    const rgb = hexToRgb(hex);
    if (!rgb) return FALLBACK_ACCENT;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const deepLightness = Math.max(16, Math.min(hsl.l - 14, 54));
    const deep = `hsl(${Math.round(hsl.h)}, ${Math.round(Math.min(92, hsl.s + 4))}%, ${Math.round(
      deepLightness
    )}%)`;
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-deep", deep);
    return hex;
  }

  function setFavicon(color) {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) return;
    const letter = escapeXml(initialOf(META.name || "N"));
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      `<rect width="64" height="64" rx="18" fill="${color}"/>` +
      '<text x="32" y="34" font-family="-apple-system, Segoe UI, sans-serif" font-size="30" ' +
      'font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">' +
      letter +
      "</text></svg>";
    link.setAttribute("href", "data:image/svg+xml," + encodeURIComponent(svg));
  }

  function greetingText() {
    const now = new Date();
    const hour = now.getHours();
    let part = "晚上好";
    if (hour < 5) part = "夜深了";
    else if (hour < 9) part = "早上好";
    else if (hour < 12) part = "上午好";
    else if (hour < 14) part = "中午好";
    else if (hour < 18) part = "下午好";
    else if (hour >= 23) part = "夜深了";
    const week = "日一二三四五六"[now.getDay()];
    return `${part} · ${now.getMonth() + 1}月${now.getDate()}日 周${week}`;
  }

  /* ------------------------------------------------------------------------ *
   * 3. 渲染
   * ------------------------------------------------------------------------ */
  function normalizeLink(raw) {
    if (!raw || typeof raw !== "object") return null;
    const url = safeUrl(raw.url);
    if (!url) return null;
    const host = hostOf(url);
    const name = String(raw.name || host || "未命名站点").trim() || "未命名站点";
    const desc = raw.desc === undefined || raw.desc === null ? "" : String(raw.desc).trim();
    const icon = typeof raw.icon === "string" ? raw.icon.trim() : "";
    return { name, url, desc, icon, host };
  }

  function normalizeSections() {
    if (!Array.isArray(CONFIG.sections)) return [];
    return CONFIG.sections
      .map((section) => {
        if (!section || typeof section !== "object") return null;
        const links = (Array.isArray(section.links) ? section.links : [])
          .map(normalizeLink)
          .filter(Boolean);
        return {
          title: String(section.title || "未命名分组"),
          links,
        };
      })
      .filter((section) => section && section.links.length > 0);
  }

  function normalizeSocial() {
    if (!Array.isArray(CONFIG.social)) return [];
    return CONFIG.social
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const url = safeUrl(item.url);
        if (!url) return null;
        const label = String(item.label || item.name || hostOf(url) || "").trim();
        if (!label) return null;
        return { label, url, icon: typeof item.icon === "string" ? item.icon.trim() : "" };
      })
      .filter(Boolean);
  }

  function applyMeta() {
    const title = META.title || (META.name ? `${META.name} · 导航` : "个人导航");
    document.title = String(title);
    const description = META.description
      ? String(META.description)
      : `${META.name || "我"}的常用站点、工具与收藏。`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute("content", description);
  }

  /**
   * 头像优先级：内联 SVG 源码 → .svg 地址（先尝试内联）→ 普通图片 → 名字首字。
   * 内联后的 SVG 能跟随 CSS（currentColor / 变量），缩放也不会糊。
   */
  function renderAvatar(avatar) {
    const showInitials = () => {
      avatar.classList.remove("has-media");
      avatar.textContent = initialOf(META.name || "N");
    };
    showInitials();

    const raw = typeof META.avatar === "string" ? META.avatar.trim() : "";
    if (!raw) return;

    if (isSvgMarkup(raw)) {
      const node = sanitizeSvg(raw);
      if (!node) return;
      avatar.replaceChildren(node);
      avatar.classList.add("has-media");
      return;
    }

    const url = safeUrl(raw);
    if (!url || /^(?:mailto:|tel:)/i.test(url) || url.startsWith("#")) return;

    const showImage = () => {
      const image = h("img", { src: url, alt: "", decoding: "async" });
      image.addEventListener("load", () => avatar.classList.add("has-media"), { once: true });
      image.addEventListener("error", () => {
        image.remove();
        showInitials();
      });
      avatar.replaceChildren(image);
    };

    if (!isSvgUrl(url)) {
      showImage();
      return;
    }

    // 同源 SVG 先内联；双击打开（file://）或跨域读不到源码时退回 <img>。
    fetchSvg(url).then((node) => {
      if (!node) {
        showImage();
        return;
      }
      avatar.replaceChildren(node);
      avatar.classList.add("has-media");
    });
  }

  // utils/repo.js
  function getRepoUrl() {
    const raw = META.repo;
    const repo = typeof raw === 'string' ? raw.trim() : '';
    return safeUrl(repo);
  }

    /** 默认的 GitHub 标志：可信常量，解析一次成节点即可。 */
  function defaultRepoIcon() {
    const template = document.createElement("template");
    template.innerHTML = ICONS.github;   // ICONS.github 自带 class="is-solid"
    return template.content.firstElementChild;
  }

  /**
   * 仓库按钮图标，优先级：
   *   1. meta.icon 写成 <svg>…</svg>  → 清洗后内联（可跟随 currentColor / 主题）
   *   2. meta.icon 是图片地址          → <img>（.svg 文件也走这条，浏览器自己等比缩放）
   *   3. 留空 / 地址非法 / 加载失败     → 默认 ICONS.github
   */
  function getRepoIcon() {
    const raw = typeof META.repoIcon === "string" ? META.repoIcon.trim() : "";
    if (!raw) return defaultRepoIcon();

    if (isSvgMarkup(raw)) return sanitizeSvg(raw, "repo-icon-") || defaultRepoIcon();

    if (!isImageUrl(raw)) return defaultRepoIcon();

    const image = h("img", { class: "icon-img", src: raw, alt: "", decoding: "async" });
    // 地址看着合法但实际 404 / 不是图片时，也回退到默认标志
    image.addEventListener("error", () => image.replaceWith(defaultRepoIcon()), { once: true });
    return image;
  }

  function renderHero() {
    const hero = $("#hero");
    if (!hero) return;

    themeButton = h("button", { class: "icon-btn", id: "themeToggle", type: "button" });
    themeButton.addEventListener("click", toggleTheme);
    const repoUrl = getRepoUrl();
    const repoLink = repoUrl
      ? h(
          "a",
          {
            class: "icon-btn",
            href: repoUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-label": "查看源码",
            title: "查看源码",
          },
          getRepoIcon()
        )
      : null;

    hero.append(h("div", { class: "hero-tools" }, repoLink, themeButton));
    // const repoIcon = getRepoIcon();
    // hero.append(
    //   h(
    //     "div",
    //     { class: "hero-tools" },
    //     h("a", repoUrl ? {
    //       class: "icon-btn",
    //       href: repoUrl,
    //       target: "_blank",
    //       rel: "noopener noreferrer",
    //       "aria-label": "查看源码",
    //       title: "查看源码",
    //       html: repoIcon,
    //     } : null),
    //     themeButton
    //   )
    // );

    const avatar = h("div", { class: "avatar", "aria-hidden": "true" });
    renderAvatar(avatar);
    hero.append(avatar);

    if (META.greeting !== false) {
      hero.append(h("p", { class: "hero-greeting", text: greetingText() }));
    }
    hero.append(h("h1", { class: "hero-name", text: String(META.name || "个人导航") }));
    if (META.tagline) {
      hero.append(h("p", { class: "hero-tagline", text: String(META.tagline) }));
    }

    const socials = normalizeSocial();
    if (socials.length) {
      const nav = h("nav", { class: "social", "aria-label": "社交链接" });
      socials.forEach((item) => nav.append(createSocialLink(item)));
      hero.append(nav);
    }

    syncThemeButton();
  }

  function createSocialLink(item) {
    const external = isExternal(item.url);
    const link = h("a", {
      class: "social-link" + (item.icon ? " has-icon" : ""),
      href: item.url,
      ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
    });
    if (item.icon) {
      link.append(h("span", { class: "social-icon", "aria-hidden": "true", text: item.icon }));
    }
    link.append(h("span", { text: item.label }));
    return link;
  }

  function createIcon(link) {
    const iconEl = h("span", { class: "icon", "aria-hidden": "true" });
    iconEl.style.setProperty("--h", String(hueOf(link.name)));

    if (link.icon && isImageUrl(link.icon)) {
      const image = h("img", { src: link.icon, alt: "", loading: "lazy" });
      image.addEventListener("error", () => {
        image.remove();
        iconEl.textContent = initialOf(link.name);
      });
      iconEl.append(image);
    } else {
      iconEl.textContent = link.icon || initialOf(link.name);
    }
    return iconEl;
  }

  function createCard(link) {
    const external = isExternal(link.url);
    const cardEl = h("a", {
      class: "card",
      href: link.url,
      ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
      title: link.host ? `${link.name} · ${link.host}` : link.name,
    });

    const nameEl = h("span", { class: "card-name", text: link.name });
    const titleRow = h(
      "div",
      { class: "card-title-row" },
      nameEl,
      h("span", { class: "card-arrow", html: ICONS.arrow, "aria-hidden": "true" })
    );

    const body = h("div", { class: "card-body" }, titleRow);
    let descEl = null;
    if (link.desc) {
      descEl = h("div", { class: "card-desc", text: link.desc });
      body.append(descEl);
    }

    cardEl.append(createIcon(link), body);

    return {
      el: cardEl,
      nameEl,
      descEl,
      name: link.name,
      desc: link.desc,
      search: [link.name, link.desc, link.host, link.url].join(" ").toLowerCase(),
    };
  }

  function renderSections() {
    const wrap = $("#sections");
    if (!wrap) return;

    const sections = normalizeSections();
    state.sections = [];
    wrap.textContent = "";

    if (!sections.length) {
      showConfigEmpty();
      return;
    }

    sections.forEach((section, index) => {
      const countEl = h("span", { class: "section-count", "aria-hidden": "true" });
      const sectionEl = h(
        "section",
        { class: "section", "aria-labelledby": `section-title-${index}` },
        h(
          "div",
          { class: "section-head" },
          h("h2", { class: "section-title", id: `section-title-${index}`, text: section.title }),
          countEl,
          h("span", { class: "section-rule", "aria-hidden": "true" })
        )
      );

      const grid = h("div", { class: "grid" });
      const cards = section.links.map((link) => {
        const card = createCard(link);
        grid.append(card.el);
        return card;
      });

      sectionEl.append(grid);
      wrap.append(sectionEl);
      countEl.textContent = String(cards.length);
      state.sections.push({ el: sectionEl, countEl, cards });
    });
  }

  function showConfigEmpty() {
    emptyBox = $("#empty");
    emptyHint = $("#emptyHint");
    emptyReset = $("#emptyReset");
    if (emptyBox) emptyBox.hidden = false;
    const title = emptyBox ? $(".empty-title", emptyBox) : null;
    if (title) title.textContent = "还没有添加任何站点";
    if (emptyHint) {
      emptyHint.textContent = "打开 data/site.config.js，在 sections 里添加第一个链接，刷新即可看到。";
    }
    if (emptyReset) emptyReset.hidden = true;
    const searchWrap = $("#searchWrap");
    if (searchWrap) searchWrap.hidden = true;
  }

  function renderFooter() {
    const footer = $("#footer");
    if (!footer) return;

    const year = new Date().getFullYear();
    const copy = String(META.footer || "© {year} " + (META.name || "")).replace(
      /\{year\}/g,
      String(year)
    );

    footer.append(
      h("span", { class: "footer-copy", text: copy }),
      h(
        "span",
        { class: "footer-hint" },
        h("kbd", { class: "footer-kbd", text: "/" }),
        h("span", { text: "搜索" }),
        h("span", { class: "footer-dot", text: "·" }),
        h("kbd", { class: "footer-kbd", text: "Esc" }),
        h("span", { text: "清空" })
      )
    );
  }

  /* ------------------------------------------------------------------------ *
   * 4. 搜索与高亮
   * ------------------------------------------------------------------------ */
  /** 用 textContent 拼出 <mark>，避免把配置内容当成 HTML 注入。 */
  function renderHighlight(element, text, query) {
    if (!element) return;
    const source = String(text || "");
    if (!query) {
      if (element.textContent !== source) element.textContent = source;
      return;
    }

    const lower = source.toLowerCase();
    let cursor = 0;
    let found = lower.indexOf(query);
    if (found === -1) {
      if (element.textContent !== source) element.textContent = source;
      return;
    }

    const fragment = document.createDocumentFragment();
    while (found !== -1) {
      if (found > cursor) fragment.append(source.slice(cursor, found));
      fragment.append(h("mark", { text: source.slice(found, found + query.length) }));
      cursor = found + query.length;
      found = lower.indexOf(query, cursor);
    }
    if (cursor < source.length) fragment.append(source.slice(cursor));

    element.textContent = "";
    element.append(fragment);
  }

  function announce(message) {
    if (!searchStatus) return;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      searchStatus.textContent = message;
    }, 400);
  }

  function applyFilter(rawValue) {
    const query = String(rawValue || "").trim();
    const needle = query.toLowerCase();
    const searching = needle.length > 0;
    let visibleTotal = 0;

    state.sections.forEach((section) => {
      let visible = 0;
      section.cards.forEach((card) => {
        const matched = !searching || card.search.includes(needle);
        card.el.hidden = !matched;
        if (!matched) return;
        visible += 1;
        renderHighlight(card.nameEl, card.name, needle);
        renderHighlight(card.descEl, card.desc, needle);
      });
      section.el.hidden = visible === 0;
      section.countEl.textContent = String(visible);
      visibleTotal += visible;
    });

    if (emptyBox) emptyBox.hidden = !searching || visibleTotal > 0;
    if (searchClear) searchClear.hidden = !searching;
    if (searching && visibleTotal === 0 && emptyHint) {
      emptyHint.textContent = `没有与「${query}」匹配的站点，换个更短的关键词试试。`;
    }
    announce(searching ? `找到 ${visibleTotal} 个站点` : "");
  }

  function firstVisibleCard() {
    for (const section of state.sections) {
      if (section.el.hidden) continue;
      const card = section.cards.find((item) => !item.el.hidden);
      if (card) return card.el;
    }
    return null;
  }

  function resetSearch() {
    if (!searchInput) return;
    searchInput.value = "";
    applyFilter("");
    searchInput.focus();
  }

  function initSearch() {
    searchInput = $("#search");
    searchClear = $("#searchClear");
    emptyBox = $("#empty");
    emptyHint = $("#emptyHint");
    emptyReset = $("#emptyReset");
    searchStatus = $("#searchStatus");

    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        if (event.isComposing) return;
        applyFilter(searchInput.value);
      });

      searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          if (searchInput.value) {
            searchInput.value = "";
            applyFilter("");
          } else {
            searchInput.blur();
          }
        } else if (event.key === "Enter") {
          const first = firstVisibleCard();
          if (first && searchInput.value.trim()) {
            event.preventDefault();
            first.click();
          }
        }
      });
    }

    if (searchClear) searchClear.addEventListener("click", resetSearch);
    if (emptyReset) emptyReset.addEventListener("click", resetSearch);
  }

  /* ------------------------------------------------------------------------ *
   * 5. 快捷键与吸顶细节
   * ------------------------------------------------------------------------ */
  function bindShortcuts() {
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      const isSlash =
        event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey;
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (!isSlash && !isCommandK) return;
      event.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  function initStickySearch() {
    const wrap = $("#searchWrap");
    if (!wrap) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      wrap.classList.toggle("is-stuck", wrap.getBoundingClientRect().top <= 10.5);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
  }

  /* ------------------------------------------------------------------------ *
   * 6. 启动
   * ------------------------------------------------------------------------ */
  function init() {
    const accent = applyAccent(META.accent);
    setFavicon(accent);
    applyMeta();
    renderHero();
    renderSections();
    renderFooter();
    initSearch();
    initStickySearch();
    bindShortcuts();
    watchSystemTheme();
    updateThemeColor();
    syncThemeButton();

    if (state.sections.length) applyFilter("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
