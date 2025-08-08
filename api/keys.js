const db = require('../utils/db');

module.exports = async (req, res) => {
  try {
    const keys = await db.getAllKeys();
    
    const result = {};
    keys.forEach(key => {
      result[key.key] = {
        playerid: key.playerid,
        reward: key.reward
      };
      
      if (key.expiretime) {
        result[key.key].expiretime = key.expiretime;
      }
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error("获取卡密错误:", error);
    res.status(500).json({
      success: false,
      error: "自动获取卡密失败"
    });
  }
};
