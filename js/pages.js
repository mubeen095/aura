/* ============================================================
   RIZZ — pages.js
   Shared page behaviours (Creators + Register + Brands + Marketing):
   appbar, reveals, marquee, countup, accordion categories,
   timeline tabs, sport selector, year, optional QA self-check.
   ============================================================ */
(function (window, document) {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- appbar slide-in after initial scroll ---- */
  function initAppbar() {
    var scrolled = window.scrollY > 24;
    document.body.classList.toggle('appbar-in', scrolled);
    window.addEventListener('scroll', function () {
      var now = window.scrollY > 24;
      if (now !== scrolled) {
        scrolled = now;
        document.body.classList.toggle('appbar-in', scrolled);
      }
    }, { passive: true });
  }

  /* ---- reveal on scroll ---- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- number count-up ---- */
  function initCountup() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    if (reduceMotion) {
      els.forEach(function (el) {
        el.textContent = el.getAttribute('data-count');
        el.classList.add('counted');
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var dur = 1400;
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- accordion categories (events page) ---- */
  function initAccordion() {
    document.querySelectorAll('[data-accordion]').forEach(function (root) {
      root.querySelectorAll('.cat-item').forEach(function (item) {
        var btn = item.querySelector('.cat-head');
        if (!btn) return;
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', function () {
          var open = item.classList.contains('open');
          root.querySelectorAll('.cat-item.open').forEach(function (o) {
            o.classList.remove('open');
            var ob = o.querySelector('.cat-head');
            if (ob) ob.setAttribute('aria-expanded', 'false');
          });
          if (!open) {
            item.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      });
    });
  }

  /* ---- static faq accordion (faqs page) ---- */
  function initFaqAccordion() {
    document.querySelectorAll('.faq-item').forEach(function (item) {
      var btn = item.querySelector('.faq-q');
      if (!btn || btn.getAttribute('data-wired')) return;
      btn.setAttribute('data-wired', '1');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        item.classList.toggle('open');
        btn.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
      });
    });
  }

  /* ---- timeline day tabs ---- */
  function initTimeline() {
    document.querySelectorAll('[data-timeline]').forEach(function (root) {
      var tabs = root.querySelectorAll('.day-tab');
      var panels = root.querySelectorAll('.day-panel');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          tabs.forEach(function (t) { t.classList.remove('active'); });
          panels.forEach(function (p) { p.classList.remove('active'); });
          tab.classList.add('active');
          var panel = root.querySelector('.day-panel[data-day="' + tab.getAttribute('data-day') + '"]');
          if (panel) panel.classList.add('active');
        });
      });
      if (tabs.length > 0) tabs[0].click();
    });
  }

  /* ---- sport selector ---- */
  function initSportSelector() {
    document.querySelectorAll('[data-sports]').forEach(function (root) {
      var cards = root.querySelectorAll('.sport-card');
      var out = root.querySelector('[data-sport-out]');
      var name = root.querySelector('[data-sport-name]');
      var note = root.querySelector('[data-sport-note]');
      cards.forEach(function (card) {
        card.addEventListener('click', function () {
          cards.forEach(function (c) { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
          card.classList.add('active');
          card.setAttribute('aria-pressed', 'true');
          if (name) name.textContent = card.getAttribute('data-sport');
          if (note) {
            if (card.getAttribute('data-sport') === 'More sports') {
              note.textContent = 'More sports to be announced.';
            } else {
              note.textContent = 'Represent your college. Compete nationally. Take the championship home.';
            }
          }
          if (out) {
            out.classList.remove('in');
            void out.offsetWidth;
            out.classList.add('in');
          }
        });
      });
    });
  }

  /* ---- footer year ---- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---- QA self check (only when ?qa) ---- */
  function runQA() {
    if (window.location.search.indexOf('qa') === -1) return;
    var doc = document.documentElement;
    var overflow = doc.scrollWidth > window.innerWidth + 1;
    var errors = [];
    document.querySelectorAll('img').forEach(function (img) {
      if (img.complete && img.naturalWidth === 0 && !img.hasAttribute('data-ignore')) errors.push('img:' + img.alt);
    });
    var links = [];
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || h.indexOf('mailto:') === 0 || h.indexOf('#') === 0 || h.indexOf('http') === 0) return;
      if (h.indexOf('.html') === -1 && h !== '/') return;
      links.push(h.split('#')[0]);
    });
    document.body.setAttribute('data-qa', JSON.stringify({
      overflow: overflow,
      vw: window.innerWidth,
      sw: doc.scrollWidth,
      imgs: errors,
      links: links
    }));
  }

  /* ---- mobile hamburger menu / sidebar drawer ---- */
  function initMobileMenu() {
    var btn = document.querySelector('.app-menu');
    if (!btn) return;
    var drawer = document.querySelector('.sidebar') || document.querySelector('.app-nav');
    if (!drawer) return;
    var backdrop = document.createElement('div');
    backdrop.className = 'side-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
    var close = function () {
      document.body.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    };
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (document.body.classList.contains('nav-open')) close();
      else { document.body.classList.add('nav-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
    backdrop.addEventListener('click', close);
    drawer.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('a')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAppbar();
    initReveal();
    initCountup();
    initAccordion();
    initFaqAccordion();
    initTimeline();
    initSportSelector();
    initYear();
    initMobileMenu();
    runQA();
  });
})(window, document);