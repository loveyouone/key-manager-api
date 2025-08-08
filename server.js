require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

// 初始化
const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 全局错误处理
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT ERROR]', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
});

// 数据库配置
const dbConfig = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 30000
};

let dbClient;
let isDbConnected = false;

// 数据库连接
async function connectDB() {
  try {
    dbClient = new MongoClient(process.env.MONGODB_URI, dbConfig);
    await dbClient.connect();
    isDbConnected = true;
    console.log('✅ MongoDB连接成功');
  } catch (err) {
    console.error('❌ MongoDB连接失败:', err);
    isDbConnected = false;
    throw err;
  }
}

// 数据库状态中间件
app.use(async (req, res, next) => {
  if (!isDbConnected) {
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
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 健康检查
app.get('/health', async (req, res) => {
  try {
    await dbClient.db().command({ ping: 1 });
    res.json({
      status: 'healthy',
      database: 'connected',
      uptime: process.uptime(),
      memory: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: err.message
    });
  }
});

// 获取卡密（简化版）
app.get('/api/keys', async (req, res) => {
  try {
    const collection = dbClient.db('key_db').collection('keys');
    const keys = await collection.find().limit(100).toArray();
    
    res.json({
      success: true,
      count: keys.length,
      data: keys
    });
  } catch (err) {
    console.error('[GET /keys] 错误:', err);
    res.status(500).json({
      success: false,
      error: '数据库查询失败',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

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
