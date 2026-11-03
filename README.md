# Susu 个人创作网站

网站：https://susu5.cn/
后台：https://susu5.cn/admin/

本站使用 GitHub Pages 托管。页面从 content.json 读取已发布的项目、知识库、图片、个人资料和首页推荐。后台保留纯白、玉绿和粗宋风格，并支持手机端。

## 内容管理

后台使用 GitHub 登录，仅允许站点管理员 susu5。服务端会同时核对账号 ID 和网站仓库 ID。GitHub 应用需要安装到 susu5.github.io 仓库，授予 Contents 读写和 Metadata 读取权限。

保存草稿只写入后台私有数据库。点击发布后，服务端将选定内容和它引用的图片提交到本仓库，GitHub Pages 自动构建；后台确认线上内容版本已更新后显示成功。发布失败可以重试，其他草稿不会随之发布。删除已经发布的内容会同时从线上列表移除。

GitHub 密钥、登录会话、草稿和未发布图片由独立服务保管，不存储在这个公开仓库。后台登录服务尚未配置或不可用时，不会提供模拟登录入口。

## 开发

本目录是原生 HTML、CSS、JavaScript 网站，无须构建。请使用本地 HTTP 服务预览，不要直接双击 HTML，因为页面需要读取 JSON。

- site.js：公开网站页面与交互。
- content-loader.js：加载已发布内容。
- content-covers.js：项目与知识库封面规则。
- admin/：管理界面与服务端 API 适配。
- jade.css：纯白、玉绿、粗宋与移动端样式。

不要直接修改 content.json 来管理内容，下一次后台发布会按后台保存的内容更新它。修改网站结构和样式时可以正常提交代码，后台发布会保留这些文件。

字体与 Markdown 解析器的许可证随对应资源提供。

## 长期维护

日常编辑使用后台，不需要打开 Codex。发布仍依赖网站托管、GitHub 以及后台服务正常运行。当前后台服务使用 Sites 托管；迁移到站点所有者的独立 Cloudflare 账号完成前，不应把它视为已完全独立部署。

后台「备份与恢复」用于导出当前草稿、已发布内容、设置及引用图片；ZIP 包含私有草稿，请保存在本人控制的存储位置。导入或历史恢复只更新后台草稿，前台仍保留当前已发布内容；检查后再逐项发布。历史记录有限，不能代替下载到独立位置的备份。凭据、登录会话和 GitHub 密钥不在内容备份中，迁移时需要单独配置登录服务。

前台维护说明见 [docs/维护说明.md](docs/维护说明.md)。后台完整源码和独立部署说明将存放在所有者的私有仓库 `susu5/susu5-admin`。

## 自动检查与发布

需要 Node.js 24。运行 `node --test scripts/validate-site.test.mjs` 和 `node scripts/validate-site.mjs` 检查 JavaScript、公开数据、关联文章、图片文件及私有字段。运行 `node scripts/package-site.mjs` 会新建 `_site/`，只复制网站需要的文件；该目录必须不存在，避免把上次构建残留内容带入新版本。

GitHub Actions 的 `Check and publish website` 工作流在 main 更新时运行；检查成功才部署到 GitHub Pages。失败时线上保留上一版。手动重试在仓库 Actions 页面进行。Pages 的发布来源需设置为 GitHub Actions；维护记录应注明是否已切换。
