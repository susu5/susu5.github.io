# Susu 个人创作网站

解压后双击 `index.html` 即可浏览。网站使用原生 HTML、CSS 和 JavaScript，图片和字体随目录提供。也可将整个目录放到静态网站主机。

| 页面 | 地址 |
|---|---|
| 首页 | `index.html#home` |
| 项目列表 | `index.html#projects` |
| 项目详情 | `index.html#project/2` |
| 图片库 | `index.html#gallery` |
| 知识库 | `index.html#knowledge` |
| 笔记详情 | `index.html#note/1` |

首页支持 100 格项目墙和封面视图，项目列表可按名称和简介搜索，图片库可按类别筛选。手机端精选卡可横向滑动，图片库为单列。

## 更新内容

- 项目、笔记、画作标题及分类在 `data.js`。示例图片在 `assets/`，画作文件对应关系在 `site.js` 的 `artAssets`。
- 页头和页尾在 `index.html`。在 `data.js` 的 `SITE_CONTACTS` 中填写联系方式的显示名和链接，邮箱链接使用 `mailto:`。
- 纯白、玉绿、粗宋及手机端覆盖样式集中在 `jade.css`。标题使用自带的思源宋体粗体，正文优先使用设备宋体并回退到随附的思源宋体。
- 当前项目、画作和笔记均为示例内容。公众号、社交账号和邮箱等真实信息可在上线前换入。

思源宋体与 Geist Mono 的字体许可随文件位于 `assets/`。
