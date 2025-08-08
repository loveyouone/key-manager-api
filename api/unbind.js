const db = require('../utils/db');

module.exports = async (req, res) => {
  try {
    const { key } = req.body;
    
    // 自动处理解绑
    const result = await db.unbindKey(key);
    
    res.status(200).json({
      success: true,
      message: "卡密解绑成功",
      key: key
    });
  } catch (error) {
    console.error("解绑错误:", error);
    res.status(500).json({
      success: false,
      error: "自动解绑失败"
    });
  }
};
