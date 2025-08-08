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

// 数据库操作方法
const db = {
  async getKey(key) {
    const { db } = await connectToDatabase();
    return await db.collection('keys').findOne({ key });
  },

  async bindKey(key, playerId) {
    const { db } = await connectToDatabase();
    return await db.collection('keys').updateOne(
      { key },
      { $set: { playerid: playerId, updatedAt: new Date() } },
      { upsert: false }
    );
  },

  async unbindKey(key) {
    const { db } = await connectToDatabase();
    return await db.collection('keys').updateOne(
      { key },
      { $set: { playerid: '待定', lastunbind: new Date() } }
    );
  },

  async getAllKeys() {
    const { db } = await connectToDatabase();
    return await db.collection('keys').find({}).toArray();
  }
};

// 关键修复：使用module.exports导出
module.exports = db;
