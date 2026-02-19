// Inline script injected before hydration to apply saved theme and prevent flash.
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem('clipvault-theme');
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        }
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
