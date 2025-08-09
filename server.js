require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

// 初始化
const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 增强的CORS配置 - 专门为Roblox设计
app.use((req, res, next) => {
  // 允许Roblox所有域名
  const allowedOrigins = [
    'https://www.roblox.com',
    'https://web.roblox.com',
    'https://*.roblox.com'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Roblox-Place-Id');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('Strict-Transport-Security', 'max-age=63072000');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

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
  maxPoolSize: 5, // 减少连接数以避免MongoDB免费层限制
  connectTimeoutMS: 15000,
  socketTimeoutMS: 30000
};

// 使用连接池而不是单一连接
let dbClient;
const MAX_RETRIES = 3;

async function getDatabase() {
  if (dbClient && dbClient.topology && dbClient.topology.isConnected()) {
    return dbClient.db('key_db');
  }
  
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      console.log(`尝试连接数据库 (尝试 ${retries + 1}/${MAX_RETRIES})...`);
      const client = new MongoClient(process.env.MONGODB_URI, dbConfig);
      await client.connect();
      
      // 创建索引
      const db = client.db('key_db');
      await db.collection('keys').createIndex({ key: 1 }, { unique: true });
      console.log('✅ MongoDB连接成功并索引就绪');
      
      dbClient = client;
      return db;
    } catch (err) {
      console.error(`❌ 数据库连接失败 (尝试 ${retries + 1}):`, err.message);
      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒重试
    }
  }
  
  throw new Error('无法连接到数据库');
}

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    res.json({
      status: 'healthy',
      database: 'connected',
      uptime: process.uptime(),
      memory: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`,
      node: process.version
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: err.message
    });
  }
});

// 卡密验证端点
app.post('/api/validate', async (req, res) => {
  try {
    const { key, playerId } = req.body;
    
    // 增强参数验证
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "无效的卡密格式"
      });
    }
    
    if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "无效的玩家ID格式"
      });
    }
    
    const db = await getDatabase();
    const collection = db.collection('keys');
    const keyData = await collection.findOne({ key: key.trim() });
    
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
        message: "验证成功",
        keyType: "通用"
      });
    }
    
    // 绑定卡密检查
    if (keyData.playerid !== playerId.trim()) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: "卡密未绑定到此账号",
        boundTo: keyData.playerid
      });
    }
    
    res.status(200).json({
      success: true,
      valid: true,
      reward: keyData.reward || "欢迎使用",
      message: "验证成功",
      keyType: "绑定"
    });
    
  } catch (error) {
    console.error("验证错误:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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
    
    if (!key || !expireDate) {
      return res.status(400).json({
        success: false,
        error: "缺少必要参数: key 或 expireDate"
      });
    }
    
    // 转换日期为Unix时间戳
    const expireTime = Math.floor(new Date(expireDate).getTime() / 1000);
    
    if (isNaN(expireTime)) {
      return res.status(400).json({
        success: false,
        error: "无效的日期格式"
      });
    }
    
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

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误:', err.stack);
  res.status(500).json({
    status: 'error',
    message: '内部服务器错误',
    timestamp: new Date().toISOString()
  });
});

// 启动服务
app.listen(port, () => {
  console.log(`🚀 服务已启动: http://localhost:${port}`);
  console.log(`🔍 健康检查: http://localhost:${port}/health`);
});

module.exports = app;
