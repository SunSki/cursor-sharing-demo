/*
 * cursors.js — drop-in real-time cursor sharing for any website.
 *
 * How it stays accurate across different screen sizes / layouts / scroll:
 * instead of sending absolute pixel coordinates, it sends
 *   { path, rx, ry }
 * where `path` is a structural CSS selector for the DOM element under the
 * pointer, and (rx, ry) is the pointer's position *inside* that element as a
 * 0..1 ratio. The receiver resolves the same element in its own DOM and places
 * the cursor at the same relative spot — so everyone points at the same object.
 *
 * Usage: include socket.io, then <script src="/cursors.js"></script>.
 */
(function () {
  const COLORS = [
    '#f43f5e', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#6366f1', '#a855f7', '#ec4899'
  ];
  const myColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  const myName  = 'User-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  // Overlay layer for remote cursors. pointer-events:none (inherited by
  // children) so it never interferes with the page or with elementFromPoint.
  const layer = document.createElement('div');
  layer.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483646;overflow:hidden;';
  document.body.appendChild(layer);

  // --- Build a deterministic structural selector for an element ---
  // Identical DOM on both clients => identical path => same element resolved.
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el === document.body) return 'body';
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      let sel = el.tagName.toLowerCase();
      const parent = el.parentNode;
      if (!parent) break;
      const sameTag = Array.from(parent.children)
        .filter((c) => c.tagName === el.tagName);
      if (sameTag.length > 1) {
        sel += ':nth-of-type(' + (sameTag.indexOf(el) + 1) + ')';
      }
      parts.unshift(sel);
      el = parent;
    }
    return 'body > ' + parts.join(' > ');
  }

  function resolve(path) {
    try { return document.querySelector(path); } catch (e) { return null; }
  }

  // --- Remote cursor rendering ---
  const remotes = {}; // id -> { el, path, rx, ry }

  function makeCursorEl(color, name) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;will-change:transform;' +
      'transition:transform .08s linear;display:none;';
    el.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
        'style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))">' +
        '<path d="M5 3l5.5 14 2-5.5L18 9.5 5 3z" fill="' + color + '" ' +
          'stroke="white" stroke-width="1.5" stroke-linejoin="round"/>' +
      '</svg>' +
      '<span style="position:absolute;left:18px;top:18px;background:' + color +
        ';color:#fff;font:600 11px/1 -apple-system,sans-serif;padding:3px 7px;' +
        'border-radius:10px;white-space:nowrap;">' + name + '</span>';
    return el;
  }

  function place(r) {
    const el = resolve(r.path);
    if (!el) { r.el.style.display = 'none'; return; }
    const rect = el.getBoundingClientRect();
    const x = rect.left + r.rx * rect.width;
    const y = rect.top  + r.ry * rect.height;
    r.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    r.el.style.display = 'block';
  }

  // --- Socket wiring ---
  const socket = io();
  let last = 0;

  window.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - last < 32) return; // ~30fps throttle
    last = now;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return;
    const path = cssPath(target);
    if (!path) return;

    const rect = target.getBoundingClientRect();
    const rx = rect.width  ? (e.clientX - rect.left) / rect.width  : 0;
    const ry = rect.height ? (e.clientY - rect.top)  / rect.height : 0;

    socket.emit('cursor', { path, rx, ry, color: myColor, name: myName });
  });

  window.addEventListener('mouseleave', () => socket.emit('cursor-leave'));

  socket.on('cursor', (d) => {
    let r = remotes[d.id];
    if (!r) {
      r = { el: makeCursorEl(d.color, d.name) };
      layer.appendChild(r.el);
      remotes[d.id] = r;
    }
    r.path = d.path; r.rx = d.rx; r.ry = d.ry;
    place(r);
  });

  function remove(id) {
    if (remotes[id]) { remotes[id].el.remove(); delete remotes[id]; }
  }
  socket.on('cursor-leave', (d) => remove(d.id));
  socket.on('user-left',    (d) => remove(d.id));

  socket.on('user-count', (count) => {
    const el = document.getElementById('cursor-presence-count');
    if (el) el.textContent = count;
  });

  // Re-anchor remote cursors when our own viewport scrolls or resizes
  // (capture:true also catches scrolling inside nested scroll containers).
  function repositionAll() {
    for (const id in remotes) place(remotes[id]);
  }
  window.addEventListener('scroll', repositionAll, true);
  window.addEventListener('resize', repositionAll);
})();
