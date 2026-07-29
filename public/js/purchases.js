const typeMap = {
  virtual_rights: '虚拟权益',
  physical_gift: '实体礼物',
  privilege: '特权'
};

async function loadPurchases() {
  animatePageLoad();

  const user = getUser();
  if (!user || user.role === 'pending') {
    window.location.href = '/';
    return;
  }

  document.getElementById('navUsername').textContent = user.username;
  document.getElementById('navBalance').textContent = user.balance;

  try {
    const result = await productAPI.getPurchaseHistory();
    if (result.success) {
      renderPurchases(result.data);
    }
  } catch (err) {
    console.error('加载购买记录失败:', err);
  }
}

function renderPurchases(purchases) {
  const container = document.getElementById('purchaseList');

  if (purchases.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🐭</div>
        <p>还没有购买记录哦~</p>
      </div>
    `;
    return;
  }

  container.innerHTML = purchases.map(p => `
    <div class="purchase-item">
      <div class="purchase-info">
        <div class="purchase-product">
          ${typeMap[p.product_type] || p.product_type} - ${p.product_name}
        </div>
        <div class="purchase-time">${new Date(p.created_at).toLocaleString('zh-CN')}</div>
      </div>
      <div class="purchase-amount">${p.total_price}</div>
    </div>
  `).join('');

  // 购买记录入场动画
  animateChildren(container, '.purchase-item', { delay: 60, fromLeft: 20 });
}

document.addEventListener('DOMContentLoaded', loadPurchases);
