/* ================================================================
   rizz-footer-02 — vanilla port of Originkit "Footer 02" (Notrix
   tetris footer). The signature decorative element is a self-playing
   canvas Tetris board that packs a stack of cream pixels along the
   footer's bottom edge. Pure canvas + rAF — no React at runtime.

   Usage:
     <canvas class="fx-tetris-canvas"></canvas> inside the footer.
   window.RIZZFooter02.Tetris.init(canvas[, cfg])
   ================================================================ */
(function () {
  'use strict';

  var FALLBACK_COLORS = ['#F9731A', '#FFFFFF'];
  var CLEAR_BLINKS = 2;
  var BLINK_MS = 90;

  var SHAPES = [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]]
  ];

  var DEFAULT_CFG = {
    boardColor: '#212121',
    colors: ['#FDF9ED'],
    movement: 2,
    cellSize: 20,
    gap: 0,
    rounded: 20,
    dropSpeed: 1,
    startFilled: true
  };

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function parseColor(color) {
    var value = (color || '').trim();
    var hex = value.replace('#', '');
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        1
      ];
    }
    var m = value.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      var parts = m[1].split(',').map(function (p) { return parseFloat(p); });
      return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] === undefined ? 1 : parts[3]];
    }
    return [255, 255, 255, 1];
  }

  function rgba(c, alpha) {
    return 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + (c[3] * alpha) + ')';
  }

  function init(canvas, cfgOverride) {
    if (!canvas || canvas.getAttribute('data-tetris-inited')) return null;
    var cfg = {};
    var k;
    for (k in DEFAULT_CFG) cfg[k] = DEFAULT_CFG[k];
    if (cfgOverride) for (k in cfgOverride) if (cfgOverride[k] !== undefined) cfg[k] = cfgOverride[k];

    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.setAttribute('data-tetris-inited', '1');

    var boardRGB = parseColor(cfg.boardColor);
    var source = cfg.colors && cfg.colors.length ? cfg.colors : FALLBACK_COLORS;
    var blockRGB = source.map(parseColor);

    var rand = mulberry32(0x7e7415);
    var pitch = cfg.cellSize + cfg.gap;
    var dropEvery = 1000 / Math.max(1, cfg.dropSpeed * 4);
    var wander = Math.min(10, Math.max(0, cfg.movement)) / 10;

    var alive = true;
    var raf = 0;
    var last = 0;
    var dropAcc = 0;
    var dpr = 1;
    var cols = 0;
    var rows = 0;
    var cellW = 0;
    var cellH = 0;
    var pitchX = 0;
    var pitchY = 0;
    var cellRadius = 0;
    var grid = [];
    var piece = null;
    var clearing = [];
    var clearMs = 0;

    function at(col, row) { return grid[row * cols + col]; }

    function rotate(shape, turns) {
      var cells = SHAPES[shape].map(function (c) { return [c[0], c[1]]; });
      var t, i;
      for (t = 0; t < turns; t++) {
        var maxRow = 0;
        for (i = 0; i < cells.length; i++) maxRow = Math.max(maxRow, cells[i][1]);
        cells = cells.map(function (c) { return [maxRow - c[1], c[0]]; });
      }
      var minC = Infinity, minR = Infinity;
      for (i = 0; i < cells.length; i++) {
        minC = Math.min(minC, cells[i][0]);
        minR = Math.min(minR, cells[i][1]);
      }
      return cells.map(function (c) { return [c[0] - minC, c[1] - minR]; });
    }

    function fits(cells, col, row) {
      for (var i = 0; i < cells.length; i++) {
        var gc = col + cells[i][0];
        var gr = row + cells[i][1];
        if (gc < 0 || gc >= cols || gr >= rows) return false;
        if (gr >= 0 && at(gc, gr) !== -1) return false;
      }
      return true;
    }

    function landing(cells, col) {
      if (!fits(cells, col, 0)) return -1;
      var row = 0;
      while (fits(cells, col, row + 1)) row++;
      return row;
    }

    function score(cells, col, row) {
      var test = grid.slice();
      var c, r, i;
      for (i = 0; i < cells.length; i++) {
        c = cells[i][0];
        r = cells[i][1];
        var gr = row + r;
        if (gr >= 0) test[gr * cols + (col + c)] = 1;
      }
      var lines = 0;
      for (r = 0; r < rows; r++) {
        var full = true;
        for (c = 0; c < cols; c++) {
          if (test[r * cols + c] === -1) { full = false; break; }
        }
        if (full) lines++;
      }
      var aggHeight = 0, holes = 0, bump = 0, prevTop = -1;
      for (c = 0; c < cols; c++) {
        var top = rows;
        for (r = 0; r < rows; r++) {
          if (test[r * cols + c] !== -1) { top = r; break; }
        }
        var height = rows - top;
        aggHeight += height;
        for (r = top + 1; r < rows; r++) {
          if (test[r * cols + c] === -1) holes++;
        }
        if (prevTop >= 0) bump += Math.abs(top - prevTop);
        prevTop = top;
      }
      return lines * 4.0 - aggHeight * 0.5 - holes * 3.5 - bump * 0.3;
    }

    function spawn() {
      var shape = Math.floor(rand() * SHAPES.length);
      var bestCells = null;
      var bestCol = 0, bestRow = 0, bestScore = -Infinity;
      var turn, col, i;
      for (turn = 0; turn < 4; turn++) {
        var cells = rotate(shape, turn);
        var width = 0;
        for (i = 0; i < cells.length; i++) width = Math.max(width, cells[i][0]);
        for (col = 0; col + width < cols; col++) {
          var row = landing(cells, col);
          if (row < 0) continue;
          var s = score(cells, col, row);
          if (s > bestScore) {
            bestScore = s;
            bestCells = cells;
            bestCol = col;
            bestRow = row;
          }
        }
      }
      if (!bestCells) {
        grid = new Array(cols * rows).fill(-1);
        piece = null;
        return;
      }
      var startRow = 0;
      var w = 0;
      for (i = 0; i < bestCells.length; i++) {
        startRow = Math.max(startRow, bestCells[i][1]);
        w = Math.max(w, bestCells[i][0]);
      }
      startRow = -1 - startRow;
      var maxCol = cols - 1 - w;
      var swing = Math.round((rand() * 2 - 1) * wander * cols);
      var startCol = Math.min(maxCol, Math.max(0, bestCol + swing));
      var color = blockRGB.length > 1 ? Math.floor(rand() * blockRGB.length) : 0;
      piece = {
        shape: shape,
        cells: bestCells,
        color: color,
        col: startCol,
        row: startRow,
        startCol: startCol,
        startRow: startRow,
        targetCol: bestCol,
        targetRow: bestRow
      };
    }

    function lock() {
      if (!piece) return;
      var i, c, r;
      for (i = 0; i < piece.cells.length; i++) {
        c = piece.cells[i][0];
        r = piece.cells[i][1];
        var gr = piece.row + r;
        var gc = piece.col + c;
        if (gr >= 0 && gr < rows && gc >= 0 && gc < cols) {
          grid[gr * cols + gc] = piece.color;
        }
      }
      piece = null;
      var full = [];
      for (r = 0; r < rows; r++) {
        var solid = true;
        for (c = 0; c < cols; c++) {
          if (grid[r * cols + c] === -1) { solid = false; break; }
        }
        if (solid) full.push(r);
      }
      if (full.length) {
        clearing = full;
        clearMs = CLEAR_BLINKS * BLINK_MS * 2;
      }
    }

    function collapse() {
      var gone = {};
      var i;
      for (i = 0; i < clearing.length; i++) gone[clearing[i]] = true;
      var next = new Array(cols * rows).fill(-1);
      var write = rows - 1;
      var r, c;
      for (r = rows - 1; r >= 0; r--) {
        if (gone[r]) continue;
        for (c = 0; c < cols; c++) {
          next[write * cols + c] = grid[r * cols + c];
        }
        write--;
      }
      grid = next;
      clearing = [];
    }

    function scatterInitialStack() {
      var limit = 8;
      var ceiling = Math.max(0, rows - limit);
      var guard = cols * rows;
      while (guard-- > 0) {
        var shape = Math.floor(rand() * SHAPES.length);
        var imperfect = rand() < 0.15;
        var bestCells = null;
        var bestCol = 0, bestRow = 0, bestScore = -Infinity;
        var options = [];
        var turn, col, i;
        for (turn = 0; turn < 4; turn++) {
          var cells = rotate(shape, turn);
          var width = 0;
          for (i = 0; i < cells.length; i++) width = Math.max(width, cells[i][0]);
          for (col = 0; col + width < cols; col++) {
            var row = landing(cells, col);
            if (row < 0) continue;
            var top = rows;
            for (i = 0; i < cells.length; i++) top = Math.min(top, row + cells[i][1]);
            if (top < ceiling) continue;
            options.push({ cells: cells, col: col, row: row });
            var s = score(cells, col, row);
            if (s > bestScore) {
              bestScore = s;
              bestCells = cells;
              bestCol = col;
              bestRow = row;
            }
          }
        }
        if (!bestCells) break;
        var chosen = imperfect && options.length > 1
          ? options[Math.floor(rand() * options.length)]
          : { cells: bestCells, col: bestCol, row: bestRow };
        var color = blockRGB.length > 1 ? Math.floor(rand() * blockRGB.length) : 0;
        for (i = 0; i < chosen.cells.length; i++) {
          grid[(chosen.row + chosen.cells[i][1]) * cols + (chosen.col + chosen.cells[i][0])] = color;
        }
        var full = [];
        var r, c;
        for (r = 0; r < rows; r++) {
          var solid = true;
          for (c = 0; c < cols; c++) {
            if (grid[r * cols + c] === -1) { solid = false; break; }
          }
          if (solid) full.push(r);
        }
        if (full.length) {
          var gone = {};
          for (i = 0; i < full.length; i++) gone[full[i]] = true;
          var next = new Array(cols * rows).fill(-1);
          var write = rows - 1;
          for (r = rows - 1; r >= 0; r--) {
            if (gone[r]) continue;
            for (c = 0; c < cols; c++) {
              next[write * cols + c] = grid[r * cols + c];
            }
            write--;
          }
          grid = next;
        }
      }
    }

    function build() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = Math.max(1, Math.round(canvas.clientWidth));
      var h = Math.max(1, Math.round(canvas.clientHeight));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(4, Math.floor((w + cfg.gap) / pitch));
      rows = Math.max(6, Math.floor((h + cfg.gap) / pitch));
      cellW = Math.max(1, (w - cfg.gap * (cols - 1)) / cols);
      cellH = Math.max(1, (h - cfg.gap * (rows - 1)) / rows);
      pitchX = cellW + cfg.gap;
      pitchY = cellH + cfg.gap;
      cellRadius = (Math.min(cellW, cellH) / 2) * (Math.min(20, Math.max(0, cfg.rounded)) / 20);
      grid = new Array(cols * rows).fill(-1);
      piece = null;
      clearing = [];
      clearMs = 0;
      if (cfg.startFilled) scatterInitialStack();
      spawn();
    }

    function tilePath(col, row) {
      var x = col * pitchX;
      var y = row * pitchY;
      if (cellRadius > 0 && typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, cellW, cellH, cellRadius);
      } else {
        ctx.rect(x, y, cellW, cellH);
      }
    }

    function colorFor(index) {
      return blockRGB[index] || blockRGB[0];
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.beginPath();
      var r, c;
      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) tilePath(c, r);
      }
      ctx.fillStyle = rgba(boardRGB, 1);
      ctx.fill();

      var flashing = {};
      var i;
      for (i = 0; i < clearing.length; i++) flashing[clearing[i]] = true;
      var lit = clearMs > 0 && Math.floor(clearMs / BLINK_MS) % 2 === 0;

      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
          var color = grid[r * cols + c];
          if (color === -1) continue;
          ctx.beginPath();
          tilePath(c, r);
          ctx.fillStyle = flashing[r] && lit ? 'rgba(255, 255, 255, 0.95)' : rgba(colorFor(color), 1);
          ctx.fill();
        }
      }

      if (piece) {
        ctx.fillStyle = rgba(colorFor(piece.color), 1);
        for (i = 0; i < piece.cells.length; i++) {
          var gr = piece.row + piece.cells[i][1];
          if (gr < 0) continue;
          ctx.beginPath();
          tilePath(piece.col + piece.cells[i][0], gr);
          ctx.fill();
        }
      }
    }

    function loop(time) {
      if (!alive) return;
      var dt = last ? Math.min(time - last, 200) : 0;
      last = time;

      if (clearMs > 0) {
        clearMs -= dt;
        if (clearMs <= 0) {
          clearMs = 0;
          collapse();
          spawn();
        }
        draw();
        raf = requestAnimationFrame(loop);
        return;
      }

      if (piece) {
        dropAcc += dt;
        while (dropAcc >= dropEvery && piece) {
          dropAcc -= dropEvery;
          if (piece.row < piece.targetRow) {
            piece.row++;
            var span = piece.targetRow - piece.startRow;
            var prog = span > 0 ? (piece.row - piece.startRow) / span : 1;
            piece.col = Math.round(piece.startCol + (piece.targetCol - piece.startCol) * prog);
          } else {
            piece.col = piece.targetCol;
            lock();
          }
        }
      } else {
        spawn();
      }

      draw();
      raf = requestAnimationFrame(loop);
    }

    build();

    var built = canvas.clientWidth + 'x' + canvas.clientHeight;
    var ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(function () {
        var size = canvas.clientWidth + 'x' + canvas.clientHeight;
        if (size === built) return;
        built = size;
        build();
      });
      ro.observe(canvas);
    }

    raf = requestAnimationFrame(loop);

    return {
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
      }
    };
  }

  function initAll() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var els = document.querySelectorAll('.fx-tetris-canvas');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.RIZZFooter02 = { Tetris: { init: init }, initAll: initAll };
})();