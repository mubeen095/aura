/* ============================================================
   RIZZ — registration-service.js
   Submission layer, cleanly separated from UI.
   UI talks to window.RIZZRegistration only.

   Architecture:
   - UI builds a payload and calls RIZZRegistration.submit()
   - Service POSTs to RIZZ_CONFIG.endpoints.creatorApply
   - Backend not deployed yet -> config.fallbackLocalSubmission
     completes the flow locally with a server-style response
     (demo mode, never claims a real backend write or payment).
   - Razorpay/Stripe can be attached via config.payment later.
   ============================================================ */
(function (window, document) {
  'use strict';

  var CFG = window.RIZZ_CONFIG || {};

  function track(name, data) {
    try {
      window.dispatchEvent(new CustomEvent('rizz:' + name, { detail: data || {} }));
    } catch (e) { /* analytics listeners are optional */ }
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim());
  }

  function isValidPhone(v) {
    return /^[6-9]\d{9}$/.test((v || '').trim().replace(/\s+/g, ''));
  }

  function required(v) {
    return !!(v && String(v).trim());
  }

  function hasHandle(p) {
    var h = (p && p.handles) || {};
    return !!(required(h.instagram) || required(h.youtube) || required(h.other));
  }

  function validateCreator(payload) {
    var errors = [];
    var p = payload.profile || {};

    if (!required(p.fullName)) errors.push('Full name is required.');
    if (!required(p.email)) errors.push('Email is required.');
    else if (!isValidEmail(p.email)) errors.push('Email is invalid.');
    if (!required(p.phone)) errors.push('Phone is required.');
    else if (!isValidPhone(p.phone)) errors.push('Phone must be a valid 10-digit number.');
    if (!required(p.city)) errors.push('City is required.');
    if (!required(p.category)) errors.push('Pick your primary category.');
    if (!p.languages || !p.languages.length) errors.push('Select at least one content language.');
    if (!hasHandle(p)) errors.push('Share at least one platform handle so we can review your work.');

    return { ok: errors.length === 0, errors: errors };
  }

  function validateInquiry(payload) {
    var errors = [];
    if (!required(payload.brandName)) errors.push('Brand name is required.');
    if (!required(payload.contactName)) errors.push('Contact person is required.');
    if (!required(payload.email)) errors.push('Business email is required.');
    else if (!isValidEmail(payload.email)) errors.push('Business email is invalid.');
    if (!required(payload.phone)) errors.push('Phone is required.');
    else if (!isValidPhone(payload.phone)) errors.push('Phone must be a valid 10-digit number.');
    if (!required(payload.goal)) errors.push('Pick a campaign goal.');

    return { ok: errors.length === 0, errors: errors };
  }

  function makeId(prefix) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return (prefix || 'RZ') + new Date().getFullYear() + '-' + code;
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; reject(new Error('request timed out')); } }, ms);
      promise.then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } },
                   function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  }

  function getEndpoint(name, fallback) {
    var endpoints = CFG.endpoints || {};
    return endpoints[name] || fallback;
  }

  function submit(payload, opts) {
    opts = opts || {};
    var flow = opts.flow || 'registration';
    track(flow + '_submitted', payload);

    var endpoint = opts.endpoint || getEndpoint('creatorApply', '/api/creator-apply');
    var prefix = opts.idPrefix || 'RZ';

    var body;
    try {
      body = JSON.stringify(payload);
    } catch (e) {
      return Promise.reject(e);
    }

    var req = fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body
    });

    return withTimeout(req, CFG.requestTimeoutMs || 8000)
      .then(function (response) {
        if (!response.ok) throw new Error('Server returned ' + response.status);
        return response.json();
      })
      .then(function (result) {
        var res = { id: result.id || makeId(prefix), demo: false, data: result };
        track(flow + '_completed', res);
        return res;
      })
      .catch(function (err) {
        if (CFG.fallbackLocalSubmission) {
          var res = { id: makeId(prefix), demo: true, data: { payload: payload, reason: String(err.message || err) } };
          track(flow + '_completed', res);
          return res;
        }
        throw err;
      });
  }

  window.RIZZRegistration = {
    isValidEmail: isValidEmail,
    isValidPhone: isValidPhone,
    track: track,
    makeId: makeId,
    validateCreator: validateCreator,
    validateInquiry: validateInquiry,
    submit: submit
  };
})(window, document);