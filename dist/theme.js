(() => {
  const key = 'maroesl-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  let saved;
  let transitionTimer;
  try { saved = localStorage.getItem(key); } catch {}
  const valid = value => value === 'light' || value === 'dark';
  function apply(theme, persist = false) {
    if (!valid(theme)) return;
    const previous = document.documentElement.dataset.theme;
    if (previous && previous !== theme && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.dataset.themeTransition = '';
      clearTimeout(transitionTimer);
      transitionTimer = setTimeout(() => delete document.documentElement.dataset.themeTransition, 220);
    }
    document.documentElement.dataset.theme = theme;
    if (persist) { saved = theme; try { localStorage.setItem(key, theme); } catch {} }
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.setAttribute('aria-label', theme === 'dark' ? '切换到白色模式' : '切换到黑色模式');
      button.title = button.getAttribute('aria-label');
    });
    window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }
  window.roomTheme = {
    get value() { return document.documentElement.dataset.theme; },
    toggle() { apply(this.value === 'dark' ? 'light' : 'dark', true); }
  };
  apply(valid(saved) ? saved : system.matches ? 'dark' : 'light');
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => window.roomTheme.toggle()));
    apply(window.roomTheme.value);
  });
  system.addEventListener('change', () => { if (!valid(saved)) apply(system.matches ? 'dark' : 'light'); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    saved = event.newValue;
    apply(valid(saved) ? saved : system.matches ? 'dark' : 'light');
  });
})();
