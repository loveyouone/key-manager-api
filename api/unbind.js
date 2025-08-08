const { unbindKey } = require('../utils/db');

module.exports = async (req, res) => {
  console.log(`[UNBIND] 收到解绑请求`);
  
  try {
    // 验证请求体格式
    if (!req.body || typeof req.body !== 'object') {
      console.warn('[UNBIND] 无效请求体');
      return res.status(400).json({ 
        success: false,
        error: '请求需要JSON格式' 
      });
    }

    const { key } = req.body;
    
    // 严格参数验证
    if (!key || typeof key !== 'string') {
      console.warn('[UNBIND] 无效卡密参数:', key);
      return res.status(400).json({ 
        success: false,
        error: '必须提供有效的卡密字符串' 
      });
    }

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
