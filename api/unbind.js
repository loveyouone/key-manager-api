const { unbindKey } = require('../utils/db');

module.exports = async (req, res) => {
  console.log(`[UNBIND] 收到解绑请求`);
  
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

    const { key } = requestBody || {};
    
    if (!key) {
      console.warn('[UNBIND] 缺少卡密参数');
      return res.status(400).json({ 
        success: false,
        error: '必须提供卡密' 
      });
    }

    // 以下保持原有逻辑不变
    const result = await unbindKey(key);
    
    if (result.modifiedCount === 1) {
      console.log(`[UNBIND] 解绑成功: ${key}`);
      return res.status(200).json({ 
        success: true,
        message: '卡密解绑成功' 
      });
    } else {
      console.error(`[UNBIND] 解绑操作失败: ${key}`);
      return res.status(400).json({ 
        success: false,
        error: '卡密不存在或解绑失败' 
      });
    }
  } catch (error) {
    console.error('[UNBIND] 服务器错误:', error);
    return res.status(500).json({ 
      success: false,
      error: '服务器内部错误'
    });
  }
};
