let libraryView='list', libraryQuery='', imageDraft=null;
let imageDraftMeta=null, imageLoading=false, imageLoadToken=0, pendingLibrary=null;
let articleCoverDraft, articleCoverLoading=false, articleCoverError=false, articleCoverToken=0;
let nextArticleId=Math.max(0,...records.articles.map(item=>Number(item.id)||0))+1;
const imageCategories=[...new Set(photos.map(p=>p.group).filter(Boolean))];
const isLibrary=()=>tab==='articles'||tab==='images';
const libraryItems=()=>tab==='articles'?records.articles:photos;
const libraryTitle=()=>tab==='articles'?'知识库条目':'图片';
function currentArticleCover(){
 return articleCoverDraft===undefined?(records.articles[selected]?.coverFile||null):articleCoverDraft;
}
function articleCoverMarkup(item){
 return window.SUSU_COVERS.render('articles',item);
}
function articleCoverEditor(item){
 const cover=currentArticleCover();
 return `<section class="form-section"><h3>文章封面</h3><p class="muted">可上传封面；留空时，使用文章标题生成文字封面。</p><div class="article-cover-layout"><div id="article-cover-preview" aria-label="首页卡片封面预览">${articleCoverMarkup({...item,coverFile:cover})}</div><div class="article-cover-controls"><div class="drop-zone" data-article-cover-drop><strong>拖入一张图片</strong><span>支持 JPG、PNG、WebP、GIF、AVIF</span><button class="btn" type="button" data-library="choose-cover">${cover?'替换封面':'上传封面'}</button><input id="article-cover-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden></div><p class="muted" id="article-cover-status" role="status">${cover?`${safe(cover.name||'已上传封面')} · ${cover.width||'—'} × ${cover.height||'—'}`:'当前使用标题封面'}</p><button class="btn" id="article-cover-remove" type="button" data-library="remove-cover" ${cover?'':'hidden'}>移除封面，恢复标题封面</button></div></div></section>`;
}
function refreshArticleCover(){
 const form=main.querySelector('#library-article'),preview=main.querySelector('#article-cover-preview');
 if(!form||!preview)return;
 const cover=currentArticleCover();
 preview.innerHTML=articleCoverMarkup({title:form.querySelector('[name=title]').value,summary:form.querySelector('[name=summary]').value,coverFile:cover});
 const status=main.querySelector('#article-cover-status');
 if(!articleCoverLoading&&!articleCoverError)status.textContent=cover?`${cover.name||'已上传封面'} · ${cover.width||'—'} × ${cover.height||'—'}`:'当前使用标题封面';
 main.querySelector('#article-cover-remove').hidden=!cover&&!articleCoverError&&!articleCoverLoading;
 main.querySelector('[data-library=choose-cover]').textContent=cover?'替换封面':'上传封面';
}
function resetArticleCoverDraft(){
 articleCoverToken++;
 if(articleCoverDraft?.url?.startsWith('blob:')&&!records.articles.some(item=>item.coverFile?.url===articleCoverDraft.url))URL.revokeObjectURL(articleCoverDraft.url);
 articleCoverDraft=undefined;articleCoverLoading=false;articleCoverError=false;
}
async function loadArticleCover(file){
 if(!file)return;const input=main.querySelector('#article-cover-file'),status=main.querySelector('#article-cover-status');if(!input||!status)return;
 const token=++articleCoverToken;articleCoverLoading=true;articleCoverError=false;status.textContent='正在上传封面…';
 try{
  const uploaded=await uploadFile(file);
  if(token!==articleCoverToken||!input.isConnected)return;
  articleCoverDraft=uploaded;articleCoverLoading=false;input.value='';refreshArticleCover();markDirty();
 }catch(error){if(token!==articleCoverToken||!input.isConnected)return;articleCoverError=true;status.textContent=error.message;main.querySelector('#article-cover-remove').hidden=false;message(error.message)}
 finally{if(token===articleCoverToken)articleCoverLoading=false}
}
function showArticleFront(item){
 const box=document.querySelector('#front-content');
 box.innerHTML=`<article class="article-front"><h1>${safe(item.title)}</h1><p class="muted">${safe(item.summary||'知识库')}</p><div class="article-front-cover">${articleCoverMarkup(item)}</div><div class="markdown"></div></article>`;
 markdownInto(box.querySelector('.markdown'),item.body||'暂无正文。',item.bodyFiles);
 document.querySelector('#front').showModal();
}
main.addEventListener('change',event=>{if(event.target.id==='article-cover-file')loadArticleCover(event.target.files[0])});
main.addEventListener('dragover',event=>{const zone=event.target.closest('[data-article-cover-drop]');if(zone){event.preventDefault();zone.classList.add('dragging')}});
main.addEventListener('dragleave',event=>{const zone=event.target.closest('[data-article-cover-drop]');if(zone&&!zone.contains(event.relatedTarget))zone.classList.remove('dragging')});
main.addEventListener('drop',event=>{const zone=event.target.closest('[data-article-cover-drop]');if(zone){event.preventDefault();zone.classList.remove('dragging');loadArticleCover(event.dataTransfer.files[0])}});
function libraryActions(){
 if(libraryView!=='list')return '<button class="btn" data-library="back">返回列表</button>';
 return (tab==='images'?'<button class="btn" data-library="categories">管理分类</button> ':'')+
 `<button class="btn primary" data-library="new">${tab==='images'?'上传图片':'新建条目'}</button>`;
}
function libraryRows(){
 const q=libraryQuery.trim().toLocaleLowerCase();
 const list=libraryItems();
 const matches=SUSU_CONTENT.newestFirst(list,tab).map(p=>({p,i:list.indexOf(p)})).filter(({p})=>[p.title,p.summary,p.name,p.group,p.alt,p.body].some(v=>v&&v.toLocaleLowerCase().includes(q)));
 return matches.map(({p,i})=>`<tr><td>${tab==='images'?'<img class="list-thumb" src="'+safe(p.url)+'" alt="">':''}<strong>${safe(p.title||p.name)}</strong></td><td>${safe(p.summary||p.group||'未分类')}</td><td><span class="status ${p.state==='草稿'?'draft':''}">${safe(p.state||'已发布')}</span>${p.state==='草稿'&&publishedItem(tab,p.id)?'<small class="pending-note">线上保留已发布版本</small>':''}</td><td><button class="btn" data-library="edit:${i}" aria-label="编辑 ${safe(p.title||p.name)}">编辑</button></td></tr>`).join('')||'<tr><td colspan="4">没有匹配的内容。</td></tr>';
}
function libraryList(){
 return `<section class="panel"><div class="panel-head"><h2>${libraryTitle()}列表</h2><input class="library-search" id="library-search" type="search" value="${safe(libraryQuery)}" placeholder="${tab==='images'?'搜索名称、分类或替代文字':'搜索标题或栏目'}" aria-label="搜索${libraryTitle()}"></div><div class="table-scroll"><table><thead><tr><th>${tab==='images'?'图片':'标题'}</th><th>分类</th><th>状态</th><th>操作</th></tr></thead><tbody id="library-rows">${libraryRows()}</tbody></table></div></section>`;
}
function articleEdit(){
 const item=records.articles[selected]||{title:'',summary:'',state:'草稿',body:''};
 return `<div class="project-editor"><section class="panel"><div class="panel-head"><h2>${selected<0?'新建':'编辑'}知识库条目</h2><span class="status">${safe(item.state)}</span></div><form id="library-article"><div class="pad"><label>标题<input name="title" required maxlength="120" value="${safe(item.title)}"></label>${field('summary','栏目',item.summary)}${articleCoverEditor(item)}${bodyEditorMarkup(item)}</div>${formFoot(selected>=0)}</form></section><section class="panel"><div class="panel-head"><h2>发布管理</h2></div><div class="pad stack"><p class="muted">首页推荐使用上传的封面；未上传时，自动用文章标题生成封面。</p><button class="btn full" data-library="article-front">查看前台详情预览</button><button class="btn primary full" data-action="publish">发布到网站</button><p class="path">保存草稿不会修改线上内容；发布后网站自动更新。</p></div></section></div>`;
}
function imageEdit(){
 const item=photos[selected]||{name:'',group:'',alt:'',body:'',url:'',state:'草稿'};
 return `<div class="project-editor"><section class="panel"><div class="panel-head"><h2>${selected<0?'上传':'编辑'}图片</h2><span class="status ${item.state==='草稿'?'draft':''}">${safe(item.state||'已发布')}</span></div><form id="library-image"><div class="pad"><div id="library-image-preview">${coverImage(item.url?item:null)}</div><label>${selected<0?'选择图片':'替换图片'}<input id="library-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" ${selected<0?'required':''}></label><p class="muted" id="library-file-status" role="status">${item.width&&item.height?`${item.width} × ${item.height} 像素 · ${item.width>item.height?'横图':item.width===item.height?'方图':'竖图'}`:''}</p><label>图片名称<input name="name" required value="${safe(item.name)}"></label><label>图片分类<select name="group">${option('','未分类',item.group)}${imageCategories.map(v=>option(v,v,item.group)).join('')}</select></label>${bodyEditorMarkup(item,'这段介绍会显示在图片详情的大图下方。')}<section class="form-section"><label>替代文字<input name="alt" value="${safe(item.alt)}" placeholder="例如：薄雾中的湖面与松树"><small class="muted">用一句话描述画面，供屏幕阅读器朗读或图片加载失败时使用。它与上方的图片正文不同；纯装饰图可以留空。</small></label></section></div>${formFoot(selected>=0)}</form></section><section class="panel"><div class="panel-head"><h2>发布管理</h2></div><div class="pad stack"><p class="muted">发布后，访客可以点开图片查看完整大图与正文介绍。</p><button class="btn full" data-library="front">查看前台详情预览</button><button class="btn primary full" data-action="publish">发布到网站</button><p class="path">保存草稿不会修改线上内容；发布后网站自动更新。</p></div></section></div>`;
}
function categoryEditor(){
 return `<section class="panel"><div class="panel-head"><h2>图片分类</h2><button class="btn primary" data-action="publish">发布分类设置</button></div><div class="pad"><p class="muted">先保存分类，再发布到网站。发布分类只更新分类名称，不会发布图片的其他草稿修改。</p><form class="category-form" id="add-category"><label>新分类名称<input name="name" required maxlength="24"></label><button class="btn primary">添加分类</button></form>${imageCategories.map((name,i)=>`<form class="category-form" data-category-index="${i}"><label>分类名称<input name="name" required maxlength="24" value="${safe(name)}"></label><span class="muted">${photos.filter(p=>p.group===name).length} 张图片</span><button class="btn">保存名称</button><button class="btn danger" type="button" data-library="delete-category:${i}">删除分类</button></form>`).join('')}</div></section>`;
}
function libraryContent(){
 if(libraryView==='categories')return categoryEditor();
 if(libraryView==='list')return libraryList();
 return tab==='articles'?articleEdit():imageEdit();
}
function libraryAction(b){
 const [action,arg]=(b.dataset.library||'').split(':');
 if(!action)return false;
 if(action==='choose-cover'){main.querySelector('#article-cover-file').click();return true}
 if(action==='remove-cover'){resetArticleCoverDraft();articleCoverDraft=null;refreshArticleCover();markDirty();return true}
 if(action==='article-front'){const data=readLibrary(main.querySelector('#library-article'));if(data)showArticleFront({...records.articles[selected],...data});return true}
 if(action==='front'){
  const data=readLibrary(main.querySelector('#library-image'));
  if(data)showImageFront({...photos[selected],...data});
  return true;
 }
 if(action==='delete-category'){
  const name=imageCategories[Number(arg)];
  if(photos.some(p=>p.group===name)){message('此分类下还有图片，请先为图片更换分类');return true}
  withMutation(async()=>{const draft=snapshotDraft();draft.imageCategories.splice(Number(arg),1);applyState(await api.request('/api/state',{method:'PUT',body:{draft,baseRevision:serverState.revision}}));render();message('分类已删除。')});return true;
 }
 if(action==='back'){if(!discardUnsaved())return true;libraryView='list';resetImageDraft();resetArticleCoverDraft()}
 if(action==='categories'){if(!discardUnsaved())return true;libraryView='categories';resetImageDraft();resetArticleCoverDraft()}
 if(action==='new'||action==='edit'){resetImageDraft();resetArticleCoverDraft();libraryView='edit';selected=action==='new'?-1:Number(arg)}
 render();return true;
}
function resetImageDraft(){
 imageLoadToken++;
 if(imageDraft&&!photos.some(p=>p.url===imageDraft))URL.revokeObjectURL(imageDraft);
 imageDraft=null;imageDraftMeta=null;imageLoading=false;pendingLibrary=null;
}
function readLibrary(form){
 if(!form||!ensureReady())return null;
 if(imageLoading&&form.getAttribute('id')==='library-image'){message('图片正在读取，请稍候再保存或预览');return null}
 if(articleCoverLoading&&form.getAttribute('id')==='library-article'){message('封面正在读取，请稍候再保存或预览');return null}
 if(articleCoverError&&form.getAttribute('id')==='library-article'){message('封面读取失败，请重新选择或移除封面');return null}
 if(!form.reportValidity())return null;
 const data={...Object.fromEntries(new FormData(form)),...form.querySelector?.('[data-body-editor]')?.readBody()},id=form.getAttribute('id');
 if(id==='library-article'){
  data.title=data.title.trim();
  if(!data.title){message('请输入标题');return null}
  data.coverFile=currentArticleCover();
 }else if(id==='library-image'){
  data.name=data.name.trim();
  if(!data.name||(selected<0&&!imageDraft)){message('请填写图片名称并选择文件');return null}
  if(imageDraft&&!imageDraftMeta){message('图片尚未读取成功，请重新选择文件');return null}
  if(data.group&&!imageCategories.includes(data.group)){message('请选择已有图片分类');return null}
  if(imageDraft)Object.assign(data,imageDraftMeta,{url:imageDraft,name:data.name,alt:data.alt});
 }else return null;
 return data;
}
function commitLibrary(kind,item,data,published){
 const now=new Date().toISOString(),list=kind==='articles'?records.articles:photos;
 if(item&&!list.includes(item)){message('这条内容已被删除，请返回列表重新选择');return null}
 if(!item){item=kind==='articles'?{key:String(nextArticleId),id:nextArticleId++,createdAt:now}:{id:crypto.randomUUID(),createdAt:now};list.unshift(item)}
 Object.assign(item,data,{state:'草稿',updatedAt:now});selected=list.indexOf(item);return item;
}
function showImageFront(item){
 const box=document.querySelector('#front-content');
 box.innerHTML=`<article class="image-front"><h1>${safe(item.name)}</h1><p class="muted">${safe(item.group||'未分类')}</p><img class="image-front-full" src="${safe(item.url)}" alt="${safe(item.alt||'')}"><section class="form-section"><h2>图片介绍</h2><div class="markdown image-front-body"></div></section></article>`;
 const body=box.querySelector('.image-front-body');
 if(item.body?.trim())markdownInto(body,item.body,item.bodyFiles);else body.textContent='这张图片暂时还没有介绍。';
 document.querySelector('#front').showModal();
}
async function librarySubmit(form){
 const data=Object.fromEntries(new FormData(form)),categoryIndex=form.dataset.categoryIndex;
 const name=data.name.trim(),i=Number(categoryIndex),old=imageCategories[i];
 if(!name||(name!==old&&imageCategories.includes(name))){message('请填写未使用的分类名称');return true}
 await withMutation(async()=>{
  const draft=snapshotDraft();
  if(form.id==='add-category')draft.imageCategories.push(name);
  else{draft.imageCategories[i]=name;draft.images.filter(p=>p.group===old).forEach(p=>p.group=name)}
  applyState(await api.request('/api/state',{method:'PUT',body:{draft,baseRevision:serverState.revision}}));render();message('图片分类草稿已保存，可点击「发布分类设置」更新网站。');
 });return true;
}
main.addEventListener('input',e=>{
 if(e.target.closest('#library-article')&&['title','summary'].includes(e.target.name)){refreshArticleCover();return}
 if(e.target.id!=='library-search')return;
 libraryQuery=e.target.value;
 main.querySelector('#library-rows').innerHTML=libraryRows();
});
async function libraryFile(input){
 const file=input.files[0];if(!file)return;resetImageDraft();const token=++imageLoadToken;imageLoading=true;
 const status=main.querySelector('#library-file-status');status.textContent='正在上传图片…';
 try{
  const uploaded=await uploadFile(file);
  if(token!==imageLoadToken||!input.isConnected)return;
  imageDraft=uploaded.url;imageDraftMeta={...uploaded,uploadedAt:new Date().toISOString()};
  main.querySelector('#library-image-preview').innerHTML=coverImage(uploaded);
  status.textContent=`${uploaded.width} × ${uploaded.height} 像素 · 已上传`;
  const name=main.querySelector('[name=name]');if(!name.value)name.value=file.name.replace(/\.[^.]+$/,'');markDirty();
 }catch(error){if(token!==imageLoadToken||!input.isConnected)return;imageDraft=null;imageDraftMeta=null;input.value='';status.textContent=error.message;message(error.message)}
 finally{if(token===imageLoadToken)imageLoading=false}
}
const imageBodyStyle=document.createElement('style');
imageBodyStyle.textContent='.image-front-full{display:block;width:100%;height:auto;max-height:65vh;object-fit:contain;margin:20px 0;background:var(--wash)}.image-front h1{font-size:30px;overflow-wrap:anywhere}.image-front-body{max-width:68ch;line-height:1.8}#library-file-status{margin:-3px 0 14px;font-size:12px}.image-front .form-section h2{font-size:18px}@media(max-width:480px){.image-front h1{font-size:25px}}';
document.head.appendChild(imageBodyStyle);
