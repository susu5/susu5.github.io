import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const source = async name => readFile(new URL('../' + name, import.meta.url), 'utf8');
async function environment(t, files = []) {
  const dom = new JSDOM('<main id="main"></main>', { runScripts:'outside-only', url:'https://susu5.cn/' });
  t.after(() => dom.window.close());
  for (const file of files) dom.window.eval(await source(file));
  return dom.window;
}
const bodyScripts = ['marked.umd.js', 'markdown-content.js'];
const fixtures = {
  projects:[{ id:1, name:'Old', title:'Old', desc:'', links:[] }, { id:2, name:'New', title:'New', desc:'', links:[], createdAt:'2026-11-09' }],
  notes:[
    { id:1, title:'Middle', summary:'栏目A', group:'栏目A', date:'2026-11-02' },
    { id:2, title:'Old', summary:'栏目B', group:'栏目B', date:'2026-10-02' },
    { id:3, title:'Newest', summary:'栏目B', group:'栏目B', date:'2026-11-09' }
  ],
  arts:[{ id:'1', name:'Old', url:'assets/old.png' }, { id:'uuid', name:'New', url:'assets/new.png', uploadedAt:'2026-11-09' }]
};

test('one chronology rule includes drafts in admin and excludes them on public pages', async t => {
  const w = await environment(t, ['content-rules.js']);
  const items = [{ id:1 }, { id:4, publishedAt:'2026-11-04' }, { id:5, createdAt:'2026-11-09' }, { id:6, publication:'draft', createdAt:'2026-11-10' }];
  const ids = list => Array.from(list, item => item.id);
  assert.deepEqual(ids(w.SUSU_CONTENT.newestFirst(items, 'projects')), [6,5,4,1]);
  assert.deepEqual(ids(w.SUSU_CONTENT.latest(items, 'projects')), [5,4,1]);
  assert.deepEqual(ids(items), [1,4,5,6]);
  assert.equal(w.SUSU_CONTENT.latest([{id:1,date:'2026-11-09'}, {id:2,date:'2026-11-02',updatedAt:'2026-11-10'}], 'articles')[0].id, 1);
  assert.equal(w.SUSU_CONTENT.latest(fixtures.arts, 'images')[0].id, 'uuid');
});

test('public projects, gallery and articles stay globally chronological across categories', async t => {
  const w = await environment(t, ['content-rules.js', 'site-paths.js', 'content-covers.js', ...bodyScripts]);
  w.SITE_DATA = structuredClone(fixtures);
  w.eval(await source('site.js'));
  const main = w.document.querySelector('main');
  w.SUSU_SITE.renderPage(main, 'knowledge');
  assert.deepEqual(Array.from(main.querySelectorAll('.entry a'), a => a.textContent), ['Newest','Middle','Old']);
  w.SUSU_SITE.renderPage(main, 'projects');
  assert.equal(main.querySelector('.project-copy h2').textContent, 'New');
  w.SUSU_SITE.renderPage(main, 'gallery');
  assert.equal(main.querySelector('.gallery-grid a, .art-grid a, a[href^="/gallery/"]').getAttribute('href'), '/gallery/uuid/');
});

test('admin sorted rows preserve their original edit indices and include unpublished drafts', async t => {
  const w = await environment(t, ['content-rules.js']);
  w.eval(`
    var records = ${JSON.stringify({projects:fixtures.projects,articles:fixtures.notes})};
    var photos = ${JSON.stringify(fixtures.arts)};
    var main=document.querySelector('main'), tab='articles', selected=0, serverState=null;
    var safe=value=>String(value??''), publishedItem=()=>null;
  `);
  w.eval(await source('admin/project-layout.js') + '\nwindow.rows=projectList;');
  w.document.querySelector('main').innerHTML = w.rows();
  assert.equal(w.document.querySelector('tbody button').dataset.project, 'edit:1');
  w.eval(await source('admin/library-layout.js') + '\nwindow.libraryRows=libraryRows;');
  const table = w.document.createElement('table');
  table.innerHTML = '<tbody>' + w.libraryRows() + '</tbody>';
  assert.equal(table.querySelector('button').dataset.library, 'edit:2');
  w.eval("tab='images'");
  table.innerHTML = '<tbody>' + w.libraryRows() + '</tbody>';
  assert.equal(table.querySelector('button').dataset.library, 'edit:1');
});

