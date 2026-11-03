let projectOpen=false, filter='all', uploads, pending;
let nextId=Math.max(...records.projects.map(p=>Number(p.id)))+1;

const category=p=>p.publication==='draft'?'draft':p.state==='已完成'?'done':'doing';
const projectBadge=p=>`<span class="status ${category(p)}">${category(p)==='draft'?(publishedItem('projects',p.id)?'草稿 · 线上有旧版':'草稿'):safe(p.state)}</span>`;
function projectList(){
 const items=records.projects.map((p,i)=>({p,i})).sort((a,b)=>Number(a.p.id)-Number(b.p.id));
 const filters=[['all','全部'],['draft','草稿'],['doing','已发布 · 进行中'],['done','已发布 · 已完成']];
 return `<section class="panel"><div class="filters">${filters.map(([key,name])=>`<button class="btn" data-project="filter:${key}" aria-pressed="${filter===key}">${name} ${items.filter(({p})=>key==='all'||category(p)===key).length}</button>`).join('')}</div><div class="table-scroll"><table><thead><tr><th>编号</th><th>项目</th><th>状态</th><th>平台</th><th>操作</th></tr></thead><tbody>${items.filter(({p})=>filter==='all'||category(p)===filter).map(({p,i})=>`<tr><td class="number">${String(p.id).padStart(3,'0')}</td><td><strong>${safe(p.title)}</strong></td><td>${projectBadge(p)}</td><td>${safe(p.links.map(l=>l.platform).join('、')||'—')}</td><td><button class="btn" data-project="edit:${i}" aria-label="编辑 ${safe(p.title)}">编辑</button></td></tr>`).join('')||'<tr><td colspan="5">此状态暂无项目。</td></tr>'}</tbody></table></div></section>`;
}
function openProject(i){
 selected=i;const p=records.projects[i];projectOpen=true;
 uploads={cover:p.coverFile===undefined?photo(p.cover):p.coverFile,images:[...(p.detailFiles||(p.images||[]).map(photo).filter(Boolean))]};
 render();
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
 <section class="form-section"><div class="section-bar"><h3>正文 · Markdown</h3><button type="button" class="btn" data-project="markdown">预览正文</button></div><textarea name="body" class="md-input" aria-label="Markdown 正文">${safe(p.body)}</textarea><div class="md-result markdown" hidden></div></section>
 <section class="form-section"><h3>项目图片</h3><div class="upload-grid">${dropZone('cover','项目封面 · 单张')}${dropZone('images','详情配图 · 可多张')}</div></section>
 <section class="form-section"><h3>项目地址</h3><p class="muted">前台详情页在「项目链接」区按平台名称显示访问按钮。</p><div id="links">${(p.links.length?p.links:[{}]).map(l=>linkRow(l.platform,l.url)).join('')}</div><button type="button" class="btn" data-action="add-link">＋ 添加地址</button></section>
 </div><div class="foot"><button type="button" class="btn danger" data-action="delete">删除项目</button><button class="btn">保存草稿</button></div></form></section>
 <section class="panel"><div class="panel-head"><h2>发布管理</h2>${projectBadge(p)}</div><div class="pad stack"><p class="muted">保存草稿不会替换线上版本。发布后，封面、正文和进度一同更新。</p><button class="btn full" data-project="front">查看前台详情预览</button><button class="btn primary full" data-project="publish">发布到网站</button></div></section></div>`;
}
function readProject(form){
 if(!ensureReady()||!form.reportValidity())return null;
 const data=new FormData(form),urls=data.getAll('url');
 const links=data.getAll('platform').map((platform,i)=>({platform:platform.trim(),url:urls[i].trim()})).filter(l=>l.platform||l.url);
 const title=data.get('title').trim();
 if(!title||links.some(l=>!l.platform||!/^https?:\/\//i.test(l.url))){message('请填写标题，并为每条项目地址填写平台及有效网址');return null}
 return {title,summary:data.get('summary'),state:data.get('state'),body:data.get('body'),links,coverFile:uploads.cover,detailFiles:[...uploads.images]};
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
function markdownInto(target,source){
 const template=document.createElement('template');
 template.innerHTML=marked.parse(source||'');
 const allowed=new Set('P H1 H2 H3 H4 H5 H6 BLOCKQUOTE PRE CODE UL OL LI TABLE THEAD TBODY TR TH TD STRONG EM DEL HR BR A'.split(' '));
 for(const el of [...template.content.querySelectorAll('*')]){
  if(!allowed.has(el.tagName)){el.remove();continue}
  const href=el.getAttribute('href');
  for(const attr of [...el.attributes])el.removeAttribute(attr.name);
  if(el.tagName==='A'&&/^https?:\/\//i.test(href||'')){el.href=href;el.target='_blank';el.rel='noopener noreferrer'}
 }
 target.replaceChildren(template.content);
}
function showFront(p){
 const box=document.querySelector('#front-content');
 box.innerHTML=`<p class="number">项目 ${records.projects[selected].id} · 前台预览</p><h1>${safe(p.title)}</h1><p class="muted">${safe(p.summary)}</p>${SUSU_COVERS.render('projects',{...records.projects[selected],...p})}${p.links.length?`<section class="form-section"><h2>项目链接</h2><div class="front-links">${p.links.map(l=>`<a class="btn primary" href="${safe(l.url)}" target="_blank" rel="noopener noreferrer">${safe(l.platform)} ↗</a>`).join('')}</div></section>`:''}<div class="markdown"></div>${p.detailFiles.map(coverImage).join('')}`;
 markdownInto(box.querySelector('.markdown'),p.body);
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
  records.projects.push({key:String(nextId),id:nextId++,title:'未命名项目',summary:'',body:'',state:'进行中',cover:'',images:[],links:[],publication:'draft',createdAt:new Date().toISOString()});
  openProject(records.projects.length-1);markDirty();main.querySelector('[name=title]').select();
 }
 if(action==='choose')main.querySelector(`[data-upload="${arg}"]`).click();
 if(action==='remove'){
  if(arg==='cover')uploads.cover=null;else uploads.images.splice(Number(index),1);
  refreshTiles(arg);markDirty();
 }
 if(action==='markdown'){
  const input=main.querySelector('.md-input'),out=main.querySelector('.md-result');
  if(out.hidden)markdownInto(out,input.value);
  out.hidden=!out.hidden;input.hidden=!out.hidden;b.textContent=out.hidden?'预览正文':'继续编辑';
 }
 if(action==='front'||action==='publish'){
  const p=readProject(main.querySelector('#project-record'));if(!p)return true;
  if(action==='front')showFront(p);else preparePublish()
 }
 return true;
}
main.addEventListener('dragover',e=>{const z=e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.add('dragging')}});
main.addEventListener('dragleave',e=>{const z=e.target.closest('[data-drop]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('dragging')});
main.addEventListener('drop',e=>{const z=e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.remove('dragging');addFiles(z.dataset.drop,e.dataTransfer.files)}});
