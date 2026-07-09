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

async function loadHome() {
  const user = getUser();
  if (!user || user.role === 'pending') {
    window.location.href = '/';
    return;
  }

  try {
    // 更新导航栏
    document.getElementById('navUsername').textContent = user.username;
    document.getElementById('navBalance').textContent = user.balance;

    // 更新主页统计
    document.getElementById('homeBalance').textContent = user.balance;
    document.getElementById('homeRole').textContent = roleMap[user.role] || user.role;

    // 显示管理员链接
    if (user.role === 'admin' || user.role === 'streamer') {
      document.getElementById('adminLink').style.display = 'inline';
    }

    // 加载购买历史
    await loadPurchaseHistory();
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
              <div class="purchase-product">${p.product_name}</div>
              <div class="purchase-time">${new Date(p.created_at).toLocaleString('zh-CN')}</div>
            </div>
            <div class="purchase-amount">${p.total_price}</div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('加载购买历史失败:', err);
  }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', loadHome);
