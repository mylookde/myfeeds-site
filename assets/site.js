/*
 * Shared behaviour of the content pages (guides, network guides, hubs,
 * legal pages, small landing pages). One file, loaded with defer, before
 * back-to-top.js and consent.js. Styles: /assets/site.css.
 *
 * Nothing on a page waits for this file. Without it the text, the FAQ
 * (<details>) and every link still work; only the phone menu stays shut,
 * nothing is counted and the brush marks are simply there.
 *
 * A page says who it is with <body data-page="articles/<slug>/"> and may
 * ask for the phone button bar with <body data-dock>.
 */
(function () {
  'use strict';
  var d = document, root = d.documentElement, body = d.body;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  // ---------------------------------------------------------------- preview
  // New pages are built under /pin/lab/v3/<their later path>/ first. There
  // (and only there) nothing is counted, links to pages that already have a
  // preview stay inside the preview, and a strip says what this is. Once a
  // file moves to its real path, this whole block does nothing.
  var PRE = '/pin/lab/v3', PREVIEW = location.pathname.indexOf(PRE + '/') === 0;

  // ------------------------------------------------------------ GoatCounter
  // No cookie, nobody identified, so no consent needed. This file adds the
  // same script tag the five sales pages carry in their <head>; pages built
  // on site.js do NOT paste that tag themselves. Loading it from here is
  // what keeps a preview from counting: count.js takes its path from the
  // canonical, and a preview's canonical is already the later address.
  var pasted = d.querySelector('script[data-goatcounter]');
  if (!PREVIEW && !pasted) {
    var gc = d.createElement('script');
    gc.async = true;
    gc.setAttribute('data-goatcounter', 'https://myfeeds.goatcounter.com/count');
    gc.src = '//gc.zgo.at/count.js';
    d.head.appendChild(gc);
  }
  // Which button it was goes out as <data-page>cta-<name>, the pattern of
  // the five sales pages (install/cta-hero ...). consent.js then counts
  // what the link is (click/free-plugin, click/pro-trial ...) and holds the
  // navigation 250 ms for both.
  var P = body.getAttribute('data-page') || location.pathname.replace(/^\/+/, '');
  if (P && P.slice(-1) !== '/') P += '/';
  function count(name) {
    if (PREVIEW) return;
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: P + name, title: P + name, event: true }); } catch (e) {}
  }
  d.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-cta]');
    if (el) count('cta-' + el.getAttribute('data-cta'));
  });

  if (PREVIEW) {
    // Pages that are live as they are and have no preview twin.
    var LIVE = /^\/($|install\/|affiliates\/|ecommerce\/|pin\/|assets\/|free\/)|\.[a-z0-9]+$/i, moved = {};
    each(d.querySelectorAll('a[href]'), function (a) {
      if (a.hasAttribute('data-live') || a.origin !== location.origin || LIVE.test(a.pathname)) return;
      var to = PRE + a.pathname;
      a.pathname = to;
      (moved[to] = moved[to] || []).push(a);
    });
    // A page without a preview yet: the link goes back to the live page.
    if (window.fetch) Object.keys(moved).forEach(function (to) {
      fetch(to, { method: 'HEAD' }).then(function (r) {
        if (r.status === 404) moved[to].forEach(function (a) { a.pathname = to.slice(PRE.length); });
      }).catch(function () {});
    });
    var strip = d.createElement('div'), canon = d.querySelector('link[rel="canonical"]'), later = '';
    try { later = canon ? new URL(canon.href).pathname : ''; } catch (e) {}
    strip.className = 'pv';
    strip.textContent = 'Preview · not public yet' + (later && later.indexOf(PRE) !== 0 ? ' · later at myfeeds.site' + later : '');
    if (pasted) {
      var warn = d.createElement('em');
      warn.textContent = ' · remove the GoatCounter tag from this page: site.js loads it';
      strip.appendChild(warn);
    }
    body.insertBefore(strip, body.firstChild);
  }

  // ------------------------------------------------------------------- menu
  // On phones: folds away on a tap, Escape or a tap outside.
  var mb = d.getElementById('menu-btn'), menu = d.getElementById('menu');
  function setMenu(open) { menu.hidden = !open; mb.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  if (mb && menu) {
    mb.addEventListener('click', function () { setMenu(menu.hidden); if (!menu.hidden) count('menu'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && !mb.contains(e.target)) setMenu(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); mb.focus(); } });
  }

  // -------------------------------------------------------------------- faq
  // One answer open at a time within a list (name="faq" does it in current
  // browsers; this covers the others) and the opening is counted.
  each(d.querySelectorAll('.faq details'), function (item, i) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      each(item.parentNode.children, function (o) { if (o !== item && o.open) o.open = false; });
      count('faq-' + (i + 1));
    });
  });

  // ------------------------------------------------------------- jump list
  // Legal pages: the list of sections is a closed <details> on a phone and
  // an open, sticky column from 1000px. It also marks the section on screen.
  var tocs = d.querySelectorAll('.toc details');
  if (tocs.length && window.matchMedia) {
    var wide = matchMedia('(min-width:1000px)');
    var fit = function () { each(tocs, function (t) { t.open = wide.matches; t.firstElementChild.tabIndex = wide.matches ? -1 : 0; }); };
    fit();
    if (wide.addEventListener) wide.addEventListener('change', fit);
    var links = d.querySelectorAll('.toc a[href^="#"]'), busy = false;
    var spy = function () {
      var cur = -1;
      each(links, function (a, i) { var t = d.getElementById(a.hash.slice(1)); if (t && t.getBoundingClientRect().top < window.innerHeight * .3) cur = i; });
      each(links, function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      busy = false;
    };
    window.addEventListener('scroll', function () { if (!busy) { busy = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }

  // ------------------------------------------------------------ brush marks
  // Each one paints itself once, when most of its example is on screen.
  // Without motion the CSS shows them finished.
  var brushes = d.querySelectorAll('.brush');
  if (root.classList.contains('mo') && brushes.length) {
    if ('IntersectionObserver' in window) {
      var paint = new IntersectionObserver(function (es) {
        es.forEach(function (x) {
          if (!x.isIntersecting) return;
          x.target.querySelector('.brush').classList.add('on');
          paint.unobserve(x.target);
        });
      }, { threshold: .6 });
      each(brushes, function (b) { paint.observe(b.parentNode); });
    } else {
      each(brushes, function (b) { b.classList.add('on'); });
    }
  }

  // ------------------------------------------------------------------- dock
  // Phone only, and only with <body data-dock>: once the hero button has
  // scrolled away, a button waits at the bottom. It steps aside while the
  // close or any other in-page button is on screen, so two never stack.
  var dock = d.getElementById('dock'), hero = d.getElementById('hero-cta') || d.querySelector('.hero');
  if (body.hasAttribute('data-dock') && dock && hero && 'IntersectionObserver' in window) {
    root.classList.add('has-dock');
    var heroGone = false, inView = 0;
    var sync = function () { var on = heroGone && !inView; dock.classList.toggle('on', on); root.classList.toggle('dock-on', on); };
    new IntersectionObserver(function (e) { heroGone = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; sync(); }).observe(hero);
    var watch = new IntersectionObserver(function (es) {
      es.forEach(function (x) { var was = x.target._in === true; x.target._in = x.isIntersecting; inView += (x.isIntersecting ? 1 : 0) - (was ? 1 : 0); });
      sync();
    });
    each(d.querySelectorAll('main .go .cta, main .pitch .cta, #end'), function (el) { if (el !== hero) watch.observe(el); });
  }

  // ---------------------------------------------------------------- anchors
  // Arriving from another page with an #anchor. Web fonts and lazy images
  // can still move the text, so once they are in, land on the target
  // again, unless the reader has already started to scroll.
  var id = decodeURIComponent(location.hash.slice(1)), target = id && d.getElementById(id);
  if (target) {
    var scrolled = false, stop = function () { scrolled = true; };
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, stop, { once: true, passive: true }); });
    var land = function () {
      if (scrolled) return;
      try { target.scrollIntoView({ block: 'start', behavior: 'instant' }); } catch (e) { target.scrollIntoView(true); }
    };
    var soon = function () { setTimeout(land, 0); };
    if (d.readyState === 'complete') soon(); else window.addEventListener('load', soon);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(soon);
  }
})();
