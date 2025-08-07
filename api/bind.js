// api/bind.js
import { getDatabase } from '../db.js';

export default async (req, res) => {
    console.log("==== 开始处理 /bind 请求 ====");
    const { key, playerId } = req.body;
    
    if (!key || !playerId) {
        console.error("缺少参数");
        return res.status(400).json({
            success: false,
            error: "缺少参数: key 或 playerId"
        });
    }
    
    try {
        const db = await getDatabase();
        const collection = db.collection('keys');
        
        // 查找卡密
        const keyData = await collection.findOne({ key: key });
        if (!keyData) {
            console.error(`卡密 ${key} 不存在`);
            return res.status(404).json({
                success: false,
                error: "卡密不存在"
            });
        }
        
        // 检查卡密是否已经被绑定 - 使用小写字段 playerid
        if (keyData.playerid && keyData.playerid !== "待定") {
            console.error(`卡密 ${key} 已经被绑定给玩家 ${keyData.playerid}`);
            return res.status(400).json({
                success: false,
                error: "卡密已被绑定，无法重新绑定"
            });
        }
        
        // 更新卡密绑定玩家 - 使用小写字段 playerid
        const result = await collection.updateOne(
            { key: key },
            { $set: { playerid: playerId } }
        );
        
        if (result.modifiedCount === 1) {
            console.log(`卡密 ${key} 成功绑定给玩家 ${playerId}`);
            return res.status(200).json({
                success: true,
                message: "绑定成功"
            });
        } else {
            console.error(`卡密 ${key} 绑定失败，更新操作未执行`);
            return res.status(500).json({
                success: false,
                error: "绑定操作失败，请重试"
            });
        }
    } catch (error) {
        console.error("绑定过程中发生错误:", error);
        return res.status(500).json({
            success: false,
            error: "服务器内部错误"
        });
    }
};
