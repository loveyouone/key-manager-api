const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'key_db';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
  });

  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// 全自动数据库操作
module.exports = {
  // 绑定卡密（自动创建新卡密）
  async bindKey(key, playerId) {
    const { db } = await connectToDatabase();
    
    return await db.collection('keys').updateOne(
      { key },
      {
        $set: { 
          playerid: playerId,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
          reward: "自动创建卡密",
          expiretime: null
        }
      },
      { upsert: true } // 关键：自动创建不存在的卡密
    );
  },

  // 解绑卡密（自动更新）
  async unbindKey(key) {
    const { db } = await connectToDatabase();
    return await db.collection('keys').updateOne(
      { key },
      { $set: { 
        playerid: '待定',
        updatedAt: new Date() 
      }}
    );
  },

  // 获取所有卡密
  async getAllKeys() {
    const { db } = await connectToDatabase();
    return await db.collection('keys').find({}).toArray();
  }
};
