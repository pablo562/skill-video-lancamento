// Ícones de linha (24x24, traço currentColor) injetados no documento. Uso: <svg class="ic"><use href="#i-bag"/></svg>
(function () {
  const defs = `
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></symbol>
    <symbol id="i-bag" viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3.4 3.2 14.6 0 18M12 3c-3.2 3.4-3.2 14.6 0 18"/></symbol>
    <symbol id="i-card" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/></symbol>
    <symbol id="i-cupom" viewBox="0 0 24 24"><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7z"/><path d="M9.5 14.5l5-5"/><circle cx="9.5" cy="9.8" r=".6"/><circle cx="14.5" cy="14.2" r=".6"/></symbol>
    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></symbol>
    <symbol id="i-layers" viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17.5l9 5 9-5"/></symbol>
    <symbol id="i-gshop" viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M14.5 13.5h-2.5v1.8M14.5 13.5a2.6 2.6 0 1 1-.8-1.9"/></symbol>
    <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M6 16v-4M10.5 16V8M15 16v-6M19.5 16V5"/></symbol>
    <symbol id="i-box" viewBox="0 0 24 24"><path d="M3.5 8L12 3.5 20.5 8v8L12 20.5 3.5 16V8z"/><path d="M3.5 8L12 12.5 20.5 8M12 12.5v8"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
    <symbol id="i-shirt" viewBox="0 0 24 24"><path d="M8.5 4L3 7l2 4.2 2.2-1V20h9.6V10.2l2.2 1L21 7l-5.5-3a3.5 3.5 0 0 1-7 0z"/></symbol>
    <symbol id="i-tag" viewBox="0 0 24 24"><path d="M3.5 12.5V4h8.5l9 9-8.5 8.5-9-9z"/><circle cx="8" cy="8.5" r="1.5"/></symbol>
    <symbol id="i-truck" viewBox="0 0 24 24"><path d="M2.5 6h11v10h-11zM13.5 9.5h4.5l3.5 3.5v3h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/></symbol>
    <symbol id="i-home" viewBox="0 0 24 24"><path d="M3.5 11L12 4l8.5 7v9h-17v-9z"/><path d="M10 20v-5.5h4V20"/></symbol>
    <symbol id="i-grip" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.3" fill="currentColor"/><circle cx="15" cy="6" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/></symbol>
    <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5l-5.5 2.9 1-6.3L3 9.7l6.2-.9L12 3z"/></symbol>
    <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></symbol>
    <symbol id="i-insta" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".8" fill="currentColor"/></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
    <symbol id="i-rocket" viewBox="0 0 24 24"><path d="M5 19c0-3 1-5 3-6l3 3c-1 2-3 3-6 3z"/><path d="M8 13c2-6 6-9 12-9 0 6-3 10-9 12l-3-3z"/><circle cx="15" cy="9" r="1.6"/></symbol>
`;
  document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" style="position:absolute"><defs>' + defs + '</defs></svg>');
})();
