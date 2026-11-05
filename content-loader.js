(async function loadContent() {
  function moveLegacyLink() {
    const path = (location.pathname === '/' || location.pathname === '/index.html') && SUSU_PATHS.legacyPath(location.hash);
    if (path) location.replace(path + location.search);
    return Boolean(path);
  }
  if (moveLegacyLink()) return;
  addEventListener('hashchange', moveLegacyLink);
  const main = document.getElementById('main');
  try {
    const response = await fetch('/content.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('Content unavailable');
    const content = await response.json();
    if (!['projects','notes','arts'].every(key => Array.isArray(content[key]))) throw new Error('Invalid content');
    window.SITE_DATA = content;
    const script = document.createElement('script');
    script.src = '/site.js?v=20261105-static';
    script.onload = () => SUSU_SITE.mountSite();
    script.onerror = showError;
    document.body.appendChild(script);
  } catch { showError(); }
  function showError() {
    if (main.hasAttribute('data-rendered')) return;
    main.replaceChildren();
    const box = document.createElement('section'); box.className = 'page reading-page';
    const title = document.createElement('h1'); title.textContent = '内容暂时没有加载出来';
    const copy = document.createElement('p'); copy.textContent = '请检查网络连接，再试一次。'; copy.style.margin = '24px 0';
    const button = document.createElement('button'); button.className = 'solid'; button.textContent = '重新加载'; button.addEventListener('click', () => location.reload());
    box.append(title,copy,button); main.appendChild(box);
  }
})();
