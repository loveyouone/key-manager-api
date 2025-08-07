import { MongoClient } from 'mongodb';

export default async (req, res) => {
  console.log(`==== 处理 ${req.method} ${req.url} 请求 ====`);
  
  // 验证请求方法
  if (req.method !== 'POST') {
    console.warn(`错误请求方法: ${req.method}, 需要 POST`);
    return res.status(405).json({ 
      error: '方法不允许',
      allowed: ['POST'] 
    });
  }
  
  try {
    const { key } = req.body;
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error("MONGODB_URI not set");
    }
    
    const client = new MongoClient(uri);
    await client.connect();
    
    const database = client.db('key_db');
    const collection = database.collection('keys');
    
    // 检查卡密是否存在
    const keyData = await collection.findOne({ _id: key });
    if (!keyData) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    // 更新状态
    const result = await collection.updateOne(
      { _id: key },
      { $set: { playerId: 'unbound' } }
    );
    
    if (result.modifiedCount === 1) {
      res.status(200).json({ 
        success: true,
        message: `Key ${key} unbound`
      });
    } else {
      res.status(500).json({ error: 'Unbind operation failed' });
    }
    
    await client.close();
  } catch (error) {
    console.error('Unbind error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message
    });
  }
};
