const { getAllKeys } = require('../utils/db');

module.exports = async (req, res) => {
  console.log("==== 开始处理 /keys 请求 ====");
  
  try {
    const keys = await getAllKeys();
    console.log(`找到 ${keys.length} 条卡密记录`);
    
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
    
    console.log("返回卡密数据");
    return res.status(200).json(result);
  } catch (error) {
    console.error("处理过程中发生错误:", error);
    return res.status(500).json({ 
      success: false,
      error: '数据库操作失败'
    });
  }
};
