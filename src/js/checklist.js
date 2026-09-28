/* =============================================================
   checklist.js — 出发前检查清单，勾选状态保存在本机 localStorage
   不会上传任何数据。想清空重来，点「全部清空」或清除浏览器数据。
   ============================================================= */
(function () {
  'use strict';

  var KEY = 'vic-fireworks-checklist-v1';

  var widgets = Array.prototype.slice.call(document.querySelectorAll('[data-checklist]'));
  if (!widgets.length) return;

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function write(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* 隐私模式或存储被禁用时静默失败，勾选仍然可用，只是不记忆 */
    }
  }

  var state = read();

  widgets.forEach(function (widget) {
    var boxes = Array.prototype.slice.call(widget.querySelectorAll('input[data-check]'));
    var count = widget.querySelector('[data-check-count]');
    var reset = widget.querySelector('[data-check-reset]');

    function refresh() {
      var done = 0;
      boxes.forEach(function (b) {
        if (b.checked) done += 1;
      });
      if (count) {
        count.textContent = done + ' / ' + boxes.length;
        count.classList.toggle('is-done', done === boxes.length && boxes.length > 0);
      }
    }

    boxes.forEach(function (box) {
      var id = box.getAttribute('data-check');
      box.checked = !!state[id];
      box.addEventListener('change', function () {
        state[id] = box.checked;
        write(state);
        refresh();
      });
    });

    if (reset) {
      reset.addEventListener('click', function () {
        boxes.forEach(function (b) {
          b.checked = false;
          state[b.getAttribute('data-check')] = false;
        });
        write(state);
        refresh();
      });
    }

    refresh();
  });
})();
