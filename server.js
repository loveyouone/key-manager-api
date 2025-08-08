require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

// 初始化
const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 添加favicon处理中间件
app.get('/favicon.ico', (req, res) => res.status(204).end());

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

async function connectDB() {
  try {
    dbClient = new MongoClient(process.env.MONGODB_URI, dbConfig);
    await dbClient.connect();
    isDbConnected = true;
    console.log(' MongoDB连接成功');
  } catch (err) {
    console.error(' MongoDB连接失败:', err);
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
      validate: 'POST /api/validate',
      set_expire: 'POST /api/set_expire',
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

// 获取卡密
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

// 卡密验证
app.post('/api/validate', async (req, res) => {
  try {
    const { key, playerId } = req.body;
    
    // 实时验证卡密
    const collection = dbClient.db('key_db').collection('keys');
    const keyData = await collection.findOne({ key });
    
    if (!keyData) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: "卡密不存在"
      });
    }
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    // 通用卡密检查
    if (keyData.playerid === "all") {
      if (keyData.expiretime && currentTimestamp > keyData.expiretime) {
        return res.status(200).json({
          success: false,
          valid: false,
          error: "卡密已过期"
        });
      }
      return res.status(200).json({
        success: true,
        valid: true,
        reward: keyData.reward || "欢迎使用",
        message: "验证成功"
      });
    }
    
    // 绑定卡密检查
    if (keyData.playerid !== playerId) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: "卡密未绑定到此账号"
      });
    }
    
    res.status(200).json({
      success: true,
      valid: true,
      reward: keyData.reward || "欢迎使用",
      message: "验证成功"
    });
    
  } catch (error) {
    console.error("验证错误:", error);
    res.status(500).json({
      success: false,
      error: "验证过程出错"
    });
  }
});

// 绑定卡密
app.post('/api/bind', async (req, res) => {
  try {
    const { key, playerId } = req.body;
    
    // 自动处理绑定
    const collection = dbClient.db('key_db').collection('keys');
    
    const result = await collection.updateOne(
      { key },
      {
        $set: { 
          playerid: playerId,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
          reward: "欢迎",
          expiretime: null
        }
      },
      { upsert: true }
    );
    
    res.status(200).json({
      success: true,
      message: "卡密绑定成功",
      key: key,
      playerId: playerId,
      created: result.upsertedCount > 0
    });
  } catch (error) {
    console.error("绑定错误:", error);
    res.status(500).json({
      success: false,
      error: "自动绑定失败: " + error.message
    });
  }
});

// 解绑卡密
app.post('/api/unbind', async (req, res) => {
  try {
    const { key } = req.body;
    
    // 自动处理解绑
    const collection = dbClient.db('key_db').collection('keys');
    
    const result = await collection.updateOne(
      { key },
      { $set: { 
        playerid: '待定',
        updatedAt: new Date(),
        expiretime: null
      }}
    );
    
    if (result.matchedCount === 0) {
      return res.status(200).json({
        success: false,
        error: "卡密不存在"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "卡密解绑成功",
      key: key
    });
  } catch (error) {
    console.error("解绑错误:", error);
    res.status(500).json({
      success: false,
      error: "自动解绑失败: " + error.message
    });
  }
});

// 设置到期时间
app.post('/api/set_expire', async (req, res) => {
  try {
    const { key, expireDate } = req.body;
    
    // 转换日期为Unix时间戳
    const expireTime = Math.floor(new Date(expireDate).getTime() / 1000);
    
    // 自动设置到期时间
    const collection = dbClient.db('key_db').collection('keys');
    
    const result = await collection.updateOne(
      { key, playerid: "all" }, // 仅限通用卡密
      { $set: { 
        expiretime: expireTime,
        updatedAt: new Date()
      }}
    );
    
    if (result.matchedCount === 0) {
      return res.status(200).json({
        success: false,
        error: "通用卡密不存在"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "到期时间设置成功",
      key: key,
      expireTime: expireTime
    });
  } catch (error) {
    console.error("设置到期时间错误:", error);
    res.status(500).json({
      success: false,
      error: "自动设置失败: " + error.message
    });
  }
});

// 启动服务
(async () => {
  try {
    await connectDB();
    
    // 创建索引（确保唯一性）
    const db = dbClient.db('key_db');
    const collection = db.collection('keys');
    await collection.createIndex({ key: 1 }, { unique: true });
    console.log(' 唯一索引创建成功');
    
    app.listen(port, () => {
      console.log(` 服务已启动: http://localhost:${port}`);
    });
  } catch (err) {
    console.error('服务启动失败:', err);
    process.exit(1);
  }
})();

module.exports = app;
