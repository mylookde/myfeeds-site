/*
 * The way back from the Freemius checkout.
 *
 * The checkout page has a "Back to myfeeds.site" link. On its own it points
 * at the referrer, which the browser cuts down to the bare domain, so a
 * reader who clicked a plan halfway down a page came back to the top of the
 * homepage. On the way out, this file gives the clicked checkout link a
 * cancel_url: this page, plus a hash that names the button and where it sat
 * on screen (and, on the plan cards, the yearly/monthly and site switches).
 * On the way back it puts the page where the reader left it.
 *
 * Nothing is stored on the device and nothing is sent to us; everything
 * travels in the link to Freemius and back.
 */
;(function () {
  'use strict';

  var KEY = 'back';

  // The dock and a sticky header sit in the same place at any scroll
  // position, so for them only the scroll position says where the reader was.
  function pinned(el) {
    for (; el && el !== document.body; el = el.parentElement) {
      var pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'sticky') return true;
    }
    return false;
  }

  function pressed(attr) {
    var b = document.querySelector('[' + attr + '][aria-pressed="true"]');
    return b ? b.getAttribute(attr) : '';
  }

  // Capture phase: runs before assets/consent.js reads the link to follow it.
  function leave(e) {
    var a = e.target.closest && e.target.closest('a[href*="checkout.freemius.com"]');
    if (!a) return;
    var url;
    try { url = new URL(a.href); } catch (x) { return; }
    var back = new URLSearchParams();
    back.set(KEY, a.getAttribute('data-cta') || '');
    back.set('at', String(Math.round(a.getBoundingClientRect().top)));
    back.set('y', String(Math.round(window.scrollY)));
    if (pressed('data-cycle')) back.set('cycle', pressed('data-cycle'));
    if (pressed('data-sites')) back.set('sites', pressed('data-sites'));
    url.searchParams.set('cancel_url', location.origin + location.pathname + '#' + back.toString());
    a.href = url.toString();
  }
  document.addEventListener('click', leave, true);
  document.addEventListener('auxclick', leave, true);

  // ------------------------------------------------------------ coming back
  // The plan cards read cycle and sites from the same hash before this runs
  // (the page's own script, above this file).
  if (location.hash.indexOf('#' + KEY + '=') !== 0) return;
  var q = new URLSearchParams(location.hash.slice(1));
  try { history.replaceState(null, '', location.pathname + location.search); } catch (x) {}

  var cta = q.get(KEY) || '', at = Number(q.get('at')) || 0, y = Number(q.get('y')) || 0;
  var button = /^[\w-]+$/.test(cta) ? document.querySelector('a[data-cta="' + cta + '"][href*="checkout.freemius.com"]') : null;

  // Web fonts and lazy images can still move the page after this first
  // landing; land again once they are in, unless the reader has already
  // started to scroll.
  var moved = false, stop = function () { moved = true; };
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, stop, { once: true, passive: true }); });
  function land() {
    if (moved) return;
    var top = button && !pinned(button) ? button.getBoundingClientRect().top + window.scrollY - at : y;
    top = Math.max(0, Math.round(top));
    try { window.scrollTo({ top: top, behavior: 'instant' }); } catch (x) { window.scrollTo(0, top); }
  }
  land();
  var later = function () { setTimeout(land, 0); };
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
})();
