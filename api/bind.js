export default async (req, res) => {
  console.log("==== 开始处理 /bind 请求 ====");
  
  try {
    // 调试日志
    console.log("接收到的请求体:", req.body);
    
    const { key, playerId } = req.body || {};
    
    // 严格参数验证
    if (typeof key !== 'string' || typeof playerId !== 'string') {
      console.error("参数验证失败:", { key, playerId });
      return res.status(400).json({
        success: false,
        error: "必须提供有效的卡密(key)和玩家ID(playerId)",
        received: { key, playerId }
      });
    }

    // 业务逻辑保持不变
    const result = await bindKey(key, playerId);
    
    if (result.modifiedCount === 1) {
      console.log(`绑定成功: ${key} -> ${playerId}`);
      return res.status(200).json({
        success: true,
        message: "绑定成功"
      });
    }
    
    console.error(`绑定失败: ${key}`);
    return res.status(400).json({
      success: false,
      error: "卡密不存在或绑定失败"
    });
    
  } catch (error) {
    console.error("绑定处理错误:", error);
    return res.status(500).json({
      success: false,
      error: "服务器内部错误"
    });
  }
};
