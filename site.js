const copyright=document.getElementById('copyright');
if(copyright)copyright.textContent='© '+new Date().getFullYear()+' '+(window.SITE_DATA.profile?.name||'Susu');
const projects=window.SITE_DATA.projects.filter(p=>p.publication!=='draft'&&p.state!=='草稿');
const notes=window.SITE_DATA.notes.filter(p=>p.publication!=='draft'&&p.state!=='草稿');
const arts=window.SITE_DATA.arts.filter(p=>p.publication!=='draft'&&p.state!=='草稿');
const main=document.getElementById('main');
let wallView='overview', artFilter='全部';
const artAssets=['mountain-study.webp','mist-lake.webp','fern.webp','doorway.webp','cabin.webp','leaves.webp'];
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
  return window.SITE_CONTACTS.map(({icon, label, name, href}) => {
    const profile=SITE_DATA.profile;
    if(profile&&label==='微信')name=profile.wechat||'';
    if(profile&&icon==='github'){name=profile.github||'';href=name?'https://github.com/'+encodeURIComponent(name):'';}
    const content = `${svg(contactIcons[icon], 'social-icon')}<span><span class="social-label">${esc(label)}</span><span class="social-name">${esc(name || '待填写')}</span></span>${arrow()}`;
    if (/^(https:\/\/|mailto:)/i.test(href)) {
      return `<a class="social-row" href="${esc(href)}">${content}</a>`;
    }
    return `<button type="button" class="social-row" data-social="${esc(label)}" data-contact-name="${esc(name)}">${content}</button>`;
  }).join('');
}

function imagePath(image){return '#image/'+encodeURIComponent(image.id)}
function homeCards(items){return items.map(({kind,item},i)=>{
 const href=kind==='projects'?'#project/'+encodeURIComponent(item.id):kind==='images'?imagePath(item):'#note/'+encodeURIComponent(item.id);
 return fanCard(item.title||item.name,{projects:'项目',articles:'知识库',images:'图片'}[kind],href,SUSU_COVERS.render(kind,item),i);
}).join('')}
function home(){
 const selection=SUSU_CONTENT.resolveHome({projects,articles:notes,images:arts},SITE_DATA.home||{});
 const hero=selection.hero;
 const profile={name:'Susu',tag:'@AI Agent',headline:'把好奇心，做成作品。',english:'Making things. Following curiosity.',avatar:'assets/susu-avatar.png',...SITE_DATA.profile};
 const heroCaption=selection.heroMode==='manual'?(SITE_DATA.home?.caption||hero?.name):hero?.name;
 return `<section class="opening">${hero?`<a class="hero" href="${imagePath(hero)}" aria-label="查看大图与介绍：${esc(hero.name)}"><picture><img fetchpriority="high" src="${esc(hero.url)}" width="${Number(hero.width)||1536}" height="${Number(hero.height)||1024}" alt="${esc(hero.alt||hero.name)}"></picture><div class="hero-caption"><span>${esc(heroCaption)}</span><span>${esc(hero.group||'图片')} · 查看大图与介绍 ${arrow()}</span></div></a>`:''}<div class="identity"><div class="identity-person"><img class="avatar" src="${esc(profile.avatar)}" width="48" height="48" alt="${esc(profile.name)} 的头像"><span>${esc(profile.name)}</span></div><div class="identity-intro"><div class="intro-heading"><h1>${esc(profile.headline).replace(/，|\n/g,char=>char==='，'?'，<br>':'<br>')}</h1><span class="agent-label" lang="en">${esc(profile.tag)}</span></div><p lang="en">${esc(profile.english)}</p></div><div class="socials" aria-label="联系方式">${contactRows()}</div></div></section><section class="selected"><div class="section-heading"><h2>最近，正在着迷</h2><p>项目、画作与笔记。<br>把此刻的兴趣，留在手边。</p></div><div class="fan">${homeCards(selection.featured)}</div></section><section class="wall" aria-labelledby="wall-title"><div class="wall-layout"><div class="wall-heading"><div class="wall-title"><span class="hundred">100</span><h2 id="wall-title">个想法，<br><span class="wall-ai-label">用 AI</span> 慢慢实现。</h2></div><p class="wall-progress">创作进度：<br>${projects.filter(p=>p.status==='已完成').length} 个已完成 · ${projects.filter(p=>p.status==='进行中').length} 个进行中 · ${100-projects.length} 个未开始</p><a href="#projects" class="text-link">查看全部项目 ${arrow()}</a></div><div class="wall-body">${wallTools()}<div id="wall-content">${wallContent()}</div><div class="wall-note">100 个位置，一眼看见创作的轨迹。</div></div></div></section>`}
