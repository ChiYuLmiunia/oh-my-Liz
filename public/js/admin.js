const roleMap = {
  admin: '👑 管理员',
  streamer: '🎤 主播',
  user: '🐭 普通用户',
  pending: '⏳ 待审核'
};

const typeMap = {
  virtual_rights: '🎫 虚拟权益',
  physical_gift: '🎁 实体礼物',
  privilege: '⭐ 特权'
};

async function loadAdmin() {
  animatePageLoad();

  const user = getUser();
  if (!user || !['admin', 'streamer'].includes(user.role)) {
    window.location.href = '/';
    return;
  }

  document.getElementById('navUsername').textContent = user.username;
  document.getElementById('navBalance').textContent = user.balance;

  await Promise.all([
    loadUsers(),
    loadPendingUsers(),
    loadProducts()
  ]);

  // 表格行入场动画
  setTimeout(() => {
    const usersTbody = document.getElementById('usersTableBody');
    if (usersTbody) animateChildren(usersTbody, 'tr', { delay: 40 });

    const pendingTbody = document.getElementById('pendingTableBody');
    if (pendingTbody) animateChildren(pendingTbody, 'tr', { delay: 40 });

    const productsTbody = document.getElementById('productsTableBody');
    if (productsTbody) animateChildren(productsTbody, 'tr', { delay: 40 });
  }, 100);
}

function switchAdminTab(tabName, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

async function loadUsers() {
  try {
    const result = await userAPI.getAll();
    if (result.success) {
      renderUsers(result.data);
    }
  } catch (err) {
    console.error('加载用户失败:', err);
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">暂无用户</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${escapeHtml(u.id)}</td>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td><span class="role-badge role-${escapeHtml(u.role)}">${roleMap[u.role] || u.role}</span></td>
      <td>${escapeHtml(u.balance)}</td>
      <td>${escapeHtml(new Date(u.created_at).toLocaleDateString('zh-CN'))}</td>
      <td class="action-buttons">
        <button class="btn btn-primary btn-sm" onclick="openBalanceModal(${u.id}, '${escapeHtml(u.username).replace(/'/g, "\\'")}')">💰</button>
        ${u.role !== 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="openRoleModal(${u.id}, '${escapeHtml(u.username).replace(/'/g, "\\'")}')">🔄</button>` : '<span style="color: var(--text-light); font-size: 0.85rem;">不可修改</span>'}
      </td>
    </tr>
  `).join('');
}

async function loadPendingUsers() {
  try {
    const result = await userAPI.getPending();
    if (result.success) {
      renderPendingUsers(result.data);
    }
  } catch (err) {
    console.error('加载待审核用户失败:', err);
  }
}

function renderPendingUsers(users) {
  const tbody = document.getElementById('pendingTableBody');
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--success);">✅ 暂无待审核用户</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${escapeHtml(u.id)}</td>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td>${escapeHtml(new Date(u.created_at).toLocaleDateString('zh-CN'))}</td>
      <td class="action-buttons">
        <button class="btn btn-success btn-sm" onclick="approveUser(${u.id}, '${escapeHtml(u.username).replace(/'/g, "\\'")}', 'user')">🐭 普通用户</button>
        <button class="btn btn-primary btn-sm" onclick="approveUser(${u.id}, '${escapeHtml(u.username).replace(/'/g, "\\'")}', 'streamer')">🎤 主播</button>
      </td>
    </tr>
  `).join('');
}

async function approveUser(userId, username, role) {
  if (!confirm(`确定要审核通过 ${username} 吗？将设置为 ${roleMap[role]} 角色`)) {
    return;
  }

  try {
    const result = await userAPI.approve(userId, role);
    if (result.success) {
      showMessage(result.message, 'success');
      await loadPendingUsers();
      await loadUsers();
    } else {
      showMessage(result.message);
    }
  } catch (err) {
    showMessage(err.message);
  }
}

async function loadProducts() {
  try {
    const result = await productAPI.getAll();
    if (result.success) {
      renderProducts(result.data);
    }
  } catch (err) {
    console.error('加载商品失败:', err);
  }
}

