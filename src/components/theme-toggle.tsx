"use client";

export const THEME_KEY = "theme";

/**
 * Runs in <head> before first paint: applies the saved theme, or the device
 * setting when nothing is saved, and follows device changes in that case.
 */
export const themeScript = `(function(){try{
var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");
function a(){var t=localStorage.getItem("${THEME_KEY}");d.dataset.theme=t==="light"||t==="dark"?t:(m.matches?"dark":"light")}
a();m.addEventListener("change",a);
}catch(e){}})()`;

export function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  // Icons switch purely via CSS, so server and client render the same markup.
  return (
    <button type="button" onClick={toggle} aria-label="Toggle theme" title="Toggle light / dark" className="btn-ghost size-9 p-0">
      <svg viewBox="0 0 24 24" className="size-5 dark:hidden" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="hidden size-5 dark:block" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
