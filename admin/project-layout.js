let projectOpen=false, filter='all', uploads, pending;
let nextId=Math.max(...records.projects.map(p=>Number(p.id)))+1;
let projectRelatedIds=new Set(),projectRelatedQuery='';

const normalizeProjectRelatedIds=ids=>[...new Set((Array.isArray(ids)?ids:[]).map(Number).filter(id=>Number.isSafeInteger(id)&&id>0))];
const projectArticleOptions=()=>SUSU_CONTENT.latest(serverState?.published?.articles,'articles').filter(article=>Number.isSafeInteger(article.id)&&article.id>0);
function selectedProjectArticleIds(){
 const available=new Set(projectArticleOptions().map(article=>article.id));
 return [...projectRelatedIds].filter(id=>available.has(id));
}
function projectRelatedResults(){
 const articles=projectArticleOptions(),query=projectRelatedQuery.trim().normalize('NFKC').toLocaleLowerCase();
 return {articles,matches:articles.filter(article=>[article.title,article.summary].some(value=>String(value||'').normalize('NFKC').toLocaleLowerCase().includes(query)))};
}
function projectRelatedRows(){
 const {articles,matches}=projectRelatedResults();
 if(!articles.length)return '<p class="project-related-empty">还没有已发布的知识库文章。先发布文章，再回来建立关联。</p>';
 if(!matches.length)return '<p class="project-related-empty">没有找到匹配的文章。试试其他标题或栏目名称，已选文章会保留。</p>';
 return matches.map(article=>`<label class="project-related-option ${projectRelatedIds.has(article.id)?'is-selected':''}"><input type="checkbox" name="relatedArticleIds" value="${article.id}" data-project-related-id="${article.id}" ${projectRelatedIds.has(article.id)?'checked':''}><span><strong>${safe(article.title)}</strong><small>${safe(article.summary||'知识库')}</small></span></label>`).join('');
}
function projectRelatedEditor(){
 const valid=selectedProjectArticleIds(),unavailable=projectRelatedIds.size-valid.length,{articles,matches}=projectRelatedResults();
 return `<section class="form-section project-related" aria-labelledby="project-related-title"><div class="section-bar"><h3 id="project-related-title">关联知识库文章</h3><span id="project-related-count" class="muted" role="status">已选 ${valid.length} 篇</span></div><p class="muted" id="project-related-hint">选择已发布的文章，显示在项目详情的「关联知识库」中。不选时隐藏这个区域。</p><label class="project-related-search">搜索文章<input type="search" id="project-related-search" value="${safe(projectRelatedQuery)}" placeholder="搜索标题或栏目" aria-controls="project-related-options"></label><div class="project-related-toolbar"><span id="project-related-result-count" class="muted" role="status">显示 ${matches.length} / ${articles.length} 篇已发布文章</span><button type="button" class="btn" data-project="clear-related" ${projectRelatedIds.size?'':'disabled'}>清空选择</button></div><div id="project-related-options" class="project-related-options" role="group" aria-label="选择关联文章" aria-describedby="project-related-hint">${projectRelatedRows()}</div>${unavailable?`<p class="project-related-unavailable">有 ${unavailable} 篇原关联文章已删除或未发布，保存时会移除这些关联。</p>`:''}</section>`;
}
function refreshProjectRelatedResults(){
 const list=main.querySelector('#project-related-options');if(!list)return;
 list.innerHTML=projectRelatedRows();refreshProjectRelatedCount();
}
function refreshProjectRelatedCount(){
 const count=main.querySelector('#project-related-count');if(!count)return;
 const {articles,matches}=projectRelatedResults();
 count.textContent=`已选 ${selectedProjectArticleIds().length} 篇`;
 main.querySelector('#project-related-result-count').textContent=`显示 ${matches.length} / ${articles.length} 篇已发布文章`;
 main.querySelector('[data-project="clear-related"]').disabled=projectRelatedIds.size===0;
}
function projectRelatedPreview(ids){
 const available=new Map(projectArticleOptions().map(article=>[article.id,article]));
 const articles=normalizeProjectRelatedIds(ids).map(id=>available.get(id)).filter(Boolean);
 return articles.length?`<section class="form-section project-related-preview"><h2>关联知识库</h2><ul>${articles.map(article=>`<li><a href="/#note/${article.id}" target="_blank" rel="noopener noreferrer">${safe(article.title)}</a><span class="muted">${safe(article.summary||'知识库')}</span></li>`).join('')}</ul></section>`:'';
}

