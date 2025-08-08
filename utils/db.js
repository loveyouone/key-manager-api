import { MongoClient } from 'mongodb';

// 全局变量缓存连接
let cachedClient = null;
let cachedDb = null;

// MongoDB 连接 URI (从环境变量获取)
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    '请定义 MONGODB_URI 环境变量，格式：mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>'
  );
}

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    maxPoolSize: 50,
    retryWrites: true,
    retryReads: true
  });

  try {
    console.log('正在连接 MongoDB...');
    await client.connect();
    
    // 验证连接
    await client.db().admin().ping();
    console.log('✅ MongoDB 连接成功');

    // 指定数据库
    const db = client.db('key_db');
    
    // 缓存连接
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error);
    
    // 5秒后自动重试
    await new Promise(resolve => setTimeout(resolve, 5000));
    return connectToDatabase();
  }
}

// 自动关闭连接的清理钩子
process.on('SIGINT', async () => {
  if (cachedClient) {
    await cachedClient.close();
    console.log('MongoDB 连接已关闭');
    process.exit(0);
  }
});
