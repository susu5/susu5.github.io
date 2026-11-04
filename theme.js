(() => {
  const storageKey = 'susu.appearance';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try { preference = localStorage.getItem(storageKey); } catch {}

  function update() {
    const dark = preference === 'dark' || (preference !== 'light' && system.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      const label = button.querySelector('span');
      if (!label) continue;
      const next = dark ? '亮色' : '暗色';
      label.textContent = next;
      button.setAttribute('aria-label', '切换到' + next + '模式');
      button.hidden = false;
    }
  }

  update();
  document.addEventListener('DOMContentLoaded', () => {
    const icons = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="theme-moon" d="M20.5 15a8.5 8.5 0 0 1-11.5-11.5A8.5 8.5 0 1 0 20.5 15Z"/><g class="theme-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></g></svg>';
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.innerHTML = icons + '<span></span>';
      button.addEventListener('click', () => {
        preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(storageKey, preference); } catch {}
        update();
      });
    }
    update();
  });
  system.addEventListener('change', update);
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = event.newValue;
    update();
  });
})();