const category=p=>p.publication==='draft'?'draft':p.state==='已完成'?'done':'doing';
const projectBadge=p=>`<span class="status ${category(p)}">${category(p)==='draft'?(publishedItem('projects',p.id)?'草稿 · 线上有旧版':'草稿'):safe(p.state)}</span>`;
function projectList(){
 const items=SUSU_CONTENT.newestFirst(records.projects,'projects').map(p=>({p,i:records.projects.indexOf(p)}));
 const filters=[['all','全部'],['draft','草稿'],['doing','已发布 · 进行中'],['done','已发布 · 已完成']];
 return `<section class="panel"><div class="filters">${filters.map(([key,name])=>`<button class="btn" data-project="filter:${key}" aria-pressed="${filter===key}">${name} ${items.filter(({p})=>key==='all'||category(p)===key).length}</button>`).join('')}</div><div class="table-scroll"><table><thead><tr><th>编号</th><th>项目</th><th>状态</th><th>平台</th><th>操作</th></tr></thead><tbody>${items.filter(({p})=>filter==='all'||category(p)===filter).map(({p,i})=>`<tr><td class="number">${String(p.id).padStart(3,'0')}</td><td><strong>${safe(p.title)}</strong></td><td>${projectBadge(p)}</td><td>${safe(p.links.map(l=>l.platform).join('、')||'—')}</td><td><button class="btn" data-project="edit:${i}" aria-label="编辑 ${safe(p.title)}">编辑</button></td></tr>`).join('')||'<tr><td colspan="5">此状态暂无项目。</td></tr>'}</tbody></table></div></section>`;
}
function openProject(i){
 selected=i;const p=records.projects[i];projectOpen=true;
 projectRelatedIds=new Set(normalizeProjectRelatedIds(p.relatedArticleIds));projectRelatedQuery='';
 uploads={cover:p.coverFile===undefined?photo(p.cover):p.coverFile,images:[...(p.detailFiles||(p.images||[]).map(photo).filter(Boolean))]};
 render();refreshProjectRelatedCount();
}
function tiles(kind){
 return (kind==='cover'?[uploads.cover].filter(Boolean):uploads.images).map((p,i)=>`<figure>${coverImage(p)}<figcaption>${safe(p.name)} <button type="button" class="btn" data-project="remove:${kind}:${i}">移除</button></figcaption></figure>`).join('');
}
function dropZone(kind,label){
 return `<div><div class="drop-zone" data-drop="${kind}"><strong>${label}</strong><span>拖入图片，或点击选择文件</span><button type="button" class="btn" data-project="choose:${kind}">选择文件</button><input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,image/avif" data-upload="${kind}" ${kind==='images'?'multiple':''}></div><div class="tiles" data-tiles="${kind}">${tiles(kind)}</div></div>`;
}
function projectEditor(){
 const p=records.projects[selected];
 return `<div class="project-editor"><section class="panel"><div class="panel-head"><h2>项目内容</h2><span class="number">NO. ${String(p.id).padStart(3,'0')}</span></div><form id="project-record"><div class="pad">
 <label>项目标题<input name="title" value="${safe(p.title)}" maxlength="24" required><small class="muted">最多 24 个字符</small></label>
 <div class="form-grid">${field('summary','一句话简介',p.summary)}<label>项目进度<select name="state">${['进行中','已完成'].map(s=>option(s,s,p.state)).join('')}</select></label></div>
 ${bodyEditorMarkup(p)}
 <section class="form-section"><h3>项目图片</h3><div class="upload-grid">${dropZone('cover','项目封面 · 单张')}${dropZone('images','详情配图 · 可多张')}</div></section>
 <section class="form-section"><h3>项目地址</h3><p class="muted">前台详情页在「项目链接」区按平台名称显示访问按钮。</p><div id="links">${(p.links.length?p.links:[{}]).map(l=>linkRow(l.platform,l.url)).join('')}</div><button type="button" class="btn" data-action="add-link">＋ 添加地址</button></section>
 ${projectRelatedEditor()}
 </div><div class="foot"><button type="button" class="btn danger" data-action="delete">删除项目</button><button class="btn">保存草稿</button></div></form></section>
 <section class="panel"><div class="panel-head"><h2>发布管理</h2>${projectBadge(p)}</div><div class="pad stack"><p class="muted">保存草稿不会替换线上版本。发布后，封面、正文和进度一同更新。</p><button class="btn full" data-project="front">查看前台详情预览</button><button class="btn primary full" data-project="publish">发布到网站</button></div></section></div>`;
}
function readProject(form){
 if(!ensureReady()||!form.reportValidity())return null;
 const data=new FormData(form),urls=data.getAll('url');
 const links=data.getAll('platform').map((platform,i)=>({platform:platform.trim(),url:urls[i].trim()})).filter(l=>l.platform||l.url);
 const title=data.get('title').trim();
 if(!title||links.some(l=>!l.platform||!/^https?:\/\//i.test(l.url))){message('请填写标题，并为每条项目地址填写平台及有效网址');return null}
 return {title,summary:data.get('summary'),state:data.get('state'),body:data.get('body'),...form.querySelector?.('[data-body-editor]')?.readBody(),links,coverFile:uploads.cover,detailFiles:[...uploads.images],relatedArticleIds:selectedProjectArticleIds()};
}
async function addFiles(kind,files){
 const list=Array.from(files||[]);if(!list.length)return;
 const target=records.projects[selected]?.id;
 try{
  message('正在上传图片…');
  for(const file of (kind==='cover'?list.slice(0,1):list)){
   const item=await uploadFile(file);
   if(!projectOpen||records.projects[selected]?.id!==target)return;
   if(kind==='cover')uploads.cover=item;else uploads.images.push(item);
   refreshTiles(kind);markDirty();
  }
  message('图片已上传，请保存草稿或发布项目。');
 }catch(error){message(error.message)}
}
function refreshTiles(kind){main.querySelector(`[data-tiles="${kind}"]`).innerHTML=tiles(kind)}
function markdownInto(target,source,media){renderContentMarkdown(target,source,{preview:true,media})}
function showFront(p){
 const box=document.querySelector('#front-content');
 box.innerHTML=`<p class="number">项目 ${records.projects[selected].id} · 前台预览</p><h1>${safe(p.title)}</h1><p class="muted">${safe(p.summary)}</p>${SUSU_COVERS.render('projects',{...records.projects[selected],...p})}${p.links.length?`<section class="form-section"><h2>项目链接</h2><div class="front-links">${p.links.map(l=>`<a class="btn primary" href="${safe(l.url)}" target="_blank" rel="noopener noreferrer">${safe(l.platform)} ↗</a>`).join('')}</div></section>`:''}<div class="markdown"></div>${p.detailFiles.map(coverImage).join('')}${projectRelatedPreview(p.relatedArticleIds)}`;
 markdownInto(box.querySelector('.markdown'),p.body,p.bodyFiles);
 document.querySelector('#front').showModal();
}
function projectAction(b){
 const [action,arg,index]=(b.dataset.project||'').split(':');
 if(!action)return false;
 if(action==='filter'){filter=arg;render()}
 if(action==='edit')openProject(Number(arg));
 if(action==='back'){if(!discardUnsaved())return true;projectOpen=false;render()}
 if(action==='new'){
  if(nextId>100){message('项目编号已达到 100');return true}
  records.projects.push({key:String(nextId),id:nextId++,title:'未命名项目',summary:'',body:'',state:'进行中',cover:'',images:[],links:[],relatedArticleIds:[],publication:'draft',createdAt:new Date().toISOString()});
  openProject(records.projects.length-1);markDirty();main.querySelector('[name=title]').select();
 }
 if(action==='choose')main.querySelector(`[data-upload="${arg}"]`).click();
 if(action==='clear-related'){projectRelatedIds.clear();refreshProjectRelatedResults();main.querySelector('.project-related-unavailable')?.remove();markDirty()}
 if(action==='remove'){
  if(arg==='cover')uploads.cover=null;else uploads.images.splice(Number(index),1);
  refreshTiles(arg);markDirty();
 }
 if(action==='front'||action==='publish'){
  const p=readProject(main.querySelector('#project-record'));if(!p)return true;
  if(action==='front')showFront(p);else preparePublish()
 }
 return true;
}
main.addEventListener('input',e=>{if(e.target.id==='project-related-search'){projectRelatedQuery=e.target.value;refreshProjectRelatedResults()}});
main.addEventListener('keydown',e=>{if(e.target.id==='project-related-search'&&e.key==='Enter')e.preventDefault()});
main.addEventListener('change',e=>{
 if(!e.target.matches('[data-project-related-id]'))return;
 const id=Number(e.target.dataset.projectRelatedId);
 if(!projectArticleOptions().some(article=>article.id===id))return;
 if(e.target.checked)projectRelatedIds.add(id);else projectRelatedIds.delete(id);
 e.target.closest('.project-related-option').classList.toggle('is-selected',e.target.checked);refreshProjectRelatedCount();markDirty();
});
main.addEventListener('dragover',e=>{const z=e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.add('dragging')}});
main.addEventListener('dragleave',e=>{const z=e.target.closest('[data-drop]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('dragging')});
main.addEventListener('drop',e=>{const z=e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.remove('dragging');addFiles(z.dataset.drop,e.dataTransfer.files)}});
