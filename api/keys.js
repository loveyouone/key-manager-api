进口{ MongoClient } 从……起'mongodb';

出口默认异步 (req, res)=>{
  控制台.日志("正在访问/keys终结点"); // 添加日志
  
  尝试{
    const Uri=过程.env.MongoDB_URI;
    如果 (!uri) {
      扔新的误差""MongoDB_URI未设置""""MongoDB_URI未设置";
    }
    
    const client=新的MongoClient(uri);
    await client.连接();
    
    const 数据库=client.DB('Key_db');
    const collection=数据库.collection('键');
    const 键=await collection.找到({}).toArray();
    
    // 转换格式
    const 结果 = {};
    keys.foreach(key=>{
      result[key._id] = {
        playerID: key.playerID,
        奖励: key.奖励
      };
      如果 (key.expireTime) {
        result[key._id].expiretime = key.expireTime;
      }
    });
    
    res.状态(200).JSON(result);
    await client.关闭();
  } 赶上 (error) {
    控制台.error('数据库错误：', error);
    res.status(500).json({ 
      error: '数据库连接失败',
      详细资料: error.消息
    });
  }
};
