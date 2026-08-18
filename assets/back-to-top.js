/*
 * Back to top, on every page of myfeeds.site.
 *
 * One file rather than a copy in each of the seventeen HTML pages: there
 * is no build step here, so anything duplicated by hand drifts apart the
 * first time it is touched. The CSS travels with it for the same reason.
 *
 * Built after the button on mylook.com.de: small, bottom right, out of
 * the way until you have scrolled past a screen of content. Round and
 * softer here, because this site has no square corners anywhere.
 */
(function () {
  'use strict';
  if (document.getElementById('to-top')) return;

  var css = [
    '#to-top{position:fixed;right:22px;bottom:22px;z-index:60;width:42px;height:42px;',
    'display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;',
    'border:none;border-radius:50%;background:rgba(26,23,32,.62);color:#FCFBF8;',
    '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
    'box-shadow:0 6px 18px -6px rgba(26,23,32,.45);',
    /* visibility, not opacity alone: an invisible button still takes tab
       stops and still answers a screen reader. It is also deliberately
       not part of the transition - transitioned, visibility keeps its old
       value for the whole duration and the button never appears. */
    'opacity:0;visibility:hidden;transform:translateY(8px);',
    'transition:opacity .22s ease,transform .22s ease,background .18s ease,visibility 0s linear .22s}',
    '#to-top.is-on{opacity:1;visibility:visible;transform:none;transition:opacity .22s ease,transform .22s ease,background .18s ease,visibility 0s}',
    '#to-top:hover{background:rgba(26,23,32,.88)}',
    '#to-top:focus-visible{outline:2px solid #6C54B4;outline-offset:3px}',
    '#to-top svg{width:17px;height:17px;display:block}',
    '@media(max-width:640px){#to-top{width:38px;height:38px;right:16px;bottom:16px}}',
    '@media(print){#to-top{display:none}}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Back to top');
  btn.title = 'Back to top';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(btn);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  // One screen of scrolling before it turns up, so it never sits over the
  // hero. rAF-gated because scroll fires far more often than it needs to.
  var ticking = false;
  function update() {
    btn.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.9);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();
