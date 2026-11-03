let homeDraft;
const homeCollections = () => hydrateView(serverState?.published||{projects:[],articles:[],images:[]});
const homeResolved = () => SUSU_CONTENT.resolveHome(homeCollections(), homeDraft || homeData);
const homeName = item => item.title || item.name;
function homeModes(name, value, autoText) {
  return `<div class="home-modes" role="group" aria-label="${name === 'heroMode' ? '首图选择方式' : '推荐选择方式'}">${[['auto', autoText], ['manual', '手动指定']].map(([key, label]) => `<label><input type="radio" name="${name}" value="${key}" ${key === value ? 'checked' : ''}>${label}</label>`).join('')}</div>`;
}
function homeFeaturedOptions(value) {
  return option('', '留空', value) + ['projects','articles','images'].map(kind=>[kind,homeCollections()[kind]]).map(([kind, items]) => `<optgroup label="${labels[kind]}">${SUSU_CONTENT.latest(items, kind).map(item => option(kind + ':' + SUSU_CONTENT.idOf(item), homeName(item), value)).join('')}</optgroup>`).join('');
}
function homePreviewContent(result) {
  const hero = result.hero;
  const caption = result.heroMode === 'manual' ? homeDraft.caption || hero?.name : hero?.name;
  return `<section class="panel home-current"><div class="panel-head"><h2>当前首页内容</h2><span class="status">${result.heroMode === 'auto' && result.featuredMode === 'auto' ? '自动更新' : '已自定义'}</span></div><div class="pad"><h3>首页首图</h3>${hero ? `<button type="button" class="home-image" data-home-preview="images:${safe(hero.id)}" aria-label="查看 ${safe(hero.name)} 大图与介绍">${coverImage(hero)}</button><div class="home-caption"><strong>${safe(caption)}</strong><span class="muted">${hero.width} × ${hero.height}</span></div><p class="muted">点击图片查看大图与介绍</p>` : '<p class="home-empty">暂无可用横图。发布一张宽度大于高度的图片后，会自动显示在这里。</p>'}<section class="form-section"><h3>最近，正在着迷</h3><ol class="home-picks">${result.featured.map(({ kind, item }) => `<li><button type="button" data-home-preview="${kind}:${safe(SUSU_CONTENT.idOf(item))}">${SUSU_COVERS.render(kind,item)}<span class="home-pick-copy"><span class="muted">${labels[kind]}</span><strong>${safe(homeName(item))}</strong></span></button></li>`).join('')}</ol>${result.featured.length < 5 ? '<p class="muted">内容不足的位置先留空，发布后自动补齐。</p>' : ''}</section></div></section>`;
}
function homeEditor() {
  if (!homeDraft) homeDraft = { ...homeData, featured: [...homeData.featured] };
  const result = homeResolved();
  return `<div class="home-layout"><section class="panel"><form id="home"><div class="home-section"><h2>首页首图</h2><p class="muted">用最新的画作迎接访客。</p>${homeModes('heroMode', homeDraft.heroMode, '自动选择最新横图')}<p class="muted home-rule">按上传时间取最新的已发布横图，自动跳过竖图与方图。</p><div ${homeDraft.heroMode === 'auto' ? 'hidden' : ''}><label>指定图片<select name="hero">${option('', '请选择图片', homeDraft.hero)}${SUSU_CONTENT.latest(homeCollections().images, 'images').map(item => option(item.id, item.name, homeDraft.hero)).join('')}</select></label>${field('caption', '大图标题', homeDraft.caption)}<p class="muted">标题留空时使用图片名称。</p></div></div><div class="home-section"><h2>最近，正在着迷</h2><p class="muted">固定五个位置，保持首页内容常新。</p>${homeModes('featuredMode', homeDraft.featuredMode, '自动选择最新内容')}<div class="home-quota"><span><strong>1</strong> 个项目</span><span><strong>2</strong> 篇知识库文章</span><span><strong>2</strong> 张图片</span></div><p class="muted home-rule">各类内容按时间从新到旧排列，只推荐已发布内容。再次编辑旧内容不会改变顺序。</p><div class="home-manual" ${homeDraft.featuredMode === 'auto' ? 'hidden' : ''}>${Array.from({ length: 5 }, (_, i) => `<label>推荐位置 ${i + 1}<select name="featured">${homeFeaturedOptions(homeDraft.featured[i] || '')}</select></label>`).join('')}</div></div><div class="foot"><span class="muted">草稿仅自己可见</span><button class="btn primary">保存设置</button></div></form></section><div class="home-side">${homePreviewContent(result)}<section class="panel pad stack"><h2>发布首页设置</h2><p class="muted">保存草稿后可继续修改。发布设置后，首页按新规则更新。</p><button class="btn full" data-action="publish">发布到网站</button></section></div></div>`;
}
function readHomeDraft(form) {
  if (!form) return;
  const data = new FormData(form);
  homeDraft = { heroMode: data.get('heroMode'), featuredMode: data.get('featuredMode'), hero: data.get('hero') || '', caption: data.get('caption') || '', featured: data.getAll('featured') };
}
function saveHome(announce = true) {
  readHomeDraft(main.querySelector('#home'));
  if (!homeDraft) return false;
  if (homeDraft.heroMode === 'manual' && !homeCollections().images.some(item=>String(item.id)===String(homeDraft.hero))) {
    message('请选择一张已发布图片作为首图'); return false;
  }
  const refs = homeDraft.featured.filter(Boolean);
  if (homeDraft.featuredMode === 'manual' && new Set(refs).size !== refs.length) {
    message('推荐内容重复了，请为每个位置选择不同内容'); return false;
  }
  Object.assign(homeData, homeDraft, { featured: [...homeDraft.featured] });
  phase = '待发布';
  if (announce) { render(); message('首页设置已修改，请保存草稿或发布。'); }
  return true;
}
main.addEventListener('change', event => {
  if (tab !== 'home' || !event.target.closest('#home')) return;
  const previous = homeResolved();
  readHomeDraft(event.target.closest('form'));
  if (event.target.name === 'caption') {
    const caption = main.querySelector('.home-caption strong');
    if (caption) caption.textContent = homeDraft.caption || homeResolved().hero?.name || '';
    return;
  }
  if (event.target.name === 'heroMode' && homeDraft.heroMode === 'manual' && !homeDraft.hero && previous.hero) {
    homeDraft.hero = previous.hero.id; homeDraft.caption = previous.hero.name;
  }
  if (event.target.name === 'featuredMode' && homeDraft.featuredMode === 'manual' && !homeDraft.featured.some(Boolean)) {
    homeDraft.featured = previous.featured.map(({ kind, item }) => kind + ':' + SUSU_CONTENT.idOf(item));
  }
  const name = event.target.name, value = event.target.value;
  render();
  const control = [...main.querySelectorAll('[name]')].find(el => el.name === name && (el.type !== 'radio' || el.value === value));
  control?.focus({ preventScroll: true });
});
main.addEventListener('click', event => {
  const trigger = event.target.closest('[data-home-preview]');
  if (!trigger) return;
  const [kind, id] = trigger.dataset.homePreview.split(':');
  const item = homeCollections()[kind]?.find(value => SUSU_CONTENT.idOf(value) === id);
  if (!item) return;
  const box = document.querySelector('#front-content');
  box.innerHTML = `<h1>${safe(homeName(item))}</h1><p class="muted">${safe(item.group || item.summary || labels[kind])}</p>${kind === 'images' ? coverImage(item) : SUSU_COVERS.render(kind,item)}<div class="markdown"></div>`;
  if (kind === 'images') box.querySelector('img')?.classList.add('home-detail-image');
  markdownInto(box.querySelector('.markdown'), item.body || (kind === 'images' ? '这张图片暂时还没有介绍。' : '暂无正文。'));
  document.querySelector('#front').showModal();
});
