const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// 所有路由未匹配时，返回主页
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: '接口不存在' });
  }
  if (req.method === 'GET' && (req.path === '/home' || req.path === '/shop' || req.path === '/admin' || req.path === '/purchases')) {
    const pageMap = {
      '/home': 'home.html',
      '/shop': 'shop.html',
      '/admin': 'admin.html',
      '/purchases': 'purchases.html'
    };
    return res.sendFile(path.join(__dirname, '..', 'public', pageMap[req.path] || 'index.html'));
  }
  next();
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🐭 鼠鼠发展改革委员会已启动!`);
  console.log(`💰 访问地址: http://localhost:${PORT}`);
});

module.exports = app;
