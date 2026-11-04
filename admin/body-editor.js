'use strict';

const bodyTools = [
  ['bold', '加粗', 'B'], ['italic', '斜体', 'I'], ['underline', '下划线', 'U'],
  ['insertUnorderedList', '项目符号'], ['insertOrderedList', '编号列表'],
  ['quote', '引用'], ['link', '链接'], ['table', '表格'], ['image', '插图']
];

function bodyEditorMarkup(item, hint = '') {
  const buttons = bodyTools.map(([action, label, display]) =>
    '<button type="button" class="body-tool" data-body-action="' + action + '" title="' + label + '" aria-label="' + label + '">' + (display || label) + '</button>'
  ).join('');
  return '<section class="form-section" data-body-editor>' +
    '<div class="section-bar"><h3 id="body-heading">正文</h3><button type="button" class="btn" data-body-mode>Markdown 源码</button></div>' +
    (hint ? '<p class="muted">' + safe(hint) + '</p>' : '') +
    '<div class="body-editor-frame"><div class="body-toolbar" role="group" aria-label="正文格式">' +
    '<select data-body-heading aria-label="段落格式"><option value="p">正文</option><option value="h2">二级标题</option><option value="h3">三级标题</option><option value="h4">四级标题</option></select>' +
    buttons + '</div><div class="body-link" hidden><label>链接地址<input type="text" inputmode="url" placeholder="https://example.com" data-body-link></label>' +
    '<button type="button" class="btn" data-body-link-apply>插入链接</button><button type="button" class="btn" data-body-link-close>取消</button></div>' +
    '<div class="body-edit markdown-content" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="body-heading" data-placeholder="在这里写正文，或粘贴已有内容"></div></div>' +
    '<textarea name="body" class="md-input" aria-label="Markdown 源码" spellcheck="false" hidden>\n' + safe(item.body) + '</textarea>' +
    '<input type="file" data-body-file accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden>' +
    '<p class="body-editor-note muted">可直接粘贴带格式的文字，也可以切换到 Markdown 源码。</p></section>';
}

