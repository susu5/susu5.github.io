import {cp,mkdir,readdir,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'_site');
await mkdir(output,{recursive:false});
const roots=['assets','admin','index.html','CNAME','.nojekyll','content.json','content-loader.js','content-rules.js','content-covers.js','content-covers.css','image-detail.js','site.js','style.css','jade.css','marked.umd.js','marked-LICENSE.md'];
async function rejectLinks(path){
 const stat=await lstat(path);if(stat.isSymbolicLink())throw new Error('Deployment cannot contain symbolic links');
 if(stat.isDirectory())for(const name of await readdir(path))await rejectLinks(resolve(path,name));
}
for(const name of roots){const path=resolve(root,name);await rejectLinks(path);await cp(path,resolve(output,name),{recursive:true});}
console.log('Prepared website files only; development files and old sample data.js are excluded.');
