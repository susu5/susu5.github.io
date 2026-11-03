const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const admin=path.resolve(__dirname,'../admin');global.fflate=require(path.join(admin,'vendor/fflate-0.8.3.js'));if(!global.crypto)global.crypto=webcrypto;require(path.join(admin,'backup-format.js'));const format=global.SUSU_BACKUP,zip=global.fflate;
const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM14AAAAASUVORK5CYII=','base64'));
function fixture(){
 const media={path:'assets/test.png',url:'assets/test.png',name:'封面',alt:'图',width:1,height:1};
 const snapshot={projects:[{id:1,key:'1',title:'线上项目',body:'线上正文',publication:'published',coverFile:media,detailFiles:[],relatedArticleIds:[1]}],articles:[{id:1,key:'1',title:'知识',body:'文章',state:'已发布',coverFile:null}],images:[{...media,id:'image1',state:'已发布',group:'分类'}],profile:{name:'Susu',avatar:media.path,avatarFile:media},home:{heroMode:'auto',featuredMode:'auto',hero:'',featured:[]},imageCategories:['分类']};
 const published=structuredClone(snapshot),draft=structuredClone(snapshot);draft.projects[0].body='尚未发布的修改';draft.projects[0].publication='draft';
 return {format:'susu5-backup',version:1,site:'susu5.cn',createdAt:'2026-11-03T12:00:00.000Z',state:{schemaVersion:1,revision:7,nextProjectId:2,nextArticleId:2,draft,published},media:[{path:media.path,archivePath:media.path,mime:'image/png',width:1,height:1,downloadPath:'/api/maintenance/media?path=assets/test.png&revision=7'}]};
}
async function packed(){return format.pack(fixture(),[{path:'assets/test.png',bytes:png}])}
test('portable ZIP round trip retains private draft, published snapshot, settings, relations, images and dimensions',async()=>{
 const {bytes,manifest}=await packed(),result=await format.unpack(bytes);
 assert.equal(result.manifest.state.draft.projects[0].body,'尚未发布的修改');assert.equal(result.manifest.state.published.projects[0].body,'线上正文');assert.deepEqual(result.manifest.state.draft.projects[0].relatedArticleIds,[1]);assert.equal(result.manifest.media[0].width,1);assert.equal(result.manifest.media[0].height,1);
 assert.equal(result.files[0].bytes.length,png.length);assert.equal(JSON.stringify(manifest).includes('downloadPath'),false);assert.match(manifest.media[0].sha256,/^[a-f0-9]{64}$/);
});
test('export canonicalizes expiring preview URLs and excludes credentials',async()=>{
 const manifest=fixture();manifest.state.draft.projects[0].coverFile.url='https://preview.invalid/image?signature=secret';manifest.state.draft.profile.avatar='https://preview.invalid/avatar';
 const output=await format.pack(manifest,[{path:'assets/test.png',bytes:png}]);assert.equal(JSON.stringify(output.manifest).includes('preview.invalid'),false);
 const invalid=fixture();invalid.state.sessionToken='do-not-export';await assert.rejects(format.pack(invalid,[{path:'assets/test.png',bytes:png}]),/登录凭据|字段/);
});
test('import rejects path traversal, extra files, missing files, checksum corruption and oversized entries',async()=>{
 for(const name of ['../evil.png','/assets/test.png','assets/../evil.png','C:/evil.png','assets\\evil.png'])await assert.rejects(format.unpack(zip.zipSync({[name]:png})),/不安全/);
 const original=await packed(),entries=zip.unzipSync(original.bytes);
 await assert.rejects(format.unpack(zip.zipSync({...entries,'assets/extra.png':png})),/清单之外/);
 await assert.rejects(format.unpack(zip.zipSync({'manifest.json':entries['manifest.json']})),/清单之外|缺失/);
 const changed=png.slice();changed[changed.length-1]^=1;await assert.rejects(format.unpack(zip.zipSync({...entries,'assets/test.png':changed})),/校验失败/);
 const huge=new Uint8Array(format.LIMITS.media+1);await assert.rejects(format.unpack(zip.zipSync({'assets/large.png':[huge,{level:1}]})),/过大的文件/);
});
test('import rejects duplicate names and non-image bytes even with a matching extension',async()=>{
 const chunks=[],archive=new zip.Zip((error,data)=>{if(error)throw error;chunks.push(data)});for(let i=0;i<2;i++){const file=new zip.ZipPassThrough('assets/test.png');archive.add(file);file.push(png,true)}archive.end();await assert.rejects(format.unpack(Buffer.concat(chunks)),/重名/);
 const manifest=fixture();await assert.rejects(format.pack(manifest,[{path:'assets/test.png',bytes:new TextEncoder().encode('<svg onload="alert(1)"></svg>') }]),/不受支持|损坏/);
});
function maintenanceContext(){
 const calls=[],dialog={addEventListener(){},showModal(){}},node={textContent:'',classList:{toggle(){}},setAttribute(){}};
 const state=fixture().state;const env=vm.createContext({main:{addEventListener(){},querySelector:()=>node},document:{querySelector:()=>dialog},api:{request:async(url,options)=>{calls.push({url,options});return url.includes('/history')?{history:[]}:{state}}},serverState:state,SUSU_BACKUP:format,ensureReady:()=>true,setBusy(){},applyState(){},resetArticleCoverDraft(){},resetImageDraft(){},render(){},tab:'maintenance',busy:false,projectOpen:false,libraryView:'list',File:class{constructor(parts,name,options){this.name=name;this.type=options.type;this.size=parts[0].length}},Set,Map,Date,console});
 vm.runInContext(fs.readFileSync(path.join(admin,'maintenance-layout.js'),'utf8'),env);return {calls,env,run:code=>vm.runInContext(code,env)};
}
test('history restoration is revision checked and never calls publish',async()=>{
 const {calls,env,run}=maintenanceContext();env.pending={manifest:fixture(),historyRevision:4,snapshot:'published',selection:{kind:'articles',id:1}};await run('restoreMaintenance(pending)');
 const restore=calls.find(call=>call.url==='/api/maintenance/restore');assert.deepEqual(JSON.parse(JSON.stringify(restore.options.body)),{baseRevision:7,snapshot:'published',historyRevision:4,selection:{kind:'articles',id:1}});assert.equal(calls.some(call=>call.url==='/api/publish'),false);
});
test('ZIP restore uploads selected media first and sends canonical map without publishing',async()=>{
 const {calls,env,run}=maintenanceContext(),archive=await packed();env.pending={manifest:archive.manifest,snapshot:'draft'};env.fileList=[{path:'assets/test.png',bytes:png}];
 run("maintenanceImport={files:fileList};uploadMaintenanceMedia=async()=>({path:'assets/uploads/restored.png'})");await run('restoreMaintenance(pending)');
 const restore=calls.find(call=>call.url==='/api/maintenance/restore');assert.equal(restore.options.body.mediaMap['assets/test.png'],'assets/uploads/restored.png');assert.equal(restore.options.body.baseRevision,7);assert.equal(calls.some(call=>call.url==='/api/publish'),false);
});
