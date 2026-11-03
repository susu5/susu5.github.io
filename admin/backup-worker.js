'use strict';
importScripts('vendor/fflate-0.8.3.js','backup-format.js?v=20261103-backup');
self.onmessage=async event=>{
 try{
  const data=event.data,result=data.action==='pack'?await SUSU_BACKUP.pack(data.manifest,data.files):await SUSU_BACKUP.unpack(data.bytes);
  const buffers=data.action==='pack'?[result.bytes.buffer]:result.files.map(file=>file.bytes.buffer);
  self.postMessage({ok:true,result},[...new Set(buffers)]);
 }catch(error){self.postMessage({ok:false,error:error.message||'备份处理失败，请检查文件后重试。'})}
};
