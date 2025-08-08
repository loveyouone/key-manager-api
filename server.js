const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const rateLimit = require('express-rate-limit'); // 可选：防刷保护

// 初始化Express
const app = express();
const port = process.env.PORT || 3000;

// 环境变量验证
if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// 速率限制（API保护）
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP限制100次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false,
    error: "请求过于频繁，请稍后再试" 
  }
});

// 中间件配置
app.use(bodyParser.json({ limit: '10kb' })); // 限制请求体大小
app.use(express.urlencoded({ extended: true }));

// 增强CORS配置
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // 预检请求直接返回200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// MongoDB连接池
let dbClient;
async function connectDB() {
  if (dbClient && dbClient.isConnected()) {
    return dbClient;
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    });
    
    await client.connect();
    dbClient = client;
    console.log('MongoDB连接成功');
    return client;
  } catch (err) {
    console.error('MongoDB连接失败:', err);
    throw err;
  }
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dbStatus: dbClient && dbClient.isConnected() ? 'connected' : 'disconnected'
  });
});

// API路由
app.use('/api', apiLimiter); // 应用速率限制

// 卡密查询
app.get('/api/keys', async (req, res) => {
  try {
    const client = await connectDB();
    const db = client.db('key_db');
    const keys = await db.collection('keys').find({}).toArray();
    
    const result = {};
    keys.forEach(key => {
      result[key.key] = {
        playerid: key.playerid,
        reward: key.reward,
        ...(key.expiretime && { expiretime: key.expiretime })
      };
    });
    
    res.status(200).json(result);
  } catch (err) {
    console.error('GET /api/keys 错误:', err);
    res.status(500).json({ 
      success: false,
      error: "获取卡密失败" 
    });
  }
});

// 卡密绑定
app.post('/api/bind', async (req, res) => {
  try {
    const { key, playerId } = req.body;
    
    if (!key || !playerId) {
      return res.status(400).json({
        success: false,
        error: "缺少必要参数: key 或 playerId"
      });
    }

    const client = await connectDB();
    const db = client.db('key_db');
    
    const result = await db.collection('keys').updateOne(
      { key },
      {
        $set: { 
          playerid: playerId,
          updatedAt: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date(),
          reward: "自动创建卡密",
          expiretime: null
        }
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "卡密绑定成功",
      key,
      playerId,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('POST /api/bind 错误:', err);
    res.status(500).json({ 
      success: false,
      error: "绑定卡密失败" 
    });
  }
});

// 卡密解绑
app.post('/api/unbind', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: "缺少必要参数: key"
      });
    }

    const client = await connectDB();
    const db = client.db('key_db');
    
    const result = await db.collection('keys').updateOne(
      { key },
      { $set: { 
        playerid: '待定',
        updatedAt: new Date() 
      }}
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "卡密不存在"
      });
    }

    res.status(200).json({
      success: true,
      message: "卡密解绑成功",
      key,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('POST /api/unbind 错误:', err);
    res.status(500).json({ 
      success: false,
      error: "解绑卡密失败" 
    });
  }
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: "Endpoint not found" 
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('全局错误:', err.stack);
  res.status(500).json({ 
    success: false,
    error: "服务器内部错误" 
  });
});

// 启动服务器
async function startServer() {
  try {
    await connectDB(); // 预先建立数据库连接
    app.listen(port, () => {
      console.log(`卡密管理系统运行中，端口: ${port}`);
      console.log(`API文档:`);
      console.log(`- GET  /health         服务健康检查`);
      console.log(`- GET  /api/keys       获取所有卡密`);
      console.log(`- POST /api/bind       绑定卡密到玩家`);
      console.log(`- POST /api/unbind     解绑卡密`);
    });
  } catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到关闭信号，正在清理资源...');
  if (dbClient) {
    await dbClient.close();
  }
  process.exit(0);
});

startServer();
