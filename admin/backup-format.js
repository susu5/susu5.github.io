(function(root){
 'use strict';
 const LIMITS=Object.freeze({archive:250*1024*1024,total:250*1024*1024,media:32*1024*1024,manifest:8*1024*1024,entries:5001});
 const fail=message=>{throw new Error(message)};
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 const clone=value=>JSON.parse(JSON.stringify(value));
 function mediaPath(value){
  if(typeof value!=='string'||!/^assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:png|jpe?g|webp|gif|avif)$/i.test(value)||value.includes('..'))fail('备份包含不安全的图片路径。');
  return value;
 }
 function inspectKeys(value,depth=0){
  if(depth>40)fail('备份的数据层级过深。');
  if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){
   if(['__proto__','constructor','prototype'].includes(key)||/(?:token|password|secret|credential|private[_-]?key)/i.test(key)||/^(?:auth|sessions)$/i.test(key))fail('备份不能包含登录凭据或不安全的数据字段。');
   inspectKeys(item,depth+1);
  }
 }
 function collectMedia(snapshot){
  const paths=new Set(),add=file=>{if(file)paths.add(mediaPath(typeof file==='string'?file:file.path??file.url))};
  for(const project of snapshot.projects){add(project.coverFile);for(const file of project.detailFiles||[])add(file)}
  for(const article of snapshot.articles)add(article.coverFile);
  for(const image of snapshot.images)add(image);
  add(snapshot.profile.avatarFile||snapshot.profile.avatar);
  return [...paths];
 }
 function validateSnapshot(snapshot){
  if(!object(snapshot))fail('备份缺少内容快照。');
  const groups=['projects','articles','images','imageCategories'];
  for(const group of groups)if(!Array.isArray(snapshot[group])||snapshot[group].length>5000)fail('备份的内容列表无效或数量过多。');
  if(!object(snapshot.profile)||!object(snapshot.home))fail('备份缺少个人资料或首页设置。');
  for(const kind of ['projects','articles','images']){
   const seen=new Set();for(const item of snapshot[kind]){if(!object(item))fail('备份包含无效内容。');const id=String(item.id??'');if(!id||seen.has(id))fail('备份包含重复或缺失的内容编号。');seen.add(id)}
  }
  collectMedia(snapshot);
 }
 function canonicalState(state){
  const result=clone(state),canonical=file=>{if(file){const path=mediaPath(file.path??file.url);file.path=path;file.url=path}};
  for(const snapshot of [result.draft,result.published]){
   for(const project of snapshot.projects){canonical(project.coverFile);for(const file of project.detailFiles||[])canonical(file)}
   snapshot.articles.forEach(item=>canonical(item.coverFile));snapshot.images.forEach(canonical);canonical(snapshot.profile.avatarFile);
   snapshot.profile.avatar=snapshot.profile.avatarFile?mediaPath(snapshot.profile.avatarFile.path):mediaPath(snapshot.profile.avatar);
  }
  return result;
 }
 function validateManifest(manifest,{portable=false}={}){
  if(!object(manifest)||manifest.format!=='susu5-backup'||manifest.version!==1||manifest.site!=='susu5.cn')fail('这不是受支持的 Susu 备份。请选择后台导出的 ZIP 文件。');
  inspectKeys(manifest);
  const state=manifest.state;if(!object(state)||state.schemaVersion!==1||!Number.isSafeInteger(state.revision)||state.revision<0)fail('备份的内容版本无效。');
  const allowed=new Set(['schemaVersion','revision','nextProjectId','nextArticleId','draft','published']);
  if(Object.keys(state).some(key=>!allowed.has(key)))fail('备份状态包含不支持的字段。');
  for(const key of ['nextProjectId','nextArticleId'])if(!Number.isSafeInteger(state[key])||state[key]<1)fail('备份的编号计数无效。');
  validateSnapshot(state.draft);validateSnapshot(state.published);
  if(portable&&JSON.stringify(canonicalState(state))!==JSON.stringify(state))fail('备份中仍包含临时图片地址或非规范图片字段。');
  if(!Array.isArray(manifest.media)||manifest.media.length>LIMITS.entries-1)fail('备份图片清单无效。');
  const references=new Set([...collectMedia(state.draft),...collectMedia(state.published)]),seen=new Set();
  for(const file of manifest.media){
   if(!object(file))fail('备份图片清单无效。');const path=mediaPath(file.path);
   if(file.archivePath!==path||seen.has(path)||!references.has(path))fail('备份图片清单包含重复或无效路径。');seen.add(path);
   if(portable&&Object.prototype.hasOwnProperty.call(file,'downloadPath'))fail('便携备份不能保留临时下载地址。');
   for(const key of ['width','height'])if(file[key]!==undefined&&(!Number.isSafeInteger(file[key])||file[key]<1||file[key]>100000))fail('备份图片尺寸无效。');
   if(portable&&(!Number.isSafeInteger(file.size)||file.size<1||file.size>LIMITS.media||!/^[a-f0-9]{64}$/.test(file.sha256||'')))fail('备份图片缺少完整性校验信息。');
  }
  if([...references].some(path=>!seen.has(path)))fail('备份缺少内容引用的图片文件。');
  if(!Number.isFinite(Date.parse(manifest.createdAt)))fail('备份日期无效。');return manifest;
 }
 function imageMime(bytes){
  const ascii=(from,to)=>String.fromCharCode(...bytes.subarray(from,to));
  if(bytes.length>=8&&bytes[0]===137&&ascii(1,4)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return 'image/png';
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(bytes.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';
  if(bytes.length>=6&&['GIF87a','GIF89a'].includes(ascii(0,6)))return 'image/gif';
  if(bytes.length>=16&&ascii(4,8)==='ftyp'&&/avif|avis/.test(ascii(8,Math.min(40,bytes.length))))return 'image/avif';
  fail('备份包含不受支持或损坏的图片。');
 }
 const hash=async bytes=>[...new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
 function mediaMatches(file,bytes){
  const mime=imageMime(bytes),extension=file.path.split('.').pop().toLowerCase(),expected={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',avif:'image/avif'}[extension];
  if(mime!==expected||(file.mime&&file.mime!==mime))fail('图片格式与备份清单不一致：'+file.path);return mime;
 }
 async function pack(rawManifest,files){
  validateManifest(rawManifest);const byPath=new Map(files.map(file=>[mediaPath(file.path),file.bytes]));
  if(byPath.size!==files.length||files.length!==rawManifest.media.length)fail('备份图片未全部下载完成。');
  const manifest={format:'susu5-backup',version:1,createdAt:rawManifest.createdAt,site:'susu5.cn',state:canonicalState(rawManifest.state),media:[]},archive=Object.create(null);let total=0;
  for(const item of rawManifest.media){const bytes=byPath.get(item.path);if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>LIMITS.media)fail('备份图片缺失或超过 32 MB：'+item.path);total+=bytes.length;if(total>LIMITS.total)fail('备份超过浏览器处理上限，需要由维护人员分别导出数据库和图片。');const mime=mediaMatches(item,bytes),dimensions={};for(const key of ['width','height'])if(item[key]!==undefined)dimensions[key]=item[key];manifest.media.push({path:item.path,archivePath:item.path,mime,size:bytes.length,sha256:await hash(bytes),...dimensions});archive[item.path]=[bytes,{level:0}]}
  const json=new TextEncoder().encode(JSON.stringify(manifest,null,2));if(json.length>LIMITS.manifest||total+json.length>LIMITS.total)fail('备份超过允许的大小。');archive['manifest.json']=[json,{level:0}];
  const bytes=root.fflate.zipSync(archive,{level:0});if(bytes.length>LIMITS.archive)fail('备份超过浏览器处理上限，需要由维护人员分别导出数据库和图片。');return {manifest,bytes};
 }
 async function unpack(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>LIMITS.archive||bytes.length<22)fail('备份 ZIP 无效或超过 250 MB。');
  let entries=0,total=0;const seen=new Set();
  const archive=root.fflate.unzipSync(bytes,{filter:file=>{
   if(++entries>LIMITS.entries)fail('备份 ZIP 文件数量过多。');
   const name=file.name;if(name!=='manifest.json')mediaPath(name);
   if(seen.has(name))fail('备份 ZIP 包含重名文件。');seen.add(name);
   const limit=name==='manifest.json'?LIMITS.manifest:LIMITS.media;
   if(!Number.isSafeInteger(file.originalSize)||file.originalSize<1||file.originalSize>limit)fail('备份 ZIP 包含过大的文件。');
   total+=file.originalSize;if(total>LIMITS.total)fail('备份 ZIP 解压后超过 250 MB。');return true;
  }});
  if(!archive['manifest.json'])fail('备份 ZIP 缺少 manifest.json。');
  let manifest;try{manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(archive['manifest.json']))}catch{fail('备份清单 JSON 已损坏。')}
  validateManifest(manifest,{portable:true});if(Object.keys(archive).length!==manifest.media.length+1)fail('备份 ZIP 含有清单之外的文件。');
  const files=[];for(const item of manifest.media){const data=archive[item.path];if(!data||data.length!==item.size)fail('备份图片缺失或大小不符：'+item.path);mediaMatches(item,data);if(await hash(data)!==item.sha256)fail('备份图片校验失败：'+item.path);files.push({path:item.path,bytes:data})}
  return {manifest,files};
 }
 root.SUSU_BACKUP={LIMITS,mediaPath,collectMedia,validateManifest,imageMime,pack,unpack};
})(globalThis);
