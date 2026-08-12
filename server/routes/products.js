const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// 获取所有已上架商品 (公开)
router.get('/listed', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, u.username as creator_name 
      FROM products p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.is_listed = 1
      ORDER BY p.created_at DESC
    `).all();

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取商品列表失败', error: err.message });
  }
});

// 获取所有商品 (需要主播或管理员权限)
router.get('/', authenticateToken, authorizeRoles('admin', 'streamer'), (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, u.username as creator_name 
      FROM products p
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC
    `).all();

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取商品列表失败', error: err.message });
  }
});

// 创建商品 (需要主播或管理员权限)
router.post('/', authenticateToken, authorizeRoles('admin', 'streamer'), (req, res) => {
  const { name, description, price, type } = req.body;

  if (!name || !price || !type) {
    return res.status(400).json({ success: false, message: '请填写完整信息' });
  }

  if (!['virtual_rights', 'physical_gift', 'privilege'].includes(type)) {
    return res.status(400).json({ success: false, message: '无效的商品类型' });
  }

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum !== Math.floor(priceNum)) {
    return res.status(400).json({ success: false, message: '价格必须为大于0的整数' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO products (name, description, price, type, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, description || '', parseInt(price), type, req.user.id);

    db.prepare('UPDATE products SET updated_at = datetime(\'now\') WHERE id = ?').run(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: '商品创建成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '创建商品失败', error: err.message });
  }
});

// 更新商品 (上架/下架)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'streamer'), (req, res) => {
  const { id } = req.params;
  const { is_listed, name, description, price, type } = req.body;

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    const updates = [];
    const values = [];

    if (is_listed !== undefined) {
      updates.push('is_listed = ?');
      values.push(is_listed ? 1 : 0);
    }
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (price) {
      updates.push('price = ?');
      values.push(parseInt(price));
    }
    if (type) {
      updates.push('type = ?');
      values.push(type);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);

      db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    res.json({ success: true, message: '商品更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: '更新商品失败', error: err.message });
  }
});

// 删除商品
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'streamer'), (req, res) => {
  const { id } = req.params;

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    res.json({ success: true, message: '商品删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: '删除商品失败', error: err.message });
  }
});

// 购买商品
router.post('/purchase/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_listed = 1').get(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在或未上架' });
    }

    if (user.balance < product.price) {
      return res.status(400).json({ success: false, message: '鼠鼠币余额不足' });
    }

    // Wrap in a transaction so balance deduction and purchase record are atomic
    const txn = db.transaction(() => {
      const newBalance = user.balance - product.price;
      db.prepare('UPDATE users SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newBalance, user.id);

      db.prepare(`
        INSERT INTO purchases (user_id, product_id, quantity, total_price)
        VALUES (?, ?, 1, ?)
      `).run(user.id, product.id, product.price);

      return { newBalance };
    });

    const { newBalance } = txn();

    res.json({
      success: true,
      message: '购买成功！',
      data: {
        product: { name: product.name, type: product.type },
        remainingBalance: newBalance
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '购买失败', error: err.message });
  }
});

// 获取用户购买历史
router.get('/purchases/history', authenticateToken, (req, res) => {
  try {
    const purchases = db.prepare(`
      SELECT p.*, pr.name as product_name, pr.type as product_type
      FROM purchases p
      LEFT JOIN products pr ON p.product_id = pr.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);

    res.json({ success: true, data: purchases });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取购买历史失败', error: err.message });
  }
});

module.exports = router;
