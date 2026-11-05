import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { JSDOM } from 'jsdom';

const origin = 'https://susu5.cn';
const sections = [
  ['home', 'Susu5｜AI 项目、个人网站与创作笔记', 'Susu5 的个人创作档案，记录用 AI 做项目、搭建个人网站、创作图片和整理实践笔记。'],
  ['projects', 'AI 项目与作品｜Susu5', '浏览 Susu5 的 AI 实践项目、个人网站、创作实验与作品。'],
  ['knowledge', 'AI 创作与项目实践知识库｜Susu5', '阅读 Susu5 的 AI 创作、个人网站设计、项目实践与工具笔记。'],
  ['gallery', 'AI 画作与图片库｜Susu5', '浏览 Susu5 的 AI 画作及创作记录。']
];
const featuredMetadata = {
  'project/4': ['用 AI 做个人网站｜从需求、域名到上线的建站 SOP｜Susu5', '一套用 AI 搭建个人网站的流程，从梳理需求、准备素材和制作预览，到发布上线、绑定域名与验收。'],
  'note/1': ['个人网站应该放什么？我的作品集设计减法｜Susu5', '从首页、项目详情到知识库，记录 Susu5 如何简化个人网站的内容和布局。'],
  'note/2': ['如何让一组 AI 图片保持风格一致？｜Susu5', 'Susu5 的 AI 图片创作记录，分享如何保留相似的色彩、光线和空间感，让不同画面呈现一致的风格。']
};

const publicOnly = item => item.publication !== 'draft' && item.state !== '草稿';

function meta(document, name, content) {
  const element = document.querySelector('meta[name="' + name + '"]') || document.createElement('meta');
  element.name = name;
  element.content = content;
  if (!element.isConnected) document.head.append(element);
}

function pageDescription(main, fallback) {
  const text = [...main.querySelectorAll('.prose p')].map(paragraph => paragraph.textContent.trim()).filter(Boolean)[0];
  return (text || fallback).replace(/\s+/g, ' ').trim().slice(0, 150);
}

export async function writePublicPages({ root, output }) {
  const [shell, raw] = await Promise.all([
    readFile(resolve(root, 'index.html'), 'utf8'),
    readFile(resolve(output, 'content.json'), 'utf8')
  ]);
  const content = JSON.parse(raw);
  const context = createContext({ SITE_DATA:content, URL });
  context.window = context;
  for (const name of ['site-paths.js','content-rules.js','content-covers.js','marked.umd.js','markdown-content.js','site.js']) {
    runInContext(await readFile(resolve(root, name), 'utf8'), context, { filename:name });
  }

  const pages = sections.map(([page, title, description]) => ({ page, title, description }));
  for (const [page, records] of [['project',content.projects], ['note',content.notes], ['image',content.arts]]) {
    for (const item of records.filter(publicOnly)) pages.push({ page, item });
  }
  pages.push({ page:'missing', title:'页面不存在｜Susu5', description:'返回 Susu5 的个人创作网站。' });
  const entries = new Map();

  for (const { page, item, title, description } of pages) {
    const pathname = page === 'missing' ? '/404.html' : context.SUSU_PATHS.publicPath(page, item?.id);
    if (!pathname || entries.has(pathname)) throw new Error('Invalid or duplicate public route for ' + page + '/' + item?.id);
    const dom = new JSDOM(shell);
    try {
      const { document } = dom.window;
      context.document = document;
      const main = document.querySelector('#main');
      context.SUSU_SITE.renderPage(main, page, item?.id);
      main.setAttribute('data-rendered', '');
      const active = { project:'/projects/', note:'/notes/', image:'/gallery/' }[page] || pathname;
      document.querySelector('.top nav a[href="' + active + '"]')?.setAttribute('aria-current', 'page');

      const override = featuredMetadata[page + '/' + item?.id];
      const name = item?.name || item?.title || '';
      document.title = title || override?.[0] || name + '｜Susu5';
      meta(document, 'description', description || override?.[1] || pageDescription(main, item.desc || item.alt || name));

      const copyright = document.getElementById('copyright');
      copyright.textContent = '© ' + new Date().getFullYear() + ' Susu5';

      if (page === 'missing') {
        meta(document, 'robots', 'noindex');
        await writeFile(resolve(output, '404.html'), dom.serialize());
        continue;
      }
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = origin + pathname;
      document.head.append(canonical);
      if (page === 'home') {
        const website = document.createElement('script');
        website.type = 'application/ld+json';
        website.textContent = JSON.stringify({ '@context':'https://schema.org', '@type':'WebSite', name:'Susu5', url:origin + '/' });
        document.head.append(website);
      }
      const folder = resolve(output, '.' + pathname);
      await mkdir(folder, { recursive:true });
      await writeFile(resolve(folder, 'index.html'), dom.serialize());
      const lastmod = item?.updatedAt || item?.publishedAt || item?.date;
      entries.set(pathname, /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(lastmod || '') && Number.isFinite(Date.parse(lastmod)) ? lastmod.slice(0, 10) : '');
    } finally {
      dom.window.close();
    }
  }

  const urls = [...entries].map(([pathname, lastmod]) =>
    '  <url><loc>' + origin + pathname + '</loc>' + (lastmod ? '<lastmod>' + lastmod + '</lastmod>' : '') + '</url>'
  );
  await Promise.all([
    writeFile(resolve(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n'),
    writeFile(resolve(output, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + origin + '/sitemap.xml\n')
  ]);
  return entries.size;
}
