require('dotenv').config(); // 加载环境变量
const express = require('express');
const { MongoClient } = require('mongodb');

// 初始化
const app = express();
const port = process.env.PORT || 3000;

// 环境验证
if (!process.env.MONGODB_URI) {
  console.error('❌ 请设置MONGODB_URI环境变量');
  process.exit(1);
}

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS配置（生产环境应限制域名）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  req.method === 'OPTIONS' ? res.sendStatus(200) : next();
});

// 数据库连接
let db;
(async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    await client.connect();
    db = client.db('key_db');
    console.log('✅ MongoDB已连接');
  } catch (err) {
    console.error('❌ MongoDB连接失败:', err);
    process.exit(1);
  }
})();

// 根路由（必须存在！）
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    endpoints: [
      { method: 'GET', path: '/api/keys', desc: '获取所有卡密' },
      { method: 'POST', path: '/api/bind', desc: '绑定卡密' },
      { method: 'POST', path: '/api/unbind', desc: '解绑卡密' }
    ],
    timestamp: new Date().toISOString()
  });
});

// 示例API路由
app.get('/api/keys', async (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未连接' });
  
  try {
    const keys = await db.collection('keys').find().toArray();
    res.json({ success: true, data: keys });
  } catch (err) {
    console.error('获取卡密失败:', err);
    res.status(500).json({ success: false, error: '数据库查询失败' });
  }
});

// 404处理（必须放在路由最后）
app.use((req, res) => {
  res.status(404).json({ error: '端点不存在' });
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务已启动: http://localhost:${port}`);
});
