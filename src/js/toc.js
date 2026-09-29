/* =============================================================
   toc.js — 目录高亮 / 阅读进度 / 移动端抽屉 / 回到顶部 / 顶栏投影
   无依赖，纯原生 JS。
   ============================================================= */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var tocLinks = Array.prototype.slice.call(doc.querySelectorAll('.toc a[href^="#"]'));
  var topLinks = Array.prototype.slice.call(doc.querySelectorAll('.topnav a[href^="#"]'));
  var sections = Array.prototype.slice.call(doc.querySelectorAll('.section[id]'));
  var bar = doc.getElementById('progressBar');
  var toTop = doc.getElementById('toTop');
  var toggle = doc.querySelector('.navtoggle');
  var toc = doc.getElementById('toc');
  var topbar = doc.getElementById('topbar');
  var backdrop = null;

  /* ---------------------------------------------- 移动端抽屉 */

  /* 抽屉打开时 body 会被设成 position:fixed（防止背后页面跟着滚），
     这会丢掉当前的滚动位置，所以开之前记下来、关的时候还原。 */
  var lockedScrollY = 0;

  function closeNav() {
    var wasOpen = body.classList.contains('nav-open');
    body.classList.remove('nav-open');
    body.style.top = '';
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
    if (wasOpen) window.scrollTo(0, lockedScrollY);
  }

  function openNav() {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    body.style.top = -lockedScrollY + 'px';
    body.classList.add('nav-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (!backdrop) {
      backdrop = doc.createElement('div');
      backdrop.className = 'toc__backdrop';
      backdrop.addEventListener('click', closeNav);
      body.appendChild(backdrop);
    }
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      if (body.classList.contains('nav-open')) closeNav();
      else openNav();
    });
  }

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  tocLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 1040px)').matches) closeNav();
    });
  });

  window.addEventListener('resize', function () {
    if (!window.matchMedia('(max-width: 1040px)').matches) closeNav();
  });

  /* ------------------------------------ 滚动：进度 + 高亮 + 回顶 */

  var ticking = false;

  function currentSectionId() {
    var probe = window.scrollY + window.innerHeight * 0.32;
    var id = sections.length ? sections[0].id : null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= probe) id = sections[i].id;
      else break;
    }
    return id;
  }

  function currentHeadingId(sectionId) {
    var probe = window.scrollY + window.innerHeight * 0.32;
    var heads = Array.prototype.slice.call(
      doc.querySelectorAll(
        '#' + CSS.escape(sectionId) + ' .section__body h2[id], ' +
        '#' + CSS.escape(sectionId) + ' .section__body h3[id]'
      )
    );
    var id = null;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].offsetTop <= probe) id = heads[i].id;
      else break;
    }
    return id;
  }

  function setActive(id, headingId) {
    tocLinks.forEach(function (a) {
      var href = a.getAttribute('href');
      var on = href === '#' + id || (headingId && href === '#' + headingId);
      a.classList.toggle('is-active', !!on);
    });
    topLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
    });
    /* 把当前高亮项滚进可视范围。
       注意：手机上抽屉是隐藏在屏幕外的（translateX 移出去），
       如果这时候还去改 scrollTop，等于在偷偷滚一个看不见的列表 ——
       用户下次打开抽屉时会停在一个莫名其妙的位置。
       所以先判断目录是否真的在屏幕上，不可见就不动它。 */
    var visible = !toc || toc.getBoundingClientRect().right > 0;
    var active = toc && toc.querySelector('.toc__link.is-active');
    if (visible && active && toc.scrollHeight > toc.clientHeight) {
      var t = active.offsetTop - toc.clientHeight / 2 + active.offsetHeight / 2;
      var want = Math.max(0, Math.min(t, toc.scrollHeight - toc.clientHeight));
      if (Math.abs(toc.scrollTop - want) > 60) toc.scrollTop = want;
    }
  }

  function update() {
    ticking = false;
    var y = window.scrollY;

    var max = doc.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0;
    if (bar) bar.style.width = pct.toFixed(2) + '%';

    if (toTop) toTop.classList.toggle('is-on', y > 700);
    if (topbar) topbar.classList.toggle('is-stuck', y > 8);

    var id = currentSectionId();
    if (id) setActive(id, currentHeadingId(id));
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  update();
})();
