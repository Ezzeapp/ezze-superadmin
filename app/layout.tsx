import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ezze Super Admin",
  description: "Content management for all Ezze landing pages",
  robots: "noindex, nofollow",
};

// Restore theme and primary color from localStorage before first paint (no FOUC)
const themeScript = `(function(){
  try {
    var t = localStorage.getItem('sa_theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
    var c = localStorage.getItem('sa_color');
    if (c) {
      var p = JSON.parse(c), el = document.documentElement;
      if (p[50])  el.style.setProperty('--color-indigo-50',  p[50]);
      if (p[100]) el.style.setProperty('--color-indigo-100', p[100]);
      if (p[300]) el.style.setProperty('--color-indigo-300', p[300]);
      if (p[500]) el.style.setProperty('--color-indigo-500', p[500]);
      if (p[600]) el.style.setProperty('--color-indigo-600', p[600]);
      if (p[700]) el.style.setProperty('--color-indigo-700', p[700]);
    }
  } catch(e){}

  // Dynamic favicon — updates with primary color
  window.__updateFavicon = function(fillColor) {
    try {
      if (!fillColor) {
        var sc = localStorage.getItem('sa_color');
        fillColor = sc ? (JSON.parse(sc)[500] || '#6366f1') : '#6366f1';
      }
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        + '<rect width="32" height="32" fill="' + fillColor + '"/>'
        + '<polygon points="17.3,2.7 4,18.7 16,18.7 14.7,29.3 28,13.3 16,13.3" fill="white"/>'
        + '</svg>';
      var url = 'data:image/svg+xml,' + encodeURIComponent(svg);
      var existing = document.querySelectorAll('link[rel="icon"]');
      existing.forEach(function(l){ l.parentNode && l.parentNode.removeChild(l); });
      var link = document.createElement('link');
      link.rel = 'icon'; link.type = 'image/svg+xml'; link.href = url;
      document.head.appendChild(link);
    } catch(e){}
  };
  document.addEventListener('DOMContentLoaded', function(){ window.__updateFavicon(); });
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="h-full">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full bg-gray-50">{children}</body>
    </html>
  );
}
