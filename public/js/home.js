const roleMap = {
  admin: '👑 管理员',
  streamer: '🎤 主播',
  user: '🐭 普通用户',
  pending: '⏳ 待审核'
};

const typeMap = {
  virtual_rights: '虚拟权益',
  physical_gift: '实体礼物',
  privilege: '特权'
};

let allPurchases = []; // 缓存所有购买记录用于图表

async function loadHome() {
  animatePageLoad();

  const user = getUser();
  if (!user || user.role === 'pending') {
    window.location.href = '/';
    return;
  }

  try {
    // 更新导航栏
    document.getElementById('navUsername').textContent = user.username;
    const navBalanceEl = document.getElementById('navBalance');
    animateValue(navBalanceEl, 0, user.balance, 800);

    // 更新主页统计
    const homeBalanceEl = document.getElementById('homeBalance');
    animateValue(homeBalanceEl, 0, user.balance, 800);
    document.getElementById('homeRole').textContent = roleMap[user.role] || user.role;

    // 显示管理员链接
    if (user.role === 'admin' || user.role === 'streamer') {
      document.getElementById('adminLink').style.display = 'inline';
    }

    // 加载购买历史
    await loadPurchaseHistory();

    // 统计卡片入场动画
    const statsContainer = document.querySelector('.stats');
    if (statsContainer) {
      animateChildren(statsContainer, '.stat-card', { delay: 80 });
    }

    // 渲染趋势图
    await renderSpendingChart();
  } catch (err) {
    console.error('加载主页失败:', err);
    if (err.message === '登录已过期') {
      logout();
    }
  }
}

async function loadPurchaseHistory() {
  try {
    const result = await productAPI.getPurchaseHistory();
    if (result.success) {
      const purchases = result.data;
      allPurchases = purchases;
      document.getElementById('homePurchaseCount').textContent = purchases.length;

      const container = document.getElementById('recentPurchases');
      if (purchases.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="icon">🐭</div>
            <p>还没有购买记录哦~</p>
          </div>
        `;
      } else {
        const recent = purchases.slice(0, 5);
        container.innerHTML = recent.map(p => `
          <div class="purchase-item">
            <div class="purchase-info">
              <div class="purchase-product">${escapeHtml(p.product_name)}</div>
              <div class="purchase-time">${escapeHtml(new Date(p.created_at).toLocaleString('zh-CN'))}</div>
            </div>
            <div class="purchase-amount">${escapeHtml(p.total_price)}</div>
          </div>
        `).join('');

        // 购买记录入场动画
        animateChildren(container, '.purchase-item', { delay: 60, fromLeft: 20 });
      }
    }
  } catch (err) {
    console.error('加载购买历史失败:', err);
  }
}

// ===== 累计花费趋势图表 =====

async function renderSpendingChart() {
  const container = document.getElementById('spendingChart');

  // 如果没有购买记录，使用已有的空状态
  if (allPurchases.length === 0) {
    return;
  }

  // 按日期分组聚合
  const daily = {};
  allPurchases.forEach(p => {
    const day = p.created_at.slice(0, 10); // 'YYYY-MM-DD'
    daily[day] = (daily[day] || 0) + p.total_price;
  });

  // 排序并计算累计花费
  const sorted = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
  let cumulative = 0;
  const points = sorted.map(([date, amount]) => {
    cumulative += amount;
    return { date, cumulative, raw: amount };
  });

  if (points.length === 0) return;

  // SVG 配置
  const width = 600;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = points[points.length - 1].cumulative || 1;

  // 生成坐标点
  const pts = points.map((p, i) => ({
    x: padding.left + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW),
    y: padding.top + chartH - (p.cumulative / maxVal) * chartH
  }));

  // 构建平滑曲线（Catmull-Rom → Cubic Bezier）
  function buildSmoothPath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const linePath = buildSmoothPath(pts);
  const closePath = `L ${pts[pts.length - 1].x} ${padding.top + chartH} L ${pts[0].x} ${padding.top + chartH} Z`;
  const areaPath = linePath + closePath;

  // 网格线和 Y 轴标签
  const gridLines = 4;
  let gridSVG = '';
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (i / gridLines) * chartH;
    const val = Math.round(maxVal * (1 - i / gridLines));
    gridSVG += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line"/>`;
    gridSVG += `<text x="${padding.left - 8}" y="${y + 4}" class="chart-label" text-anchor="end">${val}</text>`;
  }

  // X 轴日期标签
  let xLabels = '';
  const labelStep = Math.max(1, Math.floor(points.length / 5));
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === points.length - 1) {
      const x = pts[i].x;
      const labelDate = p.date.slice(5); // 'MM-DD'
      xLabels += `<text x="${x}" y="${height - 5}" class="chart-label" text-anchor="middle">${labelDate}</text>`;
    }
  });

  // 数据点（带交错弹入动画）
  let dotsSVG = '';
  pts.forEach((p, i) => {
    dotsSVG += `<circle class="chart-dot" cx="${p.x}" cy="${p.y}" r="4"
      style="animation: popIn 0.3s ${i * 0.05}s both cubic-bezier(0.22, 1, 0.36, 1);"/>`;
  });

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}">
    ${gridSVG}
    <path d="${areaPath}" class="chart-area"/>
    <path d="${linePath}" class="chart-line"/>
    ${dotsSVG}
    ${xLabels}
  </svg>`;

  // 图表卡片入场动画
  const chartCard = document.getElementById('chartCard');
  if (chartCard) {
    animateChildren(chartCard, '.chart-container', { fromTop: 30 });
  }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', loadHome);
