/*
 * LiveCursors content script.
 *
 * Loaded after lib/socket.io.min.js and lib/livecursors.js (same isolated
 * world), so `window.io` and `window.LiveCursors` are already available here.
 * We connect to the hosted relay with the room scoped to the current page URL,
 * so anyone else running this extension on the same URL sees each other.
 */
(function () {
  'use strict';

  var RELAY  = 'https://cursor-sharing-demo.onrender.com';
  var SIO_PATH = '/livecursors';

  // Only run on real web pages.
  if (!/^https?:$/.test(location.protocol)) return;
  if (!window.LiveCursors || !window.io) return;

  // Room = origin + pathname (ignore query/hash so trackers don't split rooms).
  var room = location.origin + location.pathname;

  var session = null;
  var badge = null;

  function makeBadge() {
    var el = document.createElement('div');
    el.style.cssText = [
      'position:fixed', 'bottom:16px', 'right:16px', 'z-index:2147483647',
      'background:#1a1a2e', 'color:#fff', 'font:600 12px/1 -apple-system,sans-serif',
      'padding:8px 12px', 'border-radius:99px', 'display:flex', 'align-items:center',
      'gap:7px', 'box-shadow:0 4px 16px rgba(0,0,0,.3)', 'pointer-events:none',
      'opacity:0', 'transition:opacity .3s'
    ].join(';');
    el.innerHTML =
      '<span style="width:8px;height:8px;border-radius:50%;background:#4ade80;' +
        'box-shadow:0 0 0 0 rgba(74,222,128,.6);"></span>' +
      '<span>LiveCursors <b data-livecursors-count>1</b></span>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = '1'; });
    return el;
  }

  function start(name, color) {
    if (session) return;
    badge = makeBadge();
    session = window.LiveCursors.init({
      server: RELAY,
      path: SIO_PATH,
      room: room,
      name: name || undefined,
      color: color || undefined,
      onPresence: function (n) {
        var b = badge && badge.querySelector('[data-livecursors-count]');
        if (b) b.textContent = n;
      }
    });
  }

  function stop() {
    if (session) { session.destroy(); session = null; }
    if (badge) { badge.remove(); badge = null; }
  }

  // Read settings, then start if enabled (default: on).
  chrome.storage.sync.get(['enabled', 'userName', 'userColor'], function (cfg) {
    var enabled = cfg.enabled !== false; // default true
    if (enabled) start(cfg.userName, cfg.userColor);
  });

  // React to popup toggles live, without a page reload.
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'sync') return;
    if (changes.enabled) {
      if (changes.enabled.newValue === false) stop();
      else {
        chrome.storage.sync.get(['userName', 'userColor'], function (cfg) {
          start(cfg.userName, cfg.userColor);
        });
      }
    }
  });
})();
