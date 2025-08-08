const db = require('../utils/db');

module.exports = async (req, res) => {
  try {
    const { key, playerId } = req.body;
    
    // 自动处理绑定
    const result = await db.bindKey(key, playerId);
    
    res.status(200).json({
      success: true,
      message: "卡密绑定成功",
      key: key,
      playerId: playerId
    });
  } catch (error) {
    console.error("绑定错误:", error);
    res.status(500).json({
      success: false,
      error: "自动绑定失败"
    });
  }
};
