import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { writePublicPages } from './public-pages.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('public build includes crawlable HTML, canonical links and only published sitemap entries', async t => {
  const output = await mkdtemp(join(tmpdir(), 'susu-pages-'));
  t.after(() => rm(output, { recursive:true, force:true }));
  const live = {
    projects:[
      { id:4, name:'个人网站', desc:'网站项目', status:'已完成', relatedArticleIds:[1],
        body:'## 直接可抓取\n\n这段正文来自网站发布数据。\n\n![配图](assets/example.png)\n\n<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)">' },
      { id:9, name:'私有草稿', publication:'draft' }
    ],
    notes:[{ id:1, title:'设计减法', group:'项目实践', body:'原始笔记正文。' }],
    arts:[{ id:'painting-1', name:'山水', group:'画作', body:'画作介绍。', url:'assets/painting.webp', width:100, height:100 }],
    profile:{ name:'Susu', avatar:'assets/avatar.png' }
  };
  await writeFile(join(output, 'content.json'), JSON.stringify(live));
  assert.equal(await writePublicPages({ root, output }), 7);
  const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
  assert.doesNotMatch(sitemap, /\/admin\/|projects\/9\/|404\.html|#/);
  const paths = [...sitemap.matchAll(/<loc>https:\/\/susu5\.cn(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(paths, ['/', '/projects/', '/notes/', '/gallery/', '/projects/personal-website/', '/notes/website-design-simplification/', '/gallery/painting-1/']);
  assert.match(await readFile(join(output, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/susu5\.cn\/sitemap\.xml/);
  for (const path of paths) {
    const html = await readFile(resolve(output, '.' + path, 'index.html'), 'utf8');
    const dom = new JSDOM(html);
    try {
      const doc = dom.window.document;
      assert.equal(doc.querySelector('link[rel="canonical"]').href, 'https://susu5.cn' + path);
      assert.ok(doc.querySelector('#main[data-rendered] h1'));
      assert.ok(doc.querySelector('meta[name="description"]').content);
      for (const asset of doc.querySelectorAll('script[src],link[rel="stylesheet"]')) {
        assert.ok((asset.getAttribute('src') || asset.getAttribute('href')).startsWith('/'));
      }
      if (path === '/projects/personal-website/') {
        const prose = doc.querySelector('#content-body');
        assert.match(prose.textContent, /直接可抓取/);
        assert.equal(prose.querySelector('img').getAttribute('src'), '/assets/example.png');
        assert.equal(prose.querySelectorAll('img').length, 1);
        assert.equal(prose.querySelector('script,[onerror]'), null);
        assert.ok(doc.querySelector('a[href="/notes/website-design-simplification/"]'));
      }
      if (path === '/notes/website-design-simplification/') {
        assert.match(doc.querySelector('#content-body').textContent, /原始笔记正文/);
      }
      if (path === '/gallery/painting-1/') {
        assert.match(doc.querySelector('#image-body').textContent, /画作介绍/);
      }
    } finally { dom.window.close(); }
  }
  await assert.rejects(access(join(output, 'projects', '9', 'index.html')), { code:'ENOENT' });
  assert.match(await readFile(join(output, '404.html'), 'utf8'), /name="robots" content="noindex"/);
});
