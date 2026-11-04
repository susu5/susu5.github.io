// Published pages, previews and the editor share the same formatting and URL rules.
(() => {
  const allowed = new Set('P DIV H1 H2 H3 H4 H5 H6 BLOCKQUOTE PRE CODE UL OL LI TABLE THEAD TBODY TR TH TD STRONG B EM I U DEL S STRIKE HR BR A IMG'.split(' '));
  const discard = new Set('SCRIPT STYLE IFRAME OBJECT EMBED SVG MATH TEMPLATE FORM BUTTON INPUT TEXTAREA SELECT OPTION'.split(' '));
  const promptLabel = /^(?:中文(?:翻译)?提示词|英文(?:原始|原文)?提示词|原始英文提示词|Chinese Prompt|(?:Original )?English Prompt)[：:]?$/i;
  const richMarker = '<!--susu-rich-text-->\n';

  function safeUrl(value, protocols) {
    if (!value || /[\u0000-\u0020\u007f]/.test(value)) return '';
    try {
      const url = new URL(value);
      return protocols.includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }

  function assetPath(value) {
    const path = (value || '').replace(/^(?:\.\/|\/)/, '');
    return /^assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:png|jpe?g|webp|gif|avif)$/i.test(path) && !path.includes('..') ? path : '';
  }

  function cleanHTML(html, { preview = false, editing = false, saving = false, media = [] } = {}) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const content = template.content;
    const files = new Map(media.map(file => [file.path, file]));

    for (const element of content.querySelectorAll('*')) {
      const tag = element.tagName;
      if (discard.has(tag) || element.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
        element.remove();
        continue;
      }
      if (!allowed.has(tag)) {
        let content = [...element.childNodes];
        if (tag === 'SPAN') {
          const { fontWeight, fontStyle, textDecorationLine } = element.style;
          const formats = [
            [fontWeight === 'bold' || Number(fontWeight) >= 600, 'strong'],
            [/^(italic|oblique)/.test(fontStyle), 'em'],
            [textDecorationLine.includes('underline'), 'u'],
            [textDecorationLine.includes('line-through'), 's']
          ];
          for (const [active, format] of formats) {
            if (!active) continue;
            const wrapper = document.createElement(format);
            wrapper.append(...content);
            content = [wrapper];
          }
        }
        element.replaceWith(...content);
        continue;
      }
      const { href, src, alt, width, height, colspan, rowspan, start } = Object.fromEntries(
        Array.from(element.attributes, ({ name, value }) => [name, value])
      );
      const trackedPath = element.getAttribute('data-body-path');
      for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
      if (tag === 'A') {
        const url = safeUrl(href, ['https:', 'http:', 'mailto:']);
        if (!url) { element.replaceWith(...element.childNodes); continue; }
        element.setAttribute('href', url);
        element.setAttribute('rel', 'noopener noreferrer');
        if (preview && /^https?:/.test(url)) element.setAttribute('target', '_blank');
      }
      if (tag === 'IMG') {
        const path = (files.has(trackedPath) && trackedPath) || assetPath(src);
        const file = files.get(path);
        const external = safeUrl(src, ['https:']);
        // Upload previews are temporary and must never become the published source.
        const remote = external && !/\/api\/media\/[^/]+\?/i.test(external) ? external : '';
        const url = path ? (preview && file?.url ? file.url : saving ? path : '/' + path) : remote;
        if (!url) { element.remove(); continue; }
        element.setAttribute('src', url);
        element.setAttribute('alt', (alt || '').slice(0, 600));
        if (editing && path) element.setAttribute('data-body-path', path);
        if (!saving) {
          element.setAttribute('loading', 'lazy');
          element.setAttribute('referrerpolicy', 'no-referrer');
        }
        for (const [name, size] of Object.entries({ width, height })) {
          if (/^[1-9]\d{0,4}$/.test(size || '')) element.setAttribute(name, size);
        }
      }
      if (tag === 'TD' || tag === 'TH') {
        for (const [name, count] of Object.entries({ colspan, rowspan })) {
          if (/^[1-9]\d?$/.test(count || '')) element.setAttribute(name, count);
        }
      }
      if (tag === 'OL' && /^-?\d{1,7}$/.test(start || '')) element.setAttribute('start', start);
    }
    return template;
  }

  function bodyHTML(source) {
    return source.startsWith(richMarker) ? source.slice(richMarker.length) : marked.parse(source);
  }

  window.SUSU_BODY = { assetPath, bodyHTML, cleanHTML, richMarker, safeUrl };
  window.renderContentMarkdown = function renderContentMarkdown(target, source, { preview = false, editing = false, media = [], emptyMessage = '' } = {}) {
    target.classList.add('markdown-content');
    const markdown = String(source || '');
    const content = cleanHTML(bodyHTML(markdown), { preview, editing, media }).content;
    if (!editing && !markdown.startsWith(richMarker)) {
      for (const element of [...content.children]) {
        const label = element.textContent.trim();
        if (/^(P|H[1-6])$/.test(element.tagName) && promptLabel.test(label)) {
          const heading = document.createElement('h3');
          heading.className = 'prompt-heading';
          heading.textContent = label;
          element.replaceWith(heading);
        }
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
