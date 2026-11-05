/*
 * Prices, founding places and checkout links of the paid plans, in one place.
 * The homepage, /ecommerce/ and /affiliates/ read this file. Their HTML
 * carries the same figures so the plans read correctly without script, and
 * this file overwrites them on load, so a price change here reaches all three.
 * Prose that names a price (terms, guides, JSON-LD) still changes by hand.
 *
 * "business" is the Freemius slug of the Shop plan and stays that way.
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
      // Founding places: yearly plan, one site. The first step whose upTo is
      // above the places taken is today's price; a coupon stays empty until
      // Freemius has one for that step.
      founding: [
        { upTo: 50, price: 49, coupon: '' },
        { upTo: 100, price: 79, coupon: '' }
      ]
    },
    business: {
      name: 'Shop',
      plan: 48994,
      monthly: 39,
      annual: 329,
      allSites: 799,
      founding: [
        { upTo: 25, price: 149, coupon: '' },
        { upTo: 50, price: 199, coupon: '' },
        { upTo: 100, price: 249, coupon: '' }
      ]
    }
  };

  // Founding places already taken. Set by hand until a counter feeds it.
  // It only picks the current step; no page shows the number itself.
  var taken = { pro: 0, business: 0 };

  function step(key) {
    var f = plans[key].founding, n = taken[key] || 0;
    for (var i = 0; i < f.length; i++) if (n < f[i].upTo) return f[i];
    return null;
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

  window.MyFeedsPlans = { plans: plans, step: step, price: price, checkout: checkout };
})();
