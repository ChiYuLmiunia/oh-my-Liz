const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// 获取所有用户列表 (需要主播或管理员权限)
router.get('/', authenticateToken, authorizeRoles('admin', 'streamer'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, role, balance, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `).all();

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取用户列表失败', error: err.message });
  }
});

// 获取待审核用户列表 (需要管理员权限)
router.get('/pending', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const pendingUsers = db.prepare(`
      SELECT id, username, role, balance, created_at, updated_at 
      FROM users 
      WHERE role = 'pending'
      ORDER BY created_at DESC
    `).all();

    res.json({ success: true, data: pendingUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取待审核列表失败', error: err.message });
  }
});

// 审核用户账号 (批准/拒绝) - 仅管理员
router.put('/approve/:userId', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['user', 'streamer'].includes(role)) {
    return res.status(400).json({ success: false, message: '角色必须是 user 或 streamer' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND role = \'pending\'').get(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在或已审核' });
    }

    db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(role, userId);

    res.json({ success: true, message: `账号已审核，角色设置为: ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, message: '审核失败', error: err.message });
  }
});

// 修改用户角色 (需要管理员权限)
router.put('/role/:userId', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['user', 'streamer', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: '无效的角色' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (user.username === 'admin') {
      return res.status(403).json({ success: false, message: '不能修改系统管理员账号' });
    }

    db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(role, userId);

    res.json({ success: true, message: '角色修改成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: '修改角色失败', error: err.message });
  }
});

// 添加鼠鼠币 (需要主播或管理员权限)
router.put('/balance/:userId', authenticateToken, authorizeRoles('admin', 'streamer'), (req, res) => {
  const { userId } = req.params;
  const { amount, operation } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ success: false, message: '请输入有效的金额' });
  }

  if (!['add', 'subtract', 'set'].includes(operation)) {
    return res.status(400).json({ success: false, message: '操作类型必须是 add, subtract 或 set' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    let newBalance;
    switch (operation) {
      case 'add':
        newBalance = user.balance + parseInt(amount);
        break;
      case 'subtract':
        newBalance = Math.max(0, user.balance - parseInt(amount));
        break;
      case 'set':
        newBalance = Math.max(0, parseInt(amount));
        break;
    }

    db.prepare('UPDATE users SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newBalance, userId);

    res.json({
      success: true,
      message: '余额修改成功',
      data: { username: user.username, newBalance }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '修改余额失败', error: err.message });
  }
});

module.exports = router;
