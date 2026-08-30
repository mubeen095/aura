/* ============================================================
   RIZZ — brand.js
   Applies brand details from RIZZ_CONFIG to the current page:
   - stamps the [COMPANY NAME] token (future-proofing)
   - fills contact / social slots from config, hides them if empty
   - fills the current year into [data-year] elements
   Load AFTER js/site-config.js. Safe to include on every page.
   ============================================================ */
(function () {
  'use strict';
  var cfg = window.RIZZ_CONFIG || {};
  var brand = cfg.brand || {};
  var contact = cfg.contact || {};
  var name = brand.name || 'RIZZ';

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    /* -- apply meta details ----------------------------------- */
    var apply = function (sel, attr, value) {
      if (!value) return;
      var el = document.querySelector(sel);
      if (el && !el.hasAttribute('data-static')) el.setAttribute(attr, value);
    };
    apply('meta[name="application-name"]', 'content', name);
    apply('meta[property="og:site_name"]', 'content', name);
    apply('meta[name="twitter:site"]', 'content', contact.socials.x ? '@' + contact.socials.x : '');

    /* -- stamp brand token across title and text nodes --------- */
    function stamp(text) {
      return text.split('[COMPANY NAME]').join(name);
    }
    if (document.title && document.title.indexOf('[COMPANY NAME]') !== -1) {
      document.title = stamp(document.title);
    }
    var metas = document.querySelectorAll('meta[content*="[COMPANY NAME]"]');
    Array.prototype.forEach.call(metas, function (m) {
      m.setAttribute('content', (m.getAttribute('content') || '').split('[COMPANY NAME]').join(name));
    });
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      if (n.nodeValue && n.nodeValue.indexOf('[COMPANY NAME]') !== -1) {
        n.nodeValue = stamp(n.nodeValue);
      }
    });

    /* -- contact + social slots -------------------------------- */
    function wireSlot(slot, value, asHref) {
      var el = document.querySelector('[data-contact="' + slot + '"]');
      if (!el) return;
      if (!value) {
        var parent = el.closest('[data-contact-block]');
        var item = parent || el.closest('li, .nav-link, [class*="link"], [class*="social"]');
        var block = el.closest('[data-contact-block]');
        if (block) { block.style.display = 'none'; }
        else if (item && item.parentElement && item !== el) { item.style.display = 'none'; }
        else { el.style.display = 'none'; }
        return;
      }
      if (asHref && (el.tagName === 'A')) {
        el.setAttribute('href', asHref === true ? value : asHref + value);
      }
      var label = el.getAttribute('data-contact-label');
      if (label) { el.textContent = value; }
      if (el.parentElement) el.parentElement.style.display = '';
    }
    wireSlot('email', contact.email, 'mailto:');
    wireSlot('phone', contact.phone, 'tel:+');

    ['youtube', 'linkedin', 'instagram', 'x'].forEach(function (net) {
      var el = document.querySelector('[data-social="' + net + '"]');
      if (!el) return;
      if (!contact.socials[net]) {
        var cage = el.closest('[data-contact-block], li, .social-wrap, [class*="social"]');
        (cage || el).style.display = 'none';
        return;
      }
      el.setAttribute('href', contact.socials[net]);
    });

    /* -- current year ------------------------------------------ */
    var yearEls = document.querySelectorAll('[data-year]');
    Array.prototype.forEach.call(yearEls, function (el) {
      el.textContent = new Date().getFullYear();
    });
  });
})();