test('plain Markdown and legacy rich paragraphs render headings, emphasis, links, lists and tables', async t => {
  const w = await environment(t, bodyScripts);
  const main = w.document.querySelector('main');
  const cases = [
    '## 标题\n\n**加粗**和[链接](https://example.com)\n\n- 项目一\n- 项目二\n\n| A | B |\n| --- | --- |\n| 1 | 2 |',
    '<!--susu-rich-text-->\n<p><br></p><p>## 标题</p><p>**加粗**和[链接](https://example.com)</p><p>- 项目一</p><p>- 项目二</p><p>| A | B |</p><p>| --- | --- |</p><p>| 1 | 2 |</p>'
  ];
  for (const value of cases) {
    w.renderContentMarkdown(main, value);
    for (const selector of ['h2', 'strong', 'a[href="https://example.com/"]', 'ul li', 'table td']) assert.ok(main.querySelector(selector), selector);
    assert.equal(main.querySelectorAll('ul li').length, 2);
    assert.doesNotMatch(main.textContent, /\*\*|##|\]\(/);
  }
});

test('rich normalization preserves existing formatting, image paths, literal code and sanitization', async t => {
  const w = await environment(t, bodyScripts);
  const main = w.document.querySelector('main');
  const value = '<!--susu-rich-text-->\n<h2>原生标题</h2><p><strong>原生加粗</strong>和 **新加粗**</p><p><a href="https://example.com">链接</a><code>**literal**</code></p><pre><code>## literal\n**literal**</code></pre><p><img src="assets/a.png" onerror="alert(1)"></p><script>alert(1)</script><p>[bad](javascript:alert(1))</p>';
  w.renderContentMarkdown(main, value);
  assert.equal(main.querySelectorAll('strong').length, 2);
  assert.equal(main.querySelector('code').textContent, '**literal**');
  assert.equal(main.querySelector('pre').textContent, '## literal\n**literal**');
  assert.equal(main.querySelector('img').getAttribute('src'), '/assets/a.png');
  assert.equal(main.querySelector('script,[onerror],[href^="javascript:"]'), null);
  const rendered = main.innerHTML;
  w.renderContentMarkdown(main, w.SUSU_BODY.richMarker + rendered);
  assert.equal(main.innerHTML, rendered, 'repeated edits must not progressively change formatting');
});

test('visual editor parses plain and HTML Markdown pastes before saving', async t => {
  const w = await environment(t, bodyScripts);
  w.eval(`var safe=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');var markDirty=()=>{};`);
  w.eval(await source('admin/body-editor.js') + '\nwindow.editorMarkup=bodyEditorMarkup;window.mountEditor=mountBodyEditor;');
  w.document.queryCommandValue = () => 'p';
  w.document.queryCommandState = () => false;
  w.document.execCommand = (action, _, value) => {
    if (action === 'insertHTML') {
      w.document.querySelector('.body-edit').insertAdjacentHTML('beforeend', value);
      w.document.querySelector('.body-edit').dispatchEvent(new w.Event('input', {bubbles:true}));
    }
    return true;
  };
  for (const html of ['', '<p>## 粘贴标题</p><p>**粘贴加粗**</p>']) {
    const main = w.document.querySelector('main');
    main.innerHTML = w.editorMarkup({body:''});
    const root = main.firstElementChild;
    w.mountEditor(root, {body:''});
    const event = new w.Event('paste', {bubbles:true,cancelable:true});
    event.clipboardData = {files:[],getData:type => type === 'text/html' ? html : '## 粘贴标题\n\n**粘贴加粗**'};
    root.querySelector('.body-edit').dispatchEvent(event);
    const saved = root.readBody();
    const preview = w.document.createElement('div');
    w.renderContentMarkdown(preview, saved.body);
    assert.equal(preview.querySelector('h2').textContent, '粘贴标题');
    assert.equal(preview.querySelector('strong').textContent, '粘贴加粗');
  }
});

test('mixed rich paragraphs preserve fenced code, blank lines and HTML characters', async t => {
  const w = await environment(t, bodyScripts);
  const main = w.document.querySelector('main');
  w.renderContentMarkdown(main, '<!--susu-rich-text-->\n<p>```html</p><p>&lt;div&gt;**literal** &amp; value&lt;/div&gt;</p><p><br></p><p>second line</p><p>```</p>');
  assert.equal(main.querySelector('pre code').textContent, '<div>**literal** & value</div>\n\n\nsecond line\n');
  assert.equal(main.querySelector('strong'), null);
});

test('the reported article format renders mixed Markdown without changing stored content', async t => {
  const w = await environment(t, bodyScripts);
  // Keep a fixed reproduction: tests must survive future article edits/deletions.
  const note = {body:'<!--susu-rich-text-->\n<p>**它仍然在重新连接**。</p><p>## 一、工作</p><p>## 二、连接</p><p>## 三、工具</p><p>## 四、使用</p><p>## 五、记录</p><p>- **检测入口**，先缩小范围。</p><p>[项目说明](https://github.com/susu5/SusuClash)</p><p><img src="assets/example1.png"></p><p><img src="assets/example2.png"></p>'};
  const original = note.body;
  const main = w.document.querySelector('main');
  w.renderContentMarkdown(main, note.body);
  assert.equal(main.querySelector('strong').textContent, '它仍然在重新连接');
  assert.ok(main.querySelectorAll('h2').length >= 5);
  assert.ok(main.querySelector('ul li strong'));
  assert.ok(main.querySelector('a[href="https://github.com/susu5/SusuClash"]'));
  assert.equal(main.querySelectorAll('img').length, 2);
  assert.doesNotMatch(main.textContent, /\*\*|##|\]\(https:/);
  assert.equal(note.body, original);
});
