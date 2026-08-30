/* ================================================================
   social-dock.js — shared floating nav dock for every page.
   Desktop: left pill rail with page icons (reveal name on first click,
   navigate on second). Mobile: floating FAB that fans out the same links.
   Also renders the background-boxes grid when a .boxes-bg element exists.
   ================================================================ */
(function () {
  'use strict';

  var ICONS = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    creators: '<circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    brands: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    marketing: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    faqs: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'
  };
  var LINKS = [
    { page: 'home', href: '/', label: 'HOME' },
    { page: 'creators', href: '/creators.html', label: 'CREATORS' },
    { page: 'brands', href: '/brands.html', label: 'BRANDS' },
    { page: 'marketing', href: '/marketing.html', label: 'MARKETING' },
    { page: 'faqs', href: '/faqs/index.html', label: 'FAQs' }
  ];

  function svg(body) {
    return '<svg class="sd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  /* ---- shared markup (same as index.html) ---- */
  function buildDock() {
    var list = LINKS.map(function (l) {
      return '<li><a class="sd-link sd--nav" href="' + l.href + '"><span class="sd-label">' + l.label + '</span>' + svg(ICONS[l.page]) + '</a></li>';
    }).join('');
    var fan = LINKS.map(function (l) {
      return '<a class="sd-fab-item sd--nav" href="' + l.href + '" aria-label="' + l.label + '"><span class="sd-tip">' + l.label + '</span>' + svg(ICONS[l.page]) + '</a>';
    }).join('');
    return (
      '<nav class="social-dock" aria-label="Primary"><ul class="social-dock-list">' + list + '</ul></nav>' +
      '<div class="social-floating" id="social-floating">' +
      '  <div class="sd-backdrop" aria-hidden="true"></div>' +
      '  <div class="sd-dock">' + fan + '</div>' +
      '  <button class="sd-fab" id="sd-fab" type="button" aria-label="Toggle menu" aria-expanded="false">' +
      '    <svg class="sd-ico-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
      '    <svg class="sd-ico-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '  </button>' +
      '</div>'
    );
  }

  function wireSocialDock() {
    var floating = document.getElementById('social-floating');
    var fab = document.getElementById('sd-fab');
    var dockLinks = document.querySelectorAll('.sd-link, .sd-fab-item');

    if (!document.querySelector('.social-dock') && document.body) {
      var el = document.createElement('div');
      el.innerHTML = buildDock();
      while (el.firstChild) document.body.insertBefore(el.firstChild, document.body.firstChild);
      floating = document.getElementById('social-floating');
      fab = document.getElementById('sd-fab');
      dockLinks = document.querySelectorAll('.sd-link, .sd-fab-item');
    }

    if (!floating || !fab) return;

    function openDock() {
      floating.classList.add('open');
      fab.setAttribute('aria-expanded', 'true');
    }
    function closeDock() {
      floating.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      dockLinks.forEach(function (l) { l.classList.remove('is-open'); });
    }
    fab.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (floating.classList.contains('open')) closeDock();
      else openDock();
    });
    var backdrop = floating.querySelector('.sd-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeDock);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeDock();
    });

    dockLinks.forEach(function (link) {
      link.addEventListener('click', function (ev) {
        if (link.classList.contains('is-open')) return;
        ev.preventDefault();
        dockLinks.forEach(function (l) { if (l !== link) l.classList.remove('is-open'); });
        link.classList.add('is-open');
      });
    });

    highlightCurrent(dockLinks);
  }

  function norm(p) { return (p || '').replace(/\/+$/, ''); }
  function highlightCurrent(dockLinks) {
    var cur = norm(location.pathname);
    dockLinks.forEach(function (a) {
      var t = norm((a.getAttribute('href') || '').split('#')[0]);
      var on = t === cur || (cur === '/' && t === '/index.html') || t === cur + '.html' || t === cur.replace(/\.html$/, '');
      if (on) { a.classList.add('on'); a.setAttribute('aria-current', 'page'); }
    });
  }

  /* ---- background boxes (port of background-boxes.tsx) ---- */
  function renderBoxes() {
    var host = document.querySelector('.boxes-bg');
    if (!host || host.querySelector('.bx-grid')) return;
    var mobile = window.innerWidth < 900;
    var rows = mobile ? 120 : 150;
    var cols = mobile ? 60 : 100;
    var colors = [
      '#7dd3fc', '#f9a8d4', '#86efac', '#fde047', '#fca5a5',
      '#d8b4fe', '#93c5fd', '#a5b4fc', '#c4b5fd'
    ];
    var grid = document.createElement('div');
    grid.className = 'bx-grid';
    var frag = document.createDocumentFragment();
    var cross = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="bx-cross" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6"/></svg>';
    for (var i = 0; i < rows; i++) {
      var row = document.createElement('div');
      row.className = 'bx-row';
      for (var j = 0; j < cols; j++) {
        var cell = document.createElement('div');
        cell.className = 'bx-cell';
        cell.style.setProperty('--c', colors[(i * 7 + j * 13) % colors.length]);
        if (j % 2 === 0 && i % 2 === 0) {
          cell.innerHTML = cross;
        }
        row.appendChild(cell);
      }
      frag.appendChild(row);
    }
    grid.appendChild(frag);
    host.appendChild(grid);
  }

  function init() {
    wireSocialDock();
    renderBoxes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();