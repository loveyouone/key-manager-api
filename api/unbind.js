export default async (req, res) => {
  console.log(`[UNBIND] 开始处理请求`);
  
  try {
    // 调试日志
    console.log("接收到的请求体:", req.body);
    
    const { key } = req.body || {};
    
    // 严格参数验证
    if (typeof key !== 'string') {
      console.error("无效卡密参数:", key);
      return res.status(400).json({
        success: false,
        error: "必须提供有效的卡密(key)",
        received: { key }
      });
    }

    // 业务逻辑保持不变
    const result = await unbindKey(key);
    
    if (result.modifiedCount === 1) {
      console.log(`解绑成功: ${key}`);
      return res.status(200).json({
        success: true,
        message: "解绑成功"
      });
    }
    
    console.error(`解绑失败: ${key}`);
    return res.status(400).json({
      success: false,
      error: "卡密不存在或解绑失败"
    });
    
  } catch (error) {
    console.error("解绑处理错误:", error);
    return res.status(500).json({
      success: false,
      error: "服务器内部错误"
    });
  }
};
