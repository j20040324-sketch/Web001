# NOVAI Flow — 单品官网 Product Website

一个聚焦单一产品 **NOVAI Flow**（面向团队的 AI 工作流平台）的多页官网。
纯 **HTML / CSS / JavaScript**，无框架、无构建步骤，双语（中文为主 + 英文点缀），
首页精简主推，二级页展开细节。Lamborghini 风格的深色奢华设计。

## 页面 Pages

| 页面 | 文件 | 说明 |
|------|------|------|
| 首页 Home | `index.html` | 精简：主推 Hero + 三大价值 + 一个亮点 + CTA |
| 产品 Product | `product.html` | 详细：功能特性、工作原理、企业级保障 |
| 价格 Pricing | `pricing.html` | 免费 / 团队 / 企业 三档 + FAQ |
| 公司 Company | `company.html` | 关于、方法论、招聘 |
| 新闻 News | `news.html` | 动态 / 更新日志 |
| 联系 Contact | `contact.html` | 表单 + 联系方式 |
| 法律 Legal | `privacy/cookie/terms/legal.html` | 隐私 / Cookie / 条款 / 声明 |

## 导航

首页 · 产品 · 价格 · 公司 · 联系（+ 登录 / 免费试用）。

## 语言切换

页头 **中 / EN** 按钮，全站切换并记入 `localStorage`。中文是页面默认，英文写在每个元素的
`data-en` 属性里（`<title>` 用 `data-title-en`）；`js/main.js` 切换时整页替换并重注入页头/页脚。

## 架构

- `css/style.css` — 设计系统
- `js/main.js` — 注入共享页头/页脚、语言切换、移动菜单、吸顶、滚动渐入、计数器、演示表单

## 本地运行

```bash
python3 -m http.server 8000   # 打开 http://localhost:8000
```

> NOVAI / NOVAI Flow 为示例品牌，所有功能、价格与法律文本仅作演示。