function mountBodyEditor(root, item) {
  if (!root) return;
  const { assetPath, bodyHTML, cleanHTML, richMarker, safeUrl } = SUSU_BODY;
  const source = root.querySelector('[name="body"]');
  const editor = root.querySelector('.body-edit');
  const frame = root.querySelector('.body-editor-frame');
  const mode = root.querySelector('[data-body-mode]');
  const heading = root.querySelector('[data-body-heading]');
  const picker = root.querySelector('[data-body-file]');
  const linkPanel = root.querySelector('.body-link');
  const linkInput = root.querySelector('[data-body-link]');
  const note = root.querySelector('.body-editor-note');
  const originalNote = note.textContent;
  const media = new Map((item.bodyFiles || []).map(file => [file.path, file]));
  const files = () => [...media.values()];
  let selection;
  let imageUpload = false;
  let richChanged = false;

  function loadRich() {
    renderContentMarkdown(editor, source.value, { preview: true, editing: true, media: files() });
    if (!editor.hasChildNodes()) editor.innerHTML = '<p><br></p>';
    selection = null;
    richChanged = false;
  }

  function rememberSelection() {
    const current = window.getSelection();
    if (current.rangeCount && editor.contains(current.anchorNode) && editor.contains(current.focusNode)) {
      selection = current.getRangeAt(0).cloneRange();
    }
  }

  function focusSelection() {
    editor.focus();
    const current = window.getSelection();
    const range = selection && editor.contains(selection.commonAncestorContainer) ? selection : document.createRange();
    if (range !== selection) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    current.removeAllRanges();
    current.addRange(range);
  }

  function updateTools() {
    if (!editor.contains(window.getSelection().anchorNode)) return;
    const block = document.queryCommandValue('formatBlock');
    heading.value = ['h2', 'h3', 'h4'].includes(block) ? block : 'p';
    for (const button of root.querySelectorAll('[data-body-action="bold"],[data-body-action="italic"],[data-body-action="underline"],[data-body-action$="List"]')) {
      button.setAttribute('aria-pressed', String(document.queryCommandState(button.dataset.bodyAction)));
    }
  }

  function edited() {
    richChanged = true;
    markDirty();
    rememberSelection();
    updateTools();
  }

  function command(action, value = null) {
    focusSelection();
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand(action, false, value);
    rememberSelection();
    updateTools();
  }

  function syncSource() {
    if (frame.hidden || !richChanged) return;
    const clean = cleanHTML(editor.innerHTML, { saving: true, media: files() });
    source.value = clean.content.textContent.trim() || clean.content.querySelector('img, hr, table') ?
      richMarker + clean.innerHTML : '';
  }

  root.readBody = () => {
    syncSource();
    const content = cleanHTML(bodyHTML(source.value), { saving: true }).content;
    const paths = new Set(Array.from(content.querySelectorAll('img'), img => assetPath(img.getAttribute('src'))));
    return { body: source.value, bodyFiles: files().filter(file => paths.has(file.path)) };
  };

  function closeLink() {
    linkPanel.hidden = true;
    linkInput.value = '';
  }

  function insertLink() {
    const url = safeUrl(linkInput.value.trim(), ['https:', 'http:', 'mailto:']);
    if (!url) { message('请输入有效的 HTTP、HTTPS 或邮件链接。'); linkInput.focus(); return; }
    if (selection?.collapsed !== false) {
      const a = document.createElement('a');
      a.href = url;
      a.textContent = url;
      command('insertHTML', a.outerHTML);
    } else command('createLink', url);
    closeLink();
  }

  async function insertImages(images) {
    if (!ensureReady() || imageUpload || !images.length) return;
    imageUpload = true;
    uploadsInFlight++;
    note.textContent = '正在上传正文图片…';
    try {
      for (const file of images) {
        const uploaded = await uploadFile(file);
        if (!root.isConnected) return;
        media.set(uploaded.path, uploaded);
        const img = document.createElement('img');
        img.setAttribute('data-body-path', uploaded.path);
        img.src = uploaded.url;
        img.alt = file.name.replace(/\.[^.]+$/, '');
        img.width = uploaded.width || 0;
        img.height = uploaded.height || 0;
        const paragraph = document.createElement('p');
        paragraph.append(img);
        // Keep completed uploads in the document even if a later file fails.
        command('insertHTML', paragraph.outerHTML + '<p><br></p>');
      }
      message('图片已插入正文。');
    } catch (error) {
      message(error.message);
    } finally {
      uploadsInFlight--;
      imageUpload = false;
      note.textContent = originalNote;
    }
  }

  function insertTable() {
    command('insertHTML', '<table><thead><tr><th>表头 1</th><th>表头 2</th></tr></thead><tbody><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>');
  }

  root.addEventListener('pointerdown', event => {
    if (event.target.closest('[data-body-action], [data-body-mode]')) rememberSelection();
  });
  root.addEventListener('mousedown', event => {
    if (event.target.closest('[data-body-action]')) event.preventDefault();
  });
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-body-action]')?.dataset.bodyAction;
    if (event.target.closest('[data-body-mode]')) {
      if (imageUpload) return;
      if (frame.hidden) {
        loadRich();
        frame.hidden = false;
        source.hidden = true;
        mode.textContent = 'Markdown 源码';
        note.textContent = originalNote;
        focusSelection();
      } else {
        syncSource();
        closeLink();
        frame.hidden = true;
        source.hidden = false;
        mode.textContent = '返回可视化编辑';
        note.textContent = '可粘贴完整 Markdown。切回可视化编辑可查看排版。';
        source.focus();
      }
    } else if (event.target.closest('[data-body-link-apply]')) insertLink();
    else if (event.target.closest('[data-body-link-close]')) { closeLink(); focusSelection(); }
    else if (action === 'link') {
      linkPanel.hidden = false;
      linkInput.focus();
    } else if (action === 'image') {
      if (!imageUpload) picker.click();
    } else if (action === 'table') insertTable();
    else if (action === 'quote') command('formatBlock', document.queryCommandValue('formatBlock') === 'blockquote' ? 'p' : 'blockquote');
    else if (action) command(action);
  });
  heading.addEventListener('change', () => command('formatBlock', heading.value));
  picker.addEventListener('change', () => {
    const images = Array.from(picker.files);
    picker.value = '';
    void insertImages(images);
  });
  linkInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); insertLink(); }
    if (event.key === 'Escape') { closeLink(); focusSelection(); }
  });
  linkInput.addEventListener('input', event => event.stopPropagation());
  editor.addEventListener('input', edited);
  editor.addEventListener('pointerup', () => { rememberSelection(); updateTools(); });
  editor.addEventListener('keyup', () => { rememberSelection(); updateTools(); });
  editor.addEventListener('focusout', rememberSelection);
  editor.addEventListener('paste', event => {
    event.preventDefault();
    rememberSelection();
    const html = event.clipboardData.getData('text/html');
    const plain = event.clipboardData.getData('text/plain');
    const images = Array.from(event.clipboardData.files).filter(file => file.type.startsWith('image/'));
    if (html) {
      const clean = cleanHTML(html, { preview: true, editing: true, media: files() });
      if (clean.content.textContent.trim() || clean.content.querySelector('img,table')) {
        command('insertHTML', clean.innerHTML);
        return;
      }
    }
    if (images.length) void insertImages(images);
    else if (plain) command('insertText', plain);
  });
  editor.addEventListener('dragover', event => event.preventDefault());
  editor.addEventListener('drop', event => {
    event.preventDefault();
    rememberSelection();
    const images = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (images.length) void insertImages(images);
  });
  editor.addEventListener('click', event => {
    if (event.target.closest('a')) event.preventDefault();
  });
  loadRich();
}
