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

    // 查找卡密
    const keyDoc = await collection.findOne({ key });
    if (!keyDoc) {
      console.warn(`[UNBIND] 卡密不存在: ${key}`);
      return res.status(404).json({ error: '卡密不存在' });
    }
    
    // 检查卡密是否绑定 - 使用小写字段 playerid
    if (!keyDoc.playerid || keyDoc.playerid === '待定') {
      console.warn(`[UNBIND] 卡密未绑定: ${key}`);
      return res.status(400).json({ error: '卡密尚未绑定，无需解绑' });
    }
    
    // 更新卡密 - 使用小写字段 playerid 和 lastunbind
    const result = await collection.updateOne(
      { key },
      { 
        $set: { 
          playerid: '待定',
          expiretime: null,
          lastunbind: new Date()   // 改为小写
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
