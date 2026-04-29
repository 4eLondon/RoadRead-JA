//theme js file

(function() {
  const STORAGE_KEY = 'rrja-theme';
  const THEME_ATTR = 'data-theme';

  // Get saved theme or default to dark
  function getSavedTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute(THEME_ATTR, theme);
  }

  // Save and apply
  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  // Toggle between light/dark
  function toggleTheme() {
    const current = document.documentElement.getAttribute(THEME_ATTR) || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Initialize on page load
  function init() {
    const saved = getSavedTheme();
    applyTheme(saved);

    // Find toggle button if it exists
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleTheme);
      updateToggleIcon(toggleBtn, saved);
    }
  }

  // Update button icon/text based on current theme
  function updateToggleIcon(btn, theme) {
    // Sun icon for dark mode (click to go light), Moon for light mode
    btn.innerHTML = theme === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <circle cx="12" cy="12" r="5"/>
           <line x1="12" y1="1" x2="12" y2="3"/>
           <line x1="12" y1="21" x2="12" y2="23"/>
           <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
           <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
           <line x1="1" y1="12" x2="3" y2="12"/>
           <line x1="21" y1="12" x2="23" y2="12"/>
           <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
           <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
         </svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
         </svg>`;
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // Listen for theme changes from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      applyTheme(e.newValue);
      const btn = document.getElementById('theme-toggle');
      if (btn) updateToggleIcon(btn, e.newValue);
    }
  });

  // Expose to global scope for manual toggling
window.rrjaTheme = { set: setTheme, toggle: toggleTheme, init: init };
  // Run immediately
  init();
})();
