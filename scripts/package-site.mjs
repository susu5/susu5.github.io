import {cp,mkdir,readdir,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writePublicPages} from './public-pages.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,process.argv[2]||'_site');
await mkdir(output,{recursive:false});
const roots=['assets','admin','index.html','CNAME','.nojekyll','content.json','content-loader.js','content-rules.js','content-covers.js','content-covers.css','markdown-content.js','markdown-content.css','site-paths.js','site.js','style.css','jade.css','theme.css','theme.js','marked.umd.js','marked-LICENSE.md'];
roots.push('baidu_verify_codeva-e8GoP3Dh5s.html');
async function rejectLinks(path){
 const stat=await lstat(path);if(stat.isSymbolicLink())throw new Error('Deployment cannot contain symbolic links');
 if(stat.isDirectory())for(const name of await readdir(path))await rejectLinks(resolve(path,name));
}
for(const name of roots){const path=resolve(root,name);await rejectLinks(path);await cp(path,resolve(output,name),{recursive:true});}
const pages=await writePublicPages({root,output});
console.log('Prepared '+pages+' public pages, sitemap.xml and robots.txt.');
