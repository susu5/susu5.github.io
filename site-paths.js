(() => {
  const sections = { home: '/', projects: '/projects/', gallery: '/gallery/', knowledge: '/notes/' };
  const details = { project: 'projects', note: 'notes', image: 'gallery' };
  // Permanent names for the first published guides. Other URLs use their stable CMS ID.
  const slugs = {
    project: { 4: 'personal-website' },
    note: { 1: 'website-design-simplification', 2: 'consistent-ai-image-style' }
  };

  function publicPath(page, id) {
    if (Object.hasOwn(sections, page)) return sections[page];
    if (!Object.hasOwn(details, page) || !/^[A-Za-z0-9_-]{1,100}$/.test(String(id ?? ''))) return null;
    const names = slugs[page];
    const segment = names && Object.hasOwn(names, id) ? names[id] : id;
    return '/' + details[page] + '/' + segment + '/';
  }

  function legacyPath(hash) {
    const match = /^#(home|projects|gallery|knowledge|project|note|image)(?:\/([A-Za-z0-9_-]{1,100}))?$/.exec(hash);
    if (!match) return null;
    const [, page, id] = match;
    if (Object.hasOwn(details, page) !== Boolean(id)) return null;
    return publicPath(page, id);
  }

  globalThis.SUSU_PATHS = { publicPath, legacyPath };
})();