function renderProducts(products) {
  const tbody = document.getElementById('productsTableBody');
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">暂无商品</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td>${escapeHtml(p.id)}</td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${typeMap[p.type] || p.type}</td>
      <td>${escapeHtml(p.price)}</td>
      <td>
        <span class="role-badge ${p.is_listed ? 'role-user' : 'role-pending'}">
          ${p.is_listed ? '已上架' : '已下架'}
        </span>
      </td>
      <td class="action-buttons">
        <button class="btn ${p.is_listed ? 'btn-warning' : 'btn-success'} btn-sm"
                onclick="toggleProduct(${p.id}, ${!p.is_listed})">
          ${p.is_listed ? '⏸️ 下架' : '✅ 上架'}
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function toggleProduct(productId, isListed) {
  try {
    const result = await productAPI.update(productId, { is_listed: isListed });
    if (result.success) {
      showMessage(result.message, 'success');
      await loadProducts();
    }
  } catch (err) {
    showMessage(err.message);
  }
}

async function deleteProduct(productId, productName) {
  if (!confirm(`确定要删除商品 "${productName}" 吗？`)) {
    return;
  }

  try {
    const result = await productAPI.delete(productId);
    if (result.success) {
      showMessage(result.message, 'success');
      await loadProducts();
    }
  } catch (err) {
    showMessage(err.message);
  }
}

function openBalanceModal(userId, username) {
  document.getElementById('balanceUserId').value = userId;
  document.getElementById('balanceUsername').value = username;
  document.getElementById('balanceAmount').value = '';
  document.getElementById('balanceOperation').value = 'add';
  updateBalanceLabel();
  document.getElementById('balanceModal').classList.add('active');
}

function updateBalanceLabel() {
  const operation = document.getElementById('balanceOperation').value;
  const labels = {
    add: '添加数量',
    subtract: '减少数量',
    set: '设置余额'
  };
  document.getElementById('balanceAmountLabel').textContent = labels[operation];
}

async function handleUpdateBalance(e) {
  e.preventDefault();
  const userId = document.getElementById('balanceUserId').value;
  const amount = document.getElementById('balanceAmount').value;
  const operation = document.getElementById('balanceOperation').value;

  try {
    const result = await userAPI.updateBalance(userId, amount, operation);
    if (result.success) {
      closeModal('balanceModal');
      showMessage(result.message, 'success');
      await loadUsers();
    }
  } catch (err) {
    showMessage(err.message);
  }
}

function openRoleModal(userId, username) {
  document.getElementById('roleUserId').value = userId;
  document.getElementById('roleUsername').value = username;
  document.getElementById('roleSelect').value = 'user';
  document.getElementById('roleModal').classList.add('active');
}

async function handleUpdateRole(e) {
  e.preventDefault();
  const userId = document.getElementById('roleUserId').value;
  const role = document.getElementById('roleSelect').value;
  const username = document.getElementById('roleUsername').value;

  if (!confirm(`确定要将 ${username} 的角色修改为 ${roleMap[role]} 吗？`)) {
    return;
  }

  try {
    const result = await userAPI.updateRole(userId, role);
    if (result.success) {
      closeModal('roleModal');
      showMessage(result.message, 'success');
      await loadUsers();
    }
  } catch (err) {
    showMessage(err.message);
  }
}

async function handleCreateProduct(e) {
  e.preventDefault();

  const data = {
    name: document.getElementById('productName').value,
    type: document.getElementById('productType').value,
    price: document.getElementById('productPrice').value,
    description: document.getElementById('productDesc').value
  };

  try {
    const result = await productAPI.create(data);
    if (result.success) {
      showMessage(result.message, 'success');
      document.getElementById('createProductForm').reset();
      await loadProducts();
    }
  } catch (err) {
    showMessage(err.message);
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function showMessage(message, type = 'error') {
  const msgDiv = document.getElementById('message');
  msgDiv.innerHTML = `<div class="message message-${type}">${message}</div>`;
  setTimeout(() => { msgDiv.innerHTML = ''; }, 5000);
}

// 点击模态框外部关闭
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('active');
    }
  });
});

document.addEventListener('DOMContentLoaded', loadAdmin);
