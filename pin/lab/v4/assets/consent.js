/*
 * GoatCounter click events, on every page. Preview copy; on go-live replace
 * /assets/consent.js with this file (the name stays so no page needs editing).
 *
 * Since 26.10.2026 there is no Reddit pixel and therefore no consent banner:
 * nothing on myfeeds.site stores or reads anything on the visitor's device
 * that would need consent. GoatCounter sets no cookie and identifies nobody,
 * so it runs for everyone (privacy policy 3.3).
 */
(function () {
  'use strict';

  // Answers given to the old banner are no longer read by anything.
  try { localStorage.removeItem('myfeeds-consent'); } catch (e) {}

  // Mapping a link to the thing it actually is, so the counts stay comparable.
  function labelFor(href) {
    if (!href) return null;
    if (href.indexOf('wordpress.org/plugins/myfeeds') > -1 && href.indexOf('preview=1') > -1) return 'live-preview';
    if (href.indexOf('wordpress.org/plugins/myfeeds') > -1) return 'free-plugin';
    if (href.indexOf('checkout.freemius.com') === -1) return null;
    if (href.indexOf('/plan/60599') > -1) return 'starter-trial';
    if (href.indexOf('/plan/35610') > -1) return 'pro-trial';
    if (href.indexOf('/plan/48994') > -1) return 'ecommerce-trial';
    return 'checkout';
  }

  // count() is safe to call before the script has loaded - it queues - but
  // guard anyway in case it is blocked.
  function countEvent(label) {
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: 'click/' + label, title: label, event: true });
      }
    } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var label = labelFor(a.getAttribute('href'));
    if (!label) return;

    countEvent(label);

    // These links leave the page, and a browser cancels running requests when
    // it does - the click we want to count would be lost. A moment's delay is
    // enough; anything the visitor opens in a new tab is left alone.
    if (e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
        a.target === '_blank') return;

    var href = a.href;
    e.preventDefault();
    setTimeout(function () { window.location.href = href; }, 250);
  });
})();