function wallContent(){return wallView==='overview'?`<div class="grid100">${Array.from({length:100},(_,i)=>{const p=projects.find(p=>p.id===i+1);return p?`<button class="cell ${p.status==='已完成'?'done':'doing'}" data-project="${p.id}" title="${pad(p.id)} ${esc(p.name||p.title)} · ${p.status}" aria-label="${pad(p.id)} ${esc(p.name||p.title)}，${p.status}">${pad(p.id)}</button>`:`<span class="cell" aria-label="${pad(i+1)} 未开始">${pad(i+1)}</span>`}).join('')}</div>`:`<div class="covers">${projects.map(p=>`<a class="cover-card" href="#project/${p.id}">${cover(p.id)}<div class="cover-meta"><span class="mono">${pad(p.id)}</span>${status(p)}</div><h3>${esc(p.name||p.title)}</h3></a>`).join('')}</div>`}
function projectRows(q=''){const found=projects.filter(p=>(p.name+p.desc).includes(q.trim()));return found.length?found.map(p=>`<article class="project-row"><a href="#project/${p.id}" aria-label="查看${esc(p.name||p.title)}">${cover(p.id)}</a><div class="project-copy"><span class="project-id mono">${pad(p.id)}</span><h2><a href="#project/${p.id}">${esc(p.name||p.title)}</a></h2><p>${esc(p.desc||p.summary||'')}</p></div>${status(p)}</article>`).join(''):`<p class="empty-result">没有找到相关项目，换个关键词试试。</p>`}
function projectList(){return `<section class="page list-page"><div class="page-head"><h1>项目</h1><p>把好奇心，做成作品。</p></div><label class="searchbox" style="display:block">${svg('<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>')}<input id="project-search" type="search" placeholder="搜索项目" aria-label="搜索项目名称与简介"></label><div id="project-rows">${projectRows()}</div><p class="list-count" id="project-count" aria-live="polite">共 ${projects.length} 个项目</p></section>`}
function projectDetail(id){
 const p=projects.find(p=>Number(p.id)===Number(id));if(!p)return missing();
 const relatedIds=Array.isArray(p.relatedArticleIds)?[...new Set(p.relatedArticleIds.map(Number))]:[];
 const related=relatedIds.map(id=>notes.find(note=>Number(note.id)===id)).filter(Boolean),next=projects[(projects.indexOf(p)+1)%projects.length];
 const details=p.detailFiles||[],links=(p.links||[]).filter(link=>/^https?:\/\//i.test(link.url||''));
 return `<article class="page project-detail"><a href="#projects" class="back">${arrow()}全部项目</a><div class="detail-heading"><span class="project-number">${pad(p.id)} / 项目</span><h1>${esc(p.name||p.title)}</h1><p>${esc(p.desc||p.summary||'')}</p></div><figure class="detail-art">${cover(p)}</figure><div class="detail-body"><div class="facts"><span>${esc(p.type||'项目')}</span>${status(p)}</div>${links.length?`<section class="project-links"><h2>项目链接</h2><div>${links.map(link=>`<a class="text-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.platform)} ${arrow()}</a>`).join('')}</div></section>`:''}<div class="prose" id="content-body" data-content-kind="projects" data-content-id="${esc(p.id)}"></div>${details.length?`<div class="art-pair">${details.filter(file=>file?.url).map(file=>`<figure><img src="${esc(file.url)}" alt="${esc(file.alt||file.name||'')}">${file.name?`<figcaption>${esc(file.name)}</figcaption>`:''}</figure>`).join('')}</div>`:''}${related.length?`<section class="related" aria-labelledby="related-heading"><h2 id="related-heading">关联知识库</h2><ul class="related-list">${related.map(note=>`<li><a class="text-link" href="#note/${encodeURIComponent(note.id)}">${esc(note.title)} ${arrow()}</a></li>`).join('')}</ul></section>`:''}<nav class="end-nav" aria-label="项目导航"><a href="#projects">${arrow()}项目列表</a>${next&&next!==p?`<a href="#project/${next.id}">下一个项目 ${arrow()}</a>`:''}</nav></div></article>`;
}
function gallery(){const groups=['全部',...new Set(arts.map(a=>a.group).filter(Boolean))];return `<section class="page gallery-page"><div class="page-head"><h1>图片库</h1><p>一些不存在的风景，一些留下来的想象。</p></div><div class="filter" aria-label="画作分类">${groups.map(g=>`<button data-filter="${esc(g)}" aria-pressed="${artFilter===g}">${esc(g)}</button>`).join('')}</div><div class="gallery-grid" id="gallery-grid">${galleryItems()}</div><p class="gallery-count" id="gallery-count" aria-live="polite">${artCount()}</p></section>`}
function galleryItems(){return arts.filter(a=>artFilter==='全部'||a.group===artFilter).map(a=>`<a class="art art-link" href="${imagePath(a)}" aria-label="查看大图与介绍：${esc(a.name)}"><figure><img src="${esc(a.url)}" width="${a.width}" height="${a.height}" alt="${esc(a.alt||a.name)}"><figcaption><span>${esc(a.name)}</span><span>${esc(a.group)} ${arrow()}</span></figcaption></figure></a>`).join('')}
function artCount(){return `共 ${arts.filter(a=>artFilter==='全部'||a.group===artFilter).length} 幅作品`}
function imageDetail(id){
 let decoded;try{decoded=decodeURIComponent(id||'')}catch{return missing()}
 const image=arts.find(a=>String(a.id)===decoded);if(!image)return missing();
 const index=arts.indexOf(image),next=arts[(index+1)%arts.length];
 return `<article class="page image-detail"><a href="#gallery" class="back">${arrow()}返回图片库</a><div class="image-detail-heading"><h1>${esc(image.name)}</h1><span>${esc(image.group||'未分类')}</span></div><figure class="image-full"><img src="${esc(image.url)}" width="${image.width}" height="${image.height}" alt="${esc(image.alt||image.name)}"><figcaption><span>${image.width} × ${image.height}</span><a href="${esc(image.url)}" target="_blank" rel="noopener noreferrer">查看原图 ${arrow()}</a></figcaption></figure><section class="image-introduction" aria-label="图片介绍"><h2>关于这张图</h2><div class="prose" id="image-body" data-image-id="${esc(image.id)}"></div></section><nav class="end-nav" aria-label="图片导航"><a href="#gallery">${arrow()}全部图片</a>${next&&next!==image?`<a href="${imagePath(next)}">下一张图片 ${arrow()}</a>`:''}</nav></article>`;
}
function knowledge(){const groups=[...new Set(notes.map(note=>note.group||note.summary||'未分类'))];return `<section class="page knowledge-page"><div class="page-head"><h1>知识库</h1><p>写下实践，也留下一些<br>还没想明白的事。</p></div>${groups.map(group=>`<section class="knowledge-group"><h2>${esc(group)}</h2><div class="knowledge-entries">${notes.filter(note=>(note.group||note.summary||'未分类')===group).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).map(note=>`<div class="entry"><a href="#note/${note.id}">${esc(note.title)}</a>${note.date?`<time datetime="${esc(note.date)}">${esc(note.date.slice(5).replace('-',' / '))}</time>`:''}</div>`).join('')}</div></section>`).join('')}</section>`}
function noteDetail(id){const n=notes.find(n=>Number(n.id)===Number(id));if(!n)return missing();return `<article class="page reading-page"><a href="#knowledge" class="back">${arrow()}知识库</a><h1>${esc(n.title)}</h1><div class="byline"><span>Susu</span>${n.date?`<time datetime="${esc(n.date)}">${esc(n.date.replaceAll('-',' / '))}</time>`:''}<span>${esc(n.group||n.summary||'知识库')}</span></div>${SUSU_COVERS.getCover(n)?`<figure class="note-cover">${SUSU_COVERS.render('articles',n)}</figure>`:''}<div class="prose" id="content-body" data-content-kind="articles" data-content-id="${esc(n.id)}"></div><div class="reading-mark" aria-hidden="true"></div><nav class="end-nav"><a href="#knowledge">${arrow()}返回知识库</a></nav></article>`}
function renderContentBody(){
 const body=document.getElementById('content-body');if(!body)return;
 const project=body.dataset.contentKind==='projects';
 const item=(project?projects:notes).find(item=>String(item.id)===body.dataset.contentId);if(!item)return;
 if(typeof item.body==='string'){
  if(item.body.trim())renderImageMarkdown(body,item.body);else body.textContent='暂无正文。';
 }else if(project)body.innerHTML=`<p>${esc(item.text||'')}</p>`;
 else body.innerHTML=(item.paras||[]).map(text=>`<p>${esc(text)}</p>`).join('');
}
function missing(){return `<section class="page reading-page"><h1>这页暂时不存在</h1><p class="muted" style="margin:24px 0">换个方向，继续看看。</p><a class="text-link" href="#home">返回首页 ${arrow()}</a></section>`}
async function layoutGallery(){const grid=document.getElementById('gallery-grid');if(!grid)return;await Promise.all([...grid.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));if(!grid.isConnected)return;if(innerWidth<=600){grid.style.height='auto';return}const gap=innerWidth<=1000?32:64,w=(grid.clientWidth-gap)/2,heights=[0,0];[...grid.children].forEach(el=>{const c=heights[0]<=heights[1]?0:1;el.style.width=w+'px';el.style.left=c*(w+gap)+'px';el.style.top=heights[c]+'px';heights[c]+=el.getBoundingClientRect().height+48});grid.style.height=Math.max(...heights)-48+'px'}
function route(){const path=location.hash.slice(1)||'home';const [name,arg]=path.split('/');main.innerHTML=name==='home'?home():name==='projects'?projectList():name==='project'?projectDetail(Number(arg)):name==='gallery'?gallery():name==='image'?imageDetail(arg):name==='knowledge'?knowledge():name==='note'?noteDetail(Number(arg)):missing();const active=name==='project'?'projects':name==='note'?'knowledge':name==='image'?'gallery':name;document.querySelectorAll('.top nav a').forEach(a=>{a.removeAttribute('aria-current');if(a.hash==='#'+active)a.setAttribute('aria-current','page')});document.title=`Susu · ${{home:'首页',projects:'项目',project:'项目详情',gallery:'图片库',image:'图片详情',knowledge:'知识库',note:'知识笔记'}[name]||'暂时不存在'}`;const body=document.getElementById('image-body');if(body){const image=arts.find(a=>String(a.id)===body.dataset.imageId);renderImageMarkdown(body,image?.body||'')}renderContentBody();window.scrollTo({top:0,behavior:'instant'});layoutGallery()}
document.addEventListener('click',e=>{const view=e.target.closest('[data-view]'),project=e.target.closest('[data-project]'),filter=e.target.closest('[data-filter]');if(view){wallView=view.dataset.view;document.getElementById('wall-content').innerHTML=wallContent();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b===view));}if(project)location.hash='#project/'+project.dataset.project;if(filter){artFilter=filter.dataset.filter;document.getElementById('gallery-grid').innerHTML=galleryItems();document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',b===filter));document.getElementById('gallery-count').textContent=artCount();layoutGallery()}if(e.target.closest('[data-social]'))openModal(e.target.closest('[data-social]'))});
document.addEventListener('input',e=>{if(e.target.id==='project-search'){const q=e.target.value.trim();document.getElementById('project-rows').innerHTML=projectRows(q);document.getElementById('project-count').textContent=q?`找到 ${projects.filter(p=>(p.name+p.desc).includes(q)).length} 个项目，共 ${projects.length} 个项目`:`共 ${projects.length} 个项目`}});
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();main.focus()});
let lastFocus;function openModal(el) {
  lastFocus = el;
  const { social, contactName } = el.dataset;
  document.getElementById('modal-title').textContent = contactName ? social : social + '尚未配置';
  document.querySelector('#modal .dialog p').textContent = contactName
    ? '在微信中搜索「' + contactName + '」。'
    : '暂未填写联系方式。';
  document.getElementById('modal').hidden = false;
  document.getElementById('close-modal').focus();
}
function closeModal(){const modal=document.getElementById('modal');if(modal.hidden)return;modal.hidden=true;lastFocus?.focus()}document.getElementById('close-modal').onclick=closeModal;document.getElementById('modal').onclick=e=>{if(e.target.id==='modal')closeModal()};document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key==='Tab'&&!document.getElementById('modal').hidden){e.preventDefault();document.getElementById('close-modal').focus()}});addEventListener('hashchange',()=>{route();main.focus({preventScroll:true})});let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(layoutGallery,100)});route();
