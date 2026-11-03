import {readFile,readdir,lstat,access} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const errors=[];
const assert=(condition,message)=>{if(!condition)errors.push(message)};
const localAssets=new Set();
function inspect(value,path='content'){
 if(!value||typeof value!=='object')return;
 if(Array.isArray(value)){value.forEach((item,index)=>inspect(item,`${path}[${index}]`));return}
 for(const [key,item] of Object.entries(value)){
  assert(!['sessionToken','accessToken','clientSecret','privateKey','storageKey'].includes(key),`${path}.${key}: private data must not be published`);
  if(['url','avatar','path'].includes(key)&&typeof item==='string'&&item.startsWith('assets/')){
   assert(!item.includes('..')&&!item.includes('\\')&&!/[?#]/.test(item),`${path}.${key}: unsafe asset path`);
   localAssets.add(item);
  }
  inspect(item,`${path}.${key}`);
 }
}
const data=JSON.parse(await readFile(resolve(root,'content.json'),'utf8'));
const allowed=new Set(['projects','notes','arts','profile','home','imageCategories','_cmsRevision']);
for(const key of Object.keys(data))assert(allowed.has(key),`Unexpected public root field: ${key}`);
for(const kind of ['projects','notes','arts']){
 assert(Array.isArray(data[kind]),`${kind} must be an array`);
 const ids=new Set();
 for(const item of data[kind]||[]){
  assert(item.id!==undefined&&!ids.has(String(item.id)),`${kind}: missing or duplicate id`);ids.add(String(item.id));
  assert(item.publication!=='draft'&&item.state!=='草稿',`${kind}/${item.id}: draft must not be public`);
  if(kind!=='arts')assert(Number.isSafeInteger(item.id)&&item.id>0,`${kind}: invalid id`);
 }
}
const notes=new Set((data.notes||[]).map(item=>item.id));
for(const project of data.projects||[]){
 assert(project.id<=100,`Project ${project.id}: exceeds project wall`);
 if(project.relatedArticleIds!==undefined){
  assert(Array.isArray(project.relatedArticleIds),'Project relations must be an array');
  for(const id of project.relatedArticleIds||[])assert(notes.has(id),`Project ${project.id}: missing published article ${id}`);
 }
 for(const link of project.links||[])assert(/^https?:\/\//i.test(link.url||''),`Project ${project.id}: invalid project URL`);
}
inspect(data);
for(const path of localAssets){try{await access(resolve(root,path))}catch{errors.push(`Missing referenced image: ${path}`)}}
async function checkScripts(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.')||['assets','_site','node_modules','vendor'].includes(entry.name))continue;
  const path=resolve(dir,entry.name);
  if(entry.isSymbolicLink()){errors.push(`Symbolic link not allowed: ${relative(root,path)}`);continue}
  if(entry.isDirectory())await checkScripts(path);
  else if(['.js','.mjs'].includes(extname(path))){
   const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
   if(result.status!==0)errors.push(`Invalid JavaScript: ${relative(root,path)}\n${result.stderr}`);
  }
 }
}
await checkScripts(root);
for(const entry of ['index.html','admin/index.html','CNAME'])assert((await lstat(resolve(root,entry))).isFile(),`Missing ${entry}`);
assert((await readFile(resolve(root,'CNAME'),'utf8')).trim()==='susu5.cn','Custom domain changed unexpectedly');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(`Site checks passed: ${data.projects.length} projects, ${data.notes.length} articles, ${data.arts.length} images; ${localAssets.size} referenced media.`);
