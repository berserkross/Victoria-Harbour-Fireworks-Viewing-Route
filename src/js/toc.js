/* =============================================================
   toc.js — 目录高亮 / 阅读进度 / 移动端抽屉 / 回到顶部
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
  var backdrop = null;

  /* ---------------------------------------------- 移动端抽屉 */

  function closeNav() {
    body.classList.remove('nav-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
  }

  function openNav() {
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

  // 点目录后自动收起抽屉
  tocLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 1080px)').matches) closeNav();
    });
  });

  window.addEventListener('resize', function () {
    if (!window.matchMedia('(max-width: 1080px)').matches) closeNav();
  });

  /* ------------------------------------ 滚动：进度 + 高亮 + 回顶 */

  var ticking = false;

  function currentSectionId() {
    // 视口上方 1/3 处所属的章节
    var probe = window.scrollY + window.innerHeight * 0.32;
    var id = sections.length ? sections[0].id : null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= probe) id = sections[i].id;
      else break;
    }
    return id;
  }

  function currentHeadingId(sectionId) {
    // 章节内已经滚过的小标题（用于二级目录高亮）
    var probe = window.scrollY + window.innerHeight * 0.32;
    var heads = Array.prototype.slice.call(
      doc.querySelectorAll('#' + CSS.escape(sectionId) + ' .section__body h2[id], #' + CSS.escape(sectionId) + ' .section__body h3[id]')
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
    // 让激活项在目录里保持可见
    var active = toc && toc.querySelector('.toc__link.is-active');
    if (active && toc.scrollHeight > toc.clientHeight) {
      var t = active.offsetTop - toc.clientHeight / 2 + active.offsetHeight / 2;
      var want = Math.max(0, Math.min(t, toc.scrollHeight - toc.clientHeight));
      if (Math.abs(toc.scrollTop - want) > 60) toc.scrollTop = want;
    }
  }

  function update() {
    ticking = false;

    var max = doc.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    if (bar) bar.style.width = pct.toFixed(2) + '%';

    if (toTop) toTop.classList.toggle('is-on', window.scrollY > 700);

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
