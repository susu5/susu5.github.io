'use strict';
let maintenanceHistory=[],maintenanceHistoryLoaded=false,maintenanceLoading=false,maintenanceError='',maintenanceStatus='',maintenanceImport=null,maintenanceDetail=null,maintenanceImportSnapshot='draft',maintenanceHistorySnapshot='draft',maintenanceHistoryQuery='',maintenancePending=null,maintenanceWorker=null;
const maintenanceKinds={projects:'项目',articles:'知识库文章',images:'图片'};
const maintenanceSize=bytes=>`${(Number(bytes||0)/1024/1024).toFixed(1)} MB`;
const maintenanceDate=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('zh-CN',{hour12:false}):'时间未知';
const maintenanceCounts=snapshot=>Object.entries(maintenanceKinds).map(([kind,name])=>`${Array.isArray(snapshot[kind])?snapshot[kind].length:Number(snapshot[kind]||0)} ${{projects:'个',articles:'篇',images:'张'}[kind]}${name}`).join(' · ');
function maintenanceReason(reason){
 const map={'save-draft':'保存草稿前',publish:'发布前','restore:backup':'导入备份前'};
 if(map[reason])return map[reason];if(String(reason).startsWith('restore:history:'))return '恢复历史前';
 const [action,kind]=String(reason||'').split(':');return ({create:'新建',delete:'删除'}[action]||'内容更新')+(maintenanceKinds[kind]||'')+'前';
}
function maintenanceSourceSelect(id){const value=id==='maintenance-import-source'?maintenanceImportSnapshot:maintenanceHistorySnapshot;return `<label class="maintenance-source">恢复来源<select id="${id}">${option('draft','备份中的后台草稿（含未发布内容）',value)}${option('published','备份中的已发布版本',value)}</select></label>`}
function maintenanceImportSummary(){
 if(!maintenanceImport)return '<p class="muted">选择本地 ZIP 后，先检查内容与图片，再确认是否恢复。</p>';
 const {manifest,name,files}=maintenanceImport,snapshot=manifest.state[maintenanceImportSnapshot];
 return `<div class="maintenance-summary"><div class="maintenance-summary-title"><strong>${safe(name)}</strong><button class="btn" type="button" data-maintenance="clear-import">移除文件</button></div><p class="muted">${maintenanceDate(manifest.createdAt)} · 版本 ${manifest.state.revision}<br>${files.length} 个图片文件 · ${maintenanceSize(files.reduce((sum,file)=>sum+file.bytes.length,0))} · 完整性校验通过</p>${maintenanceSourceSelect('maintenance-import-source')}<p>${maintenanceCounts(snapshot)}</p><p class="muted">包含个人资料、首页装扮、图片分类和文章关联。恢复将替换当前后台草稿；线上内容保持不变。</p><button class="btn primary" type="button" data-maintenance="restore-import">确认恢复范围</button></div>`;
}
function maintenanceHistoryRows(){
 if(maintenanceLoading)return '<p class="muted maintenance-empty">正在读取云端历史…</p>';
 if(!maintenanceHistory.length)return '<p class="muted maintenance-empty">还没有可恢复的历史版本。下一次保存、发布或删除内容前，会自动保留一份快照。</p>';
 return `<div class="table-scroll maintenance-history-table"><table><thead><tr><th>时间与版本</th><th>保存原因</th><th>草稿内容</th><th>操作</th></tr></thead><tbody>${maintenanceHistory.map(entry=>`<tr><td>${maintenanceDate(entry.createdAt)}<small class="muted">版本 ${entry.revision}</small></td><td>${safe(maintenanceReason(entry.reason))}</td><td>${maintenanceCounts(entry.counts?.draft||{})}</td><td><button class="btn" type="button" data-maintenance="history-detail" data-revision="${entry.revision}">查看与恢复</button></td></tr>`).join('')}</tbody></table></div>`;
}
function maintenanceHistoryItems(){
 if(!maintenanceDetail)return '';
 const snapshot=maintenanceDetail.manifest.state[maintenanceHistorySnapshot],query=maintenanceHistoryQuery.trim().toLocaleLowerCase();
 const items=Object.entries(maintenanceKinds).flatMap(([kind,label])=>snapshot[kind].map(item=>({kind,label,item}))).filter(({item})=>[item.title,item.name,item.summary,item.group].some(value=>String(value||'').toLocaleLowerCase().includes(query)));
 return items.length?`<div class="table-scroll maintenance-recovery-table"><table><thead><tr><th>内容</th><th>类型</th><th>操作</th></tr></thead><tbody>${items.map(({kind,label,item})=>`<tr><td><strong>${safe(item.title||item.name||'未命名内容')}</strong></td><td>${label}</td><td><button class="btn" type="button" data-maintenance="restore-item" data-kind="${kind}" data-id="${safe(item.id)}">恢复为草稿</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="maintenance-empty muted">没有匹配的内容。可以换个标题或栏目搜索。</p>';
}
function maintenanceHistoryDetail(){
 if(!maintenanceDetail)return '';
 const {entry,manifest}=maintenanceDetail;
 return `<section class="panel"><div class="panel-head"><h2>历史版本 ${entry.revision}</h2><button class="btn" type="button" data-maintenance="close-history">收起</button></div><div class="pad"><p class="muted">${maintenanceDate(entry.createdAt)} · ${safe(maintenanceReason(entry.reason))}</p>${maintenanceSourceSelect('maintenance-history-source')}<p>${maintenanceCounts(manifest.state[maintenanceHistorySnapshot])}</p><div class="maintenance-recovery-head"><div><h3>找回单条内容</h3><p class="muted">可以找回已删除的项目、文章或图片。相同编号的现有草稿将被替换。</p></div><label>搜索历史内容<input type="search" id="maintenance-history-search" value="${safe(maintenanceHistoryQuery)}" placeholder="搜索标题或栏目"></label></div><div id="maintenance-history-items">${maintenanceHistoryItems()}</div><div class="maintenance-full-restore"><div><h3>恢复整个版本</h3><p class="muted">将这个版本的全部内容与设置恢复到后台草稿，随后逐项确认并发布。</p></div><button class="btn" type="button" data-maintenance="restore-history">恢复整个版本为草稿</button></div></div></section>`;
}
function maintenancePage(){
 return `<div class="maintenance-layout"><p id="maintenance-progress" class="maintenance-progress ${maintenanceError?'error':''}" role="${maintenanceError?'alert':'status'}" ${maintenanceError||maintenanceStatus?'':'hidden'}>${safe(maintenanceError||maintenanceStatus)}</p><div class="maintenance-columns"><section class="panel"><div class="panel-head"><h2>下载到自己的电脑</h2></div><div class="pad stack"><p>完整备份当前草稿、线上版本、网站设置与所有引用的图片。</p><p class="muted">ZIP 不包含登录令牌或密钥。下载后可离线保存，也可用于迁移和独立维护。请在浏览器下载列表确认文件已保存。</p><button class="btn primary" type="button" data-maintenance="export">下载完整备份 ZIP</button><small class="muted">浏览器备份上限 250 MB；单张图片不超过 32 MB。</small></div></section><section class="panel"><div class="panel-head"><h2>从本地备份恢复</h2></div><div class="pad stack"><label class="maintenance-file">选择备份 ZIP<input type="file" id="maintenance-file" accept=".zip,application/zip,application/x-zip-compressed"></label><div id="maintenance-import-summary">${maintenanceImportSummary()}</div></div></section></div><section class="panel"><div class="panel-head"><h2>云端历史与删除恢复</h2><button class="btn" type="button" data-maintenance="refresh-history">刷新历史</button></div><div class="pad"><p class="muted">后台服务保留最近 50 个修改前版本。云端历史依赖当前服务；下载到电脑的 ZIP 是独立副本，建议定期保留。</p></div>${maintenanceHistoryRows()}</section>${maintenanceHistoryDetail()}</div>`;
}
function maintenanceMount(){if(!maintenanceHistoryLoaded&&!maintenanceLoading)loadMaintenanceHistory()}
function maintenanceProgress(text,error=false){maintenanceStatus=error?'':text;maintenanceError=error?text:'';const node=main.querySelector('#maintenance-progress');if(node){node.hidden=false;node.classList.toggle('error',error);node.setAttribute('role',error?'alert':'status');node.textContent=text}}
async function loadMaintenanceHistory(){
 maintenanceLoading=true;maintenanceHistoryLoaded=true;
 try{const result=await api.request('/api/maintenance/history');maintenanceHistory=Array.isArray(result.history)?result.history:[]}
 catch(error){maintenanceProgress(error.message,true)}finally{maintenanceLoading=false;if(tab==='maintenance'&&!busy)render()}
}
async function maintenanceWork(work){
 if(!ensureReady())return;setBusy(true);maintenanceError='';
 try{await work()}catch(error){maintenanceProgress(error.message||'操作失败，请重试。',true)}finally{setBusy(false);if(tab==='maintenance')render()}
}
function runBackupWorker(action,payload){
 return new Promise((resolve,reject)=>{
  const worker=new Worker('backup-worker.js?v=20261103-backup');maintenanceWorker=worker;
  const timeout=setTimeout(()=>{end();reject(new Error('备份处理超时，请刷新后重试；较大的备份请交由维护人员处理。'))},120000);
  const end=()=>{clearTimeout(timeout);worker.terminate();if(maintenanceWorker===worker)maintenanceWorker=null};
  worker.onmessage=event=>{end();event.data.ok?resolve(event.data.result):reject(new Error(event.data.error))};
  worker.onerror=()=>{end();reject(new Error('备份文件处理失败。请检查文件格式或刷新页面后重试。'))};
  const buffers=action==='unpack'?[payload.bytes.buffer]:payload.files.map(file=>file.bytes.buffer);
  worker.postMessage({action,...payload},[...new Set(buffers)]);
 });
}
async function exportMaintenanceBackup(){
 await maintenanceWork(async()=>{
  maintenanceProgress('正在读取完整内容与图片清单…');const {manifest}=await api.request('/api/maintenance/backup',{timeoutMs:45000,timeoutMessage:'读取备份清单超时，请检查网络后重新点击「下载完整备份 ZIP」。'});SUSU_BACKUP.validateManifest(manifest);const files=[];let total=0;
  for(const [index,item] of manifest.media.entries()){
   if(typeof item.downloadPath!=='string'||!item.downloadPath.startsWith('/api/maintenance/media?'))throw new Error('服务器返回了无效的备份图片地址。');
   maintenanceProgress(`正在备份图片 ${index+1} / ${manifest.media.length}…`);
   const bytes=await api.request(item.downloadPath,{responseType:'bytes',maxBytes:SUSU_BACKUP.LIMITS.media,timeoutMs:90000,timeoutMessage:`第 ${index+1} / ${manifest.media.length} 张备份图片下载超时，请检查网络后重新点击「下载完整备份 ZIP」。`});total+=bytes.length;if(total>SUSU_BACKUP.LIMITS.total)throw new Error('备份超过浏览器处理上限，需要由维护人员分别导出数据库和图片。');files.push({path:item.path,bytes});
  }
  maintenanceProgress('正在校验图片并生成 ZIP…');const result=await runBackupWorker('pack',{manifest,files});
  const blob=new Blob([result.bytes],{type:'application/zip'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='susu5-backup-'+manifest.createdAt.replace(/[:.]/g,'-')+'.zip';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  maintenanceProgress(`备份包已生成（${maintenanceSize(blob.size)}），已发起浏览器下载。请确认文件已保存到电脑。`);
 });
}
async function inspectMaintenanceFile(file){
 if(!file)return;await maintenanceWork(async()=>{
  maintenanceImport=null;if(file.size>SUSU_BACKUP.LIMITS.archive)throw new Error('ZIP 超过 250 MB，请使用独立维护工具校验。');
  maintenanceProgress('正在离线校验备份内容、图片与校验和…');const result=await runBackupWorker('unpack',{bytes:new Uint8Array(await file.arrayBuffer())});maintenanceImport={...result,name:file.name};maintenanceImportSnapshot='draft';maintenanceProgress('备份校验通过。请选择恢复来源，再确认恢复范围。');
 });
}
function askMaintenanceRestore(pending){
 const current=snapshotDraft(),source=pending.manifest.state[pending.snapshot];let description;
 if(pending.selection){const item=source[pending.selection.kind].find(row=>String(row.id)===String(pending.selection.id));if(!item)throw new Error('历史内容不存在，请刷新后重试。');description=`将「${item.title||item.name}」恢复为草稿。如当前存在相同编号，会替换该条草稿。其他内容和线上版本保持不变。`}
 else description=`将${pending.historyRevision!==undefined?'历史版本 '+pending.historyRevision:'本地备份'}中的${pending.snapshot==='draft'?'后台草稿':'已发布版本'}恢复到后台。来源：${maintenanceCounts(source)}；当前：${maintenanceCounts(current)}。全部当前草稿与设置将被替换，线上内容保持不变。恢复前会保留当前云端历史。`;
 maintenancePending=pending;document.querySelector('#maintenance-restore-description').textContent=description;document.querySelector('#maintenance-restore-dialog').showModal();
}
async function uploadMaintenanceMedia(file){
 if(file.size>SUSU_BACKUP.LIMITS.media)throw new Error('备份图片超过 32 MB。');
 const url=URL.createObjectURL(file);
 try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw new Error('备份图片无法读取：'+file.name);const form=new FormData();form.append('file',file);form.append('width',String(image.naturalWidth));form.append('height',String(image.naturalHeight));const {file:uploaded}=await api.request('/api/maintenance/media',{method:'POST',body:form});if(!uploaded?.path)throw new Error('备份图片上传未完成，请重试。');return uploaded}
 finally{URL.revokeObjectURL(url)}
}
async function restoreMaintenance(pending){
 await maintenanceWork(async()=>{
  const body={baseRevision:serverState.revision,snapshot:pending.snapshot};
  if(pending.historyRevision!==undefined){body.historyRevision=pending.historyRevision;if(pending.selection)body.selection=pending.selection;maintenanceProgress('正在从云端历史恢复到草稿…')}
  else{
   body.manifest=pending.manifest;body.mediaMap={};const refs=SUSU_BACKUP.collectMedia(pending.manifest.state[pending.snapshot]),files=new Map(maintenanceImport.files.map(file=>[file.path,file.bytes])),metadata=new Map(pending.manifest.media.map(file=>[file.path,file]));
   for(const [index,path] of refs.entries()){
    maintenanceProgress(`正在恢复图片 ${index+1} / ${refs.length}…`);const bytes=files.get(path),meta=metadata.get(path);if(!bytes||!meta)throw new Error('备份图片不完整，请重新选择 ZIP。');
    const uploaded=await uploadMaintenanceMedia(new File([bytes],path.split('/').pop(),{type:meta.mime}));body.mediaMap[path]=uploaded.path;
   }
   maintenanceProgress('图片已上传，正在恢复内容到草稿…');
  }
  const result=await api.request('/api/maintenance/restore',{method:'POST',body});applyState(result);projectOpen=false;libraryView='list';resetArticleCoverDraft();resetImageDraft();maintenanceDetail=null;maintenanceHistoryQuery='';maintenanceImport=null;
  maintenanceProgress('已恢复为后台草稿，线上网站未改变。请进入对应内容页面检查后，再点击发布。');maintenanceHistoryLoaded=false;await loadMaintenanceHistory();
 });
}
async function maintenanceAction(button){
 const action=button.dataset.maintenance;if(!action)return false;
 if(action==='export')await exportMaintenanceBackup();
 if(action==='clear-import'){maintenanceImport=null;maintenanceStatus='';maintenanceError='';render()}
 if(action==='refresh-history'){maintenanceHistoryLoaded=false;maintenanceError='';await loadMaintenanceHistory()}
 if(action==='close-history'){maintenanceDetail=null;maintenanceHistoryQuery='';render()}
 if(action==='history-detail')await maintenanceWork(async()=>{maintenanceProgress('正在读取历史版本…');const result=await api.request('/api/maintenance/history/'+encodeURIComponent(button.dataset.revision));SUSU_BACKUP.validateManifest(result.manifest);maintenanceDetail=result;maintenanceHistorySnapshot='draft';maintenanceHistoryQuery='';maintenanceStatus='';maintenanceError=''});
 if(action==='restore-import'&&maintenanceImport)askMaintenanceRestore({manifest:maintenanceImport.manifest,snapshot:maintenanceImportSnapshot});
 if(action==='restore-history'&&maintenanceDetail)askMaintenanceRestore({manifest:maintenanceDetail.manifest,historyRevision:maintenanceDetail.entry.revision,snapshot:maintenanceHistorySnapshot});
 if(action==='restore-item'&&maintenanceDetail)askMaintenanceRestore({manifest:maintenanceDetail.manifest,historyRevision:maintenanceDetail.entry.revision,snapshot:maintenanceHistorySnapshot,selection:{kind:button.dataset.kind,id:button.dataset.kind==='images'?button.dataset.id:Number(button.dataset.id)}});
 return true;
}
main.addEventListener('change',event=>{
 if(event.target.id==='maintenance-file'){inspectMaintenanceFile(event.target.files[0]);return}
 if(['maintenance-import-source','maintenance-history-source'].includes(event.target.id)){if(event.target.id==='maintenance-import-source')maintenanceImportSnapshot=event.target.value;else maintenanceHistorySnapshot=event.target.value;render();document.getElementById(event.target.id)?.focus()}
});
main.addEventListener('input',event=>{if(event.target.id==='maintenance-history-search'){maintenanceHistoryQuery=event.target.value;main.querySelector('#maintenance-history-items').innerHTML=maintenanceHistoryItems()}});
const maintenanceDialog=document.querySelector('#maintenance-restore-dialog');
maintenanceDialog.addEventListener('cancel',()=>{maintenanceDialog.returnValue='cancel'});
maintenanceDialog.addEventListener('close',()=>{const pending=maintenancePending;maintenancePending=null;if(maintenanceDialog.returnValue==='restore'&&pending)restoreMaintenance(pending)});
function clearMaintenance(){maintenanceWorker?.terminate();maintenanceWorker=null;maintenanceImport=null;maintenanceDetail=null;maintenanceHistory=[];maintenanceHistoryLoaded=false;maintenanceError='';maintenanceStatus='';maintenancePending=null}
