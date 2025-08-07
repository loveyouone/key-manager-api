import { MongoClient } from 'mongodb';

export default async (req, res) => {
  console.log("==== 开始处理 /keys 请求 ====");
  
  const uri = process.env.MONGODB_URI;
  console.log("使用的 MONGODB_URI:", uri ? "已设置" : "未设置");
  
  if (!uri) {
    console.error("错误: MONGODB_URI 环境变量未配置");
    return res.status(500).json({ 
      error: '服务器配置错误: MONGODB_URI 未设置'
    });
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000 // 5秒超时
  });

  try {
    console.log("尝试连接 MongoDB...");
    await client.connect();
    console.log("成功连接到 MongoDB");
    
    const db = client.db('key_db');
    console.log("使用的数据库: key_db");
    
    const collection = db.collection('keys');
    console.log("使用的集合: keys");
    
    console.log("查询所有卡密...");
    const keys = await collection.find({}).toArray();
    console.log(`找到 ${keys.length} 条卡密记录`);
    
    // 格式转换
    const result = {};
    keys.forEach(key => {
      result[key._id] = {
        PlayerId: key.playerId,
        Reward: key.reward
      };
      if (key.expireTime) {
        result[key._id].ExpireTime = key.expireTime;
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
  } finally {
    if (client) {
      console.log("关闭数据库连接");
      await client.close();
    }
  }
};
