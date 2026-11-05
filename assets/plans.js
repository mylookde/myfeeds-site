/*
 * Prices, founding places and checkout links of the paid plans, in one place.
 * The homepage, /ecommerce/ and /affiliates/ read this file. Their HTML
 * carries the regular figures so the plans read correctly without script, and
 * this file overwrites them on load, so a price change here reaches all three.
 * Prose that names a price (terms, guides, JSON-LD) still changes by hand.
 *
 * "business" is the Freemius slug of the Shop plan and stays that way.
 *
 * Founding prices show only when the checkout really charges them: the plan's
 * founding.active is true AND the step open now has a coupon that exists in
 * Freemius, or freemiusPrice: true (the plan's yearly price in Freemius is
 * already that step's price). Anything else shows the regular price. Every
 * piece of page text about founding prices sits in
 * <template data-founding="pro|business|any">, which no browser renders;
 * mount() below brings it out only for a plan that passes that test. So a
 * switched-off plan, a missing coupon, a blocked script or a script error all
 * end at the regular price, never at a price the checkout does not charge.
 *
 * freemiusPrice: true means the yearly price in Freemius IS the founding
 * price. Visitors without script then see the regular price in the HTML and
 * pay less. Switch it off only together with the price in Freemius.
 */
(function () {
  'use strict';

  var CHECKOUT = 'https://checkout.freemius.com/plugin/21336/plan/';

  var plans = {
    pro: {
      name: 'Pro',
      plan: 35610,
      monthly: 12,
      annual: 99,
      allSites: 249,
      // Yearly plan, one site. The first step whose upTo is above the places
      // taken is the open step.
      founding: {
        active: false,
        steps: [
          { upTo: 50, price: 49, coupon: '', freemiusPrice: false },
          { upTo: 100, price: 79, coupon: '', freemiusPrice: false }
        ]
      }
    },
    business: {
      name: 'Shop',
      plan: 48994,
      monthly: 39,
      annual: 329,
      allSites: 799,
      founding: {
        active: false,
        steps: [
          { upTo: 25, price: 149, coupon: '', freemiusPrice: false },
          { upTo: 50, price: 199, coupon: '', freemiusPrice: false },
          { upTo: 100, price: 249, coupon: '', freemiusPrice: false }
        ]
      }
    }
  };

  // Founding places already taken. Set by hand until a counter feeds it.
  // It only picks the open step; no page shows the number itself.
  var taken = { pro: 0, business: 0 };

  // The open founding step, or null when the plan sells at its regular price.
  function step(key) {
    var f = plans[key].founding, n = taken[key] || 0;
    if (!f || !f.active) return null;
    for (var i = 0; i < f.steps.length; i++) {
      var s = f.steps[i];
      if (n < s.upTo) return s.coupon || s.freemiusPrice ? s : null;
    }
    return null;
  }

  function on(key) {
    return key === 'any' ? !!(step('pro') || step('business')) : !!(plans[key] && step(key));
  }

  // sites is 1 or 'all'; "all my sites" exists only as a yearly plan.
  function price(key, cycle, sites) {
    var p = plans[key];
    if (sites === 'all') return p.allSites;
    if (cycle === 'monthly') return p.monthly;
    var s = step(key);
    return s ? s.price : p.annual;
  }

  function checkout(key, cycle, sites) {
    var p = plans[key], all = sites === 'all';
    var s = !all && cycle === 'annual' ? step(key) : null;
    // trial=true starts the trial the way the plan is set up in Freemius
    // (with or without a payment method), the same value the Freemius SDK
    // sends. licenses/unlimited is not yet tested against the live checkout.
    return CHECKOUT + p.plan + (all ? '/licenses/unlimited/' : '/') +
      '?trial=true&billing_cycle=' + (all ? 'annual' : cycle) +
      (s && s.coupon ? '&coupon=' + encodeURIComponent(s.coupon) : '');
  }

  // The steps as list items. "Subscribers", not "places", because the list
  // sits under the "1 site / All my sites" switch and was read as sites.
  function ladder(key) {
    var now = step(key), from = 1, html = '';
    plans[key].founding.steps.forEach(function (s) {
      var cur = s === now;
      var label = from === 1 ? 'First ' + s.upTo + ' subscribers' : 'Subscribers ' + from + '–' + s.upTo;
      html += '<li' + (cur ? ' aria-current="true"' : '') + '><span>' + label + (cur ? '<small>now</small>' : '') + '</span><b>$' + s.price + ' a year</b></li>';
      from = s.upTo + 1;
    });
    return html + '<li><span>After that</span><b>$' + plans[key].annual + ' a year</b></li>';
  }

  function mount() {
    var ts = document.querySelectorAll('template[data-founding]');
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i], key = t.getAttribute('data-founding');
      if (!t.content || !on(key)) continue;
      var frag = document.importNode(t.content, true);
      var ol = frag.querySelector && frag.querySelector('ol[data-ladder]');
      if (ol) ol.innerHTML = ladder(ol.getAttribute('data-ladder'));
      t.parentNode.replaceChild(frag, t);
    }
  }

  window.MyFeedsPlans = { plans: plans, step: step, on: on, price: price, checkout: checkout, ladder: ladder };

  // The tag sits at the end of <body>, after every template it fills, and
  // before the page script that reads the result.
  if (typeof document !== 'undefined') {
    try { mount(); } catch (e) {}
  }
})();
