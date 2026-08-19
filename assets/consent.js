/*
 * Consent + Reddit Pixel + GoatCounter events, on every page.
 *
 * One file rather than a copy per page, same reason as back-to-top.js:
 * no build step here, so hand-duplicated code drifts.
 *
 * The order matters and is not cosmetic:
 *   - GoatCounter runs for everyone. It sets no cookie and identifies
 *     nobody, so it needs no consent, and it is the honest denominator -
 *     it counts the clicks of the people who refuse the pixel too.
 *   - The Reddit pixel loads only after an explicit yes. It sets
 *     _rdt_uuid and sends data to Reddit in the US, which under TTDSG
 *     s25 and Art. 6(1)(a) GDPR needs consent given first, not assumed.
 *   - Refusing is exactly as easy as accepting, one click either way.
 *     A banner where "no" is harder than "yes" is not a valid consent.
 */
(function () {
  'use strict';

  var PIXEL_ID = 'a2_j2lm71tg9f1g';
  var KEY = 'myfeeds-consent';

  // ---------------------------------------------------------------- state
  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function remember(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  // --------------------------------------------------- what the buttons are
  // Mapping a link to the thing it actually is, so both counters speak the
  // same language and the two numbers can be compared later.
  function labelFor(href) {
    if (!href) return null;
    if (href.indexOf('wordpress.org/plugins/myfeeds') > -1) return 'free-plugin';
    if (href.indexOf('checkout.freemius.com') === -1) return null;
    if (href.indexOf('/plan/60599') > -1) return 'starter-trial';
    if (href.indexOf('/plan/35610') > -1) return 'pro-trial';
    if (href.indexOf('/plan/48994') > -1) return 'ecommerce-trial';
    return 'checkout';
  }

  // ------------------------------------------------------------ GoatCounter
  // Runs for everybody. count() is safe to call before the script has
  // loaded - it queues - but guard anyway in case it is blocked.
  function countEvent(label) {
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: 'click/' + label, title: label, event: true });
      }
    } catch (e) {}
  }

  // ----------------------------------------------------------- Reddit pixel
  var pixelReady = false;
  function loadPixel() {
    if (pixelReady) return;
    pixelReady = true;
    !function (w, d) {
      if (!w.rdt) {
        var p = w.rdt = function () {
          p.sendEvent ? p.sendEvent.apply(p, arguments) : p.callQueue.push(arguments);
        };
        p.callQueue = [];
        var t = d.createElement('script');
        // Die ID haengt an der Skript-URL, nicht nur im init-Aufruf. So
        // steht es in Reddits eigenem Setup-Code; der Kommentar dort
        // sagt ausdruecklich, an dem Block nichts zu aendern ausser dem
        // Nutzer-Identifikator.
        t.src = 'https://www.redditstatic.com/ads/pixel.js?pixel_id=' + PIXEL_ID;
        t.async = true;
        var s = d.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(t, s);
      }
    }(window, document);
    window.rdt('init', PIXEL_ID);
    window.rdt('track', 'PageVisit');
  }

  function pixelLead(label) {
    if (!pixelReady || !window.rdt) return;
    window.rdt('track', 'Lead', { customEventName: label });
  }

  // ------------------------------------------------------------- the banner
  function showBanner() {
    var css = [
      '#mf-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:80;max-width:640px;margin:0 auto;',
      'background:#FFFFFF;color:#1A1720;border:1px solid #E8E4DB;border-radius:14px;',
      'box-shadow:0 10px 40px -12px rgba(26,23,32,.45);padding:20px 22px;',
      "font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:.9rem;line-height:1.55}",
      '#mf-consent p{margin:0 0 14px;color:#57515F}',
      '#mf-consent a{color:#6C54B4;text-decoration:underline;text-underline-offset:2px}',
      '#mf-consent .mf-row{display:flex;gap:10px;flex-wrap:wrap}',
      /* Both buttons the same size and weight. The only difference is
         colour, and that is not what makes one easier to press. */
      '#mf-consent button{font:inherit;font-weight:600;font-size:.88rem;padding:10px 20px;border-radius:999px;cursor:pointer;flex:1 1 auto;min-width:140px}',
      '#mf-consent .mf-yes{background:#6C54B4;color:#fff;border:1px solid #6C54B4}',
      '#mf-consent .mf-no{background:transparent;color:#1A1720;border:1px solid #C9C3D4}',
      '#mf-consent .mf-yes:hover{background:#5A4499}',
      '#mf-consent .mf-no:hover{border-color:#1A1720}',
      '@media(max-width:480px){#mf-consent{left:10px;right:10px;bottom:10px;padding:17px 18px}}'
    ].join('');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var box = document.createElement('div');
    box.id = 'mf-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Cookies for advertising measurement');
    box.innerHTML =
      '<p>We would like to measure which ads bring people here. That uses one cookie from Reddit ' +
      'and sends your visit to Reddit in the US. Visitor counting runs either way and needs no ' +
      'cookie. <a href="/privacy/">What we store</a></p>' +
      '<div class="mf-row">' +
      '<button type="button" class="mf-yes">Allow</button>' +
      '<button type="button" class="mf-no">No thanks</button>' +
      '</div>';
    document.body.appendChild(box);

    box.querySelector('.mf-yes').addEventListener('click', function () {
      remember('granted'); box.remove(); loadPixel();
    });
    box.querySelector('.mf-no').addEventListener('click', function () {
      remember('denied'); box.remove();
    });
  }

  // ------------------------------------------------------------------- boot
  var choice = stored();
  if (choice === 'granted') { loadPixel(); }
  else if (choice !== 'denied') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else { showBanner(); }
  }

  // One listener for both counters. GoatCounter always, Reddit only when
  // the pixel is actually loaded.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var label = labelFor(a.getAttribute('href'));
    if (!label) return;
    countEvent(label);
    pixelLead(label);
  });

  // Withdrawing consent: any link to #consent-reset clears the choice and
  // asks again. Lives in the privacy policy, so a "yes" is reversible.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href$="#consent-reset"]');
    if (!a) return;
    e.preventDefault();
    try { localStorage.removeItem(KEY); } catch (err) {}
    var old = document.getElementById('mf-consent');
    if (old) old.remove();
    showBanner();
  });
})();
