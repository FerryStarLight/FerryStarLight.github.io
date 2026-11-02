/**
 * 站点内容配置 —— 日常维护只需要改这一个文件。
 *
 * 字段说明见 README.md，最简单的做法是：
 *   1. 改 meta 里的名字、简介、主题色；
 *   2. 在 sections 里增删分组，在 links 里增删站点。
 *
 * 链接字段：
 *   name  必填，站点名称
 *   url   必填，http(s) / mailto / 相对路径
 *   desc  选填，一句话介绍（同时参与搜索）
 *   icon  选填，emoji 或图片地址；不填则自动生成首字母图标
 */
window.SITE = {
  meta: {
    name: "渡一缕星光",
    tagline: "自上不会人情世故, 自下不懂油盐酱醋. ",
    description: "渡一缕星光的个人导航 -- 用于常用网站和个人网页导航",
    avatar: "./data/template.png", // 留空则显示名字首字；也可填图片地址
    accent: "#4f6ef7", // 主题色，改成你喜欢的任意 HEX 颜色
    footer: "© {year} FerryLight · 保持好奇 - Developed by AI",
    greeting: true, // 是否在名字上方显示问候与日期
  },

  // 顶部社交链接，图标可选
  social: [
    { label: "GitHub", url: "https://github.com/FerryStarLight", icon: "" },
    { label: "Bilibili", url: "https://space.bilibili.com/3546914905655301", icon: "" },
    { label: "知乎", url: "https://www.zhihu.com/people/ferrystar", icon: "" },
  ],

  sections: [
    {
      title: "常用",
      links: [
        { name: "GitHub", url: "https://github.com/", desc: "代码、开源与协作" },
        { name: "知乎", url: "https://www.zhihu.com/", desc: "问答与长文" },
        { name: "哔哩哔哩", url: "https://www.bilibili.com/", desc: "视频与学习区" },
        { name: "Mc百科", url: "https://www.mcmod.cn/v2/", desc: "Minecraft中文Mod百科" },
        { name: "DeepSeek", url: "https://chat.deepseek.com/", desc: "肥鱼网页对话端" },
      ],
    },
    
    {
      title: "学习",
      links: [
        { name: "DeepSeek", url: "https://chat.deepseek.com/", desc: "肥鱼网页对话端" },
        { name: "知乎", url: "https://www.zhihu.com/", desc: "问答与长文" },
        { name: "Desmos", url: "https://www.desmos.com/", desc: "数学绘图工具" },
        { name: "WolframAlpha", url: "https://zh.wolframalpha.com/", desc: "数学计算器" },
        { name: "菜鸟教程", url: "https://www.runoob.com/", desc: "IT领域教程" },
        { name: "中科大", url: "https://i.ustc.edu.cn/", desc: "中国科学技术大学官网" },
      ],
    },
    {
      title: "工具",
      links: [
        { name: "Github 文件下载代理", url: "https://github.akams.cn/", desc: "Github 文件代理, 加速下载" },
      ],
    },
    {
      title: "游戏",
      links: [
        { name: "McWiki", url: "https://zh.minecraft.wiki/", desc: "Minecraft中文维基" },
        { name: "LittleSkin", url: "https://littleskin.cn/", desc: "Little Skin 皮肤站" },
        { name: "Mc百科", url: "https://www.mcmod.cn/v2/", desc: "Minecraft中文Mod百科" },
        { name: "TUF论坛", url: "https://tuforums.com/", desc: "The Universal Forums" },
      ],
    },
    {
      title: "生活",
      links: [
        { name: "哔哩哔哩", url: "https://www.bilibili.com/", desc: "视频与学习区" },
        { name: "网易云音乐", url: "https://music.163.com/", desc: "歌单与电台" },
        { name: "必应", url: "https://cn.bing.com/", desc: "搜索引擎" },
        { name: "每日天文一图", url: "https://apod.nasa.gov/apod/astropix.html", desc: "NASA 的今日宇宙" },
      ],
    },
    {
      title: "个人网页",
      links: [
        { name: "个人导航页", url: "https://ferrystarlight.github.io", desc: "导航站" },
      ],
    },
  ],
};
