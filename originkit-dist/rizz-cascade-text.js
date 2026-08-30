/* ================================================================
   rizz-cascade-text — vanilla port of Originkit "Cascade Text".
   Wraps every character of headings / subheadings in a span that,
   on hover, lifts (translateY) and fades out, 25ms apart per char.

   Gradient headings (color:transparent + background-clip:text) are
   handled specially: each char carries its own slice of the parent
   gradient (element-sized background + per-char offset), so the text
   is painted by the spans themselves and the cascade is visible on
   gradient headings too. Clipping-free — nothing can ever be cut.

   Targets: h1 (except .hero-title), h2, h3, .lead, .rz-sub,
   .subtitle-line. window.RIZZCascadeText = { init, initAll, reapply }
   ================================================================ */
(function () {
  'use strict';

  var SELECTOR = 'h1:not(.hero-title), h2, h3, .lead, .rz-sub, .subtitle-line';
  var STAGGER = 25;
  var gradients = [];

  function reduceMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function spread(text) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        var seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        return Array.from(seg.segment(text), function (m) { return m.segment; });
      } catch (e) { /* fall through */ }
    }
    return Array.from(text);
  }

  function isGradient(el) {
    var cs = getComputedStyle(el);
    return cs.webkitBackgroundClip === 'text' && cs.backgroundImage !== 'none';
  }

  function applyGradient(el) {
    if (!el._rizzGradient) {
      var bg = getComputedStyle(el).backgroundImage;
      if (bg === 'none') return;
      el._rizzGradient = bg;
    }
    stabilize(el, 40);
  }

  function measure(el) {
    var er = el.getBoundingClientRect();
    var chars = el.querySelectorAll('.rizz-cascade-char');
    var pts = [];
    var i, r;
    for (i = 0; i < chars.length; i++) {
      r = chars[i].getBoundingClientRect();
      pts.push([r.left - er.left, r.top - er.top]);
    }
    return { w: er.width, h: er.height, pts: pts };
  }

  function samePts(a, b) {
    if (!a || !b || a.pts.length !== b.pts.length) return false;
    for (var i = 0; i < a.pts.length; i++) {
      if (Math.abs(a.pts[i][0] - b.pts[i][0]) > 0.5 || Math.abs(a.pts[i][1] - b.pts[i][1]) > 0.5) return false;
    }
    return true;
  }

  function paint(el, m) {
    var chars = el.querySelectorAll('.rizz-cascade-char');
    var bg = el._rizzGradient;
    var i, ch;
    for (i = 0; i < chars.length; i++) {
      ch = chars[i];
      ch.style.backgroundImage = bg;
      ch.style.backgroundSize = m.w + 'px ' + m.h + 'px';
      ch.style.backgroundPosition = (-m.pts[i][0]) + 'px ' + (-m.pts[i][1]) + 'px';
      ch.style.backgroundRepeat = 'no-repeat';
      ch.style.backgroundOrigin = 'border-box';
      ch.style.backgroundClip = 'text';
      ch.style.webkitBackgroundClip = 'text';
      ch.style.color = 'transparent';
    }
    el.style.backgroundImage = 'none';
  }

  function stabilize(el, frames) {
    var m = measure(el);
    paint(el, m);
    if (frames <= 0) return;
    requestAnimationFrame(function () {
      var m2 = measure(el);
      if (!samePts(m, m2) || !el._rizzStable) {
        el._rizzStable = samePts(m, m2);
        stabilize(el, frames - 1);
      }
    });
  }

  function reapplyGradients() {
    var i;
    for (i = 0; i < gradients.length; i++) {
      if (gradients[i] && gradients[i].isConnected) {
        applyGradient(gradients[i]);
        setTimeout(function (el) { return function () { if (el.isConnected) applyGradient(el); }; }(gradients[i]), 1200);
      }
    }
  }

  function textNodesToFrag(src, dst, state) {
    var nodes = Array.prototype.slice.call(src.childNodes);
    var n, k, node, part, parts, el;
    for (n = 0; n < nodes.length; n++) {
      node = nodes[n];
      if (node.nodeType === 3) {
        parts = node.textContent.split(/(\s+)/);
        for (k = 0; k < parts.length; k++) {
          part = parts[k];
          if (part.length === 0) continue;
          if (/^\s+$/.test(part)) {
            dst.appendChild(document.createTextNode(' '));
          } else {
            dst.appendChild(makeWord(part, state));
          }
        }
      } else if (node.nodeType === 1) {
        if (node.tagName === 'BR') {
          dst.appendChild(node.cloneNode(true));
          continue;
        }
        el = node.cloneNode(false);
        textNodesToFrag(node, el, state);
        dst.appendChild(el);
      }
    }
    return dst;
  }

  function makeWord(word, state) {
    var chars = spread(word);
    var frag = document.createDocumentFragment();
    var i, ch;
    for (i = 0; i < chars.length; i++) {
      ch = document.createElement('span');
      ch.className = 'rizz-cascade-char';
      ch.textContent = chars[i];
      ch.style.transitionDelay = (state.i * STAGGER) + 'ms';
      frag.appendChild(ch);
      state.i++;
    }
    return frag;
  }

  function init(el) {
    if (!el || el.getAttribute('data-rizz-cascade') === '1') return;
    el.setAttribute('data-rizz-cascade', '1');
    if (reduceMotion()) return;
    el.classList.add('rizz-cascade-text');
    var state = { i: 0 };
    var frag = document.createDocumentFragment();
    textNodesToFrag(el, frag, state);
    el.textContent = '';
    el.appendChild(frag);
    if (isGradient(el)) {
      applyGradient(el);
      gradients.push(el);
    }
    el.addEventListener('mouseenter', function () { el.classList.add('rizz-cascade-hover'); });
    el.addEventListener('mouseleave', function () { el.classList.remove('rizz-cascade-hover'); });
  }

  function initAll() {
    if (reduceMotion()) return;
    var els = document.querySelectorAll(SELECTOR);
    var i;
    for (i = 0; i < els.length; i++) init(els[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(reapplyGradients);
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reapplyGradients, 120);
  });
  window.addEventListener('load', function () {
    setTimeout(reapplyGradients, 150);
  });

  window.RIZZCascadeText = { init: init, initAll: initAll, reapply: reapplyGradients };
})();