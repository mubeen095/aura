/* ================================================================
   rizz-prism-grid — vanilla port of Originkit "Prism Grid".
   A slightly 3D-tilted grid of bordered boxes; the cell under the
   cursor lights up with a random pastel and fades out over 1s.
   Plain DOM + CSS transition — no React / framer-motion at runtime.

   Usage:
     <div class="pg-root" data-pg-config='{ "boxSize": 40 }'></div>
   window.RIZZPrismGrid.init(root[, cfg]) / initAll()
   ================================================================ */
(function () {
  'use strict';

  var DEFAULT_COLORS = [
    '#FFFFFF', '#FFC2E3', '#DEFFEA', '#A68F1F', '#A85E5E', '#DFC2FF',
    'rgb(147 197 253)', 'rgb(165 180 252)', 'rgb(196 181 253)', 'rgb(125 211 252)'
  ];

  var PERSPECTIVE = 1000;

  function screenToPlane(sx, sy, yawDeg, pitchDeg, p) {
    p = p || PERSPECTIVE;
    var a = (yawDeg * Math.PI) / 180;
    var b = (pitchDeg * Math.PI) / 180;
    var ca = Math.cos(a), sa = Math.sin(a);
    var cb = Math.cos(b), sb = Math.sin(b);

    var a11 = p * ca - sx * sa * cb;
    var a12 = sx * sb;
    var a21 = p * sa * sb - sy * sa * cb;
    var a22 = p * cb + sy * sb;

    var det = a11 * a22 - a12 * a21;
    if (!isFinite(det) || Math.abs(det) < 1e-6) return null;

    var b1 = sx * p;
    var b2 = sy * p;
    return {
      x: (b1 * a22 - a12 * b2) / det,
      y: (a11 * b2 - b1 * a21) / det
    };
  }

  function readConfig(el) {
    var cfg = {};
    try { cfg = JSON.parse(el.getAttribute('data-pg-config') || '{}') || {}; } catch (e) { /* ignore */ }
    return cfg;
  }

  function paletteFrom(cfg) {
    var colors = [];
    var cp = cfg.colors;
    var isNum = function (v) { return typeof v === 'number' && isFinite(v) && !isNaN(parseFloat(v)); };
    var paletteCount = cp && isNum(cp.paletteCount) ? Math.max(1, Math.min(10, Math.round(cp.paletteCount))) : 6;
    for (var i = 1; i <= paletteCount; i++) {
      var v = cp && cp['color' + i];
      if (typeof v === 'string' && v.trim().length > 0) colors.push(v.trim());
    }
    if (colors.length === 0) colors = DEFAULT_COLORS.slice(0, paletteCount);
    return colors;
  }

  function init(root, cfgOverride) {
    if (!root || root.getAttribute('data-pg-inited')) return null;
    var cfg = {};
    var base = readConfig(root);
    var i;
    for (i in base) cfg[i] = base[i];
    if (cfgOverride) for (i in cfgOverride) cfg[i] = cfgOverride[i];

    var boxSize = Math.max(4, (+cfg.boxSize || 40));
    var borderW = cfg.borderWidth === undefined ? 2 : (+cfg.borderWidth || 0);
    var borderC = cfg.borderColor || 'rgba(255,255,255,0.2)';
    var rot = cfg.rotate || {};
    var ry = (+rot.y || 0), rx = (+rot.x || 0);
    var colors = paletteFrom(cfg);
    var getColor = function () {
      return colors[Math.floor(Math.random() * colors.length)];
    };

    function build() {
      var old = root.querySelector('.pg-persp');
      if (old) old.remove();

      var w = root.clientWidth || root.offsetWidth || 1;
      var h = root.clientHeight || root.offsetHeight || 1;
      var cols = Math.max(1, Math.ceil(w / boxSize));
      var rows = Math.max(1, Math.ceil(h / boxSize));

      var persp = document.createElement('div');
      persp.className = 'pg-persp';

      var plane = document.createElement('div');
      plane.className = 'pg-plane';
      plane.style.width = cols * boxSize + 'px';
      plane.style.height = rows * boxSize + 'px';
      plane.style.setProperty('--pg-ry', ry + 'deg');
      plane.style.setProperty('--pg-rx', rx + 'deg');

      var borderStr = borderW ? borderW + 'px solid ' + borderC : 'none';
      var r, c;
      for (r = 0; r < rows; r++) {
        var row = document.createElement('div');
        row.className = 'pg-row';
        row.style.borderLeft = borderStr;
        if (r === rows - 1) row.style.borderBottom = borderStr;
        for (c = 0; c < cols; c++) {
          var cell = document.createElement('div');
          cell.className = 'pg-cell';
          cell.style.borderTop = borderStr;
          cell.style.borderRight = borderStr;
          row.appendChild(cell);
        }
        plane.appendChild(row);
      }

var glow = document.createElement('div');
      glow.className = 'pg-glow';
      glow.style.width = boxSize + 'px';
      glow.style.height = boxSize + 'px';
      plane.appendChild(glow);

      persp.appendChild(plane);
      root.appendChild(persp);
      root.__pg = { cols: cols, rows: rows, boxSize: boxSize, plane: plane, glow: glow, getColor: getColor, current: null };
    }

    build();

    var rebuildT;
    function onResize() {
      var w = root.clientWidth || root.offsetWidth || 1;
      var h = root.clientHeight || root.offsetHeight || 1;
      var cols = Math.max(1, Math.ceil(w / boxSize));
      var rows = Math.max(1, Math.ceil(h / boxSize));
      if (!root.__pg || root.__pg.cols !== cols || root.__pg.rows !== rows) {
        clearTimeout(rebuildT);
        rebuildT = setTimeout(build, 120);
      }
    }

    function fadeOut(g) {
      if (!g || !g.parentNode) return;
      g.style.opacity = '0';
      setTimeout(function () {
        if (g.parentNode) g.parentNode.removeChild(g);
      }, 1050);
    }

    function onPointerMove(e) {
      var meta = root.__pg;
      if (!meta) return;
      var rect = root.getBoundingClientRect();
      var sx = e.clientX - rect.left - rect.width / 2;
      var sy = e.clientY - rect.top - rect.height / 2;

      var pt = screenToPlane(sx, sy, ry, rx);
      if (!pt) return;

      var gridW = meta.cols * meta.boxSize;
      var gridH = meta.rows * meta.boxSize;
      var col = Math.floor((pt.x + gridW / 2) / meta.boxSize);
      var row = Math.floor((pt.y + gridH / 2) / meta.boxSize);
      if (col < 0 || col >= meta.cols || row < 0 || row >= meta.rows) return;

      var key = row * meta.cols + col;
      if (meta.current && meta.current.__key === key) return;

      var g = document.createElement('div');
      g.className = 'pg-glow';
      g.__key = key;
      g.style.width = meta.boxSize + 'px';
      g.style.height = meta.boxSize + 'px';
      g.style.left = col * meta.boxSize + 'px';
      g.style.top = row * meta.boxSize + 'px';
      g.style.backgroundColor = meta.getColor();
      g.style.opacity = '1';
      meta.plane.appendChild(g);

      if (meta.current) fadeOut(meta.current);
      meta.current = g;
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('resize', onResize);

    root.setAttribute('data-pg-inited', '1');
    return {
      destroy: function () {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onPointerMove);
      }
    };
  }

  function initAll() {
    var els = document.querySelectorAll('.pg-root');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.RIZZPrismGrid = { init: init, initAll: initAll };
})();