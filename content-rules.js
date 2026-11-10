(function (root) {
  'use strict';
  const idOf = item => String(item.key ?? item.id ?? '');
  const isPublished = item => item.publication !== 'draft' && item.state !== '草稿' && item.status !== '草稿';
  const timeOf = (item, kind) => {
    // Publication dates on imported images describe republishing, not uploading.
    const dates = kind === 'images' ? [item.uploadedAt, item.createdAt]
      : kind === 'projects' ? [item.createdAt, item.publishedAt]
      : [item.publishedAt, item.date, item.createdAt];
    for (const value of dates) {
      const time = typeof value === 'number' ? value : Date.parse(value);
      if (Number.isFinite(time)) return time;
    }
    return 0;
  };
  // Shared by every list. Updates do not change the original creation/publication order.
  // Legacy records fall back to their numeric IDs, then their insertion sequence.
  const newestFirst = (items, kind) => (items || []).map((item, index) => ({ item, index }))
    .sort((a, b) => timeOf(b.item, kind) - timeOf(a.item, kind) ||
      (Number(b.item.id) || 0) - (Number(a.item.id) || 0) || b.index - a.index)
    .map(({ item }) => item);
  const latest = (items, kind) => newestFirst(items, kind).filter(isPublished);
  const isLandscape = item => Number(item.width) > 0 && Number(item.height) > 0 && Number(item.width) > Number(item.height);
  function resolveHome(collections, config = {}) {
    const groups = {
      projects: latest(collections.projects, 'projects'),
      articles: latest(collections.articles, 'articles'),
      images: latest(collections.images, 'images')
    };
    const heroMode = config.heroMode === 'manual' ? 'manual' : 'auto';
    const featuredMode = config.featuredMode === 'manual' ? 'manual' : 'auto';
    const hero = heroMode === 'auto'
      ? groups.images.find(isLandscape) || null
      : groups.images.find(item => idOf(item) === String(config.hero)) || null;
    let featured;
    if (featuredMode === 'auto') {
      featured = [['projects', 1], ['articles', 2], ['images', 2]].flatMap(([kind, count]) =>
        groups[kind].slice(0, count).map(item => ({ kind, item })));
    } else {
      const used = new Set();
      featured = (config.featured || []).slice(0, 5).flatMap(ref => {
        if (!ref || used.has(ref)) return [];
        const [kind, id] = ref.split(':');
        const item = groups[kind]?.find(entry => idOf(entry) === id);
        if (!item) return [];
        used.add(ref);
        return [{ kind, item }];
      });
    }
    return { hero, featured, heroMode, featuredMode };
  }
  root.SUSU_CONTENT = { idOf, isPublished, timeOf, newestFirst, latest, isLandscape, resolveHome };
})(globalThis);
