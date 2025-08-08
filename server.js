require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const apicache = require('apicache');
const helmet = require('helmet');

// 初始化
const app = express();
const port = process.env.PORT || 3000;
const cache = apicache.middleware;
let dbClient;

// 安全增强
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 连接MongoDB
async function connectDB() {
  try {
    dbClient = new MongoClient(process.env.MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 50,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    await dbClient.connect();
    console.log('✅ MongoDB连接成功');
  } catch (err) {
    console.error('❌ MongoDB连接失败:', err);
    process.exit(1);
  }
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: dbClient ? 'healthy' : 'degraded',
    db: dbClient?.isConnected() ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`
  });
});

// 数据库中间件
app.use(async (req, res, next) => {
  if (!dbClient?.isConnected()) {
    try {
      await connectDB();
    } catch (err) {
      return res.status(503).json({ 
        error: '数据库服务不可用',
        details: err.message 
      });
    }
  }
  next();
});

// 带缓存的卡密查询
app.get('/api/keys', cache('30 seconds'), async (req, res) => {
  try {
    const keys = await dbClient.db('key_db').collection('keys').find().toArray();
    res.json({ success: true, data: keys });
  } catch (err) {
    console.error('数据库查询失败:', err);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误',
      requestId: req.id 
    });
  }
});

// 其他路由...(保持原有bind/unbind路由)

// 启动服务
(async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`🚀 服务运行中: http://localhost:${port}`);
  });
})();

// 优雅关闭
process.on('SIGTERM', async () => {
  await dbClient?.close();
  process.exit(0);
});
