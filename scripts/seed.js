import { connectToDatabase } from '../utils/db.js';

async function seedDatabase() {
  const { db } = await connectToDatabase();
  
  await db.collection('keys').insertMany([
    {
      key: "INIT-001",
      playerid: "待定",
      reward: "初始卡密",
      expiretime: new Date("2025-12-31"),
      lastUnbind: new Date()
    }
  ]);
  
  console.log("✅ 数据库初始化完成");
  process.exit(0);
}

seedDatabase().catch(console.error);
