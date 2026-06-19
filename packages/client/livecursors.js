/*!
 * @livecursors/client — drop-in real-time cursor sharing for any website.
 *
 * Two ways to use it:
 *
 * 1) Plain <script> with data-* config (auto-initialises on load):
 *      <script src="/livecursors.js"
 *              data-server="https://my-app.com"
 *              data-room="auto"
 *              data-path="/livecursors"></script>
 *
 * 2) As a module:
 *      import { init } from '@livecursors/client';
 *      const session = init({ server: 'https://my-app.com', room: location.pathname });
 *      // later: session.destroy();
 *
 * Accuracy across screen sizes: instead of absolute pixels, each cursor is
 * sent as { path, rx, ry } — a structural selector for the element under the
 * pointer plus a 0..1 position inside it. Receivers resolve the same element
 * in their own DOM, so everyone points at the same object regardless of
 * viewport size, responsive reflow, or scroll offset. Add a stable
 * `data-lc-id="..."` to important elements for robustness on dynamic/SPA pages.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LiveCursors = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Capture our own <script> synchronously (for data-* auto-init).
  var THIS_SCRIPT = (typeof document !== 'undefined') ? document.currentScript : null;

  var DEFAULT_SOCKETIO = 'https://cdn.socket.io/4.7.5/socket.io.min.js';

  var COLORS = [
    '#f43f5e', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#6366f1', '#a855f7', '#ec4899'
  ];

  function ensureSocketIO(url) {
    return new Promise(function (resolve, reject) {
      if (window.io) return resolve(window.io);
      var s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = function () { resolve(window.io); };
      s.onerror = function () { reject(new Error('LiveCursors: failed to load socket.io from ' + url)); };
      document.head.appendChild(s);
    });
  }

  function esc(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/["\\\]\[]/g, '\\$&');
  }

  // Deterministic selector for an element. Stops early at a stable anchor:
  // data-lc-id (preferred) or id, otherwise an nth-of-type chain up to body.
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return null;
    var parts = [];
    while (el && el.nodeType === 1) {
      if (el.dataset && el.dataset.lcId) {
        parts.unshift('[data-lc-id="' + esc(el.dataset.lcId) + '"]');
        return parts.join(' > ');
      }
      if (el.id) {
        parts.unshift('#' + esc(el.id));
        return parts.join(' > ');
      }
      if (el === document.body) { parts.unshift('body'); return parts.join(' > '); }
      var p = el.parentNode;
      if (!p) break;
      var tag = el.tagName.toLowerCase();
      var same = Array.prototype.filter.call(p.children, function (c) {
        return c.tagName === el.tagName;
      });
      if (same.length > 1) tag += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
      parts.unshift(tag);
      el = p;
    }
    return parts.length ? parts.join(' > ') : null;
  }

  function resolvePath(path) {
    try { return document.querySelector(path); } catch (e) { return null; }
  }

  function init(opts) {
    opts = opts || {};

    var server  = opts.server || (location.protocol + '//' + location.host);
    var sioPath = opts.path || '/livecursors';
    var room    = opts.room || 'auto';
    if (room === 'auto') room = location.host + location.pathname;

    var name  = opts.name  || 'User-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    var color = opts.color || COLORS[Math.floor(Math.random() * COLORS.length)];
    var throttleMs = opts.throttleMs != null ? opts.throttleMs : 32;
    var zIndex = opts.zIndex != null ? opts.zIndex : 2147483646;
    var socketUrl = opts.socketUrl || DEFAULT_SOCKETIO;
    var onPresence = typeof opts.onPresence === 'function' ? opts.onPresence : null;

    var layer = document.createElement('div');
    layer.setAttribute('data-livecursors-layer', '');
    layer.style.cssText =
      'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:' + zIndex + ';';
    document.body.appendChild(layer);

    var remotes = {}; // id -> { el, path, rx, ry }

    function makeCursorEl(c, n) {
      var el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:0;top:0;will-change:transform;' +
        'transition:transform .08s linear;display:none;';
      el.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
          'style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))">' +
          '<path d="M5 3l5.5 14 2-5.5L18 9.5 5 3z" fill="' + c + '" ' +
            'stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
        '<span style="position:absolute;left:18px;top:18px;background:' + c +
          ';color:#fff;font:600 11px/1 -apple-system,sans-serif;padding:3px 7px;' +
          'border-radius:10px;white-space:nowrap;">' + n + '</span>';
      return el;
    }

    function place(r) {
      var el = resolvePath(r.path);
      if (!el) { r.el.style.display = 'none'; return; }
      var rect = el.getBoundingClientRect();
      var x = rect.left + r.rx * rect.width;
      var y = rect.top  + r.ry * rect.height;
      r.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      r.el.style.display = 'block';
    }

    function repositionAll() { for (var id in remotes) place(remotes[id]); }

    var socket = null;
    var last = 0;
    var destroyed = false;

    function onMove(e) {
      var now = Date.now();
      if (now - last < throttleMs) return;
      last = now;
      var target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) return;
      var path = cssPath(target);
      if (!path) return;
      var rect = target.getBoundingClientRect();
      socket.emit('cursor', {
        path: path,
        rx: rect.width  ? (e.clientX - rect.left) / rect.width  : 0,
        ry: rect.height ? (e.clientY - rect.top)  / rect.height : 0,
        name: name, color: color
      });
    }
    function onLeave() { if (socket) socket.emit('cursor-leave'); }

    function remove(id) {
      if (remotes[id]) { remotes[id].el.remove(); delete remotes[id]; }
    }

    ensureSocketIO(socketUrl).then(function (io) {
      if (destroyed) return;
      socket = io(server, { path: sioPath, transports: ['websocket', 'polling'] });

      socket.on('connect', function () { socket.emit('join', room); });

      socket.on('cursor', function (d) {
        var r = remotes[d.id];
        if (!r) { r = { el: makeCursorEl(d.color, d.name) }; layer.appendChild(r.el); remotes[d.id] = r; }
        r.path = d.path; r.rx = d.rx; r.ry = d.ry;
        place(r);
      });
      socket.on('cursor-leave', function (d) { remove(d.id); });

      socket.on('presence', function (p) {
        var n = p && p.count != null ? p.count : 0;
        var nodes = document.querySelectorAll('[data-livecursors-count]');
        for (var i = 0; i < nodes.length; i++) nodes[i].textContent = n;
        if (onPresence) onPresence(n);
      });

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseleave', onLeave);
      window.addEventListener('scroll', repositionAll, true);
      window.addEventListener('resize', repositionAll);
    }).catch(function (err) { console.error(err); });

    return {
      room: room,
      destroy: function () {
        destroyed = true;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseleave', onLeave);
        window.removeEventListener('scroll', repositionAll, true);
        window.removeEventListener('resize', repositionAll);
        if (socket) socket.disconnect();
        layer.remove();
      }
    };
  }

  function autoInit() {
    var el = THIS_SCRIPT;
    if (!el || !el.dataset) return;
    var d = el.dataset;
    if (d.autoInit === 'false') return;
    if (d.server == null && d.room == null) return; // no config => manual init
    init({
      server: d.server, room: d.room, path: d.path,
      name: d.name, color: d.color,
      socketUrl: d.socketio,
      throttleMs: d.throttle != null ? Number(d.throttle) : undefined
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInit);
    } else {
      autoInit();
    }
  }

  return { init: init };
}));
