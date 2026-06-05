# AETHER 科技服务 — Tech Services Website

一个多页、Lamborghini 风格的豪华企业站,内容为**科技服务公司 AETHER**(云 · AI · 安全 · 软件开发)。
纯 **HTML / CSS / JavaScript**,无框架、无构建步骤,双语(中文为主 + 英文点缀),可深入点击,
每个版块完善,并包含完整的法律条款页。

## 页面 Pages

| 页面 | 文件 |
|------|------|
| 首页 Home | `index.html` |
| 服务总览 Services | `services.html` |
| Aether 云 Cloud | `cloud.html` |
| Aether 智能 Intelligence | `intelligence.html` |
| Aether 安全 Secure | `secure.html` |
| Aether 开发 Build | `build.html` |
| 公司 Company | `company.html` |
| 新闻 News | `news.html` |
| 联系 Contact | `contact.html` |
| 隐私政策 Privacy | `privacy.html` |
| Cookie 政策 | `cookie.html` |
| 服务条款 Terms | `terms.html` |
| 法律声明 Legal Notice | `legal.html` |

## 借鉴自 Lamborghini.com 的设计技巧

- 电影感全屏 hero + 超大标题、奢华近黑配色 + 香槟金强调色
- 滚动时变半透明的吸顶导航 + 服务下拉菜单
- 悬停填充按钮、动画下划线导航
- 滚动渐入动画(IntersectionObserver)与数字滚动计数
- 交替大图区块、能力清单、合作方案分级
- 多栏完整页脚(订阅、社交、法律链接)

## 语言切换 Language switch

- 页头有 **中 / EN** 切换按钮,点击即可全站在中文与英文之间切换,选择记入 `localStorage`(键 `aether-lang`),刷新或跳转后保持。
- 机制:中文是页面默认内容,英文写在每个可翻译元素的 `data-en` 属性里(输入框用 `data-en-placeholder`,`<title>` 用 `data-title-en`);`js/main.js` 切换时整页替换并按所选语言重新注入页头/页脚。

## 架构

- `css/style.css` — 完整设计系统
- `js/main.js` — 把共享的**页头**与**页脚**注入每个页面(`#site-header` / `#site-footer` 占位),
  并初始化语言切换、移动菜单、吸顶、滚动渐入、计数器与演示表单。改一处导航,全站同步。

## 本地运行

```bash
python3 -m http.server 8000   # 打开 http://localhost:8000
```

> 设计与交互参考 lamborghini.com,内容从零重写。AETHER 为虚构公司,
> 所有服务、价格与法律文本仅为示例,不构成法律意见。
