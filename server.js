require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

// 初始化
const app = express();
const port = process.env.PORT || 3000;

// 安全中间件
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 全局错误捕获
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] 未捕获异常:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] 未处理的Promise拒绝:', reason);
});

// 数据库连接池
let db;
const dbOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 30000,
  retryWrites: true,
  retryReads: true
};

async function connectDB() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI, dbOptions);
    await client.connect();
    db = client.db('key_db');
    console.log('✅ MongoDB连接成功');
    return client;
  } catch (err) {
    console.error('❌ MongoDB连接失败:', err);
    throw err;
  }
}

// 数据库健康检查中间件
app.use(async (req, res, next) => {
  if (!db) {
    try {
      await connectDB();
    } catch (err) {
      return res.status(503).json({
        status: 'database_error',
        message: '数据库服务不可用',
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
});

// 基础路由
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    endpoints: {
      keys: 'GET /api/keys',
      bind: 'POST /api/bind',
      unbind: 'POST /api/unbind',
      health: 'GET /health'
    },
    server: 'Vercel Node.js',
    timestamp: new Date().toISOString()
  });
});

// 健康检查
app.get('/health', async (req, res) => {
  try {
    await db.command({ ping: 1 });
    res.json({
      status: 'healthy',
      db: 'connected',
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      db: 'disconnected',
      error: err.message
    });
  }
});

// 卡密API
app.get('/api/keys', async (req, res) => {
  try {
    const keys = await db.collection('keys').find().limit(100).toArray();
    res.json({
      success: true,
      count: keys.length,
      data: keys
    });
  } catch (err) {
    console.error('[GET /keys] 错误:', err);
    res.status(500).json({
      success: false,
      error: '数据库查询失败'
    });
  }
});

// 其他API路由... (保持原有实现)

// 启动服务
(async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`🚀 服务已启动: http://localhost:${port}`);
    });
  } catch (err) {
    console.error('服务启动失败:', err);
    process.exit(1);
  }
})();

module.exports = app;
