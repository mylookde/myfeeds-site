/*
 * PREVIEW COPY of /assets/consent.js for the new homepage (pin/lab/v4/home/).
 * Two changes against the live file, everything else is word for word:
 *
 *   1. The banner only asks on a visit that came from a Reddit ad: the
 *      address carries utm_source=reddit or Reddit's own click id rdt_cid.
 *      Everyone else (Pinterest, Google, a link) sees no banner. A "yes"
 *      given earlier still loads the pixel on every page, as before; a
 *      "no" is still respected everywhere.
 *      REMEMBER_AD_VISIT (below, off) would also ask on the next pages of
 *      the same tab: it keeps one flag, myfeeds-reddit-ad, in
 *      sessionStorage, written BEFORE any answer. Whether that may be
 *      stored without consent (TDDDG s25) is open: Marlon decides, and the
 *      privacy policy names the flag if it is switched on.
 *   2. Links to the live preview on WordPress.org (?preview=1) count as
 *      click/live-preview, not as click/free-plugin, and are no Reddit lead.
 *
 * GoatCounter counts as before, for every visitor, with the same labels
 * (click/free-plugin, click/starter-trial, click/pro-trial,
 * click/ecommerce-trial, click/checkout) and the same 250 ms hold.
 *
 * Going live: this replaces /assets/consent.js on every page (one file, as
 * before), and only together with the new wording of privacy policy 3.4
 * ("the banner shown on your first visit" is then no longer true).
 *
 * --- the original notes ---
 * Consent + Reddit Pixel + GoatCounter events, on every page.
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
  var AD_KEY = 'myfeeds-reddit-ad';
  var REMEMBER_AD_VISIT = false;

  // ---------------------------------------------------------------- state
  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function remember(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  // -------------------------------------------- did this visit come from Reddit?
  // Only the ad's own marks count: utm_source=reddit (the target address of
  // the ads, myfeeds.site/?utm_source=reddit&utm_medium=cpc&...) or rdt_cid,
  // the click id Reddit adds itself. A plain link from reddit.com is not an
  // ad and gets nothing. Without REMEMBER_AD_VISIT nothing is written: the
  // banner asks on the page the ad opened, and only there.
  function fromRedditAd() {
    var q = '';
    try { q = location.search || ''; } catch (e) {}
    var hit = /[?&]rdt_cid=/i.test(q) || /[?&]utm_source=reddit(&|$)/i.test(q);
    if (!REMEMBER_AD_VISIT) return hit;
    if (hit) {
      try { sessionStorage.setItem(AD_KEY, '1'); } catch (e) {}
      return true;
    }
    try { return sessionStorage.getItem(AD_KEY) === '1'; } catch (e) { return false; }
  }
  var AD_VISIT = fromRedditAd();

  // --------------------------------------------------- what the buttons are
  // Mapping a link to the thing it actually is, so both counters speak the
  // same language and the two numbers can be compared later.
  function labelFor(href) {
    if (!href) return null;
    // The live preview on WordPress.org is a look, not a download.
    if (href.indexOf('wordpress.org/plugins/myfeeds') > -1 && href.indexOf('preview=1') > -1) return 'live-preview';
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

  // Eine Kennung pro Knopf und Seitenaufruf. Reddits Vorlage aus dem
  // Setup ("Prepare for deduplication") verlangt conversionId; sie sorgt
  // hier ausserdem dafuer, dass ein zweiter Klick auf denselben Knopf
  // nicht als zweiter Lead zaehlt.
  var conversionIds = {};
  function conversionIdFor(label) {
    if (!conversionIds[label]) {
      conversionIds[label] = label + '-' + Date.now() + '-' +
        Math.random().toString(36).slice(2, 8);
    }
    return conversionIds[label];
  }

  function pixelLead(label) {
    if (!pixelReady || !window.rdt) return;
    window.rdt('track', 'Lead', { conversionId: conversionIdFor(label) });
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
  // A yes given before loads the pixel on every page, as in the live file.
  // Only a visit from a Reddit ad is asked; every other visit without an
  // answer gets no banner, no pixel and no cookie.
  var choice = stored();
  if (choice === 'granted') { loadPixel(); }
  else if (choice !== 'denied' && AD_VISIT) {
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
    if (label !== 'live-preview') pixelLead(label);

    // Beide Zaehler feuern eine Anfrage ab, und diese Links verlassen die
    // Seite. Ein Browser bricht laufende Anfragen beim Verlassen ab, also
    // ging genau der Klick verloren, den wir messen wollten - Reddit blieb
    // auf "no events" und die GoatCounter-Ziele wurden nie gezaehlt.
    // Ein Wimpernschlag Aufschub reicht; alles, was der Nutzer bewusst in
    // einem neuen Tab oeffnet, bleibt unberuehrt.
    if (e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
        a.target === '_blank') return;

    var href = a.href;
    e.preventDefault();
    setTimeout(function () { window.location.href = href; }, 250);
  });

  // Withdrawing consent: any link to #consent-reset clears the choice and
  // asks again, on any visit (the privacy page has the link), so a "yes"
  // stays reversible even when nobody came from an ad.
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
