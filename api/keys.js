import { MongoClient } from 'mongodb';

// 连接池管理
let cachedClient = null;

async function getDatabase() {
  if (cachedClient && cachedClient.isConnected()) {
    return cachedClient.db('key_db');
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not configured');

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
  });

  await client.connect();
  cachedClient = client;
  return client.db('key_db');
}

// 使用CommonJS导出
module.exports = async (req, res) => {
  console.log("==== 开始处理 /keys 请求 ====");
  
  try {
    const db = await getDatabase();
    console.log("使用的数据库: key_db");
    
    const collection = db.collection('keys');
    console.log("使用的集合: keys");
    console.log("查询所有卡密...");
    
    const keys = await collection.find({}).toArray();
    console.log(`找到 ${keys.length} 条卡密记录`);
    
    // 修复字段大小写问题并转换时间格式
    const result = {};
    keys.forEach(key => {
      result[key.key] = {
        playerid: key.playerId,  // 统一改为小写
        reward: key.reward        // 统一改为小写
      };
      
      // 如果存在过期时间，转换为Unix时间戳(秒)
      if (key.expireTime) {
        result[key.key].expiretime = Math.floor(key.expireTime.getTime() / 1000);
      }
    });
    
    console.log("返回卡密数据");
    return res.status(200).json(result);
    
  } catch (error) {
    console.error("处理过程中发生错误:", error);
    return res.status(500).json({ 
      error: '数据库操作失败',
      message: error.message
    });
  }
};
