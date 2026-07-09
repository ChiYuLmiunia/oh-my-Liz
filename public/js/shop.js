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

const typeIcons = {
  virtual_rights: '🎫',
  physical_gift: '🎁',
  privilege: '⭐'
};

let allProducts = [];
let currentFilter = 'all';

async function loadShop() {
  const user = getUser();
  if (!user || user.role === 'pending') {
    window.location.href = '/';
    return;
  }

  document.getElementById('navUsername').textContent = user.username;
  document.getElementById('navBalance').textContent = user.balance;

  await loadProducts();
}

async function loadProducts() {
  try {
    const result = await productAPI.getListed();
    if (result.success) {
      allProducts = result.data;
      renderProducts();
    }
  } catch (err) {
    console.error('加载商品失败:', err);
  }
}

function renderProducts() {
  const container = document.getElementById('productsGrid');
  let products = currentFilter === 'all' 
    ? allProducts 
    : allProducts.filter(p => p.type === currentFilter);

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="icon">🐭</div>
        <p>暂无商品~</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="product-card">
      <span class="product-type ${p.type}">${typeIcons[p.type] || ''} ${typeMap[p.type] || p.type}</span>
      <div class="product-name">${p.name}</div>
      <div class="product-desc">${p.description || '暂无描述'}</div>
      <div class="product-price">${p.price}</div>
      <div class="product-footer">
        <span class="product-creator">由 ${p.creator_name || '系统'} 上架</span>
        <button class="btn btn-primary btn-sm" onclick="showPurchaseConfirm(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.price})">
          购买
        </button>
      </div>
    </div>
  `).join('');
}

function filterProducts(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderProducts();
}

function showPurchaseConfirm(productId, productName, price) {
  const user = getUser();
  const canAfford = user.balance >= price;

  document.getElementById('purchaseModalContent').innerHTML = `
    <p style="margin-bottom: 1rem;">
      <strong>商品：</strong>${productName}<br>
      <strong>价格：</strong><span style="color: var(--primary-dark); font-size: 1.5rem; font-weight: bold;">${price} 鼠鼠币</span>
    </p>
    <p style="margin-bottom: 1.5rem; color: ${canAfford ? 'var(--success)' : 'var(--danger)'};">
      ${canAfford 
        ? `✅ 您的余额 (${user.balance}) 充足` 
        : `❌ 余额不足！您需要 ${price - user.balance} 更多鼠鼠币`}
    </p>
    <div style="display: flex; gap: 1rem;">
      <button class="btn ${canAfford ? 'btn-success' : 'btn-danger'}" 
              onclick="confirmPurchase(${productId}, ${price})" 
              ${!canAfford ? 'disabled' : ''}>
        ${canAfford ? '🛒 确认购买' : '💸 余额不足'}
      </button>
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    </div>
  `;

  document.getElementById('purchaseModal').classList.add('active');
}

function closeModal() {
  document.getElementById('purchaseModal').classList.remove('active');
}

async function confirmPurchase(productId, price) {
  try {
    const result = await productAPI.purchase(productId);
    if (result.success) {
      closeModal();
      showMessage(result.message, 'success');
      
      // 更新余额
      const user = getUser();
      user.balance = result.data.remainingBalance;
      localStorage.setItem('user', JSON.stringify(user));
      document.getElementById('navBalance').textContent = user.balance;

      // 刷新商品列表
      await loadProducts();

      setTimeout(() => {
        window.location.href = '/home';
      }, 1500);
    } else {
      showMessage(result.message);
    }
  } catch (err) {
    showMessage(err.message);
  }
}

function showMessage(message, type = 'error') {
  const msgDiv = document.getElementById('message');
  msgDiv.innerHTML = `<div class="message message-${type}">${message}</div>`;
  setTimeout(() => { msgDiv.innerHTML = ''; }, 5000);
}

// 页面加载
document.addEventListener('DOMContentLoaded', loadShop);

// 点击模态框外部关闭
document.getElementById('purchaseModal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeModal();
  }
});
