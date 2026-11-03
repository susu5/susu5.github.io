// Render image introductions with the same Markdown vocabulary as the editor.
window.renderImageMarkdown = function renderImageMarkdown(target, source) {
  if (!String(source || '').trim()) {
    target.innerHTML = '<p class="muted">这张图片暂时还没有介绍。</p>';
    return;
  }
  const template = document.createElement('template');
  template.innerHTML = marked.parse(String(source));
  const allowed = new Set('P H1 H2 H3 H4 H5 H6 BLOCKQUOTE PRE CODE UL OL LI TABLE THEAD TBODY TR TH TD STRONG EM DEL HR BR A'.split(' '));
  for (const element of [...template.content.querySelectorAll('*')]) {
    if (!allowed.has(element.tagName)) {
      element.remove();
      continue;
    }
    const href = element.getAttribute('href');
    for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
    if (element.tagName === 'A' && /^(https?:\/\/|mailto:)/i.test(href || '')) {
      element.setAttribute('href', href);
      element.setAttribute('rel', 'noopener noreferrer');
    }
  }
  target.replaceChildren(template.content);
};
