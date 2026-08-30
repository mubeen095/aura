/* ============================================================
   RIZZ — register.js
   Creator application wizard.
   01 PERSONAL & PLATFORMS -> 02 CREATOR PROFILE -> 03 REVIEW -> 04 COMPLETE
   ============================================================ */
(function (window, document) {
  'use strict';

  var CFG = window.RIZZ_CONFIG || {};
  var Svc = window.RIZZRegistration;

  var state = {
    step: 1,
    data: {
      profile: {
        fullName: '', email: '', phone: '', city: '', category: '', languages: [],
        handles: { instagram: '', youtube: '', other: '' }
      },
      metrics: {
        followersInstagram: '', followersYoutube: '', followersOther: '', avgViews: '',
        postingFrequency: '', audienceLocation: [], audienceAge: [], audienceGender: [],
        pastCollabs: '', portfolioUrl: '', whyJoin: ''
      }
    },
    submitted: null
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function show(elm) { if (elm) elm.style.display = ''; }
  function hide(elm) { if (elm) elm.style.display = 'none'; }

  /* ---------------- step navigation ---------------- */
  function setStep(n, opts) {
    opts = opts || {};
    state.step = n;
    $$('.step-panel').forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-step') === String(n)); });
    $$('.step-dot').forEach(function (d) {
      var s = parseInt(d.getAttribute('data-step'), 10);
      d.classList.toggle('active', s === n);
      d.classList.toggle('done', s < n);
    });

    if (n === 3) renderReview();
    if (n === 4) renderSuccess();

    var nav = $('.wizard-nav');
    var next = $('#nextBtn');
    var submit = $('#submitBtn');
    if (n === 1) { show(next); hide(submit); next.textContent = 'CONTINUE — PLATFORMS'; show(nav); }
    else if (n === 2) { show(next); hide(submit); next.textContent = 'CONTINUE — REVIEW'; show(nav); }
    else if (n === 3) { hide(next); show(submit); show(nav); }
    else if (n === 4) { hide(nav); }

    window.scrollTo({ top: 0, behavior: 'auto' });
    var focusEl = $('.step-panel.active [data-autofocus]');
    if (focusEl) focusEl.focus();
    if (!opts.silent) Svc && Svc.track('registration_step_completed', { step: n });
  }

  /* ---------------- chips ---------------- */
  function bindChips() {
    $$('[data-chiprow]').forEach(function (row) {
      row.addEventListener('click', function (e) {
        var el = e.target;
        if (!el || el.tagName !== 'BUTTON' || !el.getAttribute('data-chip')) return;
        var path = row.getAttribute('data-chiprow').split('.');
        var multi = row.getAttribute('data-multi') !== 'false';
        var v = el.getAttribute('data-chip');
        var ref = state.data;
        var i;
        for (i = 0; i < path.length - 1; i++) ref = ref[path[i]];
        var key = path[path.length - 1];
        var list = ref[key] = ref[key] || [];
        if (multi) {
          var idx = list.indexOf(v);
          if (idx === -1) list.push(v); else list.splice(idx, 1);
        } else {
          list = [v];
          ref[key] = list;
        }
        row.querySelectorAll('[data-chip]').forEach(function (b) {
          var on = list.indexOf(b.getAttribute('data-chip')) !== -1;
          b.classList.toggle('gold', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });
  }

  function syncChips() {
    $$('[data-chiprow]').forEach(function (row) {
      var path = row.getAttribute('data-chiprow').split('.');
      var ref = state.data;
      var i;
      for (i = 0; i < path.length - 1; i++) ref = ref[path[i]];
      var list = ref[path[path.length - 1]] || [];
      row.querySelectorAll('[data-chip]').forEach(function (b) {
        var on = list.indexOf(b.getAttribute('data-chip')) !== -1;
        b.classList.toggle('gold', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  }

  /* ---------------- fields / validation ---------------- */
  function collect() {
    $$('[data-field]').forEach(function (el) {
      var path = el.getAttribute('data-field').split('.');
      var ref = state.data;
      var i;
      for (i = 0; i < path.length - 1; i++) ref = ref[path[i]];
      ref[path[path.length - 1]] = (typeof el.value === 'string') ? el.value.trim() : el.value;
    });
  }

  function markError(name, msg) {
    var wrap = $('[data-wrap="' + name + '"]');
    if (!wrap) return;
    wrap.classList.add('err');
    var m = $('[data-msg="' + name + '"]', wrap);
    if (m && msg) m.textContent = msg;
  }
  function clearAllErrors(scope) {
    $$('.field.err', scope || document).forEach(function (f) { f.classList.remove('err'); });
  }

  function isValidEmail(v) { return Svc ? Svc.isValidEmail(v) : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim()); }
  function isValidPhone(v) { return Svc ? Svc.isValidPhone(v) : /^[6-9]\d{9}$/.test((v || '').trim()); }

  function validateStep1() {
    clearAllErrors();
    collect();
    var p = state.data.profile;
    var ok = true;

    function req(name, label, check) {
      var wrap = $('[data-wrap="' + name + '"]');
      var input = wrap && $('[data-field="' + name + '"]', wrap);
      var v = input ? input.value.trim() : '';
      if (!v) { markError(name, label + ' is required.'); ok = false; return; }
      if (check && !check(v)) { markError(name, 'Enter a valid ' + label.toLowerCase() + '.'); ok = false; }
    }

    req('profile.fullName', 'Full name');
    req('profile.email', 'Email', isValidEmail);
    req('profile.phone', 'Phone', isValidPhone);
    req('profile.city', 'City');
    req('profile.category', 'Category');
    if (!p.languages.length) { markError('profile.languages', 'Pick at least one language.'); ok = false; }

    var h = p.handles || {};
    if (!h.instagram && !h.youtube && !h.other) {
      markError('profile.handles', 'Share at least one platform handle so we can review your work.');
      ok = false;
    }

    if (!ok) {
      var firstErr = $('.field.err');
      if (firstErr && firstErr.scrollIntoView) firstErr.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return ok;
  }

  function validateStep2() {
    clearAllErrors();
    collect();
    return true;
  }

  /* ---------------- review ---------------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function reviewItem(label, value) {
    var d = el('div', 'row');
    d.innerHTML = '<label>' + label + '</label><p>' + (value || '—') + '</p>';
    return d;
  }
  function reviewGroup(title, editTarget, rows) {
    var g = el('div', 'review-group');
    var t = el('div', 'review-title', '<b>' + title + '</b>');
    var edit = el('button', 'review-edit', 'EDIT');
    edit.type = 'button';
    edit.setAttribute('data-edit', String(editTarget));
    edit.addEventListener('click', function () { setStep(editTarget); });
    t.appendChild(edit);
    var r = el('div', 'review-rows');
    rows.forEach(function (row) { r.appendChild(reviewItem(row[0], row[1])); });
    g.appendChild(t);
    g.appendChild(r);
    return g;
  }

  function renderReview() {
    var box = $('#reviewBox');
    if (!box) return;
    box.innerHTML = '';
    var p = state.data.profile;
    var m = state.data.metrics;
    var h = p.handles || {};

    box.appendChild(reviewGroup('You', 1, [
      ['Name', p.fullName], ['Email', p.email],
      ['Phone / WhatsApp', p.phone], ['City', p.city]
    ]));
    box.appendChild(reviewGroup('Platforms & niche', 1, [
      ['Primary category', p.category],
      ['Languages', p.languages.join(', ')],
      ['Instagram', h.instagram],
      ['YouTube', h.youtube],
      ['Other', h.other]
    ]));
    box.appendChild(reviewGroup('Profile', 2, [
      ['Instagram followers', m.followersInstagram],
      ['YouTube subscribers', m.followersYoutube],
      ['Other / total followers', m.followersOther],
      ['Avg views / reach', m.avgViews],
      ['Posting frequency', m.postingFrequency],
      ['Audience location', m.audienceLocation.join(', ')],
      ['Audience age', m.audienceAge.join(', ')],
      ['Audience gender', m.audienceGender.join(', ')],
      ['Past collaborations', m.pastCollabs],
      ['Portfolio', m.portfolioUrl],
      ['Why AURA SPHERE', m.whyJoin]
    ]));
  }

  /* ---------------- submit ---------------- */
  function initSubmit() {
    $('#submitBtn').addEventListener('click', function () {
      var btn = $('#submitBtn');
      var errBox = $('#submitErr');
      collect();
      var payload = {
        kind: 'creator-apply',
        profile: state.data.profile,
        metrics: state.data.metrics,
        submittedAt: new Date().toISOString()
      };

      btn.disabled = true;
      btn.classList.add('loading');
      btn.innerHTML = '<span class="mono">SUBMITTING…</span>';
      errBox.classList.remove('show');

      var check = Svc.validateCreator(payload);
      if (!check.ok) {
        errBox.textContent = check.errors.join(' ');
        errBox.classList.add('show');
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.innerHTML = 'APPLY TO JOIN';
        return;
      }

      Svc.submit(payload, { flow: 'creator_apply', idPrefix: 'RZ' }).then(function (res) {
        state.submitted = res;
        setStep(4);
      }).catch(function () {
        errBox.textContent = 'We could not reach the server. Please try again.';
        errBox.classList.add('show');
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.innerHTML = 'APPLY TO JOIN';
      });
    });
  }

  /* ---------------- step 4: success ---------------- */
  function renderSuccess() {
    var box = $('#successBox');
    if (!box) return;
    var res = state.submitted || {};
    var p = (res.data && res.data.payload && res.data.payload.profile) || state.data.profile;

    var demoNote = res.demo ? '<p class="notice"><b>PREVIEW MODE</b> — the submission backend is not connected yet. ' +
      'You are viewing the full flow with a locally generated reference. ' +
      'No server write or payment has taken place.</p>' : '';

    box.innerHTML =
      '<div class="success-mark"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></div>' +
      '<p class="mono">APPLICATION RECEIVED</p>' +
      '<h2 class="h2" style="margin:14px 0 8px">YOU\u2019RE ON THE LIST.</h2>' +
      '<p class="lead" style="font-size:17px">We\u2019ll review your profile and reach out if there\u2019s a fit.</p>' +
      '<div class="reg-id">' + res.id + '</div>' +
      '<div class="summary-line">' +
      '<b>' + (p.fullName || '') + '</b><br>' +
      String(p.category || '').toUpperCase() + (p.city ? ' — ' + p.city : '') +
      '</div>' +
      demoNote +
      '<div class="cta-actions"><a class="btn btn-blue" href="/">BACK TO HOME</a>' +
      '<a class="btn btn-ghost" href="/creators.html">ABOUT THE NETWORK</a></div>';
  }

  /* ---------------- boot ---------------- */
  function boot() {
    if (!Svc) {
      console.error('RIZZRegistration service not loaded.');
      return;
    }
    bindChips();
    syncChips();
    initSubmit();
    $('#nextBtn').addEventListener('click', function () {
      if (state.step === 1) {
        if (!validateStep1()) return;
        setStep(2);
        return;
      }
      if (state.step === 2) {
        if (!validateStep2()) return;
        setStep(3);
        return;
      }
      if (state.step === 3) {
        $('#submitBtn').click();
        return;
      }
    });
    $('#backBtn').addEventListener('click', function () {
      if (state.step === 2) { setStep(1); return; }
      if (state.step === 3) { setStep(2); return; }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.step === 2) setStep(1);
    });
    Svc.track('creator_apply_started', { page: location.pathname });
  }

  document.addEventListener('DOMContentLoaded', boot);
})(window, document);