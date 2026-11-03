(function(root){
  'use strict';
  const BASE='https://susu5-admin-service.ivoryjoy135.chatgpt.site';
  const KEY='susu.cms.session.v1';
  function createClient({fetcher=root.fetch.bind(root),storage=root.sessionStorage,onUnauthorized=()=>{}}={}){
    let token='';try{token=storage.getItem(KEY)||''}catch{}
    function setToken(value){token=value||'';try{if(token)storage.setItem(KEY,token);else storage.removeItem(KEY)}catch{}}
    async function request(path,{method='GET',body,publicRequest=false}={}){
      const headers={Accept:'application/json'};
      if(token&&!publicRequest)headers.Authorization='Bearer '+token;
      if(body!==undefined&&!(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body)}
      let response;
      try{response=await fetcher(BASE+path,{method,headers,body,mode:'cors',credentials:'omit',cache:'no-store'})}
      catch{throw Object.assign(new Error('连接失败，请检查网络后重试。未保存的内容仍保留在当前页面。'),{code:'NETWORK'})}
      let data;try{data=await response.json()}catch{data={}}
      if(!response.ok){
        const message=response.status===409?'内容已在其他窗口更新。请先复制未保存的文字，再点击「刷新内容」重新载入。':data.error?.message||data.message||'操作失败，请稍后重试。';
        const error=Object.assign(new Error(message),{status:response.status,code:data.error?.code||data.code});
        if(response.status===401&&!publicRequest){setToken('');onUnauthorized(error)}
        throw error;
      }
      return data;
    }
    return {request,setToken,hasToken:()=>Boolean(token),base:BASE};
  }
  root.SUSU_API={createClient,base:BASE};
})(globalThis);
