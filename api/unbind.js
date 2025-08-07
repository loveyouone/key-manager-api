import { MongoClient } from 'mongodb';

// 共享连接池
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
  console.log(`[UNBIND] 收到解绑请求: ${JSON.stringify(req.body)}`);
  
  if (!req.body?.key) {
    console.warn('[UNBIND] 无效请求: 缺少卡密参数');
    return res.status(400).json({ error: '请求中缺少卡密参数' });
  }

  const { key } = req.body;
  
  try {
    const db = await getDatabase();
    const collection = db.collection('keys');

    // 修复字段大小写
    const keyDoc = await collection.findOne({ key });
    if (!keyDoc) {
      console.warn(`[UNBIND] 卡密不存在: ${key}`);
      return res.status(404).json({ error: '卡密不存在' });
    }
    
    if (!keyDoc.playerId || keyDoc.playerId === '待定') {
      console.warn(`[UNBIND] 卡密未绑定: ${key}`);
      return res.status(400).json({ error: '卡密尚未绑定，无需解绑' });
    }
    
    // 修复字段大小写
    const result = await collection.updateOne(
      { key },
      { 
        $set: { 
          playerId: '待定',
          expireTime: null,
          lastUnbind: new Date() 
        } 
      }
    );
    
    if (result.modifiedCount === 1) {
      console.log(`[UNBIND] 解绑成功: ${key}`);
      return res.status(200).json({ 
        success: true,
        message: '卡密解绑成功' 
      });
    } else {
      console.error(`[UNBIND] 解绑操作失败: ${key}`, result);
      return res.status(500).json({ error: '解绑操作失败' });
    }
  } catch (error) {
    console.error('[UNBIND] 服务器错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误',
      message: error.message
    });
  }
};
