/* =============================================================
   lightbox.js — 点击图片放大查看（支持左右键 / 滑动切换）
   ============================================================= */
(function () {
  'use strict';

  var doc = document;
  var box = doc.getElementById('lightbox');
  if (!box) return;

  var imgEl = box.querySelector('.lightbox__img');
  var capEl = box.querySelector('.lightbox__cap');
  var btnClose = box.querySelector('.lightbox__close');
  var btnPrev = box.querySelector('.lightbox__prev');
  var btnNext = box.querySelector('.lightbox__next');

  var items = [];
  var index = 0;
  var lastFocus = null;

  function collect() {
    items = Array.prototype.slice
      .call(doc.querySelectorAll('.step__figure img, .inline-img, .video img'))
      .filter(function (im) {
        return im.naturalWidth !== 0 || im.complete;
      });
    if (!items.length) {
      items = Array.prototype.slice.call(doc.querySelectorAll('.step__figure img, .inline-img'));
    }
  }

  function captionOf(img) {
    var fig = img.closest('figure');
    var cap = fig && fig.querySelector('figcaption');
    return (cap && cap.textContent.trim()) || img.getAttribute('title') || img.getAttribute('alt') || '';
  }

  function show(i) {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    var img = items[index];
    imgEl.src = img.currentSrc || img.src;
    imgEl.alt = img.getAttribute('alt') || '';
    var cap = captionOf(img);
    capEl.textContent = cap ? cap + '  (' + (index + 1) + '/' + items.length + ')' : '(' + (index + 1) + '/' + items.length + ')';
    var multi = items.length > 1;
    btnPrev.hidden = !multi;
    btnNext.hidden = !multi;
  }

  function open(img) {
    collect();
    var i = items.indexOf(img);
    if (i < 0) {
      items.push(img);
      i = items.length - 1;
    }
    lastFocus = doc.activeElement;
    box.hidden = false;
    doc.body.style.overflow = 'hidden';
    show(i);
    btnClose.focus();
  }

  function close() {
    box.hidden = true;
    imgEl.removeAttribute('src');
    doc.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  doc.addEventListener('click', function (e) {
    var img = e.target.closest && e.target.closest('.step__figure img, .inline-img');
    if (!img) return;
    e.preventDefault();
    open(img);
  });

  // 键盘可访问：图片本身可聚焦并回车打开
  doc.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { show(index - 1); });
  btnNext.addEventListener('click', function () { show(index + 1); });
  box.addEventListener('click', function (e) {
    if (e.target === box) close();
  });

  // 触摸滑动
  var startX = null;
  box.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
  }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 48) show(dx < 0 ? index + 1 : index - 1);
    startX = null;
  }, { passive: true });
})();
