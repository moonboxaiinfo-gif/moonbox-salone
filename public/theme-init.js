(() => {
  try {
    const mode = localStorage.getItem('moonbox_salon_theme_mode') || 'dark';
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  } catch {
    document.documentElement.classList.add('dark');
  }
})();
