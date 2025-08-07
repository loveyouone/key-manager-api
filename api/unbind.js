// api/unbind.js
import express from 'express';
import { connectToDatabase } from '../lib/mongodb';

const router = express.Router();

// JSON 解析中间件
router.use(express.json());

router.post('/', async (req, res) => {
    // 检查请求体是否存在
    if (!req.body) {
        return res.status(400).json({ 
            error: '请求体为空' 
        });
    }

    // 检查 key 是否存在
    if (!req.body.key) {
        return res.status(400).json({ 
            error: '请求中缺少卡密参数' 
        });
    }

    const { key } = req.body;
    
    try {
        const { db } = await connectToDatabase();
        
        // 在数据库中查找该卡密
        const keyDoc = await db.collection('keys').findOne({ key: key });
        if (!keyDoc) {
            return res.status(404).json({ 
                error: '卡密不存在' 
            });
        }
        
        // 检查卡密是否已被使用
        if (!keyDoc.playerId || keyDoc.playerId === '待定') {
            return res.status(400).json({ 
                error: '卡密尚未绑定，无需解绑' 
            });
        }
        
        // 执行解绑操作
        const result = await db.collection('keys').updateOne(
            { key: key },
            { 
                $set: { 
                    playerId: '待定',
                    expireTime: null 
                } 
            }
        );
        
        if (result.modifiedCount === 1) {
            return res.status(200).json({ 
                success: true,
                message: '卡密解绑成功' 
            });
        } else {
            return res.status(500).json({ 
                error: '解绑操作失败' 
            });
        }
    } catch (error) {
        console.error('解绑错误:', error);
        return res.status(500).json({ 
            error: '服务器内部错误' 
        });
    }
});

export default router;
