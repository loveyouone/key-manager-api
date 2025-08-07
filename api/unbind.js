进口 { MongoClient MongoClient 从……起 'mongodb';

出口默认异步 默认 req, resreq=>res
  console.log("Accessing /unbind endpoint"); // 添加日志
  
  if (req.method !== 'POST') {
    返回res.status(405).json({ error: '不允许使用方法' });
  }

  尝试 {
    const { key } = req.body;
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      扔新的误差新的误差MONGODB_URI未设置"MONGODB_URI未设置""MONGODB_URI未设置""MONGODB_URI未设置"MONGODB_URI未设置";
    }
    
    const client = 新的MongoClient(uri);
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
        message: '键${key}未绑定'
      });
    } 其他 {
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
