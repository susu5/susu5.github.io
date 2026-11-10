const projects=SUSU_CONTENT.latest(window.SITE_DATA.projects,'projects');
const notes=SUSU_CONTENT.latest(window.SITE_DATA.notes,'articles');
const arts=SUSU_CONTENT.latest(window.SITE_DATA.arts,'images');
const galleryArts=arts;
const { publicPath } = SUSU_PATHS;
let wallView='overview', artFilter='全部';
const assetUrl = url => typeof url === 'string' && url.startsWith('assets/') ? '/' + url : url;
const svg=(content,cls='arrow')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${content}</svg>`;
const arrow=()=>svg('<path d="M4 12h15m-6-6 6 6-6 6"/>');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=id=>String(id).padStart(3,'0');
const status=p=>`<span class="status"><i class="dot ${p.status==='已完成'?'done':'doing'}"></i>${esc(p.status||p.state||'进行中')}</span>`;
function cover(value){const item=typeof value==='object'?value:projects.find(project=>String(project.id)===String(value));return SUSU_COVERS.render('projects',item||{});}
function fanCard(title,type,href,visual,index){const rot=[-18,-9,0,9,18],y=[28,14,0,14,28];return `<a class="hand" href="${href}" style="--r:${rot[index]}deg;--y:${y[index]}px;--z:${index===2?5:4-Math.abs(index-2)}"><div class="hand-image">${visual}</div><h3>${esc(title)}</h3><div class="hand-bottom"><span>${type}</span>${arrow()}</div></a>`}
function wallTools(){return `<div class="wall-toolbar"><div class="legend"><span><i class="dot done"></i>已完成</span><span><i class="dot doing"></i>进行中</span><span><i class="dot empty"></i>未开始</span></div><div class="toggle" aria-label="项目墙视图"><button data-view="overview" aria-pressed="${wallView==='overview'}">格子总览</button><button data-view="covers" aria-pressed="${wallView==='covers'}">大图浏览</button></div></div>`}

const contactIcons = {
  wechat: '<path d="M14 8a6 6 0 0 0-5-2.5c-3.4 0-6 2-6 4.6 0 1.2.6 2.2 1.6 3l-.6 2 2.3-1.1a8 8 0 0 0 2.1.5"/><path d="M20.7 15.2c0-2.2-2.2-4-5-4s-5 1.8-5 4 2.2 4 5 4c.6 0 1.2-.1 1.8-.3l2 1-.5-1.7c1.1-.7 1.7-1.8 1.7-3Z"/><path d="M7 9.5h.1m3.4 0h.1m3.3 5h.1m3.2 0h.1" stroke-linecap="round"/>',
  social: '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="8" r="2.5"/><path d="M2.8 18v-1.8a4.2 4.2 0 0 1 8.4 0V18m2-2v-.2a3.8 3.8 0 0 1 7.6 0V18"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  github: '<path d="M9 19.5c-3 .9-3-1.5-4.2-1.9m8.4 3v-2.3c0-.7.2-1.2.5-1.5 2.8-.3 5.6-1.4 5.6-6.2 0-1.3-.5-2.5-1.3-3.4.1-.4.6-1.6-.2-3.3 0 0-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C5.7 3.6 4.6 4 4.6 4c-.8 1.7-.3 2.9-.2 3.3a4.8 4.8 0 0 0-1.3 3.4c0 4.8 2.8 5.9 5.6 6.2.3.3.5.8.5 1.5v2.3" transform="translate(1 .1)"/>'
};

function contactRows() {
  const profile = SITE_DATA.profile || {};
  return [
    { icon:'wechat', label:'微信公众号', name:profile.wechatPublic },
    { icon:'wechat', label:'微信', name:profile.wechat },
    { icon:'email', label:'联系邮箱', name:profile.email, href:profile.email ? 'mailto:' + profile.email : '' },
    { icon:'github', label:'GitHub', name:profile.github, href:profile.github ? 'https://github.com/' + encodeURIComponent(profile.github) : '' }
  ].map(({icon, label, name, href}) => {
    const content = `${svg(contactIcons[icon], 'social-icon')}<span><span class="social-label">${esc(label)}</span><span class="social-name">${esc(name || '待填写')}</span></span>${arrow()}`;
    if (/^(https:\/\/|mailto:)/i.test(href)) {
      return `<a class="social-row" href="${esc(href)}">${content}</a>`;
    }
    return `<button type="button" class="social-row" data-social="${esc(label)}" data-contact-name="${esc(name)}">${content}</button>`;
  }).join('');
}

function imagePath(image){return publicPath('image', image.id)}
function homeCards(items){return items.map(({kind,item},i)=>{
 const href=publicPath({projects:'project',images:'image',articles:'note'}[kind], item.id);
 return fanCard(item.title||item.name,{projects:'项目',articles:'知识库',images:'图片'}[kind],href,SUSU_COVERS.render(kind,item),i);
}).join('')}
function home(){
 const selection=SUSU_CONTENT.resolveHome({projects,articles:notes,images:arts},SITE_DATA.home||{});
 const hero=selection.hero;
 const profile={name:'Susu',tag:'@AI Agent',headline:'把好奇心，做成作品。',english:'Making things. Following curiosity.',avatar:'assets/susu-avatar.png',...SITE_DATA.profile};
 const heroCaption=selection.heroMode==='manual'?(SITE_DATA.home?.caption||hero?.name):hero?.name;
 return `<section class="opening">${hero?`<a class="hero" href="${imagePath(hero)}" aria-label="查看大图与介绍：${esc(hero.name)}"><picture><img fetchpriority="high" src="${esc(assetUrl(hero.url))}" width="${Number(hero.width)||1536}" height="${Number(hero.height)||1024}" alt="${esc(hero.alt||hero.name)}"></picture><div class="hero-caption"><span>${esc(heroCaption)}</span><span>${esc(hero.group||'图片')} · 查看大图与介绍 ${arrow()}</span></div></a>`:''}<div class="identity"><div class="identity-person"><img class="avatar" src="${esc(assetUrl(profile.avatar))}" width="48" height="48" alt="${esc(profile.name)} 的头像"><span>${esc(profile.name)}</span></div><div class="identity-intro"><div class="intro-heading"><h1>${esc(profile.headline).replace(/，|\n/g,char=>char==='，'?'，<br>':'<br>')}</h1><span class="agent-label" lang="en">${esc(profile.tag)}</span></div><p lang="en">${esc(profile.english)}</p></div><div class="socials" aria-label="联系方式">${contactRows()}</div></div></section><section class="selected"><div class="section-heading"><h2>最近，正在着迷</h2><p>项目、画作与笔记。<br>把此刻的兴趣，留在手边。</p></div><div class="fan">${homeCards(selection.featured)}</div></section><section class="wall" aria-labelledby="wall-title"><div class="wall-layout"><div class="wall-heading"><div class="wall-title"><span class="hundred">100</span><h2 id="wall-title">个想法，<br><span class="wall-ai-label">用 AI</span> 慢慢实现。</h2></div><p class="wall-progress">创作进度：<br>${projects.filter(p=>p.status==='已完成').length} 个已完成 · ${projects.filter(p=>p.status==='进行中').length} 个进行中 · ${100-projects.length} 个未开始</p><a href="${publicPath('projects')}" class="text-link">查看全部项目 ${arrow()}</a></div><div class="wall-body">${wallTools()}<div id="wall-content">${wallContent()}</div><div class="wall-note">100 个位置，一眼看见创作的轨迹。</div></div></div></section>`}
function wallContent(){return wallView==='overview'?`<div class="grid100">${Array.from({length:100},(_,i)=>{const p=projects.find(p=>p.id===i+1);return p?`<a class="cell ${p.status==='已完成'?'done':'doing'}" href="${publicPath('project',p.id)}" title="${pad(p.id)} ${esc(p.name||p.title)} · ${p.status}" aria-label="${pad(p.id)} ${esc(p.name||p.title)}，${p.status}">${pad(p.id)}</a>`:`<span class="cell" aria-label="${pad(i+1)} 未开始">${pad(i+1)}</span>`}).join('')}</div>`:`<div class="covers">${projects.map(p=>`<a class="cover-card" href="${publicPath('project',p.id)}">${cover(p.id)}<div class="cover-meta"><span class="mono">${pad(p.id)}</span>${status(p)}</div><h3>${esc(p.name||p.title)}</h3></a>`).join('')}</div>`}
function projectRows(q=''){const found=projects.filter(p=>(p.name+p.desc).includes(q.trim()));return found.length?found.map(p=>`<article class="project-row"><a href="${publicPath('project',p.id)}" aria-label="查看${esc(p.name||p.title)}">${cover(p.id)}</a><div class="project-copy"><span class="project-id mono">${pad(p.id)}</span><h2><a href="${publicPath('project',p.id)}">${esc(p.name||p.title)}</a></h2><p>${esc(p.desc||p.summary||'')}</p></div>${status(p)}</article>`).join(''):`<p class="empty-result">没有找到相关项目，换个关键词试试。</p>`}
function projectList(){return `<section class="page list-page"><div class="page-head"><h1>项目</h1><p>把好奇心，做成作品。</p></div><label class="searchbox" style="display:block">${svg('<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>')}<input id="project-search" type="search" placeholder="搜索项目" aria-label="搜索项目名称与简介"></label><div id="project-rows">${projectRows()}</div><p class="list-count" id="project-count" aria-live="polite">共 ${projects.length} 个项目</p></section>`}
function projectDetail(id){
 const p=projects.find(p=>Number(p.id)===Number(id));if(!p)return missing();
 const relatedIds=Array.isArray(p.relatedArticleIds)?[...new Set(p.relatedArticleIds.map(Number))]:[];
 const related=relatedIds.map(id=>notes.find(note=>Number(note.id)===id)).filter(Boolean),next=projects[(projects.indexOf(p)+1)%projects.length];
 const details=p.detailFiles||[],links=(p.links||[]).filter(link=>/^https?:\/\//i.test(link.url||''));
 return `<article class="page project-detail"><a href="${publicPath('projects')}" class="back">${arrow()}全部项目</a><div class="detail-heading"><span class="project-number">${pad(p.id)} / 项目</span><h1>${esc(p.name||p.title)}</h1><p>${esc(p.desc||p.summary||'')}</p></div><figure class="detail-art">${cover(p)}</figure><div class="detail-body"><div class="facts"><span>${esc(p.type||'项目')}</span>${status(p)}</div>${links.length?`<section class="project-links"><h2>项目链接</h2><div>${links.map(link=>`<a class="text-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.platform)} ${arrow()}</a>`).join('')}</div></section>`:''}<div class="prose" id="content-body" data-content-kind="projects" data-content-id="${esc(p.id)}"></div>${details.length?`<div class="art-pair">${details.filter(file=>file?.url).map(file=>`<figure><img src="${esc(assetUrl(file.url))}" alt="${esc(file.alt||file.name||'')}">${file.name?`<figcaption>${esc(file.name)}</figcaption>`:''}</figure>`).join('')}</div>`:''}${related.length?`<section class="related" aria-labelledby="related-heading"><h2 id="related-heading">关联知识库</h2><ul class="related-list">${related.map(note=>`<li><a class="text-link" href="${publicPath('note',note.id)}">${esc(note.title)} ${arrow()}</a></li>`).join('')}</ul></section>`:''}<nav class="end-nav" aria-label="项目导航"><a href="${publicPath('projects')}">${arrow()}项目列表</a>${next&&next!==p?`<a href="${publicPath('project',next.id)}">下一个项目 ${arrow()}</a>`:''}</nav></div></article>`;
}
function gallery(){const groups=['全部',...new Set(arts.map(a=>a.group).filter(Boolean))];return `<section class="page gallery-page"><div class="page-head"><h1>图片库</h1><p>一些不存在的风景，一些留下来的想象。</p></div><div class="filter" aria-label="画作分类">${groups.map(g=>`<button data-filter="${esc(g)}" aria-pressed="${artFilter===g}">${esc(g)}</button>`).join('')}</div><div class="gallery-grid" id="gallery-grid">${galleryItems()}</div><p class="gallery-count" id="gallery-count" aria-live="polite">${artCount()}</p></section>`}
function galleryItems(){return galleryArts.filter(a=>artFilter==='全部'||a.group===artFilter).map(a=>`<a class="art art-link" href="${imagePath(a)}" aria-label="查看大图与介绍：${esc(a.name)}"><figure><img src="${esc(assetUrl(a.url))}" width="${esc(a.width)}" height="${esc(a.height)}" alt="${esc(a.alt||a.name)}"><figcaption><span>${esc(a.name)}</span><span>${esc(a.group)} ${arrow()}</span></figcaption></figure></a>`).join('')}
function artCount(){return `共 ${arts.filter(a=>artFilter==='全部'||a.group===artFilter).length} 幅作品`}
function imageDetail(id){
 let decoded;try{decoded=decodeURIComponent(id||'')}catch{return missing()}
 const image=arts.find(a=>String(a.id)===decoded);if(!image)return missing();
 const index=galleryArts.indexOf(image),next=galleryArts[(index+1)%galleryArts.length];
 return `<article class="page image-detail"><a href="${publicPath('gallery')}" class="back">${arrow()}返回图片库</a><div class="image-detail-heading"><h1>${esc(image.name)}</h1><span>${esc(image.group||'未分类')}</span></div><figure class="image-full"><img src="${esc(assetUrl(image.url))}" width="${esc(image.width)}" height="${esc(image.height)}" alt="${esc(image.alt||image.name)}"><figcaption><span>${esc(image.width)} × ${esc(image.height)}</span><a href="${esc(assetUrl(image.url))}" target="_blank" rel="noopener noreferrer">查看原图 ${arrow()}</a></figcaption></figure><section class="image-introduction" aria-label="图片介绍"><h2>关于这张图</h2><div class="prose" id="image-body" data-image-id="${esc(image.id)}"></div></section><nav class="end-nav" aria-label="图片导航"><a href="${publicPath('gallery')}">${arrow()}全部图片</a>${next&&next!==image?`<a href="${imagePath(next)}">下一张图片 ${arrow()}</a>`:''}</nav></article>`;
}
function knowledge(){
 // Group adjacent entries only: category labels must never move older articles ahead of newer ones.
 const groups=[];
 for(const note of notes){
  const name=note.group||note.summary||'未分类';
  if(groups.at(-1)?.name===name)groups.at(-1).items.push(note);
  else groups.push({name,items:[note]});
 }
return `<section class="page knowledge-page"><div class="page-head"><h1>知识库</h1><p>写下实践，也留下一些<br>还没想明白的事。</p></div>${groups.map(group=>`<section class="knowledge-group"><h2>${esc(group.name)}</h2><div class="knowledge-entries">${group.items.map(note=>`<div class="entry"><a href="${publicPath('note',note.id)}">${esc(note.title)}</a>${note.date?`<time datetime="${esc(note.date)}">${esc(note.date.slice(5).replace('-',' / '))}</time>`:''}</div>`).join('')}</div></section>`).join('')}</section>`}
function noteDetail(id){const n=notes.find(n=>Number(n.id)===Number(id));if(!n)return missing();return `<article class="page reading-page"><a href="${publicPath('knowledge')}" class="back">${arrow()}知识库</a><h1>${esc(n.title)}</h1><div class="byline"><span>Susu</span>${n.date?`<time datetime="${esc(n.date)}">${esc(n.date.replaceAll('-',' / '))}</time>`:''}<span>${esc(n.group||n.summary||'知识库')}</span></div>${SUSU_COVERS.getCover(n)?`<figure class="note-cover">${SUSU_COVERS.render('articles',n)}</figure>`:''}<div class="prose" id="content-body" data-content-kind="articles" data-content-id="${esc(n.id)}"></div><div class="reading-mark" aria-hidden="true"></div><nav class="end-nav"><a href="${publicPath('knowledge')}">${arrow()}返回知识库</a></nav></article>`}
function renderContentBody(root){
 const body=root.querySelector('#content-body');if(!body)return;
 const project=body.dataset.contentKind==='projects';
 const item=(project?projects:notes).find(item=>String(item.id)===body.dataset.contentId);if(!item)return;
 if(typeof item.body==='string'){
  if(item.body.trim())renderContentMarkdown(body,item.body);else body.textContent='暂无正文。';
 }else renderContentMarkdown(body,project?item.text||'':(item.paras||[]).join('\n\n'));
}
function missing(){return `<section class="page reading-page"><h1>这页暂时不存在</h1><p class="muted" style="margin:24px 0">换个方向，继续看看。</p><a class="text-link" href="${publicPath('home')}">返回首页 ${arrow()}</a></section>`}
function renderPage(root, name, id) {
  const pages = { home, projects:projectList, project:projectDetail, gallery, image:imageDetail, knowledge, note:noteDetail };
  root.innerHTML = (Object.hasOwn(pages, name) ? pages[name] : missing)(id);
  const imageBody = root.querySelector('#image-body');
  if (imageBody) {
    const image = arts.find(item => String(item.id) === imageBody.dataset.imageId);
    renderContentMarkdown(imageBody, image?.body, { emptyMessage:'这张图片暂时还没有介绍。' });
  }
  renderContentBody(root);
}

