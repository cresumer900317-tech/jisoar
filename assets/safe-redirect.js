'use strict';
function safeLoginRedirect(search, origin) {
  try {
    const raw = new URLSearchParams(search).get('redirect') || '/hq/';
    const target = new URL(raw, origin + '/');
    if (target.origin !== origin || !['http:', 'https:'].includes(target.protocol) || target.pathname.startsWith('//')) return '/hq/';
    if (target.pathname === '/login.html' || target.pathname === '/login') return '/hq/';
    return target.pathname + target.search + target.hash;
  } catch { return '/hq/'; }
}
