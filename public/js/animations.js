/* ===== 鼠鼠发展改革委员会 - 动画工具库 ===== */

// 页面淡入效果
function animatePageLoad() {
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  });
}

// 容器内元素交错入场
function animateChildren(container, selector, options = {}) {
  const {
    delay = 50,
    fromTop = 20,
    fromLeft = 0,
    duration = 400,
    easing = 'cubic-bezier(0.22, 1, 0.36, 1)'
  } = options;

  const children = container.querySelectorAll(selector);
  children.forEach((el, i) => {
    if (el.classList.contains('animated')) return;
    el.style.opacity = '0';
    el.style.transform = `translateY(${fromTop}px) translateX(${fromLeft}px)`;
    el.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;

    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) translateX(0)';
      el.classList.add('animated');
    }, i * delay);
  });
}

// 数字递增动画 (easeOutCubic)
function animateValue(element, start, end, duration = 800) {
  if (!element || end == null) return;

  // 如果已经是相同值，不做动画
  if (parseInt(element.textContent) === end) return;

  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// 给元素添加 bounce 动画
function addBounce(element, className = 'balanceBump') {
  if (!element) return;
  element.classList.remove(className);
  // Force reflow
  void element.offsetWidth;
  element.classList.add(className);
  setTimeout(() => element.classList.remove(className), 500);
}
