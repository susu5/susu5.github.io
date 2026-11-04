const loginScreen = document.getElementById('login');
const adminShell = document.getElementById('shell');
loginScreen.innerHTML = `
  <header class="login-top"><span class="login-wordmark">Susu.</span><div class="login-header-actions"><a href="https://susu5.cn/" target="_blank" rel="noopener">返回网站<svg class="login-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></a><button type="button" class="theme-toggle" data-theme-toggle hidden></button></div></header>
  <div class="login-body">
    <section class="login-story" aria-label="Susu 的创作空间"><h2>把好奇心，<span>做成作品。</span></h2><figure><img class="login-landscape" src="../assets/mountain-study.webp" width="1774" height="887" alt="松树与玉色湖面，远山在薄雾中隐去"><figcaption><span>一处安放好奇心的地方。</span><span>susu5.cn</span></figcaption></figure></section>
    <section class="login-card" aria-labelledby="login-title"><img class="login-portrait" src="../assets/susu-avatar.png" width="58" height="58" alt="Susu 的蓝发头像"><h1 id="login-title">登录后台</h1><p class="login-lede">管理项目、知识库和图片，<br>让每一次更新都有自己的位置。</p><div class="login-account"><span>站点管理账号</span><strong>susu5</strong></div>
    <button class="login-provider" id="github-login" type="button" aria-describedby="login-note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.06c-3.09.67-3.74-1.31-3.74-1.31-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.71-1.49-2.47-.28-5.07-1.24-5.07-5.49 0-1.21.43-2.2 1.14-2.98-.11-.28-.49-1.41.11-2.94 0 0 .93-.3 3.05 1.14a10.6 10.6 0 0 1 5.56 0c2.12-1.44 3.05-1.14 3.05-1.14.6 1.53.22 2.66.11 2.94.71.78 1.14 1.77 1.14 2.98 0 4.26-2.6 5.21-5.08 5.48.4.34.75 1.02.75 2.06v3.04c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/></svg><span>使用 GitHub 登录</span></button>
    <p class="login-note" id="login-note">仅允许授权的 GitHub 管理账号进入。</p><div class="login-feedback" id="login-feedback" role="status" aria-live="polite" hidden></div>
    <p class="login-help">登录后可以保存私有草稿，或将当前内容发布到网站。</p><button class="btn full" id="login-retry" type="button" hidden>重新连接</button></section>
  </div><footer class="login-bottom"><span>Susu · 内容管理</span><span>Making things. Following curiosity.</span></footer>`;

const loginButton=document.getElementById('github-login');
let authPopup=null,authNonce='',authPoll=null,loginConfigured=false;
function loginFeedback(text,error=false){const box=document.getElementById('login-feedback');box.textContent=text;box.className='login-feedback'+(error?' error':'');box.hidden=!text}
function showLogin(text=''){
 for(const dialog of document.querySelectorAll('dialog[open]')){dialog.returnValue='cancel';dialog.close()}
 adminShell.hidden=true;loginScreen.hidden=false;document.title='Susu · 登录后台';loginFeedback(text,Boolean(text));
 loginButton.disabled=!loginConfigured;window.scrollTo(0,0);
}
async function loadLoginConfig(){
 loginButton.disabled=true;document.getElementById('login-retry').hidden=true;
 try{
  const config=await api.request('/api/config',{publicRequest:true});loginConfigured=Boolean(config.configured);
  loginButton.disabled=!loginConfigured;
  if(!loginConfigured){loginFeedback('管理员登录正在完成配置，请稍后刷新。',true);document.getElementById('login-retry').hidden=false}
  else loginFeedback('');
  if(config.installationUrl&&/^https:\/\/github\.com\//.test(config.installationUrl))window.githubInstallationURL=config.installationUrl;
 }catch(error){loginFeedback('登录服务暂时无法连接，请检查网络后重试。',true);document.getElementById('login-retry').hidden=false}
}
async function finishLogin(user){
 if(!user||Number(user.id)!==26317508)throw new Error('这个 GitHub 账号没有本站管理权限。');
 if(!dirty){applyState(await api.request('/api/state'));tab='home';selected=0;projectOpen=false;libraryView='list';render()}
 document.getElementById('account-name').textContent=user.login||'susu5';
 if(/^https:\/\/avatars\.githubusercontent\.com\//.test(user.avatar_url||''))document.getElementById('account-avatar').src=user.avatar_url;
 loginScreen.hidden=true;adminShell.hidden=false;document.title='Susu · 内容管理';main.focus({preventScroll:true});
 document.querySelector('#connection-status').textContent=dirty?'已登录 · 有未保存修改':'已连接 · 内容已保存';
}
loginButton.onclick=()=>{
 if(!loginConfigured)return;
 const bytes=crypto.getRandomValues(new Uint8Array(24));authNonce=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 authPopup=window.open(api.base+'/auth/start?client_nonce='+encodeURIComponent(authNonce),'susu-github-login','popup,width=620,height=760');
 if(!authPopup){loginFeedback('浏览器拦截了登录窗口。请允许本站弹出窗口，再点击登录。',true);return}
 loginButton.disabled=true;loginFeedback('请在 GitHub 窗口中完成登录与授权。');clearInterval(authPoll);
 authPoll=setInterval(()=>{if(authPopup?.closed){clearInterval(authPoll);authPopup=null;loginButton.disabled=false;loginFeedback('登录窗口已关闭，可以重新点击登录。')}},700);
};
window.addEventListener('message',async event=>{
 if(event.origin!==api.base||event.source!==authPopup||event.data?.type!=='susu-auth'||event.data.clientNonce!==authNonce)return;
 const result=event.data;clearInterval(authPoll);try{authPopup.close()}catch{}authPopup=null;authNonce='';loginButton.disabled=false;
 if(result.error){loginFeedback(result.error.message||'登录没有完成，请重试。',true);return}
 if(typeof result.sessionToken!=='string'||result.sessionToken.length<24){loginFeedback('登录响应无效，请重新登录。',true);return}
 api.setToken(result.sessionToken);
 try{const verified=await api.request('/api/session');await finishLogin(verified.user)}catch(error){api.setToken('');showLogin(error.message)}
});
async function logout(){
 if(busy||uploadsInFlight){message('正在保存或上传，请完成后再退出。');return}
 if(!discardUnsaved())return;clearTimeout(publishPoll);
 try{if(api.hasToken())await api.request('/api/logout',{method:'POST',body:{}})}catch{}
 api.setToken('');serverState=null;lastServerState=null;records.projects.length=0;records.articles.length=0;photos.length=0;clearMaintenance();main.replaceChildren();dirty=false;showLogin();
}
 document.getElementById('logout').onclick=logout;
 document.getElementById('mobile-logout').onclick=logout;
 document.getElementById('login-retry').onclick=loadLoginConfig;
(async()=>{
 showLogin();
 await loadLoginConfig();
 if(api.hasToken()){
  loginFeedback('正在恢复登录…');
  try{const session=await api.request('/api/session');await finishLogin(session.user)}catch(error){api.setToken('');showLogin(error.message)}
 }
})();
