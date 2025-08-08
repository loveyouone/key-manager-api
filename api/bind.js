const { bindKey } = require('../utils/db');

module.exports = async (req, res) => {
  console.log("==== 开始处理 /bind 请求 ====");
  
  try {
    // 确保正确解析JSON请求体
    let requestBody;
    try {
      requestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      console.error("JSON解析失败:", req.body);
      return res.status(400).json({
        success: false,
        error: "无效的JSON格式"
      });
    }

    const { key, playerId } = requestBody || {};
    
    if (!key || !playerId) {
      console.error("缺少参数:", {key, playerId});
      return res.status(400).json({
        success: false,
        error: "必须提供卡密和玩家ID"
      });
    }

    // 以下保持原有逻辑不变
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
