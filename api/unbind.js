import express from 'express';
import { connectToDatabase } from '../lib/mongodb';

const router = express.Router();
router.use(express.json());

// 连接池管理
let dbConnection = null;
const getDbConnection = async () => {
  if (!dbConnection) {
    const { db } = await connectToDatabase();
    dbConnection = db;
    console.log('[DB] 创建新的数据库连接');
  }
  return dbConnection;
};

// 连接健康检查
setInterval(async () => {
  try {
    const db = await getDbConnection();
    await db.command({ ping: 1 });
  } catch (error) {
    console.error('[DB] 连接健康检查失败, 重置连接', error);
    dbConnection = null; // 重置连接
  }
}, 30000); // 每30秒检查一次

router.post('/', async (req, res) => {
  console.log(`[UNBIND] 收到解绑请求: ${JSON.stringify(req.body)}`);
  
  // 验证请求
  if (!req.body?.key) {
    console.warn('[UNBIND] 无效请求: 缺少卡密参数');
    return res.status(400).json({ 
      error: '请求中缺少卡密参数' 
    });
  }

  const { key } = req.body;
  
  try {
    const db = await getDbConnection();
    
    // 查找卡密
    const keyDoc = await db.collection('keys').findOne({ key });
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
    
    // 执行解绑
    const result = await db.collection('keys').updateOne(
      { key },
      { 
        $set: { 
          playerId: '待定',
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
    
    // 重置问题连接
    if (error.message.includes('topology was destroyed')) {
      dbConnection = null;
      console.warn('[DB] 重置数据库连接');
    }
    
    return res.status(500).json({ 
      error: '服务器内部错误',
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

export default router;
