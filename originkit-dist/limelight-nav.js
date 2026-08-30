/* ================================================================
   limelight-nav — vanilla port of the "LimelightNav" component.
   Slides the limelight indicator under the active item; active state
   follows the current URL pathname (same rule as the social dock).
   window.RIZZLimelightNav.init(nav) / initAll()
   ================================================================ */
(function () {
  'use strict';

  function resolvePath(href) {
    var a = document.createElement('a');
    a.href = href;
    return a.pathname;
  }

  function init(nav) {
    if (!nav || nav.getAttribute('data-limelight-inited')) return null;
    var items = Array.prototype.slice.call(nav.querySelectorAll('.limelight-item'));
    var indicator = nav.querySelector('[data-limelight-indicator]');
    if (!indicator) return null;

    var ready = false;
    var readyTimer = null;

    function normPath(p) {
      return p.replace(/\/?index\.html$/, '').replace(/\/+$/, '') || '/';
    }

    function activeItem() {
      var path = normPath(document.location.pathname);
      for (var i = 0; i < items.length; i++) {
        if (normPath(resolvePath(items[i].getAttribute('href'))) === path) return items[i];
      }
      return null;
    }

    function position(active) {
      var left = active.offsetLeft + active.offsetWidth / 2 - indicator.offsetWidth / 2;
      indicator.style.left = left + 'px';
    }

    function place(animate) {
      var active = activeItem();
      if (!active) return;
      if (!animate) nav.classList.remove('is-ready');
      position(active);
      if (animate) nav.classList.add('is-ready');
    }

    function applyActive() {
      var active = activeItem();
      for (var i = 0; i < items.length; i++) {
        var on = items[i] === active;
        items[i].classList.toggle('is-active', on);
        if (on) items[i].setAttribute('aria-current', 'page');
        else items[i].removeAttribute('aria-current');
      }
      if (!active) {
        indicator.style.left = '-999px';
        return;
      }
      // First placement is instant, then enable the slide transition.
      if (!ready) {
        clearTimeout(readyTimer);
        position(active);
        readyTimer = setTimeout(function () {
          ready = true;
          nav.classList.add('is-ready');
        }, 50);
      } else {
        position(active);
      }
    }

    applyActive();

    var resizeT = null;
    function onResize() {
      clearTimeout(resizeT);
      nav.classList.remove('is-ready');
      resizeT = setTimeout(function () {
        nav.classList.add('is-ready');
        var active = activeItem();
        if (active) position(active);
      }, 160);
    }
    window.addEventListener('resize', onResize);

    nav.setAttribute('data-limelight-inited', '1');
    return {
      destroy: function () {
        clearTimeout(readyTimer);
        clearTimeout(resizeT);
        window.removeEventListener('resize', onResize);
      }
    };
  }

  function initAll() {
    var navs = document.querySelectorAll('.limelight-nav');
    for (var i = 0; i < navs.length; i++) init(navs[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.RIZZLimelightNav = { init: init, initAll: initAll };
})();