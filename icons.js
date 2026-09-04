/* Minimal stroke-icon set (24x24, currentColor) used across the app instead of emoji,
   to stay visually consistent with the reference design. */
const ICONS = {
  home:     '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h5v-5h2v5h5v-9"/>',
  user:     '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3.1-6.5 7-6.5S19 16 19 20"/>',
  send:     '<path d="M4 12 20 4 13 20l-2-7-7-1Z"/>',
  download: '<path d="M12 4v11"/><path d="M7.5 11.5 12 16l4.5-4.5"/><path d="M5 19h14"/>',
  shuffle:  '<path d="M3.5 7h4l9 10h3.5"/><path d="M3.5 17h4l2.2-2.5"/><path d="M15 7h5.5M18 4.5 20.5 7 18 9.5"/><path d="M18 19.5 20.5 17 18 14.5"/>',
  clock:    '<circle cx="12" cy="12" r="8.3"/><path d="M12 7.5V12l3.2 2"/>',
  users:    '<circle cx="9" cy="8" r="3"/><path d="M2.7 19c0-3.4 2.8-5.7 6.3-5.7s6.3 2.3 6.3 5.7"/><circle cx="17" cy="8.5" r="2.3"/><path d="M15.8 13.6c2.6.4 4.5 2.3 4.5 5.4"/>',
  bag:      '<path d="M6.5 8h11l1 12h-13z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  trophy:   '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 5H5.5A2.5 2.5 0 0 0 5 9.9 4 4 0 0 0 8 11"/><path d="M16 5h2.5A2.5 2.5 0 0 1 19 9.9 4 4 0 0 1 16 11"/><path d="M12 13v3M9 20h6M10 16.5h4v3.5h-4z"/>',
  gift:     '<path d="M4 10h16v10H4z"/><path d="M2.5 7h19v3.5h-19z"/><path d="M12 7v13"/><path d="M12 7c-1.2-3-5.5-3.3-5.5-.7C6.5 8 9 7.6 12 7Zm0 0c1.2-3 5.5-3.3 5.5-.7 0 1.7-2.5 1.3-5.5.7Z"/>',
  card:     '<rect x="3" y="6" width="18" height="13" rx="2.2"/><path d="M3 10.5h18"/><path d="M6.5 15h4"/>',
  gear:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.5-2.4.7a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.6a7.6 7.6 0 0 0-2.6 1.5l-2.4-.7-2 3.5 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.5 2.4-.7a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.6a7.6 7.6 0 0 0 2.6-1.5l2.4.7 2-3.5Z"/>',
  headset:  '<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="5.5" rx="1.3"/><rect x="17" y="13" width="4" height="5.5" rx="1.3"/><path d="M19 18.5v.7a3 3 0 0 1-3 3h-2.5"/>',
  bell:     '<path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z"/><path d="M10 18a2 2 0 0 0 4 0"/>',
  mail:     '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  chevdown: '<path d="M6 9l6 6 6-6"/>',
  search:   '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
  diamond:  '<path d="M4 9l3-5h10l3 5-8 11z"/><path d="M4 9h16M8.5 4l3.5 5 3.5-5"/>',
  trending: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  sparkle:  '<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6Z"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  minus:    '<path d="M5 12h14"/>',
  close:    '<path d="M6 6l12 12M18 6 6 18"/>',
  chat:     '<path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.3-3.6A7.96 7.96 0 0 1 4 12Z"/>',
  crown:    '<path d="M4 18h16l1-9-5 3-4-6-4 6-5-3z"/>',
  shield:   '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  cart:     '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 4h2.5l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20.5 8H6"/>',
};

function ic(name, size, strokeWidth){
  const body = ICONS[name] || '';
  size = size || 18;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
