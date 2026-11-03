(function(root){
  'use strict';
  const BASE='https://susu5-admin-service.ivoryjoy135.chatgpt.site';
  const KEY='susu.cms.session.v1';
  function createClient({fetcher=root.fetch.bind(root),storage=root.sessionStorage,onUnauthorized=()=>{}}={}){
    let token='';try{token=storage.getItem(KEY)||''}catch{}
    function setToken(value){token=value||'';try{if(token)storage.setItem(KEY,token);else storage.removeItem(KEY)}catch{}}
    async function request(path,{method='GET',body,publicRequest=false,responseType='json',maxBytes=12*1024*1024,timeoutMs=0,signal,timeoutMessage='网络请求超时，请检查网络后重试。'}={}){
      const headers={Accept:'application/json'};
      if(token&&!publicRequest)headers.Authorization='Bearer '+token;
      if(body!==undefined&&!(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body)}
      // Timeouts are opt-in, and cover both headers and the complete response body.
      const controller=Number.isFinite(timeoutMs)&&timeoutMs>0?new AbortController():null;
      const requestSignal=controller?.signal||signal;let timer,timedOut=false;
      const forwardAbort=()=>controller.abort(signal.reason);
      if(controller){
        if(signal?.aborted)forwardAbort();else signal?.addEventListener('abort',forwardAbort,{once:true});
        if(!controller.signal.aborted)timer=setTimeout(()=>{if(!controller.signal.aborted){timedOut=true;controller.abort()}},timeoutMs);
      }
      const checkAbort=()=>{if(requestSignal?.aborted)throw Object.assign(new Error(timedOut?timeoutMessage:'请求已取消，请重新操作。'),{code:timedOut?'TIMEOUT':'ABORTED'})};
      try{
      checkAbort();let response;
      try{response=await fetcher(BASE+path,{method,headers,body,mode:'cors',credentials:'omit',cache:'no-store',...(requestSignal?{signal:requestSignal}:{})})}
      catch{throw Object.assign(new Error('连接失败，请检查网络后重试。未保存的内容仍保留在当前页面。'),{code:'NETWORK'})}
      checkAbort();
      if(response.ok&&responseType==='bytes'){
        const limitError=()=>Object.assign(new Error('图片超过备份允许的大小。'),{code:'BACKUP_LIMIT'});
        if(Number(response.headers?.get('content-length')||0)>maxBytes)throw limitError();
        if(!response.body?.getReader){const bytes=new Uint8Array(await response.arrayBuffer());checkAbort();if(bytes.length>maxBytes)throw limitError();return bytes}
        const reader=response.body.getReader(),chunks=[];let length=0;
        try{while(true){const {value,done}=await reader.read();checkAbort();if(done)break;length+=value.length;if(length>maxBytes){await reader.cancel();throw limitError()}chunks.push(value)}}finally{reader.releaseLock()}
        const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return bytes;
      }
      let data;try{data=await response.json()}catch{data={}}
      checkAbort();
      if(!response.ok){
        const message=response.status===409?'内容已在其他窗口更新。请先复制未保存的文字，再点击「刷新内容」重新载入。':data.error?.message||data.message||'操作失败，请稍后重试。';
        const error=Object.assign(new Error(message),{status:response.status,code:data.error?.code||data.code});
        if(response.status===401&&!publicRequest){setToken('');onUnauthorized(error)}
        throw error;
      }
      return data;
      }catch(error){checkAbort();throw error}
      finally{if(timer!==undefined)clearTimeout(timer);if(controller)signal?.removeEventListener('abort',forwardAbort)}
    }
    return {request,setToken,hasToken:()=>Boolean(token),base:BASE};
  }
  root.SUSU_API={createClient,base:BASE};
})(globalThis);
