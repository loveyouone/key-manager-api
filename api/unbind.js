import { MongoClient } from 'mongodb';

export default async (req, res) => {
  console.log(`[UNBIND] 收到解绑请求: ${JSON.stringify(req.body)}`);
  
  // 验证请求
  if (!req.body?.key) {
    console.warn('[UNBIND] 无效请求: 缺少卡密参数');
    return res.status(400).json({ 
      error: '请求中缺少卡密参数' 
    });
  }

  const { key } = req.body;
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI 未设置');
    return res.status(500).json({ error: '服务器配置错误' });
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000
  });

  try {
    await client.connect();
    const db = client.db('key_db');
    const collection = db.collection('keys');

    // 查找卡密 (确保字段大小写一致)
    const keyDoc = await collection.findOne({ key });
    if (!keyDoc) {
      console.warn(`[UNBIND] 卡密不存在: ${key}`);
      return res.status(404).json({ 
        error: '卡密不存在' 
      });
    }
    
    // 检查绑定状态
    if (!keyDoc.playerId || keyDoc.playerId === '待定') {
      console.warn(`[UNBIND] 卡密未绑定: ${key}`);
      return res.status(400).json({ 
        error: '卡密尚未绑定，无需解绑' 
      });
    }
    
    // 执行解绑 (保持字段大小写一致)
    const result = await collection.updateOne(
      { key },
      { 
        $set: { 
          playerId: '待定',  // 注意小写p
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
      return res.status(500).json({ 
        error: '解绑操作失败' 
      });
    }
  } catch (error) {
    console.error('[UNBIND] 服务器错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误',
      message: error.message
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
};
