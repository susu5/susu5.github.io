(function (root) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function imageUrl(value) {
    if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f]/.test(value)) return '';
    const url = value.trim();
    if (/^[a-z][a-z\d+.-]*:/i.test(url) && !/^(https?:|blob:|file:|data:image\/(?:png|jpeg|webp|gif|avif);base64,)/i.test(url)) return '';
    return url.startsWith('assets/') ? '/' + url : url;
  }
  function getCover(item) {
    const file = item?.coverFile;
    return file && typeof file === 'object' && imageUrl(file.url) ? file : null;
  }
  function render(kind, item = {}) {
    const title = String(item.title || item.name || '未命名');
    const file = kind === 'images' ? { url: item.url, alt: item.alt ?? title } : getCover(item);
    const url = imageUrl(file?.url);
    if (url) return `<div class="content-cover content-cover--image"><img src="${escape(url)}" alt="${escape(file.alt ?? title)}" loading="lazy" decoding="async"></div>`;
    const project = kind === 'projects';
    const label = project ? '项目' : kind === 'articles' ? '知识库' : '图片';
    const number = project && /^\d+$/.test(String(item.id)) ? String(item.id).padStart(3, '0') : '';
    return `<div class="content-cover content-cover--title${project ? ' content-cover--project' : ''}"><div class="content-cover__body"><strong class="content-cover__title">${escape(title)}</strong><span class="content-cover__meta">${number ? escape(number) + ' / ' : ''}${label}</span></div></div>`;
  }
  root.SUSU_COVERS = { getCover, render };
})(globalThis);
