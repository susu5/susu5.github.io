'use strict';
const assets='../assets/';
const labels={home:'首页装扮',projects:'项目',articles:'知识库',images:'图片',profile:'个人资料',maintenance:'备份与恢复'};
const records={projects:[],articles:[]},photos=[],profileData={},homeData={heroMode:'auto',featuredMode:'auto',hero:'',caption:'',featured:['','','','','']};
let tab='home',selected=0,timer,phase='已连接',deleteTarget=null,pendingSelection=null;
let serverState=null,lastServerState=null,busy=false,uploadsInFlight=0,dirty=false,publishPoll;
const main=document.querySelector('#main'),nav=document.querySelector('#nav'),modal=document.querySelector('#confirm');
const api=SUSU_API.createClient({onUnauthorized:()=>{showLogin('登录已过期，请重新登录。未保存的内容仍保留在这个窗口。')}});
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(name,label,value,type='text')=>`<label>${label}<input type="${type}" name="${name}" value="${safe(value)}"></label>`;
const option=(value,label,chosen)=>`<option value="${safe(value)}" ${String(value)===String(chosen)?'selected':''}>${safe(label)}</option>`;
const photo=id=>photos.find(p=>String(p.id)===String(id));
const mediaURL=value=>typeof value==='string'&&value.startsWith('assets/')?'/'+value:value||'';
const coverImage=p=>p?.url?`<img class="cover" src="${safe(mediaURL(p.url))}" alt="${safe(p.alt||p.name||'')}">`:'';
const clone=value=>structuredClone(value);
const publishedItem=(kind,id)=>(serverState?.published?.[kind]||[]).find(item=>String(item.id)===String(id));
function message(text){const el=document.querySelector('#toast');el.textContent=text;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,6500)}
function markDirty(){dirty=true;document.querySelector('#connection-status').textContent='有未保存修改'}
function hydrateView(value){
 if(Array.isArray(value))return value.map(hydrateView);
 if(value&&typeof value==='object'){const result={};for(const [key,item] of Object.entries(value))result[key]=key==='url'?mediaURL(item):hydrateView(item);return result}
 return value;
}
function applyState(input){
 const state=input?.state||input;if(!state?.draft||!Number.isInteger(state.revision))throw new Error('服务器返回了无效的内容状态。');
 serverState=clone(state);lastServerState=clone(state);
 const draft=hydrateView(state.draft);
 records.projects.splice(0,records.projects.length,...draft.projects);
 records.articles.splice(0,records.articles.length,...draft.articles);
 photos.splice(0,photos.length,...draft.images);
 for(const key of Object.keys(profileData))delete profileData[key];Object.assign(profileData,draft.profile);
 Object.assign(homeData,draft.home);homeDraft=null;
 imageCategories.splice(0,imageCategories.length,...draft.imageCategories);
 nextId=state.nextProjectId;nextArticleId=state.nextArticleId;dirty=false;
 document.querySelector('#connection-status').textContent='已连接 · 内容已保存';
}
function snapshotDraft(){return {projects:clone(records.projects),articles:clone(records.articles),images:clone(photos),profile:clone(profileData),home:clone(homeData),imageCategories:[...imageCategories]}}
function setBusy(value){busy=value;main.inert=value;nav.inert=value;document.querySelector('#refresh-state').disabled=value;document.querySelector('#connection-status').textContent=value?'正在保存…':dirty?'有未保存修改':'已连接 · 内容已保存'}
function ensureReady(){if(busy)return false;if(uploadsInFlight){message('图片正在上传，请上传完成后再保存或发布。');return false}return true}
async function persistDraft(){
 const result=await api.request('/api/state',{method:'PUT',body:{draft:snapshotDraft(),baseRevision:serverState.revision}});
 applyState(result);return result;
}
async function withMutation(work){
 if(!ensureReady())return false;setBusy(true);
 try{await work();return true}catch(error){message(error.message);dirty=true;return false}finally{setBusy(false)}
}
async function saveChanges(text='草稿已保存，网站内容保持不变。'){
 return withMutation(async()=>{await persistDraft();phase='草稿已保存';render();message(text)});
}
function discardUnsaved(){
 if(!dirty)return true;
 if(!window.confirm('还有未保存的修改。离开此页并放弃这些修改吗？'))return false;
 if(lastServerState)applyState(lastServerState);resetArticleCoverDraft();resetImageDraft();return true;
}
function render(){
 nav.innerHTML=Object.entries(labels).map(([key,label])=>`<button data-tab="${key}" ${tab===key?'aria-current="page"':''}>${label}</button>`).join('');
 const sub={projects:'管理项目、封面、进度和访问地址。',articles:'编辑知识库条目与封面。',images:'上传图片，编辑分类与介绍。',profile:'设置首页介绍、头像和联系方式。',home:'设置首页首图和「最近，正在着迷」的推荐内容。',maintenance:'保留自己的完整副本，找回误删或需要回退的内容。'};
 const extra=isLibrary()?libraryActions():tab==='projects'?(projectOpen?'<button class="btn" data-project="back">返回项目列表</button>':'<button class="btn primary" data-project="new">新建项目</button>'):'';
 main.innerHTML=`<div class="heading"><div><h1>${tab==='projects'&&projectOpen?'编辑项目':labels[tab]}</h1><p class="muted">${sub[tab]}</p></div><div>${extra}</div></div>`+(isLibrary()?libraryContent():tab==='projects'?(projectOpen?projectEditor():projectList()):tab==='home'?homeEditor():tab==='maintenance'?maintenancePage():profile())+pendingDeletionPanel();
 if(tab==='maintenance')maintenanceMount();
}
function pendingDeletionPanel(){
 if(!['projects','articles','images'].includes(tab)||projectOpen||libraryView!=='list')return '';
 const draft=tab==='images'?photos:records[tab];
 const missing=(serverState?.published?.[tab]||[]).filter(item=>!draft.some(row=>String(row.id)===String(item.id)));
 if(!missing.length)return '';
 return `<section class="panel pad pending-deletions"><h2>等待从网站删除</h2><p class="muted">以下内容已从草稿移除，线上仍保留旧版本。可以重试发布删除，或恢复编辑。</p>${missing.map(item=>`<div class="pending-delete-row"><strong>${safe(item.title||item.name)}</strong><button class="btn danger" data-pending-delete="${safe(item.id)}">发布删除</button><button class="btn" data-restore="${safe(item.id)}">恢复草稿</button></div>`).join('')}</section>`;
}
function publishPanel(){return `<section class="panel publish"><div class="panel-head"><h2>发布</h2></div><div class="pad stack"><p class="muted">保存草稿仅更新后台。点击发布后，网站会自动更新。</p><button class="btn primary full" data-action="publish">发布到网站</button></div></section>`}
function formFoot(removable=false){return `<div class="foot">${removable?'<button type="button" class="btn danger" data-action="delete">删除</button>':'<span class="muted">草稿仅自己可见</span>'}<button class="btn">保存草稿</button></div>`}
function linkRow(platform='',url=''){return `<div class="link-row">${field('platform','平台',platform)}${field('url','地址',url,'url')}<button class="btn" type="button" data-action="remove-link" aria-label="移除此项目地址">移除</button></div>`}
function profile(){return `<div class="layout"><section class="panel"><div class="panel-head"><h2>首页头像</h2></div><div class="pad"><img class="profile-avatar" src="${safe(mediaURL(profileData.avatarFile?.url||profileData.avatar||assets+'susu-avatar.png'))}" alt="头像"></div></section><section class="panel"><div class="panel-head"><h2>编辑个人资料</h2></div><form id="profile"><div class="pad"><label>更换头像<input id="avatar" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"></label>${field('name','展示名',profileData.name)}${field('tag','身份标签',profileData.tag)}${field('headline','中文介绍',profileData.headline)}${field('english','英文介绍',profileData.english)}${field('wechatPublic','公众号名称',profileData.wechatPublic)}${field('wechat','微信号',profileData.wechat)}${field('github','GitHub 用户名',profileData.github)}${field('email','邮箱',profileData.email,'email')}</div>${formFoot()}</form></section>${publishPanel()}</div>`}
function setChanged(text){markDirty();render();message(text)}
function captureCurrent(){
 if(!ensureReady())return null;
 if(tab==='images'&&libraryView==='categories'){
  if(dirty){message('请先保存分类名称，再发布分类设置。');return null}
  return {kind:'imageCategories',action:'upsert'};
 }
 if(tab==='projects'&&projectOpen){const data=readProject(main.querySelector('#project-record'));if(!data)return null;const item=records.projects[selected];Object.assign(item,data,{publication:'draft',updatedAt:new Date().toISOString()});markDirty();return {kind:'projects',id:item.id,action:'upsert'}}
 if(isLibrary()&&libraryView==='edit'){
  const data=readLibrary(main.querySelector(tab==='images'?'#library-image':'#library-article'));if(!data)return null;
  const item=commitLibrary(tab,libraryItems()[selected]||null,data,false);if(!item)return null;markDirty();return {kind:tab,id:item.id,action:'upsert'};
 }
 if(tab==='profile'){const form=main.querySelector('#profile');if(!form.reportValidity())return null;Object.assign(profileData,Object.fromEntries(new FormData(form)));markDirty();return {kind:'profile',action:'upsert'}}
 if(tab==='home'){if(!saveHome(false))return null;markDirty();return {kind:'home',action:'upsert'}}
 return null;
}
function preparePublish(){
 const selection=captureCurrent();if(!selection)return;
 pendingSelection=selection;document.querySelector('#publish-description').textContent='发布当前'+(selection.kind==='imageCategories'?'图片分类':labels[selection.kind])+'到 susu5.cn。其他草稿不会一起发布。';modal.showModal();
}
async function publishSelection(selection){
 await persistDraft();
 const result=await api.request('/api/publish',{method:'POST',body:{selection,baseRevision:serverState.revision}});
 applyState(result);projectOpen=false;libraryView='list';resetArticleCoverDraft();resetImageDraft();
 phase='已提交发布';render();
 const bar=document.querySelector('#publication-status');bar.hidden=false;bar.className='publication-status';
 bar.replaceChildren(document.createTextNode(result.publishStatus==='unchanged'?'当前内容已是最新版本。':'内容已提交，GitHub Pages 正在更新网站。'));
 const link=document.createElement('a');link.href='/';link.target='_blank';link.rel='noopener';link.textContent='查看网站';bar.appendChild(link);
 message(result.publishStatus==='unchanged'?'内容没有变化，无需重复发布。':'已提交发布。网站更新后会在这里提示。');
 if(result.publishStatus!=='unchanged')pollPublication(result.commitSha);
}
function pollPublication(commitSha){
 clearTimeout(publishPoll);let attempts=0;
 const poll=async()=>{
  if(!api.hasToken()||attempts++>=20)return;
  try{
   const data=await api.request('/api/publish-status'+(commitSha?'?sha='+encodeURIComponent(commitSha):''));
   const status=data.status||data.build?.status||data.publishStatus;
   const bar=document.querySelector('#publication-status');
   if(status==='built'&&commitSha&&data.commitSha===commitSha){bar.firstChild.textContent='网站已更新。';return}
   if(status==='errored'||status==='failed'){bar.classList.add('error');bar.firstChild.textContent='内容已保存，但网站构建失败。请检查 GitHub Pages 的构建记录。';return}
  }catch(error){if(error.status===401)return}
  publishPoll=setTimeout(poll,15000);
 };publishPoll=setTimeout(poll,5000);
}
async function uploadFile(file){
 if(!file||!/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type))throw new Error('请选择 JPG、PNG、WebP、GIF 或 AVIF 图片。');
 if(file.size>10*1024*1024)throw new Error('图片不能超过 10 MB，请压缩后重新上传。');
 uploadsInFlight++;const localURL=URL.createObjectURL(file);
 try{const img=new Image();img.src=localURL;await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw new Error('图片无法读取。');const form=new FormData();form.append('file',file);form.append('width',String(img.naturalWidth));form.append('height',String(img.naturalHeight));const result=await api.request('/api/upload',{method:'POST',body:form});const uploaded=result.file||result;if(!uploaded.path||!uploaded.url)throw new Error('图片上传未完成，请重试。');return uploaded}
 finally{uploadsInFlight--;URL.revokeObjectURL(localURL)}
}
nav.onclick=e=>{const b=e.target.closest('[data-tab]');if(!b||busy||uploadsInFlight)return;if(!discardUnsaved())return;resetArticleCoverDraft();resetImageDraft();tab=b.dataset.tab;selected=0;projectOpen=false;libraryView='list';libraryQuery='';render()};
main.onclick=async e=>{
 const b=e.target.closest('button');if(!b||busy)return;
 try{
  if(tab==='maintenance'&&await maintenanceAction(b))return;
  if(b.dataset.pendingDelete!==undefined){deleteTarget={kind:tab,id:b.dataset.pendingDelete,name:publishedItem(tab,b.dataset.pendingDelete)?.title||publishedItem(tab,b.dataset.pendingDelete)?.name};document.querySelector('#delete-name').textContent=deleteTarget.name;document.querySelector('#delete-dialog').showModal();return}
  if(b.dataset.restore!==undefined){await withMutation(async()=>{const item=publishedItem(tab,b.dataset.restore),draft=snapshotDraft();if(!item)return;draft[tab].push(clone(item));applyState(await api.request('/api/state',{method:'PUT',body:{draft,baseRevision:serverState.revision}}));render();message('内容已恢复到草稿列表。')});return}
  if(tab==='projects'&&projectAction(b))return;
  if(isLibrary()&&libraryAction(b))return;
  if(b.dataset.action==='publish'){preparePublish();return}
  if(b.dataset.action==='add-link'){main.querySelector('#links').insertAdjacentHTML('beforeend',linkRow());markDirty()}
  if(b.dataset.action==='remove-link'){b.closest('.link-row').remove();markDirty()}
  if(b.dataset.action==='delete'){
   if(!ensureReady())return;
   const list=tab==='images'?photos:records[tab],item=list[selected];if(!item)return;
   deleteTarget={kind:tab,id:item.id,name:item.title||item.name};document.querySelector('#delete-name').textContent=deleteTarget.name;document.querySelector('#delete-dialog').showModal();
  }
 }catch(error){message(error.message)}
};
main.onsubmit=async e=>{
 e.preventDefault();if(!ensureReady())return;
 if(isLibrary()&&(e.target.id==='add-category'||e.target.dataset.categoryIndex!==undefined)){await librarySubmit(e.target);return}
 const selection=captureCurrent();if(!selection)return;
 await withMutation(async()=>{await persistDraft();projectOpen=false;libraryView='list';resetArticleCoverDraft();resetImageDraft();render();message('草稿已保存，网站内容保持不变。')});
};
main.onchange=async e=>{
 if(e.target.id==='library-file'){libraryFile(e.target);return}
 if(e.target.dataset.upload){addFiles(e.target.dataset.upload,e.target.files);e.target.value='';return}
 if(e.target.id==='avatar'&&e.target.files[0]){
  const input=e.target;try{message('正在上传头像…');const file=await uploadFile(input.files[0]);if(!input.isConnected)return;profileData.avatarFile=file;profileData.avatar=file.path;main.querySelector('.profile-avatar').src=file.url;markDirty();message('头像已上传，请保存或发布个人资料。')}catch(error){message(error.message)}
 }
};
main.addEventListener('input',e=>{if(!['library-search','project-related-search'].includes(e.target.id)&&e.target.closest('form'))markDirty()});
modal.addEventListener('close',async()=>{if(modal.returnValue!=='publish'||!pendingSelection)return;const selection=pendingSelection;pendingSelection=null;await withMutation(()=>publishSelection(selection))});
const deleteDialog=document.querySelector('#delete-dialog');
deleteDialog.addEventListener('close',async()=>{
 if(deleteDialog.returnValue!=='delete'||!deleteTarget)return;const target=deleteTarget;deleteTarget=null;
 await withMutation(async()=>{
  const online=Boolean(publishedItem(target.kind,target.id)),draft=snapshotDraft(),list=draft[target.kind];
  const index=list.findIndex(item=>String(item.id)===String(target.id));
  if(index>=0){const item=list[index];list.splice(index,1);draft.home.featured=draft.home.featured.map(ref=>ref===target.kind+':'+(item.key||item.id)?'':ref);if(target.kind==='images'&&draft.home.hero===String(item.id))draft.home.hero='';applyState(await api.request('/api/state',{method:'PUT',body:{draft,baseRevision:serverState.revision}}))}
  projectOpen=false;libraryView='list';render();
  if(online)await publishSelection({kind:target.kind,id:target.id,action:'delete'});else message('草稿已删除。');
 });
});
for(const dialog of [modal,deleteDialog])dialog.addEventListener('cancel',()=>{dialog.returnValue='cancel'});
document.querySelector('#refresh-state').onclick=async()=>{if(busy||!discardUnsaved())return;await withMutation(async()=>{applyState(await api.request('/api/state'));projectOpen=false;libraryView='list';render();message('内容已刷新。')})};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
