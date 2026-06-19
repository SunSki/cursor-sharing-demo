/*
 * LiveCursors content script.
 *
 * Loaded after lib/socket.io.min.js and lib/livecursors.js (same isolated
 * world), so `window.io` and `window.DotSync` are already available here.
 *
 * Privacy model: cursor sharing only runs when the user has set a ROOM CODE
 * in the popup. The room is `origin + pathname + ":" + code`, so only people
 * with the same code on the same URL see each other. Empty code = OFF.
 */
(function () {
  'use strict';

  var RELAY = 'https://dotsync-8an8.onrender.com';
  var SIO_PATH = '/livecursors';

  if (!/^https?:$/.test(location.protocol)) return;
  if (!window.DotSync || !window.io) return;

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
      '<span style="width:8px;height:8px;border-radius:50%;background:#00C2A8;"></span>' +
      '<span>' + chrome.i18n.getMessage('badgeLabel') + ' <b data-livecursors-count>1</b></span>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = '1'; });
    return el;
  }

  function start(code, name, color, markerStyle) {
    if (session || !code) return;
    var room = location.origin + location.pathname + ':' + code;
    badge = makeBadge();
    session = window.DotSync.init({
      server: RELAY,
      path: SIO_PATH,
      room: room,
      name: name || undefined,
      color: color || undefined,
      markerStyle: markerStyle || 'dot',
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

  function restart(code, name, color, markerStyle) { stop(); start(code, name, color, markerStyle); }

  // Start only if a room code is set.
  chrome.storage.sync.get(['roomCode', 'userName', 'userColor', 'markerStyle'], function (cfg) {
    var code = (cfg.roomCode || '').trim();
    if (code) start(code, cfg.userName, cfg.userColor, cfg.markerStyle);
  });

  // React to popup changes live (no page reload needed).
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'sync') return;
    if (changes.roomCode || changes.userName || changes.userColor || changes.markerStyle) {
      chrome.storage.sync.get(['roomCode', 'userName', 'userColor', 'markerStyle'], function (cfg) {
        var code = (cfg.roomCode || '').trim();
        if (code) restart(code, cfg.userName, cfg.userColor, cfg.markerStyle);
        else stop();
      });
    }
  });
})();
