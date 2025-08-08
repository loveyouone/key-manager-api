const { bindKey } = require('../utils/db');

module.exports = async (req, res) => {
  console.log("==== 开始处理 /bind 请求 ====");
  
  try {
    const { key, playerId } = req.body;
    
    if (!key || !playerId) {
      console.error("缺少参数");
      return res.status(400).json({
        success: false,
        error: "缺少参数: key 或 playerId"
      });
    }

    const result = await bindKey(key, playerId);
    
    if (result.modifiedCount === 1) {
      console.log(`卡密 ${key} 成功绑定给玩家 ${playerId}`);
      return res.status(200).json({
        success: true,
        message: "绑定成功"
      });
    } else {
      console.error(`卡密 ${key} 绑定失败`);
      return res.status(400).json({
        success: false,
        error: "卡密不存在或绑定失败"
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
