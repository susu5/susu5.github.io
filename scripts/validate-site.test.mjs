import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

async function fixture(edit){
 const root=await mkdtemp(join(tmpdir(),'susu5-public-check-'));
 try{
  await mkdir(join(root,'scripts'));await mkdir(join(root,'admin'));await mkdir(join(root,'assets'));
  await copyFile(new URL('./validate-site.mjs',import.meta.url),join(root,'scripts','validate-site.mjs'));
  const content={projects:[{id:1,relatedArticleIds:[1]}],notes:[{id:1}],arts:[{id:'a',url:'assets/image.png'}],profile:{},home:{},imageCategories:[],_cmsRevision:1};
  edit(content);
  for(const [name,text] of Object.entries({'content.json':JSON.stringify(content),'index.html':'<!doctype html>','admin/index.html':'<!doctype html>','CNAME':'susu5.cn','assets/image.png':'fixture'}))await writeFile(join(root,name),text);
  return spawnSync(process.execPath,[join(root,'scripts','validate-site.mjs')],{encoding:'utf8'});
 }finally{
  if(!root.startsWith(join(tmpdir(),'susu5-public-check-')))throw new Error('Unexpected temporary cleanup path');
  await rm(root,{recursive:true,force:true});
 }
}
test('valid current public snapshot can deploy',async()=>{const result=await fixture(()=>{});assert.equal(result.status,0,result.stderr)});
test('private credentials and drafts block publication',async()=>{const result=await fixture(data=>{data.profile.accessToken='test-value';data.notes[0].state='草稿'});assert.notEqual(result.status,0);assert.match(result.stderr,/private data/);assert.match(result.stderr,/draft must not be public/)});
test('missing media and unavailable article links block publication',async()=>{const result=await fixture(data=>{data.arts[0].url='assets/missing.png';data.projects[0].relatedArticleIds=[99]});assert.notEqual(result.status,0);assert.match(result.stderr,/Missing referenced image/);assert.match(result.stderr,/missing published article/)});
