/**
 * theme.js  —  Habit Tracker theme manager
 * Drop this into every page with: <script src="theme.js"><\/script>
 *
 * What it does:
 *  1. Reads saved preference from localStorage on page load (no flash)
 *  2. Applies [data-theme="dark"] to <html> element
 *  3. Exposes window.ThemeManager with toggle() and getCurrent()
 *  4. Dispatches 'themechange' event on window when toggled
 *  5. Keyboard shortcut: Ctrl/Cmd + Shift + L
 */

(function () {
  const KEY = 'ht_theme';

  const ThemeManager = {
    getCurrent() {
      return localStorage.getItem(KEY) || 'light';
    },

    apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      // Update any toggle buttons on the page
      document.querySelectorAll('[data-theme-btn]').forEach(btn => {
        btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('title',      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      });
      // Fire event so analytics.html / index.html can react if needed
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    },

    toggle() {
      const next = this.getCurrent() === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      this.apply(next);
      return next;
    },

    init() {
      // Apply immediately (before paint) to prevent flash
      this.apply(this.getCurrent());

      // Keyboard shortcut — Ctrl/Cmd + Shift + L
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
          e.preventDefault();
          this.toggle();
        }
      });
    }
  };

  // Run before DOM is ready to prevent FOUC
  ThemeManager.init();
  window.ThemeManager = ThemeManager;
})();
