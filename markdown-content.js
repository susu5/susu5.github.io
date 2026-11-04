// Use one renderer for published content and every admin Markdown preview.
(() => {
  const allowed = new Set('P H1 H2 H3 H4 H5 H6 BLOCKQUOTE PRE CODE UL OL LI TABLE THEAD TBODY TR TH TD STRONG EM DEL HR BR A'.split(' '));
  const promptLabel = /^(?:中文(?:翻译)?提示词|英文(?:原始|原文)?提示词|原始英文提示词|Chinese Prompt|(?:Original )?English Prompt)[：:]?$/i;

  window.renderContentMarkdown = function renderContentMarkdown(target, source, { preview = false, emptyMessage = '' } = {}) {
    target.classList.add('markdown-content');
    const markdown = String(source || '');
    const template = document.createElement('template');
    template.innerHTML = marked.parse(markdown);
    const content = template.content;

    for (const element of content.querySelectorAll('*')) {
      if (!allowed.has(element.tagName)) {
        element.remove();
        continue;
      }
      const href = element.getAttribute('href') || '';
      for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
      if (element.tagName === 'A' && /^(https?:\/\/|mailto:)/i.test(href)) {
        element.setAttribute('href', href);
        element.setAttribute('rel', 'noopener noreferrer');
        if (preview && /^https?:\/\//i.test(href)) element.setAttribute('target', '_blank');
      }
    }

    // Pasted prompt labels may lose their Markdown heading marker. Match only
    // standalone labels, leaving ordinary paragraphs and prompt text untouched.
    for (const element of [...content.children]) {
      const label = element.textContent.trim();
      if (/^(P|H[1-6])$/.test(element.tagName) && promptLabel.test(label)) {
        const heading = document.createElement('h3');
        heading.className = 'prompt-heading';
        heading.textContent = label;
        element.replaceWith(heading);
      }
    }

    if (!markdown.trim() && emptyMessage) {
      const paragraph = document.createElement('p');
      paragraph.className = 'muted';
      paragraph.textContent = emptyMessage;
      content.append(paragraph);
    }
    target.replaceChildren(content);
  };
})();
