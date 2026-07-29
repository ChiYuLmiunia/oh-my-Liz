/* ===== 鼠鼠发展改革委员会 - 页面切换过渡动画 ===== */

(function () {
  'use strict';

  // ===== 核心状态 =====
  var transitioning = false;
  var pendingUrl = null;
  var overlayEl = null;
  var progressFill = null;
  var duration = 600;
  var fadeout = 40;

  // ===== 过渡层 DOM =====
  function createOverlay() {
    if (overlayEl) return overlayEl;

    overlayEl = document.createElement('div');
    overlayEl.className = 'page-transition';
    overlayEl.innerHTML =
      '<div class="progress-track"><div class="progress-fill"></div></div>' +
      '<div class="progress-dot"></div>';

    progressFill = overlayEl.querySelector('.progress-fill');
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function removeOverlay() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
    overlayEl = null;
    progressFill = null;
  }

  // ===== 开始过渡 =====
  function doTransition(url) {
    if (transitioning) {
      pendingUrl = url;
      return;
    }

    transitioning = true;
    pendingUrl = null;

    var overlay = createOverlay();
    overlay.classList.add('active');

    document.body.classList.add('transition-shrink');

    requestAnimationFrame(function () {
      if (progressFill) {
        progressFill.style.transition = 'width ' + duration + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
        progressFill.style.width = '100%';
      }
    });

    setTimeout(function () {
      overlay.classList.remove('active');
      setTimeout(function () {
        removeOverlay();
        document.body.classList.remove('transition-shrink');
        transitioning = false;

        // 用 location.replace 避免浏览器缓存问题
        window.location.replace(pendingUrl || url);
        pendingUrl = null;
      }, fadeout);
    }, duration);
  }

  // ===== 判断是否拦截 =====
  function shouldIntercept(href) {
    if (!href) return false;

    // 外部链接 → 放行
    try {
      var u = new URL(href, window.location.origin);
      if (u.origin !== window.location.origin) return false;
    } catch (e) {
      return false;
    }

    // 锚点 → 放行
    if (href[0] === '#') return false;

    return true;
  }

  // ===== 初始化 =====
  function init() {
    // 1. 立即创建过渡层 DOM（DOMContentLoaded 可能已触发）
    createOverlay();

    // 2. 拦截 <a> 点击
    document.addEventListener('click', function (e) {
      if (transitioning) return;

      var link = e.target.closest('a');
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href || !shouldIntercept(href)) return;
      if (link.target === '_blank') return;
      if (link.hasAttribute('download')) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      // 放行 logout
      if (link.getAttribute('onclick') && link.getAttribute('onclick').indexOf('logout') !== -1) return;

      e.preventDefault();
      doTransition(href);
    });

    // 3. 暴露全局 API（供 JS 导航调用）
    window.transitionAPI = {
      navigate: doTransition,
      isTransitioning: function () { return transitioning; }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
