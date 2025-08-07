import { MongoClient } from 'mongodb';

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { key } = req.body;
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    
    await client.connect();
    const database = client.db('key_db');
    const collection = database.collection('keys');
    
    // 检查卡密是否存在
    const keyData = await collection.findOne({ _id: key });
    if (!keyData) {
      return res.status(404).json({ error: '卡密不存在' });
    }
    
    // 检查是否为通用卡密
    if (keyData.playerId === 'all') {
      return res.status(400).json({ error: '通用卡密不能解绑' });
    }
    
    // 更新卡密状态
    const result = await collection.updateOne(
      { _id: key },
      { $set: { playerId: '待定' } }
    );
    
    if (result.modifiedCount === 1) {
      return res.status(200).json({ 
        success: true,
        message: `卡密 ${key} 已解绑`
      });
    } else {
      return res.status(500).json({ error: '解绑操作失败' });
    }
  } catch (error) {
    console.error('Unbind error:', error);
    return res.status(500).json({ error: '服务器错误: ' + error.message });
  }
};