async function layoutGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  await Promise.all([...grid.querySelectorAll('img')].map(image => image.decode().catch(() => {})));
  if (!grid.isConnected) return;
  const masonry = innerWidth > 600;
  grid.classList.toggle('is-laid-out', masonry);
  if (!masonry) { grid.style.height = 'auto'; return; }
  const gap = innerWidth <= 1000 ? 32 : 64;
  const width = (grid.clientWidth - gap) / 2;
  const heights = [0, 0];
  for (const card of grid.children) {
    const column = heights[0] <= heights[1] ? 0 : 1;
    card.style.width = width + 'px';
    card.style.left = column * (width + gap) + 'px';
    card.style.top = heights[column] + 'px';
    heights[column] += card.getBoundingClientRect().height + 48;
  }
  grid.style.height = Math.max(...heights) - (grid.children.length ? 48 : 0) + 'px';
}

function mountSite() {
  const main = document.getElementById('main');
  if (!main.hasAttribute('data-rendered')) renderPage(main, 'home');
  const copyright = document.getElementById('copyright');
  if (copyright) copyright.textContent = '© ' + new Date().getFullYear() + ' Susu5';
  document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); main.focus(); });
  document.addEventListener('click', event => {
    const view = event.target.closest('[data-view]');
    const filter = event.target.closest('[data-filter]');
    const contact = event.target.closest('[data-social]');
    if (view) {
      wallView = view.dataset.view;
      document.getElementById('wall-content').innerHTML = wallContent();
      document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', button === view));
    }
    if (filter) {
      artFilter = filter.dataset.filter;
      document.getElementById('gallery-grid').innerHTML = galleryItems();
      document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', button === filter));
      document.getElementById('gallery-count').textContent = artCount();
      layoutGallery();
    }
    if (contact) openModal(contact);
  });
  document.addEventListener('input', event => {
    if (event.target.id !== 'project-search') return;
    const query = event.target.value.trim();
    document.getElementById('project-rows').innerHTML = projectRows(query);
    const count = projects.filter(item => (item.name + item.desc).includes(query)).length;
    document.getElementById('project-count').textContent = query
      ? '找到 ' + count + ' 个项目，共 ' + projects.length + ' 个项目'
      : '共 ' + projects.length + ' 个项目';
  });

  const modal = document.getElementById('modal');
  const closeButton = document.getElementById('close-modal');
  let lastFocus;
  function openModal(element) {
    lastFocus = element;
    const { social, contactName } = element.dataset;
    document.getElementById('modal-title').textContent = contactName ? social : social + '尚未配置';
    modal.querySelector('.dialog p').textContent = contactName
      ? '在微信中搜索「' + contactName + '」。'
      : '暂未填写联系方式。';
    modal.hidden = false;
    closeButton.focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    lastFocus?.focus();
  }
  closeButton.onclick = closeModal;
  modal.onclick = event => { if (event.target === modal) closeModal(); };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Tab' && !modal.hidden) { event.preventDefault(); closeButton.focus(); }
  });

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layoutGallery, 100); });
  layoutGallery();
}

globalThis.SUSU_SITE = { renderPage, mountSite };
