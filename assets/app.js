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
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4.2"/>' +
      '<path d="M12 2.6v2.2M12 19.2v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>' +
      "</svg>",
    moon:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/>' +
      "</svg>",
    arrow:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M7 17 17 7M8.5 7H17v8.5"/>' +
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

  function renderHero() {
    const hero = $("#hero");
    if (!hero) return;

    themeButton = h("button", { class: "icon-btn", id: "themeToggle", type: "button" });
    themeButton.addEventListener("click", toggleTheme);
    hero.append(h("div", { class: "hero-tools" }, themeButton));

    const avatar = h("div", { class: "avatar", "aria-hidden": "true" });
    const avatarUrl = META.avatar ? safeUrl(META.avatar) : "";
    if (avatarUrl && !/^(?:mailto:|tel:)/i.test(avatarUrl) && !avatarUrl.startsWith("#")) {
      const image = h("img", { src: avatarUrl, alt: "" });
      image.addEventListener("error", () => {
        image.remove();
        avatar.textContent = initialOf(META.name || "N");
      });
      avatar.append(image);
    } else {
      avatar.textContent = initialOf(META.name || "N");
    }
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
