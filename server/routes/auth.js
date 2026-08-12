const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();

// Register (async bcrypt)
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '请填写完整信息' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: '密码至少6位' });
  }

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, 'pending');

    db.prepare('UPDATE users SET updated_at = datetime(\'now\') WHERE id = ?').run(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: '注册成功，等待管理员审核',
      data: { userId: result.lastInsertRowid }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '注册失败', error: err.message });
  }
});

// Login (async bcrypt)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '请填写完整信息' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    if (!await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    if (user.role === 'pending') {
      return res.status(403).json({ success: false, message: '账号待审核，请耐心等待' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          balance: user.balance
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '登录失败', error: err.message });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, role, balance, created_at FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取用户信息失败', error: err.message });
  }
});

module.exports = router;
