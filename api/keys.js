import { MongoClient } from 'mongodb';

export default async (req, res) => {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const database = client.db('key_db');
    const collection = database.collection('keys');
    
    const keys = await collection.find({}).toArray();
    
    // 转换为Lua需要的格式
    const result = {};
    keys.forEach(key => {
      result[key._id] = {
        PlayerId: key.playerId,
        Reward: key.reward,
        ...(key.expireTime && { ExpireTime: key.expireTime })
      };
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  } finally {
    await client.close();
  }
};
